package com.designhub.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "ai_settings", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider"}))
public class AISetting extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(nullable = false, length = 32)
    private String provider;
    /** AES-GCM ciphertext (base64). Never serialised to clients. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedKey;
    @Column(length = 120)
    private String textModel;
    @Column(length = 120)
    private String imageModel;
    @Column(length = 300)
    private String baseUrl;
    private boolean active = true;
}
