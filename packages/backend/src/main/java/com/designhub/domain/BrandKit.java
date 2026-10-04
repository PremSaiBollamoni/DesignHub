package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "brand_kits", indexes = @Index(columnList = "owner_id"))
public class BrandKit extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User owner;
    @ManyToOne(fetch = FetchType.LAZY)
    private Team team;
    @Column(nullable = false, length = 120)
    private String name;
    /** JSON array of {name, hex}. */
    @Column(columnDefinition = "TEXT")
    private String colors;
    /** JSON array of {role, family, weight}. */
    @Column(columnDefinition = "TEXT")
    private String fonts;
    @Column(columnDefinition = "TEXT")
    private String guidelines;
}
