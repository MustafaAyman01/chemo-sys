import { useState } from 'react'
import { Plus, Eye, ClipboardList, Trash2, Loader2 } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBOMs, useCreateBOM } from '../hooks/useProduction'
import { useRawMaterials, useFinishedProducts } from '../hooks/useItems'
import { useAuthStore } from '../store/authStore'
import {
  PageHeader, FiltersBar, EmptyState, Modal, FormField, StatsRow,
} from '../components/ui'

// ── Schema ────────────────────────────────────────────────────
const bomSchema = z.object({
  finished_product_id: z.string().min(1, 'اختر المنتج النهائي'),
  version:              z.string().default('1.0'),
  notes:                z.string().optional(),
  items: z.array(z.object({
    raw_material_id:   z.string().min(1, 'اختر الخامة'),
    quantity_per_unit: z.coerce.number().min(0.0001, 'الكمية مطلوبة'),
    waste_pct:          z.coerce.number().min(0).max(100).default(0),
  })).min(1, 'أضف خامة واحدة على الأقل'),
})

// ── BOM Form ──────────────────────────────────────────────────
function BOMForm({ onSubmit }) {
  const { data: products = [] }      = useFinishedProducts()
  const { data: rawMaterials = [] }  = useRawMaterials()

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      version: '1.0',
      items: [{ raw_material_id: '', quantity_per_unit: 0, waste_pct: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const productId  = watch('finished_product_id')
  const selectedProduct = products.find(p => p.id === productId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="bom-form">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <FormField label="المنتج النهائي" required error={errors.finished_product_id?.message}>
          <select className={`form-input ${errors.finished_product_id ? 'error' : ''}`} {...register('finished_product_id')}>
            <option value="">اختر المنتج</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </FormField>
        <FormField label="الإصدار">
          <input className="form-input" {...register('version')} />
        </FormField>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
            مكونات الخلطة (لكل 1 {selectedProduct?.unit || 'وحدة'} منتج)
          </div>
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={() => append({ raw_material_id: '', quantity_per_unit: 0, waste_pct: 0 })}>
            <Plus size={13} /> إضافة خامة
          </button>
        </div>

        <div style={{ border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8f9fb' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280' }}>الخامة</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280', width: '20%' }}>الكمية / وحدة</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#6b7280', width: '15%' }}>نسبة الهالك %</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const row = watchItems[idx] || {}
                const rm  = rawMaterials.find(m => m.id === row.raw_material_id)
                return (
                  <tr key={field.id} style={{ borderTop: '1px solid #f0f1f3' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select className="form-input" style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.raw_material_id`)}>
                        <option value="">اختر الخامة</option>
                        {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" step="0.0001" className="form-input ltr"
                          style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.quantity_per_unit`)} dir="ltr" />
                        {rm && <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{rm.unit}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" step="0.1" className="form-input ltr"
                        style={{ height: 34, fontSize: 12 }} {...register(`items.${idx}.waste_pct`)} dir="ltr" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FormField label="ملاحظات">
        <textarea className="form-input" rows={2} {...register('notes')} />
      </FormField>
    </form>
  )
}

// ── BOM Detail Modal ──────────────────────────────────────────
function BOMDetailModal({ bom, open, onClose }) {
  if (!bom) return null
  return (
    <Modal open={open} onClose={onClose} title={`تكوين منتج — ${bom.finished_product?.name}`} size="lg">
      <div style={{ background: '#f8f9fb', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>المنتج النهائي</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{bom.finished_product?.name}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>الإصدار {bom.version} · لكل 1 {bom.finished_product?.unit}</div>
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>الخامة</th>
              <th>الكمية المطلوبة</th>
              <th>نسبة الهالك</th>
              <th>الكمية الفعلية (شاملة الهالك)</th>
            </tr>
          </thead>
          <tbody>
            {bom.bom_items?.map(item => {
              const actual = item.quantity_per_unit * (1 + (item.waste_pct || 0) / 100)
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.raw_material?.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.raw_material?.code}</div>
                  </td>
                  <td className="num">{item.quantity_per_unit} {item.raw_material?.unit}</td>
                  <td>{item.waste_pct > 0 ? `${item.waste_pct}%` : '—'}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{actual.toFixed(4)} {item.raw_material?.unit}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bom.notes && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
          {bom.notes}
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function BOMPage() {
  const { user } = useAuthStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [viewBom, setViewBom]       = useState(null)

  const { data: boms = [], isLoading } = useBOMs({ is_active: true })
  const createMutation = useCreateBOM()

  const handleCreate = async (data) => {
    await createMutation.mutateAsync({
      finished_product_id: data.finished_product_id,
      version: data.version,
      notes: data.notes,
      created_by: user.id,
      items: data.items,
    })
    setCreateOpen(false)
  }

  const stats = [
    { label: 'إجمالي التكوينات', value: boms.length, color: '#3d62f3' },
    { label: 'منتجات لها تكوين', value: new Set(boms.map(b => b.finished_product_id)).size, color: '#16a34a' },
    { label: 'متوسط عدد الخامات', value: boms.length ? (boms.reduce((s, b) => s + (b.bom_items?.length || 0), 0) / boms.length).toFixed(1) : 0, color: '#8b5cf6' },
  ]

  return (
    <div>
      <PageHeader
        title="تكوين المنتج (BOM)"
        subtitle="تحديد الخامات اللازمة لتصنيع كل منتج نهائي"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> تكوين جديد
          </button>
        }
      />

      <StatsRow stats={stats} />

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
        </div>
      ) : boms.length === 0 ? (
        <div className="card">
          <EmptyState icon={ClipboardList} title="لا يوجد تكوينات منتج بعد"
            subtitle="حدد مكونات كل منتج نهائي عشان نقدر نحسب الإنتاج تلقائياً"
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> تكوين جديد</button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {boms.map(bom => (
            <div key={bom.id} className="card" style={{ padding: 18, cursor: 'pointer' }} onClick={() => setViewBom(bom)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} color="#3d62f3" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{bom.finished_product?.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>إصدار {bom.version}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {bom.bom_items?.length || 0} خامة في التركيبة
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {bom.bom_items?.slice(0, 3).map(i => (
                  <span key={i.id} style={{ fontSize: 11, background: '#f4f5f8', padding: '3px 8px', borderRadius: 6, color: '#6b7280' }}>
                    {i.raw_material?.name}
                  </span>
                ))}
                {bom.bom_items?.length > 3 && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>+{bom.bom_items.length - 3} أخرى</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={createOpen} onClose={() => setCreateOpen(false)}
        title="تكوين منتج جديد (BOM)" size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="bom-form" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'حفظ التكوين'}
            </button>
          </>
        }
      >
        <BOMForm onSubmit={handleCreate} />
      </Modal>

      <BOMDetailModal bom={viewBom} open={!!viewBom} onClose={() => setViewBom(null)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
