package TIS.EMS.service;

import TIS.EMS.models.Expense;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** The expense list filters from the requirements, plus free-text search. */
public record ExpenseFilter(LocalDate from, LocalDate to, Long categoryId, Long paymentModeId,
                            Long reimbursementTypeId, String status, String q) {

    public Specification<Expense> toSpecification() {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("date"), from));
            if (to != null) p.add(cb.lessThanOrEqualTo(root.get("date"), to));
            if (categoryId != null) p.add(cb.equal(root.get("category").get("id"), categoryId));
            if (paymentModeId != null) p.add(cb.equal(root.get("paymentMode").get("id"), paymentModeId));
            if (reimbursementTypeId != null) p.add(cb.equal(root.get("reimbursementType").get("id"), reimbursementTypeId));
            if (status != null && !status.isBlank()) p.add(cb.equal(root.get("status"), status));
            if (q != null && !q.isBlank()) {
                // Search for the text as typed: %, _ and \ are literal characters, not LIKE wildcards
                String like = "%" + q.trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                var user = root.join("enteredBy");
                p.add(cb.or(
                        cb.like(cb.lower(root.get("description")), like, '\\'),
                        cb.like(cb.lower(user.get("name")), like, '\\'),
                        cb.like(cb.lower(user.get("username")), like, '\\')));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
