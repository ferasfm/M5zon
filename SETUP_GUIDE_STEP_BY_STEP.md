# 📖 دليل الإعداد خطوة بخطوة

## 🎯 الهدف:
إعداد نظام المصادقة في قاعدة البيانات الموجودة لديك.

---

## 📋 المتطلبات:

- ✅ PostgreSQL مثبت ويعمل
- ✅ قاعدة بيانات موجودة (مثلاً: `m5zon_db`)
- ✅ معلومات الاتصال بقاعدة البيانات

---

## 🚀 الخطوات:

### **الخطوة 1: فتح pgAdmin**

1. ابحث عن **pgAdmin** في قائمة ابدأ
2. افتح البرنامج
3. أدخل كلمة المرور الرئيسية (Master Password) إذا طُلبت منك

---

### **الخطوة 2: الاتصال بقاعدة البيانات**

1. في الشريط الجانبي الأيسر، افتح:
   ```
   Servers → PostgreSQL → Databases → m5zon_db
   ```

2. انقر بزر الماوس الأيمن على قاعدة البيانات
3. اختر **Query Tool** (أداة الاستعلام)

---

### **الخطوة 3: إنشاء جدول المستخدمين**

في نافذة Query Tool، انسخ والصق هذا الكود:

```sql
-- إنشاء جدول المستخدمين
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
```

**ثم اضغط F5 أو زر ▶️ (Execute/Refresh)**

✅ يجب أن تظهر رسالة: `CREATE TABLE` أو `Query returned successfully`

---

### **الخطوة 4: إنشاء جدول الصلاحيات**

في نفس نافذة Query Tool، انسخ والصق:

```sql
-- إنشاء جدول الصلاحيات
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
```

**اضغط F5 أو زر ▶️**

✅ يجب أن تظهر رسالة: `CREATE TABLE`

---

### **الخطوة 5: إنشاء جدول إعادة تعيين كلمات المرور**

```sql
-- إنشاء جدول إعادة تعيين كلمات المرور
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**اضغط F5 أو زر ▶️**

✅ يجب أن تظهر رسالة: `CREATE TABLE`

---

### **الخطوة 6: إضافة المستخدم admin**

```sql
-- إضافة المستخدم admin
-- كلمة المرور: admin123
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
    '$2a$10$YourHashedPasswordHere',
    'مدير النظام',
    'admin@m5zon.com',
    'admin',
    true,
    true,
    true
)
ON CONFLICT (username) DO NOTHING;
```

⚠️ **مهم:** كلمة المرور المشفرة أعلاه مؤقتة. سأعطيك الصحيحة في الخطوة التالية.

---

### **الخطوة 7: الحصول على كلمة المرور المشفرة الصحيحة**

لأن bcrypt يحتاج تشفير صحيح، استخدم هذا السكريبت:

1. افتح Command Prompt أو PowerShell
2. اذهب إلى مجلد المشروع:
   ```bash
   cd C:\IdeaProjects\M5zon
   ```

3. شغّل هذا الأمر:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
   ```

4. انسخ النتيجة (ستكون شيء مثل):
   ```
   $2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ
   ```

5. ارجع لـ pgAdmin واستبدل `$2a$10$YourHashedPasswordHere` بالنتيجة

---

### **الخطوة 8: إضافة الصلاحيات للـ admin**

```sql
-- إضافة صلاحيات كاملة للـ admin
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
```

**اضغط F5 أو زر ▶️**

✅ يجب أن تظهر رسالة: `INSERT 0 12` (تم إدراج 12 صلاحية)

---

### **الخطوة 9: التحقق من البيانات**

تحقق من أن كل شيء تم بنجاح:

```sql
-- عرض المستخدمين
SELECT username, full_name, role, is_active FROM users;

-- عرض الصلاحيات
SELECT 
    u.username,
    p.page,
    p.can_view,
    p.can_create,
    p.can_edit,
    p.can_delete
FROM permissions p
JOIN users u ON p.user_id = u.id
ORDER BY u.username, p.page;
```

**اضغط F5 أو زر ▶️**

✅ يجب أن ترى:
- مستخدم واحد: `admin`
- 12 صلاحية للـ admin

---

### **الخطوة 10: تشغيل التطبيق**

1. افتح التطبيق:
   ```bash
   dist\m5zon 1.0.0.exe
   ```

2. سجل الدخول:
   - **اسم المستخدم:** `admin`
   - **كلمة المرور:** `admin123`

3. ✅ يجب أن تظهر نافذة تغيير كلمة المرور
4. أدخل كلمة مرور جديدة قوية
5. ✅ ستدخل للتطبيق بنجاح!

---

## 🎯 طريقة أسهل (باستخدام السكريبت):

إذا كنت تفضل استخدام السكريبت الجاهز:

### **الخطوة 1: تعديل إعدادات الاتصال**

افتح ملف `scripts/setup-auth-system.js` وعدّل هذا الجزء:

```javascript
// في بداية الملف، ابحث عن:
const { createClient } = require('@supabase/supabase-js');

// وعدّل معلومات الاتصال:
const supabaseUrl = 'http://localhost:5432';  // عنوان السيرفر
const supabaseKey = 'your-key';               // المفتاح (إذا كان مطلوب)

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'public'
    }
});
```

### **الخطوة 2: تشغيل السكريبت**

```bash
node scripts/setup-auth-system.js
```

✅ سيقوم السكريبت بإنشاء كل شيء تلقائياً!

---

## 🔧 حل المشاكل:

### **مشكلة 1: "relation already exists"**
✅ **الحل:** الجدول موجود مسبقاً، تجاوز هذا الخطأ

### **مشكلة 2: "duplicate key value"**
✅ **الحل:** المستخدم موجود مسبقاً، استخدم:
```sql
DELETE FROM users WHERE username = 'admin';
```
ثم أعد الخطوة 6

### **مشكلة 3: "password incorrect"**
✅ **الحل:** تأكد من استخدام كلمة المرور المشفرة الصحيحة من الخطوة 7

### **مشكلة 4: "connection refused"**
✅ **الحل:** تأكد من تشغيل PostgreSQL

---

## 📝 ملخص سريع:

```sql
-- 1. إنشاء الجداول
CREATE TABLE users (...);
CREATE TABLE permissions (...);
CREATE TABLE password_resets (...);

-- 2. إضافة المستخدم
INSERT INTO users VALUES ('admin', ...);

-- 3. إضافة الصلاحيات
INSERT INTO permissions SELECT ...;

-- 4. التحقق
SELECT * FROM users;
SELECT * FROM permissions;
```

---

## ✅ بعد الانتهاء:

1. ✅ جدول المستخدمين موجود
2. ✅ جدول الصلاحيات موجود
3. ✅ المستخدم admin موجود
4. ✅ الصلاحيات معينة
5. ✅ يمكنك تسجيل الدخول!

---

## 🎉 تهانينا!

الآن يمكنك:
- ✅ تسجيل الدخول بـ `admin` / `admin123`
- ✅ إضافة مستخدمين جدد
- ✅ تعيين الصلاحيات
- ✅ استخدام جميع ميزات التطبيق

---

**هل تحتاج مساعدة في أي خطوة؟ أخبرني! 😊**
