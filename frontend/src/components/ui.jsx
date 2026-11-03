import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  'Pending Review': 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Reimbursed: 'info',
};

export function StatusPill({ status }) {
  const tone = STATUS_STYLES[status] || 'secondary';
  return (
    <span className={`status-pill bg-${tone}-subtle text-${tone}-emphasis border-${tone}-subtle`}>{status}</span>
  );
}

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

export function Avatar({ name = '?', size = 32 }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
  const color = AVATAR_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: color }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="page-header">
      <div>
        {back && (
          <Link to={back.to} className="back-link"><i aria-hidden="true" className="bi bi-arrow-left" />{back.label}</Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="empty-state">
      <i aria-hidden="true" className={`bi bi-${icon}`} />
      <div className="title">{title}</div>
      {children && <div className="small mt-1">{children}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 text-secondary py-5">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** A Bootstrap-styled confirmation dialog, rendered without Bootstrap's JavaScript. */
export function ConfirmDialog({ title, children, confirmLabel = 'Delete', tone = 'danger', busy, onConfirm, onCancel }) {
  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="confirm-title"
           onKeyDown={(e) => e.key === 'Escape' && !busy && onCancel()}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body p-4">
              <div className="d-flex gap-3">
                <div className={`stat-icon bg-${tone}-subtle text-${tone}-emphasis`}><i aria-hidden="true" className="bi bi-exclamation-triangle" /></div>
                <div>
                  <h2 id="confirm-title" className="h5 mb-1">{title}</h2>
                  <div className="text-secondary">{children}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy} autoFocus>
                Cancel
              </button>
              <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
