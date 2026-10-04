package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "social_posts", indexes = {@Index(columnList = "status,scheduledAt"), @Index(columnList = "author_id")})
public class SocialPost extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private SocialAccount account;
    @ManyToOne(fetch = FetchType.LAZY)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY)
    private User reviewer;
    @Column(columnDefinition = "TEXT")
    private String caption;
    @Column(length = 400)
    private String mediaUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private Status status = Status.DRAFT;
    private Instant scheduledAt;
    private Instant publishedAt;
    @Column(length = 200)
    private String externalPostId;
    @Column(columnDefinition = "TEXT")
    private String feedback;
    @Column(columnDefinition = "TEXT")
    private String error;

    public enum Status { DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, SCHEDULED, PUBLISHING, PUBLISHED, FAILED }
}
