import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { canEditExpenses, ROLE_LABELS, ROLES, useAuth } from '../auth';
import useTheme from '../theme';
import { Avatar } from './ui';

function Brand() {
  return (
    <Link to="/" className="sidebar-brand">
      <span className="brand-mark"><i className="bi bi-wallet2" /></span>
      TIS Expenses
    </Link>
  );
}

function SideLink({ to, icon, end, children }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
      <i className={`bi bi-${icon}`} />
      {children}
    </NavLink>
  );
}

/** Sidebar + content layout for every page behind the login. */
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile menu after navigating
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <Brand />
        <nav className="d-flex flex-column gap-1">
          <SideLink to="/" icon="grid-1x2" end>Dashboard</SideLink>
          <SideLink to="/expenses" icon="receipt" end>Expenses</SideLink>
          {canEditExpenses(user) && <SideLink to="/expenses/new" icon="plus-circle">Add Expense</SideLink>}
          {user.role === ROLES.SUPERADMIN && (
            <>
              <div className="sidebar-section">Administration</div>
              <SideLink to="/users" icon="people">Users</SideLink>
              <SideLink to="/settings" icon="sliders">Settings</SideLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <Link to="/account" className="sidebar-user text-decoration-none" title="Account settings">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0">
              <div className="name text-truncate">{user.name}</div>
              <div className="role">{ROLE_LABELS[user.role] || user.role}</div>
            </div>
            <i className="bi bi-gear ms-auto text-secondary" />
          </Link>
          <div className="sidebar-actions">
            <button className="btn btn-outline-light btn-sm btn-icon" onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <i className={`bi bi-${theme === 'dark' ? 'sun' : 'moon-stars'}`} />
            </button>
            <button className="btn btn-outline-light btn-sm flex-grow-1" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" />Log out
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop d-lg-none" onClick={() => setOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <Brand />
          <button className="btn btn-link" onClick={() => setOpen(true)} aria-label="Open menu">
            <i className="bi bi-list" />
          </button>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
