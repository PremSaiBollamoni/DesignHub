package com.designhub.repository;

import com.designhub.domain.EmailSetting;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailSettingRepository extends JpaRepository<EmailSetting, Long> {
    Optional<EmailSetting> findByUserId(Long userId);
}
