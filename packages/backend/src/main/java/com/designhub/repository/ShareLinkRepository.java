package com.designhub.repository;

import com.designhub.domain.ShareLink;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {
    Optional<ShareLink> findByToken(String token);

    List<ShareLink> findByProjectIdAndRevokedFalse(Long projectId);
}
