package com.naboo.automotive.audit;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.users.User;
import com.naboo.automotive.users.UserRepository;

@Controller
public class AuditController {

    public record AuditLogView(UUID id, String action, String entityType, String entityId, String details, UUID actorUserId,
            String actorName, Instant createdAt) {
    }

    private final AuditLogRepository logs;
    private final UserRepository users;

    public AuditController(AuditLogRepository logs, UserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    @QueryMapping
    @PreAuthorize(Permissions.AUDIT_VIEW)
    @Transactional(readOnly = true)
    public PageView<AuditLogView> auditLogs(@Argument String entityType, @Argument String entityId, @Argument Integer page,
            @Argument Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        Page<AuditLog> result = logs.search(blankToEmpty(entityType), blankToEmpty(entityId), request);
        Map<UUID, String> names = users.findAllById(result.stream().map(AuditLog::getActorUserId).filter(id -> id != null).toList())
                .stream().collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
        return PageView.of(result, l -> view(l, names));
    }

    private static AuditLogView view(AuditLog l, Map<UUID, String> names) {
        return new AuditLogView(l.getId(), l.getAction(), l.getEntityType(), l.getEntityId(), l.getDetails(), l.getActorUserId(),
                l.getActorUserId() == null ? "System" : names.getOrDefault(l.getActorUserId(), "Unknown user"), l.getCreatedAt());
    }

    private static String blankToEmpty(String s) {
        return s == null ? "" : s.trim();
    }
}
