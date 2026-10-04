package com.designhub.repository;

import com.designhub.domain.AISetting;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AISettingRepository extends JpaRepository<AISetting, Long> {
    List<AISetting> findByUserId(Long userId);

    Optional<AISetting> findByUserIdAndProvider(Long userId, String provider);

    Optional<AISetting> findFirstByUserIdAndActiveTrue(Long userId);
}
