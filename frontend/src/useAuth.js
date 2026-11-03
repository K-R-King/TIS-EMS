import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/** The logged-in user ({ id, name, username, role } or null) plus login/logout, from AuthProvider. */
export function useAuth() {
  return useContext(AuthContext);
}
