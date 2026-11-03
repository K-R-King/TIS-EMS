package TIS.EMS.dto;

import TIS.EMS.models.User;

/** A user account as seen by the user themselves or by a Super Admin. */
public record UserResponse(Long id, String name, String username, String role, boolean locked, boolean active) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getDisplayName(), u.getUsername(), u.getRole(), u.isLocked(), u.isActive());
    }
}
