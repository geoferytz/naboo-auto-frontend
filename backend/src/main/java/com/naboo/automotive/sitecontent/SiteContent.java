package com.naboo.automotive.sitecontent;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Single-row JSON document holding public site content managed from the admin area
 * (contact details, logo, hero slides, homepage sections). The frontend defines the
 * document shape and merges it over built-in defaults.
 */
@Entity
@Table(name = "site_content")
public class SiteContent {

    public static final short SINGLETON_ID = 1;

    @Id
    private short id = SINGLETON_ID;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String content;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    protected SiteContent() {
    }

    public SiteContent(String content, UUID updatedBy) {
        this.content = content;
        this.updatedBy = updatedBy;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content, UUID updatedBy) {
        this.content = content;
        this.updatedBy = updatedBy;
    }
}
