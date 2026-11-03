import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth';
import { today } from '../format';
import useDropdowns from '../useDropdowns';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const EMPTY = {
  date: '',
  amount: '',
  categoryId: '',
  reimbursementTypeId: '',
  taxApplicable: false,
  paymentModeId: '',
  description: '',
  status: 'Pending Review',
};

function validate(form, file) {
  const errors = {};
  if (!form.date) errors.date = 'Date is required.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = 'Date must be in YYYY-MM-DD format.';
  else if (form.date > today()) errors.date = 'Date cannot be in the future.';

  if (!form.amount) errors.amount = 'Amount is required.';
  else if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) errors.amount = 'Enter a number with up to 2 decimal places.';
  else if (Number(form.amount) <= 0) errors.amount = 'Amount must be greater than zero.';

  if (!form.categoryId) errors.categoryId = 'Category is required.';
  if (form.description.length > 1000) errors.description = 'Description must be 1000 characters or fewer.';

  if (file) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) errors.attachment = 'Attachment must be a PDF, JPG or PNG file.';
    else if (file.size > MAX_FILE_BYTES) errors.attachment = 'Attachment must be 10 MB or smaller.';
  }
  return errors;
}

/** Add Expense screen, also used to edit an existing expense at /expenses/:id/edit. */
export default function ExpenseForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, paymentModes, reimbursementTypes, statuses, error: listError } = useDropdowns();

  const [form, setForm] = useState({ ...EMPTY, date: today() });
  const [file, setFile] = useState(null);
  const [existing, setExisting] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    api.get(`/expenses/${id}`)
      .then(({ data }) => {
        setExisting(data);
        setForm({
          date: data.date,
          amount: String(data.amount),
          categoryId: String(data.category.id),
          reimbursementTypeId: data.reimbursementType ? String(data.reimbursementType.id) : '',
          taxApplicable: data.taxApplicable,
          paymentModeId: data.paymentMode ? String(data.paymentMode.id) : '',
          description: data.description || '',
          status: data.status,
        });
      })
      .catch((err) => setServerError(errorMessage(err, 'Could not load expense.')))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let next = type === 'checkbox' ? checked : value;
    // Keep only digits and one decimal point in the amount
    if (name === 'amount') next = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    setForm((f) => ({ ...f, [name]: next }));
    setErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const handleFile = (e) => {
    const chosen = e.target.files[0] || null;
    setFile(chosen);
    setErrors((errs) => ({ ...errs, attachment: validate(form, chosen).attachment }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate(form, file);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (file) data.append('attachment', file);
    if (removeAttachment && !file) data.append('removeAttachment', 'true');

    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/expenses/${id}`, data)
        : await api.post('/expenses', data);
      navigate(`/expenses/${res.data.id}`, { state: { saved: editing ? 'updated' : 'created' } });
    } catch (err) {
      setServerError(errorMessage(err, 'Could not save expense.'));
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted">Loading…</div>;

  const field = (name) => `form-control${errors[name] ? ' is-invalid' : ''}`;
  const selectField = (name) => `form-select${errors[name] ? ' is-invalid' : ''}`;

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <h1 className="h3 mb-3">{editing ? 'Edit Expense' : 'Add Expense'}</h1>
        {listError && <div className="alert alert-warning">{listError}</div>}
        {serverError && <div className="alert alert-danger">{serverError}</div>}

        <form className="card" onSubmit={handleSubmit} noValidate>
          <div className="card-body row g-3">
            <div className="col-md-6">
              <label htmlFor="date" className="form-label">Date <span className="text-danger">*</span></label>
              <input id="date" name="date" type="date" className={field('date')} value={form.date}
                     max={today()} onChange={handleChange} required />
              <div className="invalid-feedback">{errors.date}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="amount" className="form-label">Amount (₹) <span className="text-danger">*</span></label>
              <input id="amount" name="amount" inputMode="decimal" className={field('amount')} value={form.amount}
                     placeholder="0.00" onChange={handleChange} required />
              <div className="invalid-feedback">{errors.amount}</div>
            </div>

            <div className="col-md-6">
              <label htmlFor="categoryId" className="form-label">Expense category <span className="text-danger">*</span></label>
              <select id="categoryId" name="categoryId" className={selectField('categoryId')} value={form.categoryId}
                      onChange={handleChange} required>
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="invalid-feedback">{errors.categoryId}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="reimbursementTypeId" className="form-label">Reimbursement type</label>
              <select id="reimbursementTypeId" name="reimbursementTypeId" className="form-select"
                      value={form.reimbursementTypeId} onChange={handleChange}>
                <option value="">Not specified</option>
                {reimbursementTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="col-md-6">
              <label htmlFor="paymentModeId" className="form-label">Payment mode</label>
              <select id="paymentModeId" name="paymentModeId" className="form-select" value={form.paymentModeId}
                      onChange={handleChange}>
                <option value="">Not specified</option>
                {paymentModes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" name="status" className="form-select" value={form.status} onChange={handleChange}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="col-12">
              <div className="form-check">
                <input id="taxApplicable" name="taxApplicable" type="checkbox" className="form-check-input"
                       checked={form.taxApplicable} onChange={handleChange} />
                <label htmlFor="taxApplicable" className="form-check-label">Tax applicable (tax-deductible)</label>
              </div>
            </div>

            <div className="col-12">
              <label htmlFor="description" className="form-label">Description / comments</label>
              <textarea id="description" name="description" rows={3} className={field('description')}
                        value={form.description} onChange={handleChange} maxLength={1000}
                        placeholder="Purpose or context of the expense" />
              <div className="form-text text-end">{form.description.length}/1000</div>
              <div className="invalid-feedback">{errors.description}</div>
            </div>

            <div className="col-12">
              <label htmlFor="attachment" className="form-label">Receipt / invoice (PDF, JPG or PNG, up to 10 MB)</label>
              {existing?.attachmentName && !removeAttachment && !file && (
                <div className="mb-2 small">
                  Current file: <strong>{existing.attachmentName}</strong>{' '}
                  <button type="button" className="btn btn-link btn-sm p-0 text-danger"
                          onClick={() => setRemoveAttachment(true)}>Remove</button>
                </div>
              )}
              {removeAttachment && !file && (
                <div className="mb-2 small text-danger">
                  The current file will be removed when you save.{' '}
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setRemoveAttachment(false)}>
                    Undo
                  </button>
                </div>
              )}
              <input id="attachment" name="attachment" type="file" className={field('attachment')}
                     accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={handleFile} />
              <div className="invalid-feedback">{errors.attachment}</div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Entered by</label>
              <input className="form-control" value={existing ? existing.enteredBy.name : user.name} disabled readOnly />
            </div>
          </div>
          <div className="card-footer bg-white d-flex justify-content-end gap-2">
            <Link to={editing ? `/expenses/${id}` : '/expenses'} className="btn btn-outline-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Submit expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
