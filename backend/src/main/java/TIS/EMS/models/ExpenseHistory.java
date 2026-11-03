package TIS.EMS.models;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Audit trail entry: who created, changed, imported or deleted an expense, and what changed.
 * expense_id has no foreign key so the trail survives after an expense is deleted.
 */
@Entity
@Table(name = "expense_history", indexes = @Index(name = "idx_expense_history_expense", columnList = "expense_id"))
public class ExpenseHistory {

    public static final String CREATED = "CREATED";
    public static final String UPDATED = "UPDATED";
    public static final String IMPORTED = "IMPORTED";
    public static final String DELETED = "DELETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expense_id", nullable = false)
    private Long expenseId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(length = 2000)
    private String details;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public ExpenseHistory() {}

    public ExpenseHistory(Long expenseId, User user, String action, String details) {
        this.expenseId = expenseId;
        this.user = user;
        this.action = action;
        this.details = details;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Long getExpenseId() { return expenseId; }
    public User getUser() { return user; }
    public String getAction() { return action; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
