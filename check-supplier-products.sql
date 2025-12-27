-- فحص جدول أسعار الموردين
\echo '========================================='
\echo '🔍 فحص جدول أسعار الموردين'
\echo '========================================='
\echo ''

-- 1. التحقق من وجود الجدول
\echo '📋 1. التحقق من وجود الجدول:'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'supplier_products'
        ) 
        THEN '✅ الجدول موجود'
        ELSE '❌ الجدول غير موجود'
    END as status;

\echo ''

-- 2. عدد السجلات
\echo '📊 2. عدد الأسعار المسجلة:'
SELECT COUNT(*) as total_prices FROM supplier_products;

\echo ''

-- 3. عرض بعض الأمثلة
\echo '📝 3. أمثلة على الأسعار (أول 5 سجلات):'
SELECT 
    p.name as product_name,
    s.name as supplier_name,
    sp.price,
    sp.is_preferred as preferred
FROM supplier_products sp
JOIN products p ON sp.product_id = p.id
JOIN suppliers s ON sp.supplier_id = s.id
ORDER BY sp.created_at DESC
LIMIT 5;

\echo ''
\echo '========================================='
\echo '✅ الفحص اكتمل'
\echo '========================================='
