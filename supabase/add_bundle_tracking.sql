-- إضافة أعمدة لتتبع الحزم في جدول inventory_items
-- هذا التحديث يسمح بتجميع القطع التي تنتمي لنفس الحزمة

-- إضافة عمود bundle_group_id لتتبع الحزم
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS bundle_group_id TEXT;

-- إضافة عمود bundle_name لحفظ اسم الحزمة
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS bundle_name TEXT;

-- إضافة فهرس لتحسين الأداء عند البحث بالحزم
CREATE INDEX IF NOT EXISTS idx_inventory_items_bundle_group 
ON inventory_items(bundle_group_id) 
WHERE bundle_group_id IS NOT NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN inventory_items.bundle_group_id IS 'معرف فريد يربط القطع التي تنتمي لنفس الحزمة';
COMMENT ON COLUMN inventory_items.bundle_name IS 'اسم الحزمة إذا كانت القطعة جزء من حزمة';
