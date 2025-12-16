-- جدول الصلاحيات الفردية لكل مستخدم
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, permission_key)
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key);

-- تعليقات
COMMENT ON TABLE user_permissions IS 'صلاحيات مخصصة لكل مستخدم على حدة';
COMMENT ON COLUMN user_permissions.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN user_permissions.permission_key IS 'مفتاح الصلاحية مثل: products.view, products.add, products.edit, products.delete';
COMMENT ON COLUMN user_permissions.enabled IS 'هل الصلاحية مفعلة؟';

-- قائمة الصلاحيات المتاحة
-- products.view - عرض المنتجات
-- products.add - إضافة منتجات
-- products.edit - تعديل منتجات
-- products.delete - حذف منتجات
-- receiving.view - عرض استلام البضاعة
-- receiving.add - إضافة استلام بضاعة
-- dispatching.view - عرض صرف البضاعة
-- dispatching.add - إضافة صرف بضاعة
-- dispatching.edit - تعديل صرف بضاعة
-- dispatching.delete - حذف صرف بضاعة
-- scrapping.view - عرض إتلاف البضاعة
-- scrapping.add - إضافة إتلاف بضاعة
-- suppliers.view - عرض الموردين
-- suppliers.add - إضافة موردين
-- suppliers.edit - تعديل موردين
-- suppliers.delete - حذف موردين
-- locations.view - عرض المواقع والعملاء
-- locations.add - إضافة مواقع وعملاء
-- locations.edit - تعديل مواقع وعملاء
-- locations.delete - حذف مواقع وعملاء
-- reports.view - عرض التقارير
-- reports.export - تصدير التقارير
-- settings.view - عرض الإعدادات
-- settings.edit - تعديل الإعدادات
-- users.view - عرض المستخدمين
-- users.add - إضافة مستخدمين
-- users.edit - تعديل مستخدمين
-- users.delete - حذف مستخدمين
-- categories.view - عرض الفئات
-- categories.add - إضافة فئات
-- categories.edit - تعديل فئات
-- categories.delete - حذف فئات
-- data.reset - إعادة تعيين البيانات
