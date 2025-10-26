-- إنشاء جدول إعدادات النظام
create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

-- إنشاء فهرس للبحث السريع حسب المفتاح
create index if not exists idx_settings_key on system_settings(key);

-- إعدادات أولية (اختياري)
-- insert into system_settings (key, value, description) values 
--   ('company_name', 'شركة المخزون الاحترافية', 'اسم الشركة'),
--   ('currency', 'ريال سعودي', 'العملة الافتراضية'),
--   ('tax_rate', '15', 'نسبة الضريبة (%)');
