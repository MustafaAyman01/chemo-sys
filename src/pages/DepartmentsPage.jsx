import { useState } from 'react'
import { Plus, Edit2, PowerOff, Building, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useDepartmentsFull, useCreateDepartment, useUpdateDepartment,
  useDeactivateDepartment, useDepartmentEmployeeCounts,
} from '../hooks/useDepartments'
import {
  PageHeader, FiltersBar, StatusBadge, EmptyState, TableSkeleton,
  Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

const departmentSchema = z.object({
  name:    z.string().min(2, 'الاسم مطلوب'),
  name_ar: z.string().min(2, 'الاسم بالعربي مطلوب'),
})

function DepartmentForm({ defaultValues, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(departmentSchema),
    defaultValues: defaultValues || {},
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="department-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="اسم القسم (إنجليزي)" required error={errors.name?.message}>
          <input className={`form-input ${errors.name ? 'error' : ''}`} {...register('name')} placeholder="Quality Control" />
        </FormField>
        <FormField label="اسم القسم (عربي)" required error={errors.name_ar?.message}>
          <input className={`form-input ${errors.name_ar ? 'error' : ''}`} {...register('name_ar')} placeholder="مراقبة الجودة" />
        </FormField>
      </div>
    </form>
  )
}

export default function DepartmentsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editDept, setEditDept]         = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const { data: departments = [], isLoading } = useDepartmentsFull({ is_active: showInactive ? undefined : true })
  const { data: empCounts = {} } = useDepartmentEmployeeCounts()

  const createMutation     = useCreateDepartment()
  const updateMutation     = useUpdateDepartment()
  const deactivateMutation = useDeactivateDepartment()

  const openCreate = () => { setEditDept(null); setModalOpen(true) }
  const openEdit   = (d) => { setEditDept(d);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditDept(null) }

  const handleSubmit = async (data) => {
    if (editDept) {
      await updateMutation.mutateAsync({ id: editDept.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
    closeModal()
  }

  const handleDeactivate = async () => {
    await deactivateMutation.mutateAsync(deactivateTarget.id)
    setDeactivateTarget(null)
  }

  const totalEmployees = Object.values(empCounts).reduce((s, c) => s + c, 0)

  const stats = [
    { label: 'إجمالي الأقسام', value: departments.length, color: '#3d62f3' },
    { label: 'إجمالي الموظفين الموزعين', value: totalEmployees, color: '#16a34a' },
  ]

  return (
    <div>
      <PageHeader
        title="الأقسام"
        subtitle="إدارة الهيكل التنظيمي للشركة"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> إضافة قسم
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          عرض غير النشطة
        </label>
      </FiltersBar>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building} title="لا يوجد أقسام"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة قسم</button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {departments.map(dept => (
            <div key={dept.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: '#f0f4ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building size={18} color="#3d62f3" />
                </div>
                <StatusBadge status={dept.is_active ? 'active' : 'inactive'} />
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', marginBottom: 2 }}>{dept.name_ar}</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>{dept.name}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                <Users size={13} />
                {empCounts[dept.id] || 0} موظف
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(dept)}>
                  <Edit2 size={13} /> تعديل
                </button>
                {dept.is_active && (
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }} onClick={() => setDeactivateTarget(dept)}>
                    <PowerOff size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editDept ? `تعديل — ${editDept.name_ar}` : 'إضافة قسم جديد'} size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="department-form" type="submit">
              {editDept ? 'حفظ التعديلات' : 'إضافة القسم'}
            </button>
          </>
        }
      >
        <DepartmentForm defaultValues={editDept} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending} danger
        title="إيقاف القسم" message={`هل تريد إيقاف قسم "${deactivateTarget?.name_ar}"؟`}
      />
    </div>
  )
}
