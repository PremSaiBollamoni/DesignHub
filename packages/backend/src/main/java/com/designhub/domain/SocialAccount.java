package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "social_accounts", indexes = @Index(columnList = "user_id,platform"))
public class SocialAccount extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 24)
    private String platform;
    @Column(length = 120)
    private String externalId;
    @Column(length = 160)
    private String displayName;
    @Column(columnDefinition = "TEXT")
    private String encryptedAccessToken;
    @Column(columnDefinition = "TEXT")
    private String encryptedRefreshToken;
    private Instant tokenExpiresAt;
}
