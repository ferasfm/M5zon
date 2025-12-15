-- ========================================
-- إصلاح جدول المستخدمين
-- ========================================

-- الخطوة 1: التحقق من بنية الجدول الحالي
-- ========================================
-- شغّل هذا الأمر أولاً لرؤية الأعمدة الموجودة:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- الخطوة 2: إضافة الأعمدة المفقودة
-- ========================================

-- إضافة عمود full_name إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- إضافة عمود email إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- إضافة عمود role إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- إضافة عمود is_active إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- إضافة عمود must_change_password إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- إضافة عمود is_first_login إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true;

-- إضافة عمود failed_login_attempts إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

-- إضافة عمود locked_until إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- إضافة عمود last_login إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- إضافة عمود created_at إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- إضافة عمود updated_at إذا لم يكن موجوداً
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- الخطوة 3: إضافة المستخدم admin
-- ========================================

-- حذف المستخدم admin إذا كان موجوداً (لإعادة إنشائه)
DELETE FROM users WHERE username = 'admin';

-- إضافة المستخدم admin
-- ⚠️ استبدل كلمة المرور المشفرة بالصحيحة!
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
    '$2a$10$REPLACE_WITH_HASHED_PASSWORD',  -- ⚠️ استبدل هذا!
    'مدير النظام',
    'admin@m5zon.com',
    'admin',
    true,
    true,
    true
);

-- ========================================
-- الخطوة 4: التحقق من البيانات
-- ========================================
SELECT 
    username, 
    full_name, 
    email,
    role, 
    is_active,
    must_change_password,
    is_first_login
FROM users
WHERE username = 'admin';

-- ========================================
-- ✅ اكتمل!
-- ========================================
