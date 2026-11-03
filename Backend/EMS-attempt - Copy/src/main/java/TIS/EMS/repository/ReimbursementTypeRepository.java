package TIS.EMS.repository;

import TIS.EMS.models.ReimbursementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReimbursementTypeRepository extends JpaRepository<ReimbursementType, Long> { }
