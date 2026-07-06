import { useState } from 'react'
import { Building2, Save, User, Lock, Bell, Globe, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { updateProfile, auth } from '../lib/supabase'
import toast from 'react-hot-toast'
import { PageHeader, FormField } from '../components/ui'

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
        background: active ? '#f0f4ff' : 'transparent',
        color: active ? '#3d62f3' : '#6b7280',
        width: '100%', textAlign: 'right',
      }}
    >
      <Icon size={16} /> {label}
    </button>
  )
}

// ── Profile Tab ───────────────────────────────────────────────
function ProfileTab() {
  const { profile, user } = useAuthStore()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone]       = useState(profile?.phone || '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(user.id, { full_name: fullName, phone })
      toast.success('تم حفظ التغييرات')
    } catch (e) {
      toast.error('حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 480 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>الملف الشخصي</h3>

      <FormField label="البريد الإلكتروني">
        <input className="form-input ltr" value={user?.email || ''} disabled dir="ltr" style={{ background: '#f4f5f8' }} />
      </FormField>
      <div style={{ height: 16 }} />

      <FormField label="الاسم الكامل">
        <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} />
      </FormField>
      <div style={{ height: 16 }} />

      <FormField label="رقم الهاتف">
        <input className="form-input ltr" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
      </FormField>
      <div style={{ height: 24 }} />

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
        حفظ التغييرات
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Security Tab ──────────────────────────────────────────────
function SecurityTab() {
  const { user } = useAuthStore()
  const [sending, setSending] = useState(false)

  const handleResetPassword = async () => {
    setSending(true)
    try {
      await auth.resetPassword(user.email)
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك')
    } catch (e) {
      toast.error('حدث خطأ، حاول مرة أخرى')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 480 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>الأمان</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        لتغيير كلمة المرور، سيتم إرسال رابط إلى بريدك الإلكتروني المسجل.
      </p>
      <button className="btn btn-secondary" onClick={handleResetPassword} disabled={sending}>
        {sending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Lock size={15} />}
        إرسال رابط تغيير كلمة المرور
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Company Tab (display only — edit via Supabase for now) ─────
function CompanyTab() {
  return (
    <div className="card" style={{ padding: 24, maxWidth: 480 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>بيانات الشركة</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          ['اسم الشركة', 'ChemCo for Chemical Industries'],
          ['النشاط', 'استيراد وتصنيع وتسويق الكيماويات الصناعية'],
          ['الدولة', 'مصر'],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: '#9ca3af', background: '#f8f9fb', padding: '10px 12px', borderRadius: 8 }}>
        لتعديل بيانات الشركة، تواصل مع مدير النظام لتحديثها من قاعدة البيانات.
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState('profile')

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إدارة حسابك وتفضيلات النظام" />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 8, height: 'fit-content' }}>
          <TabButton active={tab === 'profile'}  onClick={() => setTab('profile')}  icon={User}     label="الملف الشخصي" />
          <TabButton active={tab === 'security'} onClick={() => setTab('security')} icon={Lock}     label="الأمان" />
          <TabButton active={tab === 'company'}  onClick={() => setTab('company')}  icon={Building2} label="بيانات الشركة" />
        </div>

        <div>
          {tab === 'profile'  && <ProfileTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'company'  && <CompanyTab />}
        </div>
      </div>
    </div>
  )
}
