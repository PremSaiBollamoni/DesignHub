package com.designhub.repository;

import com.designhub.domain.Asset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Asset> findByBrandKitIdOrderByCreatedAtDesc(Long brandKitId);

    @Query("select coalesce(sum(a.sizeBytes), 0) from Asset a where a.owner.id = :uid")
    long totalBytes(@Param("uid") Long uid);
}
