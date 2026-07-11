import { useState, useEffect } from 'react'
import { Plus, Eye, X, Loader2, ShoppingCart, FileText, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePurchaseOrders, useCreatePO, useUpdatePOStatus, useDeletePO } from '../hooks/usePurchaseOrders'
import { useSuppliers } from '../hooks/useSuppliers'
import { useItems } from '../hooks/useItems'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow, Amount,
} from '../components/ui'

// ── Zod Schema ────────────────────────────────────────────────
const poSchema = z.object({
  supplier_id:      z.string().min(1, 'اختر المورد'),
  order_date:       z.string().min(1, 'التاريخ مطلوب'),
  expected_date:    z.string().optional(),
  currency:         z.string().default('USD'),
  exchange_rate:    z.coerce.number().min(0.0001).default(1),
  shipping_method:  z.string().optional(),
  port_of_entry:    z.string().optional(),
  incoterms:        z.string().optional(),
  payment_terms:    z.string().optional(),
  payment_method:   z.string().optional(),
  lc_number:        z.string().optional(),
  notes:            z.string().optional(),
  items: z.array(z.object({
    item_id:     z.string().min(1, 'اختر الصنف'),
    quantity:    z.coerce.number().min(0.001, 'الكمية مطلوبة'),
    unit_price:  z.coerce.number().min(0.0001, 'السعر مطلوب'),
    discount_pct:z.coerce.number().min(0).max(100).default(0),
    tax_type:    z.string().default('vat_14'),
    notes:       z.string().optional(),
  })).min(1, 'أضف صنف واحد على الأقل'),
})

const CURRENCIES    = ['USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED']
const INCOTERMS     = ['FOB', 'CIF', 'EXW', 'CFR', 'DAP', 'DDP', 'FCA']
const PAY_METHODS   = [
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'check',         label: 'شيك' },
  { value: 'cash',          label: 'نقدي' },
  { value: 'lc',            label: 'اعتماد مستندي (LC)' },
  { value: 'credit',        label: 'آجل' },
]
const TAX_TYPES = [
  { value: 'vat_14',    label: 'ضريبة 14%' },
  { value: 'vat_0',     label: 'صفر %' },
  { value: 'exempt',    label: 'معفي' },
]

// ── Tax calc ──────────────────────────────────────────────────
function calcItemAmounts(quantity, unit_price, discount_pct = 0, tax_type = 'vat_14') {
  const base        = quantity * unit_price
  const discounted  = base * (1 - discount_pct / 100)
  const taxRate     = tax_type === 'vat_14' ? 0.14 : 0
  const tax_amount  = discounted * taxRate
  const total       = discounted + tax_amount
  return { base, discounted, tax_amount, total }
}

// ── PO Form ───────────────────────────────────────────────────
function POForm({ onSubmit, loading }) {
  const { data: suppliers = [] } = useSuppliers({ is_active: true })
  const { data: items = [] }     = useItems({ is_active: true })

  const { register, control, handleSubmit, watch, setValue, formState: { errors, dirtyFields } } = useForm({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_date:    new Date().toISOString().split('T')[0],
      currency:      'USD',
      exchange_rate: 1,
      items: [{ item_id: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_type: 'vat_14' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems    = watch('items')
  const watchCurrency = watch('currency')
  const watchRate     = watch('exchange_rate') || 1

  const { data: liveRates } = useExchangeRates()

  // Prefill the exchange rate with today's live rate whenever the currency changes —
  // but never overwrite it once the user has typed their own value.
  useEffect(() => {
    if (dirtyFields.exchange_rate) return
    if (watchCurrency === 'EGP') { setValue('exchange_rate', 1); return }
    const rate = liveRates?.[watchCurrency]
    if (rate) setValue('exchange_rate', Number(rate.toFixed(4)))
  }, [watchCurrency, liveRates]) // eslint-disable-line react-hooks/exhaustive-deps

  // Totals
  const totals = watchItems.reduce((acc, item) => {
    const { discounted, tax_amount, total } = calcItemAmounts(
      +item.quantity || 0, +item.unit_price || 0,
      +item.discount_pct || 0, item.tax_type,
    )
    return {
      subtotal: acc.subtotal + discounted,
      tax:      acc.tax      + tax_amount,
      total:    acc.total    + total,
    }
  }, { subtotal: 0, tax: 0, total: 0 })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="po-form">

      {/* ── Header info ── */}
      <div style={{ background: '#f8f9fb', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>
          بيانات أمر الشراء
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="المورد" required error={errors.supplier_id?.message}>
              <select className={`form-input ${errors.supplier_id ? 'error' : ''}`} {...register('supplier_id')}>
                <option value="">اختر المورد</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.country}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="تاريخ الأمر" required error={errors.order_date?.message}>
            <input type="date" className={`form-input ltr ${errors.order_date ? 'error' : ''}`} {...register('order_date')} />
          </FormField>

          <FormField label="تاريخ التسليم المتوقع">
            <input type="date" className="form-input ltr" {...register('expected_date')} />
          </FormField>

          <FormField label="العملة">
            <select className="form-input" {...register('currency')}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>

          {watchCurrency !== 'EGP' && (
            <FormField label="سعر الصرف (مقابل الجنيه)" error={errors.exchange_rate?.message}
              hint={!dirtyFields.exchange_rate && liveRates?.[watchCurrency] ? 'سعر اليوم تلقائيًا — قابل للتعديل' : undefined}>
              <input type="number" step="0.0001" className="form-input ltr" {...register('exchange_rate')} dir="ltr" />
            </FormField>
          )}

          <FormField label="Incoterms">
            <select className="form-input" {...register('incoterms')}>
              <option value="">اختر</option>
              {INCOTERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>

          <FormField label="طريقة الدفع">
            <select className="form-input" {...register('payment_method')}>
              <option value="">اختر</option>
              {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FormField>

          <FormField label="شروط الدفع">
            <input className="form-input" {...register('payment_terms')} placeholder="Net 90 days" />
          </FormField>

          <FormField label="رقم LC (اعتماد مستندي)">
            <input className="form-input ltr" {...register('lc_number')} dir="ltr" />
          </FormField>

          <FormField label="ميناء الدخول">
            <input className="form-input" {...register('port_of_entry')} placeholder="Port Said / Alexandria" />
          </FormField>

          <FormField label="طريقة الشحن">
            <input className="form-input" {...register('shipping_method')} placeholder="Sea Freight / Air" />
          </FormField>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="ملاحظات">
              <textarea className="form-input" rows={2} {...register('notes')} />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Line Items ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
            الأصناف
            {errors.items?.root && (
              <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 400, marginRight: 8 }}>
                {errors.items.root.message}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => append({ item_id: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_type: 'vat_14' })}
          >
            <Plus size={13} /> إضافة صنف
          </button>
        </div>

        <div style={{ border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8f9fb' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '28%' }}>الصنف</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '10%' }}>الكمية</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '13%' }}>السعر ({watchCurrency})</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '8%' }}>خصم%</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '12%' }}>الضريبة</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, width: '15%' }}>الإجمالي</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const row = watchItems[idx] || {}
                const { total } = calcItemAmounts(
                  +row.quantity || 0, +row.unit_price || 0,
                  +row.discount_pct || 0, row.tax_type,
                )
                return (
                  <tr key={field.id} style={{ borderTop: '1px solid #f0f1f3' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        className={`form-input ${errors.items?.[idx]?.item_id ? 'error' : ''}`}
                        style={{ height: 34, fontSize: 12 }}
                        {...register(`items.${idx}.item_id`)}
                      >
                        <option value="">اختر الصنف</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input
                        type="number" step="0.001"
                        className={`form-input ltr ${errors.items?.[idx]?.quantity ? 'error' : ''}`}
                        style={{ height: 34, fontSize: 12, textAlign: 'right' }}
                        {...register(`items.${idx}.quantity`)}
                        dir="ltr"
                      />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input
                        type="number" step="0.0001"
                        className={`form-input ltr ${errors.items?.[idx]?.unit_price ? 'error' : ''}`}
                        style={{ height: 34, fontSize: 12, textAlign: 'right' }}
                        {...register(`items.${idx}.unit_price`)}
                        dir="ltr"
                      />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input
                        type="number" step="0.01" min="0" max="100"
                        className="form-input ltr"
                        style={{ height: 34, fontSize: 12, textAlign: 'right' }}
                        {...register(`items.${idx}.discount_pct`)}
                        dir="ltr"
                      />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <select
                        className="form-input"
                        style={{ height: 34, fontSize: 12 }}
                        {...register(`items.${idx}.tax_type`)}
                      >
                        {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'Inter', fontWeight: 700, color: '#1a1d23', textAlign: 'left' }}>
                      {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Totals ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{
          background: '#f8f9fb', borderRadius: 10, padding: '14px 20px',
          border: '1px solid #e8eaed', minWidth: 280,
        }}>
          {[
            { label: 'المجموع قبل الضريبة', value: totals.subtotal },
            { label: 'ضريبة القيمة المضافة', value: totals.tax },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>{r.label}</span>
              <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>
                {r.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} {watchCurrency}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e8eaed', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#1a1d23' }}>الإجمالي</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 16, color: '#3d62f3' }}>
              {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {watchCurrency}
            </span>
          </div>
          {watchCurrency !== 'EGP' && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, textAlign: 'left' }}>
              ≈ {(totals.total * +watchRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
            </div>
          )}
        </div>
      </div>
    </form>
  )
}

// ── PO Detail Modal ───────────────────────────────────────────
function PODetailModal({ po, open, onClose }) {
  if (!po) return null
  const currency = po.currency || 'USD'
  return (
    <Modal open={open} onClose={onClose} title={`أمر شراء — ${po.po_number}`} size="xl">
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'المورد',       value: po.supplier?.name },
          { label: 'التاريخ',      value: po.order_date },
          { label: 'التسليم المتوقع', value: po.expected_date || '—' },
          { label: 'Incoterms',   value: po.incoterms || '—' },
          { label: 'طريقة الدفع', value: po.payment_method || '—' },
          { label: 'ميناء الدخول', value: po.port_of_entry || '—' },
        ].map(f => (
          <div key={f.label} style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>السعر ({currency})</th>
              <th>خصم</th>
              <th>ضريبة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map(item => (
              <tr key={item.id}>
                <td style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280' }}>{item.item?.code}</td>
                <td style={{ fontWeight: 600 }}>{item.item?.name}</td>
                <td className="num">{(+item.quantity).toLocaleString()} {item.item?.unit}</td>
                <td className="num">{(+item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 4 })}</td>
                <td>{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
                <td>{item.tax_type === 'vat_14' ? '14%' : item.tax_type === 'vat_0' ? '0%' : 'معفي'}</td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {(+item.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 280 }}>
          {[
            { label: 'المجموع',        value: po.subtotal_amount },
            { label: 'الضريبة',        value: po.tax_amount },
            { label: 'رسوم جمركية',   value: po.customs_fees },
            { label: 'شحن',           value: po.freight_cost },
          ].filter(r => +r.value > 0).map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>{r.label}</span>
              <span className="num" style={{ fontWeight: 600 }}>
                {(+r.value).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #e8eaed', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>الإجمالي</span>
            <span className="num" style={{ fontWeight: 800, fontSize: 17, color: '#3d62f3' }}>
              {(+po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
            </span>
          </div>
          {currency !== 'EGP' && po.total_amount_egp > 0 && (
            <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'left', marginTop: 4 }}>
              ≈ {(+po.total_amount_egp).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
            </div>
          )}
        </div>
      </div>

      {po.notes && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
          <strong>ملاحظات:</strong> {po.notes}
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'draft',     label: 'مسودة' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'approved',  label: 'معتمد' },
  { value: 'shipped',   label: 'تم الشحن' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function PurchaseOrdersPage() {
  const { user } = useAuthStore()
  const [search, setSearch]         = useState('')
  const [filterStatus, setStatus]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [createOpen, setCreateOpen]   = useState(false)
  const [viewPO, setViewPO]           = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [approvePO, setApprovePO]     = useState(null)

  const filters = { search, status: filterStatus || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }
  const { data: orders = [], isLoading } = usePurchaseOrders(filters)
  const createMutation  = useCreatePO()
  const statusMutation  = useUpdatePOStatus()
  const cancelMutation  = useDeletePO()

  const handleCreate = async (data) => {
    // Calc totals
    let subtotal = 0, tax = 0
    const processedItems = data.items.map(item => {
      const { discounted, tax_amount, total } = calcItemAmounts(
        +item.quantity, +item.unit_price, +item.discount_pct || 0, item.tax_type,
      )
      subtotal += discounted
      tax      += tax_amount
      return {
        ...item,
        tax_amount:   parseFloat(tax_amount.toFixed(2)),
        total_amount: parseFloat(total.toFixed(2)),
      }
    })
    const total     = subtotal + tax
    const rate      = +data.exchange_rate || 1

    await createMutation.mutateAsync({
      ...data,
      subtotal_amount:   parseFloat(subtotal.toFixed(2)),
      tax_amount:        parseFloat(tax.toFixed(2)),
      total_amount:      parseFloat(total.toFixed(2)),
      total_amount_egp:  parseFloat((total * rate).toFixed(2)),
      status:            'draft',
      created_by:        user.id,
      items:             processedItems,
    })
    setCreateOpen(false)
  }

  const handleApprove = async () => {
    await statusMutation.mutateAsync({ id: approvePO.id, status: 'approved', approved_by: user.id })
    setApprovePO(null)
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(cancelTarget.id)
    setCancelTarget(null)
  }

  // Stats
  const draft     = orders.filter(o => o.status === 'draft').length
  const approved  = orders.filter(o => o.status === 'approved').length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const totalVal  = orders.reduce((s, o) => s + (+o.total_amount_egp || 0), 0)

  const stats = [
    { label: 'إجمالي الأوامر',    value: orders.length, color: '#3d62f3' },
    { label: 'مسودة / انتظار',    value: draft,         color: '#f59e0b' },
    { label: 'معتمدة',            value: approved,      color: '#16a34a' },
    { label: 'قيمة الأوامر (EGP)', value: totalVal.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#8b5cf6' },
  ]

  return (
    <div>
      <PageHeader
        title="أوامر الشراء"
        subtitle="إدارة طلبات شراء الخامات من الموردين"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> أمر شراء جديد
          </button>
        }
      />

      <StatsRow stats={stats} />

      {/* Filters */}
      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الأمر..." />
        <select className="form-input" style={{ width: 150, height: 36 }}
          value={filterStatus} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="date" className="form-input ltr" style={{ width: 160, height: 36 }}
          value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من تاريخ" />
        <input type="date" className="form-input ltr" style={{ width: 160, height: 36 }}
          value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="إلى تاريخ" />
      </FiltersBar>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingCart}
            title="لا يوجد أوامر شراء"
            subtitle="ابدأ بإنشاء أول أمر شراء"
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> أمر شراء جديد</button>}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>رقم الأمر</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th>التسليم</th>
                  <th>العملة</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(po => (
                  <tr key={po.id}>
                    <td>
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>
                        {po.po_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{po.supplier?.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{po.supplier?.country}</div>
                    </td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>{po.order_date}</td>
                    <td style={{ fontSize: 13, color: po.expected_date ? '#374151' : '#d1d5db' }}>
                      {po.expected_date || '—'}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#6b7280', fontSize: 12 }}>
                        {po.currency}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#1a1d23' }}>
                        {(+po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {po.currency !== 'EGP' && po.total_amount_egp > 0 && (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          ≈ {(+po.total_amount_egp).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="عرض"
                          onClick={() => setViewPO(po)}>
                          <Eye size={14} />
                        </button>
                        {po.status === 'draft' && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="اعتماد"
                            style={{ color: '#16a34a' }} onClick={() => setApprovePO(po)}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {['draft', 'confirmed'].includes(po.status) && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="إلغاء"
                            style={{ color: '#dc2626' }} onClick={() => setCancelTarget(po)}>
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {orders.length} أمر شراء
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)}
        title="أمر شراء جديد" size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="po-form" type="submit"
              disabled={createMutation.isPending}>
              {createMutation.isPending
                ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                : 'إنشاء الأمر'
              }
            </button>
          </>
        }
      >
        <POForm onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>

      {/* View Modal */}
      <PODetailModal po={viewPO} open={!!viewPO} onClose={() => setViewPO(null)} />

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approvePO}
        onClose={() => setApprovePO(null)}
        onConfirm={handleApprove}
        loading={statusMutation.isPending}
        title="اعتماد أمر الشراء"
        message={`هل تريد اعتماد ${approvePO?.po_number}؟ لن تتمكن من التعديل بعدها.`}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelMutation.isPending}
        danger
        title="إلغاء أمر الشراء"
        message={`هل تريد إلغاء ${cancelTarget?.po_number}؟`}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
