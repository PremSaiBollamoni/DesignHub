package com.designhub.repository;

import com.designhub.domain.Notification;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(Long userId);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.user.id = :uid and n.readAt is null")
    void markAllRead(@Param("uid") Long uid, @Param("now") java.time.Instant now);

    default void markAllRead(Long uid) {
        markAllRead(uid, java.time.Instant.now());
    }
}
