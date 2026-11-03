package TIS.EMS.models;

import java.util.List;

public final class ExpenseStatus {
    public static final String PENDING_REVIEW = "Pending Review";

    public static final List<String> ALL = List.of(PENDING_REVIEW, "Approved", "Rejected", "Reimbursed");

    private ExpenseStatus() {}
}
