package TIS.EMS.controller;

import TIS.EMS.dto.*;
import TIS.EMS.models.*;
import TIS.EMS.repository.*;
import TIS.EMS.service.AttachmentStorage;
import TIS.EMS.service.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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

    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    private final ExpenseRepository expenseRepository;
    private final ExpenseCommentRepository commentRepository;
    private final CategoryRepository categoryRepository;
    private final PaymentModeRepository paymentModeRepository;
    private final ReimbursementTypeRepository reimbursementTypeRepository;
    private final AttachmentStorage attachmentStorage;
    private final CurrentUser currentUser;

    public ExpenseController(ExpenseRepository expenseRepository,
                             ExpenseCommentRepository commentRepository,
                             CategoryRepository categoryRepository,
                             PaymentModeRepository paymentModeRepository,
                             ReimbursementTypeRepository reimbursementTypeRepository,
                             AttachmentStorage attachmentStorage,
                             CurrentUser currentUser) {
        this.expenseRepository = expenseRepository;
        this.commentRepository = commentRepository;
        this.categoryRepository = categoryRepository;
        this.paymentModeRepository = paymentModeRepository;
        this.reimbursementTypeRepository = reimbursementTypeRepository;
        this.attachmentStorage = attachmentStorage;
        this.currentUser = currentUser;
    }

    /** Expense list with the filters from the requirements, plus free-text search. */
    @GetMapping
    public List<ExpenseResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long paymentModeId,
            @RequestParam(required = false) Long reimbursementTypeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q
    ) {
        Specification<Expense> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("date"), from));
            if (to != null) p.add(cb.lessThanOrEqualTo(root.get("date"), to));
            if (categoryId != null) p.add(cb.equal(root.get("category").get("id"), categoryId));
            if (paymentModeId != null) p.add(cb.equal(root.get("paymentMode").get("id"), paymentModeId));
            if (reimbursementTypeId != null) p.add(cb.equal(root.get("reimbursementType").get("id"), reimbursementTypeId));
            if (status != null && !status.isBlank()) p.add(cb.equal(root.get("status"), status));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                var user = root.join("enteredBy");
                p.add(cb.or(
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(user.get("name")), like),
                        cb.like(cb.lower(user.get("username")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return expenseRepository.findAll(spec, Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id")))
                .stream().map(ExpenseResponse::from).toList();
    }

    @GetMapping("/stats")
    public ExpenseStats stats() {
        List<Expense> all = expenseRepository.findAll();
        YearMonth thisMonth = YearMonth.now();

        return new ExpenseStats(
                all.size(),
                sum(all),
                sum(all.stream().filter(e -> YearMonth.from(e.getDate()).equals(thisMonth)).toList()),
                all.stream().filter(e -> ExpenseStatus.PENDING_REVIEW.equals(e.getStatus())).count(),
                group(all, e -> e.getCategory().getName()),
                group(all, Expense::getStatus),
                expenseRepository.findTop5ByOrderByDateDescIdDesc().stream().map(ExpenseResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ExpenseResponse get(@PathVariable Long id) {
        return ExpenseResponse.from(find(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@ModelAttribute ExpenseRequest request, Principal principal) {
        Expense expense = new Expense();
        expense.setEnteredBy(currentUser.get(principal));
        apply(expense, request);
        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ExpenseResponse update(@PathVariable Long id, @ModelAttribute ExpenseRequest request) {
        Expense expense = find(id);
        apply(expense, request);
        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Expense expense = find(id);
        commentRepository.deleteByExpenseId(id);
        expenseRepository.delete(expense);
        attachmentStorage.delete(expense.getAttachmentPath());
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<Resource> attachment(@PathVariable Long id) {
        Expense expense = find(id);
        if (expense.getAttachmentPath() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This expense has no attachment");
        }
        Path file = attachmentStorage.resolve(expense.getAttachmentPath());
        if (!Files.exists(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file is missing on the server");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(expense.getAttachmentContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(expense.getAttachmentName(), StandardCharsets.UTF_8).build().toString())
                .body(new FileSystemResource(file));
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

    private Expense find(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
    }

    /** Validates the request and copies it onto the expense. */
    private void apply(Expense expense, ExpenseRequest r) {
        LocalDate date;
        try {
            if (r.getDate() == null || r.getDate().isBlank()) throw badRequest("Date is required");
            date = LocalDate.parse(r.getDate());
        } catch (DateTimeParseException e) {
            throw badRequest("Date must be in YYYY-MM-DD format");
        }
        if (date.isAfter(LocalDate.now())) throw badRequest("Date cannot be in the future");

        BigDecimal amount;
        try {
            if (r.getAmount() == null || r.getAmount().isBlank()) throw badRequest("Amount is required");
            amount = new BigDecimal(r.getAmount().trim());
        } catch (NumberFormatException e) {
            throw badRequest("Amount must be a valid number");
        }
        if (amount.signum() <= 0) throw badRequest("Amount must be greater than zero");
        if (amount.scale() > 2) throw badRequest("Amount can have at most 2 decimal places");
        if (amount.compareTo(MAX_AMOUNT) > 0) throw badRequest("Amount is too large");

        if (r.getCategoryId() == null) throw badRequest("Category is required");

        String description = r.getDescription() == null ? null : r.getDescription().trim();
        if (description != null && description.length() > 1000) {
            throw badRequest("Description must be 1000 characters or fewer");
        }

        if (r.getStatus() != null && !r.getStatus().isBlank()) {
            if (!ExpenseStatus.ALL.contains(r.getStatus())) throw badRequest("Unknown status: " + r.getStatus());
            expense.setStatus(r.getStatus());
        }

        expense.setDate(date);
        expense.setAmount(amount);
        expense.setCategory(lookup(categoryRepository, r.getCategoryId(), "Category"));
        expense.setPaymentMode(lookup(paymentModeRepository, r.getPaymentModeId(), "Payment mode"));
        expense.setReimbursementType(lookup(reimbursementTypeRepository, r.getReimbursementTypeId(), "Reimbursement type"));
        expense.setTaxApplicable(r.isTaxApplicable());
        expense.setDescription(description == null || description.isEmpty() ? null : description);

        boolean newFile = r.getAttachment() != null && !r.getAttachment().isEmpty();
        if (newFile || r.isRemoveAttachment()) {
            String oldPath = expense.getAttachmentPath();
            if (newFile) {
                AttachmentStorage.Stored stored = attachmentStorage.save(r.getAttachment());
                expense.setAttachmentPath(stored.path());
                expense.setAttachmentName(stored.originalName());
                expense.setAttachmentContentType(stored.contentType());
            } else {
                expense.setAttachmentPath(null);
                expense.setAttachmentName(null);
                expense.setAttachmentContentType(null);
            }
            attachmentStorage.delete(oldPath);
        }
    }

    private static <T extends LookupItem> T lookup(LookupRepository<T> repo, Long id, String label) {
        if (id == null) return null;
        return repo.findById(id).orElseThrow(() -> badRequest(label + " not found"));
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

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
