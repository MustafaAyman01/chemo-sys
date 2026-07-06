-- ============================================================
-- Migration: Complete RLS Fix for all tables
-- ============================================================

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "Authorized users can view purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Supply chain can create purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Supply chain can edit purchase orders" ON purchase_orders;

CREATE POLICY "View purchase orders" ON purchase_orders FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user());

CREATE POLICY "Create purchase orders" ON purchase_orders FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND is_active_user() AND
    get_user_role() IN ('super_admin','admin','warehouse_manager','warehouse_staff','production_manager','finance_manager','accountant')
  );

CREATE POLICY "Update purchase orders" ON purchase_orders FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager','production_manager','finance_manager','accountant'));

ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View PO items" ON purchase_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage PO items" ON purchase_order_items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager','warehouse_staff','production_manager','finance_manager','accountant'));
CREATE POLICY "Update PO items" ON purchase_order_items FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager','finance_manager'));
CREATE POLICY "Delete PO items" ON purchase_order_items FOR DELETE
  USING (get_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Finance team can view purchase invoices" ON purchase_invoices;
ALTER TABLE purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View purchase invoices" ON purchase_invoices FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create purchase invoices" ON purchase_invoices FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','finance_manager','accountant','warehouse_manager'));
CREATE POLICY "Update purchase invoices" ON purchase_invoices FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','finance_manager','accountant'));

ALTER TABLE purchase_invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View PI items" ON purchase_invoice_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage PI items" ON purchase_invoice_items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','finance_manager','accountant','warehouse_manager'));

DROP POLICY IF EXISTS "Sales team can view sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Sales team can create sales orders" ON sales_orders;
DROP POLICY IF EXISTS "Sales team can edit their orders" ON sales_orders;
ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sales orders" ON sales_orders FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create sales orders" ON sales_orders FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','sales_manager','sales_rep','finance_manager'));
CREATE POLICY "Update sales orders" ON sales_orders FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','sales_manager','finance_manager'));

ALTER TABLE sales_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View SO items" ON sales_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage SO items" ON sales_order_items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','sales_manager','sales_rep','finance_manager'));

DROP POLICY IF EXISTS "Finance team can view invoices" ON sales_invoices;
ALTER TABLE sales_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sales invoices" ON sales_invoices FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create sales invoices" ON sales_invoices FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','sales_manager','finance_manager','accountant'));
CREATE POLICY "Update sales invoices" ON sales_invoices FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','sales_manager','finance_manager','accountant'));

ALTER TABLE sales_invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View SI items" ON sales_invoice_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage SI items" ON sales_invoice_items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','sales_manager','finance_manager','accountant'));

DROP POLICY IF EXISTS "Authorized users can view warehouse data" ON warehouse_stock;
DROP POLICY IF EXISTS "Warehouse staff can update stock" ON warehouse_stock;
ALTER TABLE warehouse_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View warehouse stock" ON warehouse_stock FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Manage warehouse stock" ON warehouse_stock FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager','warehouse_staff','production_manager','production_staff'));
CREATE POLICY "Update warehouse stock" ON warehouse_stock FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager','warehouse_staff','production_manager','production_staff'));

ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View stock movements" ON stock_movements FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create stock movements" ON stock_movements FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager','warehouse_staff','production_manager','production_staff','finance_manager'));

ALTER TABLE production_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View production orders" ON production_orders FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create production orders" ON production_orders FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','production_manager','production_staff'));
CREATE POLICY "Update production orders" ON production_orders FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','production_manager'));

ALTER TABLE production_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View production materials" ON production_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage production materials" ON production_materials FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','production_manager','production_staff'));

ALTER TABLE bill_of_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View BOMs" ON bill_of_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage BOMs" ON bill_of_materials FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','production_manager'));
CREATE POLICY "Update BOMs" ON bill_of_materials FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','production_manager'));

ALTER TABLE bom_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View BOM items" ON bom_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage BOM items" ON bom_items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','production_manager'));

DROP POLICY IF EXISTS "Supply chain can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Supply chain can edit suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON suppliers;
CREATE POLICY "Create suppliers" ON suppliers FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager','production_manager','finance_manager'));
CREATE POLICY "Update suppliers" ON suppliers FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager','production_manager','finance_manager'));
CREATE POLICY "Delete suppliers" ON suppliers FOR DELETE
  USING (get_user_role() IN ('super_admin','admin'));

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View customers" ON customers FOR SELECT USING (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Create customers" ON customers FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','sales_manager','sales_rep','finance_manager'));
CREATE POLICY "Update customers" ON customers FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','sales_manager','finance_manager'));

DROP POLICY IF EXISTS "Managers can create items" ON items;
DROP POLICY IF EXISTS "Managers can edit items" ON items;
CREATE POLICY "Create items" ON items FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager','production_manager'));
CREATE POLICY "Update items" ON items FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager','production_manager'));

ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View warehouses" ON warehouses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage warehouses" ON warehouses FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','warehouse_manager'));
CREATE POLICY "Update warehouses" ON warehouses FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','warehouse_manager'));

ALTER TABLE factories DISABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View factories" ON factories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage factories" ON factories FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','production_manager'));
CREATE POLICY "Update factories" ON factories FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','production_manager'));

DROP POLICY IF EXISTS "HR can view all employees" ON employees;
DROP POLICY IF EXISTS "HR can manage employees" ON employees;
DROP POLICY IF EXISTS "HR can edit employees" ON employees;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View employees" ON employees FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','hr_manager','hr_staff','finance_manager') OR
    profile_id = auth.uid()
  ));
CREATE POLICY "Create employees" ON employees FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','hr_manager'));
CREATE POLICY "Update employees" ON employees FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager'));

DROP POLICY IF EXISTS "View own attendance" ON attendance;
DROP POLICY IF EXISTS "HR can manage attendance" ON attendance;
DROP POLICY IF EXISTS "HR can edit attendance" ON attendance;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View attendance" ON attendance FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','hr_manager','hr_staff','finance_manager') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  ));
CREATE POLICY "Create attendance" ON attendance FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','hr_manager','hr_staff'));
CREATE POLICY "Update attendance" ON attendance FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager','hr_staff'));

ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View leave requests" ON leave_requests FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','hr_manager','hr_staff') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  ));
CREATE POLICY "Create leave requests" ON leave_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','hr_manager','hr_staff') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  ));
CREATE POLICY "Update leave requests" ON leave_requests FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "HR managers can view payroll" ON payroll;
DROP POLICY IF EXISTS "HR can create payroll" ON payroll;
ALTER TABLE payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payroll" ON payroll FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','hr_manager','finance_manager') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  ));
CREATE POLICY "Create payroll" ON payroll FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','hr_manager','finance_manager'));
CREATE POLICY "Update payroll" ON payroll FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager','finance_manager'));

ALTER TABLE salary_advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View salary advances" ON salary_advances FOR SELECT
  USING (auth.role() = 'authenticated' AND (
    get_user_role() IN ('super_admin','admin','hr_manager','finance_manager') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  ));
CREATE POLICY "Create salary advances" ON salary_advances FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','hr_manager') OR
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));
CREATE POLICY "Update salary advances" ON salary_advances FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager'));

DROP POLICY IF EXISTS "Finance can manage expenses" ON expenses;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View expenses" ON expenses FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND (
    get_user_role() IN ('super_admin','admin','finance_manager','accountant') OR
    created_by = auth.uid()
  ));
CREATE POLICY "Create expenses" ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_active_user());
CREATE POLICY "Update expenses" ON expenses FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','finance_manager','accountant') OR
    (created_by = auth.uid() AND approved_by IS NULL));
CREATE POLICY "Delete expenses" ON expenses FOR DELETE
  USING (get_user_role() IN ('super_admin','admin') OR
    (created_by = auth.uid() AND approved_by IS NULL));

ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payments" ON payments FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active_user() AND
    get_user_role() IN ('super_admin','admin','finance_manager','accountant','sales_manager','warehouse_manager'));
CREATE POLICY "Create payments" ON payments FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','finance_manager','accountant'));

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View departments" ON departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage departments" ON departments FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin','admin','hr_manager'));
CREATE POLICY "Update departments" ON departments FOR UPDATE
  USING (get_user_role() IN ('super_admin','admin','hr_manager'));

DROP POLICY IF EXISTS "Admins can view audit log" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View audit log" ON audit_log FOR SELECT
  USING (get_user_role() IN ('super_admin','admin'));
CREATE POLICY "Insert audit log" ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;