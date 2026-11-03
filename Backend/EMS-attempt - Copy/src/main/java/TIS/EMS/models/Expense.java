package TIS.EMS.models;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    private Double amount;  // changed from double to Double (optional)

    private String category;

    private String reimbursementType;

    private boolean taxApplicable;

    private String paymentMode;

    @Column(length = 1000)
    private String description;

    private String enteredBy;

    private String status;

    private String attachmentName;

    public Expense() {}

    public Expense(LocalDate date, Double amount, String category, String reimbursementType,
                   boolean taxApplicable, String paymentMode, String description,
                   String enteredBy, String status, String attachmentName) {
        this.date = date;
        this.amount = amount;
        this.category = category;
        this.reimbursementType = reimbursementType;
        this.taxApplicable = taxApplicable;
        this.paymentMode = paymentMode;
        this.description = description;
        this.enteredBy = enteredBy;
        this.status = status;
        this.attachmentName = attachmentName;
    }

    // Getters and setters below (same as yours)
    // ...
}
