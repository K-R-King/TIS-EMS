import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { homeFor } from '../roles';
import { useAuth } from '../useAuth';
import useTheme from '../theme';

const FEATURES = [
  ['receipt', 'Every expense in one place, with receipts attached'],
  ['funnel', 'Filter by date, category, payment mode and status'],
  ['shield-check', 'Role-based access for admins and managers'],
];

export default function Login() {
  useTheme(); // apply the saved light/dark theme on this page too
  const { user, checking, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Return to the page the user originally asked for, otherwise their role's home page
  const from = location.state?.from;
  const target = (u) => (from && from.pathname !== '/login' ? from : homeFor(u));

  if (checking) return null;
  if (user) return <Navigate to={target(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(username.trim(), password);
      navigate(target(loggedIn), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Invalid username or password.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-brand">
        <div>
          <span className="logo-card"><img src="/brand/techintello-logo.png" alt="TechIntello Solutions" /></span>
        </div>
        <div>
          <span className="eyebrow mb-3">Expense Management</span>
          <h2 className="mb-4">Track, review and reimburse company expenses.</h2>
          <ul className="list-unstyled mb-0">
            {FEATURES.map(([icon, text]) => (
              <li key={icon}><i aria-hidden="true" className={`bi bi-${icon}`} /><span>{text}</span></li>
            ))}
          </ul>
        </div>
        <div className="small opacity-75">TechIntello Solutions · internal tool</div>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="d-lg-none mb-4">
            <span className="logo-card"><img src="/brand/techintello-logo.png" alt="TechIntello Solutions" /></span>
          </div>
          <h1 className="h3 fw-bold mb-1">Welcome back</h1>
          <p className="text-secondary mb-4">Sign in with your company account.</p>

          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <div className="input-group">
              <span className="input-group-text"><i aria-hidden="true" className="bi bi-person" /></span>
              <input id="username" className="form-control form-control-lg fs-6" value={username}
                     onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-group">
              <span className="input-group-text"><i aria-hidden="true" className="bi bi-lock" /></span>
              <input id="password" type={showPassword ? 'text' : 'password'} className="form-control form-control-lg fs-6"
                     value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" className="btn btn-outline-secondary btn-icon" onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                <i aria-hidden="true" className={`bi bi-eye${showPassword ? '-slash' : ''}`} />
              </button>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger py-2 d-flex gap-2 align-items-center" role="alert">
              <i aria-hidden="true" className="bi bi-exclamation-circle" />{error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-lg w-100 fs-6" disabled={submitting || !username || !password}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Signing in…</>
              : 'Sign in'}
          </button>
          <p className="text-secondary small text-center mt-4 mb-0">
            Forgot your password? Ask a Super Admin to reset it.
          </p>
        </form>
      </section>
    </div>
  );
}
