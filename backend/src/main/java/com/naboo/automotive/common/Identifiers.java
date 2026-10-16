package com.naboo.automotive.common;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.Locale;

public final class Identifiers {

    private static final SecureRandom RANDOM = new SecureRandom();
    // Crockford-style alphabet without ambiguous characters (0/O, 1/I/L).
    private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();

    private Identifiers() {
    }

    /** Customer-facing reference such as {@code NA-ENQ-7K3M9QXT}. */
    public static String reference(String prefix) {
        return "NA-" + prefix + "-" + randomToken(8);
    }

    public static String randomToken(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }

    public static String slugify(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.length() > 120 ? slug.substring(0, 120) : slug;
    }
}
