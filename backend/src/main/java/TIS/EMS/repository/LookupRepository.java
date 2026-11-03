package TIS.EMS.repository;

import TIS.EMS.models.LookupItem;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface LookupRepository<T extends LookupItem> extends JpaRepository<T, Long> {
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    default java.util.List<T> findAllSorted() { return findAll(Sort.by("name")); }
}
