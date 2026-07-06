import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const itemKeys = {
  all:      ['items'],
  list:     (f) => ['items', 'list', f],
  detail:   (id) => ['items', 'detail', id],
  byCategory: (cat) => ['items', 'category', cat],
}

const fetchItems = async (filters = {}) => {
  let q = supabase
    .from('items')
    .select('*')
    .order('code')

  if (filters.search)   q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useItems = (filters = {}) =>
  useQuery({
    queryKey: itemKeys.list(filters),
    queryFn:  () => fetchItems(filters),
  })

export const useRawMaterials = () =>
  useQuery({
    queryKey: itemKeys.byCategory('raw_material'),
    queryFn:  () => fetchItems({ category: 'raw_material', is_active: true }),
  })

export const useFinishedProducts = () =>
  useQuery({
    queryKey: itemKeys.byCategory('finished_product'),
    queryFn:  () => fetchItems({ category: 'finished_product', is_active: true }),
  })

export const useCreateItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('items')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all })
      toast.success('تم إضافة الصنف')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('items')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all })
      toast.success('تم تحديث الصنف')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
