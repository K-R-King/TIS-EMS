import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { canEditExpenses, ROLE_LABELS, ROLES, useAuth } from '../auth';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const link = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark">
      <div className="container">
        <NavLink className="navbar-brand fw-semibold" to="/">TIS Expenses</NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-label="Toggle navigation"
          onClick={() => document.getElementById('mainNav').classList.toggle('show')}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className={link} to="/" end>Dashboard</NavLink></li>
            <li className="nav-item"><NavLink className={link} to="/expenses" end>Expenses</NavLink></li>
            {canEditExpenses(user) && (
              <li className="nav-item"><NavLink className={link} to="/expenses/new">Add Expense</NavLink></li>
            )}
            {user.role === ROLES.SUPERADMIN && (
              <>
                <li className="nav-item"><NavLink className={link} to="/users">Users</NavLink></li>
                <li className="nav-item"><NavLink className={link} to="/settings">Settings</NavLink></li>
              </>
            )}
          </ul>
          <div className="d-flex align-items-center gap-3">
            <span className="navbar-text text-light">
              {user.name} <span className="badge text-bg-secondary ms-1">{ROLE_LABELS[user.role] || user.role}</span>
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
