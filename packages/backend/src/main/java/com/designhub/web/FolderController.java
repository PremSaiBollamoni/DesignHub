package com.designhub.web;

import com.designhub.dto.ProjectDtos.FolderDto;
import com.designhub.dto.ProjectDtos.FolderRequest;
import com.designhub.security.AuthUser;
import com.designhub.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories/folders")
@RequiredArgsConstructor
public class FolderController {
    private final ProjectService projects;

    @GetMapping
    public List<FolderDto> list(@AuthenticationPrincipal AuthUser user) {
        return projects.folders(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody FolderRequest req) {
        return projects.createFolder(user, req.name());
    }

    @PatchMapping("/{id}")
    public FolderDto rename(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @Valid @RequestBody FolderRequest req) {
        return projects.renameFolder(user, id, req.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        projects.deleteFolder(user, id);
    }
}
