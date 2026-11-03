package TIS.EMS.controller;

import java.util.Map;
import TIS.EMS.models.Expense;
import TIS.EMS.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "http://localhost:3000")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @PostMapping
    public ResponseEntity<?> submitExpense(
            @RequestParam("date") String dateStr,
            @RequestParam("amount") String amountStr,
            @RequestParam("category") String category,
            @RequestParam("reimbursementType") String reimbursementType,
            @RequestParam("taxApplicable") boolean taxApplicable,
            @RequestParam("paymentMode") String paymentMode,
            @RequestParam("description") String description,
            @RequestParam(value = "attachment", required = false) MultipartFile attachment,
            @RequestParam("status") String status,
            Principal principal
    ) {
        try {
            LocalDate date = LocalDate.parse(dateStr);
            double amount = Double.parseDouble(amountStr);

            if (amount < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Amount cannot be negative.");
            }

            String attachmentName = (attachment != null) ? attachment.getOriginalFilename() : null;

            String enteredBy = (principal != null) ? principal.getName() : "Unknown";

            Expense expense = new Expense(
                    date, amount, category, reimbursementType,
                    taxApplicable, paymentMode, description,
                    enteredBy, status, attachmentName
            );

            expenseRepository.save(expense);

            return new ResponseEntity<>(Map.of("message", "Expense submitted successfully"), HttpStatus.OK);

        } catch (DateTimeParseException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid date format");
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Amount must be a valid number");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit expense", "details", e.getMessage()));
        }
    }
}
