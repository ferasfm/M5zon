-- التحقق من أنواع المنتجات في قاعدة البيانات
-- هذا السكريبت يعرض جميع المنتجات وأنواعها

-- 1. عرض جميع المنتجات مع أنواعها
SELECT 
  id,
  name,
  sku,
  product_type,
  CASE 
    WHEN product_type = 'standard' THEN '✅ منتج عادي'
    WHEN product_type = 'bundle' THEN '📦 حزمة'
    WHEN product_type IS NULL THEN '❌ غير محدد'
    ELSE '⚠️ نوع غير معروف: ' || product_type
  END as type_label,
  components
FROM products
ORDER BY product_type, name;

-- 2. إحصائيات الأنواع
SELECT 
  product_type,
  COUNT(*) as count
FROM products
GROUP BY product_type
ORDER BY count DESC;

-- 3. المنتجات التي ليس لها نوع محدد (يجب إصلاحها)
SELECT 
  id,
  name,
  sku,
  product_type
FROM products
WHERE product_type IS NULL OR product_type NOT IN ('standard', 'bundle');

-- 4. إصلاح المنتجات القديمة (إذا لزم الأمر)
-- قم بإلغاء التعليق عن هذا السطر لتشغيله:
-- UPDATE products SET product_type = 'standard' WHERE product_type IS NULL OR product_type = '';
