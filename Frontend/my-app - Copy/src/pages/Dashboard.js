import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { canEditExpenses, useAuth } from '../auth';
import { formatAmount, formatDate, statusBadge } from '../format';

function StatCard({ label, value, hint }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card stat-card h-100">
        <div className="card-body">
          <div className="text-muted small">{label}</div>
          <div className="value">{value}</div>
          {hint && <div className="text-muted small">{hint}</div>}
        </div>
      </div>
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

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="text-muted">Loading…</div>;

  const maxCategory = Math.max(...stats.byCategory.map((c) => Number(c.total)), 1);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">Dashboard</h1>
        {canEditExpenses(user) && <Link to="/expenses/new" className="btn btn-primary">+ Add Expense</Link>}
      </div>

      <div className="row g-3 mb-4">
        <StatCard label="Total expenses" value={formatAmount(stats.totalAmount)} hint={`${stats.count} entries`} />
        <StatCard label="This month" value={formatAmount(stats.thisMonthAmount)} />
        <StatCard
          label="Pending review"
          value={<Link to="/expenses?status=Pending%20Review" className="text-reset">{stats.pendingCount}</Link>}
        />
        <StatCard label="Categories used" value={stats.byCategory.length} />
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Total by category</div>
            <div className="card-body">
              {stats.byCategory.length === 0 && <p className="text-muted mb-0">No expenses yet.</p>}
              {stats.byCategory.map((c) => (
                <div key={c.name} className="mb-3">
                  <div className="d-flex justify-content-between small">
                    <span>{c.name} <span className="text-muted">({c.count})</span></span>
                    <span className="fw-semibold">{formatAmount(c.total)}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }} role="presentation">
                    <div className="progress-bar" style={{ width: `${(Number(c.total) / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))}
              {stats.byStatus.length > 0 && (
                <>
                  <hr />
                  <div className="d-flex flex-wrap gap-2">
                    {stats.byStatus.map((s) => (
                      <Link key={s.name} to={`/expenses?status=${encodeURIComponent(s.name)}`} className="text-decoration-none">
                        <span className={statusBadge(s.name)}>{s.name}: {s.count}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold d-flex justify-content-between">
              <span>Recent expenses</span>
              <Link to="/expenses" className="small">View all</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-clickable mb-0 align-middle">
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Entered by</th><th>Status</th><th className="text-end">Amount</th></tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 && (
                    <tr><td colSpan={5} className="text-muted">No expenses yet.</td></tr>
                  )}
                  {stats.recent.map((e) => (
                    <tr key={e.id} onClick={() => navigate(`/expenses/${e.id}`)}>
                      <td>{formatDate(e.date)}</td>
                      <td>{e.category.name}</td>
                      <td>{e.enteredBy.name}</td>
                      <td><span className={statusBadge(e.status)}>{e.status}</span></td>
                      <td className="text-end">{formatAmount(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
