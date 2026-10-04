package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.Project;
import com.designhub.domain.Version;
import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.exception.ApiException;
import com.designhub.repository.UserRepository;
import com.designhub.repository.VersionRepository;
import com.designhub.repository.ProjectRepository;
import com.designhub.security.AuthUser;
import com.designhub.ws.ProjectBroadcaster;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VersionService {
    private static final int MAX_AUTO_VERSIONS = 30;

    private final VersionRepository versions;
    private final AccessService access;
    private final DesignService design;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final ActivityService activity;
    private final ProjectBroadcaster broadcaster;

    public record VersionDto(Long id, String label, boolean auto, Instant createdAt, String authorName, String thumbnail) {}

    @Transactional(readOnly = true)
    public List<VersionDto> list(AuthUser user, Long projectId) {
        access.require(projectId, user, Access.VIEWER);
        return versions.listMeta(projectId).stream()
                .map(v -> new VersionDto(v.getId(), v.getLabel(), v.getAuto(), v.getCreatedAt(), v.getAuthorName(), v.getThumbnail())).toList();
    }

    @Transactional
    public VersionDto save(AuthUser user, Long projectId, String label, boolean auto, String thumbnail) {
        Project p = access.require(projectId, user, Access.MAKER).project();
        Version v = snapshot(p, user.id(), label, auto, thumbnail);
        if (!auto) activity.log(user.id(), projectId, "version.saved", v.getLabel());
        return new VersionDto(v.getId(), v.getLabel(), v.isAuto(), Instant.now(), user.name(), v.getThumbnail());
    }

    @Transactional
    public void restore(AuthUser user, Long projectId, Long versionId) {
        Project p = access.require(projectId, user, Access.MAKER).project();
        Version v = find(projectId, versionId);
        snapshot(p, user.id(), "Before restoring \"" + v.getLabel() + "\"", true, p.getThumbnail());
        design.replace(p, design.deserialize(v.getSnapshot()), false);
        activity.log(user.id(), projectId, "version.restored", v.getLabel());
        broadcaster.reload(projectId, user.id(), user.name(), projects.revisionOf(projectId));
    }

    @Transactional
    public void delete(AuthUser user, Long projectId, Long versionId) {
        access.require(projectId, user, Access.MAKER);
        versions.delete(find(projectId, versionId));
    }

    private Version find(Long projectId, Long versionId) {
        return versions.findById(versionId).filter(v -> v.getProject().getId().equals(projectId))
                .orElseThrow(() -> ApiException.notFound("Version"));
    }

    private Version snapshot(Project p, Long userId, String label, boolean auto, String thumbnail) {
        DesignDto current = design.load(p);
        Version v = new Version();
        v.setProject(p);
        v.setAuthor(users.getReferenceById(userId));
        v.setAuto(auto);
        v.setLabel(label == null || label.isBlank() ? "Version " + Instant.now().toString().substring(0, 16).replace('T', ' ') : label.trim());
        v.setSnapshot(design.serialize(current));
        v.setThumbnail(thumbnail);
        versions.save(v);
        if (auto) pruneAuto(p.getId());
        return v;
    }

    private void pruneAuto(Long projectId) {
        List<Long> autoIds = versions.listMeta(projectId).stream().filter(VersionRepository.VersionMeta::getAuto).map(VersionRepository.VersionMeta::getId).toList();
        if (autoIds.size() > MAX_AUTO_VERSIONS) {
            autoIds.subList(MAX_AUTO_VERSIONS, autoIds.size()).forEach(versions::deleteById);
        }
    }
}
