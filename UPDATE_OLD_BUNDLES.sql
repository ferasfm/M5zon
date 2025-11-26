-- ===================================
-- تحديث البيانات القديمة لحزمة POS
-- ===================================

-- ===================================
-- الطريقة 1: تحديث حسب الأرقام التسلسلية (الأدق)
-- ===================================
-- إذا كنت تعرف الأرقام التسلسلية (بار كود) للقطع

-- مثال: تحديث حزمة POS واحدة
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_001',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE serial_number IN (
    'SERIAL_001',  -- استبدل بالأرقام الحقيقية
    'SERIAL_002',
    'SERIAL_003',
    'SERIAL_004'
);

-- إذا كان لديك أكثر من حزمة POS:
-- حزمة POS الثانية
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_002',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE serial_number IN (
    'SERIAL_005',
    'SERIAL_006',
    'SERIAL_007',
    'SERIAL_008'
);

-- ===================================
-- الطريقة 2: تحديث حسب التاريخ والمورد (تلقائي)
-- ===================================
-- إذا كانت جميع قطع الحزمة استلمت في نفس اليوم من نفس المورد

-- أولاً: عرض القطع المحتملة للتحقق
SELECT 
    id,
    serial_number,
    cost_price,
    purchase_date,
    supplier_id,
    destination_client_id
FROM inventory_items
WHERE purchase_date::date = '2024-11-20'  -- استبدل بالتاريخ الصحيح
AND supplier_id = 'supplier_id_here'      -- استبدل بمعرف المورد
AND bundle_group_id IS NULL               -- فقط القطع التي ليست في حزمة
ORDER BY purchase_date;

-- بعد التحقق، قم بالتحديث:
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_' || TO_CHAR(purchase_date, 'YYYYMMDD') || '_001',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-20'  -- استبدل بالتاريخ الصحيح
AND supplier_id = 'supplier_id_here'      -- استبدل بمعرف المورد
AND bundle_group_id IS NULL;

-- ===================================
-- الطريقة 3: تحديث حسب المنتجات (متقدم)
-- ===================================
-- إذا كانت حزمة POS تحتوي على منتجات محددة

-- أولاً: عرض المنتجات في حزمة POS
SELECT 
    p.id,
    p.name,
    p.sku,
    pc.quantity
FROM products p
JOIN LATERAL jsonb_to_recordset(p.components) AS pc(productId text, quantity int)
ON true
WHERE p.name = 'نقطة بيع كاملة POS'
AND p.product_type = 'bundle';

-- ثم: تحديد القطع التي تطابق هذه المنتجات
-- (يحتاج تخصيص حسب بياناتك)

-- ===================================
-- الطريقة 4: تحديث يدوي بالـ IDs
-- ===================================
-- إذا كنت تعرف IDs القطع مباشرة

UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_001',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE id IN (
    'id_1',  -- استبدل بالـ IDs الحقيقية
    'id_2',
    'id_3',
    'id_4'
);

-- ===================================
-- التحقق من النتيجة
-- ===================================

-- عرض جميع حزم POS المحدثة
SELECT 
    bundle_group_id,
    bundle_name,
    COUNT(*) as items_count,
    SUM(cost_price) as total_cost,
    MIN(purchase_date) as purchase_date,
    STRING_AGG(serial_number, ', ') as serial_numbers
FROM inventory_items
WHERE bundle_name = 'نقطة بيع كاملة POS'
GROUP BY bundle_group_id, bundle_name
ORDER BY purchase_date DESC;

-- عرض تفاصيل كل قطعة في الحزم
SELECT 
    bundle_group_id,
    bundle_name,
    serial_number,
    cost_price,
    purchase_date,
    supplier_id,
    destination_client_id
FROM inventory_items
WHERE bundle_name = 'نقطة بيع كاملة POS'
ORDER BY bundle_group_id, purchase_date;

-- ===================================
-- التراجع عن التحديث (إذا حدث خطأ)
-- ===================================

-- إلغاء تحديث حزمة معينة
UPDATE inventory_items
SET 
    bundle_group_id = NULL,
    bundle_name = NULL
WHERE bundle_group_id = 'bundle_pos_001';

-- إلغاء جميع حزم POS
UPDATE inventory_items
SET 
    bundle_group_id = NULL,
    bundle_name = NULL
WHERE bundle_name = 'نقطة بيع كاملة POS';

-- ===================================
-- نصائح مهمة
-- ===================================

/*
1. ✅ اختبر على بيانات قليلة أولاً
2. ✅ تحقق من النتائج قبل تحديث الكل
3. ✅ احتفظ بنسخة احتياطية
4. ✅ استخدم الطريقة الأدق (الأرقام التسلسلية)
5. ✅ تأكد من أن bundle_group_id فريد لكل حزمة

معرف الحزمة يجب أن يكون:
- فريد لكل حزمة
- مثال: bundle_pos_001, bundle_pos_002, bundle_pos_003
- أو: bundle_pos_20241120_001, bundle_pos_20241120_002
*/
