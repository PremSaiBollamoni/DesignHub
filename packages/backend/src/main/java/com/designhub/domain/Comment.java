package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "comments", indexes = @Index(columnList = "project_id,pageId"))
public class Comment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;
    @ManyToOne(fetch = FetchType.LAZY)
    private Comment parent;
    @Column(length = 36)
    private String pageId;
    @Column(length = 36)
    private String elementId;
    private Double x;
    private Double y;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;
    /** Comma separated ids of the users mentioned in the body. */
    @Column(length = 500)
    private String mentions;
    private boolean resolved;
}
