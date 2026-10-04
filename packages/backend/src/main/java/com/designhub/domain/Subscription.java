package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "subscriptions", indexes = @Index(columnList = "user_id"))
public class Subscription extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Plan plan;
    @Column(nullable = false, length = 24)
    private String status = "ACTIVE";
    private Instant currentPeriodEnd;
}
