import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, ShoppingCart, FileText, Package,
  Factory, TrendingUp, Receipt, UserCheck, Clock, DollarSign,
  BarChart3, Settings, ChevronDown, Bell, Search, Menu, X,
  FlaskConical, Truck, Warehouse, ClipboardList, Building2,
  LogOut, User, ChevronRight, ShieldCheck, CheckCircle2, Landmark,
} from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'

const NAV_SECTIONS = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/',         icon: LayoutDashboard, label: 'لوحة التحكم' },
    ],
  },
  {
    label: 'المشتريات والموردين',
    module: 'suppliers',
    items: [
      { to: '/suppliers',         icon: Truck,         label: 'الموردين' },
      { to: '/purchase-orders',   icon: ShoppingCart,  label: 'أوامر الشراء' },
      { to: '/purchase-invoices', icon: Receipt,       label: 'فواتير الشراء' },
    ],
  },
  {
    label: 'المخازن والمخزون',
    module: 'warehouse',
    items: [
      { to: '/items',           icon: FlaskConical, label: 'الأصناف' },
      { to: '/warehouse',       icon: Warehouse,    label: 'المخازن' },
      { to: '/stock-movements', icon: Package,      label: 'حركات المخزن' },
    ],
  },
  {
    label: 'الإنتاج',
    module: 'production',
    items: [
      { to: '/production', icon: Factory,       label: 'أوامر الإنتاج' },
      { to: '/factories',  icon: Building2,     label: 'المصانع' },
      { to: '/bom',        icon: ClipboardList, label: 'تكوين المنتج (BOM)' },
    ],
  },
  {
    label: 'المبيعات',
    module: 'sales',
    items: [
      { to: '/customers',      icon: Users,       label: 'العملاء' },
      { to: '/sales-orders',   icon: TrendingUp,  label: 'أوامر البيع' },
      { to: '/sales-invoices', icon: FileText,    label: 'فواتير البيع' },
    ],
  },
  {
    label: 'المالية',
    module: 'finance',
    items: [
      { to: '/expenses', icon: DollarSign, label: 'المصاريف' },
      { to: '/payments', icon: Receipt,    label: 'المدفوعات' },
    ],
  },
  {
    label: 'البنوك',
    module: 'banks',
    items: [
      { to: '/banks', icon: Landmark, label: 'الحسابات البنكية' },
    ],
  },
  {
    label: 'الموارد البشرية',
    module: 'hr',
    items: [
      { to: '/employees',   icon: Users,     label: 'الموظفين' },
      { to: '/departments', icon: Building2, label: 'الأقسام' },
      { to: '/attendance',  icon: Clock,     label: 'الحضور والانصراف' },
      { to: '/payroll',     icon: UserCheck, label: 'المرتبات' },
    ],
  },
  {
    label: 'التقارير',
    module: 'reports',
    items: [
      { to: '/reports', icon: BarChart3, label: 'التقارير والتحليلات' },
    ],
  },
]

export default function AppLayout() {
  const { profile, signOut, isAdmin, can } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const { data: notifications = [], isLoading: notifLoading } = useNotifications()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('تم تسجيل الخروج')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const roleLabel = {
    super_admin:        'مدير النظام',
    admin:              'مدير',
    finance_manager:    'مدير مالي',
    warehouse_manager:  'مدير مخازن',
    production_manager: 'مدير إنتاج',
    sales_manager:      'مدير مبيعات',
    hr_manager:         'مدير موارد بشرية',
    accountant:         'محاسب',
    warehouse_staff:    'أمين مخزن',
    production_staff:   'عامل إنتاج',
    sales_rep:          'مندوب مبيعات',
    hr_staff:           'موظف موارد بشرية',
    viewer:             'مشاهد',
  }

  return (
    <div>
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3d62f3, #21aaa3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlaskConical size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1d23', letterSpacing: '-0.3px' }}>
                ChemCo ERP
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>
                نظام إدارة الشركة
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS
            .filter(section => !section.module || can(section.module, 'view'))
            .map((section) => (
              <div key={section.label} style={{ marginBottom: 4 }}>
                <div className="nav-section-label">{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon size={17} className="nav-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
        </nav>

        {/* User footer */}
        <div style={{
          borderTop: '1px solid #e8eaed',
          padding: '12px 8px',
        }}>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={17} className="nav-icon" />
            <span>الإعدادات</span>
          </NavLink>

          {isAdmin() && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={17} className="nav-icon" />
              <span>إدارة المستخدمين</span>
            </NavLink>
          )}

          {/* User card */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginTop: 4, borderRadius: 8,
              cursor: 'pointer', transition: 'background 150ms',
              position: 'relative',
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="nav-item"
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#f0f4ff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={15} color="#3d62f3" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', truncate: true }}>
                {profile?.full_name || 'المستخدم'}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                {roleLabel[profile?.role] || profile?.role}
              </div>
            </div>
            <ChevronDown size={14} color="#9ca3af" style={{
              transform: userMenuOpen ? 'rotate(180deg)' : 'none',
              transition: '150ms',
            }} />

            {userMenuOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, left: 0,
                background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
                boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
                overflow: 'hidden', zIndex: 50,
              }}>
                <NavLink
                  to="/profile"
                  style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', fontSize: 13, color: '#374151',
                    textDecoration: 'none', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f4f5f8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <User size={15} /> الملف الشخصي
                </NavLink>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', fontSize: 13, color: '#dc2626',
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '100%', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <LogOut size={15} /> تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Top Header ── */}
      <header className="main-header">
        <button
          className="btn btn-ghost btn-icon lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="search-wrap" style={{ flex: 1, maxWidth: 400 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="بحث سريع..."
            className="form-input search-input"
            style={{ height: 36, fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: 'relative' }}
              onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  minWidth: 16, height: 16, padding: '0 3px',
                  background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  borderRadius: '50%', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setNotifOpen(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 8,
                  width: 360, maxHeight: 440, overflowY: 'auto',
                  background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
                  boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)', zIndex: 50,
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid #e8eaed',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>الإشعارات</span>
                    {notifications.length > 0 && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{notifications.length} إشعار</span>
                    )}
                  </div>

                  {notifLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
                      جاري التحميل...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <CheckCircle2 size={28} color="#16a34a" style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 13, color: '#6b7280' }}>لا يوجد إشعارات جديدة</div>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { navigate(n.link); setNotifOpen(false) }}
                        style={{
                          display: 'flex', gap: 10, padding: '12px 16px',
                          borderBottom: '1px solid #f0f1f3', cursor: 'pointer',
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                          background: n.severity === 'high' ? '#ef4444' : n.severity === 'medium' ? '#f59e0b' : '#3d62f3',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1d23', marginBottom: 2 }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{n.subtitle}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* User avatar (desktop) */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#f0f4ff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
              onClick={() => { setHeaderMenuOpen(!headerMenuOpen); setNotifOpen(false) }}
            >
              <User size={15} color="#3d62f3" />
            </div>

            {headerMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 8,
                  width: 200, background: '#fff', border: '1px solid #e8eaed',
                  borderRadius: 10, boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
                  overflow: 'hidden', zIndex: 50,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f1f3' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{roleLabel[profile?.role] || profile?.role}</div>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setHeaderMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', fontSize: 13, color: '#374151',
                      textDecoration: 'none', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f4f5f8'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <Settings size={15} /> الإعدادات
                  </NavLink>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', fontSize: 13, color: '#dc2626',
                      background: 'none', border: 'none', cursor: 'pointer',
                      width: '100%', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <LogOut size={15} /> تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
