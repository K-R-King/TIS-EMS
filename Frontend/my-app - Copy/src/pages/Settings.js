import React, { useState } from 'react';
import api, { errorMessage } from '../api';
import useDropdowns from '../useDropdowns';

/** One editable dropdown list (add, rename, delete). */
function ListEditor({ title, type, items, onChange }) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const run = async (action) => {
    setError('');
    try {
      await action();
      await onChange();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (await run(() => api.post(`/settings/${type}`, { name: newName }))) setNewName('');
  };

  const rename = async (e) => {
    e.preventDefault();
    if (await run(() => api.put(`/settings/${type}/${editId}`, { name: editName }))) setEditId(null);
  };

  const remove = (item) => {
    if (window.confirm(`Delete "${item.name}"?`)) run(() => api.delete(`/settings/${type}/${item.id}`));
  };

  return (
    <div className="col-lg-4">
      <div className="card h-100">
        <div className="card-header bg-white fw-semibold">{title}</div>
        <ul className="list-group list-group-flush">
          {items.map((item) => (
            <li key={item.id} className="list-group-item">
              {editId === item.id ? (
                <form className="d-flex gap-2" onSubmit={rename}>
                  <input className="form-control form-control-sm" value={editName} aria-label={`Rename ${item.name}`}
                         onChange={(e) => setEditName(e.target.value)} autoFocus maxLength={100} />
                  <button className="btn btn-sm btn-primary">Save</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="d-flex justify-content-between align-items-center">
                  <span>{item.name}</span>
                  <span className="text-nowrap">
                    <button className="btn btn-sm btn-link" onClick={() => { setEditId(item.id); setEditName(item.name); }}>
                      Rename
                    </button>
                    <button className="btn btn-sm btn-link text-danger" onClick={() => remove(item)}>Delete</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <form className="d-flex gap-2" onSubmit={add}>
            <input className="form-control form-control-sm" placeholder="New item" value={newName}
                   aria-label={`New ${title}`} onChange={(e) => setNewName(e.target.value)} maxLength={100} />
            <button className="btn btn-sm btn-primary" disabled={!newName.trim()}>Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { categories, paymentModes, reimbursementTypes, error, reload } = useDropdowns();

  return (
    <>
      <h1 className="h3 mb-1">Settings</h1>
      <p className="text-muted">Manage the dropdown lists used on the expense form. Items used by existing expenses can be renamed but not deleted.</p>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <ListEditor title="Expense categories" type="categories" items={categories} onChange={reload} />
        <ListEditor title="Payment modes" type="payment-modes" items={paymentModes} onChange={reload} />
        <ListEditor title="Reimbursement types" type="reimbursement-types" items={reimbursementTypes} onChange={reload} />
      </div>
    </>
  );
}
