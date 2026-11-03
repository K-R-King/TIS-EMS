package TIS.EMS.config;

import TIS.EMS.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/** Locks an account for a while after too many wrong passwords in a row (stored in the database, so it holds across instances). */
@Component
public class LoginAttemptListener {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptListener.class);

    private final UserRepository userRepository;
    private final int maxFailedLogins;
    private final Duration lockDuration;

    public LoginAttemptListener(UserRepository userRepository,
                                @Value("${ems.security.max-failed-logins}") int maxFailedLogins,
                                @Value("${ems.security.lock-minutes}") long lockMinutes) {
        this.userRepository = userRepository;
        this.maxFailedLogins = maxFailedLogins;
        this.lockDuration = Duration.ofMinutes(lockMinutes);
    }

    @EventListener
    public void onFailure(AuthenticationFailureBadCredentialsEvent event) {
        userRepository.findByUsername(event.getAuthentication().getName()).ifPresent(user -> {
            int failed = user.getFailedLogins() + 1;
            if (failed >= maxFailedLogins) {
                user.setLockedUntil(Instant.now().plus(lockDuration));
                failed = 0;
                log.warn("Locked account '{}' for {} minutes after {} failed logins",
                        user.getUsername(), lockDuration.toMinutes(), maxFailedLogins);
            }
            user.setFailedLogins(failed);
            userRepository.save(user);
        });
    }

    @EventListener
    public void onSuccess(AuthenticationSuccessEvent event) {
        userRepository.findByUsername(event.getAuthentication().getName())
                .filter(user -> user.getFailedLogins() > 0 || user.getLockedUntil() != null)
                .ifPresent(user -> {
                    user.setFailedLogins(0);
                    user.setLockedUntil(null);
                    userRepository.save(user);
                });
    }
}
