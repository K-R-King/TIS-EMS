package TIS.EMS.dto;

import TIS.EMS.models.User;

public record UserResponse(Long id, String name, String username, String role, boolean locked) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getDisplayName(), u.getUsername(), u.getRole(), u.isLocked());
    }
}
