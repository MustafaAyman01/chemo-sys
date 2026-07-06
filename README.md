# ChemCo ERP — Phase 1

نظام ERP متكامل لشركة كيماويات — استيراد خامات، تصنيع، بيع للشركات.

---

## 🗂 هيكل المشروع

```
chemco-erp/
├── sql/
│   ├── 01_schema.sql          ← كل جداول الداتا بيز
│   ├── 02_rls_policies.sql    ← الأمان والصلاحيات
│   └── 03_seed_data.sql       ← بيانات أولية
│
├── src/
│   ├── lib/
│   │   └── supabase.js        ← Supabase client
│   ├── store/
│   │   └── authStore.js       ← Zustand auth state
│   ├── components/
│   │   └── layout/
│   │       └── AppLayout.jsx  ← Sidebar + Header
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   └── DashboardPage.jsx
│   ├── App.jsx                ← Router + Auth Guards
│   ├── main.jsx               ← Entry point
│   └── index.css              ← Design system
│
├── .env.example               ← نموذج المتغيرات
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 🚀 خطوات التشغيل

### 1. إعداد Supabase

1. روح [supabase.com](https://supabase.com) وعمل Project جديد
2. من **SQL Editor**، شغّل الملفات بالترتيب:
   ```
   sql/01_schema.sql       ← أول
   sql/02_rls_policies.sql ← تاني
   sql/03_seed_data.sql    ← تالت
   ```
3. من **Authentication → Users**، عمل أول يوزر
4. من **SQL Editor** حدّث الـ role:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE id = 'your-user-id';
   ```

### 2. إعداد المشروع

```bash
# نسخ المشروع
cd chemco-erp

# نسخ متغيرات البيئة
cp .env.example .env

# تعبئة .env بـ Supabase URL وANON KEY من Project Settings → API

# تثبيت الحزم
npm install

# تشغيل في وضع التطوير
npm run dev
```

### 3. فتح التطبيق

```
http://localhost:3000
```

---

## 🔐 نظام الصلاحيات

| الدور | الوصول |
|-------|--------|
| `super_admin` | كل شيء |
| `admin` | كل شيء |
| `finance_manager` | مالية + تقارير + موافقات |
| `warehouse_manager` | مخازن + مشتريات |
| `production_manager` | إنتاج + مخازن (قراءة) |
| `sales_manager` | مبيعات + تقارير |
| `hr_manager` | HR + مرتبات |
| `accountant` | مالية + فواتير |
| `viewer` | قراءة فقط |

---

## ⚠️ تحديث مطلوب: تفعيل الصلاحيات حسب الدور (RBAC)

عشان كل موظف يشوف بس الصفحات اللي مسموح له بيها حسب دوره (مش كل الموظفين يشوفوا كل حاجة)، لازم تشغّل الـ SQL ده **مرة واحدة بس** في Supabase ← SQL Editor:

```
sql/04_migration_role_permissions_rls.sql
```

بدون الخطوة دي، النظام هيمنع غير الـ admins من رؤية أي صفحة أصلاً (لأن صلاحيات الأدوار مش هتقدر تتقرأ من القاعدة).

---

## 🔐 تفعيل إنشاء المستخدمين من الواجهة (Edge Function)

عشان تقدر تضيف مستخدمين جدد مباشرة من صفحة "إدارة المستخدمين" (بدل ما تروح Supabase يدوياً)، لازم تنشر (deploy) الـ Edge Function:

### 1. تثبيت Supabase CLI (لو مش مثبت)
```bash
npm install -g supabase
```

### 2. تسجيل الدخول وربط المشروع
```bash
supabase login
supabase link --project-ref your-project-id
```
(الـ project-id موجود في رابط مشروعك على Supabase، أو في Settings → General)

### 3. نشر الـ function
```bash
supabase functions deploy create-user
```

### 4. التأكد من الصلاحيات
الـ function بتستخدم `SUPABASE_SERVICE_ROLE_KEY` تلقائياً (متاحة كـ environment variable داخلياً في كل Edge Functions على Supabase، مفيش حاجة تعملها يدوياً).

بعد النشر، زرار "إضافة مستخدم" في صفحة إدارة المستخدمين هيشتغل فوراً — وبيتأكد إن الشخص اللي بيستخدمه admin أو super_admin قبل ما ينشئ أي حساب.

---



| Phase | المحتوى | الحالة |
|-------|---------|--------|
| **Phase 1** | Schema + Auth + Layout + Dashboard | ✅ مكتمل |
| Phase 2 | الموردين + المشتريات + فواتير الشراء | 🔜 |
| Phase 3 | المخازن + حركات المخزون | 🔜 |
| Phase 4 | الإنتاج + المصانع + BOM | 🔜 |
| Phase 5 | العملاء + المبيعات + فواتير البيع | 🔜 |
| Phase 6 | المالية + المصاريف | 🔜 |
| Phase 7 | HR + حضور + مرتبات | 🔜 |
| Phase 8 | التقارير + CSV Export | 🔜 |

---

## 🛠 Stack التقني

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **State:** Zustand + React Query
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack Table
- **Icons:** Lucide React
