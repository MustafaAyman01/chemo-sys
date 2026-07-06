import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const profileKeys = {
  all:  ['profiles'],
  list: (f) => ['profiles', 'list', f],
}

const fetchProfiles = async (filters = {}) => {
  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (filters.search) q = q.or(`full_name.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`)
  if (filters.role)   q = q.eq('role', filters.role)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useProfiles = (filters = {}) =>
  useQuery({ queryKey: profileKeys.list(filters), queryFn: () => fetchProfiles(filters) })

// Create new user via secure Edge Function (admin only — service_role key never touches the browser)
export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, full_name, role, department, phone, employee_id }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('غير مصرح')

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, full_name, role, department, phone, employee_id },
      })

      if (error) {
        // Edge function returned a non-2xx response; try to extract the message
        let message = error.message || 'حدث خطأ أثناء إنشاء المستخدم'
        try {
          const ctx = await error.context?.json?.()
          if (ctx?.error) message = ctx.error
        } catch {}
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all })
      toast.success('تم إنشاء المستخدم بنجاح')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Update role / active status (admin only - protected by RLS)
export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('profiles').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: profileKeys.all }); toast.success('تم تحديث بيانات المستخدم') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useToggleUserActive = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: profileKeys.all }); toast.success('تم تحديث حالة المستخدم') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Fetch role permission matrix
export const useRolePermissions = () =>
  useQuery({
    queryKey: ['role_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*').order('role')
      if (error) throw error
      return data
    },
  })
