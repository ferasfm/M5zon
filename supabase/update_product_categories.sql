-- ============================================
-- تحديث فئات المنتجات في PostgreSQL
-- ============================================
-- هذا السكريبت يقوم بتحديث حقل category النصي في جدول products
-- ليطابق اسم الفئة الحالي من جدول categories بناءً على category_id

-- 1. عرض المنتجات التي تحتاج تحديث (قبل التعديل)
SELECT 
  p.id,
  p.name as product_name,
  p.category as current_category_text,
  c.name as correct_category_name,
  CASE 
    WHEN p.category != c.name THEN '❌ يحتاج تحديث'
    ELSE '✅ صحيح'
  END as status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL
ORDER BY p.name;

-- 2. تحديث جميع المنتجات التي لها category_id
UPDATE products
SET 
  category = categories.name,
  updated_at = NOW()
FROM categories
WHERE products.category_id = categories.id
  AND products.category_id IS NOT NULL
  AND (products.category IS NULL OR products.category != categories.name);

-- 3. تحديث المنتجات التي ليس لها category_id إلى NULL
UPDATE products
SET 
  category = NULL,
  updated_at = NOW()
WHERE category_id IS NULL
  AND category IS NOT NULL;

-- 4. عرض النتائج بعد التحديث
SELECT 
  p.id,
  p.name as product_name,
  p.category as updated_category_text,
  c.name as category_name_from_table,
  p.category_id,
  CASE 
    WHEN p.category = c.name THEN '✅ متطابق'
    WHEN p.category_id IS NULL THEN 'ℹ️ بدون فئة'
    ELSE '⚠️ غير متطابق'
  END as status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.name;

-- 5. إحصائيات التحديث
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as products_with_category,
  COUNT(CASE WHEN category_id IS NULL THEN 1 END) as products_without_category
FROM products;
