import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ════════════════════════════════════════════════════════════
// FACTORIES
// ════════════════════════════════════════════════════════════
export const factoryKeys = {
  all:  ['factories'],
  list: (f) => ['factories', 'list', f],
}

const fetchFactories = async (filters = {}) => {
  let q = supabase.from('factories').select('*, warehouse:warehouses(id, name)').order('code')
  if (filters.type)      q = q.eq('type', filters.type)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useFactories = (filters = {}) =>
  useQuery({ queryKey: factoryKeys.list(filters), queryFn: () => fetchFactories(filters) })

export const useCreateFactory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('factories').insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: factoryKeys.all }); toast.success('تم إضافة المصنع') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateFactory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase.from('factories').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: factoryKeys.all }); toast.success('تم تحديث المصنع') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// BILL OF MATERIALS (BOM)
// ════════════════════════════════════════════════════════════
export const bomKeys = {
  all:    ['bom'],
  list:   (f)  => ['bom', 'list', f],
  detail: (id) => ['bom', 'detail', id],
  byProduct: (productId) => ['bom', 'product', productId],
}

const fetchBOMs = async (filters = {}) => {
  let q = supabase
    .from('bill_of_materials')
    .select(`
      *,
      finished_product:items!bill_of_materials_finished_product_id_fkey(id, code, name, unit),
      bom_items(
        *,
        raw_material:items!bom_items_raw_material_id_fkey(id, code, name, unit)
      )
    `)
    .order('created_at', { ascending: false })

  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  if (filters.finished_product_id) q = q.eq('finished_product_id', filters.finished_product_id)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchBOM = async (id) => {
  const { data, error } = await supabase
    .from('bill_of_materials')
    .select(`
      *,
      finished_product:items!bill_of_materials_finished_product_id_fkey(id, code, name, unit),
      bom_items(*, raw_material:items!bom_items_raw_material_id_fkey(id, code, name, unit))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const useBOMs = (filters = {}) =>
  useQuery({ queryKey: bomKeys.list(filters), queryFn: () => fetchBOMs(filters) })

export const useBOM = (id) =>
  useQuery({ queryKey: bomKeys.detail(id), queryFn: () => fetchBOM(id), enabled: !!id })

export const useActiveBOMForProduct = (productId) =>
  useQuery({
    queryKey: bomKeys.byProduct(productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bill_of_materials')
        .select(`*, bom_items(*, raw_material:items!bom_items_raw_material_id_fkey(id, code, name, unit))`)
        .eq('finished_product_id', productId)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!productId,
  })

export const useCreateBOM = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, ...bomData }) => {
      const { data: bom, error } = await supabase.from('bill_of_materials').insert(bomData).select().single()
      if (error) throw error

      if (items?.length) {
        const { error: itemsErr } = await supabase
          .from('bom_items')
          .insert(items.map(i => ({ ...i, bom_id: bom.id })))
        if (itemsErr) throw itemsErr
      }
      return bom
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: bomKeys.all }); toast.success('تم إنشاء تكوين المنتج') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// PRODUCTION ORDERS
// ════════════════════════════════════════════════════════════
export const productionKeys = {
  all:    ['production_orders'],
  list:   (f)  => ['production_orders', 'list', f],
  detail: (id) => ['production_orders', 'detail', id],
}

const fetchProductionOrders = async (filters = {}) => {
  let q = supabase
    .from('production_orders')
    .select(`
      *,
      factory:factories(id, name, type, cost_per_ton),
      finished_product:items!production_orders_finished_product_id_fkey(id, code, name, unit),
      created_by_profile:profiles!production_orders_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (filters.search)     q = q.ilike('order_number', `%${filters.search}%`)
  if (filters.status)     q = q.eq('status', filters.status)
  if (filters.factory_id) q = q.eq('factory_id', filters.factory_id)

  const { data, error } = await q
  if (error) throw error
  return data
}

const fetchProductionOrder = async (id) => {
  const { data, error } = await supabase
    .from('production_orders')
    .select(`
      *,
      factory:factories(*),
      finished_product:items!production_orders_finished_product_id_fkey(*),
      bom:bill_of_materials(*, bom_items(*, raw_material:items!bom_items_raw_material_id_fkey(*))),
      materials:production_materials(*, item:items(id, code, name, unit), warehouse:warehouses(id, name))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const useProductionOrders = (filters = {}) =>
  useQuery({ queryKey: productionKeys.list(filters), queryFn: () => fetchProductionOrders(filters) })

export const useProductionOrder = (id) =>
  useQuery({ queryKey: productionKeys.detail(id), queryFn: () => fetchProductionOrder(id), enabled: !!id })

// Create production order (planned, materials reserved)
export const useCreateProductionOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ materials, raw_material_warehouse_id, ...orderData }) => {
      const { data: order, error } = await supabase
        .from('production_orders')
        .insert(orderData)
        .select()
        .single()
      if (error) throw error

      // Insert planned materials + reserve stock
      if (materials?.length) {
        const { error: matErr } = await supabase
          .from('production_materials')
          .insert(materials.map(m => ({
            production_order_id: order.id,
            item_id: m.item_id,
            warehouse_id: raw_material_warehouse_id,
            planned_quantity: m.planned_quantity,
            unit_cost: m.unit_cost || 0,
          })))
        if (matErr) throw matErr

        // Reserve stock for each material
        for (const m of materials) {
          const { data: stock } = await supabase
            .from('warehouse_stock')
            .select('reserved_quantity')
            .eq('warehouse_id', raw_material_warehouse_id)
            .eq('item_id', m.item_id)
            .maybeSingle()

          if (stock) {
            await supabase
              .from('warehouse_stock')
              .update({ reserved_quantity: (stock.reserved_quantity || 0) + m.planned_quantity })
              .eq('warehouse_id', raw_material_warehouse_id)
              .eq('item_id', m.item_id)
          }
        }
      }
      return order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productionKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم إنشاء أمر الإنتاج')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Start production (consume raw materials from warehouse)
export const useStartProduction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, materials, raw_material_warehouse_id, created_by }) => {
      for (const m of materials) {
        const { data: stock } = await supabase
          .from('warehouse_stock')
          .select('quantity, reserved_quantity, avg_cost')
          .eq('warehouse_id', raw_material_warehouse_id)
          .eq('item_id', m.item_id)
          .single()

        const newQty = stock.quantity - m.actual_quantity
        const newReserved = Math.max(0, (stock.reserved_quantity || 0) - m.planned_quantity)

        if (newQty < 0) throw new Error(`الكمية غير كافية من الخامة المطلوبة`)

        await supabase
          .from('warehouse_stock')
          .update({ quantity: newQty, reserved_quantity: newReserved, last_movement_at: new Date().toISOString() })
          .eq('warehouse_id', raw_material_warehouse_id)
          .eq('item_id', m.item_id)

        await supabase.from('stock_movements').insert({
          reference_type: 'production', reference_id: orderId,
          movement_type: 'production_out',
          warehouse_id: raw_material_warehouse_id, item_id: m.item_id,
          quantity: m.actual_quantity, unit_cost: stock.avg_cost,
          total_cost: stock.avg_cost * m.actual_quantity,
          balance_after: newQty, created_by,
        })

        await supabase
          .from('production_materials')
          .update({ actual_quantity: m.actual_quantity, total_cost: stock.avg_cost * m.actual_quantity })
          .eq('id', m.id)
      }

      const { data, error } = await supabase
        .from('production_orders')
        .update({ status: 'in_progress', actual_start_date: new Date().toISOString().split('T')[0] })
        .eq('id', orderId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productionKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم بدء الإنتاج وصرف الخامات')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Complete production (add finished goods to warehouse)
export const useCompleteProduction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, finished_product_id, actual_quantity, fg_warehouse_id, unit_cost, created_by }) => {
      const { data: stock } = await supabase
        .from('warehouse_stock')
        .select('quantity')
        .eq('warehouse_id', fg_warehouse_id)
        .eq('item_id', finished_product_id)
        .maybeSingle()

      const newQty = (stock?.quantity || 0) + actual_quantity

      await supabase
        .from('warehouse_stock')
        .upsert({
          warehouse_id: fg_warehouse_id, item_id: finished_product_id,
          quantity: newQty, avg_cost: unit_cost, last_movement_at: new Date().toISOString(),
        }, { onConflict: 'warehouse_id,item_id' })

      await supabase.from('stock_movements').insert({
        reference_type: 'production', reference_id: orderId,
        movement_type: 'production_in',
        warehouse_id: fg_warehouse_id, item_id: finished_product_id,
        quantity: actual_quantity, unit_cost, total_cost: unit_cost * actual_quantity,
        balance_after: newQty, created_by,
      })

      const { data, error } = await supabase
        .from('production_orders')
        .update({
          status: 'completed',
          actual_quantity,
          unit_cost,
          total_cost: unit_cost * actual_quantity,
          actual_end_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', orderId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productionKeys.all })
      qc.invalidateQueries({ queryKey: ['warehouse_stock'] })
      toast.success('تم إكمال الإنتاج وإضافة المنتج للمخزون')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useCancelProductionOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('production_orders').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: productionKeys.all }); toast.success('تم إلغاء أمر الإنتاج') },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
