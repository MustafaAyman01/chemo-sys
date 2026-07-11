-- ============================================================
-- MIGRATION 08: LIGHT TEST DATA ACROSS ALL SECTIONS
-- Assumes 03_seed_data.sql was already run (suppliers/customers/
-- items/warehouses/factories/departments must already exist).
-- Safe to run once. Run in Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_admin_id       UUID;
  v_supplier_id    UUID;
  v_customer_id    UUID;
  v_item_rm1       UUID;  -- Titanium Dioxide (raw material)
  v_item_fp1       UUID;  -- Interior Wall Paint (finished product)
  v_wh_main        UUID;
  v_wh_fg          UUID;
  v_factory_id     UUID;
  v_dept_prod      UUID;

  v_bank_egp       UUID;
  v_bank_usd       UUID;

  v_po_id          UUID;
  v_pi_id          UUID;
  v_so_id          UUID;
  v_si_id          UUID;
  v_bom_id         UUID;
  v_prod_id        UUID;
  v_employee_id    UUID;
BEGIN
  -- ── Look up foundational records (from 03_seed_data.sql) ────
  SELECT id INTO v_admin_id    FROM profiles WHERE role IN ('super_admin','admin') ORDER BY created_at LIMIT 1;
  SELECT id INTO v_supplier_id FROM suppliers WHERE code = 'SUP-001' LIMIT 1;
  SELECT id INTO v_customer_id FROM customers WHERE code = 'CUS-003' LIMIT 1;
  SELECT id INTO v_item_rm1    FROM items WHERE code = 'RM-001' LIMIT 1;
  SELECT id INTO v_item_fp1    FROM items WHERE code = 'FP-001' LIMIT 1;
  SELECT id INTO v_wh_main     FROM warehouses WHERE code = 'WH-MAIN' LIMIT 1;
  SELECT id INTO v_wh_fg       FROM warehouses WHERE code = 'WH-FG' LIMIT 1;
  SELECT id INTO v_factory_id  FROM factories WHERE code = 'FAC-MAIN' LIMIT 1;
  SELECT id INTO v_dept_prod   FROM departments WHERE code = 'PROD' LIMIT 1;

  IF v_admin_id IS NULL OR v_supplier_id IS NULL OR v_customer_id IS NULL
     OR v_item_rm1 IS NULL OR v_item_fp1 IS NULL OR v_wh_main IS NULL
     OR v_wh_fg IS NULL OR v_factory_id IS NULL OR v_dept_prod IS NULL THEN
    RAISE EXCEPTION 'Foundational data missing — make sure 03_seed_data.sql was run first, and that you have logged in at least once (for an admin profile).';
  END IF;

  -- ══════════════════════════════════════════════════════════
  -- BANKS
  -- ══════════════════════════════════════════════════════════
  INSERT INTO bank_accounts (code, bank_name, bank_name_ar, account_name, account_number, iban, currency, opening_balance, current_balance, created_by)
  VALUES ('BNK-001', 'National Bank of Egypt', 'البنك الأهلي المصري', 'ChemCo Industries Ltd', '1000123456789', 'EG380003000010001234567891', 'EGP', 500000, 500000, v_admin_id)
  RETURNING id INTO v_bank_egp;

  INSERT INTO bank_accounts (code, bank_name, bank_name_ar, account_name, account_number, currency, opening_balance, current_balance, created_by)
  VALUES ('BNK-002', 'Commercial International Bank (CIB)', 'البنك التجاري الدولي', 'ChemCo Industries Ltd - USD', '2000987654321', 'USD', 20000, 20000, v_admin_id)
  RETURNING id INTO v_bank_usd;

  -- ══════════════════════════════════════════════════════════
  -- PURCHASING (Supplier → PO → Invoice → Payment → Bank ledger)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO purchase_orders (supplier_id, status, order_date, expected_date, actual_date, currency, exchange_rate,
    subtotal_amount, tax_amount, total_amount, total_amount_egp, incoterms, payment_method, approved_by, approved_at, created_by)
  VALUES (v_supplier_id, 'delivered', CURRENT_DATE - 20, CURRENT_DATE - 12, CURRENT_DATE - 10, 'USD', 47.5,
    12000, 0, 12000, 570000, 'FOB', 'bank_transfer', v_admin_id, NOW(), v_admin_id)
  RETURNING id INTO v_po_id;

  INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, tax_type, tax_amount, total_amount, received_quantity)
  VALUES (v_po_id, v_item_rm1, 10, 1200, 'vat_0', 0, 12000, 10);

  INSERT INTO purchase_invoices (po_id, supplier_id, supplier_invoice_number, invoice_date, due_date, status,
    currency, exchange_rate, subtotal, tax_amount, total_amount, total_egp, paid_amount, remaining_amount,
    payment_method, approved_by, approved_at, created_by)
  VALUES (v_po_id, v_supplier_id, 'KRO-INV-88231', CURRENT_DATE - 10, CURRENT_DATE + 80, 'approved',
    'USD', 47.5, 12000, 0, 12000, 570000, 0, 12000, 'bank_transfer', v_admin_id, NOW(), v_admin_id)
  RETURNING id INTO v_pi_id;

  INSERT INTO purchase_invoice_items (invoice_id, item_id, quantity, unit_price, tax_type, tax_amount, total_amount)
  VALUES (v_pi_id, v_item_rm1, 10, 1200, 'vat_0', 0, 12000);

  -- Simulate a partial payment (7,000 of 12,000 USD) from the USD bank account
  UPDATE purchase_invoices SET paid_amount = 7000 WHERE id = v_pi_id;

  INSERT INTO payments (reference_type, reference_id, payment_date, amount, currency, exchange_rate,
    payment_method, bank_account_id, notes, created_by)
  VALUES ('purchase_invoice', v_pi_id, CURRENT_DATE - 5, 7000, 'USD', 47.5,
    'bank_transfer', v_bank_usd, 'دفعة أولى - فاتورة KRO-INV-88231', v_admin_id);

  -- ══════════════════════════════════════════════════════════
  -- PRODUCTION (BOM → Production Order → stock movements)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO bill_of_materials (finished_product_id, version, is_active, created_by)
  VALUES (v_item_fp1, '1.0', TRUE, v_admin_id)
  RETURNING id INTO v_bom_id;

  INSERT INTO bom_items (bom_id, raw_material_id, quantity_per_unit, waste_pct)
  VALUES (v_bom_id, v_item_rm1, 0.4, 2);

  INSERT INTO production_orders (order_number, factory_id, bom_id, finished_product_id, planned_quantity,
    actual_quantity, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date,
    unit_cost, total_cost, quality_approved, approved_by, approved_at, created_by)
  VALUES ('PRD-2601-001', v_factory_id, v_bom_id, v_item_fp1, 5, 5, 'completed',
    CURRENT_DATE - 15, CURRENT_DATE - 13, CURRENT_DATE - 15, CURRENT_DATE - 13,
    30000, 150000, TRUE, v_admin_id, NOW(), v_admin_id)
  RETURNING id INTO v_prod_id;

  INSERT INTO production_materials (production_order_id, item_id, warehouse_id, planned_quantity, actual_quantity, unit_cost, total_cost)
  VALUES (v_prod_id, v_item_rm1, v_wh_main, 2, 2, 57000, 114000);

  -- Stock movements: raw material in (purchase) → raw material out (production) → finished good in (production)
  INSERT INTO stock_movements (reference_type, reference_id, movement_type, warehouse_id, item_id, quantity, unit_cost, total_cost, balance_after, created_by, created_at)
  VALUES ('purchase', v_po_id, 'purchase_in', v_wh_main, v_item_rm1, 10, 57000, 570000, 10, v_admin_id, NOW() - INTERVAL '10 days');

  INSERT INTO stock_movements (reference_type, reference_id, movement_type, warehouse_id, item_id, quantity, unit_cost, total_cost, balance_after, created_by, created_at)
  VALUES ('production', v_prod_id, 'production_out', v_wh_main, v_item_rm1, 2, 57000, 114000, 8, v_admin_id, NOW() - INTERVAL '15 days');

  INSERT INTO stock_movements (reference_type, reference_id, movement_type, warehouse_id, item_id, quantity, unit_cost, total_cost, balance_after, created_by, created_at)
  VALUES ('production', v_prod_id, 'production_in', v_wh_fg, v_item_fp1, 5, 30000, 150000, 5, v_admin_id, NOW() - INTERVAL '13 days');

  -- ══════════════════════════════════════════════════════════
  -- SALES (Customer → SO → Invoice → Payment → Bank ledger)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO sales_orders (customer_id, status, order_date, required_date, delivery_date, warehouse_id,
    currency, exchange_rate, subtotal, tax_amount, total_amount, payment_method, approved_by, approved_at, created_by)
  VALUES (v_customer_id, 'delivered', CURRENT_DATE - 8, CURRENT_DATE - 3, CURRENT_DATE - 5, v_wh_fg,
    'EGP', 1, 135000, 18900, 153900, 'bank_transfer', v_admin_id, NOW(), v_admin_id)
  RETURNING id INTO v_so_id;

  INSERT INTO sales_order_items (order_id, item_id, quantity, unit_price, tax_type, tax_amount, total_amount, delivered_quantity)
  VALUES (v_so_id, v_item_fp1, 3, 45000, 'vat_14', 18900, 153900, 3);

  INSERT INTO sales_invoices (order_id, customer_id, invoice_date, due_date, status, currency, exchange_rate,
    subtotal, tax_amount, total_amount, paid_amount, remaining_amount, payment_method, approved_by, approved_at, created_by)
  VALUES (v_so_id, v_customer_id, CURRENT_DATE - 5, CURRENT_DATE + 25, 'approved', 'EGP', 1,
    135000, 18900, 153900, 0, 153900, 'bank_transfer', v_admin_id, NOW(), v_admin_id)
  RETURNING id INTO v_si_id;

  INSERT INTO sales_invoice_items (invoice_id, item_id, quantity, unit_price, tax_type, tax_amount, total_amount)
  VALUES (v_si_id, v_item_fp1, 3, 45000, 'vat_14', 18900, 153900);

  -- Fully paid, via the EGP bank account
  UPDATE sales_invoices SET paid_amount = 153900 WHERE id = v_si_id;

  INSERT INTO payments (reference_type, reference_id, payment_date, amount, currency, exchange_rate,
    payment_method, bank_account_id, notes, created_by)
  VALUES ('sales_invoice', v_si_id, CURRENT_DATE - 4, 153900, 'EGP', 1,
    'bank_transfer', v_bank_egp, 'سداد كامل - فاتورة عميل سيراميكا كليوباترا', v_admin_id);

  INSERT INTO stock_movements (reference_type, reference_id, movement_type, warehouse_id, item_id, quantity, unit_cost, total_cost, balance_after, created_by, created_at)
  VALUES ('sales', v_si_id, 'sales_out', v_wh_fg, v_item_fp1, 3, 30000, 90000, 2, v_admin_id, NOW() - INTERVAL '5 days');

  -- ══════════════════════════════════════════════════════════
  -- WAREHOUSE STOCK (final on-hand balances matching movements above)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO warehouse_stock (warehouse_id, item_id, quantity, avg_cost, last_movement_at)
  VALUES (v_wh_main, v_item_rm1, 8, 57000, NOW() - INTERVAL '15 days')
  ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = 8, avg_cost = 57000;

  INSERT INTO warehouse_stock (warehouse_id, item_id, quantity, avg_cost, last_movement_at)
  VALUES (v_wh_fg, v_item_fp1, 2, 30000, NOW() - INTERVAL '5 days')
  ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = 2, avg_cost = 30000;

  -- ══════════════════════════════════════════════════════════
  -- HR (Employee → Attendance → Payroll)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO employees (employee_number, national_id, full_name, full_name_ar, department_id, job_title, job_title_ar,
    employment_type, hire_date, base_salary, housing_allowance, transport_allowance, meal_allowance,
    bank_name, bank_account, is_active)
  VALUES ('EMP-001', '29001011234567', 'Mahmoud Nabil', 'محمود نبيل', v_dept_prod, 'Factory Engineer', 'مهندس مصنع',
    'full_time', '2022-03-01', 12000, 1000, 500, 300, 'National Bank of Egypt', '1000123456999', TRUE)
  RETURNING id INTO v_employee_id;

  INSERT INTO attendance (employee_id, date, check_in, check_out, status, late_minutes, overtime_hours, created_by) VALUES
  (v_employee_id, CURRENT_DATE - 3, (CURRENT_DATE - 3) + TIME '08:02', (CURRENT_DATE - 3) + TIME '17:00', 'present', 0, 1, v_admin_id),
  (v_employee_id, CURRENT_DATE - 2, (CURRENT_DATE - 2) + TIME '08:20', (CURRENT_DATE - 2) + TIME '17:00', 'late', 20, 0, v_admin_id),
  (v_employee_id, CURRENT_DATE - 1, (CURRENT_DATE - 1) + TIME '08:00', (CURRENT_DATE - 1) + TIME '18:00', 'present', 0, 2, v_admin_id);

  INSERT INTO payroll (employee_id, period_year, period_month, working_days, actual_days, absent_days,
    late_deduction, overtime_hours, overtime_amount, base_salary, housing_allowance, transport_allowance,
    meal_allowance, gross_salary, social_insurance_deduction, income_tax, total_deductions, net_salary,
    payment_date, payment_method, is_paid, created_by)
  VALUES (v_employee_id, EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, 22, 21, 1,
    0, 4, 500, 12000, 1000, 500, 300, 14300, 1320, 200, 1520, 12780,
    CURRENT_DATE - 3, 'bank_transfer', TRUE, v_admin_id);

  -- ══════════════════════════════════════════════════════════
  -- EXPENSES (also settled through the bank ledger)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO expenses (reference_number, category, description, amount, currency, amount_egp, vendor_name,
    expense_date, cost_center, payment_method, approved_by, approved_at, created_by)
  VALUES ('EXP-2601-001', 'logistics', 'شحن ونقل خامات من الميناء للمخزن', 8000, 'EGP', 8000,
    'شركة الشحن السريع', CURRENT_DATE - 7, 'PROD', 'bank_transfer', v_admin_id, NOW(), v_admin_id);

  RAISE NOTICE 'Test data seeded successfully.';
END $$;
