package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "categories", indexes = @Index(columnList = "slug", unique = true))
public class Category extends BaseEntity {
    @Column(nullable = false, length = 80)
    private String name;
    @Column(nullable = false, length = 80)
    private String slug;
    private int width = 1080;
    private int height = 1080;
    private int sortOrder;
}
