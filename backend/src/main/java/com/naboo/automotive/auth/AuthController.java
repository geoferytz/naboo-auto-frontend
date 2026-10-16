package com.naboo.automotive.auth;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.AuthInputs.AuthPayload;
import com.naboo.automotive.auth.AuthInputs.LoginInput;
import com.naboo.automotive.auth.AuthInputs.RegisterInput;
import com.naboo.automotive.config.ClientIpInterceptor;
import com.naboo.automotive.config.RateLimiter;
import com.naboo.automotive.users.UserView;

import jakarta.validation.Valid;

@Controller
public class AuthController {

    private final AuthService authService;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, RateLimiter rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @QueryMapping
    public UserView me(@AuthenticationPrincipal Jwt jwt) {
        return jwt == null ? null : authService.me(CurrentUser.id(jwt)).orElse(null);
    }

    @MutationMapping
    public AuthPayload register(@Argument @Valid RegisterInput input,
            @ContextValue(name = ClientIpInterceptor.CLIENT_IP, required = false) String clientIp) {
        rateLimiter.check("register", clientIp);
        return authService.register(input);
    }

    @MutationMapping
    public AuthPayload login(@Argument @Valid LoginInput input,
            @ContextValue(name = ClientIpInterceptor.CLIENT_IP, required = false) String clientIp) {
        rateLimiter.check("login", clientIp);
        return authService.login(input);
    }
}
