import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SuppliersPage from './pages/SuppliersPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import PurchaseInvoicesPage from './pages/PurchaseInvoicesPage'
import ItemsPage from './pages/ItemsPage'
import WarehousesPage from './pages/WarehousesPage'
import StockMovementsPage from './pages/StockMovementsPage'
import FactoriesPage from './pages/FactoriesPage'
import BOMPage from './pages/BOMPage'
import ProductionOrdersPage from './pages/ProductionOrdersPage'
import CustomersPage from './pages/CustomersPage'
import SalesOrdersPage from './pages/SalesOrdersPage'
import SalesInvoicesPage from './pages/SalesInvoicesPage'
import ExpensesPage from './pages/ExpensesPage'
import PaymentsPage from './pages/PaymentsPage'
import BanksPage from './pages/BanksPage'
import EmployeesPage from './pages/EmployeesPage'
import AttendancePage from './pages/AttendancePage'
import PayrollPage from './pages/PayrollPage'
import DepartmentsPage from './pages/DepartmentsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import UserManagementPage from './pages/UserManagementPage'

// Lazy imports for future phases (placeholder pages for now)
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-96 text-center">
    <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1d23', marginBottom: 8 }}>{title}</h2>
    <p style={{ color: '#6b7280', fontSize: 14 }}>هيتبني في الفيز الجاي</p>
  </div>
)

function AuthGuard({ children }) {
  const { user, loading, initialized } = useAuthStore()
  if (!initialized || loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestGuard({ children }) {
  const { user, loading, initialized } = useAuthStore()
  if (!initialized || loading) return <FullPageLoader />
  if (user) return <Navigate to="/" replace />
  return children
}

// Blocks direct URL access to a module the user's role isn't permitted to view,
// even if the corresponding sidebar link is hidden.
function ModuleGuard({ module, children }) {
  const { can } = useAuthStore()
  if (module && !can(module, 'view')) return <Navigate to="/" replace />
  return children
}

function AdminGuard({ children }) {
  const { isAdmin } = useAuthStore()
  if (!isAdmin()) return <Navigate to="/" replace />
  return children
}

function FullPageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f4f5f8', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, border: '3px solid #e8eaed',
        borderTopColor: '#3d62f3', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#6b7280', fontSize: 14 }}>جاري التحميل...</p>
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <GuestGuard><LoginPage /></GuestGuard>
      } />

      {/* Protected */}
      <Route path="/" element={
        <AuthGuard><AppLayout /></AuthGuard>
      }>
        <Route index element={<DashboardPage />} />

        {/* Phase 2 - Supply Chain */}
        <Route path="suppliers"         element={<ModuleGuard module="suppliers"><SuppliersPage /></ModuleGuard>} />
        <Route path="purchase-orders"   element={<ModuleGuard module="suppliers"><PurchaseOrdersPage /></ModuleGuard>} />
        <Route path="purchase-invoices" element={<ModuleGuard module="suppliers"><PurchaseInvoicesPage /></ModuleGuard>} />

        {/* Phase 3 - Warehouse */}
        <Route path="warehouse"         element={<ModuleGuard module="warehouse"><WarehousesPage /></ModuleGuard>} />
        <Route path="stock-movements"   element={<ModuleGuard module="warehouse"><StockMovementsPage /></ModuleGuard>} />
        <Route path="items"             element={<ModuleGuard module="warehouse"><ItemsPage /></ModuleGuard>} />

        {/* Phase 4 - Production */}
        <Route path="production"        element={<ModuleGuard module="production"><ProductionOrdersPage /></ModuleGuard>} />
        <Route path="factories"         element={<ModuleGuard module="production"><FactoriesPage /></ModuleGuard>} />
        <Route path="bom"               element={<ModuleGuard module="production"><BOMPage /></ModuleGuard>} />

        {/* Phase 5 - Sales */}
        <Route path="customers"         element={<ModuleGuard module="sales"><CustomersPage /></ModuleGuard>} />
        <Route path="sales-orders"      element={<ModuleGuard module="sales"><SalesOrdersPage /></ModuleGuard>} />
        <Route path="sales-invoices"    element={<ModuleGuard module="sales"><SalesInvoicesPage /></ModuleGuard>} />

        {/* Phase 6 - Finance */}
        <Route path="expenses"          element={<ModuleGuard module="finance"><ExpensesPage /></ModuleGuard>} />
        <Route path="payments"          element={<ModuleGuard module="finance"><PaymentsPage /></ModuleGuard>} />
        <Route path="banks"             element={<ModuleGuard module="banks"><BanksPage /></ModuleGuard>} />

        {/* Phase 7 - HR */}
        <Route path="employees"         element={<ModuleGuard module="hr"><EmployeesPage /></ModuleGuard>} />
        <Route path="attendance"        element={<ModuleGuard module="hr"><AttendancePage /></ModuleGuard>} />
        <Route path="payroll"           element={<ModuleGuard module="hr"><PayrollPage /></ModuleGuard>} />
        <Route path="departments"       element={<ModuleGuard module="hr"><DepartmentsPage /></ModuleGuard>} />

        {/* Phase 8 - Reports */}
        <Route path="reports"           element={<ModuleGuard module="reports"><ReportsPage /></ModuleGuard>} />

        {/* Settings — accessible to everyone (personal profile/security) */}
        <Route path="settings"          element={<SettingsPage />} />

        {/* User management — admins only */}
        <Route path="users"             element={<AdminGuard><UserManagementPage /></AdminGuard>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
