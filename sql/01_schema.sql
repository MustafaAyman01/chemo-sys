-- ============================================================
-- ChemCo ERP - Complete Database Schema
-- Phase 1: Foundation
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin',
  'finance_manager',
  'warehouse_manager',
  'production_manager',
  'sales_manager',
  'hr_manager',
  'accountant',
  'warehouse_staff',
  'production_staff',
  'sales_rep',
  'hr_staff',
  'viewer'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending',
  'approved',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
  'refunded'
);

CREATE TYPE order_status AS ENUM (
  'draft',
  'confirmed',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE production_status AS ENUM (
  'planned',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'check',
  'cash',
  'credit',
  'lc'  -- Letter of Credit (for imports)
);

CREATE TYPE currency AS ENUM (
  'EGP',
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'AED'
);

CREATE TYPE stock_movement_type AS ENUM (
  'purchase_in',
  'production_out',
  'production_in',
  'sales_out',
  'transfer_in',
  'transfer_out',
  'adjustment_in',
  'adjustment_out',
  'return_in',
  'waste'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
  'holiday',
  'remote'
);

CREATE TYPE leave_type AS ENUM (
  'annual',
  'sick',
  'emergency',
  'maternity',
  'paternity',
  'unpaid',
  'hajj'
);

CREATE TYPE expense_category AS ENUM (
  'utilities',
  'rent',
  'maintenance',
  'transportation',
  'logistics',
  'marketing',
  'admin',
  'legal',
  'insurance',
  'customs',
  'port_fees',
  'lab_testing',
  'safety',
  'it',
  'other'
);

CREATE TYPE factory_type AS ENUM (
  'owned',        -- المصنع الرئيسي
  'external'      -- مصانع التصنيع لحساب الغير (Toll Manufacturing)
);

CREATE TYPE tax_type AS ENUM (
  'vat_14',       -- VAT 14% Egypt
  'vat_0',        -- Zero rated
  'exempt',       -- Exempt
  'withholding'   -- Withholding tax
);

-- ============================================================
-- CORE TABLES
-- ============================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions (granular per-module access)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  module TEXT NOT NULL,           -- 'suppliers', 'warehouse', 'production', 'sales', 'hr', 'finance', 'reports'
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module)
);

-- ============================================================
-- SUPPLIERS & PROCUREMENT
-- ============================================================

-- Suppliers (موردين)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  country TEXT NOT NULL,
  city TEXT,
  address TEXT,
  tax_number TEXT,
  commercial_register TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  currency currency DEFAULT 'USD',
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit DECIMAL(15,2),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw Materials / Products (خامات ومنتجات)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  category TEXT NOT NULL,         -- 'raw_material', 'finished_product', 'packaging', 'spare_part', 'chemical'
  subcategory TEXT,
  unit TEXT NOT NULL,             -- 'kg', 'ton', 'liter', 'drum', 'bag', 'unit'
  unit_weight DECIMAL(10,3),      -- weight per unit in kg
  cas_number TEXT,                -- Chemical CAS number
  hsn_code TEXT,                  -- Harmonized System Number (customs)
  description TEXT,
  technical_specs TEXT,
  hazard_class TEXT,              -- UN hazard classification
  storage_conditions TEXT,
  shelf_life_days INTEGER,
  minimum_stock DECIMAL(15,3) DEFAULT 0,
  reorder_point DECIMAL(15,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders (أوامر الشراء)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status order_status DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  actual_date DATE,
  currency currency NOT NULL DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  customs_fees DECIMAL(15,2) DEFAULT 0,
  freight_cost DECIMAL(15,2) DEFAULT 0,
  other_costs DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  total_amount_egp DECIMAL(15,2) DEFAULT 0,
  shipping_method TEXT,
  port_of_entry TEXT,
  bl_number TEXT,               -- Bill of Lading
  customs_declaration TEXT,
  incoterms TEXT,               -- FOB, CIF, EXW, etc.
  payment_terms TEXT,
  payment_method payment_method,
  lc_number TEXT,               -- Letter of Credit number
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Line Items
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  tax_type tax_type DEFAULT 'vat_14',
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  received_quantity DECIMAL(15,3) DEFAULT 0,
  notes TEXT
);

-- Purchase Invoices / Tax Invoices (فواتير شراء ضريبية)
CREATE TABLE purchase_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  supplier_invoice_number TEXT,
  po_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status DEFAULT 'draft',
  currency currency NOT NULL DEFAULT 'USD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_egp DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  payment_method payment_method,
  payment_date DATE,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  tax_type tax_type DEFAULT 'vat_14',
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL
);

-- ============================================================
-- WAREHOUSES & INVENTORY
-- ============================================================

-- Warehouses (مخازن)
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  type TEXT NOT NULL,           -- 'main', 'external_factory', 'finished_goods', 'transit'
  factory_type factory_type,
  address TEXT,
  city TEXT,
  contact_person TEXT,
  phone TEXT,
  capacity_tons DECIMAL(10,2),
  temperature_controlled BOOLEAN DEFAULT FALSE,
  hazmat_certified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouse Stock (مخزون)
CREATE TABLE warehouse_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) DEFAULT 0,
  reserved_quantity DECIMAL(15,3) DEFAULT 0,   -- reserved for production orders
  available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  avg_cost DECIMAL(15,4) DEFAULT 0,            -- weighted average cost (EGP)
  last_movement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, item_id)
);

-- Stock Movements (حركات المخزن)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type TEXT NOT NULL,               -- 'purchase', 'production', 'sales', 'transfer', 'adjustment'
  reference_id UUID,
  movement_type stock_movement_type NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4),
  total_cost DECIMAL(15,2),
  balance_after DECIMAL(15,3),
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION
-- ============================================================

-- Factories (مصانع)
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  type factory_type NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),   -- linked warehouse
  address TEXT,
  city TEXT,
  contact_person TEXT,
  phone TEXT,
  capacity_per_day DECIMAL(10,2),
  products_manufactured TEXT[],                   -- array of product types
  contract_start_date DATE,
  contract_end_date DATE,
  cost_per_ton DECIMAL(15,2),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials (تكوين المنتج)
CREATE TABLE bill_of_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finished_product_id UUID NOT NULL REFERENCES items(id),
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_id UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES items(id),
  quantity_per_unit DECIMAL(15,4) NOT NULL,       -- qty of raw material per 1 unit of finished product
  waste_pct DECIMAL(5,2) DEFAULT 0,
  notes TEXT
);

-- Production Orders (أوامر الإنتاج)
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  factory_id UUID NOT NULL REFERENCES factories(id),
  bom_id UUID NOT NULL REFERENCES bill_of_materials(id),
  finished_product_id UUID NOT NULL REFERENCES items(id),
  planned_quantity DECIMAL(15,3) NOT NULL,
  actual_quantity DECIMAL(15,3),
  status production_status DEFAULT 'planned',
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  unit_cost DECIMAL(15,4),
  total_cost DECIMAL(15,2),
  manufacturing_fee DECIMAL(15,2),               -- fee paid to external factory
  quality_approved BOOLEAN DEFAULT FALSE,
  quality_notes TEXT,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw materials consumed in production
CREATE TABLE production_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  planned_quantity DECIMAL(15,3) NOT NULL,
  actual_quantity DECIMAL(15,3),
  unit_cost DECIMAL(15,4),
  total_cost DECIMAL(15,2)
);

-- ============================================================
-- CUSTOMERS & SALES
-- ============================================================

-- Customers (شركات عملاء)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  industry TEXT,                  -- 'paint', 'textile', 'pharma', 'plastics', etc.
  country TEXT DEFAULT 'Egypt',
  city TEXT,
  address TEXT,
  tax_number TEXT NOT NULL,       -- الرقم الضريبي (mandatory in Egypt)
  commercial_register TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  currency currency DEFAULT 'EGP',
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit DECIMAL(15,2),
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Orders (أوامر البيع)
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status order_status DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  delivery_date DATE,
  warehouse_id UUID REFERENCES warehouses(id),    -- source warehouse (finished goods)
  currency currency DEFAULT 'EGP',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_fees DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  delivery_address TEXT,
  payment_terms TEXT,
  payment_method payment_method,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  tax_type tax_type DEFAULT 'vat_14',
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  delivered_quantity DECIMAL(15,3) DEFAULT 0,
  notes TEXT
);

-- Sales Invoices / Tax Invoices (فواتير بيع ضريبية)
CREATE TABLE sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES sales_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status invoice_status DEFAULT 'draft',
  currency currency DEFAULT 'EGP',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  payment_method payment_method,
  payment_date DATE,
  -- Egypt E-Invoice fields
  einvoice_uuid TEXT,
  einvoice_status TEXT,
  einvoice_submission_id TEXT,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  tax_type tax_type DEFAULT 'vat_14',
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL
);

-- Payments (مدفوعات)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type TEXT NOT NULL,   -- 'purchase_invoice', 'sales_invoice', 'expense'
  reference_id UUID NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  currency currency DEFAULT 'EGP',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  payment_method payment_method NOT NULL,
  bank_name TEXT,
  check_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HUMAN RESOURCES
-- ============================================================

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  manager_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  employee_number TEXT UNIQUE NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  job_title TEXT NOT NULL,
  job_title_ar TEXT,
  employment_type TEXT DEFAULT 'full_time',     -- 'full_time', 'part_time', 'contract', 'daily'
  hire_date DATE NOT NULL,
  termination_date DATE,
  base_salary DECIMAL(12,2) NOT NULL,
  housing_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  meal_allowance DECIMAL(12,2) DEFAULT 0,
  phone_allowance DECIMAL(12,2) DEFAULT 0,
  social_insurance_pct DECIMAL(5,2) DEFAULT 11,  -- employee share 11%
  employer_insurance_pct DECIMAL(5,2) DEFAULT 18.75, -- employer share
  bank_name TEXT,
  bank_account TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance (حضور وانصراف)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'present',
  late_minutes INTEGER DEFAULT 0,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Leave Requests (طلبات الإجازة)
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count DECIMAL(4,1) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',    -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll (كشف المرتبات)
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,   -- 1-12
  working_days INTEGER NOT NULL,
  actual_days INTEGER NOT NULL,
  absent_days INTEGER DEFAULT 0,
  late_deduction DECIMAL(12,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  overtime_amount DECIMAL(12,2) DEFAULT 0,
  base_salary DECIMAL(12,2) NOT NULL,
  housing_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  meal_allowance DECIMAL(12,2) DEFAULT 0,
  phone_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) NOT NULL,
  social_insurance_deduction DECIMAL(12,2) DEFAULT 0,
  income_tax DECIMAL(12,2) DEFAULT 0,
  advance_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  payment_date DATE,
  payment_method payment_method,
  is_paid BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period_year, period_month)
);

-- Salary Advances (سلف)
CREATE TABLE salary_advances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  amount DECIMAL(12,2) NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  installments INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',   -- 'pending', 'approved', 'rejected', 'paid'
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES (مصاريف)
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE NOT NULL,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency currency DEFAULT 'EGP',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  amount_egp DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  vendor_name TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost_center TEXT,               -- department or project
  receipt_url TEXT,
  payment_method payment_method,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT,           -- 'monthly', 'quarterly', 'annual'
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM / AUDIT
-- ============================================================

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,           -- 'create', 'update', 'delete', 'approve', 'login'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequences for readable numbers
CREATE SEQUENCE po_number_seq START 1000;
CREATE SEQUENCE sales_order_seq START 1000;
CREATE SEQUENCE pi_number_seq START 1000;
CREATE SEQUENCE si_number_seq START 1000;
CREATE SEQUENCE prod_order_seq START 1000;
CREATE SEQUENCE expense_seq START 1000;
