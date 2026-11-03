package TIS.EMS.dto;

import org.springframework.web.multipart.MultipartFile;

/** Multipart form fields for creating or updating an expense. */
public class ExpenseRequest {
    private String date;
    private String amount;
    private Long categoryId;
    private Long reimbursementTypeId;
    private boolean taxApplicable;
    private Long paymentModeId;
    private String description;
    private String status;
    private MultipartFile attachment;
    private boolean removeAttachment;

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public Long getReimbursementTypeId() { return reimbursementTypeId; }
    public void setReimbursementTypeId(Long reimbursementTypeId) { this.reimbursementTypeId = reimbursementTypeId; }
    public boolean isTaxApplicable() { return taxApplicable; }
    public void setTaxApplicable(boolean taxApplicable) { this.taxApplicable = taxApplicable; }
    public Long getPaymentModeId() { return paymentModeId; }
    public void setPaymentModeId(Long paymentModeId) { this.paymentModeId = paymentModeId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public MultipartFile getAttachment() { return attachment; }
    public void setAttachment(MultipartFile attachment) { this.attachment = attachment; }
    public boolean isRemoveAttachment() { return removeAttachment; }
    public void setRemoveAttachment(boolean removeAttachment) { this.removeAttachment = removeAttachment; }
}
