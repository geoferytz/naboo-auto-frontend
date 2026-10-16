package com.naboo.automotive.audit;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId);

    @Query("""
            select l from AuditLog l
            where (:entityType = '' or l.entityType = :entityType) and (:entityId = '' or l.entityId = :entityId)""")
    Page<AuditLog> search(String entityType, String entityId, Pageable pageable);
}
