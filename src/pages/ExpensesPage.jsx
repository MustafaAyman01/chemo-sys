import { useState } from 'react'
import { Plus, Edit2, Trash2, DollarSign, CheckCircle2, Repeat } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useExpenses, useCreateExpense, useUpdateExpense, useApproveExpense, useDeleteExpense } from '../hooks/useFinance'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, SearchInput, EmptyState, TableSkeleton,
  Modal, ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'utilities',     label: 'مرافق (كهرباء/مياه/غاز)' },
  { value: 'rent',          label: 'إيجارات' },
  { value: 'maintenance',   label: 'صيانة' },
  { value: 'transportation',label: 'نقل وانتقالات' },
  { value: 'logistics',     label: 'لوجستيات وشحن' },
  { value: 'marketing',     label: 'تسويق' },
  { value: 'admin',         label: 'مصاريف إدارية' },
  { value: 'legal',         label: 'قانونية واستشارات' },
  { value: 'insurance',     label: 'تأمين' },
  { value: 'customs',       label: 'جمارك' },
  { value: 'port_fees',     label: 'رسوم موانئ' },
  { value: 'lab_testing',   label: 'فحوصات معملية' },
  { value: 'safety',        label: 'سلامة وصحة مهنية' },
  { value: 'it',            label: 'تكنولوجيا معلومات' },
  { value: 'other',         label: 'أخرى' },
]

const CATEGORY_COLOR = {
  utilities: '#3b82f6', rent: '#8b5cf6', maintenance: '#f59e0b', transportation: '#06b6d4',
  logistics: '#0ea5e9', marketing: '#ec4899', admin: '#6b7280', legal: '#7c3aed',
  insurance: '#10b981', customs: '#dc2626', port_fees: '#0891b2', lab_testing: '#16a34a',
  safety: '#f97316', it: '#3d62f3', other: '#9ca3af',
}

function CategoryBadge({ category }) {
  const found = CATEGORIES.find(c => c.value === category)
  const color = CATEGORY_COLOR[category] || '#6b7280'
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '15', color }}>
      {found?.label || category}
    </span>
  )
}

// ── Schema ────────────────────────────────────────────────────
const expenseSchema = z.object({
  category:        z.string().min(1, 'اختر الفئة'),
  description:     z.string().min(2, 'الوصف مطلوب'),
  amount:          z.coerce.number().min(0.01, 'المبلغ مطلوب'),
  currency:        z.string().default('EGP'),
  exchange_rate:   z.coerce.number().min(0.0001).default(1),
  vendor_name:     z.string().optional(),
  expense_date:    z.string().min(1, 'التاريخ مطلوب'),
  cost_center:     z.string().optional(),
  payment_method:  z.string().optional(),
  is_recurring:    z.boolean().default(false),
  recurrence_type: z.string().optional(),
  notes:           z.string().optional(),
})

function ExpenseForm({ defaultValues, onSubmit }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaultValues || {
      currency: 'EGP', exchange_rate: 1, is_recurring: false,
      expense_date: new Date().toISOString().split('T')[0],
    },
  })

  const isRecurring = watch('is_recurring')
  const currency = watch('currency')

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="expense-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="الفئة" required error={errors.category?.message}>
          <select className={`form-input ${errors.category ? 'error' : ''}`} {...register('category')}>
            <option value="">اختر الفئة</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>

        <FormField label="تاريخ المصروف" required error={errors.expense_date?.message}>
          <input type="date" className="form-input ltr" {...register('expense_date')} />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الوصف" required error={errors.description?.message}>
            <input className={`form-input ${errors.description ? 'error' : ''}`} {...register('description')} placeholder="فاتورة كهرباء المصنع - يونيو" />
          </FormField>
        </div>

        <FormField label="المبلغ" required error={errors.amount?.message}>
          <input type="number" step="0.01" className={`form-input ltr ${errors.amount ? 'error' : ''}`} {...register('amount')} dir="ltr" />
        </FormField>

        <FormField label="العملة">
          <select className="form-input" {...register('currency')}>
            <option value="EGP">EGP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </FormField>

        {currency !== 'EGP' && (
          <FormField label="سعر الصرف">
            <input type="number" step="0.0001" className="form-input ltr" {...register('exchange_rate')} dir="ltr" />
          </FormField>
        )}

        <FormField label="الجهة المستفيدة">
          <input className="form-input" {...register('vendor_name')} placeholder="شركة الكهرباء" />
        </FormField>

        <FormField label="مركز التكلفة">
          <select className="form-input" {...register('cost_center')}>
            <option value="">بدون</option>
            <option value="MGMT">الإدارة</option>
            <option value="PROC">المشتريات</option>
            <option value="WH">المخازن</option>
            <option value="PROD">الإنتاج</option>
            <option value="SALES">المبيعات</option>
            <option value="QC">مراقبة الجودة</option>
            <option value="HR">الموارد البشرية</option>
            <option value="IT">تكنولوجيا المعلومات</option>
            <option value="LOG">اللوجستيات</option>
          </select>
        </FormField>

        <FormField label="طريقة الدفع">
          <select className="form-input" {...register('payment_method')}>
            <option value="">اختر</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="check">شيك</option>
            <option value="cash">نقدي</option>
          </select>
        </FormField>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" {...register('is_recurring')} /> مصروف متكرر
          </label>
        </div>

        {isRecurring && (
          <FormField label="نوع التكرار">
            <select className="form-input" {...register('recurrence_type')}>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="annual">سنوي</option>
            </select>
          </FormField>
        )}

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
export default function ExpensesPage() {
  const { user } = useAuthStore()
  const [search, setSearch]         = useState('')
  const [filterCategory, setCategory] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [modalOpen, setModalOpen]   = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filters = { search, category: filterCategory || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }
  const { data: expenses = [], isLoading } = useExpenses(filters)

  const createMutation  = useCreateExpense()
  const updateMutation  = useUpdateExpense()
  const approveMutation = useApproveExpense()
  const deleteMutation  = useDeleteExpense()

  const openCreate = () => { setEditExpense(null); setModalOpen(true) }
  const openEdit   = (e) => { setEditExpense(e);    setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditExpense(null) }

  const handleSubmit = async (data) => {
    if (editExpense) {
      await updateMutation.mutateAsync({ id: editExpense.id, ...data })
    } else {
      await createMutation.mutateAsync({ ...data, created_by: user.id })
    }
    closeModal()
  }

  const handleApprove = async (expense) => {
    await approveMutation.mutateAsync({ id: expense.id, approved_by: user.id })
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const total       = expenses.reduce((s, e) => s + (+e.amount_egp || 0), 0)
  const pending      = expenses.filter(e => !e.approved_by).length
  const recurring    = expenses.filter(e => e.is_recurring).length
  const thisMonth    = expenses.filter(e => {
    const d = new Date(e.expense_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, e) => s + (+e.amount_egp || 0), 0)

  const stats = [
    { label: 'إجمالي المصاريف (الفترة)', value: total.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#3d62f3' },
    { label: 'مصاريف هذا الشهر',  value: thisMonth.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#f59e0b' },
    { label: 'بانتظار الاعتماد',  value: pending,    color: '#dc2626' },
    { label: 'مصاريف متكررة',     value: recurring,  color: '#8b5cf6' },
  ]

  return (
    <div>
      <PageHeader
        title="المصاريف"
        subtitle="تسجيل ومتابعة المصاريف التشغيلية للشركة"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> تسجيل مصروف
          </button>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالوصف أو الجهة..." />
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterCategory} onChange={e => setCategory(e.target.value)}>
          <option value="">كل الفئات</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : expenses.length === 0 ? (
        <div className="card">
          <EmptyState icon={DollarSign} title="لا يوجد مصاريف مسجلة"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> تسجيل مصروف</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>المرجع</th><th>الفئة</th><th>الوصف</th><th>التاريخ</th>
                  <th>المبلغ</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td><span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{e.reference_number}</span></td>
                    <td><CategoryBadge category={e.category} /></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.description}</div>
                      {e.vendor_name && <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.vendor_name}</div>}
                    </td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>
                      {e.expense_date}
                      {e.is_recurring && <Repeat size={11} style={{ marginRight: 4, verticalAlign: 'middle', color: '#8b5cf6' }} />}
                    </td>
                    <td style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13 }}>
                      {(+e.amount_egp).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
                    </td>
                    <td>
                      {e.approved_by ? (
                        <span className="badge badge-approved">معتمد</span>
                      ) : (
                        <span className="badge badge-pending">بانتظار الاعتماد</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!e.approved_by && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#16a34a' }} onClick={() => handleApprove(e)} title="اعتماد">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)} title="تعديل">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#dc2626' }} onClick={() => setDeleteTarget(e)} title="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
            {expenses.length} مصروف
          </div>
        </div>
      )}

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editExpense ? 'تعديل مصروف' : 'تسجيل مصروف جديد'} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="expense-form" type="submit">
              {editExpense ? 'حفظ التعديلات' : 'تسجيل المصروف'}
            </button>
          </>
        }
      >
        <ExpenseForm defaultValues={editExpense} onSubmit={handleSubmit} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        loading={deleteMutation.isPending} danger
        title="حذف المصروف" message={`هل تريد حذف "${deleteTarget?.description}"؟`}
      />
    </div>
  )
}
