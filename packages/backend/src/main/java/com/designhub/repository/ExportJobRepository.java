package com.designhub.repository;

import com.designhub.domain.ExportJob;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExportJobRepository extends JpaRepository<ExportJob, Long> {
    List<ExportJob> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndCreatedAtAfter(Long userId, Instant since);
}
