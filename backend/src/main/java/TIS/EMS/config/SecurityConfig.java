package TIS.EMS.config;

import TIS.EMS.models.Role;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

/**
 * Basic authentication (username/password) as the requirements specify. A successful
 * login is kept in a server-side session, so the browser only sends the password once.
 */
@Configuration
public class SecurityConfig {

    private static final String[] ADMINS = {Role.SUPERADMIN, Role.ADMIN};

    private final CustomAuthenticationEntryPoint authenticationEntryPoint;

    public SecurityConfig(CustomAuthenticationEntryPoint authenticationEntryPoint) {
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // The session cookie is SameSite=Lax and CORS only admits the frontend origin,
                // so cross-site form posts cannot ride on a logged-in session.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error", "/api/auth/logout").permitAll()
                        // Kubernetes liveness/readiness probes
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/api/users/**", "/api/settings/**").hasRole(Role.SUPERADMIN)
                        // Managers may comment on expenses but not change them
                        .requestMatchers(HttpMethod.POST, "/api/expenses/*/comments").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/expenses/**").hasAnyRole(ADMINS)
                        .requestMatchers(HttpMethod.PUT, "/api/expenses/**").hasAnyRole(ADMINS)
                        .requestMatchers(HttpMethod.DELETE, "/api/expenses/**").hasAnyRole(ADMINS)
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll()
                )
                .httpBasic(basic -> basic
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .securityContextRepository(new HttpSessionSecurityContextRepository()))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
