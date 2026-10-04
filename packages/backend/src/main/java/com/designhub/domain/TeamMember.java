package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "team_members", uniqueConstraints = @UniqueConstraint(columnNames = {"team_id", "user_id"}))
public class TeamMember extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Team team;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Access role = Access.MAKER;
}
