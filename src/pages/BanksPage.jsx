import { useState, useMemo } from 'react'
import {
  Plus, Edit2, PowerOff, Loader2, Landmark, ArrowLeftRight,
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, FileSearch, ClipboardCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useToggleBankAccount,
  useBankTransactions, useCreateBankTransaction, useCreateBankTransfer, useDeleteBankTransaction,
  useBankPartyStatement, useBankReconciliations, useStartReconciliation,
  useReconcileTransactions, useCompleteReconciliation,
} from '../hooks/useBanks'
import { useSuppliers } from '../hooks/useSuppliers'
import { useCustomers } from '../hooks/useCustomers'
import {
  PageHeader, FiltersBar, SearchInput, EmptyState, TableSkeleton,
  Modal, ConfirmDialog, FormField, StatsRow, Amount,
} from '../components/ui'

const CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED']

const TXN_TYPE_LABELS = {
  deposit: 'إيداع', withdrawal: 'سحب', transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر', bank_fee: 'عمولة بنكية', interest: 'فوائد', other: 'أخرى',
}

const TABS = [
  { id: 'accounts',     label: 'الحسابات البنكية', icon: Landmark },
  { id: 'transactions', label: 'الحركة اليومية',    icon: ArrowLeftRight },
  { id: 'statement',    label: 'كشف حساب مورد/عميل', icon: FileSearch },
  { id: 'reconcile',    label: 'التسوية البنكية',   icon: ClipboardCheck },
]

// ════════════════════════════════════════════════════════════
// BANK ACCOUNT FORM
// ════════════════════════════════════════════════════════════
const accountSchema = z.object({
  bank_name:      z.string().min(2, 'اسم البنك مطلوب'),
  bank_name_ar:   z.string().optional(),
  account_name:   z.string().min(2, 'اسم الحساب مطلوب'),
  account_number: z.string().min(2, 'رقم الحساب مطلوب'),
  iban:           z.string().optional(),
  swift_code:     z.string().optional(),
  branch:         z.string().optional(),
  currency:       z.string().default('EGP'),
  opening_balance: z.coerce.number().default(0),
  notes:          z.string().optional(),
})

function BankAccountForm({ defaultValues, onSubmit, isEdit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: defaultValues || { currency: 'EGP', opening_balance: 0 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="bank-account-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="اسم البنك (إنجليزي)" required error={errors.bank_name?.message}>
          <input className="form-input" {...register('bank_name')} placeholder="National Bank of Egypt" />
        </FormField>
        <FormField label="اسم البنك (عربي)" error={errors.bank_name_ar?.message}>
          <input className="form-input" {...register('bank_name_ar')} placeholder="البنك الأهلي المصري" />
        </FormField>
        <FormField label="اسم الحساب" required error={errors.account_name?.message}>
          <input className="form-input" {...register('account_name')} placeholder="ChemCo Industries Ltd" />
        </FormField>
        <FormField label="رقم الحساب" required error={errors.account_number?.message}>
          <input className="form-input ltr" {...register('account_number')} dir="ltr" />
        </FormField>
        <FormField label="IBAN" error={errors.iban?.message}>
          <input className="form-input ltr" {...register('iban')} dir="ltr" />
        </FormField>
        <FormField label="SWIFT Code" error={errors.swift_code?.message}>
          <input className="form-input ltr" {...register('swift_code')} dir="ltr" />
        </FormField>
        <FormField label="الفرع" error={errors.branch?.message}>
          <input className="form-input" {...register('branch')} />
        </FormField>
        <FormField label="العملة" error={errors.currency?.message}>
          <select className="form-input" {...register('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField
          label="الرصيد الافتتاحي"
          error={errors.opening_balance?.message}
          hint={isEdit ? 'مش قابل للتعديل بعد الإنشاء — الرصيد الحالي بيتحدث تلقائي من الحركات' : undefined}
        >
          <input className="form-input ltr" type="number" step="0.01" dir="ltr"
            disabled={isEdit} {...register('opening_balance')} />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="ملاحظات" error={errors.notes?.message}>
            <textarea className="form-input" rows={2} {...register('notes')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ════════════════════════════════════════════════════════════
// MANUAL TRANSACTION FORM (deposit / withdrawal / fee / interest / other)
// ════════════════════════════════════════════════════════════
const txnSchema = z.object({
  bank_account_id: z.string().min(1, 'اختر الحساب البنكي'),
  transaction_type: z.string().min(1, 'اختر نوع الحركة'),
  transaction_date: z.string().min(1, 'التاريخ مطلوب'),
  amount: z.coerce.number().positive('المبلغ لازم يكون أكبر من صفر'),
  reference_number: z.string().optional(),
  description: z.string().optional(),
})

function TransactionForm({ accounts, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(txnSchema),
    defaultValues: { transaction_date: new Date().toISOString().slice(0, 10), transaction_type: 'deposit' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="txn-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="الحساب البنكي" required error={errors.bank_account_id?.message}>
          <select className="form-input" {...register('bank_account_id')}>
            <option value="">اختر الحساب</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name} ({a.currency})</option>)}
          </select>
        </FormField>
        <FormField label="نوع الحركة" required error={errors.transaction_type?.message}>
          <select className="form-input" {...register('transaction_type')}>
            <option value="deposit">إيداع</option>
            <option value="withdrawal">سحب</option>
            <option value="bank_fee">عمولة بنكية</option>
            <option value="interest">فوائد</option>
            <option value="other">أخرى</option>
          </select>
        </FormField>
        <FormField label="التاريخ" required error={errors.transaction_date?.message}>
          <input className={`form-input ltr ${errors.transaction_date ? 'error' : ''}`} type="date" dir="ltr" {...register('transaction_date')} />
        </FormField>
        <FormField label="المبلغ" required error={errors.amount?.message}>
          <input className="form-input ltr" type="number" step="0.01" dir="ltr" {...register('amount')} />
        </FormField>
        <FormField label="رقم مرجعي" error={errors.reference_number?.message}>
          <input className="form-input ltr" dir="ltr" {...register('reference_number')} />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الوصف" error={errors.description?.message}>
            <textarea className="form-input" rows={2} {...register('description')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ════════════════════════════════════════════════════════════
// TRANSFER FORM (between two of the company's own accounts)
// ════════════════════════════════════════════════════════════
const transferSchema = z.object({
  from_account_id: z.string().min(1, 'اختر حساب المصدر'),
  to_account_id: z.string().min(1, 'اختر حساب الوجهة'),
  transaction_date: z.string().min(1, 'التاريخ مطلوب'),
  amount: z.coerce.number().positive('المبلغ لازم يكون أكبر من صفر'),
  reference_number: z.string().optional(),
  description: z.string().optional(),
}).refine(d => d.from_account_id !== d.to_account_id, { message: 'اختر حسابين مختلفين', path: ['to_account_id'] })

function TransferForm({ accounts, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { transaction_date: new Date().toISOString().slice(0, 10) },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="transfer-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="من حساب" required error={errors.from_account_id?.message}>
          <select className="form-input" {...register('from_account_id')}>
            <option value="">اختر الحساب</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
          </select>
        </FormField>
        <FormField label="إلى حساب" required error={errors.to_account_id?.message}>
          <select className="form-input" {...register('to_account_id')}>
            <option value="">اختر الحساب</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
          </select>
        </FormField>
        <FormField label="التاريخ" required error={errors.transaction_date?.message}>
          <input className={`form-input ltr ${errors.transaction_date ? 'error' : ''}`} type="date" dir="ltr" {...register('transaction_date')} />
        </FormField>
        <FormField label="المبلغ" required error={errors.amount?.message}>
          <input className="form-input ltr" type="number" step="0.01" dir="ltr" {...register('amount')} />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="الوصف" error={errors.description?.message}>
            <textarea className="form-input" rows={2} {...register('description')} />
          </FormField>
        </div>
      </div>
    </form>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 1: BANK ACCOUNTS
// ════════════════════════════════════════════════════════════
function AccountsTab() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)

  const { data: accounts = [], isLoading } = useBankAccounts({
    search, is_active: showInactive ? undefined : true,
  })
  const createMutation = useCreateBankAccount()
  const updateMutation = useUpdateBankAccount()
  const toggleMutation = useToggleBankAccount()

  const openCreate = () => { setEditAccount(null); setModalOpen(true) }
  const openEdit = (a) => { setEditAccount(a); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditAccount(null) }

  const handleSubmit = async (data) => {
    if (editAccount) await updateMutation.mutateAsync({ id: editAccount.id, ...data })
    else await createMutation.mutateAsync(data)
    closeModal()
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currency === 'EGP' ? Number(a.current_balance) : 0), 0)
  const stats = [
    { label: 'إجمالي الحسابات', value: accounts.length, color: '#3d62f3' },
    { label: 'حسابات نشطة', value: accounts.filter(a => a.is_active).length, color: '#16a34a' },
    { label: 'رصيد الحسابات بالجنيه', value: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalBalance), color: '#21aaa3' },
  ]

  return (
    <div>
      <StatsRow stats={stats} />
      <FiltersBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم البنك أو رقم الحساب..." />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          عرض غير النشطين
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> إضافة حساب بنكي
        </button>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : accounts.length === 0 ? (
        <div className="card">
          <EmptyState icon={Landmark} title="لا يوجد حسابات بنكية" subtitle="ابدأ بإضافة أول حساب بنكي للشركة"
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> إضافة حساب</button>} />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الكود</th><th>البنك</th><th>اسم الحساب</th><th>رقم الحساب</th>
                  <th>العملة</th><th>الرصيد الحالي</th><th>الحالة</th><th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    <td><span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{a.code}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.bank_name}</div>
                      {a.bank_name_ar && <div style={{ fontSize: 12, color: '#9ca3af' }}>{a.bank_name_ar}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{a.account_name}</td>
                    <td><span style={{ fontFamily: 'Inter', fontSize: 12.5 }} dir="ltr">{a.account_number}</span></td>
                    <td><span style={{ fontFamily: 'Inter', fontWeight: 700, color: '#3d62f3', fontSize: 13 }}>{a.currency}</span></td>
                    <td><Amount value={a.current_balance} currency={a.currency} /></td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-active' : 'badge-cancelled'}`}>
                        {a.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="تعديل" onClick={() => openEdit(a)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title={a.is_active ? 'إيقاف' : 'تفعيل'}
                          onClick={() => setToggleTarget(a)} style={{ color: a.is_active ? '#dc2626' : '#16a34a' }}>
                          <PowerOff size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} size="lg"
        title={editAccount ? `تعديل — ${editAccount.bank_name}` : 'إضافة حساب بنكي جديد'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            <button className="btn btn-primary" form="bank-account-form" type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending)
                ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                : editAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
            </button>
          </>
        }>
        <BankAccountForm defaultValues={editAccount} onSubmit={handleSubmit} isEdit={!!editAccount} />
      </Modal>

      <ConfirmDialog open={!!toggleTarget} onClose={() => setToggleTarget(null)}
        onConfirm={async () => { await toggleMutation.mutateAsync(toggleTarget); setToggleTarget(null) }}
        loading={toggleMutation.isPending} danger
        title={toggleTarget?.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
        message={`هل تريد ${toggleTarget?.is_active ? 'إيقاف' : 'تفعيل'} حساب "${toggleTarget?.bank_name} — ${toggleTarget?.account_name}"؟`} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 2: DAILY TRANSACTIONS LEDGER
// ════════════════════════════════════════════════════════════
function TransactionsTab({ accounts }) {
  const [filterAccount, setFilterAccount] = useState('')
  const [txnModalOpen, setTxnModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: transactions = [], isLoading } = useBankTransactions({
    bank_account_id: filterAccount || undefined,
  })
  const createTxn = useCreateBankTransaction()
  const createTransfer = useCreateBankTransfer()
  const deleteTxn = useDeleteBankTransaction()

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const stats = [
    { label: 'عدد الحركات', value: transactions.length, color: '#3d62f3' },
    { label: 'إجمالي الوارد', value: totalIn.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#16a34a' },
    { label: 'إجمالي الصادر', value: totalOut.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#dc2626' },
  ]

  return (
    <div>
      <StatsRow stats={stats} />
      <FiltersBar>
        <select className="form-input" style={{ width: 240, height: 36 }} value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">كل الحسابات البنكية</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={() => setTransferModalOpen(true)}>
          <ArrowLeftRight size={16} /> تحويل بين حسابين
        </button>
        <button className="btn btn-primary" onClick={() => setTxnModalOpen(true)}>
          <Plus size={16} /> حركة جديدة
        </button>
      </FiltersBar>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : transactions.length === 0 ? (
        <div className="card">
          <EmptyState icon={ArrowLeftRight} title="لا يوجد حركات" subtitle="حركات المدفوعات بتتسجل هنا تلقائيًا، وتقدر تضيف حركات يدوية كمان" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>التاريخ</th><th>الحساب</th><th>النوع</th><th>الوصف</th>
                  <th>المبلغ</th><th>التسوية</th><th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 13 }}>{t.transaction_date}</td>
                    <td style={{ fontSize: 13 }}>{t.bank_accounts?.bank_name} — {t.bank_accounts?.account_name}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                        {t.direction === 'in'
                          ? <ArrowDownCircle size={14} color="#16a34a" />
                          : <ArrowUpCircle size={14} color="#dc2626" />}
                        {TXN_TYPE_LABELS[t.transaction_type] || t.transaction_type}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: '#6b7280', maxWidth: 220 }}>{t.description || '—'}</td>
                    <td>
                      <span className="num" style={{ color: t.direction === 'in' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                        {t.direction === 'in' ? '+' : '-'} {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(t.amount)}
                      </span>
                    </td>
                    <td>
                      {t.is_reconciled
                        ? <span className="badge badge-completed"><CheckCircle2 size={11} /> مُسوّاة</span>
                        : <span className="badge badge-pending">غير مُسوّاة</span>}
                    </td>
                    <td>
                      {!t.payment_id && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="حذف" style={{ color: '#dc2626' }}
                          onClick={() => setDeleteTarget(t)}>
                          <PowerOff size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={txnModalOpen} onClose={() => setTxnModalOpen(false)} title="تسجيل حركة بنكية"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setTxnModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="txn-form" type="submit" disabled={createTxn.isPending}>
              {createTxn.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تسجيل'}
            </button>
          </>
        }>
        <TransactionForm accounts={accounts} onSubmit={async (data) => { await createTxn.mutateAsync(data); setTxnModalOpen(false) }} />
      </Modal>

      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="تحويل بين حسابين بنكيين"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setTransferModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="transfer-form" type="submit" disabled={createTransfer.isPending}>
              {createTransfer.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تنفيذ التحويل'}
            </button>
          </>
        }>
        <TransferForm accounts={accounts} onSubmit={async (data) => { await createTransfer.mutateAsync(data); setTransferModalOpen(false) }} />
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await deleteTxn.mutateAsync(deleteTarget.id); setDeleteTarget(null) }}
        loading={deleteTxn.isPending} danger title="حذف الحركة البنكية"
        message="هل تريد حذف هذه الحركة؟ سيتم تعديل رصيد الحساب البنكي تلقائيًا." />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 3: PARTY STATEMENT (supplier / customer bank activity)
// ════════════════════════════════════════════════════════════
function StatementTab({ accounts }) {
  const [partyType, setPartyType] = useState('supplier')
  const [partyId, setPartyId] = useState('')
  const [filterAccount, setFilterAccount] = useState('')

  const { data: suppliers = [] } = useSuppliers({ is_active: true })
  const { data: customers = [] } = useCustomers({ is_active: true })
  const parties = partyType === 'supplier' ? suppliers : customers

  const { data: rows = [], isLoading } = useBankPartyStatement({
    party_type: partyId ? partyType : undefined,
    party_id: partyId || undefined,
    bank_account_id: filterAccount || undefined,
  })

  const totalIn = rows.filter(r => r.direction === 'in').reduce((s, r) => s + Number(r.amount), 0)
  const totalOut = rows.filter(r => r.direction === 'out').reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div>
      <FiltersBar>
        <select className="form-input" style={{ width: 140, height: 36 }}
          value={partyType} onChange={e => { setPartyType(e.target.value); setPartyId('') }}>
          <option value="supplier">مورد</option>
          <option value="customer">عميل</option>
        </select>
        <select className="form-input" style={{ width: 240, height: 36 }} value={partyId} onChange={e => setPartyId(e.target.value)}>
          <option value="">اختر {partyType === 'supplier' ? 'المورد' : 'العميل'}</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="form-input" style={{ width: 200, height: 36 }} value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="">كل الحسابات البنكية</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
        </select>
      </FiltersBar>

      {!partyId && !filterAccount ? (
        <div className="card">
          <EmptyState icon={FileSearch} title="اختر مورد أو عميل" subtitle="عشان تشوف كل الحركات البنكية المرتبطة بيه" />
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileSearch} title="لا يوجد حركات بنكية" subtitle="مفيش دفعات بنكية مسجلة لهذا الاختيار لسه" />
        </div>
      ) : (
        <>
          <StatsRow stats={[
            { label: 'عدد الحركات', value: rows.length, color: '#3d62f3' },
            { label: 'إجمالي المقبوض', value: totalIn.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#16a34a' },
            { label: 'إجمالي المدفوع', value: totalOut.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#dc2626' },
          ]} />
          <div className="card">
            <div className="table-wrap">
              <table className="erp-table">
                <thead>
                  <tr><th>التاريخ</th><th>الجهة</th><th>الحساب البنكي</th><th>الوصف</th><th>المبلغ</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.transaction_id}>
                      <td style={{ fontSize: 13 }}>{r.transaction_date}</td>
                      <td style={{ fontSize: 13 }}>{r.party_name || '—'}</td>
                      <td style={{ fontSize: 12.5, color: '#6b7280' }}>{r.bank_name} — {r.account_name}</td>
                      <td style={{ fontSize: 12.5, color: '#6b7280' }}>{r.description || '—'}</td>
                      <td>
                        <span className="num" style={{ color: r.direction === 'in' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                          {r.direction === 'in' ? '+' : '-'} {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(r.amount)} {r.currency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 4: RECONCILIATION
// ════════════════════════════════════════════════════════════
function ReconcileTab({ accounts }) {
  const [accountId, setAccountId] = useState('')
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const account = accounts.find(a => a.id === accountId)
  const { data: reconciliations = [] } = useBankReconciliations(accountId)
  const activeSession = reconciliations.find(r => r.status === 'in_progress')

  const { data: unreconciled = [], isLoading } = useBankTransactions({
    bank_account_id: accountId || undefined, is_reconciled: false,
  })

  const startRecon = useStartReconciliation()
  const reconcileTxns = useReconcileTransactions()
  const completeRecon = useCompleteReconciliation()

  const selectedTotal = useMemo(() =>
    unreconciled.filter(t => selectedIds.includes(t.id))
      .reduce((s, t) => s + (t.direction === 'in' ? Number(t.amount) : -Number(t.amount)), 0),
    [selectedIds, unreconciled])

  const difference = activeSession ? Number(activeSession.statement_ending_balance) - Number(account?.current_balance || 0) : null

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { statement_date: new Date().toISOString().slice(0, 10), statement_ending_balance: '', notes: '' },
  })

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div>
      <FiltersBar>
        <select className="form-input" style={{ width: 280, height: 36 }} value={accountId}
          onChange={e => { setAccountId(e.target.value); setSelectedIds([]) }}>
          <option value="">اختر الحساب البنكي للتسوية</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</option>)}
        </select>
        {accountId && !activeSession && (
          <button className="btn btn-primary" onClick={() => setStartModalOpen(true)}>
            <Plus size={16} /> بدء تسوية جديدة
          </button>
        )}
      </FiltersBar>

      {!accountId ? (
        <div className="card">
          <EmptyState icon={ClipboardCheck} title="اختر حساب بنكي" subtitle="عشان تبدأ جلسة تسوية كشف حساب" />
        </div>
      ) : (
        <>
          <StatsRow stats={[
            { label: 'رصيد النظام الحالي', value: <Amount value={account?.current_balance} currency={account?.currency} />, color: '#3d62f3' },
            { label: 'رصيد كشف الحساب (حسب آخر تسوية جارية)', value: activeSession ? new Intl.NumberFormat('en-US').format(activeSession.statement_ending_balance) : '—', color: '#21aaa3' },
            { label: 'الفرق', value: difference !== null ? difference.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', color: difference ? (Math.abs(difference) < 0.01 ? '#16a34a' : '#dc2626') : '#6b7280' },
          ]} />

          {activeSession && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: '#f8f9fb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13 }}>
                  جلسة تسوية جارية بتاريخ كشف <b>{activeSession.statement_date}</b> — رصيد الكشف{' '}
                  <b>{new Intl.NumberFormat('en-US').format(activeSession.statement_ending_balance)}</b>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={selectedIds.length === 0 || reconcileTxns.isPending}
                    onClick={async () => {
                      await reconcileTxns.mutateAsync({ transactionIds: selectedIds, reconciliation_id: activeSession.id })
                      setSelectedIds([])
                    }}
                  >
                    تحديد المحدد كمُسوّى ({selectedIds.length})
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={completeRecon.isPending}
                    onClick={async () => {
                      await completeRecon.mutateAsync({
                        id: activeSession.id, bank_account_id: accountId,
                        book_balance: account?.current_balance,
                        difference: Number(activeSession.statement_ending_balance) - Number(account?.current_balance || 0),
                      })
                    }}
                  >
                    إتمام التسوية
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8eaed', fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>
              الحركات غير المُسوّاة
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : unreconciled.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="كل الحركات مُسوّاة" subtitle="مفيش حركات معلقة على الحساب ده" />
            ) : (
              <div className="table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unreconciled.map(t => (
                      <tr key={t.id}>
                        <td>
                          {activeSession && (
                            <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>{t.transaction_date}</td>
                        <td style={{ fontSize: 12.5 }}>{TXN_TYPE_LABELS[t.transaction_type] || t.transaction_type}</td>
                        <td style={{ fontSize: 12.5, color: '#6b7280' }}>{t.description || '—'}</td>
                        <td>
                          <span className="num" style={{ color: t.direction === 'in' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {t.direction === 'in' ? '+' : '-'} {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(t.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeSession && selectedIds.length > 0 && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid #e8eaed', fontSize: 12.5, color: '#6b7280' }}>
                صافي الحركات المحددة: <b>{selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={startModalOpen} onClose={() => setStartModalOpen(false)} title="بدء جلسة تسوية جديدة"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setStartModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" form="start-recon-form" type="submit" disabled={startRecon.isPending}>
              {startRecon.isPending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'بدء التسوية'}
            </button>
          </>
        }>
        <form id="start-recon-form" onSubmit={handleSubmit(async (data) => {
          await startRecon.mutateAsync({ bank_account_id: accountId, ...data })
          reset()
          setStartModalOpen(false)
        })}>
          <div style={{ display: 'grid', gap: 16 }}>
            <FormField label="تاريخ كشف الحساب" required>
              <input className="form-input ltr" type="date" dir="ltr" {...register('statement_date')} />
            </FormField>
            <FormField label="رصيد كشف الحساب (من البنك)" required>
              <input className="form-input ltr" type="number" step="0.01" dir="ltr" {...register('statement_ending_balance')} />
            </FormField>
            <FormField label="ملاحظات">
              <textarea className="form-input" rows={2} {...register('notes')} />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function BanksPage() {
  const [tab, setTab] = useState('accounts')
  const { data: allAccounts = [] } = useBankAccounts({ is_active: true })

  return (
    <div>
      <PageHeader title="البنوك" subtitle="الحسابات البنكية، الحركة اليومية، والتسوية" />

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e8eaed', marginBottom: 20 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13.5, fontWeight: 600,
                color: active ? '#3d62f3' : '#6b7280',
                borderBottom: active ? '2px solid #3d62f3' : '2px solid transparent',
                background: 'none', cursor: 'pointer',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'transactions' && <TransactionsTab accounts={allAccounts} />}
      {tab === 'statement' && <StatementTab accounts={allAccounts} />}
      {tab === 'reconcile' && <ReconcileTab accounts={allAccounts} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
