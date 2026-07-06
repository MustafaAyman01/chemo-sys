import { useState } from 'react'
import { Plus, Edit2, PowerOff, Building2, Phone, Mail, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useCustomers'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const customerSchema = z.object({
  name:               z.string().min(2, 'الاسم مطلوب'),
  name_ar:            z.string().optional(),
  industry:           z.string().optional(),
  city:               z.string().optional(),
  address:            z.string().optional(),
  tax_number:         z.string().min(3, 'الرقم الضريبي مطلوب'),
  commercial_register:z.string().optional(),
  contact_person:     z.string().optional(),
  email:              z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  phone:              z.string().optional(),
  payment_terms_days: z.coerce.number().min(0).default(30),
  credit_limit:       z.coerce.number().optional(),
  notes:              z.string().optional(),
})

const INDUSTRIES = [
  { value: 'construction',    label: 'مقاولات وإنشاءات' },
  { value: 'ceramics',        label: 'سيراميك' },
  { value: 'electrical',      label: 'كهربائيات' },
  { value: 'pharmaceutical',  label: 'أدوية' },
  { value: 'textile',         label: 'نسيج' },
  { value: 'plastics',        label: 'بلاستيك' },
  { value: 'paint',           label: 'دهانات' },
  { value: 'food',            label: 'صناعات غذائية' },
  { value: 'other',           label: 'أخرى' },
]

function IndustryBadge({ industry }) {
  const found = INDUSTRIES.find(i => i.value === industry)
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#f0f4ff', color: '#3d62f3' }}>
      {found?.label || industry || '—'}
    </span>
  )
}

// ── Form ──────────────────────────────────────────────────────
function CustomerForm({ defaultValues, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues || { payment_terms_days: 30 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="customer-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="اسم الشركة (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Hassan Allam Construction" />
        </FormField>
        <FormField label="اسم الشركة (عربي)">
          <input className="form-input" {...register('name_ar')} />
        </FormField>
        <FormField label="القطاع">
          <select className="form-input" {...register('industry')}>
            <option value="">اختر القطاع</option>
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </FormField>
        <FormField label="المدينة">
          <input className="form-input" {...register('city')} placeholder="القاهرة" />
        </FormField>
        <FormField label="الرقم الضريبي" required error={errors.tax_number?.message}>
          <input className={`form-input ltr ${errors.tax_number ? 'error' : ''}`} {...register('tax_number')} dir="ltr" placeholder="200-123-456" />
        </FormField>
        <FormField label="السجل التجاري">
          <input className="form-input" {...register('commercial_register')} />
        </FormField>
        <FormField label="مسؤول التواصل">
          <input className="form-input" {...register('contact_person')} />
        </FormField>
        <FormField label="رقم الهاتف">
          <input className="form-input ltr" {...register('phone')} dir="ltr" />
        </FormField>
        <FormField label="البريد الإلكتروني" error={errors.email?.message}>
          <input className="form-input ltr" type="email" {...register('email')} dir="ltr" />
        </FormField>
        <FormField label="شروط الدفع (أيام)">
          <input type="number" className="form-input ltr" {...register('payment_terms_days')} dir="ltr" />
        </FormField>
        <FormField label="حد الائتمان (EGP)">
          <input type="number" className="form-input ltr" {...register('credit_limit')} dir="ltr" placeholder="0" />
        </FormField>
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

// ── Main Page ─────────────────────────────────────────────────
export default function CustomersPage() {
  const [search, setSearch]         = useState('')
  const [filterIndustry, setIndustry] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen]       = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filters = { search, industry: filterIndustry || undefined, is_active: showInactive ? undefined : true }
  const { data: customers = [], isLoading } = useCustomers(filters)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const openCreate = () => { setEditCustomer(null); setModalOpen(true) }
  const openEdit   = (c) => { setEditCustomer(c);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditCustomer(null) }

  const handleSubmit = async (data) => {
    if (editCustomer) {
      await updateMutation.mutateAsync({ id: editCustomer.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const active        = customers.filter(c => c.is_active).length
  const overCredit     = customers.filter(c => c.credit_limit && c.current_balance > c.credit_limit).length
  const totalBalance   = customers.reduce((s, c) => s + (+c.current_balance || 0), 0)

  const stats = [
    { label: 'إجمالي العملاء',  value: customers.length, color: '#3d62f3' },
    { label: 'عملاء نشطين',     value: active,            color: '#16a34a' },
    { label: 'تجاوزوا حد الائتمان', value: overCredit,     color: '#dc2626' },
    { label: 'إجمالي الأرصدة (EGP)', value: totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle="الشركات التي نبيع لها المنتجات النهائية"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة عميل
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود..." />
        <select className="form-input" style={{ width: 180, height: 36 }} value={filterIndustry} onChange={e => setIndustry(e.target.value)}>
          <option value="">كل القطاعات</option>
          {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          عرض غير النشطين
        </label>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : customers.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title="لا يوجد عملاء"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة عميل</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الشركة</th>
                  <th>القطاع</th>
                  <th>مسؤول التواصل</th>
                  <th>الرصيد الحالي</th>
                  <th>حد الائتمان</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const overLimit = c.credit_limit && c.current_balance > c.credit_limit
                  return (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{c.code}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                        {c.name_ar && <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.name_ar}</div>}
                      </td>
                      <td><IndustryBadge industry={c.industry} /></td>
                      <td>
                        <div style={{ fontSize: 13 }}>{c.contact_person || '—'}</div>
                        {c.phone && <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.phone}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: 'Inter', fontWeight: 700, color: overLimit ? '#dc2626' : '#1a1d23' }}>
                            {(+c.current_balance).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                          {overLimit && <AlertCircle size={13} color="#dc2626" />}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: '#6b7280' }}>
                        {c.credit_limit ? (+c.credit_limit).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td><StatusBadge status={c.is_active ? 'active' : 'inactive'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: c.is_active ? '#dc2626' : '#16a34a' }}
                            onClick={() => setDeleteTarget(c)}>
                            <PowerOff size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {customers.length} عميل
          </div>
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editCustomer ? `تعديل — ${editCustomer.name}` : 'إضافة عميل جديد'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="customer-form" type="submit">
              {editCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
            </button>
          </>
        }
      >
        <CustomerForm defaultValues={editCustomer} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        loading={deleteMutation.isPending} danger
        title={deleteTarget?.is_active ? 'إيقاف العميل' : 'تفعيل العميل'}
        message={`هل تريد ${deleteTarget?.is_active ? 'إيقاف' : 'تفعيل'} "${deleteTarget?.name}"؟`}
      />
    </div>
  )
}
