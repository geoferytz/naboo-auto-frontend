package com.naboo.automotive.common;

import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import jakarta.validation.ConstraintViolationException;

/** Translates domain exceptions into typed, user-safe GraphQL errors. Unknown errors fall through to Spring's generic handling. */
@Component
public class GraphQlExceptionResolver extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        return switch (ex) {
            case NotFoundException e -> error(env, ErrorType.NOT_FOUND, e.getMessage(), Map.of("code", "NOT_FOUND"));
            case BusinessRuleException e -> error(env, ErrorType.BAD_REQUEST, e.getMessage(), Map.of("code", e.getCode()));
            case RateLimitedException e -> error(env, ErrorType.BAD_REQUEST, e.getMessage(), Map.of("code", "RATE_LIMITED"));
            case ConstraintViolationException e -> {
                List<Map<String, String>> fields = e.getConstraintViolations().stream()
                        .map(v -> Map.of("field", lastNode(v.getPropertyPath().toString()), "message", v.getMessage()))
                        .toList();
                yield error(env, ErrorType.BAD_REQUEST, "Please correct the highlighted fields.",
                        Map.of("code", "VALIDATION_FAILED", "fields", fields));
            }
            case OptimisticLockingFailureException e -> error(env, ErrorType.BAD_REQUEST,
                    "This record was changed by someone else. Reload and try again.", Map.of("code", "CONCURRENT_MODIFICATION"));
            case DataIntegrityViolationException e -> error(env, ErrorType.BAD_REQUEST,
                    "The request conflicts with existing data.", Map.of("code", "CONFLICT"));
            default -> null;
        };
    }

    private static String lastNode(String path) {
        int idx = path.lastIndexOf('.');
        return idx >= 0 ? path.substring(idx + 1) : path;
    }

    private static GraphQLError error(DataFetchingEnvironment env, ErrorType type, String message, Map<String, Object> ext) {
        return GraphqlErrorBuilder.newError(env).errorType(type).message(message).extensions(ext).build();
    }
}
