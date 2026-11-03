package TIS.EMS.dto;

import TIS.EMS.models.User;

/** Who entered, commented on or changed an expense; no account details. */
public record PersonResponse(Long id, String name, String username) {
    public static PersonResponse from(User u) {
        return new PersonResponse(u.getId(), u.getDisplayName(), u.getUsername());
    }
}
