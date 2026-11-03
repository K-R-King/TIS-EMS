import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses } from '../roles';
import { useAuth } from '../useAuth';
import { formatAmount, formatDate, formatDateTime } from '../format';
import { Avatar, ConfirmDialog, EmptyState, Loading, PageHeader, StatusPill } from '../components/ui';

/** Fetches the receipt with the session cookie and shows it inline. */
function ReceiptPreview({ expense }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl;
    api.get(`/expenses/${expense.id}/attachment`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => setError('Could not load the receipt.'));
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [expense.id]);

  if (error) return <div className="text-danger small">{error}</div>;
  if (!url) return <Loading label="Loading receipt…" />;

  return (
    <>
      {expense.attachmentContentType === 'application/pdf'
        ? <iframe src={url} title="Receipt" className="receipt-preview-pdf" />
        : <img src={url} alt={`Receipt: ${expense.attachmentName}`} className="receipt-preview" />}
      <div className="d-flex align-items-center gap-2 mt-3 small">
        <i aria-hidden="true" className="bi bi-file-earmark text-secondary" />
        <span className="text-truncate">{expense.attachmentName}</span>
        <a href={url} download={expense.attachmentName} className="btn btn-sm btn-outline-secondary ms-auto">
          <i aria-hidden="true" className="bi bi-download" />Download
        </a>
      </div>
    </>
  );
}

function Comments({ expenseId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.get(`/expenses/${expenseId}/comments`)
      .then((res) => setComments(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load comments.')));
  }, [expenseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError('');
    try {
      const res = await api.post(`/expenses/${expenseId}/comments`, { text });
      setComments((c) => [...c, res.data]);
      setText('');
    } catch (err) {
      setError(errorMessage(err, 'Could not add comment.'));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center gap-2">
        <i aria-hidden="true" className="bi bi-chat-left-text" />Review comments
        {comments.length > 0 && <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">{comments.length}</span>}
      </div>
      <div className="card-body">
        {comments.length === 0 && <p className="text-secondary small mb-3">No comments yet. Managers and admins can leave notes here.</p>}
        <div className="d-flex flex-column gap-3 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author.name} size={32} />
              <div className="min-w-0 flex-grow-1">
                <div className="small">
                  <strong>{c.author.name}</strong>
                  <span className="text-secondary"> · {formatDateTime(c.createdAt)}</span>
                </div>
                <div className="comment-text">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <form onSubmit={handleSubmit} className="comment">
          <Avatar name={user.name} size={32} />
          <div className="flex-grow-1">
            <label htmlFor="comment" className="visually-hidden">Add a comment</label>
            <textarea id="comment" className="form-control mb-2" rows={2} maxLength={1000}
                      placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={posting || !text.trim()}>
              {posting ? 'Posting…' : 'Add comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ACTION_LABELS = { CREATED: 'created this expense', UPDATED: 'updated', IMPORTED: 'imported this expense from Excel' };
const ACTION_ICONS = { CREATED: 'plus-circle', UPDATED: 'pencil', IMPORTED: 'file-earmark-spreadsheet' };

/** Who created and changed the expense, newest first. */
function Activity({ expenseId, refreshKey }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.get(`/expenses/${expenseId}/history`)
      .then((res) => setEntries(res.data))
      .catch(() => setEntries([]));
  }, [expenseId, refreshKey]);

  if (!entries || entries.length === 0) return null;
  return (
    <div className="card">
      <div className="card-header d-flex align-items-center gap-2"><i aria-hidden="true" className="bi bi-clock-history" />Activity</div>
      <ul className="list-group list-group-flush">
        {entries.map((h) => (
          <li key={h.id} className="list-group-item d-flex gap-3 py-3">
            <span className="stat-icon bg-body-tertiary text-secondary" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
              <i aria-hidden="true" className={`bi bi-${ACTION_ICONS[h.action] || 'dot'}`} />
            </span>
            <div className="min-w-0 small">
              <div><strong>{h.user.name}</strong> {ACTION_LABELS[h.action] || h.action.toLowerCase()}</div>
              {h.details && (
                <ul className="list-unstyled mb-1 mt-1 text-secondary">
                  {h.details.split('; ').map((change) => <li key={change} className="text-break">{change}</li>)}
                </ul>
              )}
              <div className="text-secondary">{formatDateTime(h.createdAt)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExpenseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/expenses/${id}`)
      .then((res) => setExpense(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load expense.')));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/expenses/${id}`);
      navigate('/expenses', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not delete expense.'));
      setDeleting(false);
      setConfirming(false);
    }
  };

  const back = { to: '/expenses', label: 'Expenses' };
  if (error && !expense) return <><PageHeader title="Expense" back={back} /><div className="alert alert-danger">{error}</div></>;
  if (!expense || expense.id !== Number(id)) return <Loading />;

  const rows = [
    ['Date', formatDate(expense.date)],
    ['Category', expense.category.name],
    ['Payment mode', expense.paymentMode?.name || '—'],
    ['Reimbursement type', expense.reimbursementType?.name || '—'],
    ['Tax applicable', expense.taxApplicable ? 'Yes' : 'No'],
    ['Description', expense.description || '—'],
  ];

  return (
    <>
      <PageHeader
        title={`Expense #${expense.id}`}
        back={back}
        actions={canEditExpenses(user) && (
          <>
            <Link to={`/expenses/${id}/edit`} className="btn btn-outline-primary"><i aria-hidden="true" className="bi bi-pencil" />Edit</Link>
            <button className="btn btn-outline-danger" onClick={() => setConfirming(true)}><i aria-hidden="true" className="bi bi-trash" />Delete</button>
          </>
        )}
      />

      {location.state?.saved && (
        <div className="alert alert-success d-flex gap-2 align-items-center">
          <i aria-hidden="true" className="bi bi-check-circle" />
          Expense {location.state.saved}.{location.state.saved === 'created' && ' It is now pending review.'}
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-6 d-flex flex-column gap-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                <div className="amount-hero">{formatAmount(expense.amount)}</div>
                <StatusPill status={expense.status} />
              </div>
              <div className="d-flex align-items-center gap-2 text-secondary small mb-4">
                <Avatar name={expense.enteredBy.name} size={22} />
                Entered by <strong className="text-body">{expense.enteredBy.name}</strong> · {formatDateTime(expense.createdAt)}
              </div>
              <dl className="detail-list">
                {rows.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
              {expense.updatedAt !== expense.createdAt && (
                <div className="text-secondary small mt-4">Last updated {formatDateTime(expense.updatedAt)}</div>
              )}
            </div>
          </div>
          <Comments expenseId={expense.id} />
        </div>
        <div className="col-lg-6 d-flex flex-column gap-3">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2"><i aria-hidden="true" className="bi bi-paperclip" />Receipt</div>
            <div className="card-body">
              {expense.attachmentName
                ? <ReceiptPreview expense={expense} />
                : <EmptyState icon="file-earmark-x" title="No receipt uploaded" />}
            </div>
          </div>
          <Activity expenseId={expense.id} refreshKey={expense.updatedAt} />
        </div>
      </div>

      {confirming && (
        <ConfirmDialog title="Delete this expense?" busy={deleting} onConfirm={handleDelete} onCancel={() => setConfirming(false)}>
          Expense #{expense.id} ({formatAmount(expense.amount)}), its receipt and comments will be permanently deleted.
        </ConfirmDialog>
      )}
    </>
  );
}
