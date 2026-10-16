package com.naboo.automotive.notifications;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An in-app notification for a user account, created by business events. */
@Entity
@Table(name = "notifications")
public class Notification {

    public enum NotificationType {
        RESERVATION_STATUS,
        BOOKING_STATUS,
        QUOTATION_READY,
        ORDER_STATUS,
        INVOICE_ISSUED,
        PAYMENT_CONFIRMED,
        JOB_ASSIGNED,
        LOW_STOCK
    }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String body;

    /** Frontend route the notification links to (e.g. /my-account). */
    @Column(length = 300)
    private String link;

    @Column(name = "entity_type", length = 40)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected Notification() {
    }

    public Notification(UUID userId, NotificationType type, String title, String body, String link,
            String entityType, UUID entityId) {
        this.userId = userId;
        this.type = type.name();
        this.title = title;
        this.body = body;
        this.link = link;
        this.entityType = entityType;
        this.entityId = entityId;
    }

    public boolean isRead() {
        return readAt != null;
    }

    public void markRead(Instant now) {
        if (readAt == null) {
            this.readAt = now;
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLink() {
        return link;
    }

    public String getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
