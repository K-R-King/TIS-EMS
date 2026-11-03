package TIS.EMS.config;

import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.ReimbursementTypeRepository;
import TIS.EMS.repository.PaymentModeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private final CategoryRepository categoryRepo;
    private final ReimbursementTypeRepository reimbursementRepo;
    private final PaymentModeRepository paymentModeRepo;

    public DataLoader(CategoryRepository categoryRepo,
                      ReimbursementTypeRepository reimbursementRepo,
                      PaymentModeRepository paymentModeRepo) {
        this.categoryRepo = categoryRepo;
        this.reimbursementRepo = reimbursementRepo;
        this.paymentModeRepo = paymentModeRepo;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("---- DB counts at startup ----");
        System.out.println("categories: " + categoryRepo.count());
        System.out.println("reimbursement_types: " + reimbursementRepo.count());
        System.out.println("payment_modes: " + paymentModeRepo.count());
        System.out.println("-------------------------------");
    }
}
