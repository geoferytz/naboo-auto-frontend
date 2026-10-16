package com.naboo.automotive.common;

public class RateLimitedException extends RuntimeException {

    public RateLimitedException() {
        super("Too many requests. Please wait a minute and try again.");
    }
}
