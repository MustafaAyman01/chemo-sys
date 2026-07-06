import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ════════════════════════════════════════════════════════════
// SALES ORDERS
// ════════════════════════════════════════════════════════════
export const soKeys = {
  all:    ['sales_orders'],
  list:   (f)  => ['sales_orders', 'list', f],
  detail: (id) => ['sales_orders', 'detail', id],
}

const fetchSalesOrders = async (filters = {}) => {
  let q = supabase
    .from('sales_orders')
    .select(`
      *,
      customer:customers(id, name, industry, credit_limit, current_balance),
      warehouse:warehouses(id, name),
      created_by_profile:profiles!sales_orders_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters.search)      q = q.ilike('order_number', `%${filters.search}%`)
  if (filters.status)      q = q.eq('status', filters.status)
  if (filters.customer_id) q = q.eq('customer_id', filters.customer_id)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchSalesOrder = async (id) => {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customer:customers(*),
      warehouse:warehouses(*),
      items:sales_order_items(*, item:items(id, code, name, unit))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const useSalesOrders = (filters = {}) =>
  useQuery({ queryKey: soKeys.list(filters), queryFn: () => fetchSalesOrders(filters) })

export const useSalesOrder = (id) =>
  useQuery({ queryKey: soKeys.detail(id), queryFn: () => fetchSalesOrder(id), enabled: !!id })

export const useCreateSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, ...orderData }) => {
      const { data: order, error } = await supabase.from('sales_orders').insert(orderData).select().single()
      if (error) throw error

      if (items?.length) {
        const { error: itemsErr } = await supabase
          .from('sales_order_items')
          .insert(items.map(i => ({ ...i, order_id: order.id })))
        if (itemsErr) throw itemsErr
      }

      // Reserve stock for confirmed orders
      if (orderData.warehouse_id && items?.length) {
        for (const item of items) {
          const { data: stock } = await supabase
            .from('warehouse_stock')
            .select('reserved_quantity')
            .eq('warehouse_id', orderData.warehouse_id)
            .eq('item_id', item.item_id)
            .maybeSingle()
          if (stock) {
            await supabase
              .from('warehouse_stock')
              .update({ reserved_quantity: (stock.reserved_quantity || 0) + item.quantity })
              .eq('warehouse_id', orderData.warehouse_id)
              .eq('item_id', item.item_id)
          }
        }
      }
      return order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم إنشاء أمر البيع')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Ship order: deduct actual stock + release reservation
export const useShipSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, items, warehouse_id, created_by }) => {
      for (const item of items) {
        const { data: stock } = await supabase
          .from('warehouse_stock')
          .select('quantity, reserved_quantity, avg_cost')
          .eq('warehouse_id', warehouse_id)
          .eq('item_id', item.item_id)
          .single()

        const newQty      = stock.quantity - item.quantity
        const newReserved = Math.max(0, (stock.reserved_quantity || 0) - item.quantity)

        if (newQty < 0) throw new Error(`الكمية غير كافية من ${item.item_id}`)

        await supabase
          .from('warehouse_stock')
          .update({ quantity: newQty, reserved_quantity: newReserved, last_movement_at: new Date().toISOString() })
          .eq('warehouse_id', warehouse_id)
          .eq('item_id', item.item_id)

        await supabase.from('stock_movements').insert({
          reference_type: 'sales', reference_id: orderId,
          movement_type: 'sales_out',
          warehouse_id, item_id: item.item_id,
          quantity: item.quantity, unit_cost: stock.avg_cost,
          total_cost: stock.avg_cost * item.quantity,
          balance_after: newQty, created_by,
        })

        await supabase
          .from('sales_order_items')
          .update({ delivered_quantity: item.quantity })
          .eq('order_id', orderId)
          .eq('item_id', item.item_id)
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status: 'delivered', delivery_date: new Date().toISOString().split('T')[0] })
        .eq('id', orderId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم تسليم الطلب وخصم المخزون')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateSOStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, approved_by }) => {
      const update = { status }
      if (status === 'confirmed' && approved_by) {
        update.approved_by = approved_by
        update.approved_at = new Date().toISOString()
      }
      const { data, error } = await supabase.from('sales_orders').update(update).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: soKeys.all }); toast.success('تم تحديث الحالة') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useCancelSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('sales_orders').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: soKeys.all }); toast.success('تم إلغاء أمر البيع') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// SALES INVOICES
// ════════════════════════════════════════════════════════════
export const siKeys = {
  all:    ['sales_invoices'],
  list:   (f)  => ['sales_invoices', 'list', f],
  detail: (id) => ['sales_invoices', 'detail', id],
}

const fetchSalesInvoices = async (filters = {}) => {
  let q = supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(id, name, industry, tax_number),
      order:sales_orders(order_number),
      created_by_profile:profiles!sales_invoices_created_by_fkey(full_name)
    `)
    .order('invoice_date', { ascending: false })

  if (filters.search)      q = q.ilike('invoice_number', `%${filters.search}%`)
  if (filters.status)      q = q.eq('status', filters.status)
  if (filters.customer_id) q = q.eq('customer_id', filters.customer_id)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchSalesInvoice = async (id) => {
  const { data, error } = await supabase
    .from('sales_invoices')
    .select(`
      *,
      customer:customers(*),
      order:sales_orders(order_number),
      items:sales_invoice_items(*, item:items(id, code, name, unit))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const useSalesInvoices = (filters = {}) =>
  useQuery({ queryKey: siKeys.list(filters), queryFn: () => fetchSalesInvoices(filters) })

export const useSalesInvoice = (id) =>
  useQuery({ queryKey: siKeys.detail(id), queryFn: () => fetchSalesInvoice(id), enabled: !!id })

export const useCreateSalesInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, ...invoiceData }) => {
      const { data: inv, error } = await supabase
        .from('sales_invoices')
        .insert({ ...invoiceData, remaining_amount: invoiceData.total_amount })
        .select()
        .single()
      if (error) throw error

      if (items?.length) {
        const { error: iErr } = await supabase
          .from('sales_invoice_items')
          .insert(items.map(i => ({ ...i, invoice_id: inv.id })))
        if (iErr) throw iErr
      }

      // Update customer balance
      const { data: customer } = await supabase
        .from('customers').select('current_balance').eq('id', invoiceData.customer_id).single()
      await supabase
        .from('customers')
        .update({ current_balance: (customer?.current_balance || 0) + invoiceData.total_amount })
        .eq('id', invoiceData.customer_id)

      return inv
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: siKeys.all })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('تم إنشاء الفاتورة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateSalesInvoicePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, paid_amount, payment_method, payment_date }) => {
      const { data: inv } = await supabase
        .from('sales_invoices')
        .select('total_amount, paid_amount, customer_id, currency, exchange_rate')
        .eq('id', id)
        .single()

      const newPaid    = (inv.paid_amount || 0) + paid_amount
      const remaining   = inv.total_amount - newPaid
      const status      = remaining <= 0 ? 'paid' : 'partially_paid'

      const { data, error } = await supabase
        .from('sales_invoices')
        .update({ paid_amount: newPaid, remaining_amount: remaining, status, payment_method, payment_date })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Update customer balance
      const { data: customer } = await supabase
        .from('customers').select('current_balance').eq('id', inv.customer_id).single()
      await supabase
        .from('customers')
        .update({ current_balance: Math.max(0, (customer?.current_balance || 0) - paid_amount) })
        .eq('id', inv.customer_id)

      // Record in unified payments ledger
      await supabase.from('payments').insert({
        reference_type: 'sales_invoice',
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
      qc.invalidateQueries({ queryKey: siKeys.all })
      qc.invalidateQueries({ queryKey: siKeys.detail(vars.id) })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم تسجيل الدفعة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
