package TIS.EMS.service;

import TIS.EMS.models.Expense;
import TIS.EMS.models.ExpenseAttachment;
import TIS.EMS.repository.ExpenseAttachmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Optional;

/** Stores receipt files (PDF/JPG/PNG) in the database. */
@Service
public class AttachmentService {

    private final ExpenseAttachmentRepository repository;

    public AttachmentService(ExpenseAttachmentRepository repository) {
        this.repository = repository;
    }

    /** Validates the file and attaches it to a saved expense, replacing any previous receipt. */
    public void save(Expense expense, MultipartFile file) {
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read attachment");
        }

        // Trust the file contents, not the name or the browser-supplied type
        String contentType = detectType(data);
        if (contentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment must be a PDF, JPG or PNG file");
        }

        ExpenseAttachment attachment = repository.findByExpenseId(expense.getId())
                .orElseGet(() -> new ExpenseAttachment(expense, null));
        attachment.setData(data);
        repository.save(attachment);

        String original = file.getOriginalFilename();
        String extension = switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
        expense.setAttachmentName(original == null || original.isBlank()
                ? "receipt" + extension
                : Path.of(original).getFileName().toString());
        expense.setAttachmentContentType(contentType);
    }

    public void remove(Expense expense) {
        repository.deleteByExpenseId(expense.getId());
        expense.setAttachmentName(null);
        expense.setAttachmentContentType(null);
    }

    public Optional<byte[]> load(Long expenseId) {
        return repository.findByExpenseId(expenseId).map(ExpenseAttachment::getData);
    }

    private static String detectType(byte[] h) {
        if (h.length >= 4 && h[0] == '%' && h[1] == 'P' && h[2] == 'D' && h[3] == 'F') return "application/pdf";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "image/png";
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "image/jpeg";
        return null;
    }
}
