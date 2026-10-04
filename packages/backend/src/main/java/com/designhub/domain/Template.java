package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "templates", indexes = @Index(columnList = "category_id"))
public class Template extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    private Category category;
    @ManyToOne(fetch = FetchType.LAZY)
    private User author;
    @Column(nullable = false, length = 160)
    private String title;
    private int width;
    private int height;
    @Column(columnDefinition = "MEDIUMTEXT")
    private String thumbnail;
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String design;
    @Column(length = 300)
    private String tags;
    private boolean published = true;
}
