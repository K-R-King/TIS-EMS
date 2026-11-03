package TIS.EMS.service;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

/**
 * Ends a user's logged-in sessions. Used when an account is deactivated, deleted, renamed, given a different role
 * or a new password, so the change applies immediately instead of when the old session expires.
 */
@Service
public class SessionRevoker {

    private final FindByIndexNameSessionRepository<? extends Session> sessions;

    public SessionRevoker(FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.sessions = sessions;
    }

    public void revokeAll(String username) {
        revokeAllExcept(username, null);
    }

    public void revokeAllExcept(String username, String keepSessionId) {
        sessions.findByPrincipalName(username).keySet().stream()
                .filter(id -> !id.equals(keepSessionId))
                .forEach(sessions::deleteById);
    }
}
