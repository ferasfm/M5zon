-- ========================================
-- تحديث كلمة مرور المستخدم admin
-- ========================================

-- تحديث كلمة المرور للمستخدم admin
UPDATE users 
SET password_hash = '$2b$10$GOsEh/JO08xgRzyi8m69x.0HRWnJPE3B39oU/jG7/uEOOqrSUUcy2'
WHERE username = 'admin';

-- التحقق من التحديث
SELECT username, email, role, password_hash 
FROM users 
WHERE username = 'admin';

-- ========================================
-- ✅ اكتمل!
-- ========================================
-- 
-- الآن يمكنك تسجيل الدخول:
-- اسم المستخدم: admin
-- كلمة المرور: admin123
-- ========================================
