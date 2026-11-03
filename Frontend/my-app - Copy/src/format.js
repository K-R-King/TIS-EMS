const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const formatAmount = (value) => currency.format(Number(value || 0));

export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const formatDateTime = (instant) =>
  instant ? new Date(instant).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/** Today's date as YYYY-MM-DD in the user's time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short' });

/** "2026-06" -> "Jun" */
export function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return MONTH.format(new Date(y, m - 1, 1));
}

/** Short amount for chart labels: ₹1.2L, ₹45K */
export function compactAmount(value) {
  const n = Number(value || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return `₹${Math.round(n)}`;
}
