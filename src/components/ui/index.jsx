import { X, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react'

// ══════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ══════════════════════════════════════════════════════════════
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, danger }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: danger ? '#fef2f2' : '#fffbeb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertTriangle size={24} color={danger ? '#dc2626' : '#f59e0b'} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>إلغاء</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
            style={{ minWidth: 100 }}
          >
            {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STATUS BADGE
// ══════════════════════════════════════════════════════════════
const STATUS_MAP = {
  draft:          { label: 'مسودة',       cls: 'badge-draft' },
  pending:        { label: 'قيد الانتظار', cls: 'badge-pending' },
  confirmed:      { label: 'مؤكد',         cls: 'badge-approved' },
  approved:       { label: 'معتمد',        cls: 'badge-approved' },
  in_production:  { label: 'قيد الإنتاج',  cls: 'badge-progress' },
  ready:          { label: 'جاهز',         cls: 'badge-active' },
  shipped:        { label: 'تم الشحن',     cls: 'badge-progress' },
  delivered:      { label: 'تم التسليم',   cls: 'badge-completed' },
  paid:           { label: 'مدفوع',        cls: 'badge-paid' },
  partially_paid: { label: 'مدفوع جزئياً', cls: 'badge-pending' },
  overdue:        { label: 'متأخر',        cls: 'badge-overdue' },
  cancelled:      { label: 'ملغي',         cls: 'badge-cancelled' },
  planned:        { label: 'مخطط',         cls: 'badge-planned' },
  in_progress:    { label: 'جاري',         cls: 'badge-progress' },
  completed:      { label: 'مكتمل',        cls: 'badge-completed' },
  on_hold:        { label: 'موقوف',        cls: 'badge-pending' },
  active:         { label: 'نشط',          cls: 'badge-active' },
  inactive:       { label: 'غير نشط',      cls: 'badge-cancelled' },
}

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-draft' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

// ══════════════════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════════════════
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} className="empty-state-icon" />}
      <h3 className="empty-state-title">{title}</h3>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LOADING SKELETON
// ══════════════════════════════════════════════════════════════
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="erp-table">
        <thead>
          <tr>{Array(cols).fill(0).map((_, i) => (
            <th key={i}><div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} /></th>
          ))}</tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, r) => (
            <tr key={r}>{Array(cols).fill(0).map((_, c) => (
              <td key={c}><div className="skeleton" style={{ height: 14, width: c === 0 ? '40%' : '70%', borderRadius: 4 }} /></td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════
export function Pagination({ page, total, pageSize = 20, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', borderTop: '1px solid #e8eaed', fontSize: 13,
    }}>
      <span style={{ color: '#6b7280' }}>
        إجمالي {total} سجل
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronRight size={16} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page - 2 + i
          if (p < 1 || p > totalPages) return null
          return (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 32 }}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        })}
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FORM COMPONENTS
// ══════════════════════════════════════════════════════════════
export function FormField({ label, required, error, hint, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      {children}
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  )
}

export function Select({ options, placeholder, value, onChange, className = '', ...props }) {
  return (
    <select
      className={`form-input ${className}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ══════════════════════════════════════════════════════════════
// CURRENCY DISPLAY
// ══════════════════════════════════════════════════════════════
export function Amount({ value, currency = 'EGP', className = '' }) {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)

  return (
    <span className={`num ${className}`}>
      {formatted} <span style={{ fontSize: '0.85em', color: '#9ca3af' }}>{currency}</span>
    </span>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE HEADER
// ══════════════════════════════════════════════════════════════
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FILTERS BAR
// ══════════════════════════════════════════════════════════════
export function FiltersBar({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center',
      marginBottom: 16, flexWrap: 'wrap',
    }}>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SEARCH INPUT
// ══════════════════════════════════════════════════════════════
import { Search } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder = 'بحث...' }) {
  return (
    <div className="search-wrap" style={{ minWidth: 240 }}>
      <Search size={15} className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input search-input"
        style={{ height: 36 }}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STATS ROW (mini KPIs inside a page)
// ══════════════════════════════════════════════════════════════
export function StatsRow({ stats }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
      gap: 12,
      marginBottom: 20,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: s.bg || '#f8f9fb',
          borderRadius: 10,
          padding: '14px 16px',
          border: '1px solid #e8eaed',
        }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: s.color || '#1a1d23', fontFamily: 'Inter' }}>
            {s.value}
          </div>
          {s.sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}
