package com.designhub.service;

import com.designhub.domain.Activity;
import com.designhub.domain.Project;
import com.designhub.domain.User;
import com.designhub.repository.ActivityRepository;
import com.designhub.repository.ProjectRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository repo;
    private final UserRepository users;
    private final ProjectRepository projects;

    /** Joins the caller's transaction so an activity row never exists for an action that rolled back. */
    @Transactional
    public void log(Long actorId, Long projectId, String type, String meta) {
        Activity a = new Activity();
        a.setActor(actorId == null ? null : users.getReferenceById(actorId));
        a.setProject(projectId == null ? null : projects.getReferenceById(projectId));
        a.setType(type);
        a.setMeta(meta);
        repo.save(a);
    }

    public record ActivityDto(Long id, String type, String meta, Instant createdAt, String actorName, Long projectId,
                              String projectTitle) {}

    @Transactional(readOnly = true)
    public List<ActivityDto> forProject(Long projectId, int limit) {
        return repo.findByProjectIdOrderByCreatedAtDesc(projectId, PageRequest.of(0, clamp(limit))).stream().map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> forUser(AuthUser user, int limit) {
        return repo.findForUser(user.id(), PageRequest.of(0, clamp(limit))).stream().map(this::dto).toList();
    }

    private int clamp(int limit) {
        return Math.max(1, Math.min(limit, 100));
    }

    private ActivityDto dto(Activity a) {
        User actor = a.getActor();
        Project p = a.getProject();
        return new ActivityDto(a.getId(), a.getType(), a.getMeta(), a.getCreatedAt(),
                actor == null ? "System" : actor.getName(), p == null ? null : p.getId(), p == null ? null : p.getTitle());
    }
}
