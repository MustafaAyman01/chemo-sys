import { useState, useMemo } from 'react'
import { Clock, Check, X, Coffee, Plane, CalendarDays, Loader2 } from 'lucide-react'
import { useAttendance, useRecordAttendance, useEmployees } from '../hooks/useHR'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, EmptyState, TableSkeleton, StatsRow,
} from '../components/ui'

const STATUS_CONFIG = {
  present:  { label: 'حاضر',     color: '#16a34a', bg: '#f0fdf4', icon: Check },
  absent:   { label: 'غائب',     color: '#dc2626', bg: '#fef2f2', icon: X },
  late:     { label: 'متأخر',    color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  half_day: { label: 'نصف يوم',  color: '#8b5cf6', bg: '#f5f3ff', icon: Coffee },
  on_leave: { label: 'إجازة',    color: '#3d62f3', bg: '#eff6ff', icon: Plane },
  holiday:  { label: 'عطلة رسمية', color: '#6b7280', bg: '#f3f4f6', icon: CalendarDays },
  remote:   { label: 'عمل عن بعد', color: '#06b6d4', bg: '#ecfeff', icon: Coffee },
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
    }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

// ── Daily Quick-Mark Row ──────────────────────────────────────
function AttendanceRow({ employee, record, date, onMark }) {
  const [saving, setSaving] = useState(false)

  const handleMark = async (status) => {
    setSaving(true)
    await onMark({ employee_id: employee.id, date, status })
    setSaving(false)
  }

  const handleTimeChange = async (field, value) => {
    if (!value) return
    setSaving(true)
    const today = new Date(date)
    const [h, m] = value.split(':')
    today.setHours(+h, +m)
    await onMark({
      employee_id: employee.id, date,
      [field]: today.toISOString(),
      status: record?.status || 'present',
    })
    setSaving(false)
  }

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{employee.full_name_ar}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{employee.employee_number} · {employee.department?.name_ar || employee.department?.name}</div>
      </td>
      <td>
        <input type="time" className="form-input ltr" style={{ height: 32, fontSize: 12, width: 110 }}
          defaultValue={record?.check_in ? new Date(record.check_in).toTimeString().slice(0, 5) : ''}
          onChange={e => handleTimeChange('check_in', e.target.value)} />
      </td>
      <td>
        <input type="time" className="form-input ltr" style={{ height: 32, fontSize: 12, width: 110 }}
          defaultValue={record?.check_out ? new Date(record.check_out).toTimeString().slice(0, 5) : ''}
          onChange={e => handleTimeChange('check_out', e.target.value)} />
      </td>
      <td>{record ? <StatusPill status={record.status} /> : <span style={{ fontSize: 12, color: '#d1d5db' }}>لم يُسجل</span>}</td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, cfg]) => {
            const Icon = cfg.icon
            const active = record?.status === key
            return (
              <button key={key} disabled={saving}
                onClick={() => handleMark(key)}
                title={cfg.label}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: active ? cfg.color : '#f4f5f8',
                  color: active ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '150ms',
                }}>
                <Icon size={13} />
              </button>
            )
          })}
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuthStore()
  const [view, setView]   = useState('daily') // 'daily' or 'history'
  const [date, setDate]   = useState(new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const { data: employees = [] } = useEmployees({ is_active: true })
  const { data: dailyRecords = [], isLoading: dailyLoading } = useAttendance({ date })
  const { data: historyRecords = [], isLoading: historyLoading } = useAttendance({
    date_from: dateFrom || undefined, date_to: dateTo || undefined,
  })

  const recordAttendance = useRecordAttendance()

  const recordsByEmployee = useMemo(() => {
    const map = {}
    dailyRecords.forEach(r => { map[r.employee_id] = r })
    return map
  }, [dailyRecords])

  const handleMark = async (data) => {
    await recordAttendance.mutateAsync({ ...data, created_by: user.id })
  }

  const presentCount = dailyRecords.filter(r => r.status === 'present').length
  const absentCount  = dailyRecords.filter(r => r.status === 'absent').length
  const lateCount    = dailyRecords.filter(r => r.status === 'late').length
  const leaveCount   = dailyRecords.filter(r => r.status === 'on_leave').length

  const stats = [
    { label: 'إجمالي الموظفين', value: employees.length, color: '#3d62f3' },
    { label: 'حاضرين اليوم',    value: presentCount, color: '#16a34a' },
    { label: 'غائبين',          value: absentCount,  color: '#dc2626' },
    { label: 'متأخرين',         value: lateCount,    color: '#f59e0b' },
  ]

  return (
    <div>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="تسجيل ومتابعة حضور الموظفين اليومي"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${view === 'daily' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('daily')}>
              التسجيل اليومي
            </button>
            <button className={`btn btn-sm ${view === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('history')}>
              السجل التاريخي
            </button>
          </div>
        }
      />

      <StatsRow stats={stats} />

      {view === 'daily' ? (
        <>
          <FiltersBar>
            <input type="date" className="form-input ltr" style={{ width: 180, height: 36 }} value={date} onChange={e => setDate(e.target.value)} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {new Date(date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </FiltersBar>

          {dailyLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : employees.length === 0 ? (
            <div className="card"><EmptyState icon={Clock} title="لا يوجد موظفين نشطين" /></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>الموظف</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>الحالة</th><th>تسجيل سريع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <AttendanceRow key={emp.id} employee={emp} record={recordsByEmployee[emp.id]} date={date} onMark={handleMark} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
                {employees.length} موظف نشط
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <FiltersBar>
            <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من" />
            <input type="date" className="form-input ltr" style={{ width: 150, height: 36 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="إلى" />
          </FiltersBar>

          {historyLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : historyRecords.length === 0 ? (
            <div className="card"><EmptyState icon={Clock} title="لا يوجد سجلات في هذه الفترة" /></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th><th>الموظف</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th><th>دقائق التأخير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontSize: 13, color: '#6b7280' }}>{r.date}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee?.full_name_ar}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.employee?.employee_number}</div>
                        </td>
                        <td className="num">{r.check_in ? new Date(r.check_in).toTimeString().slice(0, 5) : '—'}</td>
                        <td className="num">{r.check_out ? new Date(r.check_out).toTimeString().slice(0, 5) : '—'}</td>
                        <td><StatusPill status={r.status} /></td>
                        <td className="num" style={{ color: r.late_minutes > 0 ? '#dc2626' : '#9ca3af' }}>
                          {r.late_minutes > 0 ? `${r.late_minutes} د` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12, color: '#9ca3af' }}>
                {historyRecords.length} سجل
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
