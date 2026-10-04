package com.designhub.repository;

import com.designhub.domain.SocialPost;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SocialPostRepository extends JpaRepository<SocialPost, Long> {
    @Query("select p from SocialPost p where p.author.id = :uid or p.reviewer.id = :uid or (p.status = 'PENDING_APPROVAL' and p.account.user.id = :uid) order by p.createdAt desc")
    List<SocialPost> findVisible(@Param("uid") Long uid);

    List<SocialPost> findByStatusAndScheduledAtLessThanEqual(SocialPost.Status status, Instant now);

    long countByAccountId(Long accountId);
}
