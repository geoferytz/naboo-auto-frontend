package com.naboo.automotive.auth;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthInputs.AuthPayload;
import com.naboo.automotive.auth.AuthInputs.LoginInput;
import com.naboo.automotive.auth.AuthInputs.RegisterInput;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.users.Role;
import com.naboo.automotive.users.User;
import com.naboo.automotive.users.UserRepository;
import com.naboo.automotive.users.UserView;

@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password.";

    private final UserRepository users;
    private final CustomerRepository customers;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService audit;
    private final String dummyHash;

    public AuthService(UserRepository users, CustomerRepository customers, PasswordEncoder passwordEncoder,
            JwtService jwtService, AuditService audit) {
        this.users = users;
        this.customers = customers;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.audit = audit;
        this.dummyHash = passwordEncoder.encode("timing-equaliser-" + UUID.randomUUID());
    }

    public static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public AuthPayload register(RegisterInput input) {
        String email = normaliseEmail(input.email());
        if (users.existsByEmail(email)) {
            throw new BusinessRuleException("EMAIL_TAKEN", "An account with this email already exists.");
        }
        User user = users.save(new User(email, passwordEncoder.encode(input.password()), input.fullName().trim(),
                blankToNull(input.phone()), EnumSet.of(Role.CUSTOMER)));
        customers.save(new Customer(user.getId(), user.getFullName(), email, user.getPhone()));
        audit.record(user.getId(), "USER_REGISTERED", "User", user.getId(), null);
        return payload(user);
    }

    @Transactional
    public AuthPayload login(LoginInput input) {
        Optional<User> found = users.findByEmail(normaliseEmail(input.email()));
        // Always run a hash comparison so response time does not reveal whether the account exists.
        boolean matches = passwordEncoder.matches(input.password(), found.map(User::getPasswordHash).orElse(dummyHash));
        User user = found.filter(u -> matches && u.isEnabled())
                .orElseThrow(() -> new BusinessRuleException("INVALID_CREDENTIALS", INVALID_CREDENTIALS));
        user.recordLogin(Instant.now());
        return payload(user);
    }

    @Transactional(readOnly = true)
    public Optional<UserView> me(UUID userId) {
        return users.findById(userId).filter(User::isEnabled).map(UserView::of);
    }

    private AuthPayload payload(User user) {
        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthPayload(token.token(), token.expiresAt(), UserView.of(user));
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
