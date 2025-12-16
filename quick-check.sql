-- فحص سريع للنظام
SELECT 'الجداول:' as check_type, COUNT(*)::text as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('permission_groups', 'group_permissions', 'user_group_memberships')
UNION ALL
SELECT 'المجموعات:', COUNT(*)::text
FROM permission_groups
UNION ALL
SELECT 'الصلاحيات:', COUNT(*)::text
FROM group_permissions
UNION ALL
SELECT 'المستخدمين المرتبطين:', COUNT(DISTINCT user_id)::text
FROM user_group_memberships;
