package com.naboo.automotive.notifications;

import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.notifications.NotificationService.NotificationView;

@Controller
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<NotificationView> myNotifications(@AuthenticationPrincipal Jwt jwt, @Argument Integer page,
            @Argument Integer size) {
        return notifications.mine(CurrentUser.id(jwt), page, size);
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public int unreadNotificationCount(@AuthenticationPrincipal Jwt jwt) {
        return (int) notifications.unreadCount(CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public NotificationView markNotificationRead(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return notifications.markRead(id, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public int markAllNotificationsRead(@AuthenticationPrincipal Jwt jwt) {
        return notifications.markAllRead(CurrentUser.id(jwt));
    }
}
