package com.designhub.web;

import com.designhub.domain.Access;
import com.designhub.domain.ExportJob;
import com.designhub.repository.ExportJobRepository;
import com.designhub.repository.ProjectRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.service.AccessService;
import com.designhub.service.ActivityService;
import com.designhub.service.SubscriptionService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Rendering happens in the browser (Konva, PDF and video encoders) so large canvases never block the server;
 * this endpoint is the quota gate and the audit record for every export.
 */
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {
    private static final Set<String> FORMATS = Set.of("png", "jpg", "pdf", "svg", "zip", "gif", "mp4", "webm", "xlsx");

    private final ExportJobRepository exports;
    private final ProjectRepository projects;
    private final UserRepository users;
    private final AccessService access;
    private final SubscriptionService subscriptions;
    private final ActivityService activity;

    public record ExportRequest(Long projectId, @NotBlank String format, @Min(1) int pageCount, long sizeBytes) {}

    public record ExportDto(Long id, Long projectId, String projectTitle, String format, int pageCount, long sizeBytes, Instant createdAt) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ExportDto record(@AuthenticationPrincipal AuthUser user, @RequestBody ExportRequest req) {
        String format = req.format().toLowerCase();
        if (!FORMATS.contains(format)) throw com.designhub.exception.ApiException.badRequest("Unsupported export format");
        if (req.projectId() != null) access.require(req.projectId(), user, Access.VIEWER);
        subscriptions.checkExportQuota(user.id());
        ExportJob job = new ExportJob();
        job.setUser(users.getReferenceById(user.id()));
        if (req.projectId() != null) job.setProject(projects.getReferenceById(req.projectId()));
        job.setFormat(format);
        job.setPageCount(req.pageCount());
        job.setSizeBytes(Math.max(0, req.sizeBytes()));
        exports.save(job);
        activity.log(user.id(), req.projectId(), "export.created", format);
        return dto(job);
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ExportDto> history(@AuthenticationPrincipal AuthUser user) {
        return exports.findByUserIdOrderByCreatedAtDesc(user.id(), PageRequest.of(0, 50)).stream().map(this::dto).toList();
    }

    private ExportDto dto(ExportJob j) {
        return new ExportDto(j.getId(), j.getProject() == null ? null : j.getProject().getId(), j.getProject() == null ? null : j.getProject().getTitle(),
                j.getFormat(), j.getPageCount(), j.getSizeBytes(), j.getCreatedAt() == null ? Instant.now() : j.getCreatedAt());
    }
}
