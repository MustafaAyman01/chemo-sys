import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const poKeys = {
  all:    ['purchase_orders'],
  list:   (f) => ['purchase_orders', 'list', f],
  detail: (id) => ['purchase_orders', 'detail', id],
}

// ── Fetch POs ─────────────────────────────────────────────────
const fetchPOs = async (filters = {}) => {
  let q = supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, country, currency),
      created_by_profile:profiles!purchase_orders_created_by_fkey(full_name),
      approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters.search)      q = q.ilike('po_number', `%${filters.search}%`)
  if (filters.status)      q = q.eq('status', filters.status)
  if (filters.supplier_id) q = q.eq('supplier_id', filters.supplier_id)
  if (filters.date_from)   q = q.gte('order_date', filters.date_from)
  if (filters.date_to)     q = q.lte('order_date', filters.date_to)

  const { data, error } = await q
  if (error) throw error
  return data
}

// ── Fetch single PO with items ────────────────────────────────
const fetchPO = async (id) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(*),
      items:purchase_order_items(
        *,
        item:items(id, code, name, unit)
      ),
      created_by_profile:profiles!purchase_orders_created_by_fkey(full_name),
      approved_by_profile:profiles!purchase_orders_approved_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const usePurchaseOrders = (filters = {}) =>
  useQuery({
    queryKey: poKeys.list(filters),
    queryFn:  () => fetchPOs(filters),
  })

export const usePurchaseOrder = (id) =>
  useQuery({
    queryKey: poKeys.detail(id),
    queryFn:  () => fetchPO(id),
    enabled:  !!id,
  })

export const useCreatePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, ...poData }) => {
      // Convert empty-string optional fields (e.g. enum columns) to null
      // so Postgres doesn't reject them with "invalid input value for enum"
      const cleanData = Object.fromEntries(
        Object.entries(poData).map(([k, v]) => [k, v === '' ? null : v])
      )

      // Insert PO
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert(cleanData)
        .select()
        .single()
      if (poErr) throw poErr

      // Insert items
      if (items?.length) {
        const { error: itemsErr } = await supabase
          .from('purchase_order_items')
          .insert(items.map(item => ({ ...item, po_id: po.id })))
        if (itemsErr) throw itemsErr
      }
      return po
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all })
      toast.success('تم إنشاء أمر الشراء')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdatePOStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, approved_by }) => {
      const update = { status }
      if (status === 'approved') {
        update.approved_by = approved_by
        update.approved_at = new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: poKeys.all })
      qc.invalidateQueries({ queryKey: poKeys.detail(vars.id) })
      toast.success('تم تحديث الحالة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeletePO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all })
      toast.success('تم إلغاء أمر الشراء')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
