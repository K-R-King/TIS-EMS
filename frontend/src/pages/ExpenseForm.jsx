import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../useAuth';
import useDropdowns from '../useDropdowns';
import { Avatar, ConfirmDialog, Loading, PageHeader } from '../components/ui';
import { formatAmount, formatDate, today } from '../format';

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
  // Possible duplicates for the current date + amount + category, keyed so stale results are ignored
  const [duplicates, setDuplicates] = useState({ key: null, items: [] });
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);

  const duplicateKey = form.date && /^\d+(\.\d{1,2})?$/.test(form.amount) && Number(form.amount) > 0 && form.categoryId
    ? `${form.date}|${Number(form.amount)}|${form.categoryId}`
    : null;
  const possibleDuplicates = duplicates.key === duplicateKey ? duplicates.items : [];

  useEffect(() => {
    if (!duplicateKey) return undefined;
    const [date, amount, categoryId] = duplicateKey.split('|');
    const handle = setTimeout(() => {
      api.get('/expenses/duplicates', { params: { date, amount, categoryId, excludeId: id } })
        .then((res) => setDuplicates({ key: duplicateKey, items: res.data }))
        .catch(() => setDuplicates({ key: duplicateKey, items: [] }));
    }, 400);
    return () => clearTimeout(handle);
  }, [duplicateKey, id]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate(form, file);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (possibleDuplicates.length > 0) {
      setConfirmingDuplicate(true);
      return;
    }
    save();
  };

  const save = async () => {
    setConfirmingDuplicate(false);

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

  if (loading) return <Loading />;

  const field = (name) => `form-control${errors[name] ? ' is-invalid' : ''}`;
  const selectField = (name) => `form-select${errors[name] ? ' is-invalid' : ''}`;

  const fileLabel = file ? file.name : null;

  return (
    <div className="mx-auto" style={{ maxWidth: 860 }}>
      <PageHeader
        title={editing ? 'Edit expense' : 'Add expense'}
        subtitle={editing ? `Expense #${id}` : 'Fields marked * are required.'}
        back={editing ? { to: `/expenses/${id}`, label: 'Back to expense' } : { to: '/expenses', label: 'Expenses' }}
      />
      {listError && <div className="alert alert-warning">{listError}</div>}
      {serverError && (
        <div className="alert alert-danger d-flex gap-2 align-items-center"><i aria-hidden="true" className="bi bi-exclamation-circle" />{serverError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card mb-3">
          <div className="card-header">Expense details</div>
          <div className="card-body row g-3">
            <div className="col-md-6">
              <label htmlFor="date" className="form-label">Date <span className="text-danger">*</span></label>
              <input id="date" name="date" type="date" className={field('date')} value={form.date}
                     max={today()} onChange={handleChange} required />
              <div className="invalid-feedback">{errors.date}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="amount" className="form-label">Amount <span className="text-danger">*</span></label>
              <div className="input-group has-validation">
                <span className="input-group-text">₹</span>
                <input id="amount" name="amount" inputMode="decimal" className={field('amount')} value={form.amount}
                       placeholder="0.00" onChange={handleChange} required />
                <div className="invalid-feedback">{errors.amount}</div>
              </div>
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
              <label htmlFor="paymentModeId" className="form-label">Payment mode</label>
              <select id="paymentModeId" name="paymentModeId" className="form-select" value={form.paymentModeId}
                      onChange={handleChange}>
                <option value="">Not specified</option>
                {paymentModes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {possibleDuplicates.length > 0 && (
              <div className="col-12">
                <div className="alert alert-warning mb-0 small" role="status">
                  <div className="fw-semibold mb-1">
                    <i aria-hidden="true" className="bi bi-files me-2" />Possible duplicate: this date, amount and category already exist
                  </div>
                  <ul className="mb-0 ps-3">
                    {possibleDuplicates.slice(0, 3).map((d) => (
                      <li key={d.id}>
                        <a href={`/expenses/${d.id}`} target="_blank" rel="noreferrer">Expense #{d.id}</a>
                        {' '}· {formatDate(d.date)} · {formatAmount(d.amount)} · {d.category.name} · entered by {d.enteredBy.name}
                        {d.description && <> · “{d.description}”</>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="col-12">
              <label htmlFor="description" className="form-label">Description / comments</label>
              <textarea id="description" name="description" rows={3} className={field('description')}
                        value={form.description} onChange={handleChange} maxLength={1000}
                        placeholder="What was this expense for?" />
              <div className="d-flex justify-content-between">
                <div className="invalid-feedback d-block">{errors.description}</div>
                <div className="form-text">{form.description.length}/1000</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">Reimbursement &amp; tax</div>
          <div className="card-body row g-3">
            <div className="col-md-6">
              <label htmlFor="reimbursementTypeId" className="form-label">Reimbursement type</label>
              <select id="reimbursementTypeId" name="reimbursementTypeId" className="form-select"
                      value={form.reimbursementTypeId} onChange={handleChange}>
                <option value="">Not specified</option>
                {reimbursementTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" name="status" className="form-select" value={form.status} onChange={handleChange}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-12">
              <div className="form-check form-switch">
                <input id="taxApplicable" name="taxApplicable" type="checkbox" role="switch" className="form-check-input"
                       checked={form.taxApplicable} onChange={handleChange} />
                <label htmlFor="taxApplicable" className="form-check-label">Tax applicable (tax-deductible)</label>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">Receipt</div>
          <div className="card-body">
            {existing?.attachmentName && !removeAttachment && !file && (
              <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded bg-body-tertiary">
                <i aria-hidden="true" className="bi bi-file-earmark-check text-success fs-5" />
                <span className="text-truncate">{existing.attachmentName}</span>
                <button type="button" className="btn btn-sm btn-link text-danger ms-auto" onClick={() => setRemoveAttachment(true)}>
                  Remove
                </button>
              </div>
            )}
            {removeAttachment && !file && (
              <div className="alert alert-warning py-2 small d-flex align-items-center gap-2">
                The current receipt will be removed when you save.
                <button type="button" className="btn btn-link btn-sm p-0 ms-auto" onClick={() => setRemoveAttachment(false)}>Undo</button>
              </div>
            )}
            <label htmlFor="attachment" className={`d-block border border-2 rounded-3 text-center p-4 ${errors.attachment ? 'border-danger' : ''}`}
                   style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
              <i aria-hidden="true" className={`bi bi-${fileLabel ? 'file-earmark-check text-success' : 'cloud-arrow-up text-secondary'} fs-2 d-block mb-1`} />
              <span className="fw-medium">{fileLabel || (existing?.attachmentName ? 'Replace receipt' : 'Upload a receipt or invoice')}</span>
              <span className="d-block small text-secondary">PDF, JPG or PNG · up to 10 MB</span>
            </label>
            <input id="attachment" name="attachment" type="file" className="visually-hidden"
                   accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={handleFile} />
            {errors.attachment && <div className="text-danger small mt-2">{errors.attachment}</div>}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-3">
          <span className="d-inline-flex align-items-center gap-2 text-secondary small me-auto">
            Entered by <Avatar name={existing ? existing.enteredBy.name : user.name} size={22} />
            <strong className="text-body">{existing ? existing.enteredBy.name : user.name}</strong>
          </span>
          <Link to={editing ? `/expenses/${id}` : '/expenses'} className="btn btn-outline-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary px-4" disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</>
              : editing ? 'Save changes' : 'Submit expense'}
          </button>
        </div>
      </form>

      {confirmingDuplicate && (
        <ConfirmDialog title="Save a possible duplicate?" tone="warning" confirmLabel="Save anyway"
                       onConfirm={save} onCancel={() => setConfirmingDuplicate(false)}>
          {possibleDuplicates.length === 1 ? 'An expense' : `${possibleDuplicates.length} expenses`} with the same date,
          amount and category already exist{possibleDuplicates.length === 1 ? 's' : ''}. Save this one as well?
        </ConfirmDialog>
      )}
    </div>
  );
}
