import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// Each notification: { id, type, title, subtitle, severity, link, created_at }
const fetchNotifications = async (can) => {
  const notifications = []
  const today = new Date().toISOString().split('T')[0]

  // ── Overdue sales invoices ──────────────────────────────────
  if (can('sales', 'view') || can('finance', 'view')) {
    const { data } = await supabase
      .from('sales_invoices')
      .select('id, invoice_number, due_date, remaining_amount, customer:customers(name)')
      .neq('status', 'paid')
      .neq('status', 'cancelled')
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10)

    data?.forEach(inv => {
      notifications.push({
        id: `si-${inv.id}`,
        type: 'sales_invoice_overdue',
        severity: 'high',
        title: `فاتورة بيع متأخرة — ${inv.invoice_number}`,
        subtitle: `${inv.customer?.name || ''} — متبقي ${(+inv.remaining_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP`,
        link: '/sales-invoices',
        date: inv.due_date,
      })
    })
  }

  // ── Overdue purchase invoices ────────────────────────────────
  if (can('suppliers', 'view') || can('finance', 'view')) {
    const { data } = await supabase
      .from('purchase_invoices')
      .select('id, invoice_number, due_date, remaining_amount, supplier:suppliers(name)')
      .neq('status', 'paid')
      .neq('status', 'cancelled')
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10)

    data?.forEach(inv => {
      notifications.push({
        id: `pi-${inv.id}`,
        type: 'purchase_invoice_overdue',
        severity: 'high',
        title: `فاتورة شراء مستحقة — ${inv.invoice_number}`,
        subtitle: `${inv.supplier?.name || ''} — متبقي ${(+inv.remaining_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP`,
        link: '/purchase-invoices',
        date: inv.due_date,
      })
    })
  }

  // ── Low stock items ───────────────────────────────────────────
  if (can('warehouse', 'view')) {
    const { data: stock } = await supabase
      .from('warehouse_stock')
      .select('item_id, quantity, item:items(id, code, name, reorder_point)')

    const byItem = {}
    stock?.forEach(s => {
      if (!s.item) return
      byItem[s.item_id] = byItem[s.item_id] || { item: s.item, total: 0 }
      byItem[s.item_id].total += +s.quantity || 0
    })

    Object.values(byItem)
      .filter(({ item, total }) => item.reorder_point > 0 && total <= item.reorder_point)
      .slice(0, 8)
      .forEach(({ item, total }) => {
        notifications.push({
          id: `stock-${item.id}`,
          type: 'low_stock',
          severity: total <= item.reorder_point * 0.5 ? 'high' : 'medium',
          title: `مخزون منخفض — ${item.name}`,
          subtitle: `الرصيد الحالي ${total.toLocaleString()} (الحد ${item.reorder_point.toLocaleString()})`,
          link: '/items',
          date: today,
        })
      })
  }

  // ── Purchase orders pending approval ─────────────────────────
  if (can('suppliers', 'approve')) {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, total_amount_egp, supplier:suppliers(name)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(8)

    data?.forEach(po => {
      notifications.push({
        id: `po-${po.id}`,
        type: 'po_pending',
        severity: 'medium',
        title: `أمر شراء بانتظار الاعتماد — ${po.po_number}`,
        subtitle: `${po.supplier?.name || ''} — ${(+po.total_amount_egp).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP`,
        link: '/purchase-orders',
        date: today,
      })
    })
  }

  // ── Leave requests pending approval ──────────────────────────
  if (can('hr', 'approve')) {
    const { data } = await supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, employee:employees(full_name_ar)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(8)

    data?.forEach(lr => {
      notifications.push({
        id: `leave-${lr.id}`,
        type: 'leave_pending',
        severity: 'low',
        title: `طلب إجازة — ${lr.employee?.full_name_ar || ''}`,
        subtitle: `من ${lr.start_date} إلى ${lr.end_date}`,
        link: '/employees',
        date: today,
      })
    })
  }

  // ── Expenses pending approval ────────────────────────────────
  if (can('finance', 'approve')) {
    const { data } = await supabase
      .from('expenses')
      .select('id, reference_number, description, amount_egp')
      .is('approved_by', null)
      .order('created_at', { ascending: false })
      .limit(8)

    data?.forEach(exp => {
      notifications.push({
        id: `exp-${exp.id}`,
        type: 'expense_pending',
        severity: 'low',
        title: `مصروف بانتظار الاعتماد — ${exp.reference_number}`,
        subtitle: `${exp.description} — ${(+exp.amount_egp).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP`,
        link: '/expenses',
        date: today,
      })
    })
  }

  // Sort: high severity first, then by date desc
  const severityWeight = { high: 0, medium: 1, low: 2 }
  notifications.sort((a, b) => {
    const sw = severityWeight[a.severity] - severityWeight[b.severity]
    if (sw !== 0) return sw
    return (b.date || '').localeCompare(a.date || '')
  })

  return notifications
}

export const useNotifications = () => {
  const can = useAuthStore(s => s.can)
  const profile = useAuthStore(s => s.profile)

  return useQuery({
    queryKey: ['notifications', profile?.role],
    queryFn: () => fetchNotifications(can),
    enabled: !!profile,
    refetchInterval: 1000 * 60 * 5, // refresh every 5 minutes
  })
}
