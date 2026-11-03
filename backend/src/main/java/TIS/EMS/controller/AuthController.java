package TIS.EMS.controller;

import TIS.EMS.dto.PasswordChangeRequest;
import TIS.EMS.dto.UserResponse;
import TIS.EMS.models.User;
import TIS.EMS.repository.UserRepository;
import TIS.EMS.service.CurrentUser;
import TIS.EMS.service.SessionRevoker;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@Tag(name = "Authentication", description = "Log in (HTTP Basic), current user, log out, change password")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionRevoker sessionRevoker;

    public AuthController(CurrentUser currentUser, UserRepository userRepository, PasswordEncoder passwordEncoder,
                          SessionRevoker sessionRevoker) {
        this.currentUser = currentUser;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessionRevoker = sessionRevoker;
    }

    /**
     * Called with an Authorization: Basic header. Spring Security checks the password and
     * stores the login in the session; this returns who logged in so the UI can route by role.
     * (POST /api/auth/logout is handled by Spring Security.)
     */
    @PostMapping("/login")
    public UserResponse login(Principal principal, HttpServletRequest request) {
        request.changeSessionId(); // guard against session fixation
        return UserResponse.from(currentUser.get(principal));
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return UserResponse.from(currentUser.get(principal));
    }

    /** Lets any logged-in user change their own password. */
    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestBody PasswordChangeRequest request, Principal principal, HttpServletRequest http) {
        User user = currentUser.get(principal);
        if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        String next = request.newPassword();
        if (next == null || next.length() < UserController.MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "New password must be at least " + UserController.MIN_PASSWORD_LENGTH + " characters");
        }
        if (next.equals(request.currentPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from the current one");
        }
        user.setPassword(passwordEncoder.encode(next));
        userRepository.save(user);
        // Log out everywhere else (e.g. a forgotten browser elsewhere); this session stays logged in
        var session = http.getSession(false);
        sessionRevoker.revokeAllExcept(user.getUsername(), session == null ? null : session.getId());
    }
}
