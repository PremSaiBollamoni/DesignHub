package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "elements", indexes = @Index(columnList = "page_id,zIndex"))
public class Element {
    @Id
    @Column(length = 36)
    private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Page page;
    @Column(nullable = false, length = 24)
    private String type;
    @Column(nullable = false)
    private int zIndex;
    /** Full element JSON (geometry, style, content) as authored by the editor. */
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String data;
}
