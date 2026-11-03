const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const formatAmount = (value) => currency.format(Number(value || 0));

export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const formatDateTime = (instant) =>
  instant ? new Date(instant).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const STATUS_STYLES = {
  'Pending Review': 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Reimbursed: 'info',
};

export const statusBadge = (status) => `badge text-bg-${STATUS_STYLES[status] || 'secondary'}`;

/** Today's date as YYYY-MM-DD in the user's time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
