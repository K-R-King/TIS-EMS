package TIS.EMS.service;

import TIS.EMS.models.*;
import TIS.EMS.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.*;

/** Validation and changes to expenses, shared by the API and the Excel import. Every change is recorded in the history. */
@Service
public class ExpenseService {

    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    /** An expense as entered by a user, before validation. */
    public record Input(LocalDate date, BigDecimal amount, Long categoryId, Long paymentModeId,
                        Long reimbursementTypeId, boolean taxApplicable, String description, String status) {}

    private final ExpenseRepository expenseRepository;
    private final ExpenseCommentRepository commentRepository;
    private final ExpenseHistoryRepository historyRepository;
    private final CategoryRepository categoryRepository;
    private final PaymentModeRepository paymentModeRepository;
    private final ReimbursementTypeRepository reimbursementTypeRepository;
    private final AttachmentService attachmentService;
    private final EntityManager entityManager;
    private final Clock clock;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ExpenseCommentRepository commentRepository,
                          ExpenseHistoryRepository historyRepository,
                          CategoryRepository categoryRepository,
                          PaymentModeRepository paymentModeRepository,
                          ReimbursementTypeRepository reimbursementTypeRepository,
                          AttachmentService attachmentService,
                          EntityManager entityManager,
                          Clock clock) {
        this.expenseRepository = expenseRepository;
        this.commentRepository = commentRepository;
        this.historyRepository = historyRepository;
        this.categoryRepository = categoryRepository;
        this.paymentModeRepository = paymentModeRepository;
        this.reimbursementTypeRepository = reimbursementTypeRepository;
        this.attachmentService = attachmentService;
        this.entityManager = entityManager;
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Everything wrong with the input, as messages for the user; empty when it is valid. */
    public List<String> problems(Input in) {
        List<String> problems = new ArrayList<>();
        if (in.date() == null) problems.add("Date is required");
        else if (in.date().isAfter(today())) problems.add("Date cannot be in the future");

        if (in.amount() == null) problems.add("Amount is required");
        else if (in.amount().signum() <= 0) problems.add("Amount must be greater than zero");
        else if (in.amount().stripTrailingZeros().scale() > 2) problems.add("Amount can have at most 2 decimal places");
        else if (in.amount().compareTo(MAX_AMOUNT) > 0) problems.add("Amount is too large");

        if (in.categoryId() == null) problems.add("Category is required");
        else if (!categoryRepository.existsById(in.categoryId())) problems.add("Category not found");
        if (in.paymentModeId() != null && !paymentModeRepository.existsById(in.paymentModeId())) {
            problems.add("Payment mode not found");
        }
        if (in.reimbursementTypeId() != null && !reimbursementTypeRepository.existsById(in.reimbursementTypeId())) {
            problems.add("Reimbursement type not found");
        }
        if (in.description() != null && in.description().trim().length() > 1000) {
            problems.add("Description must be 1000 characters or fewer");
        }
        if (in.status() != null && !ExpenseStatus.ALL.contains(in.status())) problems.add("Unknown status: " + in.status());
        return problems;
    }

    @Transactional
    public Expense create(Input in, User user, MultipartFile attachment, String action) {
        requireValid(in);
        Expense expense = new Expense();
        expense.setEnteredBy(user);
        copy(in, expense);
        expense = expenseRepository.save(expense);
        if (hasFile(attachment)) attachmentService.save(expense, attachment);
        historyRepository.save(new ExpenseHistory(expense.getId(), user, action, null));
        return expense;
    }

    @Transactional
    public Expense update(Expense expense, Input in, MultipartFile attachment, boolean removeAttachment, User user) {
        requireValid(in);
        Map<String, String> before = snapshot(expense);
        copy(in, expense);
        if (hasFile(attachment)) attachmentService.save(expense, attachment);
        else if (removeAttachment && expense.getAttachmentName() != null) attachmentService.remove(expense);
        expense = expenseRepository.save(expense);

        String changes = describeChanges(before, snapshot(expense));
        if (!changes.isEmpty()) {
            historyRepository.save(new ExpenseHistory(expense.getId(), user, ExpenseHistory.UPDATED, changes));
        }
        return expense;
    }

    @Transactional
    public void delete(Expense expense, User user) {
        Map<String, String> s = snapshot(expense);
        commentRepository.deleteByExpenseId(expense.getId());
        attachmentService.remove(expense);
        expenseRepository.delete(expense);
        historyRepository.save(new ExpenseHistory(expense.getId(), user, ExpenseHistory.DELETED,
                s.get("Amount") + " · " + s.get("Category") + " · " + s.get("Date") + " · entered by "
                        + expense.getEnteredBy().getUsername()));
    }

    /** Sum of the amounts of every expense matching the filter. */
    public BigDecimal sum(ExpenseFilter filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<BigDecimal> query = cb.createQuery(BigDecimal.class);
        Root<Expense> root = query.from(Expense.class);
        query.select(cb.sum(root.get("amount"))).where(filter.toSpecification().toPredicate(root, query, cb));
        BigDecimal total = entityManager.createQuery(query).getSingleResult();
        return total == null ? BigDecimal.ZERO : total;
    }

    private void requireValid(Input in) {
        List<String> problems = problems(in);
        if (!problems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join(". ", problems));
        }
    }

    private void copy(Input in, Expense expense) {
        expense.setDate(in.date());
        expense.setAmount(in.amount());
        expense.setCategory(categoryRepository.findById(in.categoryId()).orElseThrow());
        expense.setPaymentMode(in.paymentModeId() == null ? null : paymentModeRepository.findById(in.paymentModeId()).orElseThrow());
        expense.setReimbursementType(in.reimbursementTypeId() == null ? null
                : reimbursementTypeRepository.findById(in.reimbursementTypeId()).orElseThrow());
        expense.setTaxApplicable(in.taxApplicable());
        String description = in.description() == null ? null : in.description().trim();
        expense.setDescription(description == null || description.isEmpty() ? null : description);
        if (in.status() != null) expense.setStatus(in.status());
    }

    private static boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private static Map<String, String> snapshot(Expense e) {
        Map<String, String> s = new LinkedHashMap<>();
        s.put("Date", String.valueOf(e.getDate()));
        s.put("Amount", e.getAmount() == null ? "" : e.getAmount().setScale(2).toPlainString());
        s.put("Category", e.getCategory() == null ? "" : e.getCategory().getName());
        s.put("Payment mode", e.getPaymentMode() == null ? "—" : e.getPaymentMode().getName());
        s.put("Reimbursement type", e.getReimbursementType() == null ? "—" : e.getReimbursementType().getName());
        s.put("Tax applicable", e.isTaxApplicable() ? "Yes" : "No");
        s.put("Description", e.getDescription() == null ? "—" : e.getDescription());
        s.put("Status", e.getStatus());
        s.put("Receipt", e.getAttachmentName() == null ? "none" : e.getAttachmentName());
        return s;
    }

    private static String describeChanges(Map<String, String> before, Map<String, String> after) {
        List<String> changes = new ArrayList<>();
        before.forEach((field, old) -> {
            String now = after.get(field);
            if (!Objects.equals(old, now)) changes.add(field + ": " + abbreviate(old) + " → " + abbreviate(now));
        });
        String joined = String.join("; ", changes);
        return joined.length() > 2000 ? joined.substring(0, 1997) + "..." : joined;
    }

    private static String abbreviate(String s) {
        return s != null && s.length() > 80 ? s.substring(0, 77) + "..." : s;
    }
}
