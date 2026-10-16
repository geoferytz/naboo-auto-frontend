package com.naboo.automotive.notifications;

import java.time.Clock;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.notifications.Notification.NotificationType;

/** Creates in-app notifications for business events and serves them to the owning user. */
@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final CustomerRepository customers;
    private final Clock clock = Clock.systemUTC();

    public NotificationService(NotificationRepository notifications, CustomerRepository customers) {
        this.notifications = notifications;
        this.customers = customers;
    }

    /**
     * Notifies a user directly. Runs in the enclosing transaction, so a notification is committed exactly when the
     * business event it describes is committed.
     */
    public void notify(UUID userId, NotificationType type, String title, String body, String link,
            String entityType, UUID entityId) {
        if (userId == null) {
            return;
        }
        notifications.save(new Notification(userId, type, title, body, link, entityType, entityId));
    }

    /** Notifies the user account behind a customer profile, if there is one. */
    public void notifyCustomer(UUID customerId, NotificationType type, String title, String body, String link,
            String entityType, UUID entityId) {
        if (customerId == null) {
            return;
        }
        notify(customers.findById(customerId).map(Customer::getUserId).orElse(null),
                type, title, body, link, entityType, entityId);
    }

    @Transactional(readOnly = true)
    public PageView<NotificationView> mine(UUID userId, Integer page, Integer size) {
        return PageView.of(
                notifications.findByUserIdOrderByCreatedAtDesc(userId,
                        PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt")))),
                NotificationView::of);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notifications.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public NotificationView markRead(UUID id, UUID userId) {
        Notification n = notifications.findById(id).orElseThrow(() -> new NotFoundException("Notification not found."));
        if (!n.getUserId().equals(userId)) {
            throw new NotFoundException("Notification not found.");
        }
        n.markRead(clock.instant());
        notifications.flush();
        return NotificationView.of(n);
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return notifications.markAllRead(userId, clock.instant());
    }

    public record NotificationView(UUID id, String type, String title, String body, String link, String entityType,
            UUID entityId, boolean read, java.time.Instant createdAt) {

        static NotificationView of(Notification n) {
            return new NotificationView(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(),
                    n.getEntityType(), n.getEntityId(), n.isRead(), n.getCreatedAt());
        }
    }
}
