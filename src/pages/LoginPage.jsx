import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FlaskConical, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      toast.success('أهلاً بك في ChemCo ERP')
      navigate('/')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (msg.includes('موقوف')) {
        setError(msg)
      } else if (msg.includes('Email not confirmed')) {
        setError('يرجى تأكيد البريد الإلكتروني أولاً')
      } else {
        setError('حدث خطأ، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f5f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background accent blobs */}
      <div style={{
        position: 'fixed', top: -100, right: -100,
        width: 400, height: 400,
        background: 'radial-gradient(circle, #dde6ff 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -80, left: -80,
        width: 350, height: 350,
        background: 'radial-gradient(circle, #d2f7f1 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #3d62f3, #21aaa3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 8px 24px rgb(61 98 243 / 0.3)',
          }}>
            <FlaskConical size={26} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#1a1d23',
            letterSpacing: '-0.5px', marginBottom: 6,
          }}>
            ChemCo ERP
          </h1>
          <p style={{ fontSize: 13.5, color: '#6b7280' }}>
            نظام إدارة موارد الشركة
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 32px 28px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', marginBottom: 6 }}>
            تسجيل الدخول
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            أدخل بياناتك للوصول إلى النظام
          </p>

          <form onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#dc2626', marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            {/* Email */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">
                البريد الإلكتروني
                <span className="required"> *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', right: 11, top: '50%',
                  transform: 'translateY(-50%)', color: '#9ca3af',
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@chemco.com"
                  className={`form-input ltr ${error ? 'error' : ''}`}
                  style={{ paddingRight: 36, textAlign: 'left' }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label">
                  كلمة المرور
                  <span className="required"> *</span>
                </label>
                <button
                  type="button"
                  style={{
                    fontSize: 12, color: '#3d62f3', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', right: 11, top: '50%',
                  transform: 'translateY(-50%)', color: '#9ca3af',
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`form-input ltr ${error ? 'error' : ''}`}
                  style={{ paddingRight: 36, paddingLeft: 36, textAlign: 'left' }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#9ca3af',
                    padding: 2, display: 'flex',
                  }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 42, fontSize: 15 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />
                  جاري الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
          ChemCo ERP v1.0 — جميع الحقوق محفوظة © 2025
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
