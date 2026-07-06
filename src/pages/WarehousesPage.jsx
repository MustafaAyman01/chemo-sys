import { useState } from 'react'
import { Plus, Edit2, Warehouse as WhIcon, Building2, ShieldCheck, Thermometer, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useWarehouseStock } from '../hooks/useWarehouses'
import {
  PageHeader, FiltersBar, EmptyState, TableSkeleton, Modal, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const warehouseSchema = z.object({
  name:               z.string().min(2, 'الاسم مطلوب'),
  name_ar:            z.string().optional(),
  type:               z.string().min(1, 'اختر النوع'),
  factory_type:       z.string().optional(),
  city:               z.string().optional(),
  address:            z.string().optional(),
  contact_person:     z.string().optional(),
  phone:              z.string().optional(),
  capacity_tons:      z.coerce.number().min(0).optional(),
  temperature_controlled: z.boolean().default(false),
  hazmat_certified:   z.boolean().default(false),
  notes:              z.string().optional(),
})

const TYPES = [
  { value: 'main',             label: 'مخزن رئيسي (خامات)' },
  { value: 'finished_goods',   label: 'مخزن منتجات نهائية' },
  { value: 'external_factory', label: 'مخزن مصنع خارجي' },
  { value: 'transit',          label: 'مخزن ترانزيت' },
]

const TYPE_COLORS = {
  main:             { bg: '#eff6ff', color: '#1d4ed8', label: 'رئيسي' },
  finished_goods:   { bg: '#f0fdf4', color: '#15803d', label: 'منتج نهائي' },
  external_factory: { bg: '#fffbeb', color: '#b45309', label: 'مصنع خارجي' },
  transit:          { bg: '#f5f3ff', color: '#7c3aed', label: 'ترانزيت' },
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#6b7280', label: type }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.color }}>{c.label}</span>
}

// ── Form ──────────────────────────────────────────────────────
function WarehouseForm({ defaultValues, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: defaultValues || { type: 'main', temperature_controlled: false, hazmat_certified: false },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="warehouse-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="اسم المخزن (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} />
        </FormField>
        <FormField label="اسم المخزن (عربي)">
          <input className="form-input" {...register('name_ar')} />
        </FormField>
        <FormField label="النوع" required error={errors.type?.message}>
          <select className="form-input" {...register('type')}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="المدينة">
          <input className="form-input" {...register('city')} />
        </FormField>
        <FormField label="مسؤول المخزن">
          <input className="form-input" {...register('contact_person')} />
        </FormField>
        <FormField label="رقم الهاتف">
          <input className="form-input ltr" {...register('phone')} dir="ltr" />
        </FormField>
        <FormField label="السعة (طن)">
          <input type="number" className="form-input ltr" {...register('capacity_tons')} dir="ltr" />
        </FormField>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, paddingBottom: 9 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" {...register('temperature_controlled')} /> تحكم بدرجة الحرارة
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" {...register('hazmat_certified')} /> معتمد للمواد الخطرة
          </label>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="العنوان">
            <input className="form-input" {...register('address')} />
          </FormField>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ملاحظات">
            <textarea className="form-input" rows={2} {...register('notes')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ── Warehouse Detail (stock inside it) ───────────────────────
function WarehouseDetailModal({ warehouse, open, onClose }) {
  const { data: stock = [], isLoading } = useWarehouseStock(warehouse?.id)

  return (
    <Modal open={open} onClose={onClose} title={warehouse ? `مخزون — ${warehouse.name}` : ''} size="lg">
      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : stock.length === 0 ? (
        <EmptyState icon={WhIcon} title="لا يوجد مخزون في هذا المخزن حالياً" />
      ) : (
        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>محجوز</th>
                <th>متاح</th>
                <th>متوسط التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.item?.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.item?.code}</div>
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {(+s.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })} {s.item?.unit}
                  </td>
                  <td className="num" style={{ color: '#9ca3af' }}>
                    {(+s.reserved_quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="num" style={{ color: '#16a34a', fontWeight: 600 }}>
                    {(+s.available_quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="num">
                    {(+s.avg_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function WarehousesPage() {
  const [filterType, setFilterType] = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editWh, setEditWh]         = useState(null)
  const [viewWh, setViewWh]         = useState(null)

  const filters = { type: filterType || undefined, is_active: true }
  const { data: warehouses = [], isLoading } = useWarehouses(filters)
  const { data: allStock = [] } = useWarehouseStock(null)

  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()

  const openCreate = () => { setEditWh(null); setModalOpen(true) }
  const openEdit   = (w) => { setEditWh(w);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditWh(null) }

  const handleSubmit = async (data) => {
    if (editWh) {
      await updateMutation.mutateAsync({ id: editWh.id, ...data })
    } else {
      const { count } = { count: warehouses.length }
      data.code = `WH-${String(count + 1).padStart(3, '0')}`
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const getWarehouseItemCount = (whId) => {
    return allStock.filter(s => s.warehouse_id === whId && +s.quantity > 0).length
  }

  const getWarehouseTotalQty = (whId) => {
    return allStock
      .filter(s => s.warehouse_id === whId)
      .reduce((sum, s) => sum + (+s.quantity || 0), 0)
  }

  const stats = [
    { label: 'إجمالي المخازن',  value: warehouses.length, color: '#3d62f3' },
    { label: 'مخازن رئيسية',    value: warehouses.filter(w => w.type === 'main').length, color: '#1d4ed8' },
    { label: 'مصانع خارجية',    value: warehouses.filter(w => w.type === 'external_factory').length, color: '#b45309' },
    { label: 'معتمدة للمواد الخطرة', value: warehouses.filter(w => w.hazmat_certified).length, color: '#dc2626' },
  ]

  return (
    <div>
      <PageHeader
        title="المخازن"
        subtitle="إدارة المخزن الرئيسي ومخازن المصانع الخارجية"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة مخزن
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">كل الأنواع</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </FiltersBar>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="card">
          <EmptyState icon={WhIcon} title="لا يوجد مخازن"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة مخزن</button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {warehouses.map(wh => {
            const itemCount = getWarehouseItemCount(wh.id)
            const totalQty  = getWarehouseTotalQty(wh.id)
            const fillPct   = wh.capacity_tons ? Math.min(100, (totalQty / wh.capacity_tons) * 100) : null

            return (
              <div key={wh.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: wh.type === 'external_factory' ? '#fffbeb' : '#f0f4ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {wh.type === 'external_factory'
                      ? <Building2 size={20} color="#b45309" />
                      : <WhIcon size={20} color="#3d62f3" />}
                  </div>
                  <TypeBadge type={wh.type} />
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 2 }}>{wh.name}</h3>
                {wh.name_ar && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{wh.name_ar}</p>}

                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  {wh.city || '—'} {wh.contact_person ? `· ${wh.contact_person}` : ''}
                </div>

                {/* Stock info */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>عدد الأصناف</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>{itemCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>إجمالي الكمية</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Inter' }}>
                      {totalQty.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    </div>
                  </div>
                </div>

                {/* Capacity bar */}
                {fillPct !== null && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                      <span>السعة المستخدمة</span>
                      <span>{fillPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#f0f1f3', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${fillPct}%`, borderRadius: 99,
                        background: fillPct > 85 ? '#dc2626' : fillPct > 60 ? '#f59e0b' : '#16a34a',
                      }} />
                    </div>
                  </div>
                )}

                {/* Certifications */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {wh.hazmat_certified && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: 6 }}>
                      <ShieldCheck size={12} /> مواد خطرة
                    </span>
                  )}
                  {wh.temperature_controlled && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: 6 }}>
                      <Thermometer size={12} /> تحكم حراري
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setViewWh(wh)}>
                    <Eye size={13} /> عرض المخزون
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(wh)}>
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editWh ? `تعديل — ${editWh.name}` : 'إضافة مخزن جديد'} size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="warehouse-form" type="submit">
              {editWh ? 'حفظ التعديلات' : 'إضافة المخزن'}
            </button>
          </>
        }
      >
        <WarehouseForm defaultValues={editWh} onSubmit={handleSubmit} />
      </Modal>

      <WarehouseDetailModal warehouse={viewWh} open={!!viewWh} onClose={() => setViewWh(null)} />
    </div>
  )
}
