package com.naboo.automotive.common;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/** User-safe error bodies for the (few) REST endpoints, matching GraphQL error codes. */
@RestControllerAdvice
public class RestExceptionHandler {

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<Map<String, String>> businessRule(BusinessRuleException e) {
        return body(HttpStatus.BAD_REQUEST, e.getCode(), e.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Map<String, String>> notFound(NotFoundException e) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> tooLarge() {
        return body(HttpStatus.PAYLOAD_TOO_LARGE, "INVALID_FILE_SIZE", "The file is too large.");
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<Map<String, String>> missingPart() {
        return body(HttpStatus.BAD_REQUEST, "MISSING_FILE", "Please choose a file to upload.");
    }

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message));
    }
}
