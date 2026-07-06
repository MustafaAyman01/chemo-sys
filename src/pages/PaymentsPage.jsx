import { useState } from 'react'
import { Receipt, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Plus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useEnrichedPayments, useCreatePayment, useOpenSalesInvoices, useOpenPurchaseInvoices } from '../hooks/useFinance'
import {
  PageHeader, FiltersBar, EmptyState, TableSkeleton, StatsRow, Modal, FormField,
} from '../components/ui'

const TYPE_LABELS = {
  sales_invoice:    { label: 'تحصيل من عميل', color: '#16a34a', icon: ArrowDownCircle, direction: 'in' },
  purchase_invoice: { label: 'دفع لمورد',      color: '#dc2626', icon: ArrowUpCircle,   direction: 'out' },
  expense:          { label: 'دفع مصروف',      color: '#f59e0b', icon: ArrowUpCircle,   direction: 'out' },
}

const METHOD_LABELS = {
  bank_transfer: 'تحويل بنكي',
  check:         'شيك',
  cash:          'نقدي',
  credit:        'آجل',
  lc:            'اعتماد مستندي',
}

// ── Record Payment Form ──────────────────────────────────────
function RecordPaymentForm({ onSubmit, loading }) {
  const [direction, setDirection] = useState('in')   // 'in' = من عميل، 'out' = لمورد
  const [linkMode, setLinkMode]   = useState('linked') // 'linked' or 'standalone'
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount]       = useState('')
  const [method, setMethod]       = useState('bank_transfer')
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]         = useState('')
  const [partyName, setPartyName] = useState('') // for standalone only

  const { data: openSales = [] }    = useOpenSalesInvoices()
  const { data: openPurchases = [] } = useOpenPurchaseInvoices()

  const referenceType = direction === 'in' ? 'sales_invoice' : 'purchase_invoice'
  const invoiceList    = direction === 'in' ? openSales : openPurchases
  const selectedInvoice = invoiceList.find(i => i.id === invoiceId)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      reference_type: referenceType,
      reference_id:   linkMode === 'linked' ? invoiceId : null,
      amount:         +amount,
      payment_method: method,
      payment_date:   date,
      notes:          linkMode === 'standalone' ? `${partyName ? `[${partyName}] ` : ''}${notes}` : notes,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Direction */}
      <FormField label="نوع الحركة" required>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button"
            onClick={() => { setDirection('in'); setInvoiceId('') }}
            className={`btn ${direction === 'in' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}>
            <ArrowDownCircle size={14} /> تحصيل من عميل
          </button>
          <button type="button"
            onClick={() => { setDirection('out'); setInvoiceId('') }}
            className={`btn ${direction === 'out' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}>
            <ArrowUpCircle size={14} /> دفع لمورد
          </button>
        </div>
      </FormField>

      <div style={{ height: 16 }} />

      {/* Link mode */}
      <FormField label="ربط بفاتورة؟">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button"
            onClick={() => setLinkMode('linked')}
            className={`btn btn-sm ${linkMode === 'linked' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}>
            ربط بفاتورة موجودة
          </button>
          <button type="button"
            onClick={() => setLinkMode('standalone')}
            className={`btn btn-sm ${linkMode === 'standalone' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}>
            دفعة مستقلة (مقدمة/عربون)
          </button>
        </div>
      </FormField>

      <div style={{ height: 16 }} />

      {linkMode === 'linked' ? (
        <FormField label={direction === 'in' ? 'الفاتورة (عميل)' : 'الفاتورة (مورد)'} required>
          <select className="form-input" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required>
            <option value="">اختر الفاتورة</option>
            {invoiceList.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {direction === 'in' ? inv.customer?.name : inv.supplier?.name} (متبقي {(+inv.remaining_amount).toLocaleString()})
              </option>
            ))}
          </select>
          {invoiceList.length === 0 && (
            <span className="form-hint">لا يوجد فواتير مفتوحة حالياً</span>
          )}
        </FormField>
      ) : (
        <FormField label={direction === 'in' ? 'اسم العميل' : 'اسم المورد'} hint="اختياري — للتوضيح فقط">
          <input className="form-input" value={partyName} onChange={e => setPartyName(e.target.value)}
            placeholder={direction === 'in' ? 'اسم الشركة العميلة' : 'اسم المورد'} />
        </FormField>
      )}

      <div style={{ height: 16 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="المبلغ (EGP)" required>
          <input type="number" step="0.01" className="form-input ltr" value={amount}
            onChange={e => setAmount(e.target.value)} dir="ltr" required
            max={linkMode === 'linked' && selectedInvoice ? selectedInvoice.remaining_amount : undefined} />
          {linkMode === 'linked' && selectedInvoice && (
            <span className="form-hint">المتبقي على الفاتورة: {(+selectedInvoice.remaining_amount).toLocaleString()} EGP</span>
          )}
        </FormField>

        <FormField label="تاريخ الدفع" required>
          <input type="date" className="form-input ltr" value={date} onChange={e => setDate(e.target.value)} required />
        </FormField>
      </div>

      <div style={{ height: 16 }} />

      <FormField label="طريقة الدفع">
        <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="bank_transfer">تحويل بنكي</option>
          <option value="check">شيك</option>
          <option value="cash">نقدي</option>
          <option value="lc">اعتماد مستندي (LC)</option>
        </select>
      </FormField>

      <div style={{ height: 16 }} />

      <FormField label="ملاحظات">
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </FormField>

      <div style={{ height: 24 }} />

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
        disabled={loading || !amount || (linkMode === 'linked' && !invoiceId)}>
        {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تسجيل الدفعة'}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PaymentsPage() {
  const [filterType, setFilterType] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [recordOpen, setRecordOpen] = useState(false)

  const filters = { reference_type: filterType || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }
  const { data: payments = [], isLoading } = useEnrichedPayments(filters)
  const createMutation = useCreatePayment()

  const handleRecord = async (data) => {
    await createMutation.mutateAsync(data)
    setRecordOpen(false)
  }

  const inflow  = payments.filter(p => p.reference_type === 'sales_invoice').reduce((s, p) => s + (+p.amount || 0), 0)
  const outflow = payments
    .filter(p => p.reference_type === 'purchase_invoice' || p.reference_type === 'expense')
    .reduce((s, p) => s + (+p.amount || 0), 0)
  const net = inflow - outflow

  const stats = [
    { label: 'إجمالي الحركات',  value: payments.length, color: '#3d62f3' },
    { label: 'تحصيلات (وارد)',  value: inflow.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#16a34a' },
    { label: 'مدفوعات (صادر)',  value: outflow.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#dc2626' },
    { label: 'صافي التدفق',     value: net.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: net >= 0 ? '#16a34a' : '#dc2626' },
  ]

  return (
    <div>
      <PageHeader
        title="المدفوعات"
        subtitle="سجل موحّد لكل حركات الدفع — تحصيل من العملاء، دفع للموردين، ودفع المصاريف"
        actions={
          <button className="btn btn-primary" onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> تسجيل دفعة
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">كل أنواع الحركات</option>
          <option value="sales_invoice">تحصيل من عميل</option>
          <option value="purchase_invoice">دفع لمورد</option>
          <option value="expense">دفع مصروف</option>
        </select>
        <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : payments.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title="لا يوجد حركات دفع بعد"
            subtitle="سجّل أول دفعة، أو هتظهر هنا تلقائياً الدفعات اللي بتسجلها على الفواتير"
            action={<button className="btn btn-primary" onClick={() => setRecordOpen(true)}><Plus size={15} /> تسجيل دفعة</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>التاريخ</th><th>النوع</th><th>المرجع</th><th>الجهة</th>
                  <th>طريقة الدفع</th><th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const meta = TYPE_LABELS[p.reference_type] || { label: p.reference_type, color: '#6b7280', icon: Receipt, direction: 'out' }
                  const Icon = meta.icon
                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13, color: '#6b7280' }}>{p.payment_date}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                          background: meta.color + '15', color: meta.color,
                        }}>
                          <Icon size={12} /> {meta.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                        {p.reference_label || (p.notes ? <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>مستقلة</span> : '—')}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{p.party_name || (p.notes?.match(/^\[(.+?)\]/)?.[1]) || '—'}</td>
                      <td style={{ fontSize: 13 }}>{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                      <td style={{
                        fontFamily: 'Inter', fontWeight: 700, fontSize: 13,
                        color: meta.direction === 'in' ? '#16a34a' : '#dc2626',
                      }}>
                        {meta.direction === 'in' ? '+' : '−'}{(+p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {p.currency}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {payments.length} حركة دفع
          </div>
        </div>
      )}

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="تسجيل دفعة جديدة" size="md">
        <RecordPaymentForm onSubmit={handleRecord} loading={createMutation.isPending} />
      </Modal>
    </div>
  )
}
