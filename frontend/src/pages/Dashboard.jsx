import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses } from '../roles';
import { useAuth } from '../useAuth';
import { compactAmount, formatAmount, formatDate, monthLabel } from '../format';
import { Avatar, EmptyState, Loading, PageHeader, StatusPill } from '../components/ui';

function StatCard({ icon, tone, label, value, hint, to }) {
  const body = (
    <div className="card stat-card h-100">
      <div className="card-body">
        <div className={`stat-icon bg-${tone}-subtle text-${tone}-emphasis`}><i aria-hidden="true" className={`bi bi-${icon}`} /></div>
        <div className="min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value text-truncate">{value}</div>
          {hint && <div className="stat-hint">{hint}</div>}
        </div>
      </div>
    </div>
  );
  return (
    <div className="col-6 col-xl-3">
      {to ? <Link to={to} className="text-reset text-decoration-none d-block h-100">{body}</Link> : body}
    </div>
  );
}

function MonthChart({ months }) {
  const max = Math.max(...months.map((m) => Number(m.total)), 1);
  return (
    <div className="month-chart" role="img"
         aria-label={months.map((m) => `${monthLabel(m.name)}: ${formatAmount(m.total)}`).join(', ')}>
      {months.map((m, i) => (
        <div key={m.name} className={`month-col${i === months.length - 1 ? ' current' : ''}`}
             title={`${monthLabel(m.name)}: ${formatAmount(m.total)} (${m.count})`}>
          <div className="month-bar" style={{ height: `${(Number(m.total) / max) * 100}%` }}>
            {Number(m.total) > 0 && <span className="tip">{compactAmount(m.total)}</span>}
          </div>
          <div className="month-label">{monthLabel(m.name)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/expenses/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load dashboard.')));
  }, []);

  const firstName = user.name.split(' ')[0];
  const header = (
    <PageHeader
      eyebrow="TechIntello Solutions"
      title={`Hello, ${firstName}`}
      subtitle="Here is where company spending stands."
      actions={canEditExpenses(user) && (
        <Link to="/expenses/new" className="btn btn-primary"><i aria-hidden="true" className="bi bi-plus-lg" />Add Expense</Link>
      )}
    />
  );

  if (error) return <>{header}<div className="alert alert-danger">{error}</div></>;
  if (!stats) return <>{header}<Loading /></>;

  const maxCategory = Math.max(...stats.byCategory.map((c) => Number(c.total)), 1);
  const lastMonth = stats.byMonth[stats.byMonth.length - 2];
  const change = lastMonth && Number(lastMonth.total) > 0
    ? ((Number(stats.thisMonthAmount) - Number(lastMonth.total)) / Number(lastMonth.total)) * 100
    : null;

  return (
    <>
      {header}

      <div className="row g-3 mb-4">
        <StatCard icon="cash-stack" tone="primary" label="Total spend" value={formatAmount(stats.totalAmount)}
                  hint={`${stats.count} expense${stats.count === 1 ? '' : 's'}`} />
        <StatCard icon="calendar3" tone="info" label="This month" value={formatAmount(stats.thisMonthAmount)}
                  hint={change === null ? 'No spend last month' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}% vs last month`} />
        <StatCard icon="hourglass-split" tone="warning" label="Pending review" value={stats.pendingCount}
                  hint="Click to review" to="/expenses?status=Pending%20Review" />
        <StatCard icon="tags" tone="success" label="Categories used" value={stats.byCategory.length}
                  hint={stats.byCategory[0] ? `Top: ${stats.byCategory[0].name}` : '—'} />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header">Monthly spend</div>
            <div className="card-body d-flex flex-column">
              <MonthChart months={stats.byMonth} />
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header">By category</div>
            <div className="card-body">
              {stats.byCategory.length === 0 && <EmptyState icon="pie-chart" title="No expenses yet" />}
              {stats.byCategory.map((c) => (
                <div key={c.name} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium">{c.name} <span className="text-secondary">· {c.count}</span></span>
                    <span className="fw-semibold">{formatAmount(c.total)}</span>
                  </div>
                  <div className="hbar"><span style={{ width: `${(Number(c.total) / maxCategory) * 100}%` }} /></div>
                </div>
              ))}
              {stats.byStatus.length > 0 && (
                <div className="d-flex flex-wrap gap-2 pt-2 border-top mt-3">
                  {stats.byStatus.map((s) => (
                    <Link key={s.name} to={`/expenses?status=${encodeURIComponent(s.name)}`} className="text-decoration-none mt-2">
                      <StatusPill status={`${s.name}`} /> <span className="small text-secondary">{s.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Recent expenses</span>
          <Link to="/expenses" className="small fw-medium text-decoration-none">View all <i aria-hidden="true" className="bi bi-arrow-right" /></Link>
        </div>
        {stats.recent.length === 0 ? (
          <EmptyState icon="receipt" title="No expenses yet">
            {canEditExpenses(user) ? <Link to="/expenses/new">Add the first one</Link> : 'Expenses will appear here once added.'}
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table table-clickable align-middle">
              <thead>
                <tr><th>Date</th><th>Category</th><th>Entered by</th><th>Status</th><th className="text-end">Amount</th></tr>
              </thead>
              <tbody>
                {stats.recent.map((e) => (
                  <tr key={e.id} onClick={() => navigate(`/expenses/${e.id}`)}>
                    <td className="text-nowrap">{formatDate(e.date)}</td>
                    <td>{e.category.name}</td>
                    <td>
                      <span className="d-inline-flex align-items-center gap-2">
                        <Avatar name={e.enteredBy.name} size={26} />{e.enteredBy.name}
                      </span>
                    </td>
                    <td><StatusPill status={e.status} /></td>
                    <td className="text-end fw-semibold text-nowrap">{formatAmount(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
