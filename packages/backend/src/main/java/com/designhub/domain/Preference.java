package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "preferences", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "prefKey"}))
public class Preference extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 80)
    private String prefKey;
    @Column(columnDefinition = "TEXT")
    private String prefValue;
}
