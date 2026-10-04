package com.designhub.dto;

import com.designhub.domain.Access;
import com.designhub.domain.Project;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class ProjectDtos {
    private ProjectDtos() {}

    public record CreateProjectRequest(
            @NotBlank(message = "Name your design") @Size(max = 200) String title,
            @Min(16) @Max(16000) Integer width,
            @Min(16) @Max(16000) Integer height,
            Long templateId,
            Long teamId,
            Long folderId) {}

    public record UpdateProjectRequest(@Size(min = 1, max = 200) String title, Long folderId, Boolean clearFolder,
                                       String thumbnail, Long teamId) {}

    public record ProjectSummary(Long id, String title, int width, int height, String thumbnail, Instant updatedAt,
                                 Instant createdAt, Instant deletedAt, boolean favorite, String access,
                                 Long ownerId, String ownerName, Long folderId, Long teamId) {
        public static ProjectSummary of(Project p, boolean favorite, Access access) {
            return new ProjectSummary(p.getId(), p.getTitle(), p.getWidth(), p.getHeight(), p.getThumbnail(),
                    p.getUpdatedAt(), p.getCreatedAt(), p.getDeletedAt(), favorite, access.name(),
                    p.getOwner().getId(), p.getOwner().getName(),
                    p.getFolder() == null ? null : p.getFolder().getId(),
                    p.getTeam() == null ? null : p.getTeam().getId());
        }
    }

    public record ProjectPage(List<ProjectSummary> items, long total, int page, int size) {}

    public record FolderRequest(@NotBlank @Size(max = 120) String name) {}

    public record FolderDto(Long id, String name) {}
}
