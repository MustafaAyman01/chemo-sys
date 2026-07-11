-- ============================================================
-- MIGRATION 07: BANKS MODULE
-- Bank accounts + full transaction ledger + reconciliation
-- Linked to existing payments (which link to purchase/sales invoices,
-- i.e. suppliers/customers) so we get a bank statement per supplier/customer.
-- Run this once in the Supabase SQL Editor, after 01-06.
-- ============================================================

-- ── 1. Bank Accounts (company's own bank accounts) ─────────────
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  bank_name_ar TEXT,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  swift_code TEXT,
  branch TEXT,
  currency currency NOT NULL DEFAULT 'EGP',
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Reconciliation batches ────────────────────────────────
CREATE TABLE bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_ending_balance DECIMAL(15,2) NOT NULL,
  book_balance DECIMAL(15,2),
  difference DECIMAL(15,2),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── 3. Bank Transactions (the full ledger) ──────────────────
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN
    ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'bank_fee', 'interest', 'other')),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency currency NOT NULL DEFAULT 'EGP',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  transfer_pair_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,
  description TEXT,
  description_ar TEXT,
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES profiles(id),
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE SET NULL,
  statement_line_ref TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Link payments to a specific bank account ──────────────
ALTER TABLE payments ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id);

-- ── 5. Indexes ────────────────────────────────────────────────
CREATE INDEX idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_txn_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_txn_payment ON bank_transactions(payment_id);
CREATE INDEX idx_bank_txn_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX idx_payments_bank_account ON payments(bank_account_id);

-- ── 6. updated_at trigger for bank_accounts ──────────────────
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Keep bank_accounts.current_balance in sync ────────────
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance + (CASE WHEN NEW.direction = 'in' THEN NEW.amount ELSE -NEW.amount END)
    WHERE id = NEW.bank_account_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - (CASE WHEN OLD.direction = 'in' THEN OLD.amount ELSE -OLD.amount END)
    WHERE id = OLD.bank_account_id;
    UPDATE bank_accounts
    SET current_balance = current_balance + (CASE WHEN NEW.direction = 'in' THEN NEW.amount ELSE -NEW.amount END)
    WHERE id = NEW.bank_account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - (CASE WHEN OLD.direction = 'in' THEN OLD.amount ELSE -OLD.amount END)
    WHERE id = OLD.bank_account_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bank_txn_balance
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

-- Note: balance math assumes transaction currency matches the bank account's
-- currency. exchange_rate is kept for reporting/conversion display only.

-- ── 8. Auto-create a ledger entry whenever a payment is tied to a bank account ──
CREATE OR REPLACE FUNCTION create_bank_transaction_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_direction TEXT;
  v_type TEXT;
BEGIN
  IF NEW.bank_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reference_type = 'sales_invoice' THEN
    v_direction := 'in';
    v_type := 'deposit';
  ELSE
    v_direction := 'out';
    v_type := 'withdrawal';
  END IF;

  INSERT INTO bank_transactions
    (bank_account_id, transaction_date, transaction_type, direction, amount,
     currency, exchange_rate, payment_id, description, reference_number, created_by)
  VALUES
    (NEW.bank_account_id, NEW.payment_date, v_type, v_direction, NEW.amount,
     NEW.currency, NEW.exchange_rate, NEW.id,
     'دفعة ' || NEW.reference_type || ' - ' || COALESCE(NEW.notes, ''),
     NEW.check_number, NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_bank_transaction
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION create_bank_transaction_from_payment();

-- ── 9. Audit logging (reuses existing audit_trigger()) ───────
CREATE TRIGGER audit_bank_accounts
  AFTER INSERT OR UPDATE OR DELETE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_bank_transactions
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ── 10. View: bank statement joined with the supplier/customer behind each payment ──
CREATE OR REPLACE VIEW bank_party_transactions AS
SELECT
  bt.id AS transaction_id,
  bt.bank_account_id,
  ba.code AS bank_account_code,
  ba.bank_name,
  ba.account_name,
  bt.transaction_date,
  bt.transaction_type,
  bt.direction,
  bt.amount,
  bt.currency,
  bt.description,
  bt.reference_number,
  bt.is_reconciled,
  p.reference_type AS payment_reference_type,
  p.reference_id AS payment_reference_id,
  CASE
    WHEN p.reference_type = 'purchase_invoice' THEN 'supplier'
    WHEN p.reference_type = 'sales_invoice' THEN 'customer'
    ELSE NULL
  END AS party_type,
  COALESCE(pi.supplier_id, si.customer_id) AS party_id,
  COALESCE(s.name, c.name) AS party_name,
  COALESCE(s.name_ar, c.name_ar) AS party_name_ar
FROM bank_transactions bt
JOIN bank_accounts ba ON ba.id = bt.bank_account_id
LEFT JOIN payments p ON p.id = bt.payment_id
LEFT JOIN purchase_invoices pi ON p.reference_type = 'purchase_invoice' AND pi.id = p.reference_id
LEFT JOIN sales_invoices si ON p.reference_type = 'sales_invoice' AND si.id = p.reference_id
LEFT JOIN suppliers s ON s.id = pi.supplier_id
LEFT JOIN customers c ON c.id = si.customer_id;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with banks view can see bank accounts"
  ON bank_accounts FOR SELECT
  USING (is_active_user() AND has_permission('banks', 'view'));

CREATE POLICY "Users with banks create can add bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (has_permission('banks', 'create'));

CREATE POLICY "Users with banks edit can update bank accounts"
  ON bank_accounts FOR UPDATE
  USING (has_permission('banks', 'edit'));

CREATE POLICY "Admins can delete bank accounts"
  ON bank_accounts FOR DELETE
  USING (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Users with banks view can see transactions"
  ON bank_transactions FOR SELECT
  USING (is_active_user() AND has_permission('banks', 'view'));

CREATE POLICY "Users with banks create can add transactions"
  ON bank_transactions FOR INSERT
  WITH CHECK (has_permission('banks', 'create'));

CREATE POLICY "Users with banks edit can update transactions"
  ON bank_transactions FOR UPDATE
  USING (has_permission('banks', 'edit'));

CREATE POLICY "Users with banks delete can remove transactions"
  ON bank_transactions FOR DELETE
  USING (has_permission('banks', 'delete'));

CREATE POLICY "Users with banks view can see reconciliations"
  ON bank_reconciliations FOR SELECT
  USING (is_active_user() AND has_permission('banks', 'view'));

CREATE POLICY "Users with banks approve can create reconciliations"
  ON bank_reconciliations FOR INSERT
  WITH CHECK (has_permission('banks', 'approve'));

CREATE POLICY "Users with banks approve can update reconciliations"
  ON bank_reconciliations FOR UPDATE
  USING (has_permission('banks', 'approve'));

-- ============================================================
-- PERMISSIONS SEED: 'banks' module (mirrors 'finance' access levels)
-- ============================================================
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_export) VALUES
('super_admin',        'banks', TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('admin',              'banks', TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('finance_manager',    'banks', TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('warehouse_manager',  'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_manager',      'banks', TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('hr_manager',         'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('accountant',         'banks', TRUE,  TRUE,  TRUE,  FALSE, FALSE, TRUE),
('warehouse_staff',    'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff',   'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep',          'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff',           'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer',             'banks', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE);
