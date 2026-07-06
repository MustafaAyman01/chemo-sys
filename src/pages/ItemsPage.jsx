import { useState } from 'react'
import { Plus, Edit2, FlaskConical, AlertTriangle, Package2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useItems, useCreateItem, useUpdateItem } from '../hooks/useItems'
import { useAllStock } from '../hooks/useWarehouses'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const itemSchema = z.object({
  name:               z.string().min(2, 'الاسم مطلوب'),
  name_ar:            z.string().optional(),
  category:           z.string().min(1, 'اختر التصنيف'),
  subcategory:        z.string().optional(),
  unit:               z.string().min(1, 'اختر الوحدة'),
  cas_number:         z.string().optional(),
  hsn_code:           z.string().optional(),
  hazard_class:       z.string().optional(),
  storage_conditions: z.string().optional(),
  minimum_stock:      z.coerce.number().min(0).default(0),
  reorder_point:      z.coerce.number().min(0).default(0),
  description:        z.string().optional(),
  technical_specs:    z.string().optional(),
})

const CATEGORIES = [
  { value: 'raw_material',     label: 'خامة' },
  { value: 'finished_product', label: 'منتج نهائي' },
  { value: 'packaging',        label: 'تغليف' },
  { value: 'spare_part',       label: 'قطع غيار' },
  { value: 'chemical',         label: 'كيماوي' },
]

const UNITS = ['kg', 'ton', 'liter', 'drum', 'bag', 'unit']
const UNIT_LABELS = { kg: 'كجم', ton: 'طن', liter: 'لتر', drum: 'برميل', bag: 'شيكارة', unit: 'وحدة' }

const CATEGORY_COLORS = {
  raw_material:     { bg: '#eff6ff', color: '#1d4ed8', label: 'خامة' },
  finished_product: { bg: '#f0fdf4', color: '#15803d', label: 'منتج نهائي' },
  packaging:        { bg: '#fffbeb', color: '#b45309', label: 'تغليف' },
  spare_part:       { bg: '#f5f3ff', color: '#7c3aed', label: 'قطع غيار' },
  chemical:         { bg: '#fef2f2', color: '#b91c1c', label: 'كيماوي' },
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] || { bg: '#f3f4f6', color: '#6b7280', label: category }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

// ── Item Form ─────────────────────────────────────────────────
function ItemForm({ defaultValues, onSubmit }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: defaultValues || { category: 'raw_material', unit: 'kg', minimum_stock: 0, reorder_point: 0 },
  })

  const category = watch('category')

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="item-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <FormField label="اسم الصنف (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Titanium Dioxide" />
        </FormField>

        <FormField label="اسم الصنف (عربي)">
          <input className="form-input" {...register('name_ar')} placeholder="ثاني أكسيد التيتانيوم" />
        </FormField>

        <FormField label="التصنيف" required error={errors.category?.message}>
          <select className={`form-input ${errors.category ? 'error' : ''}`} {...register('category')}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>

        <FormField label="وحدة القياس" required error={errors.unit?.message}>
          <select className="form-input" {...register('unit')}>
            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </FormField>

        {(category === 'raw_material' || category === 'chemical') && (
          <>
            <FormField label="رقم CAS">
              <input className="form-input ltr" {...register('cas_number')} placeholder="13463-67-7" dir="ltr" />
            </FormField>

            <FormField label="تصنيف الخطورة (UN)">
              <input className="form-input ltr" {...register('hazard_class')} placeholder="UN3077" dir="ltr" />
            </FormField>
          </>
        )}

        <FormField label="كود التعريفة الجمركية (HSN)">
          <input className="form-input ltr" {...register('hsn_code')} placeholder="3206.11" dir="ltr" />
        </FormField>

        <FormField label="الحد الأدنى للمخزون">
          <input type="number" step="0.001" className="form-input ltr" {...register('minimum_stock')} dir="ltr" />
        </FormField>

        <FormField label="نقطة إعادة الطلب">
          <input type="number" step="0.001" className="form-input ltr" {...register('reorder_point')} dir="ltr" />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ظروف التخزين">
            <input className="form-input" {...register('storage_conditions')} placeholder="مكان جاف بعيد عن أشعة الشمس" />
          </FormField>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الوصف / المواصفات الفنية">
            <textarea className="form-input" rows={3} {...register('technical_specs')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ItemsPage() {
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem]   = useState(null)

  const filters = { search, category: filterCat || undefined, is_active: true }
  const { data: items = [], isLoading } = useItems(filters)
  const { data: allStock = [] } = useAllStock()

  const createMutation = useCreateItem()
  const updateMutation = useUpdateItem()

  const openCreate = () => { setEditItem(null); setModalOpen(true) }
  const openEdit   = (i) => { setEditItem(i);   setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null) }

  const handleSubmit = async (data) => {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, ...data })
    } else {
      // Auto code
      const prefix = data.category === 'raw_material' ? 'RM' : data.category === 'finished_product' ? 'FP' : 'PKG'
      const { count } = { count: items.filter(i => i.category === data.category).length }
      data.code = `${prefix}-${String(count + 1).padStart(3, '0')}`
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  // Get total stock per item (across all warehouses)
  const getItemStock = (itemId) => {
    return allStock
      .filter(s => s.item_id === itemId)
      .reduce((sum, s) => sum + (+s.quantity || 0), 0)
  }

  const isLowStock = (item) => {
    const total = getItemStock(item.id)
    return item.reorder_point > 0 && total <= item.reorder_point
  }

  const lowStockCount = items.filter(isLowStock).length
  const rawCount = items.filter(i => i.category === 'raw_material').length
  const fpCount  = items.filter(i => i.category === 'finished_product').length

  const stats = [
    { label: 'إجمالي الأصناف', value: items.length, color: '#3d62f3' },
    { label: 'خامات',          value: rawCount,      color: '#1d4ed8' },
    { label: 'منتجات نهائية',  value: fpCount,        color: '#15803d' },
    { label: 'تحت حد الطلب',   value: lowStockCount,  color: '#dc2626' },
  ]

  return (
    <div>
      <PageHeader
        title="الأصناف"
        subtitle="إدارة الخامات والمنتجات النهائية ومواد التغليف"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة صنف
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود..." />
        <select className="form-input" style={{ width: 160, height: 36 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState icon={FlaskConical} title="لا يوجد أصناف"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة صنف</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الصنف</th>
                  <th>التصنيف</th>
                  <th>الوحدة</th>
                  <th>الرصيد الكلي</th>
                  <th>الحد الأدنى</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const stock = getItemStock(item.id)
                  const low   = isLowStock(item)
                  return (
                    <tr key={item.id}>
                      <td><span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{item.code}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1a1d23' }}>{item.name}</div>
                        {item.name_ar && <div style={{ fontSize: 12, color: '#9ca3af' }}>{item.name_ar}</div>}
                        {item.hazard_class && (
                          <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginTop: 2 }}>⚠ {item.hazard_class}</div>
                        )}
                      </td>
                      <td><CategoryBadge category={item.category} /></td>
                      <td style={{ fontSize: 13 }}>{UNIT_LABELS[item.unit] || item.unit}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'Inter', fontWeight: 700, color: low ? '#dc2626' : '#1a1d23' }}>
                            {stock.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                          {low && <AlertTriangle size={13} color="#dc2626" />}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: '#6b7280' }}>
                        {item.reorder_point > 0 ? item.reorder_point.toLocaleString() : '—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)}>
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {items.length} صنف
          </div>
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editItem ? `تعديل — ${editItem.name}` : 'إضافة صنف جديد'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="item-form" type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? 'حفظ التعديلات' : 'إضافة الصنف'}
            </button>
          </>
        }
      >
        <ItemForm defaultValues={editItem} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
