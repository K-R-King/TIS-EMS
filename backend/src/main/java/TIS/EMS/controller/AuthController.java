package TIS.EMS.controller;

import TIS.EMS.dto.PasswordChangeRequest;
import TIS.EMS.dto.UserResponse;
import TIS.EMS.models.User;
import TIS.EMS.repository.UserRepository;
import TIS.EMS.service.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(CurrentUser currentUser, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.currentUser = currentUser;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
    public void changePassword(@RequestBody PasswordChangeRequest request, Principal principal) {
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
    }
}
