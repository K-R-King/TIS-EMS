package TIS.EMS.models;

import java.util.Set;

/** Role names as stored in users.role; Spring Security sees them as ROLE_<name>. */
public final class Role {
    public static final String SUPERADMIN = "SUPERADMIN";
    public static final String ADMIN = "ADMIN"; // "Expense Admin" in the requirements
    public static final String MANAGER = "MANAGER";

    public static final Set<String> ALL = Set.of(SUPERADMIN, ADMIN, MANAGER);

    private Role() {}
}
