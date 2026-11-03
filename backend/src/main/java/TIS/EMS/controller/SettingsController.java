package TIS.EMS.controller;

import TIS.EMS.dto.NameRequest;
import TIS.EMS.models.Category;
import TIS.EMS.models.LookupItem;
import TIS.EMS.models.PaymentMode;
import TIS.EMS.models.ReimbursementType;
import TIS.EMS.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.function.Function;
import java.util.function.LongPredicate;

/**
 * Manages the dropdown lists; Super Admin only (enforced in SecurityConfig).
 * Lists are read through /api/dropdowns.
 */
@RestController
@RequestMapping("/api/settings/{type}")
public class SettingsController {

    private record Kind<T extends LookupItem>(String label, LookupRepository<T> repo,
                                              Function<String, T> factory, LongPredicate inUse) {}

    private final Map<String, Kind<?>> kinds;

    public SettingsController(CategoryRepository categories,
                              PaymentModeRepository paymentModes,
                              ReimbursementTypeRepository reimbursementTypes,
                              ExpenseRepository expenses) {
        this.kinds = Map.of(
                "categories", new Kind<>("Category", categories, Category::new, expenses::existsByCategoryId),
                "payment-modes", new Kind<>("Payment mode", paymentModes, PaymentMode::new, expenses::existsByPaymentModeId),
                "reimbursement-types", new Kind<>("Reimbursement type", reimbursementTypes, ReimbursementType::new,
                        expenses::existsByReimbursementTypeId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LookupItem create(@PathVariable String type, @RequestBody NameRequest request) {
        return create(kind(type), request);
    }

    @PutMapping("/{id}")
    public LookupItem rename(@PathVariable String type, @PathVariable Long id, @RequestBody NameRequest request) {
        return rename(kind(type), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String type, @PathVariable Long id) {
        Kind<?> kind = kind(type);
        LookupItem item = find(kind, id);
        if (kind.inUse().test(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "\"" + item.getName() + "\" is used by existing expenses. Rename it instead of deleting it.");
        }
        kind.repo().deleteById(id);
    }

    private <T extends LookupItem> T create(Kind<T> kind, NameRequest request) {
        String name = requireName(request);
        if (kind.repo().existsByNameIgnoreCase(name)) throw duplicate(kind, name);
        return kind.repo().save(kind.factory().apply(name));
    }

    private <T extends LookupItem> T rename(Kind<T> kind, Long id, NameRequest request) {
        T item = find(kind, id);
        String name = requireName(request);
        if (kind.repo().existsByNameIgnoreCaseAndIdNot(name, id)) throw duplicate(kind, name);
        item.setName(name);
        return kind.repo().save(item);
    }

    private Kind<?> kind(String type) {
        Kind<?> kind = kinds.get(type);
        if (kind == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown list: " + type);
        return kind;
    }

    private static <T extends LookupItem> T find(Kind<T> kind, Long id) {
        return kind.repo().findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, kind.label() + " not found"));
    }

    private static String requireName(NameRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty() || name.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name must be 1-100 characters");
        }
        return name;
    }

    private static ResponseStatusException duplicate(Kind<?> kind, String name) {
        return new ResponseStatusException(HttpStatus.CONFLICT, kind.label() + " \"" + name + "\" already exists");
    }
}
