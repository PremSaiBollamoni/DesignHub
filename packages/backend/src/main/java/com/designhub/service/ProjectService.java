package com.designhub.service;

import com.designhub.domain.*;
import com.designhub.dto.DesignDtos.*;
import com.designhub.dto.ProjectDtos.*;
import com.designhub.exception.ApiException;
import com.designhub.repository.*;
import com.designhub.security.AuthUser;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projects;
    private final FolderRepository folders;
    private final FavoriteRepository favorites;
    private final TeamRepository teams;
    private final TemplateRepository templates;
    private final UserRepository users;
    private final AccessService access;
    private final DesignService design;
    private final SubscriptionService subscriptions;
    private final ActivityService activity;
    private final jakarta.persistence.EntityManager em;

    @Transactional(readOnly = true)
    public ProjectPage list(AuthUser user, String q, String view, Long folderId, String sort, int page, int size) {
        String sortField = switch (sort == null ? "updated" : sort) {
            case "created" -> "createdAt";
            case "title" -> "title";
            default -> "updatedAt";
        };
        Sort.Direction dir = "title".equals(sortField) ? Sort.Direction.ASC : Sort.Direction.DESC;
        var result = projects.findAccessible(user.id(), q == null ? "" : q.trim(), "trash".equals(view),
                folderId == null ? 0 : folderId, "favorites".equals(view), "shared".equals(view),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 60)), Sort.by(dir, sortField)));
        List<Project> content = result.getContent();
        Set<Long> favIds = content.isEmpty() ? Set.of()
                : Set.copyOf(favorites.favoriteIds(user.id(), content.stream().map(Project::getId).toList()));
        List<ProjectSummary> items = content.stream()
                .map(p -> ProjectSummary.of(p, favIds.contains(p.getId()), access.resolve(p, user.id()).orElse(Access.VIEWER)))
                .toList();
        return new ProjectPage(items, result.getTotalElements(), result.getNumber(), result.getSize());
    }

    @Transactional(readOnly = true)
    public ProjectSummary get(AuthUser user, Long id) {
        var grant = access.require(id, user, Access.VIEWER);
        boolean fav = favorites.findByUserIdAndProjectId(user.id(), id).isPresent();
        return ProjectSummary.of(grant.project(), fav, grant.access());
    }

    @Transactional
    public ProjectSummary create(AuthUser user, CreateProjectRequest req) {
        subscriptions.checkProjectQuota(user.id());
        Project p = new Project();
        p.setOwner(users.findById(user.id()).orElseThrow());
        p.setTitle(req.title().trim());
        if (req.folderId() != null) p.setFolder(ownedFolder(user, req.folderId()));
        if (req.teamId() != null) p.setTeam(teamFor(user, req.teamId()));
        Template template = req.templateId() == null ? null
                : templates.findById(req.templateId()).orElseThrow(() -> ApiException.notFound("Template"));
        p.setWidth(template != null ? template.getWidth() : req.width() == null ? 1080 : req.width());
        p.setHeight(template != null ? template.getHeight() : req.height() == null ? 1080 : req.height());
        if (template != null) p.setThumbnail(template.getThumbnail());
        projects.save(p);
        if (template != null) {
            design.replace(p, design.deserialize(template.getDesign()), true);
        } else {
            PageDto blank = new PageDto(UUID.randomUUID().toString(), "Page 1", "#ffffff", null, 0, List.of(), null);
            design.replace(p, new DesignDto(p.getId(), 0, p.getWidth(), p.getHeight(), List.of(blank)), false);
        }
        activity.log(user.id(), p.getId(), "project.created", p.getTitle());
        return ProjectSummary.of(p, false, Access.OWNER);
    }

    @Transactional
    public ProjectSummary update(AuthUser user, Long id, UpdateProjectRequest req) {
        var grant = access.require(id, user, req.title() != null || req.folderId() != null || req.teamId() != null ? Access.OWNER : Access.MAKER);
        Project p = grant.project();
        if (req.title() != null) p.setTitle(req.title().trim());
        if (Boolean.TRUE.equals(req.clearFolder())) p.setFolder(null);
        else if (req.folderId() != null) p.setFolder(ownedFolder(user, req.folderId()));
        if (req.teamId() != null) p.setTeam(req.teamId() == 0 ? null : teamFor(user, req.teamId()));
        if (req.thumbnail() != null) p.setThumbnail(req.thumbnail());
        projects.save(p);
        return ProjectSummary.of(p, favorites.findByUserIdAndProjectId(user.id(), id).isPresent(), grant.access());
    }

    @Transactional
    public ProjectSummary duplicate(AuthUser user, Long id) {
        var grant = access.require(id, user, Access.VIEWER);
        subscriptions.checkProjectQuota(user.id());
        Project src = grant.project();
        Project copy = new Project();
        copy.setOwner(users.findById(user.id()).orElseThrow());
        copy.setTitle(src.getTitle() + " copy");
        copy.setWidth(src.getWidth());
        copy.setHeight(src.getHeight());
        copy.setThumbnail(src.getThumbnail());
        projects.save(copy);
        design.replace(copy, design.load(src), true);
        activity.log(user.id(), copy.getId(), "project.duplicated", src.getTitle());
        return ProjectSummary.of(copy, false, Access.OWNER);
    }

    @Transactional
    public void trash(AuthUser user, Long id) {
        access.require(id, user, Access.OWNER).project().setDeletedAt(Instant.now());
        activity.log(user.id(), id, "project.trashed", null);
    }

    @Transactional
    public void restore(AuthUser user, Long id) {
        access.require(id, user, Access.OWNER).project().setDeletedAt(null);
        activity.log(user.id(), id, "project.restored", null);
    }

    @Transactional
    public void deleteForever(AuthUser user, Long id) {
        Project p = access.require(id, user, Access.OWNER).project();
        if (p.getDeletedAt() == null) throw ApiException.badRequest("Move the design to trash before deleting it permanently");
        design.replace(p, new DesignDto(id, 0, 0, 0, List.of()), false);
        for (String entity : List.of("Collaborator", "Version", "Favorite", "ShareLink", "Activity")) {
            em.createQuery("delete from " + entity + " x where x.project.id = :id").setParameter("id", id).executeUpdate();
        }
        em.createQuery("delete from Comment c where c.project.id = :id and c.parent is not null").setParameter("id", id).executeUpdate();
        em.createQuery("delete from Comment c where c.project.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("update SocialPost s set s.project = null where s.project.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("update ExportJob e set e.project = null where e.project.id = :id").setParameter("id", id).executeUpdate();
        projects.deleteById(id);
    }

    @Transactional
    public boolean toggleFavorite(AuthUser user, Long id) {
        access.require(id, user, Access.VIEWER);
        var existing = favorites.findByUserIdAndProjectId(user.id(), id);
        if (existing.isPresent()) {
            favorites.delete(existing.get());
            return false;
        }
        Favorite f = new Favorite();
        f.setUser(users.getReferenceById(user.id()));
        f.setProject(projects.getReferenceById(id));
        favorites.save(f);
        return true;
    }

    @Transactional(readOnly = true)
    public List<FolderDto> folders(AuthUser user) {
        return folders.findByOwnerIdOrderByNameAsc(user.id()).stream().map(f -> new FolderDto(f.getId(), f.getName())).toList();
    }

    @Transactional
    public FolderDto createFolder(AuthUser user, String name) {
        Folder f = new Folder();
        f.setOwner(users.getReferenceById(user.id()));
        f.setName(name.trim());
        folders.save(f);
        return new FolderDto(f.getId(), f.getName());
    }

    @Transactional
    public FolderDto renameFolder(AuthUser user, Long id, String name) {
        Folder f = ownedFolder(user, id);
        f.setName(name.trim());
        return new FolderDto(f.getId(), f.getName());
    }

    @Transactional
    public void deleteFolder(AuthUser user, Long id) {
        Folder f = ownedFolder(user, id);
        projects.findAccessible(user.id(), "", false, id, false, false, PageRequest.of(0, 1000)).forEach(p -> p.setFolder(null));
        folders.delete(f);
    }

    private Folder ownedFolder(AuthUser user, Long id) {
        return folders.findById(id).filter(f -> f.getOwner().getId().equals(user.id())).orElseThrow(() -> ApiException.notFound("Folder"));
    }

    private Team teamFor(AuthUser user, Long teamId) {
        Set<Long> mine = teams.findForUser(user.id()).stream().map(Team::getId).collect(Collectors.toSet());
        if (!mine.contains(teamId)) throw ApiException.forbidden("You are not a member of that team");
        return teams.getReferenceById(teamId);
    }
}
