package TIS.EMS.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;

/** Stores receipt files (PDF/JPG/PNG) on disk under ems.upload-dir with random names. */
@Component
public class AttachmentStorage {

    public record Stored(String path, String originalName, String contentType) {}

    private final Path root;

    public AttachmentStorage(@Value("${ems.upload-dir}") String uploadDir) throws IOException {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public Stored save(MultipartFile file) {
        byte[] head = new byte[8];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(head, 0, head.length);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read attachment");
        }

        // Trust the file contents, not the name or the browser-supplied type
        String contentType = detectType(Arrays.copyOf(head, read));
        if (contentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment must be a PDF, JPG or PNG file");
        }

        String extension = switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
        String storedName = UUID.randomUUID() + extension;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(storedName));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save attachment");
        }

        String original = file.getOriginalFilename();
        String name = (original == null || original.isBlank()) ? "receipt" + extension : Path.of(original).getFileName().toString();
        return new Stored(storedName, name, contentType);
    }

    public Path resolve(String storedName) {
        Path path = root.resolve(storedName).normalize();
        if (!path.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return path;
    }

    public void delete(String storedName) {
        if (storedName == null) return;
        try {
            Files.deleteIfExists(resolve(storedName));
        } catch (IOException ignored) {
            // A leftover file is harmless; the database no longer points to it
        }
    }

    private static String detectType(byte[] h) {
        if (h.length >= 4 && h[0] == '%' && h[1] == 'P' && h[2] == 'D' && h[3] == 'F') return "application/pdf";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "image/png";
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "image/jpeg";
        return null;
    }
}
