package TIS.EMS.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        // Send 401 WITHOUT the WWW-Authenticate header (which causes the browser popup)
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        String message;
        if (authException instanceof LockedException) {
            message = "This account is locked after too many failed logins. Try again later or ask a Super Admin to unlock it.";
        } else if (authException instanceof DisabledException) {
            message = "This account has been deactivated. Ask a Super Admin if you need access.";
        } else {
            message = "Invalid username or password";
        }
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
