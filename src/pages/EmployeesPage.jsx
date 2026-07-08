import { useState } from 'react'
import { Plus, Edit2, UserX, Users, Mail, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeactivateEmployee, useDepartments } from '../hooks/useHR'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const employeeSchema = z.object({
  full_name:           z.string().min(2, 'الاسم مطلوب'),
  full_name_ar:        z.string().min(2, 'الاسم بالعربي مطلوب'),
  national_id:         z.string().min(10, 'الرقم القومي مطلوب (14 رقم)').max(14),
  department_id:       z.string().optional(),
  job_title:           z.string().min(2, 'المسمى الوظيفي مطلوب'),
  job_title_ar:        z.string().optional(),
  employment_type:     z.string().default('full_time'),
  hire_date:           z.string().min(1, 'تاريخ التعيين مطلوب'),
  base_salary:         z.coerce.number().min(1, 'الراتب الأساسي مطلوب'),
  housing_allowance:   z.coerce.number().min(0).default(0),
  transport_allowance: z.coerce.number().min(0).default(0),
  meal_allowance:      z.coerce.number().min(0).default(0),
  phone_allowance:     z.coerce.number().min(0).default(0),
  social_insurance_pct:z.coerce.number().min(0).max(100).default(11),
  bank_name:           z.string().optional(),
  bank_account:        z.string().optional(),
  notes:               z.string().optional(),
})

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'دوام كامل' },
  { value: 'part_time', label: 'دوام جزئي' },
  { value: 'contract',  label: 'تعاقد' },
  { value: 'daily',     label: 'يومية' },
]

function EmployeeForm({ defaultValues, onSubmit }) {
  const { data: departments = [] } = useDepartments()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: defaultValues || {
      employment_type: 'full_time', social_insurance_pct: 11,
      housing_allowance: 0, transport_allowance: 0, meal_allowance: 0, phone_allowance: 0,
      hire_date: new Date().toISOString().split('T')[0],
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="employee-form">
      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>البيانات الشخصية</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <FormField label="الاسم الكامل (إنجليزي)" required error={errors.full_name?.message}>
          <input className={`form-input ${errors.full_name ? 'error' : ''}`} {...register('full_name')} />
        </FormField>
        <FormField label="الاسم الكامل (عربي)" required error={errors.full_name_ar?.message}>
          <input className={`form-input ${errors.full_name_ar ? 'error' : ''}`} {...register('full_name_ar')} />
        </FormField>
        <FormField label="الرقم القومي" required error={errors.national_id?.message}>
          <input className={`form-input ltr ${errors.national_id ? 'error' : ''}`} {...register('national_id')} dir="ltr" maxLength={14} />
        </FormField>
        <FormField label="تاريخ التعيين" required error={errors.hire_date?.message}>
          <input type="date" className={`form-input ltr ${errors.hire_date ? 'error' : ''}`} {...register('hire_date')} />
        </FormField>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>البيانات الوظيفية</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <FormField label="القسم">
          <select className="form-input" {...register('department_id')}>
            <option value="">اختر القسم</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>)}
          </select>
        </FormField>
        <FormField label="نوع التوظيف">
          <select className="form-input" {...register('employment_type')}>
            {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="المسمى الوظيفي (إنجليزي)" required error={errors.job_title?.message}>
          <input className={`form-input ${errors.job_title ? 'error' : ''}`} {...register('job_title')} placeholder="Production Engineer" />
        </FormField>
        <FormField label="المسمى الوظيفي (عربي)">
          <input className="form-input" {...register('job_title_ar')} placeholder="مهندس إنتاج" />
        </FormField>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>الراتب والبدلات (شهرياً)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <FormField label="الراتب الأساسي" required error={errors.base_salary?.message}>
          <input type="number" className={`form-input ltr ${errors.base_salary ? 'error' : ''}`} {...register('base_salary')} dir="ltr" />
        </FormField>
        <FormField label="بدل سكن">
          <input type="number" className="form-input ltr" {...register('housing_allowance')} dir="ltr" />
        </FormField>
        <FormField label="بدل انتقال">
          <input type="number" className="form-input ltr" {...register('transport_allowance')} dir="ltr" />
        </FormField>
        <FormField label="بدل وجبة">
          <input type="number" className="form-input ltr" {...register('meal_allowance')} dir="ltr" />
        </FormField>
        <FormField label="بدل تليفون">
          <input type="number" className="form-input ltr" {...register('phone_allowance')} dir="ltr" />
        </FormField>
        <FormField label="نسبة التأمينات (الموظف %)">
          <input type="number" step="0.1" className="form-input ltr" {...register('social_insurance_pct')} dir="ltr" />
        </FormField>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>بيانات البنك</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <FormField label="اسم البنك">
          <input className="form-input" {...register('bank_name')} />
        </FormField>
        <FormField label="رقم الحساب / الآيبان">
          <input className="form-input ltr" {...register('bank_account')} dir="ltr" />
        </FormField>
      </div>

      <FormField label="ملاحظات">
        <textarea className="form-input" rows={2} {...register('notes')} />
      </FormField>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmployeesPage() {
  const [search, setSearch]       = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen]     = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const { data: departments = [] } = useDepartments()
  const filters = { search, department_id: filterDept || undefined, is_active: showInactive ? undefined : true }
  const { data: employees = [], isLoading } = useEmployees(filters)

  const createMutation     = useCreateEmployee()
  const updateMutation     = useUpdateEmployee()
  const deactivateMutation = useDeactivateEmployee()

  const openCreate = () => { setEditEmployee(null); setModalOpen(true) }
  const openEdit   = (e) => { setEditEmployee(e);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditEmployee(null) }

  const handleSubmit = async (data) => {
    if (editEmployee) {
      await updateMutation.mutateAsync({ id: editEmployee.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const handleDeactivate = async () => {
    await deactivateMutation.mutateAsync({ id: deactivateTarget.id })
    setDeactivateTarget(null)
  }

  const totalGross = employees.reduce((s, e) =>
    s + (+e.base_salary || 0) + (+e.housing_allowance || 0) + (+e.transport_allowance || 0)
    + (+e.meal_allowance || 0) + (+e.phone_allowance || 0), 0)

  const stats = [
    { label: 'إجمالي الموظفين', value: employees.length, color: '#3d62f3' },
    { label: 'أقسام نشطة',      value: departments.length, color: '#16a34a' },
    { label: 'إجمالي الرواتب الشهرية', value: totalGross.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#f59e0b' },
    { label: 'متوسط الراتب',    value: employees.length ? (totalGross / employees.length).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP' : '—', color: '#8b5cf6' },
  ]

  return (
    <div>
      <PageHeader
        title="الموظفين"
        subtitle="إدارة ملفات الموظفين والبيانات الوظيفية"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة موظف
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود..." />
        <select className="form-input" style={{ width: 180, height: 36 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">كل الأقسام</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          عرض غير النشطين
        </label>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : employees.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="لا يوجد موظفين"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة موظف</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الكود</th><th>الموظف</th><th>القسم</th><th>الوظيفة</th>
                  <th>تاريخ التعيين</th><th>الراتب الإجمالي</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const gross = (+emp.base_salary || 0) + (+emp.housing_allowance || 0) + (+emp.transport_allowance || 0) + (+emp.meal_allowance || 0) + (+emp.phone_allowance || 0)
                  return (
                    <tr key={emp.id}>
                      <td><span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{emp.employee_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{emp.full_name_ar}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{emp.full_name}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{emp.department?.name_ar || emp.department?.name || '—'}</td>
                      <td style={{ fontSize: 13 }}>{emp.job_title_ar || emp.job_title}</td>
                      <td style={{ fontSize: 13, color: '#6b7280' }}>{emp.hire_date}</td>
                      <td style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13 }}>
                        {gross.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP
                      </td>
                      <td><StatusBadge status={emp.is_active ? 'active' : 'inactive'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(emp)}>
                            <Edit2 size={14} />
                          </button>
                          {emp.is_active && (
                            <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }} onClick={() => setDeactivateTarget(emp)}>
                              <UserX size={14} />
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
            {employees.length} موظف
          </div>
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editEmployee ? `تعديل — ${editEmployee.full_name_ar}` : 'إضافة موظف جديد'} size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="employee-form" type="submit">
              {editEmployee ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </button>
          </>
        }
      >
        <EmployeeForm defaultValues={editEmployee} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending} danger
        title="إنهاء خدمة الموظف"
        message={`هل تريد إنهاء خدمة "${deactivateTarget?.full_name_ar}"؟`}
      />
    </div>
  )
}
