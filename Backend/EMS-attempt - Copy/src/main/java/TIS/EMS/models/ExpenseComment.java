package TIS.EMS.models;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "expense_comments")
public class ExpenseComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "expense_id")
    private Expense expense;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User author;

    @Column(nullable = false, length = 1000)
    private String text;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public ExpenseComment() {}

    public ExpenseComment(Expense expense, User author, String text) {
        this.expense = expense;
        this.author = author;
        this.text = text;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Expense getExpense() { return expense; }
    public User getAuthor() { return author; }
    public String getText() { return text; }
    public Instant getCreatedAt() { return createdAt; }
}
