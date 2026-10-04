package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Pages use client-generated ids so optimistic edits and collaboration ops never need a round trip. */
@Getter
@Setter
@Entity
@Table(name = "pages", indexes = @Index(columnList = "project_id,position"))
public class Page {
    @Id
    @Column(length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @Column(nullable = false)
    private int position;
    @Column(length = 120)
    private String name;
    @Column(columnDefinition = "TEXT")
    private String background;
    /** Display duration in seconds when presenting or exporting as video. */
    private Double durationSeconds;
    /** Speaker notes for this page. */
    @Column(columnDefinition = "TEXT")
    private String notes;
}
