package com.designhub.service;

import com.designhub.domain.*;
import com.designhub.exception.ApiException;
import com.designhub.repository.CollaboratorRepository;
import com.designhub.repository.ShareLinkRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.dto.ProjectDtos.ProjectSummary;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Direct invitations and share links. Only owners manage access. */
@Service
@RequiredArgsConstructor
public class CollaboratorService {
    private final CollaboratorRepository collaborators;
    private final ShareLinkRepository links;
    private final UserRepository users;
    private final AccessService access;
    private final DesignService design;
    private final NotificationService notifications;
    private final ActivityService activity;
    private final SecureRandom random = new SecureRandom();

    public record CollaboratorDto(Long userId, String name, String email, String avatarUrl, String role, boolean owner) {}

    public record ShareLinkDto(Long id, String token, String role, Instant expiresAt) {}

    public record PublicShare(ProjectSummary project, DesignDto design, String role) {}

    @Transactional(readOnly = true)
    public List<CollaboratorDto> list(AuthUser user, Long projectId) {
        Project p = access.require(projectId, user, Access.VIEWER).project();
        List<CollaboratorDto> out = new ArrayList<>();
        User o = p.getOwner();
        out.add(new CollaboratorDto(o.getId(), o.getName(), o.getEmail(), o.getAvatarUrl(), Access.OWNER.name(), true));
        collaborators.findByProjectId(projectId).forEach(c -> out.add(new CollaboratorDto(c.getUser().getId(), c.getUser().getName(),
                c.getUser().getEmail(), c.getUser().getAvatarUrl(), c.getRole().name(), false)));
        return out;
    }

    @Transactional
    public CollaboratorDto invite(AuthUser user, Long projectId, String email, Access role) {
        Project p = access.require(projectId, user, Access.OWNER).project();
        if (role == Access.OWNER) throw ApiException.badRequest("Choose viewer, commenter or editor");
        User invitee = users.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> ApiException.notFound("A DesignHub account for " + email.trim()));
        if (invitee.getId().equals(p.getOwner().getId())) throw ApiException.badRequest("That person already owns this design");
        Collaborator c = collaborators.findByProjectIdAndUserId(projectId, invitee.getId()).orElseGet(Collaborator::new);
        boolean isNew = c.getId() == null;
        c.setProject(p);
        c.setUser(invitee);
        c.setRole(role);
        collaborators.save(c);
        if (isNew) {
            notifications.send(invitee.getId(), "INVITATION", user.name() + " invited you to \"" + p.getTitle() + "\" as " + role.name().toLowerCase(), "/editor/" + projectId);
        }
        activity.log(user.id(), projectId, "collaborator.added", invitee.getName());
        return new CollaboratorDto(invitee.getId(), invitee.getName(), invitee.getEmail(), invitee.getAvatarUrl(), role.name(), false);
    }

    @Transactional
    public void remove(AuthUser user, Long projectId, Long userId) {
        access.require(projectId, user, userId.equals(user.id()) ? Access.VIEWER : Access.OWNER);
        collaborators.findByProjectIdAndUserId(projectId, userId).ifPresent(collaborators::delete);
        activity.log(user.id(), projectId, "collaborator.removed", null);
    }

    @Transactional(readOnly = true)
    public List<ShareLinkDto> links(AuthUser user, Long projectId) {
        access.require(projectId, user, Access.OWNER);
        return links.findByProjectIdAndRevokedFalse(projectId).stream().map(this::dto).toList();
    }

    @Transactional
    public ShareLinkDto createLink(AuthUser user, Long projectId, Access role, Integer expiresInDays) {
        Project p = access.require(projectId, user, Access.OWNER).project();
        if (role == Access.OWNER) throw ApiException.badRequest("Links can grant viewer, commenter or editor access");
        byte[] raw = new byte[24];
        random.nextBytes(raw);
        ShareLink l = new ShareLink();
        l.setProject(p);
        l.setRole(role);
        l.setToken(Base64.getUrlEncoder().withoutPadding().encodeToString(raw));
        if (expiresInDays != null && expiresInDays > 0) l.setExpiresAt(Instant.now().plus(expiresInDays, ChronoUnit.DAYS));
        links.save(l);
        activity.log(user.id(), projectId, "share.link.created", role.name());
        return dto(l);
    }

    @Transactional
    public void revokeLink(AuthUser user, Long projectId, Long linkId) {
        access.require(projectId, user, Access.OWNER);
        links.findById(linkId).filter(l -> l.getProject().getId().equals(projectId)).ifPresent(l -> l.setRevoked(true));
    }

    @Transactional(readOnly = true)
    public PublicShare resolvePublic(String token) {
        ShareLink l = valid(token);
        Project p = l.getProject();
        return new PublicShare(ProjectSummary.of(p, false, l.getRole()), design.load(p), l.getRole().name());
    }

    /** Signed-in visitor converts a link into a durable collaborator grant. */
    @Transactional
    public Long accept(AuthUser user, String token) {
        ShareLink l = valid(token);
        Project p = l.getProject();
        if (access.resolve(p, user.id()).filter(a -> a.atLeast(l.getRole())).isPresent()) return p.getId();
        Collaborator c = collaborators.findByProjectIdAndUserId(p.getId(), user.id()).orElseGet(Collaborator::new);
        c.setProject(p);
        c.setUser(users.getReferenceById(user.id()));
        c.setRole(l.getRole());
        collaborators.save(c);
        notifications.send(p.getOwner().getId(), "COLLABORATION", user.name() + " joined \"" + p.getTitle() + "\" through a share link", "/editor/" + p.getId());
        activity.log(user.id(), p.getId(), "share.link.accepted", l.getRole().name());
        return p.getId();
    }

    private ShareLink valid(String token) {
        ShareLink l = links.findByToken(token).orElseThrow(() -> ApiException.notFound("Share link"));
        if (l.isRevoked() || (l.getExpiresAt() != null && l.getExpiresAt().isBefore(Instant.now())) || l.getProject().getDeletedAt() != null) {
            throw ApiException.notFound("Share link");
        }
        return l;
    }

    private ShareLinkDto dto(ShareLink l) {
        return new ShareLinkDto(l.getId(), l.getToken(), l.getRole().name(), l.getExpiresAt());
    }
}
