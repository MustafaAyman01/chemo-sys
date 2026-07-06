-- ============================================================
-- ChemCo ERP - Row Level Security (RLS) Policies
-- Phase 1: Auth & Permissions
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has module permission
CREATE OR REPLACE FUNCTION has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_has_perm BOOLEAN := FALSE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  
  -- Super admin has everything
  IF v_role IN ('super_admin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check role_permissions table
  SELECT CASE p_action
    WHEN 'view'    THEN can_view
    WHEN 'create'  THEN can_create
    WHEN 'edit'    THEN can_edit
    WHEN 'delete'  THEN can_delete
    WHEN 'approve' THEN can_approve
    WHEN 'export'  THEN can_export
    ELSE FALSE
  END
  INTO v_has_perm
  FROM role_permissions
  WHERE role = v_role AND module = p_module;
  
  RETURN COALESCE(v_has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT is_active FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() IN ('super_admin', 'admin', 'hr_manager', 'hr_staff'));

CREATE POLICY "Admins can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- ROLE_PERMISSIONS POLICIES
-- ============================================================

-- Every authenticated active user needs to read the permission matrix
-- so the frontend can determine what they're allowed to see/do.
CREATE POLICY "Authenticated users can read role permissions"
  ON role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- SUPPLIERS POLICIES
-- ============================================================

CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user());

CREATE POLICY "Supply chain can manage suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (has_permission('suppliers', 'create'));

CREATE POLICY "Supply chain can edit suppliers"
  ON suppliers FOR UPDATE
  USING (has_permission('suppliers', 'edit'));

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- ITEMS POLICIES
-- ============================================================

CREATE POLICY "All authenticated users can view items"
  ON items FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user());

CREATE POLICY "Managers can create items"
  ON items FOR INSERT
  WITH CHECK (has_permission('warehouse', 'create'));

CREATE POLICY "Managers can edit items"
  ON items FOR UPDATE
  USING (has_permission('warehouse', 'edit'));

-- ============================================================
-- PURCHASE ORDERS POLICIES
-- ============================================================

CREATE POLICY "Authorized users can view purchase orders"
  ON purchase_orders FOR SELECT
  USING (
    is_active_user() AND
    has_permission('suppliers', 'view')
  );

CREATE POLICY "Supply chain can create purchase orders"
  ON purchase_orders FOR INSERT
  WITH CHECK (has_permission('suppliers', 'create'));

CREATE POLICY "Supply chain can edit purchase orders"
  ON purchase_orders FOR UPDATE
  USING (has_permission('suppliers', 'edit'));

-- ============================================================
-- WAREHOUSE POLICIES
-- ============================================================

CREATE POLICY "Authorized users can view warehouse data"
  ON warehouse_stock FOR SELECT
  USING (
    is_active_user() AND
    has_permission('warehouse', 'view')
  );

CREATE POLICY "Warehouse staff can update stock"
  ON warehouse_stock FOR UPDATE
  USING (has_permission('warehouse', 'edit'));

-- ============================================================
-- SALES POLICIES
-- ============================================================

CREATE POLICY "Sales team can view sales orders"
  ON sales_orders FOR SELECT
  USING (
    is_active_user() AND
    has_permission('sales', 'view')
  );

CREATE POLICY "Sales team can create sales orders"
  ON sales_orders FOR INSERT
  WITH CHECK (has_permission('sales', 'create'));

CREATE POLICY "Sales team can edit their orders"
  ON sales_orders FOR UPDATE
  USING (
    has_permission('sales', 'edit') AND
    (status = 'draft' OR get_user_role() IN ('super_admin', 'admin', 'sales_manager'))
  );

-- ============================================================
-- HR POLICIES
-- ============================================================

CREATE POLICY "HR can view all employees"
  ON employees FOR SELECT
  USING (
    is_active_user() AND (
      has_permission('hr', 'view') OR
      profile_id = auth.uid()  -- employees can see their own record
    )
  );

CREATE POLICY "HR can manage employees"
  ON employees FOR INSERT
  WITH CHECK (has_permission('hr', 'create'));

CREATE POLICY "HR can edit employees"
  ON employees FOR UPDATE
  USING (has_permission('hr', 'edit'));

-- Attendance: employees can only see their own, HR sees all
CREATE POLICY "View own attendance"
  ON attendance FOR SELECT
  USING (
    is_active_user() AND (
      has_permission('hr', 'view') OR
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "HR can manage attendance"
  ON attendance FOR INSERT
  WITH CHECK (has_permission('hr', 'create'));

CREATE POLICY "HR can edit attendance"
  ON attendance FOR UPDATE
  USING (has_permission('hr', 'edit'));

-- Payroll: sensitive - only HR manager and above
CREATE POLICY "HR managers can view payroll"
  ON payroll FOR SELECT
  USING (
    is_active_user() AND (
      get_user_role() IN ('super_admin', 'admin', 'hr_manager', 'finance_manager') OR
      employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "HR can create payroll"
  ON payroll FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'hr_manager'));

-- ============================================================
-- FINANCE POLICIES
-- ============================================================

CREATE POLICY "Finance team can view invoices"
  ON sales_invoices FOR SELECT
  USING (
    is_active_user() AND
    has_permission('finance', 'view')
  );

CREATE POLICY "Finance team can view purchase invoices"
  ON purchase_invoices FOR SELECT
  USING (
    is_active_user() AND
    has_permission('finance', 'view')
  );

CREATE POLICY "Finance can manage expenses"
  ON expenses FOR SELECT
  USING (
    is_active_user() AND (
      has_permission('finance', 'view') OR
      created_by = auth.uid()
    )
  );

-- ============================================================
-- AUDIT LOG POLICIES
-- ============================================================

CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);

-- Suppliers
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_country ON suppliers(country);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- Items
CREATE INDEX idx_items_code ON items(code);
CREATE INDEX idx_items_category ON items(category);

-- Purchase Orders
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(order_date);
CREATE INDEX idx_po_number ON purchase_orders(po_number);

-- Purchase Invoices
CREATE INDEX idx_pi_supplier ON purchase_invoices(supplier_id);
CREATE INDEX idx_pi_status ON purchase_invoices(status);
CREATE INDEX idx_pi_date ON purchase_invoices(invoice_date);

-- Warehouse Stock
CREATE INDEX idx_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX idx_stock_item ON warehouse_stock(item_id);

-- Stock Movements
CREATE INDEX idx_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_movements_item ON stock_movements(item_id);
CREATE INDEX idx_movements_date ON stock_movements(created_at);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);

-- Production Orders
CREATE INDEX idx_prod_factory ON production_orders(factory_id);
CREATE INDEX idx_prod_status ON production_orders(status);
CREATE INDEX idx_prod_product ON production_orders(finished_product_id);
CREATE INDEX idx_prod_date ON production_orders(planned_start_date);

-- Sales Orders
CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_so_date ON sales_orders(order_date);
CREATE INDEX idx_so_number ON sales_orders(order_number);

-- Sales Invoices
CREATE INDEX idx_si_customer ON sales_invoices(customer_id);
CREATE INDEX idx_si_status ON sales_invoices(status);
CREATE INDEX idx_si_date ON sales_invoices(invoice_date);
CREATE INDEX idx_si_due ON sales_invoices(due_date);

-- Employees
CREATE INDEX idx_emp_department ON employees(department_id);
CREATE INDEX idx_emp_number ON employees(employee_number);
CREATE INDEX idx_emp_national_id ON employees(national_id);
CREATE INDEX idx_emp_active ON employees(is_active);

-- Attendance
CREATE INDEX idx_att_employee ON attendance(employee_id);
CREATE INDEX idx_att_date ON attendance(date);

-- Payroll
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_period ON payroll(period_year, period_month);

-- Expenses
CREATE INDEX idx_exp_category ON expenses(category);
CREATE INDEX idx_exp_date ON expenses(expense_date);

-- Audit Log
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pi_updated_at
  BEFORE UPDATE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_so_updated_at
  BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_si_updated_at
  BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate readable numbers
CREATE OR REPLACE FUNCTION gen_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('po_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_po_number
  BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION gen_po_number();

CREATE OR REPLACE FUNCTION gen_so_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SO-' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('sales_order_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_so_number
  BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION gen_so_number();

CREATE OR REPLACE FUNCTION gen_invoice_numbers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'purchase_invoices' THEN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
      NEW.invoice_number := 'PI-' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('pi_number_seq')::TEXT, 5, '0');
    END IF;
  ELSIF TG_TABLE_NAME = 'sales_invoices' THEN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
      NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('si_number_seq')::TEXT, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_pi_number
  BEFORE INSERT ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION gen_invoice_numbers();
CREATE TRIGGER trg_gen_si_number
  BEFORE INSERT ON sales_invoices FOR EACH ROW EXECUTE FUNCTION gen_invoice_numbers();

-- Auto update invoice remaining_amount
CREATE OR REPLACE FUNCTION update_invoice_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount := NEW.total_amount - NEW.paid_amount;
  IF NEW.remaining_amount <= 0 THEN
    NEW.status := 'paid';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partially_paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_si_remaining
  BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION update_invoice_remaining();
CREATE TRIGGER trg_pi_remaining
  BEFORE UPDATE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION update_invoice_remaining();

-- Audit log trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(user_id, action, table_name, record_id, old_values)
    VALUES(auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(user_id, action, table_name, record_id, old_values, new_values)
    VALUES(auth.uid(), 'update', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(user_id, action, table_name, record_id, new_values)
    VALUES(auth.uid(), 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit to critical tables
CREATE TRIGGER audit_purchase_invoices
  AFTER INSERT OR UPDATE OR DELETE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_sales_invoices
  AFTER INSERT OR UPDATE OR DELETE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_payroll
  AFTER INSERT OR UPDATE OR DELETE ON payroll FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger();
