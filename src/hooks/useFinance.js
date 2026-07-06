import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════
export const expenseKeys = {
  all:  ['expenses'],
  list: (f) => ['expenses', 'list', f],
}

const fetchExpenses = async (filters = {}) => {
  let q = supabase
    .from('expenses')
    .select(`*, created_by_profile:profiles!expenses_created_by_fkey(full_name)`)
    .order('expense_date', { ascending: false })

  if (filters.search)     q = q.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`)
  if (filters.category)   q = q.eq('category', filters.category)
  if (filters.date_from)  q = q.gte('expense_date', filters.date_from)
  if (filters.date_to)    q = q.lte('expense_date', filters.date_to)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useExpenses = (filters = {}) =>
  useQuery({ queryKey: expenseKeys.list(filters), queryFn: () => fetchExpenses(filters) })

export const useCreateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (!data.reference_number) {
        const { count } = await supabase.from('expenses').select('*', { count: 'exact', head: true })
        data.reference_number = `EXP-${new Date().getFullYear().toString().slice(-2)}-${String((count || 0) + 1).padStart(5, '0')}`
      }
      const rate = data.exchange_rate || 1
      data.amount_egp = parseFloat((data.amount * rate).toFixed(2))

      const { data: result, error } = await supabase.from('expenses').insert(data).select().single()
      if (error) throw error

      // Record in unified payments ledger if a payment method was specified
      if (data.payment_method) {
        await supabase.from('payments').insert({
          reference_type: 'expense',
          reference_id: result.id,
          payment_date: data.expense_date,
          amount: data.amount,
          currency: data.currency || 'EGP',
          exchange_rate: rate,
          payment_method: data.payment_method,
        })
      }

      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all })
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم تسجيل المصروف')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('expenses').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: expenseKeys.all }); toast.success('تم تحديث المصروف') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useApproveExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approved_by }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({ approved_by, approved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: expenseKeys.all }); toast.success('تم اعتماد المصروف') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeleteExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: expenseKeys.all }); toast.success('تم حذف المصروف') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// PAYMENTS (unified ledger - purchase invoices, sales invoices, expenses)
// ════════════════════════════════════════════════════════════
export const paymentKeys = {
  all:  ['payments'],
  list: (f) => ['payments', 'list', f],
}

const fetchPayments = async (filters = {}) => {
  let q = supabase
    .from('payments')
    .select(`*, created_by_profile:profiles(full_name)`)
    .order('payment_date', { ascending: false })

  if (filters.reference_type) q = q.eq('reference_type', filters.reference_type)
  if (filters.date_from)      q = q.gte('payment_date', filters.date_from)
  if (filters.date_to)        q = q.lte('payment_date', filters.date_to)

  const { data, error } = await q.limit(filters.limit || 200)
  if (error) throw error
  return data
}

export const usePayments = (filters = {}) =>
  useQuery({ queryKey: paymentKeys.list(filters), queryFn: () => fetchPayments(filters) })

// Enriched payments with reference details (invoice numbers, party names)
const fetchEnrichedPayments = async (filters = {}) => {
  const payments = await fetchPayments(filters)

  // Fetch related invoice/expense details for display
  const enriched = await Promise.all(payments.map(async (p) => {
    if (p.reference_type === 'sales_invoice') {
      const { data } = await supabase
        .from('sales_invoices')
        .select('invoice_number, customer:customers(name)')
        .eq('id', p.reference_id)
        .maybeSingle()
      return { ...p, reference_label: data?.invoice_number, party_name: data?.customer?.name }
    }
    if (p.reference_type === 'purchase_invoice') {
      const { data } = await supabase
        .from('purchase_invoices')
        .select('invoice_number, supplier:suppliers(name)')
        .eq('id', p.reference_id)
        .maybeSingle()
      return { ...p, reference_label: data?.invoice_number, party_name: data?.supplier?.name }
    }
    if (p.reference_type === 'expense') {
      const { data } = await supabase
        .from('expenses')
        .select('reference_number, description')
        .eq('id', p.reference_id)
        .maybeSingle()
      return { ...p, reference_label: data?.reference_number, party_name: data?.description }
    }
    return p
  }))

  return enriched
}

export const useEnrichedPayments = (filters = {}) =>
  useQuery({ queryKey: ['payments', 'enriched', filters], queryFn: () => fetchEnrichedPayments(filters) })

// Smart payment creation - handles standalone payments AND optional invoice linking
export const useCreatePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ reference_type, reference_id, amount, currency, exchange_rate, payment_method, payment_date, notes, bank_name, check_number }) => {

      // If linked to an actual invoice, update that invoice's paid/remaining amounts too
      if (reference_id && (reference_type === 'sales_invoice' || reference_type === 'purchase_invoice')) {
        const table = reference_type === 'sales_invoice' ? 'sales_invoices' : 'purchase_invoices'
        const { data: inv } = await supabase
          .from(table)
          .select('total_amount, paid_amount' + (reference_type === 'sales_invoice' ? ', customer_id' : ''))
          .eq('id', reference_id)
          .single()

        if (inv) {
          const newPaid    = (inv.paid_amount || 0) + amount
          const remaining  = inv.total_amount - newPaid
          const status     = remaining <= 0 ? 'paid' : 'partially_paid'

          await supabase.from(table)
            .update({ paid_amount: newPaid, remaining_amount: remaining, status, payment_method, payment_date })
            .eq('id', reference_id)

          if (reference_type === 'sales_invoice' && inv.customer_id) {
            const { data: customer } = await supabase.from('customers').select('current_balance').eq('id', inv.customer_id).single()
            await supabase.from('customers')
              .update({ current_balance: Math.max(0, (customer?.current_balance || 0) - amount) })
              .eq('id', inv.customer_id)
          }
        }
      }

      // Always record in the unified ledger (linked or standalone — e.g. advance payment)
      const { data: result, error } = await supabase.from('payments').insert({
        reference_type, reference_id: reference_id || null,
        payment_date, amount, currency: currency || 'EGP',
        exchange_rate: exchange_rate || 1, payment_method,
        bank_name, check_number, notes,
      }).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.all })
      qc.invalidateQueries({ queryKey: ['sales_invoices'] })
      qc.invalidateQueries({ queryKey: ['purchase_invoices'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('تم تسجيل الدفعة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// OPEN INVOICES (for payment-linking dropdown)
// ════════════════════════════════════════════════════════════
export const useOpenSalesInvoices = () =>
  useQuery({
    queryKey: ['sales_invoices', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, remaining_amount, customer:customers(name)')
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

export const useOpenPurchaseInvoices = () =>
  useQuery({
    queryKey: ['purchase_invoices', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, total_amount, remaining_amount, supplier:suppliers(name)')
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

// ════════════════════════════════════════════════════════════
// FINANCIAL SUMMARY (for dashboards/reports)
// ════════════════════════════════════════════════════════════
export const useFinancialSummary = (dateFrom, dateTo) =>
  useQuery({
    queryKey: ['financial_summary', dateFrom, dateTo],
    queryFn: async () => {
      let salesQ = supabase.from('sales_invoices').select('total_amount, paid_amount, remaining_amount, invoice_date')
      let purchaseQ = supabase.from('purchase_invoices').select('total_egp, paid_amount, remaining_amount, invoice_date')
      let expenseQ = supabase.from('expenses').select('amount_egp, expense_date, category')

      if (dateFrom) {
        salesQ = salesQ.gte('invoice_date', dateFrom)
        purchaseQ = purchaseQ.gte('invoice_date', dateFrom)
        expenseQ = expenseQ.gte('expense_date', dateFrom)
      }
      if (dateTo) {
        salesQ = salesQ.lte('invoice_date', dateTo)
        purchaseQ = purchaseQ.lte('invoice_date', dateTo)
        expenseQ = expenseQ.lte('expense_date', dateTo)
      }

      const [sales, purchases, expenses] = await Promise.all([salesQ, purchaseQ, expenseQ])

      const totalSales      = sales.data?.reduce((s, r) => s + (+r.total_amount || 0), 0) || 0
      const totalPurchases  = purchases.data?.reduce((s, r) => s + (+r.total_egp || 0), 0) || 0
      const totalExpenses   = expenses.data?.reduce((s, r) => s + (+r.amount_egp || 0), 0) || 0
      const receivables     = sales.data?.reduce((s, r) => s + (+r.remaining_amount || 0), 0) || 0
      const payables        = purchases.data?.reduce((s, r) => s + (+r.remaining_amount || 0), 0) || 0

      const expensesByCategory = {}
      expenses.data?.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (+e.amount_egp || 0)
      })

      return {
        totalSales, totalPurchases, totalExpenses,
        grossProfit: totalSales - totalPurchases,
        netProfit:   totalSales - totalPurchases - totalExpenses,
        receivables, payables,
        expensesByCategory,
      }
    },
  })
