package com.designhub.repository;

import com.designhub.domain.SocialAccount;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {
    List<SocialAccount> findByUserIdOrderByCreatedAtDesc(Long userId);
}
