import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { homeFor, useAuth } from '../auth';

export default function Login() {
  const { user, checking, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.status === 401 ? 'Invalid username or password.' : errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: 380 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1 text-center">TIS Expense Management</h1>
          <p className="text-muted text-center mb-4">Sign in to continue</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={submitting || !username || !password}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
