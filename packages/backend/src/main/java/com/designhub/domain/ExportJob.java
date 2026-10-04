package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "exports", indexes = @Index(columnList = "user_id,createdAt"))
public class ExportJob extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @ManyToOne(fetch = FetchType.LAZY)
    private Project project;
    @Column(nullable = false, length = 16)
    private String format;
    private long sizeBytes;
    private int pageCount;
}
