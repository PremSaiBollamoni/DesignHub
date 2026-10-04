package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "versions", indexes = @Index(columnList = "project_id,createdAt"))
public class Version extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY)
    private User author;
    @Column(length = 160)
    private String label;
    private boolean auto;
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String snapshot;
    @Column(columnDefinition = "MEDIUMTEXT")
    private String thumbnail;
}
