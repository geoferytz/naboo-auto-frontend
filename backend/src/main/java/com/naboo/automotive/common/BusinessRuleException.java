package com.naboo.automotive.common;

/** A request that is well-formed but violates a business rule. The message is safe to show to users. */
public class BusinessRuleException extends RuntimeException {

    private final String code;

    public BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
