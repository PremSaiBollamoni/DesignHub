package com.designhub.repository;

import com.designhub.domain.BrandKit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandKitRepository extends JpaRepository<BrandKit, Long> {
    List<BrandKit> findByOwnerIdOrderByCreatedAtAsc(Long ownerId);
}
