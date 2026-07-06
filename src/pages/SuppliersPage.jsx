import { useState } from 'react'
import { Plus, Edit2, PowerOff, Globe, Phone, Mail, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../hooks/useSuppliers'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, Select, StatsRow,
} from '../components/ui'

// ── Validation Schema ─────────────────────────────────────────
const supplierSchema = z.object({
  name:               z.string().min(2, 'الاسم مطلوب'),
  name_ar:            z.string().optional(),
  country:            z.string().min(2, 'الدولة مطلوبة'),
  city:               z.string().optional(),
  address:            z.string().optional(),
  tax_number:         z.string().optional(),
  commercial_register:z.string().optional(),
  contact_person:     z.string().optional(),
  email:              z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  phone:              z.string().optional(),
  website:            z.string().optional(),
  currency:           z.string().default('USD'),
  payment_terms_days: z.coerce.number().min(0).default(30),
  credit_limit:       z.coerce.number().optional(),
  notes:              z.string().optional(),
})

const CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED']
const COUNTRIES = [
  'Egypt', 'Germany', 'USA', 'UK', 'France', 'China', 'India',
  'Saudi Arabia', 'UAE', 'Switzerland', 'Netherlands', 'Belgium',
  'Italy', 'Spain', 'Turkey', 'South Korea', 'Japan',
]

// ── Supplier Form ─────────────────────────────────────────────
function SupplierForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues || { currency: 'USD', payment_terms_days: 30 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="supplier-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <FormField label="اسم المورد (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="KRONOS Worldwide" />
        </FormField>

        <FormField label="اسم المورد (عربي)" error={errors.name_ar?.message}>
          <input className="form-input" {...register('name_ar')} placeholder="كرونوس للتيتانيوم" />
        </FormField>

        <FormField label="الدولة" required error={errors.country?.message}>
          <select className={`form-input ${errors.country ? 'error' : ''}`} {...register('country')}>
            <option value="">اختر الدولة</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>

        <FormField label="المدينة" error={errors.city?.message}>
          <input className="form-input" {...register('city')} placeholder="Berlin" />
        </FormField>

        <FormField label="مسؤول التواصل" error={errors.contact_person?.message}>
          <input className="form-input" {...register('contact_person')} placeholder="John Smith" />
        </FormField>

        <FormField label="رقم الهاتف" error={errors.phone?.message}>
          <input className="form-input ltr" {...register('phone')} placeholder="+49-214-888-0" dir="ltr" />
        </FormField>

        <FormField label="البريد الإلكتروني" error={errors.email?.message}>
          <input className="form-input ltr" type="email" {...register('email')} placeholder="contact@supplier.com" dir="ltr" />
        </FormField>

        <FormField label="الموقع الإلكتروني" error={errors.website?.message}>
          <input className="form-input ltr" {...register('website')} placeholder="https://supplier.com" dir="ltr" />
        </FormField>

        <FormField label="الرقم الضريبي" error={errors.tax_number?.message}>
          <input className="form-input" {...register('tax_number')} />
        </FormField>

        <FormField label="السجل التجاري" error={errors.commercial_register?.message}>
          <input className="form-input" {...register('commercial_register')} />
        </FormField>

        <FormField label="العملة" error={errors.currency?.message}>
          <select className="form-input" {...register('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>

        <FormField label="شروط الدفع (أيام)" error={errors.payment_terms_days?.message}>
          <input className="form-input ltr" type="number" {...register('payment_terms_days')} dir="ltr" />
        </FormField>

        <FormField label="حد الائتمان" error={errors.credit_limit?.message}>
          <input className="form-input ltr" type="number" {...register('credit_limit')} placeholder="0" dir="ltr" />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="العنوان" error={errors.address?.message}>
            <input className="form-input" {...register('address')} />
          </FormField>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ملاحظات" error={errors.notes?.message}>
            <textarea className="form-input" rows={3} {...register('notes')} />
          </FormField>
        </div>

      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SuppliersPage() {
  const [search, setSearch]           = useState('')
  const [filterCountry, setCountry]   = useState('')
  const [filterCurrency, setCurrency] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen]       = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filters = {
    search,
    country:   filterCountry  || undefined,
    currency:  filterCurrency || undefined,
    is_active: showInactive ? undefined : true,
  }

  const { data: suppliers = [], isLoading } = useSuppliers(filters)
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const openCreate = () => { setEditSupplier(null); setModalOpen(true) }
  const openEdit   = (s) => { setEditSupplier(s);   setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditSupplier(null) }

  const handleSubmit = async (data) => {
    if (editSupplier) {
      await updateMutation.mutateAsync({ id: editSupplier.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  // Stats
  const active   = suppliers.filter(s => s.is_active).length
  const byCountry = [...new Set(suppliers.map(s => s.country))].length

  const stats = [
    { label: 'إجمالي الموردين',  value: suppliers.length, color: '#3d62f3' },
    { label: 'موردين نشطين',     value: active,           color: '#16a34a' },
    { label: 'دول مختلفة',       value: byCountry,        color: '#21aaa3' },
    { label: 'موردين محليين',    value: suppliers.filter(s => s.country === 'Egypt').length, color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="الموردين"
        subtitle="إدارة موردي الخامات والمواد"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة مورد
          </button>
        }
      />

      <StatsRow stats={stats} />

      {/* Filters */}
      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود..." />

        <select className="form-input" style={{ width: 160, height: 36 }}
          value={filterCountry} onChange={e => setCountry(e.target.value)}>
          <option value="">كل الدول</option>
          {[...new Set(suppliers.map(s => s.country))].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select className="form-input" style={{ width: 140, height: 36 }}
          value={filterCurrency} onChange={e => setCurrency(e.target.value)}>
          <option value="">كل العملات</option>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          عرض غير النشطين
        </label>
      </FiltersBar>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : suppliers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Globe}
            title="لا يوجد موردين"
            subtitle="ابدأ بإضافة أول مورد للنظام"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة مورد</button>}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>المورد</th>
                  <th>الدولة</th>
                  <th>مسؤول التواصل</th>
                  <th>العملة</th>
                  <th>شروط الدفع</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                        {s.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1d23', fontSize: 13.5 }}>{s.name}</div>
                      {s.name_ar && <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.name_ar}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <Globe size={13} color="#9ca3af" />
                        {s.country}{s.city ? ` — ${s.city}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{s.contact_person || '—'}</div>
                      {s.email && (
                        <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Mail size={10} /> {s.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>
                        {s.currency}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>{s.payment_terms_days} يوم</span>
                    </td>
                    <td>
                      <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="تعديل" onClick={() => openEdit(s)}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title={s.is_active ? 'إيقاف' : 'تفعيل'}
                          onClick={() => setDeleteTarget(s)}
                          style={{ color: s.is_active ? '#dc2626' : '#16a34a' }}
                        >
                          <PowerOff size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {suppliers.length} مورد
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editSupplier ? `تعديل — ${editSupplier.name}` : 'إضافة مورد جديد'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button
              className="btn btn-primary"
              form="supplier-form"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                : editSupplier ? 'حفظ التعديلات' : 'إضافة المورد'
              }
            </button>
          </>
        }
      >
        <SupplierForm
          defaultValues={editSupplier}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Confirm Deactivate */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
        title={deleteTarget?.is_active ? 'إيقاف المورد' : 'تفعيل المورد'}
        message={`هل تريد ${deleteTarget?.is_active ? 'إيقاف' : 'تفعيل'} المورد "${deleteTarget?.name}"؟`}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
