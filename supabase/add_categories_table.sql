-- إضافة جدول الفئات (Categories)
-- تشغيل هذا الملف في Supabase SQL Editor

-- إنشاء جدول الفئات
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text default '#3B82F6',
  icon text default '📦',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- إضافة عمود category_id في جدول المنتجات
alter table products 
  add column if not exists category_id uuid references categories(id) on delete set null;

-- إنشاء فهرس لتحسين الأداء
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_categories_active on categories(is_active);

-- إضافة بعض الفئات الافتراضية
insert into categories (name, description, color, icon, display_order) values
  ('إلكترونيات', 'أجهزة إلكترونية ومعدات تقنية', '#3B82F6', '💻', 1),
  ('هواتف', 'هواتف ذكية وملحقاتها', '#8B5CF6', '📱', 2),
  ('أجهزة كمبيوتر', 'حواسيب محمولة ومكتبية', '#06B6D4', '🖥️', 3),
  ('طابعات', 'طابعات وماسحات ضوئية', '#F59E0B', '🖨️', 4),
  ('أحبار', 'أحبار وخراطيش طابعات', '#EC4899', '🎨', 5),
  ('ملحقات', 'ملحقات وإكسسوارات متنوعة', '#10B981', '🎧', 6),
  ('أخرى', 'منتجات متنوعة', '#6B7280', '📦', 7)
on conflict (name) do nothing;

-- تحديث المنتجات الموجودة لربطها بالفئات بناءً على النص القديم
update products p
set category_id = c.id
from categories c
where p.category = c.name and p.category_id is null;

-- End of add_categories_table.sql
