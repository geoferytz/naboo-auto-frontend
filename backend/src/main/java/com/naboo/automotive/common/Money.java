package com.naboo.automotive.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Monetary value exposed over GraphQL as a decimal string to avoid floating-point loss. */
public record Money(String amount, String currency) {

    public static Money of(BigDecimal amount, String currency) {
        return amount == null ? null : new Money(amount.setScale(2, RoundingMode.UNNECESSARY).toPlainString(), currency);
    }

    /** Parses a user-supplied decimal string into a non-negative amount with at most two decimal places. */
    public static BigDecimal parseAmount(String raw, String field) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            BigDecimal value = new BigDecimal(raw.trim());
            if (value.signum() < 0 || value.scale() > 2 || value.precision() - value.scale() > 12) {
                throw new BusinessRuleException("INVALID_AMOUNT", field + " must be a non-negative amount with at most 2 decimals");
            }
            return value.setScale(2, RoundingMode.UNNECESSARY);
        } catch (NumberFormatException e) {
            throw new BusinessRuleException("INVALID_AMOUNT", field + " must be a valid number");
        }
    }
}
