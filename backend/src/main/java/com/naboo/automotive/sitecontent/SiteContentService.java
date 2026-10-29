package com.naboo.automotive.sitecontent;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.common.BusinessRuleException;

@Service
public class SiteContentService {

    private static final int MAX_BYTES = 128 * 1024;

    private final SiteContentRepository repository;
    private final AuditService audit;
    private final ObjectMapper mapper;

    public SiteContentService(SiteContentRepository repository, AuditService audit, ObjectMapper mapper) {
        this.repository = repository;
        this.audit = audit;
        this.mapper = mapper;
    }

    /** Stored JSON document, or null when nothing has been saved yet. */
    @Transactional(readOnly = true)
    public String get() {
        return repository.findById(SiteContent.SINGLETON_ID).map(SiteContent::getContent).orElse(null);
    }

    @Transactional
    public String update(String content, UUID actorId) {
        String json = validate(content);
        SiteContent row = repository.findById(SiteContent.SINGLETON_ID).orElse(new SiteContent(json, actorId));
        row.setContent(json, actorId);
        repository.save(row);
        audit.record(actorId, "SITE_CONTENT_UPDATED", "SiteContent", SiteContent.SINGLETON_ID, "bytes=" + json.length());
        return json;
    }

    private String validate(String content) {
        if (content == null || content.isBlank() || content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new BusinessRuleException("INVALID_SITE_CONTENT", "Content must be a JSON document up to 128 KB.");
        }
        JsonNode node;
        try {
            node = mapper.readTree(content);
        } catch (Exception e) {
            throw new BusinessRuleException("INVALID_SITE_CONTENT", "Content must be valid JSON.");
        }
        if (!node.isObject()) {
            throw new BusinessRuleException("INVALID_SITE_CONTENT", "Content must be a JSON object.");
        }
        return node.toString();
    }
}
