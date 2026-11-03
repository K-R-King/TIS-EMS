import React, { useState } from 'react';
import api, { errorMessage } from '../api';
import useDropdowns from '../useDropdowns';
import { ConfirmDialog, PageHeader } from '../components/ui';

/** One editable dropdown list (add, rename, delete). */
function ListEditor({ title, icon, type, items, onChange }) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

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

  const remove = async () => {
    await run(() => api.delete(`/settings/${type}/${deleting.id}`));
    setDeleting(null);
  };

  return (
    <div className="col-lg-4">
      <div className="card h-100">
        <div className="card-header d-flex align-items-center gap-2">
          <i aria-hidden="true" className={`bi bi-${icon}`} />{title}
          <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis ms-auto">{items.length}</span>
        </div>
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
                  <span className="text-nowrap list-item-actions">
                    <button className="btn btn-sm btn-link text-secondary btn-icon" aria-label={`Rename ${item.name}`} title="Rename"
                            onClick={() => { setEditId(item.id); setEditName(item.name); }}>
                      <i aria-hidden="true" className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-link text-danger btn-icon" aria-label={`Delete ${item.name}`} title="Delete"
                            onClick={() => setDeleting(item)}>
                      <i aria-hidden="true" className="bi bi-trash" />
                    </button>
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
            <button className="btn btn-sm btn-primary text-nowrap" disabled={!newName.trim()}><i aria-hidden="true" className="bi bi-plus-lg" />Add</button>
          </form>
        </div>
      </div>
      {deleting && (
        <ConfirmDialog title={`Delete "${deleting.name}"?`} onConfirm={remove} onCancel={() => setDeleting(null)}>
          It will no longer appear in the dropdown. Items already used by expenses cannot be deleted; rename them instead.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function Settings() {
  const { categories, paymentModes, reimbursementTypes, error, reload } = useDropdowns();

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage the dropdown lists used on the expense form." />
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <ListEditor title="Expense categories" icon="tags" type="categories" items={categories} onChange={reload} />
        <ListEditor title="Payment modes" icon="credit-card" type="payment-modes" items={paymentModes} onChange={reload} />
        <ListEditor title="Reimbursement types" icon="arrow-repeat" type="reimbursement-types" items={reimbursementTypes} onChange={reload} />
      </div>
    </>
  );
}
