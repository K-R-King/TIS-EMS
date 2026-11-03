package TIS.EMS;

import TIS.EMS.models.Category;
import TIS.EMS.models.Role;
import TIS.EMS.models.User;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityTests {

    private static final String PASSWORD = "test-password";

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;

    private Long categoryId;

    @BeforeEach
    void setUp() {
        ensureUser("t-super", Role.SUPERADMIN);
        ensureUser("t-admin", Role.ADMIN);
        ensureUser("t-manager", Role.MANAGER);
        categoryId = categories.findAll().stream().findFirst()
                .orElseGet(() -> categories.save(new Category("Travel"))).getId();
    }

    private void ensureUser(String username, String role) {
        if (users.findByUsername(username).isEmpty()) {
            users.save(new User(null, username, encoder.encode(PASSWORD), role));
        }
    }

    private static RequestPostProcessor as(String username) {
        return httpBasic(username, PASSWORD);
    }

    private MockMultipartHttpServletRequestBuilder expenseForm(MockMultipartHttpServletRequestBuilder b) {
        return expenseForm(b, "125.50", LocalDate.now());
    }

    private MockMultipartHttpServletRequestBuilder expenseForm(MockMultipartHttpServletRequestBuilder b,
                                                               String amount, LocalDate date) {
        b.param("date", date.toString())
                .param("amount", amount)
                .param("categoryId", categoryId.toString())
                .param("taxApplicable", "true")
                .param("description", "Client lunch");
        return b;
    }

    private long createExpenseAsAdmin() throws Exception {
        String body = mvc.perform(expenseForm(multipart("/api/expenses")).with(as("t-admin")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/expenses")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dropdowns/categories")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register")).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").with(httpBasic("t-admin", "nope")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginReturnsRole() throws Exception {
        mvc.perform(post("/api/auth/login").with(as("t-manager")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("t-manager"))
                .andExpect(jsonPath("$.role").value(Role.MANAGER))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void adminCreatesExpenseAndEnteredByIsTheLoggedInUser() throws Exception {
        long id = createExpenseAsAdmin();
        mvc.perform(get("/api/expenses/" + id).with(as("t-manager")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(125.50))
                .andExpect(jsonPath("$.enteredBy.username").value("t-admin"))
                .andExpect(jsonPath("$.enteredBy.role").doesNotExist())
                .andExpect(jsonPath("$.enteredBy.locked").doesNotExist())
                .andExpect(jsonPath("$.status").value("Pending Review"));
    }

    @Test
    void managerCanViewAndCommentButNotChangeExpenses() throws Exception {
        long id = createExpenseAsAdmin();

        mvc.perform(expenseForm(multipart("/api/expenses")).with(as("t-manager")))
                .andExpect(status().isForbidden());
        mvc.perform(expenseForm(multipart(HttpMethod.PUT, "/api/expenses/" + id)).with(as("t-manager")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/expenses/" + id).with(as("t-manager")))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/expenses/" + id + "/comments").with(as("t-manager"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Looks fine\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author.username").value("t-manager"));
        mvc.perform(get("/api/expenses/" + id + "/comments").with(as("t-admin")))
                .andExpect(jsonPath("$[*].text", hasItem("Looks fine")));
    }

    @Test
    void adminCanUpdateAndDeleteExpense() throws Exception {
        long id = createExpenseAsAdmin();
        mvc.perform(expenseForm(multipart(HttpMethod.PUT, "/api/expenses/" + id), "99", LocalDate.now())
                        .param("status", "Approved").with(as("t-admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(99))
                .andExpect(jsonPath("$.status").value("Approved"));
        mvc.perform(delete("/api/expenses/" + id).with(as("t-admin"))).andExpect(status().isNoContent());
        mvc.perform(get("/api/expenses/" + id).with(as("t-admin"))).andExpect(status().isNotFound());
    }

    @Test
    void invalidExpensesAreRejectedWithAMessage() throws Exception {
        mvc.perform(expenseForm(multipart("/api/expenses"), "-5", LocalDate.now()).with(as("t-admin")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("greater than zero")));
        mvc.perform(expenseForm(multipart("/api/expenses"), "10", LocalDate.now().plusDays(3)).with(as("t-admin")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void attachmentsMustBeRealPdfOrImageFiles() throws Exception {
        MockMultipartFile fake = new MockMultipartFile("attachment", "receipt.pdf", "application/pdf", "<script>".getBytes());
        mvc.perform(expenseForm(multipart("/api/expenses")).file(fake).with(as("t-admin")))
                .andExpect(status().isBadRequest());

        MockMultipartFile pdf = new MockMultipartFile("attachment", "receipt.pdf", "application/pdf", "%PDF-1.4 test".getBytes());
        String body = mvc.perform(expenseForm(multipart("/api/expenses")).file(pdf).with(as("t-admin")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(body);
        mvc.perform(get("/api/expenses/" + created.get("id").asLong() + "/attachment").with(as("t-manager")))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void filtersNarrowTheList() throws Exception {
        createExpenseAsAdmin();
        mvc.perform(get("/api/expenses").param("status", "Rejected").param("q", "no-such-text").with(as("t-admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.totalAmount").value(0));
        mvc.perform(get("/api/expenses").param("categoryId", categoryId.toString()).param("q", "client").with(as("t-admin")))
                .andExpect(jsonPath("$.items", not(empty())))
                .andExpect(jsonPath("$.totalAmount").value(greaterThan(0.0)));
    }

    @Test
    void onlySuperAdminManagesUsersAndSettings() throws Exception {
        mvc.perform(get("/api/users").with(as("t-admin"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/settings/categories").with(as("t-admin"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Fuel\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/users").with(as("t-super")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username", hasItem("t-manager")))
                .andExpect(jsonPath("$[0].password").doesNotExist());
        mvc.perform(post("/api/users").with(as("t-super")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Person\",\"username\":\"t-new\",\"password\":\"long-enough-pw\",\"role\":\"MANAGER\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/login").with(httpBasic("t-new", "long-enough-pw"))).andExpect(status().isOk());
    }

    @Test
    void listIsPaged() throws Exception {
        createExpenseAsAdmin();
        createExpenseAsAdmin();
        String body = mvc.perform(get("/api/expenses").param("size", "1").with(as("t-admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.size").value(1))
                .andReturn().getResponse().getContentAsString();
        long total = json.readTree(body).get("total").asLong();
        org.junit.jupiter.api.Assertions.assertTrue(total >= 2);
        mvc.perform(get("/api/expenses").param("size", "1").param("page", "1").with(as("t-admin")))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    void changesAreRecordedInTheHistory() throws Exception {
        long id = createExpenseAsAdmin();
        mvc.perform(expenseForm(multipart(HttpMethod.PUT, "/api/expenses/" + id), "300", LocalDate.now())
                        .param("status", "Approved").with(as("t-super")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/expenses/" + id + "/history").with(as("t-manager")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].action").value("UPDATED"))
                .andExpect(jsonPath("$[0].user.username").value("t-super"))
                .andExpect(jsonPath("$[0].details").value(containsString("Amount: 125.50 → 300.00")))
                .andExpect(jsonPath("$[0].details").value(containsString("Status: Pending Review → Approved")))
                .andExpect(jsonPath("$[1].action").value("CREATED"));
    }

    @Test
    void repeatedWrongPasswordsLockTheAccountUntilUnlocked() throws Exception {
        users.save(new User(null, "t-lock", encoder.encode(PASSWORD), Role.MANAGER));
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").with(httpBasic("t-lock", "wrong"))).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(as("t-lock")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value(containsString("locked")));

        Long id = users.findByUsername("t-lock").orElseThrow().getId();
        mvc.perform(get("/api/users").with(as("t-super")))
                .andExpect(jsonPath("$[?(@.username == 't-lock')].locked").value(hasItem(true)));
        mvc.perform(post("/api/users/" + id + "/unlock").with(as("t-super"))).andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").with(as("t-lock"))).andExpect(status().isOk());
        users.deleteById(id);
    }

    @Test
    void usersCanChangeTheirOwnPassword() throws Exception {
        users.save(new User(null, "t-pw", encoder.encode(PASSWORD), Role.MANAGER));
        mvc.perform(put("/api/auth/password").with(as("t-pw")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"nope\",\"newPassword\":\"brand-new-pass\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/auth/password").with(as("t-pw")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"brand-new-pass\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").with(httpBasic("t-pw", "brand-new-pass"))).andExpect(status().isOk());
        users.findByUsername("t-pw").ifPresent(users::delete);
    }

    @Test
    void possibleDuplicatesAreFoundIgnoringTheExpenseBeingEdited() throws Exception {
        long id = createExpenseAsAdmin(); // today, 125.50, categoryId
        String today = LocalDate.now().toString();
        mvc.perform(get("/api/expenses/duplicates").with(as("t-admin"))
                        .param("date", today).param("amount", "125.5").param("categoryId", categoryId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) id)));
        mvc.perform(get("/api/expenses/duplicates").with(as("t-admin"))
                        .param("date", today).param("amount", "125.5").param("categoryId", categoryId.toString())
                        .param("excludeId", String.valueOf(id)))
                .andExpect(jsonPath("$[*].id", not(hasItem((int) id))));
        mvc.perform(get("/api/expenses/duplicates").with(as("t-admin"))
                        .param("date", today).param("amount", "125.51").param("categoryId", categoryId.toString()))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void apiDocumentationIsAvailable() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("TIS Expense Management API"))
                .andExpect(jsonPath("$.paths['/api/expenses']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.basic.scheme").value("basic"));
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }

    @Test
    void healthProbesArePublic() throws Exception {
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/env")).andExpect(status().is4xxClientError());
    }

    @Test
    void statsIncludeTheLastSixMonths() throws Exception {
        createExpenseAsAdmin();
        mvc.perform(get("/api/expenses/stats").with(as("t-manager")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.byMonth", hasSize(6)))
                .andExpect(jsonPath("$.byMonth[5].name").value(java.time.YearMonth.now().toString()))
                .andExpect(jsonPath("$.byMonth[5].count").value(greaterThan(0)));
    }

    @Test
    void categoryInUseCannotBeDeleted() throws Exception {
        createExpenseAsAdmin();
        mvc.perform(delete("/api/settings/categories/" + categoryId).with(as("t-super")))
                .andExpect(status().isConflict());
    }

    @Test
    void superAdminCannotDeleteThemselves() throws Exception {
        Long selfId = users.findByUsername("t-super").orElseThrow().getId();
        mvc.perform(delete("/api/users/" + selfId).with(as("t-super"))).andExpect(status().isConflict());
    }
}
