// LedgerPro Shared UI Primitives
import { useState } from 'react';

// ── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="module-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={'tab-btn' + (activeTab === t.id ? ' active' : '')}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ text }) {
  return (
    <div className="loading-spinner">
      <div>
        <div className="spinner" />
        {text && <p style={{ textAlign: 'center', marginTop: 12, color: '#7f8c8d' }}>{text}</p>}
      </div>
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner">
      <span>⚠ {message}</span>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyText, actions }) {
  if (loading) return <LoadingSpinner text="Loading..." />;
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="empty-state-cell">
              {emptyText || 'No records found.'}
            </td></tr>
          ) : data.map((row, i) => (
            <tr key={row._id || i}>
              {columns.map(c => (
                <td key={c.key}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] != null ? String(row[c.key]) : '—')}
                </td>
              ))}
              {actions && <td><div className="table-actions">{actions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel} footer={
      <>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm}>Delete</button>
      </>
    }>
      <p style={{ color: '#555', fontSize: 15 }}>{message || 'Are you sure you want to delete this record?'}</p>
    </Modal>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, error, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// ── formatCurrency ────────────────────────────────────────────────────────────
export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

// ── formatDate ────────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
