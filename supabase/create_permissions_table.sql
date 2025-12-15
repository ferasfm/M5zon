-- جدول الصلاحيات
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    page VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_add BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role, page)
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_page ON permissions(page);

-- تعليقات
COMMENT ON TABLE permissions IS 'صلاحيات الوصول للصفحات حسب الدور';
COMMENT ON COLUMN permissions.role IS 'الدور: admin, manager, user, viewer';
COMMENT ON COLUMN permissions.page IS 'اسم الصفحة: dashboard, products, inventory, etc.';
