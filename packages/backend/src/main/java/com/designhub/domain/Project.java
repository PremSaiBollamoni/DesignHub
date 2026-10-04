package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.LastModifiedDate;

@Getter
@Setter
@Entity
@Table(name = "projects", indexes = {
        @Index(columnList = "owner_id,deletedAt"),
        @Index(columnList = "team_id"),
        @Index(columnList = "title")})
public class Project extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User owner;
    @ManyToOne(fetch = FetchType.LAZY)
    private Team team;
    @ManyToOne(fetch = FetchType.LAZY)
    private Folder folder;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false)
    private int width = 1080;
    @Column(nullable = false)
    private int height = 1080;
    @Column(columnDefinition = "MEDIUMTEXT")
    private String thumbnail;
    private Instant deletedAt;
    @LastModifiedDate
    private Instant updatedAt;
    @Column(nullable = false)
    private long revision;
}
