package com.designhub.repository;

import com.designhub.domain.BillingRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingRecordRepository extends JpaRepository<BillingRecord, Long> {
    List<BillingRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}
