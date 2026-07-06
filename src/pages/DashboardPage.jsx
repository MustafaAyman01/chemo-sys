import { useAuthStore } from '../store/authStore'
import {
  TrendingUp, TrendingDown, Package, Users, Factory,
  ShoppingCart, DollarSign, FileText, AlertTriangle,
  Clock, CheckCircle2, BarChart3, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Mock data (will be replaced by Supabase queries in next task) ──
const salesData = [
  { month: 'يناير',  مبيعات: 1200000, مشتريات: 780000 },
  { month: 'فبراير', مبيعات: 980000,  مشتريات: 620000 },
  { month: 'مارس',   مبيعات: 1450000, مشتريات: 890000 },
  { month: 'أبريل',  مبيعات: 1100000, مشتريات: 710000 },
  { month: 'مايو',   مبيعات: 1680000, مشتريات: 950000 },
  { month: 'يونيو',  مبيعات: 1920000, مشتريات: 1100000 },
]

const productionData = [
  { name: 'دهان جدران داخلي', value: 42, color: '#3d62f3' },
  { name: 'دهان جدران خارجي', value: 28, color: '#21aaa3' },
  { name: 'طلاء إيبوكسي',     value: 18, color: '#f59e0b' },
  { name: 'بروهايمر',          value: 12, color: '#ef4444' },
]

const kpis = [
  {
    label:   'المبيعات - الشهر الحالي',
    value:   'EGP 1,920,000',
    sub:     '+14% عن الشهر الماضي',
    trend:   'up',
    icon:    TrendingUp,
    color:   '#3d62f3',
    bg:      '#f0f4ff',
  },
  {
    label:   'الفواتير المستحقة',
    value:   'EGP 340,500',
    sub:     '3 فواتير متأخرة',
    trend:   'down',
    icon:    AlertTriangle,
    color:   '#f59e0b',
    bg:      '#fffbeb',
  },
  {
    label:   'المخزون الرئيسي',
    value:   '2,847 طن',
    sub:     '6 أصناف تحت الحد الأدنى',
    trend:   'neutral',
    icon:    Package,
    color:   '#21aaa3',
    bg:      '#edfcf9',
  },
  {
    label:   'أوامر الإنتاج الجارية',
    value:   '12 أمر',
    sub:     '3 مصانع نشطة',
    trend:   'neutral',
    icon:    Factory,
    color:   '#8b5cf6',
    bg:      '#f5f3ff',
  },
  {
    label:   'الموردين النشطين',
    value:   '7 موردين',
    sub:     '2 طلب شراء قيد الموافقة',
    trend:   'neutral',
    icon:    ShoppingCart,
    color:   '#06b6d4',
    bg:      '#ecfeff',
  },
  {
    label:   'إجمالي الموظفين',
    value:   '84 موظف',
    sub:     '78 حضروا اليوم (93%)',
    trend:   'up',
    icon:    Users,
    color:   '#16a34a',
    bg:      '#f0fdf4',
  },
]

const pendingActions = [
  { id: 1, type: 'purchase', title: 'موافقة أمر شراء PO-25-01024', sub: 'KRONOS Worldwide — $48,500', time: 'منذ ساعتين', urgent: true },
  { id: 2, type: 'invoice',  title: 'فاتورة بيع INV-25-00891 متأخرة', sub: 'شركة حسن علام — EGP 125,000', time: 'منذ 3 أيام', urgent: true },
  { id: 3, type: 'stock',    title: 'مستوى مخزون منخفض — Titanium Dioxide', sub: 'المخزن الرئيسي — 35 طن متبقي (الحد 50)', time: 'اليوم', urgent: false },
  { id: 4, type: 'production', title: 'أمر إنتاج PROD-25-0089 جاهز للتسليم', sub: 'مصنع العاشر — 120 طن دهان جدران', time: 'اليوم', urgent: false },
  { id: 5, type: 'hr', title: 'طلب إجازة بانتظار الموافقة', sub: 'محمد عمر — 5 أيام إجازة سنوية', time: 'أمس', urgent: false },
]

// ── Helpers ──
function fmtEGP(n) {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
      fontSize: 13, direction: 'rtl',
    }}>
      <div style={{ fontWeight: 700, color: '#1a1d23', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#6b7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmtEGP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuthStore()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'صباح الخير'
    if (h < 17) return 'مساء الخير'
    return 'مساء النور'
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting()}، {profile?.full_name?.split(' ')[0] || 'مدير'} 👋
          </h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-sub" style={{
                  color: kpi.trend === 'up' ? '#16a34a' : kpi.trend === 'down' ? '#dc2626' : '#6b7280',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {kpi.trend === 'up' && <TrendingUp size={12} />}
                  {kpi.trend === 'down' && <TrendingDown size={12} />}
                  {kpi.sub}
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: kpi.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginRight: 12,
              }}>
                <kpi.icon size={20} color={kpi.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Sales vs Purchase Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">المبيعات والمشتريات — 2025</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>آخر 6 أشهر</div>
          </div>
          <div style={{ padding: '20px 20px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={salesData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3d62f3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3d62f3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPurchase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#21aaa3" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#21aaa3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 12, color: '#6b7280' }}>{v}</span>} />
                <Area type="monotone" dataKey="مبيعات"   stroke="#3d62f3" strokeWidth={2}
                  fill="url(#gradSales)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="مشتريات" stroke="#21aaa3" strokeWidth={2}
                  fill="url(#gradPurchase)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production Mix */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">مزيج الإنتاج</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>هذا الشهر</div>
          </div>
          <div style={{ padding: '20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={productionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {productionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v}%`, '']}
                  contentStyle={{ fontFamily: 'Cairo', fontSize: 12, borderRadius: 8, direction: 'rtl' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {productionData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#374151', truncate: true }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: '#1a1d23', fontFamily: 'Inter' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending Actions + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={17} color="#f59e0b" />
              إجراءات مطلوبة
            </div>
            <span className="badge badge-pending" style={{ fontSize: 11 }}>
              {pendingActions.filter(a => a.urgent).length} عاجل
            </span>
          </div>
          <div>
            {pendingActions.map((action, i) => (
              <div
                key={action.id}
                style={{
                  padding: '12px 20px',
                  borderBottom: i < pendingActions.length - 1 ? '1px solid #f0f1f3' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  cursor: 'pointer', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: action.urgent ? '#ef4444' : '#d1d5db',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', marginBottom: 2 }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{action.sub}</div>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginTop: 1 }}>
                  {action.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={17} color="#3d62f3" />
              ملخص اليوم
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            {[
              { label: 'فواتير بيع صدرت اليوم',       value: '3 فواتير',  sub: 'EGP 285,000',    color: '#16a34a', icon: FileText },
              { label: 'أوامر إنتاج مكتملة',           value: '2 أمر',     sub: '96 طن منتج نهائي', color: '#3d62f3', icon: CheckCircle2 },
              { label: 'استلام خامات (المخزن الرئيسي)', value: '1 شحنة',   sub: '4.2 طن Titanium',  color: '#21aaa3', icon: Package },
              { label: 'موظفين تأخروا اليوم',          value: '6 موظفين', sub: 'متوسط 18 دقيقة',   color: '#f59e0b', icon: Clock },
              { label: 'مصاريف مسجلة اليوم',           value: 'EGP 12,400', sub: '4 بنود مصاريف',  color: '#8b5cf6', icon: DollarSign },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px', transition: 'background 150ms',
                cursor: 'default',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: s.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <s.icon size={16} color={s.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 1 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d23', fontFamily: 'Inter' }}>
                    {s.value}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'left' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
