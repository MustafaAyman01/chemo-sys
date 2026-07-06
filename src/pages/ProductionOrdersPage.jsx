import { useState } from 'react'
import { Plus, Eye, Loader2, Factory, PlayCircle, CheckCircle2, XCircle, Calculator } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useProductionOrders, useCreateProductionOrder, useStartProduction,
  useCompleteProduction, useCancelProductionOrder, useActiveBOMForProduct,
} from '../hooks/useProduction'
import { useFactories } from '../hooks/useProduction'
import { useFinishedProducts } from '../hooks/useItems'
import { useWarehouses } from '../hooks/useWarehouses'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

// ── Create Order Schema ──────────────────────────────────────
const orderSchema = z.object({
  factory_id:          z.string().min(1, 'اختر المصنع'),
  finished_product_id: z.string().min(1, 'اختر المنتج'),
  planned_quantity:    z.coerce.number().min(0.001, 'الكمية مطلوبة'),
  planned_start_date:  z.string().optional(),
  planned_end_date:    z.string().optional(),
  raw_material_warehouse_id: z.string().min(1, 'اختر مخزن الخامات'),
  notes:               z.string().optional(),
})

function CreateOrderForm({ onSubmit }) {
  const { data: factories = [] } = useFactories({ is_active: true })
  const { data: products = [] }  = useFinishedProducts()
  const { data: warehouses = [] } = useWarehouses({ is_active: true })

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: { planned_start_date: new Date().toISOString().split('T')[0] },
  })

  const productId = watch('finished_product_id')
  const plannedQty = watch('planned_quantity')
  const { data: bom } = useActiveBOMForProduct(productId)

  // Calculate required materials preview
  const requiredMaterials = bom?.bom_items?.map(item => ({
    ...item,
    required: (+plannedQty || 0) * item.quantity_per_unit * (1 + (item.waste_pct || 0) / 100),
  })) || []

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="production-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <FormField label="المصنع" required error={errors.factory_id?.message}>
          <select className={`form-input ${errors.factory_id ? 'error' : ''}`} {...register('factory_id')}>
            <option value="">اختر المصنع</option>
            {factories.map(f => (
              <option key={f.id} value={f.id}>{f.name} {f.type === 'external' ? '(خارجي)' : '(رئيسي)'}</option>
            ))}
          </select>
        </FormField>

        <FormField label="المنتج النهائي" required error={errors.finished_product_id?.message}>
          <select className={`form-input ${errors.finished_product_id ? 'error' : ''}`} {...register('finished_product_id')}>
            <option value="">اختر المنتج</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </FormField>

        <FormField label="الكمية المخططة" required error={errors.planned_quantity?.message}>
          <input type="number" step="0.001" className="form-input ltr" {...register('planned_quantity')} dir="ltr" />
        </FormField>

        <FormField label="مخزن الخامات" required error={errors.raw_material_warehouse_id?.message}>
          <select className={`form-input ${errors.raw_material_warehouse_id ? 'error' : ''}`} {...register('raw_material_warehouse_id')}>
            <option value="">اختر المخزن</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormField>

        <FormField label="تاريخ البداية المخطط">
          <input type="date" className="form-input ltr" {...register('planned_start_date')} />
        </FormField>

        <FormField label="تاريخ الانتهاء المخطط">
          <input type="date" className="form-input ltr" {...register('planned_end_date')} />
        </FormField>
      </div>

      <FormField label="ملاحظات">
        <textarea className="form-input" rows={2} {...register('notes')} />
      </FormField>

      {/* Materials Preview */}
      {productId && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>
            <Calculator size={15} /> الخامات المطلوبة (محسوبة تلقائياً من BOM)
          </div>
          {!bom ? (
            <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              لا يوجد تكوين منتج (BOM) معرّف لهذا المنتج. أضف تكوين أولاً من صفحة "تكوين المنتج".
            </div>
          ) : (
            <div style={{ border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8f9fb' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الخامة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الكمية المطلوبة</th>
                  </tr>
                </thead>
                <tbody>
                  {requiredMaterials.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid #f0f1f3' }}>
                      <td style={{ padding: '8px 12px' }}>{item.raw_material?.name}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'Inter', fontWeight: 700 }}>
                        {item.required.toFixed(3)} {item.raw_material?.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

// ── Start Production Modal (confirm & consume materials) ────────
function StartProductionModal({ order, open, onClose, onConfirm, loading }) {
  if (!order) return null

  return (
    <Modal open={open} onClose={onClose} title="بدء الإنتاج — صرف الخامات" size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تأكيد وصرف الخامات'}
          </button>
        </>
      }
    >
      <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
        سيتم خصم الكميات التالية من المخزون فوراً
      </div>
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>الخامة</th><th>الكمية المخططة</th></tr></thead>
          <tbody>
            {order.materials?.map(m => (
              <tr key={m.id}>
                <td>{m.item?.name}</td>
                <td className="num" style={{ fontWeight: 700 }}>{(+m.planned_quantity).toLocaleString()} {m.item?.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ── Complete Production Modal ────────────────────────────────
function CompleteProductionModal({ order, open, onClose, onConfirm, loading }) {
  const [actualQty, setActualQty] = useState(order?.planned_quantity || 0)
  const [unitCost, setUnitCost]   = useState(0)
  const { data: warehouses = [] } = useWarehouses({ is_active: true })
  const [fgWarehouse, setFgWarehouse] = useState('')

  if (!order) return null

  const totalMaterialCost = order.materials?.reduce((s, m) => s + (+m.total_cost || 0), 0) || 0
  const suggestedUnitCost = actualQty > 0 ? totalMaterialCost / actualQty : 0

  return (
    <Modal open={open} onClose={onClose} title="إكمال الإنتاج" size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary"
            onClick={() => onConfirm({
              actual_quantity: +actualQty,
              unit_cost: +unitCost || suggestedUnitCost,
              fg_warehouse_id: fgWarehouse,
            })}
            disabled={loading || !fgWarehouse}
          >
            {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تأكيد وإضافة للمخزون'}
          </button>
        </>
      }
    >
      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d', marginBottom: 16 }}>
        تكلفة الخامات المصروفة: {totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
      </div>

      <FormField label="الكمية الفعلية المنتجة" required>
        <input type="number" step="0.001" className="form-input ltr" value={actualQty}
          onChange={e => setActualQty(e.target.value)} dir="ltr" />
      </FormField>
      <div style={{ height: 12 }} />

      <FormField label="مخزن المنتج النهائي" required>
        <select className="form-input" value={fgWarehouse} onChange={e => setFgWarehouse(e.target.value)}>
          <option value="">اختر المخزن</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormField>
      <div style={{ height: 12 }} />

      <FormField label="تكلفة الوحدة" hint={`مقترح: ${suggestedUnitCost.toFixed(2)} EGP (محسوب من تكلفة الخامات)`}>
        <input type="number" step="0.01" className="form-input ltr" value={unitCost}
          onChange={e => setUnitCost(e.target.value)} placeholder={suggestedUnitCost.toFixed(2)} dir="ltr" />
      </FormField>
    </Modal>
  )
}

// ── Detail View Modal ─────────────────────────────────────────
function OrderDetailModal({ order, open, onClose }) {
  if (!order) return null
  return (
    <Modal open={open} onClose={onClose} title={`أمر إنتاج — ${order.order_number}`} size="lg">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'المصنع',          value: order.factory?.name },
          { label: 'المنتج',          value: order.finished_product?.name },
          { label: 'الكمية المخططة', value: `${order.planned_quantity} ${order.finished_product?.unit}` },
          { label: 'الكمية الفعلية', value: order.actual_quantity ? `${order.actual_quantity} ${order.finished_product?.unit}` : '—' },
          { label: 'تاريخ البداية',  value: order.actual_start_date || order.planned_start_date || '—' },
          { label: 'تاريخ الانتهاء', value: order.actual_end_date || order.planned_end_date || '—' },
        ].map(f => (
          <div key={f.label} style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{f.value}</div>
          </div>
        ))}
      </div>

      {order.materials?.length > 0 && (
        <div className="table-wrap">
          <table className="erp-table">
            <thead><tr><th>الخامة</th><th>المخطط</th><th>الفعلي</th><th>التكلفة</th></tr></thead>
            <tbody>
              {order.materials.map(m => (
                <tr key={m.id}>
                  <td>{m.item?.name}</td>
                  <td className="num">{(+m.planned_quantity).toLocaleString()} {m.item?.unit}</td>
                  <td className="num">{m.actual_quantity ? `${(+m.actual_quantity).toLocaleString()} ${m.item?.unit}` : '—'}</td>
                  <td className="num">{m.total_cost ? `${(+m.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {order.total_cost > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '12px 18px', textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>إجمالي تكلفة الإنتاج</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3d62f3', fontFamily: 'Inter' }}>
              {(+order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProductionOrdersPage() {
  const { user } = useAuthStore()
  const [search, setSearch]       = useState('')
  const [filterStatus, setStatus] = useState('')

  const [createOpen, setCreateOpen]     = useState(false)
  const [viewOrder, setViewOrder]       = useState(null)
  const [startOrder, setStartOrder]     = useState(null)
  const [completeOrder, setCompleteOrder] = useState(null)
  const [cancelOrder, setCancelOrder]   = useState(null)

  const filters = { search, status: filterStatus || undefined }
  const { data: orders = [], isLoading } = useProductionOrders(filters)

  const createMutation   = useCreateProductionOrder()
  const startMutation    = useStartProduction()
  const completeMutation = useCompleteProduction()
  const cancelMutation   = useCancelProductionOrder()

  // For full order detail (with materials) when opening start/complete/view modals
  const [fullOrderCache, setFullOrderCache] = useState({})

  const handleCreate = async (data) => {
    // Get BOM to compute planned materials
    const { data: bom } = await import('../lib/supabase').then(({ supabase }) =>
      supabase.from('bill_of_materials')
        .select('*, bom_items(*)')
        .eq('finished_product_id', data.finished_product_id)
        .eq('is_active', true)
        .maybeSingle()
    )

    if (!bom) {
      alert('لا يوجد تكوين منتج (BOM) لهذا المنتج. أضف تكوين أولاً.')
      return
    }

    const materials = bom.bom_items.map(item => ({
      item_id: item.raw_material_id,
      planned_quantity: parseFloat((data.planned_quantity * item.quantity_per_unit * (1 + (item.waste_pct || 0) / 100)).toFixed(4)),
    }))

    await createMutation.mutateAsync({
      factory_id:          data.factory_id,
      finished_product_id: data.finished_product_id,
      bom_id:               bom.id,
      planned_quantity:    data.planned_quantity,
      planned_start_date:  data.planned_start_date,
      planned_end_date:    data.planned_end_date,
      notes:               data.notes,
      status:               'planned',
      created_by:           user.id,
      raw_material_warehouse_id: data.raw_material_warehouse_id,
      materials,
    })
    setCreateOpen(false)
  }

  const loadFullOrder = async (orderId) => {
    const { supabase } = await import('../lib/supabase')
    const { data } = await supabase
      .from('production_orders')
      .select(`*, factory:factories(*), finished_product:items!production_orders_finished_product_id_fkey(*),
        materials:production_materials(*, item:items(id, code, name, unit))`)
      .eq('id', orderId)
      .single()
    return data
  }

  const openStart = async (order) => {
    const full = await loadFullOrder(order.id)
    setStartOrder(full)
  }

  const openComplete = async (order) => {
    const full = await loadFullOrder(order.id)
    setCompleteOrder(full)
  }

  const openView = async (order) => {
    const full = await loadFullOrder(order.id)
    setViewOrder(full)
  }

  const handleStartConfirm = async () => {
    const materials = startOrder.materials.map(m => ({ ...m, actual_quantity: m.planned_quantity }))
    // Need raw_material_warehouse_id - get it from the first material's warehouse
    const { supabase } = await import('../lib/supabase')
    const { data: firstMat } = await supabase.from('production_materials').select('warehouse_id').eq('production_order_id', startOrder.id).limit(1).single()

    await startMutation.mutateAsync({
      orderId: startOrder.id,
      materials,
      raw_material_warehouse_id: firstMat.warehouse_id,
      created_by: user.id,
    })
    setStartOrder(null)
  }

  const handleCompleteConfirm = async (data) => {
    await completeMutation.mutateAsync({
      orderId: completeOrder.id,
      finished_product_id: completeOrder.finished_product_id,
      actual_quantity: data.actual_quantity,
      fg_warehouse_id: data.fg_warehouse_id,
      unit_cost: data.unit_cost,
      created_by: user.id,
    })
    setCompleteOrder(null)
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(cancelOrder.id)
    setCancelOrder(null)
  }

  const planned   = orders.filter(o => o.status === 'planned').length
  const inProg    = orders.filter(o => o.status === 'in_progress').length
  const completed = orders.filter(o => o.status === 'completed').length
  const totalCost = orders.reduce((s, o) => s + (+o.total_cost || 0), 0)

  const stats = [
    { label: 'إجمالي الأوامر', value: orders.length, color: '#3d62f3' },
    { label: 'مخطط',           value: planned,        color: '#1d4ed8' },
    { label: 'قيد التنفيذ',    value: inProg,         color: '#7c3aed' },
    { label: 'مكتمل',          value: completed,      color: '#16a34a' },
  ]

  return (
    <div>
      <PageHeader
        title="أوامر الإنتاج"
        subtitle="تخطيط وتنفيذ عمليات التصنيع في المصنع الرئيسي والمصانع الخارجية"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> أمر إنتاج جديد
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الأمر..." />
        <select className="form-input" style={{ width: 160, height: 36 }} value={filterStatus} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="planned">مخطط</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState icon={Factory} title="لا يوجد أوامر إنتاج"
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> أمر إنتاج جديد</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>رقم الأمر</th>
                  <th>المصنع</th>
                  <th>المنتج</th>
                  <th>الكمية المخططة</th>
                  <th>الكمية الفعلية</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>{o.order_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.factory?.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{o.factory?.type === 'external' ? 'مصنع خارجي' : 'مصنع رئيسي'}</div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{o.finished_product?.name}</td>
                    <td className="num">{(+o.planned_quantity).toLocaleString()} {o.finished_product?.unit}</td>
                    <td className="num">{o.actual_quantity ? `${(+o.actual_quantity).toLocaleString()} ${o.finished_product?.unit}` : '—'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="عرض" onClick={() => openView(o)}>
                          <Eye size={14} />
                        </button>
                        {o.status === 'planned' && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="بدء الإنتاج" style={{ color: '#7c3aed' }} onClick={() => openStart(o)}>
                            <PlayCircle size={14} />
                          </button>
                        )}
                        {o.status === 'in_progress' && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="إكمال" style={{ color: '#16a34a' }} onClick={() => openComplete(o)}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {['planned'].includes(o.status) && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="إلغاء" style={{ color: '#dc2626' }} onClick={() => setCancelOrder(o)}>
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
            {orders.length} أمر إنتاج
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="أمر إنتاج جديد" size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="production-form" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'إنشاء أمر الإنتاج'}
            </button>
          </>
        }
      >
        <CreateOrderForm onSubmit={handleCreate} />
      </Modal>

      {/* View Modal */}
      <OrderDetailModal order={viewOrder} open={!!viewOrder} onClose={() => setViewOrder(null)} />

      {/* Start Modal */}
      <StartProductionModal
        order={startOrder} open={!!startOrder} onClose={() => setStartOrder(null)}
        onConfirm={handleStartConfirm} loading={startMutation.isPending}
      />

      {/* Complete Modal */}
      <CompleteProductionModal
        order={completeOrder} open={!!completeOrder} onClose={() => setCompleteOrder(null)}
        onConfirm={handleCompleteConfirm} loading={completeMutation.isPending}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={handleCancel}
        loading={cancelMutation.isPending} danger
        title="إلغاء أمر الإنتاج"
        message={`هل تريد إلغاء ${cancelOrder?.order_number}؟`}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
