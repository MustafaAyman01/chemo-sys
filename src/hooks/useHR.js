import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ════════════════════════════════════════════════════════════
// DEPARTMENTS
// ════════════════════════════════════════════════════════════
export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true).order('name')
      if (error) throw error
      return data
    },
  })

// ════════════════════════════════════════════════════════════
// EMPLOYEES
// ════════════════════════════════════════════════════════════
export const employeeKeys = {
  all:    ['employees'],
  list:   (f)  => ['employees', 'list', f],
  detail: (id) => ['employees', 'detail', id],
}

const fetchEmployees = async (filters = {}) => {
  let q = supabase
    .from('employees')
    .select(`*, department:departments(id, name, name_ar)`)
    .order('hire_date', { ascending: false })

  if (filters.search)       q = q.or(`full_name.ilike.%${filters.search}%,full_name_ar.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%`)
  if (filters.department_id) q = q.eq('department_id', filters.department_id)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useEmployees = (filters = {}) =>
  useQuery({ queryKey: employeeKeys.list(filters), queryFn: () => fetchEmployees(filters) })

export const useEmployee = (id) =>
  useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select(`*, department:departments(*)`).eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

export const useCreateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (!data.employee_number) {
        const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true })
        data.employee_number = `EMP-${String((count || 0) + 1).padStart(4, '0')}`
      }
      const { data: result, error } = await supabase.from('employees').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: employeeKeys.all }); toast.success('تم إضافة الموظف') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('employees').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all })
      qc.invalidateQueries({ queryKey: employeeKeys.detail(vars.id) })
      toast.success('تم تحديث بيانات الموظف')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeactivateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, termination_date }) => {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false, termination_date: termination_date || new Date().toISOString().split('T')[0] })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: employeeKeys.all }); toast.success('تم إنهاء خدمة الموظف') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// ATTENDANCE
// ════════════════════════════════════════════════════════════
export const attendanceKeys = {
  all:  ['attendance'],
  list: (f) => ['attendance', 'list', f],
}

const fetchAttendance = async (filters = {}) => {
  let q = supabase
    .from('attendance')
    .select(`*, employee:employees(id, full_name, full_name_ar, employee_number, department:departments(name))`)
    .order('date', { ascending: false })

  if (filters.date)         q = q.eq('date', filters.date)
  if (filters.date_from)    q = q.gte('date', filters.date_from)
  if (filters.date_to)      q = q.lte('date', filters.date_to)
  if (filters.employee_id)  q = q.eq('employee_id', filters.employee_id)
  if (filters.status)       q = q.eq('status', filters.status)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useAttendance = (filters = {}) =>
  useQuery({ queryKey: attendanceKeys.list(filters), queryFn: () => fetchAttendance(filters) })

// Check-in / check-out for a specific day (creates or updates the record)
export const useRecordAttendance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ employee_id, date, check_in, check_out, status, late_minutes, notes, created_by }) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          employee_id, date, check_in, check_out, status,
          late_minutes: late_minutes || 0, notes, created_by,
        }, { onConflict: 'employee_id,date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: attendanceKeys.all }); toast.success('تم تسجيل الحضور') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Bulk mark attendance for a whole day (e.g. mark everyone present, then adjust exceptions)
export const useBulkMarkAttendance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ employeeIds, date, status, created_by }) => {
      const rows = employeeIds.map(employee_id => ({ employee_id, date, status, created_by }))
      const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'employee_id,date' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: attendanceKeys.all }); toast.success('تم تسجيل الحضور الجماعي') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ════════════════════════════════════════════════════════════
export const leaveKeys = {
  all:  ['leave_requests'],
  list: (f) => ['leave_requests', 'list', f],
}

const fetchLeaveRequests = async (filters = {}) => {
  let q = supabase
    .from('leave_requests')
    .select(`*, employee:employees(id, full_name, full_name_ar, employee_number)`)
    .order('created_at', { ascending: false })

  if (filters.status)      q = q.eq('status', filters.status)
  if (filters.employee_id) q = q.eq('employee_id', filters.employee_id)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useLeaveRequests = (filters = {}) =>
  useQuery({ queryKey: leaveKeys.list(filters), queryFn: () => fetchLeaveRequests(filters) })

export const useCreateLeaveRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('leave_requests').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: leaveKeys.all }); toast.success('تم تقديم طلب الإجازة') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateLeaveStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, approved_by, employee_id, start_date, end_date }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status, approved_by, approved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // If approved, mark attendance as on_leave for those days
      if (status === 'approved') {
        const dates = []
        let d = new Date(start_date)
        const end = new Date(end_date)
        while (d <= end) {
          dates.push(new Date(d).toISOString().split('T')[0])
          d.setDate(d.getDate() + 1)
        }
        const rows = dates.map(date => ({ employee_id, date, status: 'on_leave' }))
        await supabase.from('attendance').upsert(rows, { onConflict: 'employee_id,date' })
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.all })
      qc.invalidateQueries({ queryKey: attendanceKeys.all })
      toast.success('تم تحديث حالة الطلب')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// PAYROLL
// ════════════════════════════════════════════════════════════
export const payrollKeys = {
  all:  ['payroll'],
  list: (f) => ['payroll', 'list', f],
}

const fetchPayroll = async (filters = {}) => {
  let q = supabase
    .from('payroll')
    .select(`*, employee:employees(id, full_name, full_name_ar, employee_number, department:departments(name))`)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (filters.period_year)  q = q.eq('period_year', filters.period_year)
  if (filters.period_month) q = q.eq('period_month', filters.period_month)
  if (filters.is_paid !== undefined) q = q.eq('is_paid', filters.is_paid)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const usePayroll = (filters = {}) =>
  useQuery({ queryKey: payrollKeys.list(filters), queryFn: () => fetchPayroll(filters) })

// Generate payroll for all active employees for a given month
export const useGeneratePayroll = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ period_year, period_month, working_days, created_by }) => {
      const { data: employees } = await supabase.from('employees').select('*').eq('is_active', true)

      const monthStart = `${period_year}-${String(period_month).padStart(2, '0')}-01`
      const monthEnd   = new Date(period_year, period_month, 0).toISOString().split('T')[0]

      const results = []
      for (const emp of employees) {
        // Get attendance summary for the month
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status, late_minutes, overtime_hours')
          .eq('employee_id', emp.id)
          .gte('date', monthStart)
          .lte('date', monthEnd)

        const absentDays  = attendance?.filter(a => a.status === 'absent').length || 0
        const actualDays  = working_days - absentDays
        const totalLateMin = attendance?.reduce((s, a) => s + (a.late_minutes || 0), 0) || 0
        const overtimeHours = attendance?.reduce((s, a) => s + (+a.overtime_hours || 0), 0) || 0

        const dailyRate     = emp.base_salary / working_days
        const lateDeduction = (totalLateMin / 60) * (dailyRate / 8) // approx hourly rate
        const absentDeduction = absentDays * dailyRate
        const overtimeAmount  = overtimeHours * (dailyRate / 8) * 1.5

        const grossSalary = emp.base_salary + (emp.housing_allowance || 0) + (emp.transport_allowance || 0)
          + (emp.meal_allowance || 0) + (emp.phone_allowance || 0) + overtimeAmount

        const socialInsurance = (emp.base_salary * (emp.social_insurance_pct || 11)) / 100
        const totalDeductions = lateDeduction + absentDeduction + socialInsurance

        const netSalary = grossSalary - totalDeductions

        results.push({
          employee_id: emp.id,
          period_year, period_month,
          working_days, actual_days: actualDays, absent_days: absentDays,
          late_deduction: parseFloat(lateDeduction.toFixed(2)),
          overtime_hours: overtimeHours,
          overtime_amount: parseFloat(overtimeAmount.toFixed(2)),
          base_salary: emp.base_salary,
          housing_allowance: emp.housing_allowance || 0,
          transport_allowance: emp.transport_allowance || 0,
          meal_allowance: emp.meal_allowance || 0,
          phone_allowance: emp.phone_allowance || 0,
          gross_salary: parseFloat(grossSalary.toFixed(2)),
          social_insurance_deduction: parseFloat(socialInsurance.toFixed(2)),
          total_deductions: parseFloat((totalDeductions).toFixed(2)),
          net_salary: parseFloat(netSalary.toFixed(2)),
          created_by,
        })
      }

      const { data, error } = await supabase
        .from('payroll')
        .upsert(results, { onConflict: 'employee_id,period_year,period_month' })
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: payrollKeys.all }); toast.success('تم إنشاء كشف المرتبات') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useMarkPayrollPaid = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payment_method, payment_date }) => {
      const { data, error } = await supabase
        .from('payroll')
        .update({ is_paid: true, payment_method, payment_date: payment_date || new Date().toISOString().split('T')[0] })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: payrollKeys.all }); toast.success('تم تسجيل صرف المرتب') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useMarkAllPayrollPaid = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, payment_method, payment_date }) => {
      const { error } = await supabase
        .from('payroll')
        .update({ is_paid: true, payment_method, payment_date: payment_date || new Date().toISOString().split('T')[0] })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: payrollKeys.all }); toast.success('تم صرف المرتبات بالكامل') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
