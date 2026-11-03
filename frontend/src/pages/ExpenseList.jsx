import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses } from '../roles';
import { useAuth } from '../useAuth';
import { formatAmount, formatDate } from '../format';
import useDropdowns from '../useDropdowns';
import { Avatar, EmptyState, Loading, PageHeader, StatusPill } from '../components/ui';

const FILTERS = ['from', 'to', 'categoryId', 'paymentModeId', 'reimbursementTypeId', 'status', 'q'];
const PAGE_SIZE = 25;

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  // First, last, and up to two pages either side of the current one
  const shown = [...new Set([1, pages, ...[-2, -1, 0, 1, 2].map((d) => page + d)])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  return (
    <nav aria-label="Expense pages" className="d-flex justify-content-center mt-3">
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page - 1)} aria-label="Previous page"><i aria-hidden="true" className="bi bi-chevron-left" /></button>
        </li>
        {shown.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - shown[i - 1] > 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
            <li className={`page-item${p === page ? ' active' : ''}`}>
              <button className="page-link" onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
            </li>
          </React.Fragment>
        ))}
        <li className={`page-item${page === pages ? ' disabled' : ''}`}>
          <button className="page-link" onClick={() => onChange(page + 1)} aria-label="Next page"><i aria-hidden="true" className="bi bi-chevron-right" /></button>
        </li>
      </ul>
    </nav>
  );
}

export default function ExpenseList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, paymentModes, reimbursementTypes, statuses } = useDropdowns();
  // Filters live in the URL so a filtered list can be bookmarked or linked from the dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // The delayed search below must build on the filters as they are when it fires, not when typing started
  const latestParams = useRef(searchParams);
  useEffect(() => {
    latestParams.current = searchParams;
  }, [searchParams]);

  const filters = Object.fromEntries(FILTERS.map((f) => [f, searchParams.get(f) || '']));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const queryKey = searchParams.toString();
  const expenses = result?.items ?? null;

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(new URLSearchParams(queryKey));
    params.page = Math.max(1, Number(params.page) || 1) - 1; // the API counts pages from 0
    params.size = PAGE_SIZE;
    api.get('/expenses', { params })
      .then((res) => { if (!cancelled) { setResult(res.data); setError(''); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Could not load expenses.')); });
    return () => { cancelled = true; };
  }, [queryKey]);

  const setFilter = (name, value) => {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page'); // new filters start from the first page
    latestParams.current = next;
    setSearchParams(next, { replace: name !== 'page' });
  };

  const goToPage = (p) => {
    setFilter('page', p > 1 ? String(p) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Apply the text search after the user pauses typing
  useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() !== (latestParams.current.get('q') || '')) setFilter('q', search.trim());
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setSearchParams({}, { replace: true });
  };

  const pages = result ? Math.max(1, Math.ceil(result.total / result.size)) : 1;
  const activeFilters = FILTERS.filter((f) => filters[f]).length;

  const select = (name, label, options) => (
    <div className="col-6 col-md-4 col-xl">
      <label className="form-label" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} className="form-select form-select-sm" value={filters[name]}
              onChange={(e) => setFilter(name, e.target.value)}>
        <option value="">All</option>
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.id;
          return <option key={value} value={value}>{typeof o === 'string' ? o : o.name}</option>;
        })}
      </select>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={result ? `${result.total} expense${result.total === 1 ? '' : 's'} · ${formatAmount(result.totalAmount)}` : ' '}
        actions={canEditExpenses(user) && (
          <>
            <Link to="/expenses/import" className="btn btn-outline-secondary"><i aria-hidden="true" className="bi bi-file-earmark-spreadsheet" />Import from Excel</Link>
            <Link to="/expenses/new" className="btn btn-primary"><i aria-hidden="true" className="bi bi-plus-lg" />Add Expense</Link>
          </>
        )}
      />

      <div className="card mb-3 filter-bar">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-xl-3">
              <label className="form-label" htmlFor="f-q">Search</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i aria-hidden="true" className="bi bi-search" /></span>
                <input id="f-q" className="form-control" placeholder="Description or person"
                       value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl">
              <label className="form-label" htmlFor="f-from">From</label>
              <input id="f-from" type="date" className="form-control form-control-sm" value={filters.from}
                     max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} />
            </div>
            <div className="col-6 col-md-4 col-xl">
              <label className="form-label" htmlFor="f-to">To</label>
              <input id="f-to" type="date" className="form-control form-control-sm" value={filters.to}
                     min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
            </div>
            {select('status', 'Status', statuses)}
            {select('categoryId', 'Category', categories)}
            {select('paymentModeId', 'Payment mode', paymentModes)}
            {select('reimbursementTypeId', 'Reimbursement', reimbursementTypes)}
          </div>
          {(activeFilters > 0 || search) && (
            <div className="mt-3 small d-flex align-items-center gap-2">
              <span className="badge rounded-pill text-bg-primary">{activeFilters}</span>
              <span className="text-secondary">filter{activeFilters === 1 ? '' : 's'} applied</span>
              <button className="btn btn-link btn-sm p-0 ms-1" onClick={clearFilters}>Clear all</button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {expenses === null && !error && <Loading />}
        {expenses?.length === 0 && (
          activeFilters > 0
            ? <EmptyState icon="funnel" title="No expenses match these filters">
                <button className="btn btn-link btn-sm" onClick={clearFilters}>Clear filters</button>
              </EmptyState>
            : <EmptyState icon="receipt" title="No expenses yet">
                {canEditExpenses(user) ? <Link to="/expenses/new">Add the first expense</Link> : 'Expenses will appear here once added.'}
              </EmptyState>
        )}
        {expenses?.length > 0 && (
          <>
            {/* Table on larger screens */}
            <div className="table-responsive d-none d-md-block" tabIndex={0} role="region" aria-label="Expenses table">
              <table className="table table-clickable align-middle">
                <thead>
                  <tr>
                    <th>Date</th><th>Category</th><th>Description</th><th>Entered by</th>
                    <th className="d-none d-xxl-table-cell">Reimbursement</th><th>Status</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} onClick={() => navigate(`/expenses/${e.id}`)}>
                      <td className="text-nowrap">{formatDate(e.date)}</td>
                      <td className="text-nowrap">
                        <div>{e.category.name}</div>
                        <div className="small text-secondary">{e.paymentMode?.name || 'No payment mode'}</div>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 260 }} title={e.description || ''}>
                        {e.attachmentName && <i aria-hidden="true" className="bi bi-paperclip text-secondary me-1" title="Has receipt" />}
                        {e.description || <span className="text-secondary">—</span>}
                        {e.taxApplicable && (
                          <span className="badge rounded-pill bg-success-subtle text-success-emphasis ms-2" title="Tax applicable">Tax</span>
                        )}
                      </td>
                      <td className="text-nowrap">
                        <span className="d-inline-flex align-items-center gap-2">
                          <Avatar name={e.enteredBy.name} size={24} />{e.enteredBy.name}
                        </span>
                      </td>
                      <td className="d-none d-xxl-table-cell">{e.reimbursementType?.name || <span className="text-secondary">—</span>}</td>
                      <td><StatusPill status={e.status} /></td>
                      <td className="text-end fw-semibold text-nowrap">{formatAmount(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-semibold">
                    <td colSpan={5} className="text-secondary d-xxl-none">{pages > 1 ? `Total of all ${result.total}` : 'Total'}</td>
                    <td colSpan={6} className="text-secondary d-none d-xxl-table-cell">{pages > 1 ? `Total of all ${result.total}` : 'Total'}</td>
                    <td className="text-end text-nowrap">{formatAmount(result.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cards on phones */}
            <div className="d-md-none">
              {expenses.map((e) => (
                <Link key={e.id} to={`/expenses/${e.id}`} className="expense-card">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0">
                      <div className="fw-semibold">{e.category.name}</div>
                      <div className="small text-secondary text-truncate">{e.description || 'No description'}</div>
                    </div>
                    <div className="fw-semibold text-nowrap">{formatAmount(e.amount)}</div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2 small text-secondary">
                    <span>{formatDate(e.date)} · {e.enteredBy.name}</span>
                    <StatusPill status={e.status} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      {result && (
        <>
          <Pagination page={page} pages={pages} onChange={goToPage} />
          {pages > 1 && (
            <p className="text-center text-secondary small mt-2 mb-0">
              Showing {(page - 1) * result.size + 1}–{Math.min(page * result.size, result.total)} of {result.total}
            </p>
          )}
        </>
      )}
    </>
  );
}
