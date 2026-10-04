package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "email_settings", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
public class EmailSetting extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    private boolean comments = true;
    private boolean mentions = true;
    private boolean invitations = true;
    private boolean approvals = true;
    private boolean productUpdates = true;
}
