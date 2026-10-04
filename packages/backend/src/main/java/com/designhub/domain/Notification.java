package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "notifications", indexes = @Index(columnList = "user_id,readAt,createdAt"))
public class Notification extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 32)
    private String type;
    @Column(nullable = false, length = 300)
    private String message;
    @Column(length = 300)
    private String link;
    private Instant readAt;
}
