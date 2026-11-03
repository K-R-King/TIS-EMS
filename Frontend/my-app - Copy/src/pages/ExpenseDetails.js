import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses, useAuth } from '../auth';
import { formatAmount, formatDate, formatDateTime, statusBadge } from '../format';

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
  if (!url) return <div className="text-muted small">Loading receipt…</div>;

  return (
    <>
      {expense.attachmentContentType === 'application/pdf'
        ? <iframe src={url} title="Receipt" className="receipt-preview-pdf" />
        : <img src={url} alt={`Receipt: ${expense.attachmentName}`} className="receipt-preview" />}
      <div className="mt-2">
        <a href={url} download={expense.attachmentName} className="btn btn-outline-secondary btn-sm">
          Download {expense.attachmentName}
        </a>
      </div>
    </>
  );
}

function Comments({ expenseId }) {
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
      <div className="card-header bg-white fw-semibold">Review comments</div>
      <ul className="list-group list-group-flush">
        {comments.length === 0 && <li className="list-group-item text-muted">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="list-group-item">
            <div className="small text-muted">
              <strong className="text-body">{c.author.name}</strong> · {formatDateTime(c.createdAt)}
            </div>
            <div className="comment-text">{c.text}</div>
          </li>
        ))}
      </ul>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="comment" className="visually-hidden">Add a comment</label>
          <textarea id="comment" className="form-control mb-2" rows={2} maxLength={1000}
                    placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={posting || !text.trim()}>
            {posting ? 'Posting…' : 'Add comment'}
          </button>
        </form>
      </div>
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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setExpense(null);
    api.get(`/expenses/${id}`)
      .then((res) => setExpense(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load expense.')));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this expense and its receipt? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${id}`);
      navigate('/expenses', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not delete expense.'));
      setDeleting(false);
    }
  };

  if (error && !expense) return <div className="alert alert-danger">{error}</div>;
  if (!expense) return <div className="text-muted">Loading…</div>;

  const rows = [
    ['Date', formatDate(expense.date)],
    ['Amount', formatAmount(expense.amount)],
    ['Expense category', expense.category.name],
    ['Reimbursement type', expense.reimbursementType?.name || '—'],
    ['Tax applicable', expense.taxApplicable ? 'Yes' : 'No'],
    ['Payment mode', expense.paymentMode?.name || '—'],
    ['Description / comments', expense.description || '—'],
    ['Entered by', `${expense.enteredBy.name} (${expense.enteredBy.username})`],
    ['Status', <span className={statusBadge(expense.status)}>{expense.status}</span>],
    ['Created', formatDateTime(expense.createdAt)],
    ['Last updated', formatDateTime(expense.updatedAt)],
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <Link to="/expenses" className="small">← Back to expenses</Link>
          <h1 className="h3 mb-0">Expense #{expense.id}</h1>
        </div>
        {canEditExpenses(user) && (
          <div className="d-flex gap-2">
            <Link to={`/expenses/${id}/edit`} className="btn btn-outline-primary">Edit</Link>
            <button className="btn btn-outline-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {location.state?.saved && (
        <div className="alert alert-success">
          Expense {location.state.saved}.{location.state.saved === 'created' && ' It is now pending review.'}
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card mb-3">
            <div className="card-body">
              <dl className="row mb-0">
                {rows.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <dt className="col-sm-5 text-muted fw-normal">{label}</dt>
                    <dd className="col-sm-7 comment-text">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </div>
          <Comments expenseId={expense.id} />
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-white fw-semibold">Receipt</div>
            <div className="card-body">
              {expense.attachmentName
                ? <ReceiptPreview expense={expense} />
                : <p className="text-muted mb-0">No receipt was uploaded.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
