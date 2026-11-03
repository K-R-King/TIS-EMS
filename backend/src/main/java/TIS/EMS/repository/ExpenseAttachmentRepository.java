package TIS.EMS.repository;

import TIS.EMS.models.ExpenseAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface ExpenseAttachmentRepository extends JpaRepository<ExpenseAttachment, Long> {
    Optional<ExpenseAttachment> findByExpenseId(Long expenseId);

    @Transactional
    @Modifying
    @Query("delete from ExpenseAttachment a where a.expense.id = :expenseId")
    void deleteByExpenseId(Long expenseId);
}
