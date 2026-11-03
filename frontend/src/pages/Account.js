import React, { useState } from 'react';
import api, { errorMessage } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';
import { Avatar, PageHeader } from '../components/ui';

export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setDone(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirm) return setError('The new passwords do not match.');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not change password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <PageHeader title="Account" />
      <div className="card mb-3">
        <div className="card-body d-flex align-items-center gap-3">
          <Avatar name={user.name} size={52} />
          <div>
            <div className="fw-semibold fs-5">{user.name}</div>
            <div className="text-secondary">{user.username} · {ROLE_LABELS[user.role] || user.role}</div>
          </div>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-header">Change password</div>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" className="form-control"
                   value={form.currentPassword} onChange={handleChange} autoComplete="current-password" required />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="newPassword" className="form-label">New password</label>
              <input id="newPassword" name="newPassword" type="password" className="form-control"
                     value={form.newPassword} onChange={handleChange} autoComplete="new-password" minLength={8} required />
              <div className="form-text">At least 8 characters.</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="confirm" className="form-label">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" className="form-control"
                     value={form.confirm} onChange={handleChange} autoComplete="new-password" required />
            </div>
          </div>
          {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
          {done && (
            <div className="alert alert-success py-2 mt-3 mb-0 d-flex gap-2 align-items-center">
              <i className="bi bi-check-circle" />Password changed.
            </div>
          )}
        </div>
        <div className="card-footer d-flex justify-content-end">
          <button className="btn btn-primary" disabled={saving || !form.currentPassword || !form.newPassword || !form.confirm}>
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
