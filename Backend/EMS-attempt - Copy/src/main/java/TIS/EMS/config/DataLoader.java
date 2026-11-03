package TIS.EMS.config;

import TIS.EMS.models.*;
import TIS.EMS.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Prepares the database on startup:
 * - hashes any passwords still stored in plain text (accounts created before BCrypt was enabled),
 * - fills empty dropdown lists with the defaults from the requirements,
 * - creates a first Super Admin when there are no users at all.
 */
@Component
public class DataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataLoader.class);
    private static final Pattern BCRYPT = Pattern.compile("^\\$2[aby]?\\$\\d\\d\\$.{53}$");

    private final CategoryRepository categoryRepo;
    private final ReimbursementTypeRepository reimbursementRepo;
    private final PaymentModeRepository paymentModeRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final String initialAdminPassword;

    public DataLoader(CategoryRepository categoryRepo,
                      ReimbursementTypeRepository reimbursementRepo,
                      PaymentModeRepository paymentModeRepo,
                      UserRepository userRepo,
                      PasswordEncoder passwordEncoder,
                      @Value("${ems.initial-admin-password:}") String initialAdminPassword) {
        this.categoryRepo = categoryRepo;
        this.reimbursementRepo = reimbursementRepo;
        this.paymentModeRepo = paymentModeRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.initialAdminPassword = initialAdminPassword;
    }

    @Override
    public void run(String... args) {
        seed(categoryRepo, Category::new, "Travel", "Hotel", "Food", "Office Supplies", "Others");
        seed(reimbursementRepo, ReimbursementType::new, "Personal Reimbursement", "Company Paid", "Advance Cleared");
        seed(paymentModeRepo, PaymentMode::new, "Cash", "Credit Card", "UPI", "Bank Transfer");
        hashPlainTextPasswords();
        createFirstSuperAdmin();
    }

    private <T extends LookupItem> void seed(LookupRepository<T> repo, Function<String, T> factory, String... names) {
        if (repo.count() == 0) {
            repo.saveAll(List.of(names).stream().map(factory).toList());
        }
    }

    private void hashPlainTextPasswords() {
        List<User> plain = userRepo.findAll().stream()
                .filter(u -> u.getPassword() != null && !BCRYPT.matcher(u.getPassword()).matches())
                .toList();
        plain.forEach(u -> u.setPassword(passwordEncoder.encode(u.getPassword())));
        userRepo.saveAll(plain);
        if (!plain.isEmpty()) {
            log.info("Hashed {} plain-text password(s) with BCrypt", plain.size());
        }
    }

    private void createFirstSuperAdmin() {
        if (userRepo.count() > 0) return;

        String password = initialAdminPassword;
        if (password.isBlank()) {
            byte[] bytes = new byte[12];
            new SecureRandom().nextBytes(bytes);
            password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            log.warn("No users found. Created 'superadmin' with generated password: {}  (change it after logging in)", password);
        } else {
            log.info("No users found. Created 'superadmin' with the password from EMS_INITIAL_ADMIN_PASSWORD");
        }
        userRepo.save(new User("Super Admin", "superadmin", passwordEncoder.encode(password), Role.SUPERADMIN));
    }
}
