-- ===================================
-- تحديث تلقائي لحزمة POS
-- ===================================
-- هذا السكريبت يجد ويحدث حزمة POS تلقائياً
-- ===================================

-- ===================================
-- الخطوة 1: البحث عن حزمة POS في المنتجات
-- ===================================

SELECT 
    '🔍 البحث عن حزمة POS' as step,
    id as product_id,
    name as product_name,
    sku,
    product_type,
    components
FROM products
WHERE (
    name ILIKE '%نقطة بيع%' 
    OR name ILIKE '%POS%'
    OR name ILIKE '%point of sale%'
)
AND product_type = 'bundle';

-- ===================================
-- الخطوة 2: عرض مكونات الحزمة
-- ===================================

-- إذا وجدت الحزمة في الخطوة 1، استبدل 'BUNDLE_ID_HERE' بمعرفها
SELECT 
    '📦 مكونات الحزمة' as step,
    p.name as component_name,
    p.sku as component_sku,
    comp.quantity
FROM products bundle
CROSS JOIN LATERAL jsonb_to_recordset(bundle.components) AS comp(productId text, quantity int)
JOIN products p ON p.id = comp.productId
WHERE bundle.id = 'BUNDLE_ID_HERE';  -- ⚠️ استبدل بمعرف الحزمة من الخطوة 1

-- ===================================
-- الخطوة 3: البحث عن القطع المستلمة من هذه الحزمة
-- ===================================

-- البحث عن القطع التي تطابق مكونات الحزمة
-- واستلمت معاً (نفس التاريخ، نفس المورد، نفس العميل)

WITH bundle_components AS (
    -- احصل على مكونات الحزمة
    SELECT 
        comp.productId,
        comp.quantity
    FROM products bundle
    CROSS JOIN LATERAL jsonb_to_recordset(bundle.components) AS comp(productId text, quantity int)
    WHERE bundle.id = 'BUNDLE_ID_HERE'  -- ⚠️ استبدل بمعرف الحزمة
),
potential_bundles AS (
    -- ابحث عن مجموعات القطع المحتملة
    SELECT 
        purchase_date::date as bundle_date,
        supplier_id,
        destination_client_id,
        COUNT(DISTINCT product_id) as unique_products,
        COUNT(*) as total_items,
        STRING_AGG(DISTINCT serial_number, ', ' ORDER BY serial_number) as serial_numbers,
        SUM(cost_price) as total_cost
    FROM inventory_items
    WHERE product_id IN (SELECT productId FROM bundle_components)
    AND bundle_group_id IS NULL  -- فقط القطع التي ليست في حزمة
    AND purchase_date >= '2024-01-01'  -- عدّل التاريخ حسب الحاجة
    GROUP BY 
        purchase_date::date,
        supplier_id,
        destination_client_id
    HAVING COUNT(*) >= (SELECT SUM(quantity) FROM bundle_components)  -- على الأقل عدد مكونات الحزمة
)
SELECT 
    '🎯 الحزم المحتملة' as step,
    bundle_date as "التاريخ",
    supplier_id as "المورد",
    destination_client_id as "العميل",
    unique_products as "عدد المنتجات المختلفة",
    total_items as "إجمالي القطع",
    total_cost as "التكلفة الإجمالية",
    serial_numbers as "الأرقام التسلسلية"
FROM potential_bundles
ORDER BY bundle_date DESC;

-- ===================================
-- الخطوة 4: عرض تفاصيل القطع لكل مجموعة محتملة
-- ===================================

-- بعد تحديد التاريخ من الخطوة 3، استبدل التاريخ هنا
SELECT 
    '📋 تفاصيل القطع' as step,
    i.serial_number as "بار كود",
    p.name as "المنتج",
    i.cost_price as "التكلفة",
    TO_CHAR(i.purchase_date, 'YYYY-MM-DD HH24:MI') as "التاريخ والوقت"
FROM inventory_items i
JOIN products p ON p.id = i.product_id
WHERE i.purchase_date::date = '2024-11-20'  -- ⚠️ استبدل بالتاريخ من الخطوة 3
AND i.supplier_id = 'supplier_id_here'      -- ⚠️ استبدل بمعرف المورد
AND i.destination_client_id = 'client_id_here'  -- ⚠️ استبدل بمعرف العميل
AND i.bundle_group_id IS NULL
ORDER BY i.purchase_date, p.name;

-- ===================================
-- الخطوة 5: التحديث التلقائي
-- ===================================

-- بعد التحقق من الخطوات السابقة، قم بالتحديث:

UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_' || TO_CHAR(purchase_date, 'YYYYMMDD'),
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-20'  -- ⚠️ استبدل بالتاريخ الصحيح
AND supplier_id = 'supplier_id_here'      -- ⚠️ استبدل بمعرف المورد
AND destination_client_id = 'client_id_here'  -- ⚠️ استبدل بمعرف العميل
AND bundle_group_id IS NULL;

-- ===================================
-- الخطوة 6: التحقق من النتيجة
-- ===================================

SELECT 
    '✅ النتيجة' as step,
    bundle_group_id as "معرف الحزمة",
    bundle_name as "اسم الحزمة",
    COUNT(*) as "عدد القطع",
    SUM(cost_price) as "التكلفة الإجمالية",
    STRING_AGG(serial_number, ', ' ORDER BY serial_number) as "الأرقام التسلسلية",
    TO_CHAR(MIN(purchase_date), 'YYYY-MM-DD') as "تاريخ الاستلام"
FROM inventory_items
WHERE bundle_name = 'نقطة بيع كاملة POS'
GROUP BY bundle_group_id, bundle_name;

-- ===================================
-- 🎯 سكريبت مبسط (إذا كنت تعرف التفاصيل)
-- ===================================

/*
إذا كنت تعرف:
- تاريخ استلام الحزمة
- المورد
- العميل

استخدم هذا مباشرة:
*/

-- عرض القطع أولاً للتحقق
SELECT 
    serial_number,
    cost_price,
    TO_CHAR(purchase_date, 'YYYY-MM-DD HH24:MI') as date_time
FROM inventory_items
WHERE purchase_date::date = '2024-11-20'  -- ⚠️ عدّل التاريخ
AND bundle_group_id IS NULL
ORDER BY purchase_date;

-- إذا كانت النتيجة صحيحة، قم بالتحديث:
UPDATE inventory_items
SET 
    bundle_group_id = 'bundle_pos_001',
    bundle_name = 'نقطة بيع كاملة POS'
WHERE purchase_date::date = '2024-11-20'  -- ⚠️ عدّل التاريخ
AND bundle_group_id IS NULL;

-- التحقق
SELECT 
    bundle_group_id,
    COUNT(*) as items,
    SUM(cost_price) as total,
    STRING_AGG(serial_number, ', ') as serials
FROM inventory_items
WHERE bundle_group_id = 'bundle_pos_001'
GROUP BY bundle_group_id;

-- ===================================
-- 📋 ملاحظات
-- ===================================

/*
✅ هذا السكريبت يساعدك في:
1. العثور على حزمة POS في المنتجات
2. معرفة مكوناتها
3. البحث عن القطع المستلمة
4. تحديثها تلقائياً

⚠️ تذكر:
1. استبدل 'BUNDLE_ID_HERE' بمعرف الحزمة الحقيقي
2. استبدل التواريخ والمعرفات بالقيم الصحيحة
3. تحقق من النتائج قبل التحديث النهائي
4. يمكنك التراجع بسهولة إذا حدث خطأ
*/
