import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Keys ──────────────────────────────────────────────────────
export const supplierKeys = {
  all:    ['suppliers'],
  list:   (filters) => ['suppliers', 'list', filters],
  detail: (id)      => ['suppliers', 'detail', id],
}

// ── Fetch all suppliers ───────────────────────────────────────
const fetchSuppliers = async (filters = {}) => {
  let q = supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.search) {
    q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,country.ilike.%${filters.search}%`)
  }
  if (filters.country)   q = q.eq('country', filters.country)
  if (filters.currency)  q = q.eq('currency', filters.currency)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)

  const { data, error } = await q
  if (error) throw error
  return data
}

// ── Fetch single supplier ─────────────────────────────────────
const fetchSupplier = async (id) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ── Hooks ─────────────────────────────────────────────────────
export const useSuppliers = (filters = {}) =>
  useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn:  () => fetchSuppliers(filters),
  })

export const useSupplier = (id) =>
  useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn:  () => fetchSupplier(id),
    enabled:  !!id,
  })

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      // Auto-generate code if not provided
      if (!data.code) {
        const { count } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true })
        data.code = `SUP-${String((count || 0) + 1).padStart(3, '0')}`
      }
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all })
      toast.success('تم إضافة المورد بنجاح')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: supplierKeys.all })
      qc.invalidateQueries({ queryKey: supplierKeys.detail(vars.id) })
      toast.success('تم تحديث المورد')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeleteSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all })
      toast.success('تم إيقاف المورد')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
