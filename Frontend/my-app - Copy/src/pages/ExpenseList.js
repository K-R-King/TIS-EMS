import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses, useAuth } from '../auth';
import { formatAmount, formatDate, statusBadge } from '../format';
import useDropdowns from '../useDropdowns';

const FILTERS = ['from', 'to', 'categoryId', 'paymentModeId', 'reimbursementTypeId', 'status', 'q'];

export default function ExpenseList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, paymentModes, reimbursementTypes, statuses } = useDropdowns();
  // Filters live in the URL so a filtered list can be bookmarked or linked from the dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState('');

  const filters = Object.fromEntries(FILTERS.map((f) => [f, searchParams.get(f) || '']));
  const queryKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(new URLSearchParams(queryKey));
    api.get('/expenses', { params })
      .then((res) => { if (!cancelled) { setExpenses(res.data); setError(''); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Could not load expenses.')); });
    return () => { cancelled = true; };
  }, [queryKey]);

  const setFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value); else next.delete(name);
    setSearchParams(next, { replace: true });
  };

  // Apply the text search after the user pauses typing
  useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() !== (searchParams.get('q') || '')) setFilter('q', search.trim());
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setSearchParams({}, { replace: true });
  };

  const total = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  const hasFilters = FILTERS.some((f) => filters[f]);

  const select = (name, label, options, valueKey = 'id', labelKey = 'name') => (
    <div className="col-6 col-md-4 col-lg-2">
      <label className="form-label small text-muted mb-1" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} className="form-select form-select-sm" value={filters[name]}
              onChange={(e) => setFilter(name, e.target.value)}>
        <option value="">All</option>
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o[valueKey];
          return <option key={value} value={value}>{typeof o === 'string' ? o : o[labelKey]}</option>;
        })}
      </select>
    </div>
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">Expenses</h1>
        {canEditExpenses(user) && <Link to="/expenses/new" className="btn btn-primary">+ Add Expense</Link>}
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label small text-muted mb-1" htmlFor="f-q">Search</label>
              <input id="f-q" className="form-control form-control-sm" placeholder="Description or person"
                     value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1" htmlFor="f-from">From</label>
              <input id="f-from" type="date" className="form-control form-control-sm" value={filters.from}
                     max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} />
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <label className="form-label small text-muted mb-1" htmlFor="f-to">To</label>
              <input id="f-to" type="date" className="form-control form-control-sm" value={filters.to}
                     min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
            </div>
            {select('status', 'Status', statuses)}
            {select('categoryId', 'Category', categories)}
            {select('paymentModeId', 'Payment mode', paymentModes)}
            {select('reimbursementTypeId', 'Reimbursement type', reimbursementTypes)}
            <div className="col-auto">
              <button className="btn btn-link btn-sm" onClick={clearFilters} disabled={!hasFilters && !search}>
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover table-clickable mb-0 align-middle">
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Description</th><th>Entered by</th>
                <th>Payment mode</th><th>Reimbursement</th><th>Tax</th><th>Status</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses === null && !error && (
                <tr><td colSpan={9} className="text-muted">Loading…</td></tr>
              )}
              {expenses?.length === 0 && (
                <tr><td colSpan={9} className="text-muted">
                  {hasFilters ? 'No expenses match these filters.' : 'No expenses yet.'}
                </td></tr>
              )}
              {expenses?.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/expenses/${e.id}`)}>
                  <td className="text-nowrap">{formatDate(e.date)}</td>
                  <td>{e.category.name}</td>
                  <td className="text-truncate" style={{ maxWidth: 240 }} title={e.description || ''}>
                    {e.description || <span className="text-muted">—</span>}
                    {e.attachmentName && <span className="ms-1" title="Has receipt">📎</span>}
                  </td>
                  <td>{e.enteredBy.name}</td>
                  <td>{e.paymentMode?.name || '—'}</td>
                  <td>{e.reimbursementType?.name || '—'}</td>
                  <td>{e.taxApplicable ? 'Yes' : 'No'}</td>
                  <td><span className={statusBadge(e.status)}>{e.status}</span></td>
                  <td className="text-end text-nowrap">{formatAmount(e.amount)}</td>
                </tr>
              ))}
            </tbody>
            {expenses?.length > 0 && (
              <tfoot>
                <tr className="fw-semibold">
                  <td colSpan={8}>{expenses.length} expense{expenses.length === 1 ? '' : 's'}</td>
                  <td className="text-end text-nowrap">{formatAmount(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
