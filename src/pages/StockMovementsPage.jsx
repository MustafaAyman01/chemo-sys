import { useState } from 'react'
import { ArrowLeftRight, SlidersHorizontal, Package, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useStockMovements, useTransferStock, useCreateMovement } from '../hooks/useWarehouses'
import { useWarehouses } from '../hooks/useWarehouses'
import { useItems } from '../hooks/useItems'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, EmptyState, TableSkeleton, Modal, FormField, StatsRow,
} from '../components/ui'

// ── Movement type labels ─────────────────────────────────────
const MOVEMENT_LABELS = {
  purchase_in:    { label: 'استلام شراء',      color: '#16a34a', icon: TrendingUp },
  production_out: { label: 'صرف للإنتاج',      color: '#dc2626', icon: TrendingDown },
  production_in:  { label: 'استلام إنتاج',     color: '#16a34a', icon: TrendingUp },
  sales_out:      { label: 'صرف بيع',          color: '#dc2626', icon: TrendingDown },
  transfer_in:    { label: 'تحويل وارد',       color: '#3d62f3', icon: ArrowLeftRight },
  transfer_out:   { label: 'تحويل صادر',       color: '#f59e0b', icon: ArrowLeftRight },
  adjustment_in:  { label: 'تسوية زيادة',      color: '#16a34a', icon: SlidersHorizontal },
  adjustment_out: { label: 'تسوية نقص',        color: '#dc2626', icon: SlidersHorizontal },
  return_in:      { label: 'مرتجع',            color: '#16a34a', icon: TrendingUp },
  waste:          { label: 'هالك',             color: '#991b1b', icon: TrendingDown },
}

// ── Transfer Form ─────────────────────────────────────────────
const transferSchema = z.object({
  from_warehouse_id: z.string().min(1, 'اختر المخزن المصدر'),
  to_warehouse_id:   z.string().min(1, 'اختر المخزن الوجهة'),
  item_id:           z.string().min(1, 'اختر الصنف'),
  quantity:          z.coerce.number().min(0.001, 'الكمية مطلوبة'),
  notes:             z.string().optional(),
}).refine(d => d.from_warehouse_id !== d.to_warehouse_id, {
  message: 'لا يمكن التحويل لنفس المخزن', path: ['to_warehouse_id'],
})

function TransferForm({ onSubmit }) {
  const { data: warehouses = [] } = useWarehouses({ is_active: true })
  const { data: items = [] }      = useItems({ is_active: true })

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(transferSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="transfer-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="من مخزن" required error={errors.from_warehouse_id?.message}>
          <select className={`form-input ${errors.from_warehouse_id ? 'error' : ''}`} {...register('from_warehouse_id')}>
            <option value="">اختر المخزن</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormField>
        <FormField label="إلى مخزن" required error={errors.to_warehouse_id?.message}>
          <select className={`form-input ${errors.to_warehouse_id ? 'error' : ''}`} {...register('to_warehouse_id')}>
            <option value="">اختر المخزن</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الصنف" required error={errors.item_id?.message}>
            <select className={`form-input ${errors.item_id ? 'error' : ''}`} {...register('item_id')}>
              <option value="">اختر الصنف</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="الكمية" required error={errors.quantity?.message}>
          <input type="number" step="0.001" className="form-input ltr" {...register('quantity')} dir="ltr" />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ملاحظات">
            <textarea className="form-input" rows={2} {...register('notes')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ── Adjustment Form ───────────────────────────────────────────
const adjustmentSchema = z.object({
  warehouse_id: z.string().min(1, 'اختر المخزن'),
  item_id:      z.string().min(1, 'اختر الصنف'),
  direction:    z.string().min(1),
  quantity:     z.coerce.number().min(0.001, 'الكمية مطلوبة'),
  unit_cost:    z.coerce.number().min(0).optional(),
  notes:        z.string().min(2, 'سبب التسوية مطلوب'),
})

function AdjustmentForm({ onSubmit }) {
  const { data: warehouses = [] } = useWarehouses({ is_active: true })
  const { data: items = [] }      = useItems({ is_active: true })

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { direction: 'adjustment_in' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="adjustment-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="المخزن" required error={errors.warehouse_id?.message}>
          <select className={`form-input ${errors.warehouse_id ? 'error' : ''}`} {...register('warehouse_id')}>
            <option value="">اختر المخزن</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormField>
        <FormField label="نوع التسوية" required>
          <select className="form-input" {...register('direction')}>
            <option value="adjustment_in">زيادة (+)</option>
            <option value="adjustment_out">نقص (-)</option>
          </select>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الصنف" required error={errors.item_id?.message}>
            <select className={`form-input ${errors.item_id ? 'error' : ''}`} {...register('item_id')}>
              <option value="">اختر الصنف</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="الكمية" required error={errors.quantity?.message}>
          <input type="number" step="0.001" className="form-input ltr" {...register('quantity')} dir="ltr" />
        </FormField>
        <FormField label="تكلفة الوحدة (اختياري)">
          <input type="number" step="0.01" className="form-input ltr" {...register('unit_cost')} dir="ltr" />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="سبب التسوية" required error={errors.notes?.message}>
            <textarea className={`form-input ${errors.notes ? 'error' : ''}`} rows={2} {...register('notes')} placeholder="جرد فعلي، تلف، خطأ إدخال..." />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function StockMovementsPage() {
  const { user } = useAuthStore()
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterType, setFilterType]           = useState('')

  const [transferOpen, setTransferOpen]     = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)

  const filters = {
    warehouse_id:  filterWarehouse || undefined,
    movement_type: filterType || undefined,
    limit: 150,
  }
  const { data: movements = [], isLoading } = useStockMovements(filters)
  const { data: warehouses = [] } = useWarehouses({ is_active: true })

  const transferMutation   = useTransferStock()
  const adjustmentMutation = useCreateMovement()

  const handleTransfer = async (data) => {
    await transferMutation.mutateAsync({ ...data, created_by: user.id })
    setTransferOpen(false)
  }

  const handleAdjustment = async (data) => {
    const { direction, ...rest } = data
    await adjustmentMutation.mutateAsync({
      ...rest,
      movement_type:  direction,
      reference_type: 'adjustment',
      created_by:     user.id,
    })
    setAdjustmentOpen(false)
  }

  const inCount  = movements.filter(m => m.movement_type.includes('_in')).length
  const outCount = movements.filter(m => m.movement_type.includes('_out')).length
  const transferCount = movements.filter(m => m.movement_type.startsWith('transfer')).length

  const stats = [
    { label: 'إجمالي الحركات', value: movements.length, color: '#3d62f3' },
    { label: 'حركات وارد',     value: inCount,  color: '#16a34a' },
    { label: 'حركات صادر',     value: outCount, color: '#dc2626' },
    { label: 'تحويلات',        value: transferCount, color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="حركات المخزون"
        subtitle="سجل كامل لكل حركات الدخول والخروج والتحويل"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setAdjustmentOpen(true)}>
              <SlidersHorizontal size={15} /> تسوية جرد
            </button>
            <button className="btn btn-primary" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight size={16} /> تحويل بين مخازن
            </button>
          </>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
          <option value="">كل المخازن</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="form-input" style={{ width: 180, height: 36 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">كل أنواع الحركات</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : movements.length === 0 ? (
        <div className="card">
          <EmptyState icon={Package} title="لا يوجد حركات مخزون بعد" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>المخزن</th>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>الرصيد بعد الحركة</th>
                  <th>بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const meta = MOVEMENT_LABELS[m.movement_type] || { label: m.movement_type, color: '#6b7280', icon: Package }
                  const Icon = meta.icon
                  const isIn = m.movement_type.includes('_in')
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(m.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                          background: meta.color + '15', color: meta.color,
                        }}>
                          <Icon size={11} /> {meta.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{m.warehouse?.name}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.item?.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.item?.code}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                          {isIn ? '+' : '−'}{(+m.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })} {m.item?.unit}
                        </span>
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {m.balance_after != null ? (+m.balance_after).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{m.created_by_profile?.full_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            آخر {movements.length} حركة
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <Modal
        open={transferOpen} onClose={() => setTransferOpen(false)}
        title="تحويل بين مخازن" size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setTransferOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="transfer-form" type="submit" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تنفيذ التحويل'}
            </button>
          </>
        }
      >
        <TransferForm onSubmit={handleTransfer} />
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        open={adjustmentOpen} onClose={() => setAdjustmentOpen(false)}
        title="تسوية جرد" size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAdjustmentOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="adjustment-form" type="submit" disabled={adjustmentMutation.isPending}>
              {adjustmentMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تسجيل التسوية'}
            </button>
          </>
        }
      >
        <AdjustmentForm onSubmit={handleAdjustment} />
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
