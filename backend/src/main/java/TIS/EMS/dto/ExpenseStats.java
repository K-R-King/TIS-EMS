package TIS.EMS.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExpenseStats(
        long count,
        BigDecimal totalAmount,
        BigDecimal thisMonthAmount,
        long pendingCount,
        List<Group> byCategory,
        List<Group> byStatus,
        List<Group> byMonth,   // last 6 months, oldest first, named YYYY-MM
        List<ExpenseResponse> recent
) {
    public record Group(String name, long count, BigDecimal total) {}
}
