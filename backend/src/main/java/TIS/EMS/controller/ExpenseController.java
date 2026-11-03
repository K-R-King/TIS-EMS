package TIS.EMS.controller;

import TIS.EMS.dto.*;
import TIS.EMS.models.*;
import TIS.EMS.repository.*;
import TIS.EMS.service.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ExpenseRepository expenseRepository;
    private final ExpenseCommentRepository commentRepository;
    private final ExpenseHistoryRepository historyRepository;
    private final ExpenseService expenseService;
    private final ExpenseImportService importService;
    private final AttachmentService attachmentService;
    private final CurrentUser currentUser;

    public ExpenseController(ExpenseRepository expenseRepository,
                             ExpenseCommentRepository commentRepository,
                             ExpenseHistoryRepository historyRepository,
                             ExpenseService expenseService,
                             ExpenseImportService importService,
                             AttachmentService attachmentService,
                             CurrentUser currentUser) {
        this.expenseRepository = expenseRepository;
        this.commentRepository = commentRepository;
        this.historyRepository = historyRepository;
        this.expenseService = expenseService;
        this.importService = importService;
        this.attachmentService = attachmentService;
        this.currentUser = currentUser;
    }

    /** Expense list with the filters from the requirements, plus free-text search, newest first. */
    @GetMapping
    public ExpensePage list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long paymentModeId,
            @RequestParam(required = false) Long reimbursementTypeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        int pageSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        int pageNumber = Math.max(page, 0);
        ExpenseFilter filter = new ExpenseFilter(from, to, categoryId, paymentModeId, reimbursementTypeId, status, q);
        Page<Expense> result = expenseRepository.findAll(filter.toSpecification(),
                PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"))));
        return new ExpensePage(result.map(ExpenseResponse::from).getContent(), result.getTotalElements(),
                expenseService.sum(filter), pageNumber, pageSize);
    }

    @GetMapping("/stats")
    public ExpenseStats stats() {
        List<Expense> all = expenseRepository.findAll();
        YearMonth thisMonth = YearMonth.from(expenseService.today());

        return new ExpenseStats(
                all.size(),
                sum(all),
                sum(all.stream().filter(e -> YearMonth.from(e.getDate()).equals(thisMonth)).toList()),
                all.stream().filter(e -> ExpenseStatus.PENDING_REVIEW.equals(e.getStatus())).count(),
                group(all, e -> e.getCategory().getName()),
                group(all, Expense::getStatus),
                lastMonths(all, thisMonth, 6),
                expenseRepository.findTop5ByOrderByDateDescIdDesc().stream().map(ExpenseResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ExpenseResponse get(@PathVariable Long id) {
        return ExpenseResponse.from(find(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@ModelAttribute ExpenseRequest request, Principal principal) {
        Expense expense = expenseService.create(toInput(request), currentUser.get(principal),
                request.getAttachment(), ExpenseHistory.CREATED);
        return ExpenseResponse.from(expense);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExpenseResponse update(@PathVariable Long id, @ModelAttribute ExpenseRequest request, Principal principal) {
        Expense expense = expenseService.update(find(id), toInput(request), request.getAttachment(),
                request.isRemoveAttachment(), currentUser.get(principal));
        return ExpenseResponse.from(expense);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Principal principal) {
        expenseService.delete(find(id), currentUser.get(principal));
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<byte[]> attachment(@PathVariable Long id) {
        Expense expense = find(id);
        byte[] data = attachmentService.load(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This expense has no attachment"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(expense.getAttachmentContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(expense.getAttachmentName(), StandardCharsets.UTF_8).build().toString())
                .body(data);
    }

    @GetMapping("/{id}/comments")
    public List<CommentResponse> comments(@PathVariable Long id) {
        find(id);
        return commentRepository.findByExpenseIdOrderByCreatedAtAsc(id).stream().map(CommentResponse::from).toList();
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long id, @RequestBody CommentRequest request, Principal principal) {
        String text = request.text() == null ? "" : request.text().trim();
        if (text.isEmpty()) throw badRequest("Comment cannot be empty");
        if (text.length() > 1000) throw badRequest("Comment must be 1000 characters or fewer");
        ExpenseComment comment = new ExpenseComment(find(id), currentUser.get(principal), text);
        return CommentResponse.from(commentRepository.save(comment));
    }

    /** Audit trail for an expense, newest first. */
    @GetMapping("/{id}/history")
    public List<HistoryResponse> history(@PathVariable Long id) {
        find(id);
        return historyRepository.findByExpenseIdOrderByCreatedAtDescIdDesc(id).stream().map(HistoryResponse::from).toList();
    }

    @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Integer> importExpenses(@RequestParam("file") MultipartFile file, Principal principal) {
        return Map.of("imported", importService.importFile(file, currentUser.get(principal)));
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> importTemplate() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("expense-import-template.xlsx").build().toString())
                .body(importService.template());
    }

    private Expense find(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
    }

    /** Parses the form fields; ExpenseService checks the values. */
    private static ExpenseService.Input toInput(ExpenseRequest r) {
        LocalDate date = null;
        if (r.getDate() != null && !r.getDate().isBlank()) {
            try {
                date = LocalDate.parse(r.getDate());
            } catch (DateTimeParseException e) {
                throw badRequest("Date must be in YYYY-MM-DD format");
            }
        }
        BigDecimal amount = null;
        if (r.getAmount() != null && !r.getAmount().isBlank()) {
            try {
                amount = new BigDecimal(r.getAmount().trim());
            } catch (NumberFormatException e) {
                throw badRequest("Amount must be a valid number");
            }
        }
        String status = r.getStatus() == null || r.getStatus().isBlank() ? null : r.getStatus();
        return new ExpenseService.Input(date, amount, r.getCategoryId(), r.getPaymentModeId(),
                r.getReimbursementTypeId(), r.isTaxApplicable(), r.getDescription(), status);
    }

    private static BigDecimal sum(List<Expense> expenses) {
        return expenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<ExpenseStats.Group> group(List<Expense> expenses, Function<Expense, String> key) {
        return expenses.stream()
                .collect(Collectors.groupingBy(key, TreeMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(e -> new ExpenseStats.Group(e.getKey(), e.getValue().size(), sum(e.getValue())))
                .sorted(Comparator.comparing(ExpenseStats.Group::total).reversed())
                .toList();
    }

    private static List<ExpenseStats.Group> lastMonths(List<Expense> expenses, YearMonth current, int months) {
        Map<YearMonth, List<Expense>> byMonth = expenses.stream()
                .collect(Collectors.groupingBy(e -> YearMonth.from(e.getDate())));
        List<ExpenseStats.Group> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth month = current.minusMonths(i);
            List<Expense> inMonth = byMonth.getOrDefault(month, List.of());
            result.add(new ExpenseStats.Group(month.toString(), inMonth.size(), sum(inMonth)));
        }
        return result;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
