-- supabase/add_reasons_table.sql
-- إضافة جدول أسباب الشراء والصرف

-- جدول أسباب الشراء والصرف
create table if not exists transaction_reasons (
  id uuid primary key default gen_random_uuid(),
  reason_text text not null,
  reason_type text not null check (reason_type in ('purchase','dispatch','scrap','both')),
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- فهرس لتسريع البحث
create index if not exists idx_transaction_reasons_type on transaction_reasons(reason_type);
create index if not exists idx_transaction_reasons_active on transaction_reasons(is_active);

-- إدراج البيانات الافتراضية
insert into transaction_reasons (reason_text, reason_type, display_order) values
  ('احتياج جديد', 'both', 1),
  ('بدل تالف', 'both', 2),
  ('تجديد مخزون', 'both', 3),
  ('مكسور', 'both', 4),
  ('تلف بسبب سوء استخدام', 'scrap', 5),
  ('عطل غير قابل للإصلاح', 'scrap', 6),
  ('انتهاء العمر الافتراضي', 'scrap', 7),
  ('أسباب أخرى', 'scrap', 8)
on conflict do nothing;

-- End of add_reasons_table.sql
