-- ============================================================
-- ChemCo ERP - Seed Data
-- Phase 1: Default Permissions + Sample Data
-- ============================================================

-- ============================================================
-- DEFAULT ROLE PERMISSIONS
-- ============================================================

INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_export) VALUES

-- Super Admin (everything - handled in function, but explicit here)
('super_admin', 'suppliers',   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'warehouse',   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'production',  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'sales',       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'finance',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'hr',          TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('super_admin', 'reports',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),

-- Admin
('admin', 'suppliers',   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'warehouse',   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'production',  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'sales',       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'finance',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'hr',          TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('admin', 'reports',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),

-- Finance Manager
('finance_manager', 'suppliers',   TRUE,  FALSE, FALSE, FALSE, TRUE,  TRUE),
('finance_manager', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('finance_manager', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('finance_manager', 'sales',       TRUE,  FALSE, TRUE,  FALSE, TRUE,  TRUE),
('finance_manager', 'finance',     TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('finance_manager', 'hr',          TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('finance_manager', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- Warehouse Manager
('warehouse_manager', 'suppliers',   TRUE,  TRUE,  TRUE,  FALSE, FALSE, TRUE),
('warehouse_manager', 'warehouse',   TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('warehouse_manager', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_manager', 'sales',       TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_manager', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_manager', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_manager', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- Production Manager
('production_manager', 'suppliers',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'production',  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('production_manager', 'sales',       TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_manager', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- Sales Manager
('sales_manager', 'suppliers',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_manager', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_manager', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_manager', 'sales',       TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('sales_manager', 'finance',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('sales_manager', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_manager', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- HR Manager
('hr_manager', 'suppliers',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_manager', 'warehouse',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_manager', 'production',  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_manager', 'sales',       FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_manager', 'finance',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('hr_manager', 'hr',          TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE),
('hr_manager', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- Accountant
('accountant', 'suppliers',   TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('accountant', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('accountant', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('accountant', 'sales',       TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),
('accountant', 'finance',     TRUE,  TRUE,  TRUE,  FALSE, FALSE, TRUE),
('accountant', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('accountant', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE),

-- Warehouse Staff
('warehouse_staff', 'suppliers',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_staff', 'warehouse',   TRUE,  TRUE,  TRUE,  FALSE, FALSE, FALSE),
('warehouse_staff', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_staff', 'sales',       FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_staff', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_staff', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('warehouse_staff', 'reports',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),

-- Production Staff
('production_staff', 'suppliers',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff', 'production',  TRUE,  TRUE,  TRUE,  FALSE, FALSE, FALSE),
('production_staff', 'sales',       FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('production_staff', 'reports',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),

-- Sales Rep
('sales_rep', 'suppliers',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep', 'production',  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep', 'sales',       TRUE,  TRUE,  TRUE,  FALSE, FALSE, FALSE),
('sales_rep', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('sales_rep', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),

-- HR Staff
('hr_staff', 'suppliers',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff', 'warehouse',   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff', 'production',  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff', 'sales',       FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('hr_staff', 'hr',          TRUE,  TRUE,  TRUE,  FALSE, FALSE, FALSE),
('hr_staff', 'reports',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),

-- Viewer
('viewer', 'suppliers',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'warehouse',   TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'production',  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'sales',       TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'finance',     FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'hr',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
('viewer', 'reports',     TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE);

-- ============================================================
-- SAMPLE WAREHOUSES
-- ============================================================

INSERT INTO warehouses (code, name, name_ar, type, factory_type, city, capacity_tons, hazmat_certified) VALUES
('WH-MAIN', 'Main Raw Materials Warehouse', 'المخزن الرئيسي للخامات', 'main', 'owned', 'Cairo', 5000, TRUE),
('WH-FG', 'Finished Goods Warehouse', 'مخزن المنتجات النهائية', 'finished_goods', 'owned', 'Cairo', 3000, TRUE),
('WH-EXT-1', 'External Factory 1 - 10th of Ramadan', 'مصنع خارجي 1 - العاشر من رمضان', 'external_factory', 'external', '10th of Ramadan City', 1000, FALSE),
('WH-EXT-2', 'External Factory 2 - Borg El Arab', 'مصنع خارجي 2 - برج العرب', 'external_factory', 'external', 'Alexandria', 800, FALSE);

-- ============================================================
-- SAMPLE DEPARTMENTS
-- ============================================================

INSERT INTO departments (code, name, name_ar) VALUES
('MGMT',  'Management',           'الإدارة'),
('FIN',   'Finance & Accounting', 'المالية والمحاسبة'),
('PROC',  'Procurement',          'المشتريات'),
('WH',    'Warehouse',            'المخازن'),
('PROD',  'Production',           'الإنتاج'),
('SALES', 'Sales',                'المبيعات'),
('QC',    'Quality Control',      'مراقبة الجودة'),
('HR',    'Human Resources',      'الموارد البشرية'),
('IT',    'Information Technology','تكنولوجيا المعلومات'),
('LOG',   'Logistics',            'اللوجستيات');

-- ============================================================
-- SAMPLE ITEMS (Chemical Raw Materials & Products)
-- ============================================================

INSERT INTO items (code, name, name_ar, category, unit, cas_number, hsn_code, hazard_class, minimum_stock, reorder_point) VALUES
-- Raw Materials
('RM-001', 'Titanium Dioxide',        'ثاني أكسيد التيتانيوم',    'raw_material', 'ton',  '13463-67-7', '3206.11', 'UN3077', 50,  100),
('RM-002', 'Calcium Carbonate',       'كربونات الكالسيوم',         'raw_material', 'ton',  '471-34-1',  '2836.50', NULL,     100, 200),
('RM-003', 'Acrylic Resin',           'راتنج أكريليك',             'raw_material', 'ton',  '9003-01-4', '3906.90', 'UN1866', 20,  50),
('RM-004', 'Epoxy Resin',             'راتنج إيبوكسي',             'raw_material', 'ton',  '25036-25-3','3907.30', 'UN3082', 15,  30),
('RM-005', 'Zinc Oxide',              'أكسيد الزنك',               'raw_material', 'ton',  '1314-13-2', '2817.00', NULL,     30,  60),
('RM-006', 'Kaolin Clay',             'كاولين',                    'raw_material', 'ton',  '1332-58-7', '2507.10', NULL,     80,  150),
('RM-007', 'Sodium Hydroxide 48%',    'صودا كاوية 48%',            'raw_material', 'ton',  '1310-73-2', '2815.11', 'UN1824', 10,  25),
('RM-008', 'Hydrochloric Acid 33%',   'حمض الهيدروكلوريك 33%',    'raw_material', 'ton',  '7647-01-0', '2806.10', 'UN1789', 5,   15),
('RM-009', 'Propylene Glycol',        'بروبيلين جلايكول',          'raw_material', 'ton',  '57-55-6',   '2905.32', 'UN3082', 10,  20),
('RM-010', 'Dispersing Agent',        'عامل تشتيت',                'raw_material', 'ton',  NULL,        '3824.99', NULL,     5,   10),

-- Finished Products
('FP-001', 'Interior Wall Paint W1',  'دهان جدران داخلي W1',       'finished_product', 'ton', NULL, '3209.10', NULL, 20, 40),
('FP-002', 'Exterior Wall Paint E1',  'دهان جدران خارجي E1',       'finished_product', 'ton', NULL, '3209.10', NULL, 15, 30),
('FP-003', 'Epoxy Floor Coating F1',  'طلاء إيبوكسي أرضيات F1',   'finished_product', 'ton', NULL, '3210.00', NULL, 10, 20),
('FP-004', 'Anti-Corrosion Primer P1','بروهايمر مضاد للصدأ P1',    'finished_product', 'ton', NULL, '3210.00', NULL, 8,  15),
('FP-005', 'Waterproofing Solution W2','محلول عازل للمياه W2',      'finished_product', 'ton', NULL, '3824.99', NULL, 10, 20),

-- Packaging
('PKG-001', 'Steel Drum 200L',        'برميل صاج 200 لتر',         'packaging', 'unit', NULL, '7310.10', NULL, 500, 1000),
('PKG-002', 'Plastic Drum 60L',       'جركن بلاستيك 60 لتر',       'packaging', 'unit', NULL, '3923.10', NULL, 300, 600),
('PKG-003', 'PP Bag 25kg',            'شيكارة بولي بروبيلين 25 كج','packaging', 'unit', NULL, '6305.33', NULL, 1000, 2000);

-- ============================================================
-- SAMPLE SUPPLIERS
-- ============================================================

INSERT INTO suppliers (code, name, name_ar, country, city, contact_person, email, phone, currency, payment_terms_days) VALUES
('SUP-001', 'KRONOS Worldwide Inc.',        'كرونوس للتيتانيوم',         'Germany',     'Leverkusen',  'Hans Mueller',    'h.mueller@kronos.com',      '+49-214-888-0',     'USD', 90),
('SUP-002', 'OMYA AG',                      'أوميا للكربونات',           'Switzerland', 'Oftringen',   'Pierre Dubois',   'p.dubois@omya.com',         '+41-62-789-2929',   'USD', 60),
('SUP-003', 'Dow Chemical Egypt',           'داو كيميكال مصر',           'Egypt',       'Cairo',       'Ahmed Hassan',    'a.hassan@dow.com',          '+20-2-2480-5000',   'EGP', 30),
('SUP-004', 'Huntsman Corporation',         'هانتسمان للكيماويات',       'USA',         'The Woodlands','John Smith',      'j.smith@huntsman.com',      '+1-281-719-6000',   'USD', 90),
('SUP-005', 'Egyptian Chemical Industries', 'الصناعات الكيماوية المصرية','Egypt',       'Alexandria',  'Mohamed Samir',   'm.samir@eci.com.eg',        '+20-3-480-1234',    'EGP', 45),
('SUP-006', 'BASF SE',                      'باسف للكيماويات',           'Germany',     'Ludwigshafen','Klaus Weber',     'k.weber@basf.com',          '+49-621-60-0',      'EUR', 60),
('SUP-007', 'Chemicals Trading Co.',        'شركة تجارة الكيماويات',     'Egypt',       'Cairo',       'Tarek Ibrahim',   't.ibrahim@chemtrade.com.eg','+20-2-2260-5555',   'EGP', 30);

-- ============================================================
-- SAMPLE CUSTOMERS
-- ============================================================

INSERT INTO customers (code, name, name_ar, industry, country, city, tax_number, contact_person, email, phone, credit_limit) VALUES
('CUS-001', 'Hassan Allam Construction',    'شركة حسن علام للإنشاءات',    'construction', 'Egypt', 'Cairo',      '200-123-456',  'Eng. Karim Allam',   'k.allam@hassanallam.com',    '+20-2-2263-0000',  5000000),
('CUS-002', 'Orascom Construction',         'أوراسكوم للإنشاء',           'construction', 'Egypt', 'Cairo',      '200-654-321',  'Ahmed Mansour',      'a.mansour@orascom.com',      '+20-2-2417-0000',  8000000),
('CUS-003', 'Ceramica Cleopatra',           'سيراميكا كليوباترا',         'ceramics',     'Egypt', 'Cairo',      '201-111-222',  'Mohamed Fathy',      'm.fathy@cleopatra.com.eg',   '+20-2-2674-4444',  3000000),
('CUS-004', 'El Sewedy Electric',           'السويدي إليكتريك',           'electrical',   'Egypt', 'Cairo',      '201-333-444',  'Sherif Sewedy',      's.sewedy@elsewedy.com',      '+20-2-2622-0000',  2000000),
('CUS-005', 'Arab Contractors',             'المقاولون العرب',            'construction', 'Egypt', 'Cairo',      '200-777-888',  'Eng. Tarek Nasser',  't.nasser@arabcont.com.eg',   '+20-2-2263-1111',  6000000),
('CUS-006', 'Medco Pharma',                 'ميدكو للأدوية',              'pharmaceutical','Egypt','Alexandria',  '202-999-000',  'Dr. Sameh Wahba',    's.wahba@medcopharma.com.eg', '+20-3-485-1234',   1500000),
('CUS-007', 'Delta for Textiles',           'دلتا للنسيج',                'textile',      'Egypt', 'Mahalla',    '203-222-333',  'Ibrahim Helmy',      'i.helmy@deltatextile.com',   '+20-40-330-1234',  2500000);

-- ============================================================
-- SAMPLE FACTORIES
-- ============================================================

INSERT INTO factories (code, name, name_ar, type, city, contact_person, phone, capacity_per_day, cost_per_ton) VALUES
('FAC-MAIN', 'ChemCo Main Factory',          'مصنع كيمكو الرئيسي',           'owned',    'Cairo',                  'Eng. Mahmoud Nabil',   '+20-2-2680-1111', 50,  NULL),
('FAC-EXT-1','10th Ramadan Chemical Plant',  'مصنع العاشر من رمضان الكيماوي','external', '10th of Ramadan City',   'Eng. Sayed Morsy',     '+20-15-361-2345', 30,  850),
('FAC-EXT-2','Borg El Arab Industrial Plant','مصنع برج العرب الصناعي',        'external', 'Alexandria',             'Eng. Alaa Fouad',      '+20-3-459-8888',  20,  900);
