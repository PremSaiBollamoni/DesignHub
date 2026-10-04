package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "assets", indexes = {@Index(columnList = "owner_id,kind"), @Index(columnList = "brand_kit_id")})
public class Asset extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User owner;
    @ManyToOne(fetch = FetchType.LAZY)
    private BrandKit brandKit;
    @Column(nullable = false, length = 24)
    private String kind;
    @Column(nullable = false)
    private String fileName;
    @Column(nullable = false)
    private String storedName;
    @Column(length = 120)
    private String mimeType;
    private long sizeBytes;
    private Integer width;
    private Integer height;
}
