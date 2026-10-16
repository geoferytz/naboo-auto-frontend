package com.naboo.automotive.auth;

import java.util.List;
import java.util.UUID;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.naboo.automotive.users.User;
import com.naboo.automotive.users.UserRepository;

/**
 * Builds the authentication from the user's <em>current</em> database state rather than the roles claim in the token,
 * so disabling an account or removing a role takes effect immediately instead of when the token expires.
 */
@Component
public class LiveUserAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public LiveUserAuthenticationConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidBearerTokenException("Invalid token subject");
        }
        User user = users.findById(id).filter(User::isEnabled)
                .orElseThrow(() -> new InvalidBearerTokenException("Account is not active"));
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.name())).toList();
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
