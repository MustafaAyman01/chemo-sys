import { useState } from 'react'
import { Calculator, DollarSign, CheckCircle2, Loader2, FileText, Printer } from 'lucide-react'
import { usePayroll, useGeneratePayroll, useMarkPayrollPaid, useMarkAllPayrollPaid } from '../hooks/useHR'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, EmptyState, TableSkeleton, Modal,
  ConfirmDialog, FormField, StatsRow,
} from '../components/ui'

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

// ── Generate Payroll Modal ────────────────────────────────────
function GeneratePayrollModal({ open, onClose, onConfirm, loading, year, month }) {
  const [workingDays, setWorkingDays] = useState(26)

  return (
    <Modal open={open} onClose={onClose} title={`إنشاء كشف مرتبات — ${MONTHS[month - 1]} ${year}`} size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={() => onConfirm(workingDays)} disabled={loading}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'إنشاء الكشف'}
          </button>
        </>
      }
    >
      <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
        سيتم حساب المرتبات لكل الموظفين النشطين بناءً على بيانات الحضور المسجلة لهذا الشهر
      </div>
      <FormField label="عدد أيام العمل في الشهر" required hint="يُستخدم لحساب الراتب اليومي والخصومات">
        <input type="number" className="form-input ltr" value={workingDays} onChange={e => setWorkingDays(+e.target.value)} dir="ltr" />
      </FormField>
    </Modal>
  )
}

// ── Payslip Detail Modal ──────────────────────────────────────
function PayslipModal({ record, open, onClose }) {
  if (!record) return null
  return (
    <Modal open={open} onClose={onClose} title={`كشف مرتب — ${record.employee?.full_name_ar}`} size="md"
      footer={<button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> طباعة</button>}
    >
      <div style={{ padding: 20, fontFamily: 'Cairo' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #1a1d23' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>ChemCo</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>كشف مرتب شهري</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>{MONTHS[record.period_month - 1]} {record.period_year}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{record.employee?.employee_number}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{record.employee?.full_name_ar}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{record.employee?.department?.name_ar || record.employee?.department?.name}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
              <td style={{ padding: '8px 0', color: '#6b7280' }}>أيام العمل</td>
              <td style={{ padding: '8px 0', textAlign: 'left' }} className="num">{record.working_days}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
              <td style={{ padding: '8px 0', color: '#6b7280' }}>أيام الحضور الفعلي</td>
              <td style={{ padding: '8px 0', textAlign: 'left' }} className="num">{record.actual_days}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f1f3' }}>
              <td style={{ padding: '8px 0', color: '#6b7280' }}>أيام الغياب</td>
              <td className="num" style={{ padding: '8px 0', textAlign: 'left', color: record.absent_days > 0 ? '#dc2626' : 'inherit' }}>{record.absent_days}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#16a34a' }}>المستحقات</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <tbody>
            {[
              ['الراتب الأساسي', record.base_salary],
              ['بدل سكن', record.housing_allowance],
              ['بدل انتقال', record.transport_allowance],
              ['بدل وجبة', record.meal_allowance],
              ['بدل تليفون', record.phone_allowance],
              ['أجر إضافي', record.overtime_amount],
            ].filter(([, v]) => +v > 0).map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f1f3' }}>
                <td style={{ padding: '6px 0', color: '#6b7280' }}>{label}</td>
                <td style={{ padding: '6px 0', textAlign: 'left' }} className="num">{(+value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #e8eaed' }}>
              <td style={{ padding: '8px 0', fontWeight: 700 }}>إجمالي المستحقات</td>
              <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: 700 }} className="num">{(+record.gross_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#dc2626' }}>الخصومات</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <tbody>
            {[
              ['التأمينات الاجتماعية', record.social_insurance_deduction],
              ['خصم تأخير', record.late_deduction],
              ['ضريبة دخل', record.income_tax],
              ['خصم سلف', record.advance_deduction],
              ['خصومات أخرى', record.other_deductions],
            ].filter(([, v]) => +v > 0).map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #f0f1f3' }}>
                <td style={{ padding: '6px 0', color: '#6b7280' }}>{label}</td>
                <td style={{ padding: '6px 0', textAlign: 'left' }} className="num">−{(+value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #e8eaed' }}>
              <td style={{ padding: '8px 0', fontWeight: 700 }}>إجمالي الخصومات</td>
              <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: 700 }} className="num">−{(+record.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div style={{
          background: '#f0f4ff', borderRadius: 10, padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>صافي المرتب</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#3d62f3', fontFamily: 'Inter' }}>
            {(+record.net_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
          </span>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PayrollPage() {
  const { user } = useAuthStore()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [viewPayslip, setViewPayslip]   = useState(null)
  const [payTarget, setPayTarget]       = useState(null)
  const [payAllConfirm, setPayAllConfirm] = useState(false)

  const filters = { period_year: year, period_month: month }
  const { data: payroll = [], isLoading } = usePayroll(filters)

  const generateMutation  = useGeneratePayroll()
  const markPaidMutation  = useMarkPayrollPaid()
  const markAllMutation   = useMarkAllPayrollPaid()

  const handleGenerate = async (workingDays) => {
    await generateMutation.mutateAsync({ period_year: year, period_month: month, working_days: workingDays, created_by: user.id })
    setGenerateOpen(false)
  }

  const handleMarkPaid = async () => {
    await markPaidMutation.mutateAsync({ id: payTarget.id, payment_method: 'bank_transfer' })
    setPayTarget(null)
  }

  const handleMarkAllPaid = async () => {
    const unpaidIds = payroll.filter(p => !p.is_paid).map(p => p.id)
    await markAllMutation.mutateAsync({ ids: unpaidIds, payment_method: 'bank_transfer' })
    setPayAllConfirm(false)
  }

  const totalGross = payroll.reduce((s, p) => s + (+p.gross_salary || 0), 0)
  const totalNet   = payroll.reduce((s, p) => s + (+p.net_salary || 0), 0)
  const totalDeductions = payroll.reduce((s, p) => s + (+p.total_deductions || 0), 0)
  const unpaidCount = payroll.filter(p => !p.is_paid).length

  const stats = [
    { label: 'إجمالي المستحقات', value: totalGross.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#3d62f3' },
    { label: 'إجمالي الخصومات',  value: totalDeductions.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#dc2626' },
    { label: 'صافي المرتبات',    value: totalNet.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' EGP', color: '#16a34a' },
    { label: 'لم تُصرف بعد',     value: unpaidCount, color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="المرتبات"
        subtitle="كشف المرتبات الشهري للموظفين"
        actions={
          <>
            {payroll.length > 0 && unpaidCount > 0 && (
              <button className="btn btn-secondary" onClick={() => setPayAllConfirm(true)}>
                <DollarSign size={15} /> صرف الكل
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setGenerateOpen(true)}>
              <Calculator size={16} /> إنشاء كشف الشهر
            </button>
          </>
        }
      />

      <StatsRow stats={stats} />

      <FiltersBar>
        <select className="form-input" style={{ width: 140, height: 36 }} value={month} onChange={e => setMonth(+e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-input" style={{ width: 110, height: 36 }} value={year} onChange={e => setYear(+e.target.value)}>
          {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : payroll.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title={`لا يوجد كشف مرتبات لـ ${MONTHS[month - 1]} ${year}`}
            subtitle="أنشئ كشف المرتبات بناءً على بيانات الحضور المسجلة"
            action={<button className="btn btn-primary" onClick={() => setGenerateOpen(true)}><Calculator size={15} /> إنشاء كشف الشهر</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الموظف</th><th>أيام العمل</th><th>الغياب</th>
                  <th>إجمالي المستحقات</th><th>الخصومات</th><th>صافي المرتب</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.employee?.full_name_ar}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.employee?.employee_number} · {p.employee?.department?.name_ar}</div>
                    </td>
                    <td className="num">{p.actual_days}/{p.working_days}</td>
                    <td className="num" style={{ color: p.absent_days > 0 ? '#dc2626' : '#9ca3af' }}>{p.absent_days}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{(+p.gross_salary).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="num" style={{ color: '#dc2626' }}>−{(+p.total_deductions).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="num" style={{ fontWeight: 700, fontFamily: 'Inter', color: '#1a1d23' }}>
                      {(+p.net_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP
                    </td>
                    <td>
                      {p.is_paid ? <span className="badge badge-paid">مصروف</span> : <span className="badge badge-pending">لم يُصرف</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewPayslip(p)}>
                          <FileText size={14} />
                        </button>
                        {!p.is_paid && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#16a34a' }} onClick={() => setPayTarget(p)}>
                            <CheckCircle2 size={14} />
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
            {payroll.length} موظف
          </div>
        </div>
      )}

      <GeneratePayrollModal
        open={generateOpen} onClose={() => setGenerateOpen(false)} onConfirm={handleGenerate}
        loading={generateMutation.isPending} year={year} month={month}
      />

      <PayslipModal record={viewPayslip} open={!!viewPayslip} onClose={() => setViewPayslip(null)} />

      <ConfirmDialog
        open={!!payTarget} onClose={() => setPayTarget(null)} onConfirm={handleMarkPaid}
        loading={markPaidMutation.isPending}
        title="تأكيد صرف المرتب" message={`هل تم صرف مرتب "${payTarget?.employee?.full_name_ar}"؟`}
      />

      <ConfirmDialog
        open={payAllConfirm} onClose={() => setPayAllConfirm(false)} onConfirm={handleMarkAllPaid}
        loading={markAllMutation.isPending}
        title="صرف كل المرتبات" message={`هل تريد تأكيد صرف مرتبات ${unpaidCount} موظف؟`}
      />
    </div>
  )
}
