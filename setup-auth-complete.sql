-- ========================================
-- إعداد نظام المصادقة الكامل
-- تطبيق M5zon لإدارة المخزون
-- ========================================

-- 1. إنشاء جدول المستخدمين
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    is_first_login BOOLEAN DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. إنشاء جدول الصلاحيات
-- ========================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, page)
);

-- 3. إنشاء جدول إعادة تعيين كلمات المرور
-- ========================================
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. إنشاء جدول سجل الأحداث (اختياري)
-- ========================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. إضافة المستخدم admin
-- ========================================
-- ⚠️ مهم: استبدل كلمة المرور المشفرة بالصحيحة!
-- لتوليد كلمة مرور مشفرة، شغّل:
-- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"

INSERT INTO users (
    username, 
    password_hash, 
    full_name, 
    email, 
    role, 
    is_active, 
    must_change_password, 
    is_first_login
)
VALUES (
    'admin',
    '$2a$10$rQZ5YJ5YJ5YJ5YJ5YJ5YJOXxK8K8K8K8K8K8K8K8K8K8K8K8K8K8K',  -- ⚠️ استبدل هذا!
    'مدير النظام',
    'admin@m5zon.com',
    'admin',
    true,
    true,
    true
)
ON CONFLICT (username) DO NOTHING;

-- 6. إضافة الصلاحيات الكاملة للـ admin
-- ========================================
INSERT INTO permissions (user_id, page, can_view, can_create, can_edit, can_delete)
SELECT 
    u.id,
    p.page,
    true,
    true,
    true,
    true
FROM users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('products'),
        ('receiving'),
        ('dispatching'),
        ('dispatch_management'),
        ('scrapping'),
        ('suppliers'),
        ('locations'),
        ('reports'),
        ('print_templates'),
        ('users'),
        ('settings')
) AS p(page)
WHERE u.username = 'admin'
ON CONFLICT (user_id, page) DO NOTHING;

-- 7. التحقق من البيانات
-- ========================================
-- عرض المستخدمين
SELECT 
    username, 
    full_name, 
    role, 
    is_active,
    must_change_password,
    is_first_login,
    created_at
FROM users;

-- عرض الصلاحيات
SELECT 
    u.username,
    u.role,
    p.page,
    p.can_view,
    p.can_create,
    p.can_edit,
    p.can_delete
FROM permissions p
JOIN users u ON p.user_id = u.id
ORDER BY u.username, p.page;

-- ========================================
-- اكتمل الإعداد! ✅
-- ========================================
-- 
-- بيانات الدخول:
-- اسم المستخدم: admin
-- كلمة المرور: admin123
-- 
-- ⚠️ يجب تغيير كلمة المرور عند أول تسجيل دخول!
-- ========================================
