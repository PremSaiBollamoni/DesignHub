package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "activities", indexes = {@Index(columnList = "project_id,createdAt"), @Index(columnList = "actor_id,createdAt")})
public class Activity extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    private User actor;
    @ManyToOne(fetch = FetchType.LAZY)
    private Project project;
    @Column(nullable = false, length = 48)
    private String type;
    @Column(columnDefinition = "TEXT")
    private String meta;
}
