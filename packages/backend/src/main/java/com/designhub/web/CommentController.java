package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.CommentService;
import com.designhub.service.CommentService.CommentDto;
import com.designhub.service.CommentService.CommentRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comments/project/{projectId}")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService comments;

    public record ResolveRequest(boolean resolved) {}

    @GetMapping
    public List<CommentDto> list(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId) {
        return comments.list(user, projectId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto create(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @Valid @RequestBody CommentRequest req) {
        return comments.create(user, projectId, req);
    }

    @PatchMapping("/{commentId}")
    public CommentDto resolve(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long commentId, @RequestBody ResolveRequest req) {
        return comments.setResolved(user, projectId, commentId, req.resolved());
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long commentId) {
        comments.delete(user, projectId, commentId);
    }
}
