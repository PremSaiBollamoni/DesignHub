package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.Comment;
import com.designhub.domain.Project;
import com.designhub.exception.ApiException;
import com.designhub.repository.CommentRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.ws.ProjectBroadcaster;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository comments;
    private final UserRepository users;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityService activity;
    private final ProjectBroadcaster broadcaster;

    public record CommentRequest(@NotBlank(message = "Write a comment first") @Size(max = 4000) String body, Long parentId,
                                 String pageId, String elementId, Double x, Double y, List<Long> mentions) {}

    public record CommentDto(Long id, Long parentId, String pageId, String elementId, Double x, Double y, String body,
                             List<Long> mentions, boolean resolved, Long authorId, String authorName, String authorAvatar,
                             Instant createdAt) {}

    @Transactional(readOnly = true)
    public List<CommentDto> list(AuthUser user, Long projectId) {
        access.require(projectId, user, Access.VIEWER);
        return comments.findByProjectIdOrderByCreatedAtAsc(projectId).stream().map(this::dto).toList();
    }

    @Transactional
    public CommentDto create(AuthUser user, Long projectId, CommentRequest req) {
        Project project = access.require(projectId, user, Access.COMMENTER).project();
        Comment c = new Comment();
        c.setProject(project);
        c.setAuthor(users.getReferenceById(user.id()));
        c.setBody(req.body().trim());
        c.setPageId(req.pageId());
        c.setElementId(req.elementId());
        c.setX(req.x());
        c.setY(req.y());
        Comment parent = null;
        if (req.parentId() != null) {
            parent = comments.findById(req.parentId()).filter(p -> p.getProject().getId().equals(projectId))
                    .orElseThrow(() -> ApiException.notFound("Comment"));
            c.setParent(parent.getParent() != null ? parent.getParent() : parent);
        }
        Set<Long> mentioned = req.mentions() == null ? Set.of() : req.mentions().stream().filter(id -> !id.equals(user.id())).collect(Collectors.toSet());
        c.setMentions(mentioned.stream().map(String::valueOf).collect(Collectors.joining(",")));
        comments.save(c);

        String link = "/editor/" + projectId;
        mentioned.forEach(id -> notifications.send(id, "MENTION", user.name() + " mentioned you in \"" + project.getTitle() + "\"", link));
        Set<Long> others = new java.util.HashSet<>();
        others.add(project.getOwner().getId());
        if (parent != null) others.add(parent.getAuthor().getId());
        others.remove(user.id());
        others.removeAll(mentioned);
        others.forEach(id -> notifications.send(id, "COMMENT", user.name() + " commented on \"" + project.getTitle() + "\"", link));

        activity.log(user.id(), projectId, "comment.created", null);
        CommentDto dto = dto(c);
        broadcaster.event(projectId, "COMMENT_UPSERT", dto);
        return dto;
    }

    @Transactional
    public CommentDto setResolved(AuthUser user, Long projectId, Long commentId, boolean resolved) {
        access.require(projectId, user, Access.COMMENTER);
        Comment c = find(projectId, commentId);
        c.setResolved(resolved);
        CommentDto dto = dto(c);
        broadcaster.event(projectId, "COMMENT_UPSERT", dto);
        return dto;
    }

    @Transactional
    public void delete(AuthUser user, Long projectId, Long commentId) {
        var grant = access.require(projectId, user, Access.COMMENTER);
        Comment c = find(projectId, commentId);
        if (!c.getAuthor().getId().equals(user.id()) && grant.access() != Access.OWNER) {
            throw ApiException.forbidden("Only the author or the design owner can delete a comment");
        }
        comments.findByParentId(c.getId()).forEach(comments::delete);
        comments.delete(c);
        broadcaster.event(projectId, "COMMENT_DELETE", commentId);
    }

    private Comment find(Long projectId, Long id) {
        return comments.findById(id).filter(c -> c.getProject().getId().equals(projectId)).orElseThrow(() -> ApiException.notFound("Comment"));
    }

    private CommentDto dto(Comment c) {
        List<Long> mentions = c.getMentions() == null || c.getMentions().isBlank() ? List.of()
                : Arrays.stream(c.getMentions().split(",")).map(Long::valueOf).toList();
        var a = c.getAuthor();
        return new CommentDto(c.getId(), c.getParent() == null ? null : c.getParent().getId(), c.getPageId(), c.getElementId(),
                c.getX(), c.getY(), c.getBody(), mentions, c.isResolved(), a.getId(), a.getName(), a.getAvatarUrl(),
                Objects.requireNonNullElse(c.getCreatedAt(), Instant.now()));
    }
}
