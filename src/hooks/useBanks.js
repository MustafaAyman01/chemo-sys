import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// ── Keys ──────────────────────────────────────────────────────
export const bankKeys = {
  accounts:        ['bank_accounts'],
  accountsList:    (f) => ['bank_accounts', 'list', f],
  accountDetail:   (id) => ['bank_accounts', 'detail', id],
  transactions:    ['bank_transactions'],
  transactionsList:(f) => ['bank_transactions', 'list', f],
  partyStatement:  (f) => ['bank_party_transactions', f],
  reconciliations: (accountId) => ['bank_reconciliations', accountId],
}

// ════════════════════════════════════════════════════════════
// BANK ACCOUNTS
// ════════════════════════════════════════════════════════════
const fetchBankAccounts = async (filters = {}) => {
  let q = supabase.from('bank_accounts').select('*').order('created_at', { ascending: false })
  if (filters.search) {
    q = q.or(`bank_name.ilike.%${filters.search}%,account_name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,account_number.ilike.%${filters.search}%`)
  }
  if (filters.currency) q = q.eq('currency', filters.currency)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useBankAccounts = (filters = {}) =>
  useQuery({ queryKey: bankKeys.accountsList(filters), queryFn: () => fetchBankAccounts(filters) })

export const useBankAccount = (id) =>
  useQuery({
    queryKey: bankKeys.accountDetail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

export const useCreateBankAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (!data.code) {
        const { count } = await supabase.from('bank_accounts').select('*', { count: 'exact', head: true })
        data.code = `BNK-${String((count || 0) + 1).padStart(3, '0')}`
      }
      const payload = { ...data, current_balance: data.opening_balance || 0 }
      const { data: result, error } = await supabase.from('bank_accounts').insert(payload).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      toast.success('تم إضافة الحساب البنكي بنجاح')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useUpdateBankAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      // opening_balance / current_balance are managed by the ledger — don't allow editing them here
      delete data.current_balance
      const { data: result, error } = await supabase.from('bank_accounts').update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      qc.invalidateQueries({ queryKey: bankKeys.accountDetail(vars.id) })
      toast.success('تم تحديث الحساب البنكي')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useToggleBankAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('bank_accounts').update({ is_active: !is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      toast.success('تم تحديث حالة الحساب')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// TRANSACTIONS (the ledger)
// ════════════════════════════════════════════════════════════
const fetchBankTransactions = async (filters = {}) => {
  let q = supabase
    .from('bank_transactions')
    .select('*, bank_accounts(code, bank_name, account_name, currency)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.bank_account_id) q = q.eq('bank_account_id', filters.bank_account_id)
  if (filters.transaction_type) q = q.eq('transaction_type', filters.transaction_type)
  if (filters.is_reconciled !== undefined) q = q.eq('is_reconciled', filters.is_reconciled)
  if (filters.dateFrom) q = q.gte('transaction_date', filters.dateFrom)
  if (filters.dateTo)   q = q.lte('transaction_date', filters.dateTo)
  if (filters.search)   q = q.or(`description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`)

  const { data, error } = await q
  if (error) throw error
  return data
}

export const useBankTransactions = (filters = {}) =>
  useQuery({ queryKey: bankKeys.transactionsList(filters), queryFn: () => fetchBankTransactions(filters) })

// Single-sided manual entry: deposit / withdrawal / bank_fee / interest / other
export const useCreateBankTransaction = () => {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  return useMutation({
    mutationFn: async (data) => {
      const direction = ['deposit', 'interest'].includes(data.transaction_type) ? 'in' : 'out'
      const payload = { ...data, direction, created_by: user.id }
      const { data: result, error } = await supabase.from('bank_transactions').insert(payload).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.transactions })
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      toast.success('تم تسجيل الحركة البنكية')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Transfer between two of the company's own bank accounts — creates a linked pair of rows
export const useCreateBankTransfer = () => {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  return useMutation({
    mutationFn: async ({ from_account_id, to_account_id, amount, transaction_date, description, reference_number }) => {
      if (from_account_id === to_account_id) throw new Error('لازم يكون الحسابين مختلفين')

      const { data: outRow, error: outErr } = await supabase
        .from('bank_transactions')
        .insert({
          bank_account_id: from_account_id, transaction_date, transaction_type: 'transfer_out',
          direction: 'out', amount, description, reference_number, created_by: user.id,
        })
        .select().single()
      if (outErr) throw outErr

      const { data: inRow, error: inErr } = await supabase
        .from('bank_transactions')
        .insert({
          bank_account_id: to_account_id, transaction_date, transaction_type: 'transfer_in',
          direction: 'in', amount, description, reference_number,
          transfer_pair_id: outRow.id, created_by: user.id,
        })
        .select().single()
      if (inErr) throw inErr

      // link the pair back
      await supabase.from('bank_transactions').update({ transfer_pair_id: inRow.id }).eq('id', outRow.id)

      return { outRow, inRow }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.transactions })
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      toast.success('تم تنفيذ التحويل بين الحسابين')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useDeleteBankTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('bank_transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.transactions })
      qc.invalidateQueries({ queryKey: bankKeys.accounts })
      toast.success('تم حذف الحركة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// ════════════════════════════════════════════════════════════
// PARTY STATEMENT (bank activity per supplier/customer)
// ════════════════════════════════════════════════════════════
const fetchPartyStatement = async (filters = {}) => {
  let q = supabase.from('bank_party_transactions').select('*').order('transaction_date', { ascending: false })
  if (filters.party_type)      q = q.eq('party_type', filters.party_type)
  if (filters.party_id)        q = q.eq('party_id', filters.party_id)
  if (filters.bank_account_id) q = q.eq('bank_account_id', filters.bank_account_id)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const useBankPartyStatement = (filters = {}) =>
  useQuery({
    queryKey: bankKeys.partyStatement(filters),
    queryFn: () => fetchPartyStatement(filters),
    enabled: !!(filters.party_id || filters.bank_account_id),
  })

// ════════════════════════════════════════════════════════════
// RECONCILIATION
// ════════════════════════════════════════════════════════════
export const useBankReconciliations = (bankAccountId) =>
  useQuery({
    queryKey: bankKeys.reconciliations(bankAccountId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!bankAccountId,
  })

export const useStartReconciliation = () => {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  return useMutation({
    mutationFn: async ({ bank_account_id, statement_date, statement_ending_balance, notes }) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .insert({ bank_account_id, statement_date, statement_ending_balance, notes, created_by: user.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bankKeys.reconciliations(vars.bank_account_id) })
      toast.success('تم بدء جلسة التسوية')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

// Mark a set of transactions as reconciled and attach them to a reconciliation batch
export const useReconcileTransactions = () => {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  return useMutation({
    mutationFn: async ({ transactionIds, reconciliation_id }) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user.id,
          reconciliation_id,
        })
        .in('id', transactionIds)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKeys.transactions })
      toast.success('تم تحديد الحركات كمُسوّاة')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}

export const useCompleteReconciliation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, bank_account_id, book_balance, difference }) => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .update({ status: 'completed', book_balance, difference, completed_at: new Date().toISOString() })
        .eq('id', id)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: bankKeys.reconciliations(vars.bank_account_id) })
      toast.success('تم إتمام التسوية البنكية')
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  })
}
