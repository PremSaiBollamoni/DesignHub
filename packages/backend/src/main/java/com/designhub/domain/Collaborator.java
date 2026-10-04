package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "collaborators", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"}))
public class Collaborator extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Access role = Access.MAKER;
}
