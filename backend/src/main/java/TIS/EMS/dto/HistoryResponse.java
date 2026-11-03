package TIS.EMS.dto;

import TIS.EMS.models.ExpenseHistory;

import java.time.Instant;

public record HistoryResponse(Long id, PersonResponse user, String action, String details, Instant createdAt) {
    public static HistoryResponse from(ExpenseHistory h) {
        return new HistoryResponse(h.getId(), PersonResponse.from(h.getUser()), h.getAction(), h.getDetails(), h.getCreatedAt());
    }
}
