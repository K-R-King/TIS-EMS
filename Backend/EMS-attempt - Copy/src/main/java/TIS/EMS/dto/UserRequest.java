package TIS.EMS.dto;

/** Create/update payload for /api/users. On update a blank password keeps the current one. */
public record UserRequest(String name, String username, String password, String role) {}
