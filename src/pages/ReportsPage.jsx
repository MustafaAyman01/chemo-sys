import { useState } from 'react'
import {
  BarChart3, Download, TrendingUp, TrendingDown, DollarSign,
  Package, Users, FileText, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useFinancialSummary } from '../hooks/useFinance'
import { useSalesInvoices } from '../hooks/useSales'
import { usePurchaseInvoices } from '../hooks/usePurchaseInvoices'
import { useAllStock } from '../hooks/useWarehouses'
import { useCustomers } from '../hooks/useCustomers'
import { useSuppliers } from '../hooks/useSuppliers'
import Papa from 'papaparse'
import { PageHeader, StatsRow } from '../components/ui'

const COLORS = ['#3d62f3', '#21aaa3', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4']

function fmtEGP(n) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)
}

function downloadCSV(data, filename) {
  const csv = Papa.unparse(data)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><span style={{ fontWeight: 600 }}>{fmtEGP(p.value)} EGP</span>
        </div>
      ))}
    </div>
  )
}

const EXPENSE_CATEGORY_LABELS = {
  utilities: 'مرافق', rent: 'إيجارات', maintenance: 'صيانة', transportation: 'نقل',
  logistics: 'لوجستيات', marketing: 'تسويق', admin: 'إدارية', legal: 'قانونية',
  insurance: 'تأمين', customs: 'جمارك', port_fees: 'رسوم موانئ', lab_testing: 'فحوصات',
  safety: 'سلامة', it: 'تكنولوجيا', other: 'أخرى',
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const { data: summary, isLoading: summaryLoading } = useFinancialSummary(dateFrom, dateTo)
  const { data: salesInvoices = [] } = useSalesInvoices({})
  const { data: purchaseInvoices = [] } = usePurchaseInvoices({})
  const { data: stock = [] } = useAllStock()
  const { data: customers = [] } = useCustomers({ is_active: true })
  const { data: suppliers = [] } = useSuppliers({ is_active: true })

  // Monthly sales/purchase trend (last 6 months from invoices)
  const monthlyTrend = (() => {
    const map = {}
    salesInvoices.forEach(inv => {
      const key = inv.invoice_date?.slice(0, 7)
      if (!key) return
      map[key] = map[key] || { month: key, sales: 0, purchases: 0 }
      map[key].sales += +inv.total_amount || 0
    })
    purchaseInvoices.forEach(inv => {
      const key = inv.invoice_date?.slice(0, 7)
      if (!key) return
      map[key] = map[key] || { month: key, sales: 0, purchases: 0 }
      map[key].purchases += +inv.total_egp || 0
    })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  })()

  // Top customers by revenue
  const topCustomers = (() => {
    const map = {}
    salesInvoices.forEach(inv => {
      const name = inv.customer?.name || 'غير معروف'
      map[name] = (map[name] || 0) + (+inv.total_amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))
  })()

  // Expense breakdown
  const expenseBreakdown = summary?.expensesByCategory
    ? Object.entries(summary.expensesByCategory).map(([cat, value]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat] || cat, value,
      })).sort((a, b) => b.value - a.value)
    : []

  // Low stock items
  const lowStockItems = (() => {
    const byItem = {}
    stock.forEach(s => {
      if (!s.item) return
      byItem[s.item_id] = byItem[s.item_id] || { item: s.item, total: 0 }
      byItem[s.item_id].total += +s.quantity || 0
    })
    return Object.values(byItem)
      .filter(({ item, total }) => item.reorder_point > 0 && total <= item.reorder_point)
      .sort((a, b) => (a.total / (a.item.reorder_point || 1)) - (b.total / (b.item.reorder_point || 1)))
  })()

  const stats = summary ? [
    { label: 'إجمالي المبيعات',   value: fmtEGP(summary.totalSales) + ' EGP', color: '#16a34a' },
    { label: 'إجمالي المشتريات',  value: fmtEGP(summary.totalPurchases) + ' EGP', color: '#dc2626' },
    { label: 'إجمالي المصاريف',   value: fmtEGP(summary.totalExpenses) + ' EGP', color: '#f59e0b' },
    { label: 'صافي الربح',        value: fmtEGP(summary.netProfit) + ' EGP', color: summary.netProfit >= 0 ? '#16a34a' : '#dc2626' },
  ] : []

  const handleExportSales = () => {
    downloadCSV(salesInvoices.map(i => ({
      'رقم الفاتورة': i.invoice_number,
      'العميل': i.customer?.name,
      'التاريخ': i.invoice_date,
      'الإجمالي': i.total_amount,
      'المدفوع': i.paid_amount,
      'المتبقي': i.remaining_amount,
      'الحالة': i.status,
    })), `sales-report-${dateTo}.csv`)
  }

  const handleExportPurchases = () => {
    downloadCSV(purchaseInvoices.map(i => ({
      'رقم الفاتورة': i.invoice_number,
      'المورد': i.supplier?.name,
      'التاريخ': i.invoice_date,
      'الإجمالي (EGP)': i.total_egp,
      'المدفوع': i.paid_amount,
      'المتبقي': i.remaining_amount,
      'الحالة': i.status,
    })), `purchases-report-${dateTo}.csv`)
  }

  const handleExportStock = () => {
    downloadCSV(stock.map(s => ({
      'الصنف': s.item?.name,
      'الكود': s.item?.code,
      'المخزن': s.warehouse?.name,
      'الكمية': s.quantity,
      'المحجوز': s.reserved_quantity,
      'المتاح': s.available_quantity,
    })), `stock-report-${dateTo}.csv`)
  }

  return (
    <div>
      <PageHeader
        title="التقارير والتحليلات"
        subtitle="نظرة شاملة على أداء الشركة المالي والتشغيلي"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Calendar size={15} color="#9ca3af" />
            <input type="date" className="form-input ltr" style={{ height: 36, width: 145 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input type="date" className="form-input ltr" style={{ height: 36, width: 145 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        }
      />

      <StatsRow stats={stats} />

      {/* Sales vs Purchases trend */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">المبيعات والمشتريات الشهرية</div>
          <button className="btn btn-ghost btn-sm" onClick={handleExportSales}>
            <Download size={13} /> تصدير CSV
          </button>
        </div>
        <div style={{ padding: '20px 20px 8px' }}>
          {monthlyTrend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>لا توجد بيانات كافية لهذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} /><stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12, color: '#6b7280' }}>{v === 'sales' ? 'مبيعات' : 'مشتريات'}</span>} />
                <Area type="monotone" dataKey="sales" name="sales" stroke="#16a34a" strokeWidth={2} fill="url(#gS)" />
                <Area type="monotone" dataKey="purchases" name="purchases" stroke="#dc2626" strokeWidth={2} fill="url(#gP)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Top Customers */}
        <div className="card">
          <div className="card-header"><div className="card-title">أعلى 5 عملاء (حسب الإيراد)</div></div>
          <div style={{ padding: 20 }}>
            {topCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCustomers} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => [`${fmtEGP(v)} EGP`, 'الإيراد']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#3d62f3" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <div className="card-header"><div className="card-title">توزيع المصاريف حسب الفئة</div></div>
          <div style={{ padding: 20 }}>
            {expenseBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>لا توجد مصاريف في هذه الفترة</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${fmtEGP(v)} EGP`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Receivables / Payables */}
        <div className="card">
          <div className="card-header"><div className="card-title">الذمم المالية</div></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f1f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#16a34a" />
                <span style={{ fontSize: 13, color: '#374151' }}>مستحقات لنا (من عملاء)</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#16a34a' }}>{fmtEGP(summary?.receivables)} EGP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={16} color="#dc2626" />
                <span style={{ fontSize: 13, color: '#374151' }}>مستحقات علينا (لموردين)</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#dc2626' }}>{fmtEGP(summary?.payables)} EGP</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleExportSales}>
                <Download size={13} /> فواتير البيع
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleExportPurchases}>
                <Download size={13} /> فواتير الشراء
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">أصناف تحت حد إعادة الطلب</div>
            <button className="btn btn-ghost btn-sm" onClick={handleExportStock}><Download size={13} /> تصدير</button>
          </div>
          <div>
            {lowStockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>لا توجد أصناف منخفضة المخزون 👍</div>
            ) : (
              lowStockItems.slice(0, 6).map(({ item, total }, i) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 20px', borderBottom: i < lowStockItems.length - 1 ? '1px solid #f0f1f3' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.code}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'Inter', fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{total.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>الحد: {item.reorder_point}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
