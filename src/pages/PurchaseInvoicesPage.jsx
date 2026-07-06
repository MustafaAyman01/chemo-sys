import { useState } from 'react'
import { Plus, Eye, Loader2, Receipt, Printer, DollarSign, AlertCircle } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePurchaseInvoices, useCreatePurchaseInvoice, useUpdateInvoicePayment } from '../hooks/usePurchaseInvoices'
import { useSuppliers } from '../hooks/useSuppliers'
import { useItems } from '../hooks/useItems'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const invoiceSchema = z.object({
  supplier_id:            z.string().min(1, 'اختر المورد'),
  supplier_invoice_number:z.string().optional(),
  invoice_date:           z.string().min(1, 'التاريخ مطلوب'),
  due_date:               z.string().optional(),
  currency:               z.string().default('USD'),
  exchange_rate:          z.coerce.number().min(0.0001).default(1),
  notes:                  z.string().optional(),
  items: z.array(z.object({
    item_id:      z.string().min(1, 'اختر الصنف'),
    quantity:     z.coerce.number().min(0.001),
    unit_price:   z.coerce.number().min(0.0001),
    discount_pct: z.coerce.number().min(0).max(100).default(0),
    tax_type:     z.string().default('vat_14'),
  })).min(1, 'أضف صنف واحد على الأقل'),
})

const CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED']
const TAX_TYPES = [
  { value: 'vat_14', label: '14%' },
  { value: 'vat_0',  label: '0%' },
  { value: 'exempt', label: 'معفي' },
]

function calcLine(qty, price, discount = 0, taxType = 'vat_14') {
  const base       = qty * price
  const discounted = base * (1 - discount / 100)
  const taxRate    = taxType === 'vat_14' ? 0.14 : 0
  const tax        = discounted * taxRate
  return { discounted, tax, total: discounted + tax }
}

// ── Invoice Form ──────────────────────────────────────────────
function InvoiceForm({ onSubmit }) {
  const { data: suppliers = [] } = useSuppliers({ is_active: true })
  const { data: items = [] }     = useItems({ is_active: true })

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date:  new Date().toISOString().split('T')[0],
      currency:      'USD',
      exchange_rate: 1,
      items: [{ item_id: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_type: 'vat_14' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const currency   = watch('currency')

  const totals = watchItems.reduce((acc, it) => {
    const { discounted, tax, total } = calcLine(+it.quantity || 0, +it.unit_price || 0, +it.discount_pct || 0, it.tax_type)
    return { subtotal: acc.subtotal + discounted, tax: acc.tax + tax, total: acc.total + total }
  }, { subtotal: 0, tax: 0, total: 0 })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="invoice-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="المورد" required error={errors.supplier_id?.message}>
            <select className={`form-input ${errors.supplier_id ? 'error' : ''}`} {...register('supplier_id')}>
              <option value="">اختر المورد</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} — {s.country}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="رقم فاتورة المورد">
          <input className="form-input ltr" {...register('supplier_invoice_number')} dir="ltr" />
        </FormField>

        <FormField label="تاريخ الفاتورة" required error={errors.invoice_date?.message}>
          <input type="date" className="form-input ltr" {...register('invoice_date')} />
        </FormField>

        <FormField label="تاريخ الاستحقاق">
          <input type="date" className="form-input ltr" {...register('due_date')} />
        </FormField>

        <FormField label="العملة">
          <select className="form-input" {...register('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>

        {currency !== 'EGP' && (
          <FormField label="سعر الصرف">
            <input type="number" step="0.0001" className="form-input ltr" {...register('exchange_rate')} dir="ltr" />
          </FormField>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ملاحظات">
            <textarea className="form-input" rows={2} {...register('notes')} />
          </FormField>
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>الأصناف</div>
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={() => append({ item_id: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_type: 'vat_14' })}>
            <Plus size={13} /> إضافة صنف
          </button>
        </div>

        <div style={{ border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8f9fb' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الصنف</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الكمية</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>السعر</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>خصم%</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>ضريبة</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الإجمالي</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const row = watchItems[idx] || {}
                const { total } = calcLine(+row.quantity || 0, +row.unit_price || 0, +row.discount_pct || 0, row.tax_type)
                return (
                  <tr key={field.id} style={{ borderTop: '1px solid #f0f1f3' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select className="form-input" style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.item_id`)}>
                        <option value="">اختر الصنف</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" step="0.001" className="form-input ltr"
                        style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.quantity`)} dir="ltr" />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" step="0.0001" className="form-input ltr"
                        style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.unit_price`)} dir="ltr" />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" step="0.01" className="form-input ltr"
                        style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.discount_pct`)} dir="ltr" />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <select className="form-input" style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.tax_type`)}>
                        {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'Inter', fontWeight: 700, textAlign: 'left' }}>
                      {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '14px 20px', border: '1px solid #e8eaed', minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>المجموع</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>الضريبة</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          <div style={{ borderTop: '1px solid #e8eaed', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>الإجمالي</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 16, color: '#3d62f3' }}>
              {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
            </span>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── Payment Modal ─────────────────────────────────────────────
function PaymentForm({ invoice, onSubmit, loading }) {
  const [amount, setAmount]   = useState(invoice?.remaining_amount || 0)
  const [method, setMethod]   = useState('bank_transfer')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])

  return (
    <div>
      <div style={{ background: '#f8f9fb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#6b7280' }}>إجمالي الفاتورة</span>
          <span style={{ fontFamily: 'Inter', fontWeight: 700 }}>{(+invoice?.total_amount).toLocaleString()} {invoice?.currency}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#6b7280' }}>المتبقي</span>
          <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#dc2626' }}>{(+invoice?.remaining_amount).toLocaleString()} {invoice?.currency}</span>
        </div>
      </div>

      <FormField label="مبلغ الدفعة" required>
        <input type="number" step="0.01" className="form-input ltr" value={amount}
          onChange={e => setAmount(e.target.value)} dir="ltr" />
      </FormField>

      <div style={{ height: 12 }} />

      <FormField label="طريقة الدفع">
        <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="bank_transfer">تحويل بنكي</option>
          <option value="check">شيك</option>
          <option value="cash">نقدي</option>
        </select>
      </FormField>

      <div style={{ height: 12 }} />

      <FormField label="تاريخ الدفع">
        <input type="date" className="form-input ltr" value={date} onChange={e => setDate(e.target.value)} />
      </FormField>

      <div style={{ height: 20 }} />

      <button className="btn btn-primary" style={{ width: '100%' }}
        onClick={() => onSubmit({ paid_amount: +amount, payment_method: method, payment_date: date })}
        disabled={loading}>
        {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تسجيل الدفعة'}
      </button>
    </div>
  )
}

// ── Tax Invoice Print View ────────────────────────────────────
function InvoicePrintView({ invoice }) {
  if (!invoice) return null
  return (
    <div style={{ padding: 24, fontFamily: 'Cairo' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #1a1d23' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23' }}>ChemCo</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>لصناعة الكيماويات</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#3d62f3' }}>فاتورة شراء ضريبية</div>
          <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#6b7280' }}>{invoice.invoice_number}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>المورد</div>
          <div style={{ fontWeight: 700 }}>{invoice.supplier?.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{invoice.supplier?.country}</div>
          {invoice.supplier?.tax_number && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>الرقم الضريبي: {invoice.supplier.tax_number}</div>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>تاريخ الفاتورة</div>
          <div style={{ fontWeight: 600 }}>{invoice.invoice_date}</div>
          {invoice.due_date && (
            <>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 4 }}>تاريخ الاستحقاق</div>
              <div style={{ fontWeight: 600 }}>{invoice.due_date}</div>
            </>
          )}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #1a1d23' }}>
            <th style={{ padding: 8, textAlign: 'right' }}>الصنف</th>
            <th style={{ padding: 8, textAlign: 'right' }}>الكمية</th>
            <th style={{ padding: 8, textAlign: 'right' }}>السعر</th>
            <th style={{ padding: 8, textAlign: 'right' }}>الضريبة</th>
            <th style={{ padding: 8, textAlign: 'right' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e8eaed' }}>
              <td style={{ padding: 8 }}>{item.item?.name}</td>
              <td style={{ padding: 8 }} className="num">{(+item.quantity).toLocaleString()} {item.item?.unit}</td>
              <td style={{ padding: 8 }} className="num">{(+item.unit_price).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{item.tax_type === 'vat_14' ? '14%' : '0%'}</td>
              <td style={{ padding: 8 }} className="num">{(+item.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>المجموع</span><span className="num">{(+invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>الضريبة</span><span className="num">{(+invoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}</span>
          </div>
          <div style={{ borderTop: '2px solid #1a1d23', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
            <span>الإجمالي</span><span className="num">{(+invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PurchaseInvoicesPage() {
  const { user } = useAuthStore()
  const [search, setSearch]       = useState('')
  const [filterStatus, setStatus] = useState('')

  const [createOpen, setCreateOpen]   = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [payInvoice, setPayInvoice]   = useState(null)
  const [printInvoice, setPrintInvoice] = useState(null)

  const filters = { search, status: filterStatus || undefined }
  const { data: invoices = [], isLoading } = usePurchaseInvoices(filters)
  const createMutation = useCreatePurchaseInvoice()
  const paymentMutation = useUpdateInvoicePayment()

  const handleCreate = async (data) => {
    let subtotal = 0, tax = 0
    const processedItems = data.items.map(item => {
      const { discounted, tax: t, total } = calcLine(+item.quantity, +item.unit_price, +item.discount_pct || 0, item.tax_type)
      subtotal += discounted; tax += t
      return { ...item, tax_amount: parseFloat(t.toFixed(2)), total_amount: parseFloat(total.toFixed(2)) }
    })
    const total = subtotal + tax
    const rate  = +data.exchange_rate || 1

    await createMutation.mutateAsync({
      ...data,
      subtotal:    parseFloat(subtotal.toFixed(2)),
      tax_amount:  parseFloat(tax.toFixed(2)),
      total_amount:parseFloat(total.toFixed(2)),
      total_egp:   parseFloat((total * rate).toFixed(2)),
      status:      'pending',
      created_by:  user.id,
      items:       processedItems,
    })
    setCreateOpen(false)
  }

  const handlePayment = async (data) => {
    await paymentMutation.mutateAsync({ id: payInvoice.id, ...data })
    setPayInvoice(null)
  }

  const totalDue   = invoices.reduce((s, i) => s + (+i.remaining_amount || 0), 0)
  const overdue    = invoices.filter(i => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date()).length
  const paidCount  = invoices.filter(i => i.status === 'paid').length

  const stats = [
    { label: 'إجمالي الفواتير', value: invoices.length, color: '#3d62f3' },
    { label: 'مدفوعة بالكامل',  value: paidCount,        color: '#16a34a' },
    { label: 'متأخرة',          value: overdue,          color: '#dc2626' },
    { label: 'إجمالي المستحق',  value: totalDue.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="فواتير الشراء الضريبية"
        subtitle="فواتير المشتريات من الموردين"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> فاتورة جديدة
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة..." />
        <select className="form-input" style={{ width: 160, height: 36 }} value={filterStatus} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="partially_paid">مدفوعة جزئياً</option>
          <option value="paid">مدفوعة</option>
          <option value="overdue">متأخرة</option>
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title="لا يوجد فواتير شراء"
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> فاتورة جديدة</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th>الاستحقاق</th>
                  <th>الإجمالي</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isOverdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()
                  return (
                    <tr key={inv.id}>
                      <td><span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>{inv.invoice_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.supplier?.name}</div>
                        {inv.po?.po_number && <div style={{ fontSize: 11, color: '#9ca3af' }}>{inv.po.po_number}</div>}
                      </td>
                      <td style={{ fontSize: 13, color: '#6b7280' }}>{inv.invoice_date}</td>
                      <td style={{ fontSize: 13, color: isOverdue ? '#dc2626' : '#6b7280', fontWeight: isOverdue ? 700 : 400 }}>
                        {inv.due_date || '—'}
                      </td>
                      <td style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13 }}>
                        {(+inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
                      </td>
                      <td style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: inv.remaining_amount > 0 ? '#dc2626' : '#16a34a' }}>
                        {(+inv.remaining_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td><StatusBadge status={isOverdue ? 'overdue' : inv.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="عرض" onClick={() => setViewInvoice(inv)}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="طباعة" onClick={() => setPrintInvoice(inv)}>
                            <Printer size={14} />
                          </button>
                          {inv.status !== 'paid' && (
                            <button className="btn btn-ghost btn-sm btn-icon" title="تسجيل دفعة"
                              style={{ color: '#16a34a' }} onClick={() => setPayInvoice(inv)}>
                              <DollarSign size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {invoices.length} فاتورة
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="فاتورة شراء جديدة" size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="invoice-form" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'إنشاء الفاتورة'}
            </button>
          </>
        }>
        <InvoiceForm onSubmit={handleCreate} />
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة ${viewInvoice?.invoice_number}`} size="lg">
        <InvoicePrintView invoice={viewInvoice} />
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payInvoice} onClose={() => setPayInvoice(null)} title="تسجيل دفعة" size="sm">
        <PaymentForm invoice={payInvoice} onSubmit={handlePayment} loading={paymentMutation.isPending} />
      </Modal>

      {/* Print Modal */}
      <Modal open={!!printInvoice} onClose={() => setPrintInvoice(null)} title="معاينة الطباعة" size="lg"
        footer={
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> طباعة
          </button>
        }>
        <InvoicePrintView invoice={printInvoice} />
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
