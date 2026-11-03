package TIS.EMS.dto;

import java.math.BigDecimal;
import java.util.List;

/** One page of the expense list; total and totalAmount cover every expense matching the filters. */
public record ExpensePage(List<ExpenseResponse> items, long total, BigDecimal totalAmount, int page, int size) {}
