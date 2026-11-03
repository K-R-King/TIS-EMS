package TIS.EMS.service;

import TIS.EMS.models.*;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.LookupRepository;
import TIS.EMS.repository.PaymentModeRepository;
import TIS.EMS.repository.ReimbursementTypeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Imports expenses from an Excel sheet (e.g. the spreadsheet the company used before this app).
 * The whole file is checked first; if any row has a problem nothing is saved.
 */
@Service
public class ExpenseImportService {

    public static final int MAX_ROWS = 2000;
    private static final int MAX_REPORTED_PROBLEMS = 50;

    static final String DATE = "Date", AMOUNT = "Amount", CATEGORY = "Category", PAYMENT_MODE = "Payment Mode",
            REIMBURSEMENT_TYPE = "Reimbursement Type", TAX = "Tax Applicable", DESCRIPTION = "Description", STATUS = "Status";
    private static final List<String> COLUMNS =
            List.of(DATE, AMOUNT, CATEGORY, PAYMENT_MODE, REIMBURSEMENT_TYPE, TAX, DESCRIPTION, STATUS);
    private static final Set<String> REQUIRED = Set.of(DATE, AMOUNT, CATEGORY);

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("d-M-uuuu"),
            DateTimeFormatter.ofPattern("d.M.uuuu"),
            DateTimeFormatter.ofPattern("d MMM uuuu", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("d-MMM-uuuu", Locale.ENGLISH));

    private final ExpenseService expenseService;
    private final CategoryRepository categoryRepository;
    private final PaymentModeRepository paymentModeRepository;
    private final ReimbursementTypeRepository reimbursementTypeRepository;

    public ExpenseImportService(ExpenseService expenseService,
                                CategoryRepository categoryRepository,
                                PaymentModeRepository paymentModeRepository,
                                ReimbursementTypeRepository reimbursementTypeRepository) {
        this.expenseService = expenseService;
        this.categoryRepository = categoryRepository;
        this.paymentModeRepository = paymentModeRepository;
        this.reimbursementTypeRepository = reimbursementTypeRepository;
    }

    /**
     * Returns how many expenses were imported. Rows matching an existing expense (or an earlier row) on date, amount
     * and category are reported as possible duplicates unless allowDuplicates is set.
     */
    @Transactional
    public int importFile(MultipartFile file, User user, boolean allowDuplicates) {
        Map<String, Long> categories = ids(categoryRepository);
        Map<String, Long> paymentModes = ids(paymentModeRepository);
        Map<String, Long> reimbursementTypes = ids(reimbursementTypeRepository);
        Map<String, String> statuses = new HashMap<>();
        ExpenseStatus.ALL.forEach(s -> statuses.put(s.toLowerCase(), s));

        List<ExpenseService.Input> inputs = new ArrayList<>();
        List<String> problems = new ArrayList<>();
        List<String> duplicates = new ArrayList<>();
        Map<String, Integer> rowsByKey = new HashMap<>(); // date|amount|category -> first row number in the file

        try (InputStream in = file.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter(Locale.ENGLISH);
            // Formula cells (e.g. =B2*1.18) are read as the result Excel calculated and saved, not the formula text
            formatter.setUseCachedValuesForFormulaCells(true);
            Map<String, Integer> columns = headerColumns(sheet.getRow(sheet.getFirstRowNum()), formatter);

            List<String> missing = REQUIRED.stream().filter(c -> !columns.containsKey(c)).sorted().toList();
            if (!missing.isEmpty()) {
                throw new ImportFailedException("The first row must contain the column headings from the template",
                        List.of("Missing column(s): " + String.join(", ", missing)));
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isBlank(row, columns, formatter)) continue;
                if (inputs.size() + problems.size() >= MAX_ROWS) {
                    throw new ImportFailedException("Too many rows",
                            List.of("A file can contain at most " + MAX_ROWS + " expenses. Split it into smaller files."));
                }
                int rowNumber = r + 1; // as shown in Excel
                List<String> rowProblems = new ArrayList<>();

                LocalDate date = parseDate(cell(row, columns, DATE), formatter, rowProblems);
                BigDecimal amount = parseAmount(cell(row, columns, AMOUNT), formatter, rowProblems);
                Long categoryId = lookup(text(row, columns, CATEGORY, formatter), categories, "Category", rowProblems);
                Long paymentModeId = lookup(text(row, columns, PAYMENT_MODE, formatter), paymentModes, "Payment mode", rowProblems);
                Long reimbursementTypeId = lookup(text(row, columns, REIMBURSEMENT_TYPE, formatter), reimbursementTypes,
                        "Reimbursement type", rowProblems);
                boolean tax = parseYesNo(text(row, columns, TAX, formatter), rowProblems);
                String statusText = text(row, columns, STATUS, formatter);
                String status = statusText.isEmpty() ? ExpenseStatus.PENDING_REVIEW : statuses.get(statusText.toLowerCase());
                if (status == null) rowProblems.add("Status \"" + statusText + "\" is not one of " + ExpenseStatus.ALL);

                if (rowProblems.isEmpty()) {
                    ExpenseService.Input input = new ExpenseService.Input(date, amount, categoryId, paymentModeId,
                            reimbursementTypeId, tax, text(row, columns, DESCRIPTION, formatter), status);
                    rowProblems.addAll(expenseService.problems(input));
                    if (rowProblems.isEmpty()) {
                        inputs.add(input);
                        String key = date + "|" + amount.stripTrailingZeros().toPlainString() + "|" + categoryId;
                        Integer earlierRow = rowsByKey.putIfAbsent(key, rowNumber);
                        if (earlierRow != null) {
                            duplicates.add("Row " + rowNumber + ": Same date, amount and category as row " + earlierRow);
                        } else {
                            expenseService.possibleDuplicates(date, amount, categoryId, null).stream().findFirst()
                                    .ifPresent(existing -> duplicates.add("Row " + rowNumber
                                            + ": Same date, amount and category as existing expense #" + existing.getId()));
                        }
                    }
                }
                rowProblems.forEach(p -> problems.add("Row " + rowNumber + ": " + p));
            }
        } catch (IOException | org.apache.poi.EmptyFileException | org.apache.poi.UnsupportedFileFormatException e) {
            throw new ImportFailedException("Could not read the file",
                    List.of("Upload an Excel workbook (.xlsx or .xls). Download the template to see the expected layout."));
        }

        if (!problems.isEmpty()) {
            throw new ImportFailedException(problems.size() + " problem(s) found. Nothing was imported.",
                    problems.size() > MAX_REPORTED_PROBLEMS
                            ? append(problems.subList(0, MAX_REPORTED_PROBLEMS), "…and " + (problems.size() - MAX_REPORTED_PROBLEMS) + " more")
                            : problems);
        }
        if (!duplicates.isEmpty() && !allowDuplicates) {
            throw new ImportFailedException(duplicates.size() + " row(s) look like duplicates. Nothing was imported.",
                    duplicates.size() > MAX_REPORTED_PROBLEMS
                            ? append(duplicates.subList(0, MAX_REPORTED_PROBLEMS), "…and " + (duplicates.size() - MAX_REPORTED_PROBLEMS) + " more")
                            : duplicates,
                    true);
        }
        if (inputs.isEmpty()) {
            throw new ImportFailedException("The file has no expenses", List.of("Add one expense per row below the headings."));
        }

        inputs.forEach(input -> expenseService.create(input, user, null, ExpenseHistory.IMPORTED));
        return inputs.size();
    }

    /** An .xlsx template with the expected columns, an example row and dropdowns for the list columns. */
    public byte[] template() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Expenses");
            Sheet lists = wb.createSheet("Valid values");

            Font bold = wb.createFont();
            bold.setBold(true);
            CellStyle header = wb.createCellStyle();
            header.setFont(bold);
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("yyyy-mm-dd"));

            Row head = sheet.createRow(0);
            for (int i = 0; i < COLUMNS.size(); i++) {
                Cell c = head.createCell(i);
                c.setCellValue(COLUMNS.get(i) + (REQUIRED.contains(COLUMNS.get(i)) ? " *" : ""));
                c.setCellStyle(header);
                sheet.setColumnWidth(i, (i == 6 ? 40 : 20) * 256);
            }
            sheet.createFreezePane(0, 1);

            List<List<String>> valid = List.of(
                    names(categoryRepository), names(paymentModeRepository), names(reimbursementTypeRepository),
                    ExpenseStatus.ALL, List.of("Yes", "No"));
            List<String> listHeadings = List.of(CATEGORY, PAYMENT_MODE, REIMBURSEMENT_TYPE, STATUS, TAX);
            int longest = valid.stream().mapToInt(List::size).max().orElse(0);
            for (int r = 0; r <= longest; r++) lists.createRow(r);
            for (int c = 0; c < valid.size(); c++) {
                Cell h = lists.getRow(0).createCell(c);
                h.setCellValue(listHeadings.get(c));
                h.setCellStyle(header);
                lists.setColumnWidth(c, 26 * 256);
                for (int r = 0; r < valid.get(c).size(); r++) lists.getRow(r + 1).createCell(c).setCellValue(valid.get(c).get(r));
            }

            Row example = sheet.createRow(1);
            Cell date = example.createCell(0);
            date.setCellValue(expenseService.today());
            date.setCellStyle(dateStyle);
            example.createCell(1).setCellValue(1250.50);
            example.createCell(2).setCellValue(first(valid.get(0)));
            example.createCell(3).setCellValue(first(valid.get(1)));
            example.createCell(4).setCellValue(first(valid.get(2)));
            example.createCell(5).setCellValue("Yes");
            example.createCell(6).setCellValue("Example row - replace or delete");
            example.createCell(7).setCellValue(ExpenseStatus.PENDING_REVIEW);

            // Dropdowns for the list columns, fed from the "Valid values" sheet
            int[] targetColumns = {2, 3, 4, 7, 5};
            DataValidationHelper helper = sheet.getDataValidationHelper();
            for (int c = 0; c < valid.size(); c++) {
                if (valid.get(c).isEmpty()) continue;
                String col = String.valueOf((char) ('A' + c));
                DataValidationConstraint constraint = helper.createFormulaListConstraint(
                        "'Valid values'!$" + col + "$2:$" + col + "$" + (valid.get(c).size() + 1));
                DataValidation validation = helper.createValidation(constraint,
                        new CellRangeAddressList(1, MAX_ROWS, targetColumns[c], targetColumns[c]));
                validation.setShowErrorBox(true);
                sheet.addValidationData(validation);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the import template", e);
        }
    }

    private static Map<String, Integer> headerColumns(Row header, DataFormatter formatter) {
        Map<String, Integer> columns = new HashMap<>();
        if (header == null) return columns;
        for (Cell cell : header) {
            String name = formatter.formatCellValue(cell).replace("*", "").trim();
            COLUMNS.stream().filter(c -> c.equalsIgnoreCase(name)).findFirst()
                    .ifPresent(c -> columns.putIfAbsent(c, cell.getColumnIndex()));
        }
        return columns;
    }

    private static Cell cell(Row row, Map<String, Integer> columns, String column) {
        Integer index = columns.get(column);
        return index == null ? null : row.getCell(index);
    }

    private static String text(Row row, Map<String, Integer> columns, String column, DataFormatter formatter) {
        Cell c = cell(row, columns, column);
        return c == null ? "" : formatter.formatCellValue(c).trim();
    }

    private static boolean isBlank(Row row, Map<String, Integer> columns, DataFormatter formatter) {
        return columns.keySet().stream().allMatch(c -> text(row, columns, c, formatter).isEmpty());
    }

    /** The cell's type, or for a formula the type of its calculated result. */
    private static CellType valueType(Cell cell) {
        return cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
    }

    private static LocalDate parseDate(Cell cell, DataFormatter formatter, List<String> problems) {
        if (cell == null || valueType(cell) == CellType.BLANK) return null; // reported as "Date is required"
        if (valueType(cell) == CellType.NUMERIC) {
            return DateUtil.getLocalDateTime(cell.getNumericCellValue()).toLocalDate();
        }
        String value = formatter.formatCellValue(cell).trim();
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // try the next format
            }
        }
        problems.add("Date \"" + value + "\" is not a date (use YYYY-MM-DD or DD/MM/YYYY)");
        return null;
    }

    private static BigDecimal parseAmount(Cell cell, DataFormatter formatter, List<String> problems) {
        if (cell == null || valueType(cell) == CellType.BLANK) return null;
        // Numbers (typed or calculated, e.g. =B2*1.18) are rounded to paise, as Excel shows them in a currency format
        if (valueType(cell) == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(2, RoundingMode.HALF_UP);
        }
        String value = formatter.formatCellValue(cell).replaceAll("[₹,\\s]|(?i)rs\\.?|inr", "");
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            problems.add("Amount \"" + formatter.formatCellValue(cell) + "\" is not a number");
            return null;
        }
    }

    private static Long lookup(String name, Map<String, Long> ids, String label, List<String> problems) {
        if (name.isEmpty()) return null;
        Long id = ids.get(name.toLowerCase());
        if (id == null) problems.add(label + " \"" + name + "\" does not exist (see Settings)");
        return id;
    }

    private static boolean parseYesNo(String value, List<String> problems) {
        switch (value.toLowerCase()) {
            case "", "no", "n", "false", "0" -> { return false; }
            case "yes", "y", "true", "1" -> { return true; }
            default -> {
                problems.add("Tax Applicable \"" + value + "\" should be Yes or No");
                return false;
            }
        }
    }

    private static <T extends LookupItem> Map<String, Long> ids(LookupRepository<T> repo) {
        Map<String, Long> ids = new HashMap<>();
        repo.findAll().forEach(item -> ids.put(item.getName().toLowerCase(), item.getId()));
        return ids;
    }

    private static <T extends LookupItem> List<String> names(LookupRepository<T> repo) {
        return repo.findAllSorted().stream().map(LookupItem::getName).toList();
    }

    private static String first(List<String> values) {
        return values.isEmpty() ? "" : values.get(0);
    }

    private static List<String> append(List<String> list, String extra) {
        List<String> copy = new ArrayList<>(list);
        copy.add(extra);
        return copy;
    }
}
