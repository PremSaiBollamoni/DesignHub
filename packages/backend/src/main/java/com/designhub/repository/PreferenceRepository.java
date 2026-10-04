package com.designhub.repository;

import com.designhub.domain.Preference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreferenceRepository extends JpaRepository<Preference, Long> {
    List<Preference> findByUserId(Long userId);

    Optional<Preference> findByUserIdAndPrefKey(Long userId, String key);
}
