package TIS.EMS.repository;

import TIS.EMS.models.ExpenseHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseHistoryRepository extends JpaRepository<ExpenseHistory, Long> {
    List<ExpenseHistory> findByExpenseIdOrderByCreatedAtDescIdDesc(Long expenseId);

    boolean existsByUserId(Long userId);
}
