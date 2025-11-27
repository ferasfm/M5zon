-- ملف اختبار نظام الفئات
-- استخدم هذا الملف للتحقق من أن كل شيء يعمل بشكل صحيح

-- 1. التحقق من وجود جدول الفئات
SELECT 'جدول الفئات موجود ✅' as status, COUNT(*) as total_categories 
FROM categories;

-- 2. عرض جميع الفئات
SELECT 
    name as "اسم الفئة",
    icon as "الأيقونة",
    color as "اللون",
    description as "الوصف",
    is_active as "نشط",
    display_order as "الترتيب"
FROM categories 
ORDER BY display_order;

-- 3. التحقق من عمود category_id في جدول المنتجات
SELECT 
    column_name as "اسم العمود",
    data_type as "نوع البيانات",
    is_nullable as "يقبل NULL"
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'category_id';

-- 4. عرض المنتجات مع فئاتها
SELECT 
    p.name as "اسم المنتج",
    p.sku as "الباركود",
    p.category as "الفئة القديمة",
    c.name as "الفئة الجديدة",
    c.icon as "الأيقونة",
    c.color as "اللون"
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY c.display_order, p.name;

-- 5. إحصائيات الفئات
SELECT 
    c.icon || ' ' || c.name as "الفئة",
    COUNT(p.id) as "عدد المنتجات",
    COALESCE(SUM(CASE WHEN i.status = 'in_stock' THEN 1 ELSE 0 END), 0) as "في المخزون"
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
LEFT JOIN inventory_items i ON i.product_id = p.id
GROUP BY c.id, c.name, c.icon, c.display_order
ORDER BY c.display_order;

-- 6. التحقق من الفهارس (Indexes)
SELECT 
    indexname as "اسم الفهرس",
    tablename as "الجدول"
FROM pg_indexes 
WHERE tablename IN ('categories', 'products')
AND indexname LIKE '%category%';

-- 7. المنتجات بدون فئة (إن وجدت)
SELECT 
    name as "اسم المنتج",
    sku as "الباركود",
    category as "الفئة القديمة"
FROM products 
WHERE category_id IS NULL;

-- 8. اختبار العلاقات (Foreign Keys)
SELECT 
    tc.constraint_name as "اسم القيد",
    tc.table_name as "الجدول",
    kcu.column_name as "العمود",
    ccu.table_name as "الجدول المرجعي",
    ccu.column_name as "العمود المرجعي"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'products'
AND kcu.column_name = 'category_id';

-- ✅ إذا ظهرت جميع النتائج بشكل صحيح، فإن نظام الفئات يعمل بنجاح!
