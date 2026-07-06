import { useState } from 'react'
import { Search, Shield, UserCog, PowerOff, Info, Plus, Loader2, Eye, EyeOff } from 'lucide-react'
import { useProfiles, useUpdateProfile, useToggleUserActive, useCreateUser } from '../hooks/useUserManagement'
import { useDepartmentsFull } from '../hooks/useDepartments'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, StatusBadge, EmptyState,
  TableSkeleton, Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

const ROLES = [
  { value: 'super_admin',        label: 'مدير النظام' },
  { value: 'admin',              label: 'مدير' },
  { value: 'finance_manager',    label: 'مدير مالي' },
  { value: 'warehouse_manager',  label: 'مدير مخازن' },
  { value: 'production_manager', label: 'مدير إنتاج' },
  { value: 'sales_manager',      label: 'مدير مبيعات' },
  { value: 'hr_manager',         label: 'مدير موارد بشرية' },
  { value: 'accountant',         label: 'محاسب' },
  { value: 'warehouse_staff',    label: 'أمين مخزن' },
  { value: 'production_staff',   label: 'عامل إنتاج' },
  { value: 'sales_rep',          label: 'مندوب مبيعات' },
  { value: 'hr_staff',           label: 'موظف موارد بشرية' },
  { value: 'viewer',             label: 'مشاهد' },
]

const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

function CreateUserModal({ open, onClose }) {
  const { data: departments = [] } = useDepartmentsFull({ is_active: true })
  const createMutation = useCreateUser()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [fullName, setFullName]     = useState('')
  const [role, setRole]             = useState('viewer')
  const [department, setDepartment] = useState('')
  const [phone, setPhone]           = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError]           = useState('')

  const reset = () => {
    setEmail(''); setPassword(''); setFullName(''); setRole('viewer')
    setDepartment(''); setPhone(''); setEmployeeId(''); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setError('يرجى تعبئة كل الحقول المطلوبة')
      return
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    try {
      await createMutation.mutateAsync({
        email: email.trim(), password, full_name: fullName.trim(),
        role, department: department || null, phone: phone || null,
        employee_id: employeeId || null,
      })
      handleClose()
    } catch (err) {
      setError(err.message || 'حدث خطأ')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="إضافة مستخدم جديد" size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose}>إلغاء</button>
          <button className="btn btn-primary" form="create-user-form" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'إنشاء المستخدم'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="create-user-form">
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="الاسم الكامل" required>
              <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="أحمد محمد" />
            </FormField>
          </div>

          <FormField label="البريد الإلكتروني" required>
            <input type="email" className="form-input ltr" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" placeholder="user@chemco.com" />
          </FormField>

          <FormField label="كلمة المرور" required hint="6 أحرف على الأقل">
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} className="form-input ltr" style={{ paddingLeft: 36 }}
                value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </FormField>

          <FormField label="الدور الوظيفي" required>
            <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </FormField>

          <FormField label="القسم">
            <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">بدون</option>
              {departments.map(d => <option key={d.id} value={d.name_ar || d.name}>{d.name_ar || d.name}</option>)}
            </select>
          </FormField>

          <FormField label="رقم الهاتف">
            <input className="form-input ltr" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
          </FormField>

          <FormField label="الرقم الوظيفي">
            <input className="form-input ltr" value={employeeId} onChange={e => setEmployeeId(e.target.value)} dir="ltr" placeholder="EMP-0012" />
          </FormField>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  )
}

function EditUserModal({ user, open, onClose }) {
  const [role, setRole] = useState(user?.role || 'viewer')
  const updateMutation = useUpdateProfile()

  if (!user) return null

  const handleSave = async () => {
    await updateMutation.mutateAsync({ id: user.id, role })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`تعديل صلاحيات — ${user.full_name}`} size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={updateMutation.isPending}>حفظ</button>
        </>
      }
    >
      <FormField label="الدور الوظيفي" required>
        <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </FormField>
      <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', background: '#f8f9fb', padding: '10px 12px', borderRadius: 8, display: 'flex', gap: 8 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>تغيير الدور يحدد الصلاحيات تلقائياً حسب الجدول المعرّف في النظام (عرض/إضافة/تعديل/حذف لكل قسم).</span>
      </div>
    </Modal>
  )
}

export default function UserManagementPage() {
  const { profile: currentUser } = useAuthStore()
  const [search, setSearch]   = useState('')
  const [filterRole, setRole] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)

  const filters = { search, role: filterRole || undefined }
  const { data: users = [], isLoading } = useProfiles(filters)
  const toggleMutation = useToggleUserActive()

  const handleToggle = async () => {
    await toggleMutation.mutateAsync({ id: toggleTarget.id, is_active: !toggleTarget.is_active })
    setToggleTarget(null)
  }

  const active = users.filter(u => u.is_active).length
  const admins = users.filter(u => ['super_admin', 'admin'].includes(u.role)).length

  const stats = [
    { label: 'إجمالي المستخدمين', value: users.length, color: '#3d62f3' },
    { label: 'نشطين',             value: active,        color: '#16a34a' },
    { label: 'مديرين بصلاحيات كاملة', value: admins,    color: '#dc2626' },
  ]

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        subtitle="التحكم في صلاحيات الوصول للنظام لكل مستخدم"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> إضافة مستخدم
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم..." />
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterRole} onChange={e => setRole(e.target.value)}>
          <option value="">كل الأدوار</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : users.length === 0 ? (
        <div className="card"><EmptyState icon={UserCog} title="لا يوجد مستخدمين" /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr><th>المستخدم</th><th>الدور</th><th>آخر دخول</th><th>الحالة</th><th></th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {u.full_name}
                        {u.id === currentUser?.id && <span style={{ fontSize: 11, color: '#9ca3af' }}> (أنت)</span>}
                      </div>
                      {u.employee_id && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.employee_id}</div>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                        background: ['super_admin', 'admin'].includes(u.role) ? '#fef2f2' : '#f0f4ff',
                        color: ['super_admin', 'admin'].includes(u.role) ? '#dc2626' : '#3d62f3',
                      }}>
                        <Shield size={11} /> {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ar-EG') : 'لم يسجل دخول بعد'}
                    </td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditUser(u)} title="تعديل الصلاحيات">
                          <UserCog size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: u.is_active ? '#dc2626' : '#16a34a' }}
                            onClick={() => setToggleTarget(u)} title={u.is_active ? 'إيقاف' : 'تفعيل'}>
                            <PowerOff size={14} />
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
            {users.length} مستخدم
          </div>
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <EditUserModal user={editUser} open={!!editUser} onClose={() => setEditUser(null)} />

      <ConfirmDialog
        open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleToggle}
        loading={toggleMutation.isPending} danger={toggleTarget?.is_active}
        title={toggleTarget?.is_active ? 'إيقاف المستخدم' : 'تفعيل المستخدم'}
        message={`هل تريد ${toggleTarget?.is_active ? 'إيقاف' : 'تفعيل'} "${toggleTarget?.full_name}"؟`}
      />
    </div>
  )
}
