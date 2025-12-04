-- ============================================
-- إصلاح فئات المنتجات القديمة
-- ============================================
-- هذا السكريبت يقوم بربط المنتجات القديمة التي لديها category نصي
-- ولكن بدون category_id بالفئات الموجودة في جدول categories

-- 1. عرض المنتجات التي تحتاج إصلاح (قبل التعديل)
SELECT 
  p.id,
  p.name as product_name,
  p.sku,
  p.category as old_category_text,
  p.category_id,
  c.name as matching_category
FROM products p
LEFT JOIN categories c ON LOWER(p.category) = LOWER(c.name)
WHERE p.category_id IS NULL 
  AND p.category IS NOT NULL
ORDER BY p.name;

-- 2. تحديث المنتجات - ربطها بالفئات المطابقة (مطابقة تامة)
UPDATE products p
SET 
  category_id = c.id,
  category = c.name,
  updated_at = NOW()
FROM categories c
WHERE LOWER(p.category) = LOWER(c.name)
  AND p.category_id IS NULL
  AND p.category IS NOT NULL;

-- 3. تحديث المنتجات - ربطها بالفئات المطابقة جزئياً (مثل Hardware → Hardware1)
UPDATE products p
SET 
  category_id = c.id,
  category = c.name,
  updated_at = NOW()
FROM categories c
WHERE (
    LOWER(c.name) LIKE '%' || LOWER(p.category) || '%'
    OR LOWER(p.category) LIKE '%' || LOWER(c.name) || '%'
  )
  AND p.category_id IS NULL
  AND p.category IS NOT NULL
  AND LENGTH(p.category) > 3; -- تجنب المطابقات القصيرة جداً

-- 4. عرض النتائج بعد التحديث
SELECT 
  p.id,
  p.name as product_name,
  p.sku,
  p.category as category_text,
  p.category_id,
  c.name as category_from_table,
  CASE 
    WHEN p.category_id IS NOT NULL AND p.category = c.name THEN '✅ تم الإصلاح'
    WHEN p.category_id IS NULL AND p.category IS NOT NULL THEN '❌ لم يتم الإصلاح'
    WHEN p.category_id IS NULL AND p.category IS NULL THEN 'ℹ️ بدون فئة'
    ELSE '⚠️ غير متطابق'
  END as status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.name;

-- 5. إحصائيات التحديث
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as products_with_category_id,
  COUNT(CASE WHEN category_id IS NULL AND category IS NOT NULL THEN 1 END) as old_products_not_fixed,
  COUNT(CASE WHEN category_id IS NULL AND category IS NULL THEN 1 END) as products_without_category
FROM products;

-- 6. عرض المنتجات التي لم يتم إصلاحها (إن وجدت)
SELECT 
  p.name as product_name,
  p.category as old_category_text,
  'لم يتم إيجاد فئة مطابقة' as reason
FROM products p
WHERE p.category_id IS NULL 
  AND p.category IS NOT NULL;
