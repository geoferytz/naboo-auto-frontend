package com.naboo.automotive.audit;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /** Records an audit entry in the caller's transaction so it commits or rolls back with the change it describes. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorUserId, String action, String entityType, Object entityId, String details) {
        repository.save(new AuditLog(actorUserId, action, entityType, entityId == null ? null : entityId.toString(), details));
    }
}
