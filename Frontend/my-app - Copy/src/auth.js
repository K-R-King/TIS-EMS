import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { setUnauthorizedHandler } from './api';

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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // After an explicit logout the next person to log in should not land on the previous user's page
  const [loggedOut, setLoggedOut] = useState(false);

  // Restore an existing session (e.g. after a page refresh)
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', null, { auth: { username, password } });
    setUser(res.data);
    setLoggedOut(false);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setLoggedOut(true);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, checking, loggedOut, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Renders children only for logged-in users, optionally limited to some roles. */
export function RequireAuth({ roles, children }) {
  const { user, checking, loggedOut } = useAuth();
  const location = useLocation();

  if (checking) {
    return <div className="text-center text-muted py-5">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={loggedOut ? null : { from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">You do not have access to this page.</div>
      </div>
    );
  }
  return children;
}
