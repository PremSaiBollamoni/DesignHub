package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.VersionService;
import com.designhub.service.VersionService.VersionDto;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/versions")
@RequiredArgsConstructor
public class VersionController {
    private final VersionService versions;

    public record SaveVersionRequest(@Size(max = 160) String label, boolean auto, String thumbnail) {}

    @GetMapping("/project/{projectId}")
    public List<VersionDto> list(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId) {
        return versions.list(user, projectId);
    }

    @PostMapping("/project/{projectId}")
    @ResponseStatus(HttpStatus.CREATED)
    public VersionDto save(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @RequestBody SaveVersionRequest req) {
        return versions.save(user, projectId, req.label(), req.auto(), req.thumbnail());
    }

    @PostMapping("/project/{projectId}/{versionId}/restore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restore(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long versionId) {
        versions.restore(user, projectId, versionId);
    }

    @DeleteMapping("/project/{projectId}/{versionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @PathVariable Long versionId) {
        versions.delete(user, projectId, versionId);
    }
}
