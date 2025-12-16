-- ========================================
-- نظام المجموعات والصلاحيات المخصصة
-- ========================================

-- 1. جدول المجموعات
CREATE TABLE IF NOT EXISTS permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT '👥',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 2. جدول صلاحيات المجموعات
CREATE TABLE IF NOT EXISTS group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, permission_key)
);

-- 3. جدول ربط المستخدمين بالمجموعات
CREATE TABLE IF NOT EXISTS user_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(user_id, group_id)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_permission_groups_name ON permission_groups(name);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_key ON group_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group_id ON user_group_memberships(group_id);

-- تعليقات
COMMENT ON TABLE permission_groups IS 'مجموعات الصلاحيات المخصصة';
COMMENT ON TABLE group_permissions IS 'صلاحيات كل مجموعة';
COMMENT ON TABLE user_group_memberships IS 'ربط المستخدمين بالمجموعات';

-- ========================================
-- إدراج المجموعات الافتراضية
-- ========================================

-- مجموعة المدير الكامل
INSERT INTO permission_groups (id, name, description, color, icon, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'مدير النظام',
    'صلاحيات كاملة على جميع أجزاء النظام',
    '#EF4444',
    '👑',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- مجموعة مدير المخزون
INSERT INTO permission_groups (id, name, description, color, icon, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'مدير المخزون',
    'إدارة المنتجات والمخزون والحركات',
    '#3B82F6',
    '📦',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- مجموعة موظف المستودع
INSERT INTO permission_groups (id, name, description, color, icon, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'موظف المستودع',
    'استلام وصرف البضائع فقط',
    '#10B981',
    '📋',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- مجموعة المشاهد
INSERT INTO permission_groups (id, name, description, color, icon, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'مشاهد',
    'عرض البيانات فقط بدون تعديل',
    '#6B7280',
    '👁️',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- ========================================
-- صلاحيات مجموعة المدير الكامل
-- ========================================
INSERT INTO group_permissions (group_id, permission_key, enabled) VALUES
('00000000-0000-0000-0000-000000000001', 'dashboard.view', true),
('00000000-0000-0000-0000-000000000001', 'products.view', true),
('00000000-0000-0000-0000-000000000001', 'products.add', true),
('00000000-0000-0000-0000-000000000001', 'products.edit', true),
('00000000-0000-0000-0000-000000000001', 'products.delete', true),
('00000000-0000-0000-0000-000000000001', 'receiving.view', true),
('00000000-0000-0000-0000-000000000001', 'receiving.add', true),
('00000000-0000-0000-0000-000000000001', 'dispatching.view', true),
('00000000-0000-0000-0000-000000000001', 'dispatching.add', true),
('00000000-0000-0000-0000-000000000001', 'dispatching.edit', true),
('00000000-0000-0000-0000-000000000001', 'dispatching.delete', true),
('00000000-0000-0000-0000-000000000001', 'scrapping.view', true),
('00000000-0000-0000-0000-000000000001', 'scrapping.add', true),
('00000000-0000-0000-0000-000000000001', 'suppliers.view', true),
('00000000-0000-0000-0000-000000000001', 'suppliers.add', true),
('00000000-0000-0000-0000-000000000001', 'suppliers.edit', true),
('00000000-0000-0000-0000-000000000001', 'suppliers.delete', true),
('00000000-0000-0000-0000-000000000001', 'locations.view', true),
('00000000-0000-0000-0000-000000000001', 'locations.add', true),
('00000000-0000-0000-0000-000000000001', 'locations.edit', true),
('00000000-0000-0000-0000-000000000001', 'locations.delete', true),
('00000000-0000-0000-0000-000000000001', 'reports.view', true),
('00000000-0000-0000-0000-000000000001', 'reports.export', true),
('00000000-0000-0000-0000-000000000001', 'settings.view', true),
('00000000-0000-0000-0000-000000000001', 'settings.edit', true),
('00000000-0000-0000-0000-000000000001', 'users.view', true),
('00000000-0000-0000-0000-000000000001', 'users.add', true),
('00000000-0000-0000-0000-000000000001', 'users.edit', true),
('00000000-0000-0000-0000-000000000001', 'users.delete', true),
('00000000-0000-0000-0000-000000000001', 'groups.view', true),
('00000000-0000-0000-0000-000000000001', 'groups.add', true),
('00000000-0000-0000-0000-000000000001', 'groups.edit', true),
('00000000-0000-0000-0000-000000000001', 'groups.delete', true),
('00000000-0000-0000-0000-000000000001', 'categories.view', true),
('00000000-0000-0000-0000-000000000001', 'categories.add', true),
('00000000-0000-0000-0000-000000000001', 'categories.edit', true),
('00000000-0000-0000-0000-000000000001', 'categories.delete', true),
('00000000-0000-0000-0000-000000000001', 'data.reset', true)
ON CONFLICT (group_id, permission_key) DO NOTHING;

-- ========================================
-- صلاحيات مجموعة مدير المخزون
-- ========================================
INSERT INTO group_permissions (group_id, permission_key, enabled) VALUES
('00000000-0000-0000-0000-000000000002', 'dashboard.view', true),
('00000000-0000-0000-0000-000000000002', 'products.view', true),
('00000000-0000-0000-0000-000000000002', 'products.add', true),
('00000000-0000-0000-0000-000000000002', 'products.edit', true),
('00000000-0000-0000-0000-000000000002', 'products.delete', true),
('00000000-0000-0000-0000-000000000002', 'receiving.view', true),
('00000000-0000-0000-0000-000000000002', 'receiving.add', true),
('00000000-0000-0000-0000-000000000002', 'dispatching.view', true),
('00000000-0000-0000-0000-000000000002', 'dispatching.add', true),
('00000000-0000-0000-0000-000000000002', 'dispatching.edit', true),
('00000000-0000-0000-0000-000000000002', 'dispatching.delete', true),
('00000000-0000-0000-0000-000000000002', 'scrapping.view', true),
('00000000-0000-0000-0000-000000000002', 'scrapping.add', true),
('00000000-0000-0000-0000-000000000002', 'suppliers.view', true),
('00000000-0000-0000-0000-000000000002', 'suppliers.add', true),
('00000000-0000-0000-0000-000000000002', 'suppliers.edit', true),
('00000000-0000-0000-0000-000000000002', 'suppliers.delete', true),
('00000000-0000-0000-0000-000000000002', 'locations.view', true),
('00000000-0000-0000-0000-000000000002', 'locations.add', true),
('00000000-0000-0000-0000-000000000002', 'locations.edit', true),
('00000000-0000-0000-0000-000000000002', 'locations.delete', true),
('00000000-0000-0000-0000-000000000002', 'reports.view', true),
('00000000-0000-0000-0000-000000000002', 'reports.export', true),
('00000000-0000-0000-0000-000000000002', 'categories.view', true),
('00000000-0000-0000-0000-000000000002', 'categories.add', true),
('00000000-0000-0000-0000-000000000002', 'categories.edit', true),
('00000000-0000-0000-0000-000000000002', 'categories.delete', true)
ON CONFLICT (group_id, permission_key) DO NOTHING;

-- ========================================
-- صلاحيات مجموعة موظف المستودع
-- ========================================
INSERT INTO group_permissions (group_id, permission_key, enabled) VALUES
('00000000-0000-0000-0000-000000000003', 'dashboard.view', true),
('00000000-0000-0000-0000-000000000003', 'products.view', true),
('00000000-0000-0000-0000-000000000003', 'receiving.view', true),
('00000000-0000-0000-0000-000000000003', 'receiving.add', true),
('00000000-0000-0000-0000-000000000003', 'dispatching.view', true),
('00000000-0000-0000-0000-000000000003', 'dispatching.add', true),
('00000000-0000-0000-0000-000000000003', 'suppliers.view', true),
('00000000-0000-0000-0000-000000000003', 'locations.view', true),
('00000000-0000-0000-0000-000000000003', 'reports.view', true)
ON CONFLICT (group_id, permission_key) DO NOTHING;

-- ========================================
-- صلاحيات مجموعة المشاهد
-- ========================================
INSERT INTO group_permissions (group_id, permission_key, enabled) VALUES
('00000000-0000-0000-0000-000000000004', 'dashboard.view', true),
('00000000-0000-0000-0000-000000000004', 'products.view', true),
('00000000-0000-0000-0000-000000000004', 'receiving.view', true),
('00000000-0000-0000-0000-000000000004', 'dispatching.view', true),
('00000000-0000-0000-0000-000000000004', 'suppliers.view', true),
('00000000-0000-0000-0000-000000000004', 'locations.view', true),
('00000000-0000-0000-0000-000000000004', 'reports.view', true)
ON CONFLICT (group_id, permission_key) DO NOTHING;
