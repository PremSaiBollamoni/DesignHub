package com.designhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** One request to have a team design approved. The newest row for a project is the one that counts. */
@Getter
@Setter
@Entity
@Table(name = "design_approvals", indexes = @Index(columnList = "project_id,createdAt"))
public class DesignApproval extends BaseEntity {
    public enum Status { PENDING, APPROVED, CHANGES_REQUESTED, CANCELLED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User requestedBy;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private Status status = Status.PENDING;
    /** Note from the maker to the editors. */
    @Column(columnDefinition = "TEXT")
    private String message;
    /** Why changes were requested. */
    @Column(columnDefinition = "TEXT")
    private String feedback;
    /** Suggested post text, editable by the approver. */
    @Column(columnDefinition = "TEXT")
    private String caption;
    @ManyToOne(fetch = FetchType.LAZY)
    private User decidedBy;
    private Instant decidedAt;
    /** Project revision when approved. Any later edit changes the revision and so voids the approval. */
    private Long approvedRevision;
}
