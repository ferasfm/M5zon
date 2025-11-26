-- ===================================
-- 🤖 تحديث ذكي لحزمة POS
-- ===================================
-- نسخ والصق هذا الكود كاملاً في Supabase SQL Editor
-- ===================================

-- ===================================
-- 🔍 الخطوة 1: ابحث عن حزمة POS
-- ===================================

DO $$
DECLARE
    bundle_id TEXT;
    bundle_name_var TEXT;
BEGIN
    -- البحث عن حزمة POS
    SELECT id, name INTO bundle_id, bundle_name_var
    FROM products
    WHERE (
        name ILIKE '%نقطة بيع%' 
        OR name ILIKE '%POS%'
        OR name ILIKE '%point of sale%'
    )
    AND product_type = 'bundle'
    LIMIT 1;
    
    IF bundle_id IS NOT NULL THEN
        RAISE NOTICE '✅ وجدت الحزمة: % (ID: %)', bundle_name_var, bundle_id;
    ELSE
        RAISE NOTICE '❌ لم أجد حزمة POS في المنتجات';
    END IF;
END $$;

-- ===================================
-- 📊 الخطوة 2: عرض جميع القطع غير المجمعة
-- ===================================

SELECT 
    '📋 القطع المتاحة للتجميع' as "الخطوة",
    TO_CHAR(purchase_date, 'YYYY-MM-DD') as "التاريخ",
    COUNT(*) as "عدد القطع",
    SUM(cost_price) as "التكلفة الإجمالية",
    STRING_AGG(DISTINCT serial_number, ', ' ORDER BY serial_number) as "الأرقام التسلسلية (عينة)"
FROM inventory_items
WHERE bundle_group_id IS NULL
AND purchase_date >= CURRENT_DATE - INTERVAL '6 months'  -- آخر 6 أشهر
GROUP BY TO_CHAR(purchase_date, 'YYYY-MM-DD')
HAVING COUNT(*) >= 3  -- على الأقل 3 قطع
ORDER BY purchase_date DESC
LIMIT 10;

-- ===================================
-- 🎯 الخطوة 3: عرض تفاصيل أحدث مجموعة
-- ===================================

WITH latest_group AS (
    SELECT 
        purchase_date::date as group_date,
        supplier_id,
        destination_client_id
    FROM inventory_items
    WHERE bundle_group_id IS NULL
    AND purchase_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 
        purchase_date::date,
        supplier_id,
        destination_client_id
    HAVING COUNT(*) >= 3
    ORDER BY purchase_date::date DESC
    LIMIT 1
)
SELECT 
    '🔍 تفاصيل أحدث مجموعة' as "الخطوة",
    i.serial_number as "بار كود",
    p.name as "المنتج",
    i.cost_price as "التكلفة",
    TO_CHAR(i.purchase_date, 'YYYY-MM-DD HH24:MI:SS') as "التاريخ والوقت"
FROM inventory_items i
JOIN products p ON p.id = i.product_id
JOIN latest_group lg ON 
    i.purchase_date::date = lg.group_date
    AND COALESCE(i.supplier_id, '') = COALESCE(lg.supplier_id, '')
    AND COALESCE(i.destination_client_id, '') = COALESCE(lg.destination_client_id, '')
WHERE i.bundle_group_id IS NULL
ORDER BY i.purchase_date, p.name;

-- ===================================
-- ✅ الخطوة 4: تحديث أحدث مجموعة كحزمة POS
-- ===================================

-- ⚠️ تحقق من النتائج أعلاه أولاً!
-- إذا كانت صحيحة، احذف التعليق من الكود التالي:

/*
WITH latest_group AS (
    SELECT 
        purchase_date::date as group_date,
        supplier_id,
        destination_client_id
    FROM inventory_items
    WHERE bundle_group_id IS NULL
    AND purchase_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 
        purchase_date::date,
        supplier_id,
        destination_client_id
    HAVING COUNT(*) >= 3
    ORDER BY purchase_date::date DESC
    LIMIT 1
)
UPDATE inventory_items i
SET 
    bundle_group_id = 'bundle_pos_' || TO_CHAR(lg.group_date, 'YYYYMMDD'),
    bundle_name = 'نقطة بيع كاملة POS'
FROM latest_group lg
WHERE i.purchase_date::date = lg.group_date
AND COALESCE(i.supplier_id, '') = COALESCE(lg.supplier_id, '')
AND COALESCE(i.destination_client_id, '') = COALESCE(lg.destination_client_id, '')
AND i.bundle_group_id IS NULL;
*/

-- ===================================
-- 🔍 الخطوة 5: التحقق من النتيجة
-- ===================================

SELECT 
    '✅ الحزم المحدثة' as "الخطوة",
    bundle_group_id as "معرف الحزمة",
    bundle_name as "اسم الحزمة",
    COUNT(*) as "عدد القطع",
    SUM(cost_price) as "التكلفة الإجمالية",
    TO_CHAR(MIN(purchase_date), 'YYYY-MM-DD') as "تاريخ الاستلام",
    STRING_AGG(serial_number, ', ' ORDER BY serial_number) as "الأرقام التسلسلية"
FROM inventory_items
WHERE bundle_name = 'نقطة بيع كاملة POS'
GROUP BY bundle_group_id, bundle_name
ORDER BY MIN(purchase_date) DESC;

-- ===================================
-- 📋 تعليمات الاستخدام
-- ===================================

/*
🎯 كيفية الاستخدام:

1. شغّل الكود كاملاً (بدون تعديل)
2. راجع النتائج:
   - الخطوة 1: هل وجدت حزمة POS؟
   - الخطوة 2: ما هي المجموعات المتاحة؟
   - الخطوة 3: ما هي تفاصيل أحدث مجموعة؟

3. إذا كانت النتائج صحيحة:
   - احذف /* و */ من الخطوة 4
   - شغّل الكود مرة أخرى

4. تحقق من النتيجة في الخطوة 5

✅ مميزات هذا السكريبت:
- يبحث تلقائياً عن حزمة POS
- يعرض المجموعات المحتملة
- يحدث أحدث مجموعة
- آمن (يحتاج تأكيد يدوي)

⚠️ ملاحظات:
- يبحث في آخر 6 أشهر فقط
- يبحث عن مجموعات فيها 3 قطع أو أكثر
- يمكنك تعديل هذه القيم حسب الحاجة
*/

-- ===================================
-- 🔄 التراجع (إذا حدث خطأ)
-- ===================================

/*
-- إلغاء التحديث
UPDATE inventory_items
SET 
    bundle_group_id = NULL,
    bundle_name = NULL
WHERE bundle_name = 'نقطة بيع كاملة POS';
*/
