import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';

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
      <div className="card-header bg-white fw-semibold">{editing ? `Edit ${initial.username}` : 'Add user'}</div>
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
      <div className="card-footer bg-white d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // null, {} for new, or a user
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load users.')));
  }, []);

  const handleSaved = (saved, wasEdit) => {
    setUsers((list) => (wasEdit ? list.map((u) => (u.id === saved.id ? saved : u)) : [...list, saved])
      .sort((a, b) => a.username.localeCompare(b.username)));
    setEditing(null);
    setNotice(`${saved.username} ${wasEdit ? 'updated' : 'added'}.`);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/users/${u.id}`);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      setNotice(`${u.username} deleted.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not delete user.'));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">User Management</h1>
        {!editing && <button className="btn btn-primary" onClick={() => { setEditing({}); setNotice(''); }}>+ Add user</button>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {editing && (
        <UserForm key={editing.id || 'new'} initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}{u.id === me.id && <span className="text-muted small"> (you)</span>}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => { setEditing(u); setNotice(''); setError(''); }}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u)}
                            disabled={u.id === me.id} title={u.id === me.id ? 'You cannot delete your own account' : ''}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
