package com.naboo.automotive.config;

import java.net.InetSocketAddress;
import java.util.Map;

import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;

import reactor.core.publisher.Mono;

/**
 * Exposes the client IP to resolvers as the {@code clientIp} context value. Behind the reverse proxy the
 * address is derived from X-Forwarded-For via {@code server.forward-headers-strategy=native}.
 */
@Component
public class ClientIpInterceptor implements WebGraphQlInterceptor {

    public static final String CLIENT_IP = "clientIp";

    @Override
    public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        InetSocketAddress remote = request.getRemoteAddress();
        String ip = remote != null && remote.getAddress() != null ? remote.getAddress().getHostAddress() : "unknown";
        request.configureExecutionInput((input, builder) -> builder.graphQLContext(Map.of(CLIENT_IP, ip)).build());
        return chain.next(request);
    }
}
