package TIS.EMS.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "reimbursement_type_id")
    private ReimbursementType reimbursementType;

    private boolean taxApplicable;

    @ManyToOne
    @JoinColumn(name = "payment_mode_id")
    private PaymentMode paymentMode;

    @Column(length = 1000)
    private String description;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User enteredBy;

    @Column(nullable = false)
    private String status = ExpenseStatus.PENDING_REVIEW;

    // The file itself is in ExpenseAttachment so listing expenses never loads it
    private String attachmentName;        // original file name, shown to users
    private String attachmentContentType;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public LocalDate getDate() { return date; }
    public BigDecimal getAmount() { return amount; }
    public Category getCategory() { return category; }
    public ReimbursementType getReimbursementType() { return reimbursementType; }
    public boolean isTaxApplicable() { return taxApplicable; }
    public PaymentMode getPaymentMode() { return paymentMode; }
    public String getDescription() { return description; }
    public User getEnteredBy() { return enteredBy; }
    public String getStatus() { return status; }
    public String getAttachmentName() { return attachmentName; }
    public String getAttachmentContentType() { return attachmentContentType; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setDate(LocalDate date) { this.date = date; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public void setCategory(Category category) { this.category = category; }
    public void setReimbursementType(ReimbursementType reimbursementType) { this.reimbursementType = reimbursementType; }
    public void setTaxApplicable(boolean taxApplicable) { this.taxApplicable = taxApplicable; }
    public void setPaymentMode(PaymentMode paymentMode) { this.paymentMode = paymentMode; }
    public void setDescription(String description) { this.description = description; }
    public void setEnteredBy(User enteredBy) { this.enteredBy = enteredBy; }
    public void setStatus(String status) { this.status = status; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public void setAttachmentContentType(String attachmentContentType) { this.attachmentContentType = attachmentContentType; }
}
