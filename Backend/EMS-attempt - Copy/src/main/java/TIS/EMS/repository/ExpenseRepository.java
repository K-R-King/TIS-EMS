package TIS.EMS.repository;

import TIS.EMS.models.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {
    boolean existsByCategoryId(Long id);
    boolean existsByPaymentModeId(Long id);
    boolean existsByReimbursementTypeId(Long id);
    boolean existsByEnteredById(Long id);

    List<Expense> findTop5ByOrderByDateDescIdDesc();
}
