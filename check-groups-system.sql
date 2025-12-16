-- ========================================
-- سكريبت فحص نظام المجموعات والصلاحيات
-- ========================================

\echo '========================================='
\echo '🔍 فحص نظام المجموعات والصلاحيات'
\echo '========================================='
\echo ''

-- ========================================
-- 1. فحص وجود الجداول
-- ========================================
\echo '📋 1. فحص وجود الجداول:'
\echo '---'

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('permission_groups', 'group_permissions', 'user_group_memberships') 
        THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('permission_groups', 'group_permissions', 'user_group_memberships')
ORDER BY table_name;

\echo ''

-- ========================================
-- 2. فحص عدد المجموعات
-- ========================================
\echo '👥 2. فحص المجموعات:'
\echo '---'

SELECT 
    COUNT(*) as total_groups,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ يوجد 4 مجموعات أو أكثر'
        ELSE '⚠️ يجب أن يكون هناك 4 مجموعات على الأقل'
    END as status
FROM permission_groups;

\echo ''

-- ========================================
-- 3. عرض تفاصيل المجموعات
-- ========================================
\echo '📊 3. تفاصيل المجموعات:'
\echo '---'

SELECT 
    name as "اسم المجموعة",
    icon as "الأيقونة",
    color as "اللون",
    is_system as "افتراضية؟",
    description as "الوصف"
FROM permission_groups
ORDER BY 
    CASE name
        WHEN 'مدير النظام' THEN 1
        WHEN 'مدير المخزون' THEN 2
        WHEN 'موظف المستودع' THEN 3
        WHEN 'مشاهد' THEN 4
        ELSE 5
    END;

\echo ''

-- ========================================
-- 4. فحص صلاحيات كل مجموعة
-- ========================================
\echo '🔐 4. عدد الصلاحيات لكل مجموعة:'
\echo '---'

SELECT 
    pg.name as "المجموعة",
    pg.icon as "الأيقونة",
    COUNT(gp.id) as "عدد الصلاحيات",
    CASE 
        WHEN pg.name = 'مدير النظام' AND COUNT(gp.id) >= 35 THEN '✅'
        WHEN pg.name = 'مدير المخزون' AND COUNT(gp.id) >= 20 THEN '✅'
        WHEN pg.name = 'موظف المستودع' AND COUNT(gp.id) >= 8 THEN '✅'
        WHEN pg.name = 'مشاهد' AND COUNT(gp.id) >= 6 THEN '✅'
        ELSE '⚠️'
    END as "الحالة"
FROM permission_groups pg
LEFT JOIN group_permissions gp ON pg.id = gp.group_id
GROUP BY pg.id, pg.name, pg.icon
ORDER BY 
    CASE pg.name
        WHEN 'مدير النظام' THEN 1
        WHEN 'مدير المخزون' THEN 2
        WHEN 'موظف المستودع' THEN 3
        WHEN 'مشاهد' THEN 4
        ELSE 5
    END;

\echo ''

-- ========================================
-- 5. فحص صلاحيات مدير النظام (يجب أن تكون كاملة)
-- ========================================
\echo '👑 5. صلاحيات مدير النظام:'
\echo '---'

SELECT 
    permission_key as "الصلاحية",
    enabled as "مفعلة؟"
FROM group_permissions
WHERE group_id = '00000000-0000-0000-0000-000000000001'
ORDER BY permission_key
LIMIT 10;

\echo ''
\echo '(عرض أول 10 صلاحيات فقط)'
\echo ''

-- ========================================
-- 6. فحص المستخدمين المرتبطين بالمجموعات
-- ========================================
\echo '🔗 6. المستخدمين المرتبطين بالمجموعات:'
\echo '---'

SELECT 
    pg.name as "المجموعة",
    COUNT(ugm.id) as "عدد المستخدمين"
FROM permission_groups pg
LEFT JOIN user_group_memberships ugm ON pg.id = ugm.group_id
GROUP BY pg.id, pg.name
ORDER BY 
    CASE pg.name
        WHEN 'مدير النظام' THEN 1
        WHEN 'مدير المخزون' THEN 2
        WHEN 'موظف المستودع' THEN 3
        WHEN 'مشاهد' THEN 4
        ELSE 5
    END;

\echo ''

-- ========================================
-- 7. فحص الفهارس (Indexes)
-- ========================================
\echo '📇 7. فحص الفهارس:'
\echo '---'

SELECT 
    tablename as "الجدول",
    indexname as "اسم الفهرس",
    '✅' as "الحالة"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('permission_groups', 'group_permissions', 'user_group_memberships')
ORDER BY tablename, indexname;

\echo ''

-- ========================================
-- 8. فحص الصلاحيات الأساسية
-- ========================================
\echo '🎯 8. فحص الصلاحيات الأساسية المطلوبة:'
\echo '---'

WITH required_permissions AS (
    SELECT unnest(ARRAY[
        'dashboard.view',
        'products.view',
        'products.add',
        'products.edit',
        'products.delete',
        'receiving.view',
        'receiving.add',
        'dispatching.view',
        'dispatching.add',
        'reports.view',
        'users.view',
        'groups.view'
    ]) as permission_key
)
SELECT 
    rp.permission_key as "الصلاحية",
    CASE 
        WHEN gp.id IS NOT NULL THEN '✅ موجودة'
        ELSE '❌ غير موجودة'
    END as "الحالة"
FROM required_permissions rp
LEFT JOIN group_permissions gp 
    ON rp.permission_key = gp.permission_key 
    AND gp.group_id = '00000000-0000-0000-0000-000000000001'
ORDER BY rp.permission_key;

\echo ''

-- ========================================
-- 9. ملخص النظام
-- ========================================
\echo '📊 9. ملخص النظام:'
\echo '---'

SELECT 
    'إجمالي المجموعات' as "البند",
    COUNT(*)::text as "القيمة"
FROM permission_groups
UNION ALL
SELECT 
    'إجمالي الصلاحيات المعرفة',
    COUNT(DISTINCT permission_key)::text
FROM group_permissions
UNION ALL
SELECT 
    'إجمالي المستخدمين المرتبطين',
    COUNT(DISTINCT user_id)::text
FROM user_group_memberships
UNION ALL
SELECT 
    'المجموعات الافتراضية',
    COUNT(*)::text
FROM permission_groups
WHERE is_system = true;

\echo ''
\echo '========================================='
\echo '✅ انتهى الفحص'
\echo '========================================='
\echo ''
\echo '💡 ملاحظات:'
\echo '   - يجب أن يكون هناك 4 مجموعات على الأقل'
\echo '   - مدير النظام يجب أن يكون لديه 35+ صلاحية'
\echo '   - جميع الجداول والفهارس يجب أن تكون موجودة'
\echo ''
