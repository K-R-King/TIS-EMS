package TIS.EMS;

import TIS.EMS.config.DataLoader;
import TIS.EMS.models.User;
import TIS.EMS.repository.CategoryRepository;
import TIS.EMS.repository.PaymentModeRepository;
import TIS.EMS.repository.ReimbursementTypeRepository;
import TIS.EMS.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DataLoaderTests {

    private final UserRepository users = mock(UserRepository.class);

    private DataLoader loader(String initialPassword, boolean required) {
        when(users.count()).thenReturn(0L);
        return new DataLoader(mock(CategoryRepository.class), mock(ReimbursementTypeRepository.class),
                mock(PaymentModeRepository.class), users, new BCryptPasswordEncoder(4), initialPassword, required);
    }

    @Test
    void productionRefusesToGenerateAPasswordIntoTheLogs() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> loader("", true).run());
        assertTrue(e.getMessage().contains("EMS_INITIAL_ADMIN_PASSWORD"));
        verify(users, never()).save(any());
    }

    @Test
    void createsTheFirstSuperAdminWithTheGivenPassword() {
        loader("first-admin-pw", true).run();
        verify(users).save(argThat((User u) -> u.getUsername().equals("superadmin")
                && new BCryptPasswordEncoder().matches("first-admin-pw", u.getPassword())));
    }

    @Test
    void developmentGeneratesAPasswordWhenNoneIsGiven() {
        loader("", false).run();
        verify(users).save(argThat((User u) -> u.getUsername().equals("superadmin")));
    }
}
