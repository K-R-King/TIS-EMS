export const ROLES = { SUPERADMIN: 'SUPERADMIN', ADMIN: 'ADMIN', MANAGER: 'MANAGER' };

export const ROLE_LABELS = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Expense Admin',
  MANAGER: 'Manager',
};

export const canEditExpenses = (user) => user?.role === ROLES.SUPERADMIN || user?.role === ROLES.ADMIN;

/** Where each role lands after logging in. */
export function homeFor(user) {
  return user?.role === ROLES.MANAGER ? '/expenses' : '/';
}
