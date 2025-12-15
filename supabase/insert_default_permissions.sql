-- إدراج الصلاحيات الافتراضية

-- صلاحيات Admin (كل شيء)
INSERT INTO permissions (role, page, can_view, can_add, can_edit, can_delete) VALUES
('admin', 'dashboard', true, true, true, true),
('admin', 'products', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'receiving', true, true, true, true),
('admin', 'dispatching', true, true, true, true),
('admin', 'dispatch_management', true, true, true, true),
('admin', 'suppliers', true, true, true, true),
('admin', 'reports', true, true, true, true),
('admin', 'financial_claims', true, true, true, true),
('admin', 'settings', true, true, true, true),
('admin', 'users', true, true, true, true)
ON CONFLICT (role, page) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- صلاحيات Manager (كل شيء ماعدا الحذف وإدارة المستخدمين)
INSERT INTO permissions (role, page, can_view, can_add, can_edit, can_delete) VALUES
('manager', 'dashboard', true, true, true, false),
('manager', 'products', true, true, true, false),
('manager', 'inventory', true, true, true, false),
('manager', 'receiving', true, true, true, false),
('manager', 'dispatching', true, true, true, false),
('manager', 'dispatch_management', true, true, true, false),
('manager', 'suppliers', true, true, true, false),
('manager', 'reports', true, true, true, false),
('manager', 'financial_claims', true, true, true, false),
('manager', 'settings', true, false, false, false),
('manager', 'users', false, false, false, false)
ON CONFLICT (role, page) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- صلاحيات User (عرض وإضافة فقط)
INSERT INTO permissions (role, page, can_view, can_add, can_edit, can_delete) VALUES
('user', 'dashboard', true, false, false, false),
('user', 'products', true, true, false, false),
('user', 'inventory', true, true, false, false),
('user', 'receiving', true, true, false, false),
('user', 'dispatching', true, true, false, false),
('user', 'dispatch_management', true, false, false, false),
('user', 'suppliers', true, false, false, false),
('user', 'reports', true, false, false, false),
('user', 'financial_claims', true, false, false, false),
('user', 'settings', false, false, false, false),
('user', 'users', false, false, false, false)
ON CONFLICT (role, page) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- صلاحيات Viewer (عرض فقط)
INSERT INTO permissions (role, page, can_view, can_add, can_edit, can_delete) VALUES
('viewer', 'dashboard', true, false, false, false),
('viewer', 'products', true, false, false, false),
('viewer', 'inventory', true, false, false, false),
('viewer', 'receiving', false, false, false, false),
('viewer', 'dispatching', false, false, false, false),
('viewer', 'dispatch_management', true, false, false, false),
('viewer', 'suppliers', true, false, false, false),
('viewer', 'reports', true, false, false, false),
('viewer', 'financial_claims', true, false, false, false),
('viewer', 'settings', false, false, false, false),
('viewer', 'users', false, false, false, false)
ON CONFLICT (role, page) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;
