# 🔧 إصلاح جدول المستخدمين

## 🔍 المشكلة:
```
ERROR: column "full_name" of relation "users" does not exist
```

**السبب:** جدول `users` الموجود لديك لا يحتوي على جميع الأعمدة المطلوبة.

---

## ✅ الحل السريع (3 خطوات):

### **الخطوة 1: توليد كلمة المرور المشفرة**
```bash
node generate-password-hash.js
```
انسخ النتيجة (مثال):
```
$2a$10$abcdefghijklmnopqrstuvwxyz1234567890
```

---

### **الخطوة 2: تنفيذ أحد الحلول التالية:**

#### **الحل A: إصلاح الجدول (موصى به)**

في pgAdmin → Query Tool، نفذ:

```sql
-- 1. إضافة الأعمدة المفقودة
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true;

-- 2. حذف المستخدم admin إذا كان موجوداً
DELETE FROM users WHERE username = 'admin';

-- 3. إضافة المستخدم admin
INSERT INTO users (username, password_hash, full_name, email, role, is_active, must_change_password, is_first_login)
VALUES (
    'admin',
    '$2a$10$PASTE_YOUR_HASH_HERE',  -- ⚠️ الصق كلمة المرور المشفرة هنا
    'مدير النظام',
    'admin@m5zon.com',
    'admin',
    true,
    true,
    true
);
```

---

#### **الحل B: إضافة بسيطة (إذا لم ينجح الحل A)**

```sql
-- 1. حذف المستخدم admin إذا كان موجوداً
DELETE FROM users WHERE username = 'admin';

-- 2. إضافة المستخدم admin (أعمدة أساسية فقط)
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2a$10$PASTE_YOUR_HASH_HERE');

-- إذا كان الجدول يحتوي على عمود role:
-- INSERT INTO users (username, password_hash, role)
-- VALUES ('admin', '$2a$10$PASTE_YOUR_HASH_HERE', 'admin');
```

---

### **الخطوة 3: التحقق**

```sql
SELECT * FROM users WHERE username = 'admin';
```

يجب أن ترى المستخدم admin في النتائج.

---

## 🎯 الطريقة الأسهل (استخدام الملفات الجاهزة):

### **1. إصلاح الجدول:**
```bash
# في pgAdmin → Query Tool
# افتح ملف: fix-users-table.sql
# استبدل كلمة المرور المشفرة
# اضغط F5
```

### **2. أو إضافة بسيطة:**
```bash
# في pgAdmin → Query Tool
# افتح ملف: add-admin-simple.sql
# استبدل كلمة المرور المشفرة
# اضغط F5
```

---

## 🔍 التحقق من بنية الجدول:

لمعرفة الأعمدة الموجودة في جدول users:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

---

## 📝 ملاحظات مهمة:

### **1. كلمة المرور المشفرة:**
- ✅ يجب توليدها باستخدام: `node generate-password-hash.js`
- ❌ لا تستخدم كلمة مرور نصية مباشرة
- ⚠️ استبدل `$2a$10$PASTE_YOUR_HASH_HERE` بالنتيجة

### **2. الأعمدة المطلوبة:**
الأعمدة الأساسية:
- `username` (مطلوب)
- `password_hash` (مطلوب)

الأعمدة الإضافية (موصى بها):
- `full_name`
- `email`
- `role`
- `is_active`
- `must_change_password`
- `is_first_login`

### **3. إذا كان الجدول موجود مسبقاً:**
- استخدم `ALTER TABLE` لإضافة الأعمدة المفقودة
- أو استخدم الحل B (إضافة بسيطة)

---

## ✅ بعد الإصلاح:

1. شغّل التطبيق: `dist\m5zon 1.0.0.exe`
2. سجل الدخول:
   - اسم المستخدم: `admin`
   - كلمة المرور: `admin123`

---

## 🆘 إذا استمرت المشكلة:

### **الخطأ: "column does not exist"**
✅ **الحل:** استخدم الحل B (إضافة بسيطة) مع الأعمدة الموجودة فقط

### **الخطأ: "duplicate key"**
✅ **الحل:** احذف المستخدم أولاً:
```sql
DELETE FROM users WHERE username = 'admin';
```

### **الخطأ: "password incorrect"**
✅ **الحل:** تأكد من استخدام كلمة المرور المشفرة الصحيحة من `generate-password-hash.js`

---

## 📚 الملفات المساعدة:

- `fix-users-table.sql` - إصلاح كامل للجدول
- `add-admin-simple.sql` - إضافة بسيطة
- `generate-password-hash.js` - توليد كلمة المرور المشفرة

---

**جرب الآن! 🚀**
