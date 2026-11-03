package TIS.EMS.controller;

import TIS.EMS.models.Category;
import TIS.EMS.models.ExpenseStatus;
import TIS.EMS.models.PaymentMode;
import TIS.EMS.models.ReimbursementType;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.PaymentModeRepository;
import TIS.EMS.repository.ReimbursementTypeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dropdowns")
public class DropdownController {

    private final CategoryRepository categoryRepository;
    private final ReimbursementTypeRepository reimbursementTypeRepository;
    private final PaymentModeRepository paymentModeRepository;

    public DropdownController(CategoryRepository categoryRepository,
                              ReimbursementTypeRepository reimbursementTypeRepository,
                              PaymentModeRepository paymentModeRepository) {
        this.categoryRepository = categoryRepository;
        this.reimbursementTypeRepository = reimbursementTypeRepository;
        this.paymentModeRepository = paymentModeRepository;
    }

    @GetMapping("/categories")
    public List<Category> getCategories() {
        return categoryRepository.findAllSorted();
    }

    @GetMapping("/reimbursement-types")
    public List<ReimbursementType> getReimbursementTypes() {
        return reimbursementTypeRepository.findAllSorted();
    }

    @GetMapping("/payment-modes")
    public List<PaymentMode> getPaymentModes() {
        return paymentModeRepository.findAllSorted();
    }

    @GetMapping("/statuses")
    public List<String> getStatuses() {
        return ExpenseStatus.ALL;
    }
}
