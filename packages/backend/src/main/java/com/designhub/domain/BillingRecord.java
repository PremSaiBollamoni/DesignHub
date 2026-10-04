package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "billing_records", indexes = @Index(columnList = "user_id,createdAt"))
public class BillingRecord extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 80)
    private String description;
    private int amountCents;
    @Column(nullable = false, length = 24)
    private String status;
}
