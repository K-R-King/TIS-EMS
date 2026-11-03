package TIS.EMS;

import TIS.EMS.models.Role;
import TIS.EMS.models.User;
import TIS.EMS.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Account changes take effect immediately, including for sessions that are already logged in. */
@SpringBootTest
@AutoConfigureMockMvc
class SessionAndAccountTests {

    private static final String PASSWORD = "test-password";

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;

    private User newUser(String role) {
        return users.save(new User("Session Test", "s-" + UUID.randomUUID().toString().substring(0, 8),
                encoder.encode(PASSWORD), role));
    }

    private User superAdmin() {
        return users.findByUsername("s-super")
                .orElseGet(() -> users.save(new User(null, "s-super", encoder.encode(PASSWORD), Role.SUPERADMIN)));
    }

    /** Logs in with a password and returns the session cookie, as the browser would get it. */
    private Cookie logIn(String username, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").with(httpBasic(username, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("SESSION");
    }

    /** Checks the session itself, using an endpoint that does not look the user up in the database. */
    private void expectLoggedIn(Cookie session, boolean loggedIn) throws Exception {
        mvc.perform(get("/api/dropdowns/statuses").cookie(session))
                .andExpect(loggedIn ? status().isOk() : status().isUnauthorized());
    }

    @Test
    void roleChangeEndsTheUsersSessions() throws Exception {
        User admin = newUser(Role.ADMIN);
        Cookie session = logIn(admin.getUsername(), PASSWORD);
        expectLoggedIn(session, true);

        mvc.perform(put("/api/users/" + admin.getId()).with(httpBasic(superAdmin().getUsername(), PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Session Test\",\"username\":\"" + admin.getUsername() + "\",\"role\":\"MANAGER\"}"))
                .andExpect(status().isOk());

        expectLoggedIn(session, false);
        mvc.perform(post("/api/auth/login").with(httpBasic(admin.getUsername(), PASSWORD)))
                .andExpect(jsonPath("$.role").value(Role.MANAGER));
    }

    @Test
    void deactivatedAccountsAreLoggedOutAndCannotLogIn() throws Exception {
        User manager = newUser(Role.MANAGER);
        Cookie session = logIn(manager.getUsername(), PASSWORD);
        String superAdmin = superAdmin().getUsername();

        mvc.perform(post("/api/users/" + manager.getId() + "/deactivate").with(httpBasic(superAdmin, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        expectLoggedIn(session, false);
        mvc.perform(post("/api/auth/login").with(httpBasic(manager.getUsername(), PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value(containsString("deactivated")));

        mvc.perform(post("/api/users/" + manager.getId() + "/activate").with(httpBasic(superAdmin, PASSWORD)))
                .andExpect(jsonPath("$.active").value(true));
        logIn(manager.getUsername(), PASSWORD);
    }

    @Test
    void youCannotDeactivateYourself() throws Exception {
        User me = superAdmin();
        mvc.perform(post("/api/users/" + me.getId() + "/deactivate").with(httpBasic(me.getUsername(), PASSWORD)))
                .andExpect(status().isConflict());
    }

    @Test
    void deletingAUserEndsTheirSessions() throws Exception {
        User manager = newUser(Role.MANAGER);
        Cookie session = logIn(manager.getUsername(), PASSWORD);
        mvc.perform(delete("/api/users/" + manager.getId()).with(httpBasic(superAdmin().getUsername(), PASSWORD)))
                .andExpect(status().isNoContent());
        expectLoggedIn(session, false);
    }

    @Test
    void changingYourPasswordLogsOutYourOtherSessionsOnly() throws Exception {
        User manager = newUser(Role.MANAGER);
        Cookie laptop = logIn(manager.getUsername(), PASSWORD);
        Cookie phone = logIn(manager.getUsername(), PASSWORD);

        mvc.perform(put("/api/auth/password").cookie(laptop).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"another-password\"}"))
                .andExpect(status().isNoContent());

        expectLoggedIn(laptop, true);
        expectLoggedIn(phone, false);
    }

    @Test
    void logoutOnlyWorksAsAPost() throws Exception {
        Cookie session = logIn(newUser(Role.MANAGER).getUsername(), PASSWORD);
        mvc.perform(get("/api/auth/logout").cookie(session));
        expectLoggedIn(session, true);
        mvc.perform(post("/api/auth/logout").cookie(session)).andExpect(status().isOk());
        expectLoggedIn(session, false);
    }
}
