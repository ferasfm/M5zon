-- ========================================
-- الحل النهائي الصحيح
-- ========================================

-- حذف المستخدم admin إذا كان موجوداً
DELETE FROM users WHERE username = 'admin';

-- إضافة المستخدم admin مع جميع الأعمدة المطلوبة
INSERT INTO users (username, email, password_hash)
VALUES ('admin', 'admin@m5zon.com', 'الصق_كلمة_المرور_المشفرة_هنا');

-- التحقق
SELECT * FROM users WHERE username = 'admin';

-- ========================================
-- ✅ انتهى!
-- ========================================
