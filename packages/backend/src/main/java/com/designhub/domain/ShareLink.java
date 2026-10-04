package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "share_links", indexes = @Index(columnList = "token", unique = true))
public class ShareLink extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @Column(nullable = false, length = 64)
    private String token;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Access role = Access.VIEWER;
    private Instant expiresAt;
    private boolean revoked;
}
