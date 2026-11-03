package TIS.EMS.models;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password; // BCrypt hash

    @Column(nullable = false)
    private String role; // see Role

    @Column(nullable = false)
    private int failedLogins;

    private Instant lockedUntil; // set after too many failed logins

    public User() {}

    public User(String name, String username, String password, String role) {
        this.name = name;
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getRole() { return role; }

    public int getFailedLogins() { return failedLogins; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setFailedLogins(int failedLogins) { this.failedLogins = failedLogins; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }

    public boolean isLocked() { return lockedUntil != null && lockedUntil.isAfter(Instant.now()); }

    /** Name to show in the UI; older accounts have no name set. */
    public String getDisplayName() { return (name == null || name.isBlank()) ? username : name; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setUsername(String username) { this.username = username; }
    public void setPassword(String password) { this.password = password; }
    public void setRole(String role) { this.role = role; }
}
