package com.naboo.automotive.auth;

import java.util.EnumSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.users.Role;
import com.naboo.automotive.users.User;
import com.naboo.automotive.users.UserRepository;

/**
 * Creates the first SUPER_ADMIN from APP_BOOTSTRAP_ADMIN_EMAIL / APP_BOOTSTRAP_ADMIN_PASSWORD when no super admin
 * exists yet. Does nothing once a super admin is present, so the variables can be removed after first start.
 */
@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final AppProperties.BootstrapAdmin config;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    public BootstrapAdminRunner(AppProperties properties, UserRepository users, PasswordEncoder passwordEncoder,
            AuditService audit) {
        this.config = properties.bootstrapAdmin();
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (config == null || isBlank(config.email()) || isBlank(config.password()) || users.existsByRole(Role.SUPER_ADMIN)) {
            return;
        }
        if (config.password().length() < 12) {
            throw new IllegalStateException("APP_BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters");
        }
        String email = AuthService.normaliseEmail(config.email());
        if (users.existsByEmail(email)) {
            log.warn("Bootstrap admin skipped: a user with the configured email already exists");
            return;
        }
        User admin = users.save(new User(email, passwordEncoder.encode(config.password()), config.fullName(), null,
                EnumSet.of(Role.SUPER_ADMIN)));
        audit.record(null, "BOOTSTRAP_ADMIN_CREATED", "User", admin.getId(), null);
        log.info("Bootstrap super admin account created");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
