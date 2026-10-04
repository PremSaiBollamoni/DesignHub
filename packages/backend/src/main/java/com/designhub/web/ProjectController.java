package com.designhub.web;

import com.designhub.domain.Access;
import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.dto.ProjectDtos.*;
import com.designhub.security.AuthUser;
import com.designhub.service.AccessService;
import com.designhub.service.DesignService;
import com.designhub.service.ProjectService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectService projects;
    private final DesignService design;
    private final AccessService access;

    @GetMapping
    public ProjectPage list(@AuthenticationPrincipal AuthUser user,
                            @RequestParam(defaultValue = "") String q,
                            @RequestParam(defaultValue = "all") String view,
                            @RequestParam(required = false) Long folderId,
                            @RequestParam(defaultValue = "updated") String sort,
                            @RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "24") int size) {
        return projects.list(user, q, view, folderId, sort, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectSummary create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody CreateProjectRequest req) {
        return projects.create(user, req);
    }

    @GetMapping("/{id}")
    public ProjectSummary get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return projects.get(user, id);
    }

    @PatchMapping("/{id}")
    public ProjectSummary update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @Valid @RequestBody UpdateProjectRequest req) {
        return projects.update(user, id, req);
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectSummary duplicate(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return projects.duplicate(user, id);
    }

    @PostMapping("/{id}/trash")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trash(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        projects.trash(user, id);
    }

    @PostMapping("/{id}/restore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restore(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        projects.restore(user, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteForever(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        projects.deleteForever(user, id);
    }

    @GetMapping("/{id}/design")
    public DesignDto loadDesign(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return design.load(access.require(id, user, Access.VIEWER).project());
    }

    @PutMapping("/{id}/design")
    public Map<String, Long> saveDesign(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody DesignDto body) {
        var project = access.require(id, user, Access.MAKER).project();
        design.replace(project, body, false);
        return Map.of("revision", design.load(project).revision());
    }

    @PostMapping("/{id}/favorite")
    public Map<String, Boolean> favorite(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return Map.of("favorite", projects.toggleFavorite(user, id));
    }
}
