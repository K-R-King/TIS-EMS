package TIS.EMS.config;

import TIS.EMS.models.User;
import TIS.EMS.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Fetch user entity from database
        User entityUser = userRepository.findByUsername(username);

        if (entityUser == null) {
            throw new UsernameNotFoundException("User not found: " + username);
        }

        // Build and return Spring Security UserDetails object
        return org.springframework.security.core.userdetails.User.builder()
                .username(entityUser.getUsername())
                .password(entityUser.getPassword()) // password should already be BCrypt hashed
                .roles(entityUser.getRole())        // roles like SUPERADMIN, ADMIN, MANAGER
                .build();
    }
}
