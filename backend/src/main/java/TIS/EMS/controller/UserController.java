package TIS.EMS.controller;

import TIS.EMS.dto.UserRequest;
import TIS.EMS.dto.UserResponse;
import TIS.EMS.models.Role;
import TIS.EMS.models.User;
import TIS.EMS.repository.ExpenseCommentRepository;
import TIS.EMS.repository.ExpenseHistoryRepository;
import TIS.EMS.repository.ExpenseRepository;
import TIS.EMS.repository.UserRepository;
import TIS.EMS.service.CurrentUser;
import TIS.EMS.service.SessionRevoker;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

/** User management; Super Admin only (enforced in SecurityConfig). */
@Tag(name = "Users", description = "User management (Super Admin only)")
@RestController
@RequestMapping("/api/users")
public class UserController {

    static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseCommentRepository commentRepository;
    private final ExpenseHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;
    private final SessionRevoker sessionRevoker;

    public UserController(UserRepository userRepository,
                          ExpenseRepository expenseRepository,
                          ExpenseCommentRepository commentRepository,
                          ExpenseHistoryRepository historyRepository,
                          PasswordEncoder passwordEncoder,
                          CurrentUser currentUser,
                          SessionRevoker sessionRevoker) {
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.commentRepository = commentRepository;
        this.historyRepository = historyRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUser = currentUser;
        this.sessionRevoker = sessionRevoker;
    }

    @GetMapping
    public List<UserResponse> list() {
        return userRepository.findAll(Sort.by("username")).stream().map(UserResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@RequestBody UserRequest request) {
        String username = requireUsername(request.username());
        if (userRepository.existsByUsernameIgnoreCase(username)) throw conflict("Username already exists");
        String password = requirePassword(request.password());

        User user = new User(trimToNull(request.name()), username, passwordEncoder.encode(password), requireRole(request.role()));
        return UserResponse.from(userRepository.save(user));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @RequestBody UserRequest request, Principal principal) {
        User user = find(id);
        String username = requireUsername(request.username());
        if (userRepository.existsByUsernameIgnoreCaseAndIdNot(username, id)) throw conflict("Username already exists");
        String role = requireRole(request.role());

        if (Role.SUPERADMIN.equals(user.getRole()) && !Role.SUPERADMIN.equals(role)) {
            if (user.getId().equals(currentUser.get(principal).getId())) {
                throw conflict("You cannot remove your own Super Admin role");
            }
            requireAnotherActiveSuperAdmin(user);
        }

        String oldUsername = user.getUsername();
        boolean newPassword = request.password() != null && !request.password().isEmpty();
        boolean accessChanged = newPassword || !role.equals(user.getRole()) || !username.equals(oldUsername);

        user.setName(trimToNull(request.name()));
        user.setUsername(username);
        user.setRole(role);
        if (newPassword) {
            user.setPassword(passwordEncoder.encode(requirePassword(request.password())));
            unlock(user); // a password reset also clears a lockout
        }
        UserResponse saved = UserResponse.from(userRepository.save(user));
        // Existing sessions still carry the old role; make the person log in again
        if (accessChanged && !user.getId().equals(currentUser.get(principal).getId())) {
            sessionRevoker.revokeAll(oldUsername);
        }
        return saved;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Principal principal) {
        User user = find(id);
        if (user.getId().equals(currentUser.get(principal).getId())) throw conflict("You cannot delete your own account");
        if (Role.SUPERADMIN.equals(user.getRole())) requireAnotherActiveSuperAdmin(user);
        if (expenseRepository.existsByEnteredById(id) || commentRepository.existsByAuthorId(id)
                || historyRepository.existsByUserId(id)) {
            throw conflict("This user appears on expenses, comments or their history, so the account is kept for the "
                    + "audit trail. Deactivate it instead to remove access.");
        }
        userRepository.delete(user);
        sessionRevoker.revokeAll(user.getUsername());
    }

    /** Removes access while keeping the account (and its name on past records). */
    @PostMapping("/{id}/deactivate")
    public UserResponse deactivate(@PathVariable Long id, Principal principal) {
        User user = find(id);
        if (user.getId().equals(currentUser.get(principal).getId())) throw conflict("You cannot deactivate your own account");
        if (Role.SUPERADMIN.equals(user.getRole())) requireAnotherActiveSuperAdmin(user);
        user.setActive(false);
        UserResponse saved = UserResponse.from(userRepository.save(user));
        sessionRevoker.revokeAll(user.getUsername());
        return saved;
    }

    @PostMapping("/{id}/activate")
    public UserResponse activate(@PathVariable Long id) {
        User user = find(id);
        user.setActive(true);
        unlock(user);
        return UserResponse.from(userRepository.save(user));
    }

    /** Clears a lockout caused by too many failed logins. */
    @PostMapping("/{id}/unlock")
    public UserResponse unlock(@PathVariable Long id) {
        User user = find(id);
        unlock(user);
        return UserResponse.from(userRepository.save(user));
    }

    /** Keeps at least one Super Admin who can still log in. */
    private void requireAnotherActiveSuperAdmin(User user) {
        long active = userRepository.countByRoleAndActiveTrue(Role.SUPERADMIN);
        if (active - (user.isActive() ? 1 : 0) < 1) throw conflict("There must be at least one active Super Admin");
    }

    private static void unlock(User user) {
        user.setFailedLogins(0);
        user.setLockedUntil(null);
    }

    private User find(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private static String requireUsername(String username) {
        String u = username == null ? "" : username.trim();
        if (!u.matches("[A-Za-z0-9._-]{3,50}")) {
            throw badRequest("Username must be 3-50 characters: letters, numbers, dot, dash or underscore");
        }
        return u;
    }

    private static String requirePassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw badRequest("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        return password;
    }

    private static String requireRole(String role) {
        if (role == null || !Role.ALL.contains(role)) throw badRequest("Role must be one of " + Role.ALL);
        return role;
    }

    private static String trimToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
