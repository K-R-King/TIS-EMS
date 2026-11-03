import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { ROLE_LABELS, ROLES, useAuth } from '../auth';
import { Avatar, ConfirmDialog, Loading, PageHeader } from '../components/ui';

const ROLE_TONES = { [ROLES.SUPERADMIN]: 'primary', [ROLES.ADMIN]: 'info', [ROLES.MANAGER]: 'secondary' };

const EMPTY = { name: '', username: '', password: '', role: 'MANAGER' };

function UserForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial.id);
  const [form, setForm] = useState({ ...EMPTY, ...initial, password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editing && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (editing && form.password && form.password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const body = { name: form.name, username: form.username, password: form.password, role: form.role };
      const res = editing ? await api.put(`/users/${initial.id}`, body) : await api.post('/users', body);
      onSaved(res.data, editing);
    } catch (err) {
      setError(errorMessage(err, 'Could not save user.'));
      setSaving(false);
    }
  };

  return (
    <form className="card mb-3" onSubmit={handleSubmit}>
      <div className="card-header">{editing ? `Edit ${initial.username}` : 'Add user'}</div>
      <div className="card-body row g-3">
        <div className="col-md-6">
          <label htmlFor="u-name" className="form-label">Full name</label>
          <input id="u-name" name="name" className="form-control" value={form.name} onChange={handleChange} />
        </div>
        <div className="col-md-6">
          <label htmlFor="u-username" className="form-label">Username <span className="text-danger">*</span></label>
          <input id="u-username" name="username" className="form-control" value={form.username}
                 onChange={handleChange} required autoComplete="off" />
        </div>
        <div className="col-md-6">
          <label htmlFor="u-password" className="form-label">
            {editing ? 'New password (leave blank to keep current)' : <>Password <span className="text-danger">*</span></>}
          </label>
          <input id="u-password" name="password" type="password" className="form-control" value={form.password}
                 onChange={handleChange} autoComplete="new-password" minLength={8} required={!editing} />
          <div className="form-text">At least 8 characters.</div>
        </div>
        <div className="col-md-6">
          <label htmlFor="u-role" className="form-label">Role</label>
          <select id="u-role" name="role" className="form-select" value={form.role} onChange={handleChange}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {error && <div className="col-12"><div className="alert alert-danger py-2 mb-0">{error}</div></div>}
      </div>
      <div className="card-footer d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null); // null, {} for new, or a user
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load users.')));
  }, []);

  const startEdit = (u) => { setEditing(u); setNotice(''); setError(''); };

  const handleUnlock = async (u) => {
    setError('');
    try {
      const res = await api.post(`/users/${u.id}/unlock`);
      setUsers((list) => list.map((x) => (x.id === u.id ? res.data : x)));
      setNotice(`${u.username} can log in again.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not unlock user.'));
    }
  };

  const handleSaved = (saved, wasEdit) => {
    setUsers((list) => (wasEdit ? list.map((u) => (u.id === saved.id ? saved : u)) : [...list, saved])
      .sort((a, b) => a.username.localeCompare(b.username)));
    setEditing(null);
    setNotice(`${saved.username} ${wasEdit ? 'updated' : 'added'}.`);
  };

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/users/${deleting.id}`);
      setUsers((list) => list.filter((x) => x.id !== deleting.id));
      setNotice(`${deleting.username} deleted.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not delete user.'));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Add people and choose what they can do."
        actions={!editing && <button className="btn btn-primary" onClick={() => startEdit({})}><i className="bi bi-person-plus" />Add user</button>}
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success d-flex gap-2 align-items-center"><i className="bi bi-check-circle" />{notice}</div>}

      {editing && (
        <UserForm key={editing.id || 'new'} initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />
      )}

      <div className="card">
        {users === null && !error && <Loading />}
        {users && (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th /></tr></thead>
              <tbody>
                {users.map((u) => {
                  const tone = ROLE_TONES[u.role] || 'secondary';
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="d-inline-flex align-items-center gap-2 fw-medium">
                          <Avatar name={u.name} size={32} />{u.name}
                          {u.id === me.id && <span className="badge rounded-pill bg-body-tertiary text-secondary border">You</span>}
                          {u.locked && (
                            <span className="badge rounded-pill bg-danger-subtle text-danger-emphasis border border-danger-subtle"
                                  title="Locked after too many failed logins">
                              <i className="bi bi-lock-fill me-1" />Locked
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-secondary">{u.username}</td>
                      <td>
                        <span className={`badge rounded-pill bg-${tone}-subtle text-${tone}-emphasis border border-${tone}-subtle`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        {u.locked && (
                          <button className="btn btn-sm btn-outline-success me-2" onClick={() => handleUnlock(u)}>
                            <i className="bi bi-unlock" />Unlock
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary btn-icon me-2" onClick={() => startEdit(u)}
                                aria-label={`Edit ${u.username}`} title="Edit"><i className="bi bi-pencil" /></button>
                        <button className="btn btn-sm btn-outline-danger btn-icon" onClick={() => setDeleting(u)}
                                disabled={u.id === me.id} aria-label={`Delete ${u.username}`}
                                title={u.id === me.id ? 'You cannot delete your own account' : 'Delete'}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleting && (
        <ConfirmDialog title={`Delete ${deleting.username}?`} busy={busy} onConfirm={handleDelete} onCancel={() => setDeleting(null)}>
          They will no longer be able to log in. Users who have entered expenses or comments are kept for the audit trail.
        </ConfirmDialog>
      )}
    </>
  );
}
