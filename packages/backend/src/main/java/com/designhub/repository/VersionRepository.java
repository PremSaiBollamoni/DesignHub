package com.designhub.repository;

import com.designhub.domain.Version;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VersionRepository extends JpaRepository<Version, Long> {
    /** Metadata only: snapshots can be megabytes, so listings never load them. */
    @Query("select v.id as id, v.label as label, v.auto as auto, v.createdAt as createdAt, v.author.name as authorName, v.thumbnail as thumbnail from Version v where v.project.id = :pid order by v.createdAt desc")
    List<VersionMeta> listMeta(@Param("pid") Long projectId);

    interface VersionMeta {
        Long getId();
        String getLabel();
        boolean getAuto();
        java.time.Instant getCreatedAt();
        String getAuthorName();
        String getThumbnail();
    }
}
