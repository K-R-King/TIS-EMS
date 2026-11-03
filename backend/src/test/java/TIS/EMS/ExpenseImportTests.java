package TIS.EMS;

import TIS.EMS.models.Category;
import TIS.EMS.models.Role;
import TIS.EMS.models.User;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.UserRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ExpenseImportTests {

    private static final String PASSWORD = "test-password";

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        if (users.findByUsername("i-admin").isEmpty()) {
            users.save(new User(null, "i-admin", encoder.encode(PASSWORD), Role.ADMIN));
            users.save(new User(null, "i-manager", encoder.encode(PASSWORD), Role.MANAGER));
        }
        if (categories.findAll().stream().noneMatch(c -> c.getName().equals("Hotel"))) categories.save(new Category("Hotel"));
    }

    private static MockMultipartFile workbook(Object[]... rows) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    Object v = rows[r][c];
                    if (v instanceof Number n) row.createCell(c).setCellValue(n.doubleValue());
                    else if (v != null) row.createCell(c).setCellValue(v.toString());
                }
            }
            wb.write(out);
            return new MockMultipartFile("file", "expenses.xlsx", "application/octet-stream", out.toByteArray());
        }
    }

    @Test
    void importsValidRowsAndSkipsBlankOnes() throws Exception {
        MockMultipartFile file = workbook(
                new Object[]{"Date *", "Amount *", "Category *", "Tax Applicable", "Description", "Status"},
                new Object[]{"2026-01-15", 1500, "hotel", "Yes", "Imported stay", "Approved"},
                new Object[]{},
                new Object[]{"15/02/2026", "₹2,250.75", "Hotel", "", "Imported dinner", ""});
        mvc.perform(multipart("/api/expenses/import").file(file).with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(2));
        mvc.perform(get("/api/expenses").param("q", "Imported").with(httpBasic("i-manager", PASSWORD)))
                .andExpect(jsonPath("$.items[*].amount", hasItems(1500.0, 2250.75)))
                .andExpect(jsonPath("$.items[*].status", hasItems("Approved", "Pending Review")));
    }

    @Test
    void anyBadRowRejectsTheWholeFileWithRowNumbers() throws Exception {
        long before = countAll();
        MockMultipartFile file = workbook(
                new Object[]{"Date", "Amount", "Category"},
                new Object[]{"2026-01-15", 100, "Hotel"},
                new Object[]{"not a date", -5, "Spaceship"});
        mvc.perform(multipart("/api/expenses/import").file(file).with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Nothing was imported")))
                .andExpect(jsonPath("$.details", hasItem(containsString("Row 3: Date \"not a date\""))))
                .andExpect(jsonPath("$.details", hasItem(containsString("Row 3: Category \"Spaceship\""))));
        assertEquals(before, countAll());
    }

    @Test
    void missingColumnsAndNonExcelFilesAreExplained() throws Exception {
        mvc.perform(multipart("/api/expenses/import").file(workbook(new Object[]{"Amount", "Description"}))
                        .with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value(containsString("Category, Date")));
        mvc.perform(multipart("/api/expenses/import")
                        .file(new MockMultipartFile("file", "x.csv", "text/csv", "a,b".getBytes()))
                        .with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Could not read the file"));
    }

    @Test
    void managersCannotImport() throws Exception {
        mvc.perform(multipart("/api/expenses/import").file(workbook(new Object[]{"Date"}))
                        .with(httpBasic("i-manager", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void templateIsAWorkbookThatImportsCleanly() throws Exception {
        byte[] template = mvc.perform(get("/api/expenses/import/template").with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("expense-import-template.xlsx")))
                .andReturn().getResponse().getContentAsByteArray();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(template))) {
            assertEquals("Date *", wb.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals(LocalDate.now().getYear(), wb.getSheetAt(0).getRow(1).getCell(0).getLocalDateTimeCellValue().getYear());
        }
        // The example row in the template is itself valid
        mvc.perform(multipart("/api/expenses/import")
                        .file(new MockMultipartFile("file", "template.xlsx", "application/octet-stream", template))
                        .with(httpBasic("i-admin", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1));
    }

    private long countAll() throws Exception {
        String body = mvc.perform(get("/api/expenses").with(httpBasic("i-admin", PASSWORD)))
                .andReturn().getResponse().getContentAsString();
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).get("total").asLong();
    }
}
