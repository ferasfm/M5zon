-- ===================================
-- تحديث حزم POS حسب التاريخ والمورد
-- ===================================

-- ===================================
-- الخطوة 1: عرض القطع حسب التاريخ
-- ===================================

SELECT 
    TO_CHAR(purchase_date, 'YYYY-MM-DD') as "التاريخ",
    supplier_id as "المورد",
    destination_client_id as "العميل",
    COUNT(*) as "عدد القطع",
    SUM(cost_price) as "التكلفة الإجمالية",
    STRING_AGG(serial_number, ', ' ORDER BY serial_number) as "الأرقام التسلسلية"
FROM inventory_items
WHERE purchase_date >= '2024-01-01'  -- عدّل التاريخ
AND bundle_group_id IS NULL
GROUP BY 
    TO_CHAR(purchase_date, 'YYYY-MM-DD'),
    supplier_id,
    destination_client_id
HAVING COUNT(*) >= 3  -- فقط المجموعات التي فيها 3 قطع أو أكثر
ORDER BY purchase_date DESC;

-- ===================================
-- الخطوة 2: تحديث حسب التاريخ
-- ===================================

-- مثال: حزمة استلمت في 2024-11-20
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_20241120',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-20'  -- ⚠️ استبدل بالتاريخ الصحيح
AND supplier_id = 'supplier_id_here'      -- ⚠️ استبدل بمعرف المورد
AND destination_client_id = 'client_id_here'  -- ⚠️ استبدل بمعرف العميل
AND bundle_group_id IS NULL;

-- ===================================
-- الخطوة 3: التحقق
-- ===================================

SELECT 
    bundle_group_id,
    COUNT(*) as items,
    SUM(cost_price) as total,
    STRING_AGG(serial_number, ', ') as serials
FROM inventory_items
WHERE bundle_group_id = 'bundle_pos_20241120'
GROUP BY bundle_group_id;

-- ===================================
-- الخطوة 4: تحديث حزم إضافية
-- ===================================

-- حزمة 2024-11-15
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_20241115',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-15'
AND supplier_id = 'supplier_id_here'
AND destination_client_id = 'client_id_here'
AND bundle_group_id IS NULL;

-- حزمة 2024-11-10
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_20241110',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-10'
AND supplier_id = 'supplier_id_here'
AND destination_client_id = 'client_id_here'
AND bundle_group_id IS NULL;

-- ===================================
-- الخطوة 5: عرض جميع الحزم
-- ===================================

SELECT 
    bundle_group_id as "معرف الحزمة",
    bundle_name as "اسم الحزمة",
    COUNT(*) as "عدد القطع",
    SUM(cost_price) as "التكلفة",
    TO_CHAR(MIN(purchase_date), 'YYYY-MM-DD') as "التاريخ"
FROM inventory_items
WHERE bundle_name = 'نقطة بيع كاملة POS'
GROUP BY bundle_group_id, bundle_name
ORDER BY MIN(purchase_date) DESC;
