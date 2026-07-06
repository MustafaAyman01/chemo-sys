import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const customerKeys = {
  all:    ['customers'],
  list:   (f)  => ['customers', 'list', f],
  detail: (id) => ['customers', 'detail', id],
}

const fetchCustomers = async (filters = {}) => {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false })

  if (filters.search) {
    q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,industry.ilike.%${filters.search}%`)
  }
  if (filters.industry)  q = q.eq('industry', filters.industry)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchCustomer = async (id) => {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const useCustomers = (filters = {}) =>
  useQuery({ queryKey: customerKeys.list(filters), queryFn: () => fetchCustomers(filters) })

export const useCustomer = (id) =>
  useQuery({ queryKey: customerKeys.detail(id), queryFn: () => fetchCustomer(id), enabled: !!id })

export const useCreateCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (!data.code) {
        const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true })
        data.code = `CUS-${String((count || 0) + 1).padStart(3, '0')}`
      }
      const { data: result, error } = await supabase.from('customers').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: customerKeys.all }); toast.success('تم إضافة العميل') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('customers').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
      qc.invalidateQueries({ queryKey: customerKeys.detail(vars.id) })
      toast.success('تم تحديث العميل')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeleteCustomer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: customerKeys.all }); toast.success('تم إيقاف العميل') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
