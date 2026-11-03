package TIS.EMS.controller;

import TIS.EMS.dto.UserResponse;
import TIS.EMS.service.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CurrentUser currentUser;

    public AuthController(CurrentUser currentUser) {
        this.currentUser = currentUser;
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
}
