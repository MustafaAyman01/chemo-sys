import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const warehouseKeys = {
  all:    ['warehouses'],
  list:   (f) => ['warehouses', 'list', f],
  detail: (id) => ['warehouses', 'detail', id],
  stock:  (id) => ['warehouses', 'stock', id],
}

// ── Warehouses ────────────────────────────────────────────────
const fetchWarehouses = async (filters = {}) => {
  let q = supabase.from('warehouses').select('*').order('code')
  if (filters.type)      q = q.eq('type', filters.type)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useWarehouses = (filters = {}) =>
  useQuery({ queryKey: warehouseKeys.list(filters), queryFn: () => fetchWarehouses(filters) })

// ── Stock per warehouse (joined with item info) ─────────────────
const fetchWarehouseStock = async (warehouseId) => {
  let q = supabase
    .from('warehouse_stock')
    .select(`
      *,
      item:items(id, code, name, name_ar, category, unit, minimum_stock, reorder_point, hazard_class)
    `)
    .order('quantity', { ascending: false })

  if (warehouseId) q = q.eq('warehouse_id', warehouseId)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useWarehouseStock = (warehouseId) =>
  useQuery({
    queryKey: warehouseKeys.stock(warehouseId || 'all'),
    queryFn:  () => fetchWarehouseStock(warehouseId),
  })

// ── All stock across warehouses (for the items overview page) ───
const fetchAllStock = async () => {
  const { data, error } = await supabase
    .from('warehouse_stock')
    .select(`
      *,
      item:items(id, code, name, name_ar, category, unit, minimum_stock, reorder_point),
      warehouse:warehouses(id, code, name, type)
    `)
    .order('quantity', { ascending: false })
  if (error) throw error
  return data
}

export const useAllStock = () =>
  useQuery({ queryKey: ['warehouse_stock', 'all'], queryFn: fetchAllStock })

// ── Stock Movements ───────────────────────────────────────────
export const movementKeys = {
  all:  ['stock_movements'],
  list: (f) => ['stock_movements', 'list', f],
}

const fetchMovements = async (filters = {}) => {
  let q = supabase
    .from('stock_movements')
    .select(`
      *,
      item:items(id, code, name, unit),
      warehouse:warehouses(id, code, name),
      created_by_profile:profiles(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 100)

  if (filters.warehouse_id)   q = q.eq('warehouse_id', filters.warehouse_id)
  if (filters.item_id)        q = q.eq('item_id', filters.item_id)
  if (filters.movement_type)  q = q.eq('movement_type', filters.movement_type)
  if (filters.date_from)      q = q.gte('created_at', filters.date_from)
  if (filters.date_to)        q = q.lte('created_at', filters.date_to)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useStockMovements = (filters = {}) =>
  useQuery({ queryKey: movementKeys.list(filters), queryFn: () => fetchMovements(filters) })

// ── Create manual movement (adjustment / transfer) ──────────────
export const useCreateMovement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (movement) => {
      // 1. Get current stock
      const { data: existing } = await supabase
        .from('warehouse_stock')
        .select('*')
        .eq('warehouse_id', movement.warehouse_id)
        .eq('item_id', movement.item_id)
        .maybeSingle()

      const isIncoming = movement.movement_type.includes('_in')
      const currentQty  = existing?.quantity || 0
      const delta       = isIncoming ? +movement.quantity : -movement.quantity
      const newQty      = currentQty + delta

      if (newQty < 0) {
        throw new Error('الكمية غير كافية في المخزون')
      }

      // 2. Upsert stock
      const { error: stockErr } = await supabase
        .from('warehouse_stock')
        .upsert({
          warehouse_id: movement.warehouse_id,
          item_id:      movement.item_id,
          quantity:     newQty,
          avg_cost:     movement.unit_cost || existing?.avg_cost || 0,
          last_movement_at: new Date().toISOString(),
        }, { onConflict: 'warehouse_id,item_id' })
      if (stockErr) throw stockErr

      // 3. Insert movement record
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          ...movement,
          balance_after: newQty,
          total_cost: movement.unit_cost ? movement.unit_cost * movement.quantity : null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: movementKeys.all })
      qc.invalidateQueries({ queryKey: warehouseKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم تسجيل الحركة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ── Transfer between warehouses (creates 2 linked movements) ────
export const useTransferStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ from_warehouse_id, to_warehouse_id, item_id, quantity, notes, created_by }) => {
      // Check source stock
      const { data: sourceStock } = await supabase
        .from('warehouse_stock')
        .select('quantity, avg_cost')
        .eq('warehouse_id', from_warehouse_id)
        .eq('item_id', item_id)
        .maybeSingle()

      if (!sourceStock || sourceStock.quantity < quantity) {
        throw new Error('الكمية غير كافية في المخزن المصدر')
      }

      const unitCost = sourceStock.avg_cost || 0

      // Deduct from source
      const newSourceQty = sourceStock.quantity - quantity
      await supabase.from('warehouse_stock').update({
        quantity: newSourceQty, last_movement_at: new Date().toISOString(),
      }).eq('warehouse_id', from_warehouse_id).eq('item_id', item_id)

      await supabase.from('stock_movements').insert({
        reference_type: 'transfer', movement_type: 'transfer_out',
        warehouse_id: from_warehouse_id, item_id, quantity,
        unit_cost: unitCost, total_cost: unitCost * quantity,
        balance_after: newSourceQty, notes, created_by,
      })

      // Add to destination
      const { data: destStock } = await supabase
        .from('warehouse_stock')
        .select('quantity')
        .eq('warehouse_id', to_warehouse_id)
        .eq('item_id', item_id)
        .maybeSingle()

      const newDestQty = (destStock?.quantity || 0) + quantity

      await supabase.from('warehouse_stock').upsert({
        warehouse_id: to_warehouse_id, item_id, quantity: newDestQty,
        avg_cost: unitCost, last_movement_at: new Date().toISOString(),
      }, { onConflict: 'warehouse_id,item_id' })

      await supabase.from('stock_movements').insert({
        reference_type: 'transfer', movement_type: 'transfer_in',
        warehouse_id: to_warehouse_id, item_id, quantity,
        unit_cost: unitCost, total_cost: unitCost * quantity,
        balance_after: newDestQty, notes, created_by,
      })

      return { newSourceQty, newDestQty }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: movementKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم تحويل المخزون بنجاح')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ── Warehouse CRUD ─────────────────────────────────────────────
export const useCreateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('warehouses').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseKeys.all })
      toast.success('تم إضافة المخزن')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('warehouses').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warehouseKeys.all })
      toast.success('تم تحديث المخزن')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
