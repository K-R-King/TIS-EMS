package TIS.EMS.controller;

import TIS.EMS.models.Category;
import TIS.EMS.models.ReimbursementType;
import TIS.EMS.models.PaymentMode;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.ReimbursementTypeRepository;
import TIS.EMS.repository.PaymentModeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dropdowns")
@CrossOrigin(origins = "http://localhost:3000") // Allow frontend access
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
        return categoryRepository.findAll();
    }

    @GetMapping("/reimbursement-types")
    public List<ReimbursementType> getReimbursementTypes() {
        return reimbursementTypeRepository.findAll();
    }

    @GetMapping("/payment-modes")
    public List<PaymentMode> getPaymentModes() {
        return paymentModeRepository.findAll();
    }
}
