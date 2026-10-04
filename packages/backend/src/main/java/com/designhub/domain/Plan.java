package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "plans", indexes = @Index(columnList = "code", unique = true))
public class Plan extends BaseEntity {
    @Column(nullable = false, length = 32)
    private String code;
    @Column(nullable = false, length = 80)
    private String name;
    private int priceCents;
    private int maxProjects;
    private long storageBytes;
    private int aiRequestsPerMonth;
    private int exportsPerMonth;
    private int teamSeats;
}
