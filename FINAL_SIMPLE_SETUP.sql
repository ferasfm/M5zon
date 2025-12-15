-- ========================================
-- الحل النهائي البسيط
-- نسخ والصق وشغّل!
-- ========================================

-- الخطوة 1: إنشاء جدول المستخدمين
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- الخطوة 2: حذف المستخدم admin إذا كان موجوداً
-- ========================================
DELETE FROM users WHERE username = 'admin';

-- الخطوة 3: إضافة المستخدم admin
-- ========================================
-- ⚠️ استبدل REPLACE_WITH_YOUR_HASH بكلمة المرور المشفرة
-- للحصول عليها: node generate-password-hash.js

INSERT INTO users (username, password_hash)
VALUES ('admin', '$2a$10$REPLACE_WITH_YOUR_HASH');

-- الخطوة 4: التحقق
-- ========================================
SELECT * FROM users WHERE username = 'admin';

-- ========================================
-- ✅ انتهى!
-- ========================================
-- 
-- الآن يمكنك تسجيل الدخول:
-- اسم المستخدم: admin
-- كلمة المرور: admin123
-- ========================================
