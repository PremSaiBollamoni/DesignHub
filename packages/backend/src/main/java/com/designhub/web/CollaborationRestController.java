package com.designhub.web;

import com.designhub.domain.Access;
import com.designhub.security.AuthUser;
import com.designhub.service.CollaboratorService;
import com.designhub.service.CollaboratorService.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Collaborators (/api/collaborators), share links (/api/share-links) and the anonymous viewer (/api/public). */
@RestController
@RequiredArgsConstructor
public class CollaborationRestController {
    private final CollaboratorService service;

    public record InviteRequest(@NotBlank @Email(message = "Enter a valid email address") String email, Access role) {}

    public record LinkRequest(Access role, Integer expiresInDays) {}

    @GetMapping("/api/collaborators/project/{projectId}")
    public List<CollaboratorDto> list(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId) {
        return service.list(user, projectId);
    }

    @PostMapping("/api/collaborators/project/{projectId}")
    @ResponseStatus(HttpStatus.CREATED)
    public CollaboratorDto invite(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @RequestBody InviteRequest req) {
        return service.invite(user, projectId, req.email(), req.role() == null ? Access.MAKER : req.role());
    }

    @DeleteMapping("/api/collaborators/project/{projectId}/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long userId) {
        service.remove(user, projectId, userId);
    }

    @GetMapping("/api/share-links/project/{projectId}")
    public List<ShareLinkDto> links(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId) {
        return service.links(user, projectId);
    }

    @PostMapping("/api/share-links/project/{projectId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareLinkDto createLink(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @RequestBody LinkRequest req) {
        return service.createLink(user, projectId, req.role() == null ? Access.VIEWER : req.role(), req.expiresInDays());
    }

    @DeleteMapping("/api/share-links/project/{projectId}/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long linkId) {
        service.revokeLink(user, projectId, linkId);
    }

    @PostMapping("/api/share-links/accept/{token}")
    public Map<String, Long> accept(@AuthenticationPrincipal AuthUser user, @PathVariable String token) {
        return Map.of("projectId", service.accept(user, token));
    }

    @GetMapping("/api/public/shares/{token}")
    public PublicShare publicView(@PathVariable String token) {
        return service.resolvePublic(token);
    }
}
