package com.designhub.repository;

import com.designhub.domain.AIUsage;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AIUsageRepository extends JpaRepository<AIUsage, Long> {
    long countByUserIdAndCreatedAtAfter(Long userId, Instant since);

    @Query("select u.provider as provider, u.kind as kind, count(u) as requests, sum(u.promptChars + u.outputChars) as chars from AIUsage u where u.user.id = :uid and u.createdAt >= :since group by u.provider, u.kind")
    List<Summary> summary(@Param("uid") Long uid, @Param("since") Instant since);

    interface Summary {
        String getProvider();
        String getKind();
        long getRequests();
        Long getChars();
    }
}
