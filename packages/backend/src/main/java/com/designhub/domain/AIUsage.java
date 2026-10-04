package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "ai_usage", indexes = @Index(columnList = "user_id,createdAt"))
public class AIUsage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 32)
    private String provider;
    @Column(nullable = false, length = 32)
    private String kind;
    @Column(length = 120)
    private String model;
    /** Only the prompt length is kept, never the prompt itself. */
    private int promptChars;
    private int outputChars;
    private boolean success;
    private long latencyMs;
}
