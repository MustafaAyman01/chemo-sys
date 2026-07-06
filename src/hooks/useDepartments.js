import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const departmentKeys = {
  all:  ['departments'],
  list: (f) => ['departments', 'list', f],
}

const fetchDepartments = async (filters = {}) => {
  let q = supabase
    .from('departments')
    .select(`*, manager:profiles!departments_manager_id_fkey(full_name)`)
    .order('name')

  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useDepartmentsFull = (filters = {}) =>
  useQuery({ queryKey: departmentKeys.list(filters), queryFn: () => fetchDepartments(filters) })

// Employee count per department (for display)
export const useDepartmentEmployeeCounts = () =>
  useQuery({
    queryKey: ['departments', 'employee_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('department_id')
        .eq('is_active', true)
      if (error) throw error
      const counts = {}
      data.forEach(e => {
        if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1
      })
      return counts
    },
  })

export const useCreateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (!data.code) {
        const { count } = await supabase.from('departments').select('*', { count: 'exact', head: true })
        data.code = `DEPT-${String((count || 0) + 1).padStart(3, '0')}`
      }
      const { data: result, error } = await supabase.from('departments').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: departmentKeys.all }); toast.success('تم إضافة القسم') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('departments').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: departmentKeys.all }); toast.success('تم تحديث القسم') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeactivateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('departments').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: departmentKeys.all }); toast.success('تم إيقاف القسم') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
