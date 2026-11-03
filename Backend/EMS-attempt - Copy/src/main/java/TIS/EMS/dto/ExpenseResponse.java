package TIS.EMS.dto;

import TIS.EMS.models.Expense;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpenseResponse(
        Long id,
        LocalDate date,
        BigDecimal amount,
        Ref category,
        Ref reimbursementType,
        boolean taxApplicable,
        Ref paymentMode,
        String description,
        UserResponse enteredBy,
        String status,
        String attachmentName,
        String attachmentContentType,
        Instant createdAt,
        Instant updatedAt
) {
    public static ExpenseResponse from(Expense e) {
        return new ExpenseResponse(
                e.getId(), e.getDate(), e.getAmount(),
                Ref.from(e.getCategory()), Ref.from(e.getReimbursementType()),
                e.isTaxApplicable(), Ref.from(e.getPaymentMode()),
                e.getDescription(), UserResponse.from(e.getEnteredBy()), e.getStatus(),
                e.getAttachmentName(), e.getAttachmentContentType(),
                e.getCreatedAt(), e.getUpdatedAt());
    }
}
