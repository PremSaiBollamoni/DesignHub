package com.designhub.web;

import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.security.AuthUser;
import com.designhub.service.TemplateService;
import com.designhub.service.TemplateService.*;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class TemplateController {
    private final TemplateService templates;

    public record PublishRequest(@NotBlank String title, Long categoryId, String tags, String thumbnail) {}

    @GetMapping("/api/categories")
    public List<CategoryDto> categories() {
        return templates.categories();
    }

    @GetMapping("/api/templates")
    public TemplatePage search(@RequestParam(required = false) Long categoryId, @RequestParam(defaultValue = "") String q,
                               @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size) {
        return templates.search(categoryId, q, page, size);
    }

    @GetMapping("/api/templates/{id}/design")
    public DesignDto design(@PathVariable Long id) {
        return templates.design(id);
    }

    @PostMapping("/api/templates/from-project/{projectId}")
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateDto publish(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @RequestBody PublishRequest req) {
        return templates.publish(user, projectId, req.title(), req.categoryId(), req.tags(), req.thumbnail());
    }
}
