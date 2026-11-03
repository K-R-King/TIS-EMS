package TIS.EMS;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Runs the real Flyway migrations on MySQL 8 and checks Hibernate accepts the resulting schema
 * (ddl-auto=validate). Needs Docker; skipped when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.session.jdbc.initialize-schema=never",
        "ems.initial-admin-password=migration-test-pw"
})
@AutoConfigureMockMvc
class MigrationTests {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

    @Autowired MockMvc mvc;

    @Test
    void migratedSchemaWorksEndToEnd() throws Exception {
        // The first super admin is created on startup; log in, use a session, add an expense with a receipt
        // Sessions live in MySQL (Spring Session JDBC) and are identified by the SESSION cookie
        Cookie session = mvc.perform(post("/api/auth/login").with(httpBasic("superadmin", "migration-test-pw")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("SESSION");

        String categories = mvc.perform(get("/api/dropdowns/categories").cookie(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long categoryId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(categories).get(0).get("id").asLong();

        mvc.perform(multipart("/api/expenses")
                        .file(new MockMultipartFile("attachment", "r.pdf", "application/pdf", "%PDF-1.4".getBytes()))
                        .param("date", LocalDate.now().minusDays(1).toString())
                        .param("amount", "10.00")
                        .param("categoryId", String.valueOf(categoryId))
                        .cookie(session))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/auth/logout").cookie(session)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").cookie(session)).andExpect(status().isUnauthorized());
    }
}
