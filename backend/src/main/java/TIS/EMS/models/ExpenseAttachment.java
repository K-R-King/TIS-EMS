package TIS.EMS.models;

import jakarta.persistence.*;

/** Receipt file for an expense, stored in the database so every app instance can serve it. */
@Entity
@Table(name = "expense_attachments")
public class ExpenseAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "expense_id", unique = true)
    private Expense expense;

    @Lob
    @Column(nullable = false, length = 16_000_000) // MEDIUMBLOB; uploads are capped at 10 MB
    private byte[] data;

    public ExpenseAttachment() {}

    public ExpenseAttachment(Expense expense, byte[] data) {
        this.expense = expense;
        this.data = data;
    }

    public Long getId() { return id; }
    public Expense getExpense() { return expense; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}
