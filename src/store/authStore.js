import { create } from 'zustand'
import { auth, getProfile, supabase } from '../lib/supabase'

// Fetch the full permission matrix for a given role from role_permissions table
const fetchRolePermissions = async (role) => {
  if (['super_admin', 'admin'].includes(role)) return null // null = unrestricted (checked separately)
  const { data, error } = await supabase
    .from('role_permissions')
    .select('module, can_view, can_create, can_edit, can_delete, can_approve, can_export')
    .eq('role', role)
  if (error) return {}
  // Convert to a lookup map: { suppliers: { view: true, create: false, ... }, ... }
  const map = {}
  data.forEach(row => {
    map[row.module] = {
      view:    row.can_view,
      create:  row.can_create,
      edit:    row.can_edit,
      delete:  row.can_delete,
      approve: row.can_approve,
      export:  row.can_export,
    }
  })
  return map
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  permissions: null, // null while loading, {} or map once loaded
  loading: true,
  initialized: false,

  // ── Initialize ──────────────────────────────────────────────
  initialize: async () => {
    try {
      const { data: { session } } = await auth.getSession()
      if (session?.user) {
        const profile = await getProfile(session.user.id)
        const permissions = await fetchRolePermissions(profile.role)
        set({ user: session.user, session, profile, permissions, loading: false, initialized: true })
      } else {
        set({ loading: false, initialized: true })
      }
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  // ── Sign In ─────────────────────────────────────────────────
  signIn: async (email, password) => {
    const { data, error } = await auth.signIn(email, password)
    if (error) throw error

    const profile = await getProfile(data.user.id)

    if (!profile.is_active) {
      await auth.signOut()
      throw new Error('الحساب موقوف. تواصل مع المدير.')
    }

    const permissions = await fetchRolePermissions(profile.role)

    // best-effort update of last_login_at — does not block sign-in if it fails
    supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id).then(() => {})

    set({ user: data.user, session: data.session, profile, permissions })
    return profile
  },

  // ── Sign Out ────────────────────────────────────────────────
  signOut: async () => {
    await auth.signOut()
    set({ user: null, profile: null, session: null, permissions: null })
  },

  // ── Permission check ─────────────────────────────────────────
  // module: 'suppliers' | 'warehouse' | 'production' | 'sales' | 'finance' | 'hr' | 'reports'
  // action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  can: (module, action = 'view') => {
    const { profile, permissions } = get()
    if (!profile) return false
    if (['super_admin', 'admin'].includes(profile.role)) return true
    if (!permissions) return false
    return !!permissions[module]?.[action]
  },

  // Whether the user has view access to at least one module in a list (used for nav sections)
  canViewAny: (modules) => {
    const { profile, permissions } = get()
    if (!profile) return false
    if (['super_admin', 'admin'].includes(profile.role)) return true
    if (!permissions) return false
    return modules.some(m => permissions[m]?.view)
  },

  // ── Role checks ──────────────────────────────────────────────
  isAdmin: () => {
    const { profile } = get()
    return profile && ['super_admin', 'admin'].includes(profile.role)
  },

  hasRole: (...roles) => {
    const { profile } = get()
    return profile && roles.includes(profile.role)
  },
}))
