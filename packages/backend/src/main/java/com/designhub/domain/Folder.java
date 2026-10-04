package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "folders", indexes = @Index(columnList = "owner_id"))
public class Folder extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User owner;
    @Column(nullable = false, length = 120)
    private String name;
}
