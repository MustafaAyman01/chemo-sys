import { useState } from 'react'
import { Plus, Eye, Loader2, TrendingUp, CheckCircle2, XCircle, Truck, Trash2 } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useSalesOrders, useCreateSalesOrder, useUpdateSOStatus,
  useShipSalesOrder, useCancelSalesOrder,
} from '../hooks/useSales'
import { useCustomers } from '../hooks/useCustomers'
import { useFinishedProducts } from '../hooks/useItems'
import { useWarehouses, useWarehouseStock } from '../hooks/useWarehouses'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const orderSchema = z.object({
  customer_id:      z.string().min(1, 'اختر العميل'),
  warehouse_id:     z.string().min(1, 'اختر مخزن المنتج النهائي'),
  order_date:       z.string().min(1, 'التاريخ مطلوب'),
  required_date:    z.string().optional(),
  delivery_address: z.string().optional(),
  payment_terms:    z.string().optional(),
  notes:            z.string().optional(),
  items: z.array(z.object({
    item_id:      z.string().min(1, 'اختر الصنف'),
    quantity:     z.coerce.number().min(0.001, 'الكمية مطلوبة'),
    unit_price:   z.coerce.number().min(0.0001, 'السعر مطلوب'),
    discount_pct: z.coerce.number().min(0).max(100).default(0),
    tax_type:     z.string().default('vat_14'),
  })).min(1, 'أضف صنف واحد على الأقل'),
})

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

// ── Order Form ────────────────────────────────────────────────
function OrderForm({ onSubmit }) {
  const { data: customers = [] }  = useCustomers({ is_active: true })
  const { data: products = [] }   = useFinishedProducts()
  const { data: warehouses = [] } = useWarehouses({ is_active: true })

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      items: [{ item_id: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_type: 'vat_14' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems  = watch('items')
  const warehouseId = watch('warehouse_id')
  const customerId  = watch('customer_id')

  const { data: stock = [] } = useWarehouseStock(warehouseId)
  const selectedCustomer = customers.find(c => c.id === customerId)

  const totals = watchItems.reduce((acc, it) => {
    const { discounted, tax, total } = calcLine(+it.quantity || 0, +it.unit_price || 0, +it.discount_pct || 0, it.tax_type)
    return { subtotal: acc.subtotal + discounted, tax: acc.tax + tax, total: acc.total + total }
  }, { subtotal: 0, tax: 0, total: 0 })

  const getAvailable = (itemId) => {
    const s = stock.find(s => s.item_id === itemId)
    return s ? +s.available_quantity : null
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="so-form">
      <div style={{ background: '#f8f9fb', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="العميل" required error={errors.customer_id?.message}>
            <select className={`form-input ${errors.customer_id ? 'error' : ''}`} {...register('customer_id')}>
              <option value="">اختر العميل</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <FormField label="مخزن المنتج النهائي" required error={errors.warehouse_id?.message}>
            <select className={`form-input ${errors.warehouse_id ? 'error' : ''}`} {...register('warehouse_id')}>
              <option value="">اختر المخزن</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormField>

          <FormField label="تاريخ الأمر" required error={errors.order_date?.message}>
            <input type="date" className="form-input ltr" {...register('order_date')} />
          </FormField>

          <FormField label="تاريخ التسليم المطلوب">
            <input type="date" className="form-input ltr" {...register('required_date')} />
          </FormField>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="عنوان التسليم">
              <input className="form-input" {...register('delivery_address')} />
            </FormField>
          </div>
        </div>

        {selectedCustomer && selectedCustomer.credit_limit && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 8,
            background: selectedCustomer.current_balance > selectedCustomer.credit_limit ? '#fef2f2' : '#f0fdf4',
            color: selectedCustomer.current_balance > selectedCustomer.credit_limit ? '#dc2626' : '#15803d',
          }}>
            الرصيد الحالي: {(+selectedCustomer.current_balance).toLocaleString()} EGP
            {' '}/ حد الائتمان: {(+selectedCustomer.credit_limit).toLocaleString()} EGP
          </div>
        )}
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
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>المتاح</th>
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
                const available = getAvailable(row.item_id)
                const insufficient = available !== null && +row.quantity > available

                return (
                  <tr key={field.id} style={{ borderTop: '1px solid #f0f1f3' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select className="form-input" style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.item_id`)}>
                        <option value="">اختر الصنف</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: insufficient ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {available !== null ? available.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" step="0.001" className={`form-input ltr ${insufficient ? 'error' : ''}`}
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
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
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

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '14px 20px', border: '1px solid #e8eaed', minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>المجموع</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>الضريبة</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP</span>
          </div>
          <div style={{ borderTop: '1px solid #e8eaed', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>الإجمالي</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 16, color: '#3d62f3' }}>
              {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
            </span>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── Detail Modal ──────────────────────────────────────────────
function OrderDetailModal({ order, open, onClose }) {
  if (!order) return null
  return (
    <Modal open={open} onClose={onClose} title={`أمر بيع — ${order.order_number}`} size="xl">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'العميل',         value: order.customer?.name },
          { label: 'التاريخ',        value: order.order_date },
          { label: 'التسليم المطلوب', value: order.required_date || '—' },
          { label: 'المخزن',         value: order.warehouse?.name || '—' },
          { label: 'عنوان التسليم',  value: order.delivery_address || '—' },
        ].map(f => (
          <div key={f.label} style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{f.value}</div>
          </div>
        ))}
      </div>
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="erp-table">
          <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
          <tbody>
            {order.items?.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.item?.name}</td>
                <td className="num">{(+item.quantity).toLocaleString()} {item.item?.unit}</td>
                <td className="num">{(+item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="num" style={{ fontWeight: 700 }}>{(+item.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
            <span>الإجمالي</span>
            <span className="num">{(+order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SalesOrdersPage() {
  const { user } = useAuthStore()
  const [search, setSearch]       = useState('')
  const [filterStatus, setStatus] = useState('')

  const [createOpen, setCreateOpen]   = useState(false)
  const [viewOrder, setViewOrder]     = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [shipOrder, setShipOrder]     = useState(null)
  const [cancelOrder, setCancelOrder] = useState(null)

  const filters = { search, status: filterStatus || undefined }
  const { data: orders = [], isLoading } = useSalesOrders(filters)

  const createMutation  = useCreateSalesOrder()
  const statusMutation  = useUpdateSOStatus()
  const shipMutation    = useShipSalesOrder()
  const cancelMutation  = useCancelSalesOrder()

  const handleCreate = async (data) => {
    let subtotal = 0, tax = 0
    const processedItems = data.items.map(item => {
      const { discounted, tax: t, total } = calcLine(+item.quantity, +item.unit_price, +item.discount_pct || 0, item.tax_type)
      subtotal += discounted; tax += t
      return { ...item, tax_amount: parseFloat(t.toFixed(2)), total_amount: parseFloat(total.toFixed(2)) }
    })
    const total = subtotal + tax

    await createMutation.mutateAsync({
      ...data,
      subtotal:     parseFloat(subtotal.toFixed(2)),
      tax_amount:   parseFloat(tax.toFixed(2)),
      total_amount: parseFloat(total.toFixed(2)),
      status:       'draft',
      created_by:   user.id,
      items:        processedItems,
    })
    setCreateOpen(false)
  }

  const handleConfirm = async () => {
    await statusMutation.mutateAsync({ id: confirmOrder.id, status: 'confirmed', approved_by: user.id })
    setConfirmOrder(null)
  }

  const handleShip = async () => {
    // Need full order with items
    const { supabase } = await import('../lib/supabase')
    const { data: full } = await supabase
      .from('sales_orders')
      .select('*, items:sales_order_items(*)')
      .eq('id', shipOrder.id)
      .single()

    await shipMutation.mutateAsync({
      orderId: shipOrder.id,
      items: full.items,
      warehouse_id: full.warehouse_id,
      created_by: user.id,
    })
    setShipOrder(null)
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(cancelOrder.id)
    setCancelOrder(null)
  }

  const draft     = orders.filter(o => o.status === 'draft').length
  const confirmed = orders.filter(o => o.status === 'confirmed').length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const totalVal  = orders.reduce((s, o) => s + (+o.total_amount || 0), 0)

  const stats = [
    { label: 'إجمالي الأوامر', value: orders.length, color: '#3d62f3' },
    { label: 'مسودة',          value: draft,          color: '#6b7280' },
    { label: 'مؤكدة',          value: confirmed,       color: '#1d4ed8' },
    { label: 'قيمة الأوامر (EGP)', value: totalVal.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#16a34a' },
  ]

  return (
    <div>
      <PageHeader
        title="أوامر البيع"
        subtitle="طلبات البيع للشركات العميلة"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> أمر بيع جديد
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الأمر..." />
        <select className="form-input" style={{ width: 160, height: 36 }} value={filterStatus} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="confirmed">مؤكد</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState icon={TrendingUp} title="لا يوجد أوامر بيع"
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> أمر بيع جديد</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>رقم الأمر</th><th>العميل</th><th>التاريخ</th><th>التسليم</th>
                  <th>الإجمالي</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>{o.order_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.customer?.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{o.customer?.industry}</div>
                    </td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>{o.order_date}</td>
                    <td style={{ fontSize: 13 }}>{o.required_date || '—'}</td>
                    <td style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13 }}>
                      {(+o.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewOrder(o)}>
                          <Eye size={14} />
                        </button>
                        {o.status === 'draft' && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#16a34a' }} onClick={() => setConfirmOrder(o)}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#3d62f3' }} onClick={() => setShipOrder(o)}>
                            <Truck size={14} />
                          </button>
                        )}
                        {['draft', 'confirmed'].includes(o.status) && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }} onClick={() => setCancelOrder(o)}>
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
            {orders.length} أمر بيع
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="أمر بيع جديد" size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="so-form" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'إنشاء الأمر'}
            </button>
          </>
        }>
        <OrderForm onSubmit={handleCreate} />
      </Modal>

      <OrderDetailModal order={viewOrder} open={!!viewOrder} onClose={() => setViewOrder(null)} />

      <ConfirmDialog
        open={!!confirmOrder} onClose={() => setConfirmOrder(null)} onConfirm={handleConfirm}
        loading={statusMutation.isPending}
        title="تأكيد أمر البيع" message={`هل تريد تأكيد ${confirmOrder?.order_number}؟`}
      />

      <ConfirmDialog
        open={!!shipOrder} onClose={() => setShipOrder(null)} onConfirm={handleShip}
        loading={shipMutation.isPending}
        title="تسليم الأمر وخصم المخزون"
        message={`سيتم خصم الكميات من المخزون فعلياً لأمر ${shipOrder?.order_number}. متابعة؟`}
      />

      <ConfirmDialog
        open={!!cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={handleCancel}
        loading={cancelMutation.isPending} danger
        title="إلغاء أمر البيع" message={`هل تريد إلغاء ${cancelOrder?.order_number}؟`}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
