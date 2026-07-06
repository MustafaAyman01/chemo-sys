import { useState } from 'react'
import { Plus, Edit2, Factory as FactoryIcon, Building2, Calendar, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useFactories, useCreateFactory, useUpdateFactory } from '../hooks/useProduction'
import { useWarehouses } from '../hooks/useWarehouses'
import {
  PageHeader, FiltersBar, EmptyState, Modal, FormField, StatsRow, StatusBadge,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const factorySchema = z.object({
  name:             z.string().min(2, 'الاسم مطلوب'),
  name_ar:          z.string().optional(),
  type:             z.string().min(1, 'اختر النوع'),
  warehouse_id:     z.string().optional(),
  city:             z.string().optional(),
  address:          z.string().optional(),
  contact_person:   z.string().optional(),
  phone:            z.string().optional(),
  capacity_per_day: z.coerce.number().min(0).optional(),
  cost_per_ton:     z.coerce.number().min(0).optional(),
  contract_start_date: z.string().optional(),
  contract_end_date:   z.string().optional(),
  notes:            z.string().optional(),
})

function FactoryForm({ defaultValues, onSubmit }) {
  const { data: warehouses = [] } = useWarehouses({ is_active: true })
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(factorySchema),
    defaultValues: defaultValues || { type: 'owned' },
  })
  const type = watch('type')

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="factory-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="اسم المصنع (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} />
        </FormField>
        <FormField label="اسم المصنع (عربي)">
          <input className="form-input" {...register('name_ar')} />
        </FormField>
        <FormField label="النوع" required error={errors.type?.message}>
          <select className="form-input" {...register('type')}>
            <option value="owned">مصنع رئيسي (ملك الشركة)</option>
            <option value="external">مصنع خارجي (تصنيع لحساب الغير)</option>
          </select>
        </FormField>
        <FormField label="المخزن المرتبط">
          <select className="form-input" {...register('warehouse_id')}>
            <option value="">بدون</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormField>
        <FormField label="المدينة">
          <input className="form-input" {...register('city')} />
        </FormField>
        <FormField label="مسؤول التواصل">
          <input className="form-input" {...register('contact_person')} />
        </FormField>
        <FormField label="رقم الهاتف">
          <input className="form-input ltr" {...register('phone')} dir="ltr" />
        </FormField>
        <FormField label="الطاقة الإنتاجية (طن/يوم)">
          <input type="number" className="form-input ltr" {...register('capacity_per_day')} dir="ltr" />
        </FormField>

        {type === 'external' && (
          <>
            <FormField label="تكلفة التصنيع (لكل طن)">
              <input type="number" step="0.01" className="form-input ltr" {...register('cost_per_ton')} dir="ltr" placeholder="EGP" />
            </FormField>
            <FormField label="بداية العقد">
              <input type="date" className="form-input ltr" {...register('contract_start_date')} />
            </FormField>
            <FormField label="نهاية العقد">
              <input type="date" className="form-input ltr" {...register('contract_end_date')} />
            </FormField>
          </>
        )}

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

export default function FactoriesPage() {
  const [filterType, setFilterType] = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editFactory, setEditFactory] = useState(null)

  const filters = { type: filterType || undefined, is_active: true }
  const { data: factories = [], isLoading } = useFactories(filters)
  const createMutation = useCreateFactory()
  const updateMutation = useUpdateFactory()

  const openCreate = () => { setEditFactory(null); setModalOpen(true) }
  const openEdit   = (f) => { setEditFactory(f);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditFactory(null) }

  const handleSubmit = async (data) => {
    if (editFactory) {
      await updateMutation.mutateAsync({ id: editFactory.id, ...data })
    } else {
      const prefix = data.type === 'owned' ? 'FAC-MAIN' : 'FAC-EXT'
      const count = factories.filter(f => f.type === data.type).length
      data.code = data.type === 'owned' ? prefix : `${prefix}-${count + 1}`
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const owned    = factories.filter(f => f.type === 'owned').length
  const external = factories.filter(f => f.type === 'external').length
  const totalCapacity = factories.reduce((s, f) => s + (+f.capacity_per_day || 0), 0)

  const stats = [
    { label: 'إجمالي المصانع',     value: factories.length, color: '#3d62f3' },
    { label: 'مصنع رئيسي',         value: owned,             color: '#16a34a' },
    { label: 'مصانع خارجية',       value: external,          color: '#f59e0b' },
    { label: 'الطاقة الإجمالية (طن/يوم)', value: totalCapacity, color: '#8b5cf6' },
  ]

  return (
    <div>
      <PageHeader
        title="المصانع"
        subtitle="المصنع الرئيسي ومصانع التصنيع الخارجية (Toll Manufacturing)"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة مصنع
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="owned">مصنع رئيسي</option>
          <option value="external">مصنع خارجي</option>
        </select>
      </FiltersBar>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />)}
        </div>
      ) : factories.length === 0 ? (
        <div className="card">
          <EmptyState icon={FactoryIcon} title="لا يوجد مصانع"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة مصنع</button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {factories.map(f => {
            const isExternal = f.type === 'external'
            const contractActive = f.contract_end_date ? new Date(f.contract_end_date) > new Date() : null

            return (
              <div key={f.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isExternal ? '#fffbeb' : '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isExternal ? <Building2 size={21} color="#b45309" /> : <FactoryIcon size={21} color="#16a34a" />}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                    background: isExternal ? '#fffbeb' : '#f0fdf4',
                    color: isExternal ? '#b45309' : '#15803d',
                  }}>
                    {isExternal ? 'مصنع خارجي' : 'مصنع رئيسي'}
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', marginBottom: 2 }}>{f.name}</h3>
                {f.name_ar && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>{f.name_ar}</p>}

                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  📍 {f.city || '—'} {f.contact_person ? `· ${f.contact_person}` : ''}
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>الطاقة الإنتاجية</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Inter' }}>
                      {f.capacity_per_day ? `${f.capacity_per_day} طن/يوم` : '—'}
                    </div>
                  </div>
                  {isExternal && f.cost_per_ton && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>تكلفة التصنيع</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Inter', color: '#b45309' }}>
                        {(+f.cost_per_ton).toLocaleString()} EGP/طن
                      </div>
                    </div>
                  )}
                </div>

                {isExternal && f.contract_end_date && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 14,
                    background: contractActive ? '#f0fdf4' : '#fef2f2',
                    color: contractActive ? '#15803d' : '#dc2626',
                  }}>
                    <Calendar size={13} />
                    العقد حتى {f.contract_end_date} {!contractActive && '(منتهي)'}
                  </div>
                )}

                {f.warehouse && (
                  <div style={{ fontSize: 12, color: '#3d62f3', marginBottom: 12 }}>
                    🏪 مرتبط بمخزن: {f.warehouse.name}
                  </div>
                )}

                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => openEdit(f)}>
                  <Edit2 size={13} /> تعديل
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editFactory ? `تعديل — ${editFactory.name}` : 'إضافة مصنع جديد'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="factory-form" type="submit">
              {editFactory ? 'حفظ التعديلات' : 'إضافة المصنع'}
            </button>
          </>
        }
      >
        <FactoryForm defaultValues={editFactory} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
