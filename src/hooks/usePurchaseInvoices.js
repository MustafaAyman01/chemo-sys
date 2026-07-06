import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const piKeys = {
  all:    ['purchase_invoices'],
  list:   (f)  => ['purchase_invoices', 'list', f],
  detail: (id) => ['purchase_invoices', 'detail', id],
}

const fetchInvoices = async (filters = {}) => {
  let q = supabase
    .from('purchase_invoices')
    .select(`
      *,
      supplier:suppliers(id, name, country, currency),
      po:purchase_orders(po_number),
      created_by_profile:profiles!purchase_invoices_created_by_fkey(full_name)
    `)
    .order('invoice_date', { ascending: false })

  if (filters.search)      q = q.ilike('invoice_number', `%${filters.search}%`)
  if (filters.status)      q = q.eq('status', filters.status)
  if (filters.supplier_id) q = q.eq('supplier_id', filters.supplier_id)
  if (filters.date_from)   q = q.gte('invoice_date', filters.date_from)
  if (filters.date_to)     q = q.lte('invoice_date', filters.date_to)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchInvoice = async (id) => {
  const { data, error } = await supabase
    .from('purchase_invoices')
    .select(`
      *,
      supplier:suppliers(*),
      po:purchase_orders(po_number, incoterms),
      items:purchase_invoice_items(
        *,
        item:items(id, code, name, unit)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const usePurchaseInvoices = (filters = {}) =>
  useQuery({
    queryKey: piKeys.list(filters),
    queryFn:  () => fetchInvoices(filters),
  })

export const usePurchaseInvoice = (id) =>
  useQuery({
    queryKey: piKeys.detail(id),
    queryFn:  () => fetchInvoice(id),
    enabled:  !!id,
  })

export const useCreatePurchaseInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, ...invoiceData }) => {
      const { data: inv, error } = await supabase
        .from('purchase_invoices')
        .insert({ ...invoiceData, remaining_amount: invoiceData.total_amount })
        .select()
        .single()
      if (error) throw error

      if (items?.length) {
        const { error: iErr } = await supabase
          .from('purchase_invoice_items')
          .insert(items.map(i => ({ ...i, invoice_id: inv.id })))
        if (iErr) throw iErr
      }
      return inv
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: piKeys.all })
      toast.success('تم إنشاء الفاتورة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateInvoicePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, paid_amount, payment_method, payment_date }) => {
      const { data: inv } = await supabase
        .from('purchase_invoices')
        .select('total_amount, paid_amount, currency, exchange_rate')
        .eq('id', id)
        .single()

      const newPaid = (inv.paid_amount || 0) + paid_amount
      const remaining = inv.total_amount - newPaid
      const status = remaining <= 0 ? 'paid' : 'partially_paid'

      const { data, error } = await supabase
        .from('purchase_invoices')
        .update({ paid_amount: newPaid, remaining_amount: remaining, status, payment_method, payment_date })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Record in unified payments ledger
      await supabase.from('payments').insert({
        reference_type: 'purchase_invoice',
        reference_id: id,
        payment_date,
        amount: paid_amount,
        currency: inv.currency,
        exchange_rate: inv.exchange_rate,
        payment_method,
      })

      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: piKeys.all })
      qc.invalidateQueries({ queryKey: piKeys.detail(vars.id) })
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم تسجيل الدفع')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
