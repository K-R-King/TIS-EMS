package TIS.EMS.repository;

import TIS.EMS.models.ExpenseComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ExpenseCommentRepository extends JpaRepository<ExpenseComment, Long> {
    List<ExpenseComment> findByExpenseIdOrderByCreatedAtAsc(Long expenseId);

    boolean existsByAuthorId(Long userId);

    @Transactional
    @Modifying
    @Query("delete from ExpenseComment c where c.expense.id = :expenseId")
    void deleteByExpenseId(Long expenseId);
}
