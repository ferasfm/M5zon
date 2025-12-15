# 🛠️ دليل تشغيل نسخة المطور

## 🚀 طرق تشغيل نسخة المطور

### الطريقة 1: استخدام ملف BAT (الأسهل)
```bash
start-dev.bat
```
أو انقر مرتين على الملف `start-dev.bat`

### الطريقة 2: من Command Line
```bash
npm run dev:electron
```

### الطريقة 3: تشغيل Vite فقط (للتطوير السريع)
```bash
npm run dev
```
ثم افتح المتصفح على: http://localhost:5173

## 📊 ما الفرق بين نسخة المطور والنسخة المبنية؟

| الميزة | نسخة المطور | النسخة المبنية |
|--------|-------------|-----------------|
| DevTools | ✅ مفتوحة تلقائياً | ❌ مغلقة |
| Hot Reload | ✅ تحديث تلقائي | ❌ يحتاج إعادة بناء |
| Console Logs | ✅ مرئية | ❌ مخفية |
| حجم الملف | 🔴 كبير | 🟢 صغير |
| السرعة | 🟡 متوسطة | 🟢 سريعة |

## 🔍 كيفية استخدام DevTools

### 1. فتح Console
- DevTools تفتح تلقائياً في نسخة المطور
- أو اضغط `F12` في أي وقت
- اذهب إلى تبويب **Console**

### 2. مراقبة الاتصال بقاعدة البيانات
ابحث عن هذه الرسائل:
```
🔌 Connecting to database...
✅ تم الاتصال بـ PostgreSQL بنجاح
🔍 Executing SQL: SELECT * FROM products
✅ Query successful, rows: 10
```

### 3. اختبار الاتصال يدوياً
في Console اكتب:
```javascript
// فحص وجود electron API
window.electron

// فحص حالة الاتصال
await window.electron.database.isConnected()

// اختبار استعلام بسيط
await window.electron.database.query("SELECT NOW()", [])

// عرض الإعدادات المحفوظة
JSON.parse(localStorage.getItem("localDbConfig"))
```

### 4. تتبع الأخطاء
1. اذهب إلى تبويب **Sources**
2. فعّل "Pause on exceptions" (أيقونة ⏸️)
3. أعد تحميل الصفحة
4. سيتوقف عند أي خطأ يحدث

## 🐛 تشخيص مشكلة "d is not a function"

### الخطوة 1: تحديد مكان الخطأ
عندما يظهر الخطأ، انظر إلى:
- **اسم الملف** الذي حدث فيه الخطأ
- **رقم السطر**
- **Stack trace** (تتبع المكالمات)

### الخطوة 2: فحص القيم
في Console اكتب:
```javascript
// فحص نوع المتغير
typeof d

// فحص محتوى المتغير
console.log(d)

// فحص جميع الخصائص
console.dir(d)
```

### الخطوة 3: اختبار الدوال
```javascript
// اختبار localDb
window.localDb = (await import('./services/DatabaseService.ts')).localDb

// اختبار from()
const query = window.localDb.from('products')
console.log(query)

// اختبار select()
const result = await query.select('*')
console.log(result)
```

## 📝 Logging مفيد

### في الكود، أضف:
```javascript
console.log('🔍 Debug point 1:', variable)
console.error('❌ Error:', error)
console.warn('⚠️ Warning:', warning)
console.table(arrayData) // لعرض المصفوفات بشكل جدول
```

### في Console:
```javascript
// تفعيل logging مفصل
localStorage.setItem('debug', 'true')

// إيقاف logging
localStorage.removeItem('debug')
```

## 🔄 إعادة التشغيل

### إعادة تشغيل سريعة
- احفظ أي ملف في المشروع
- التطبيق سيتحدث تلقائياً

### إعادة تشغيل كاملة
1. أغلق التطبيق
2. في Terminal اضغط `Ctrl+C`
3. شغّل مرة أخرى: `npm run dev:electron`

## 🎯 نصائح للتطوير

1. **استخدم Console بكثرة** - لا تخف من إضافة `console.log` في كل مكان
2. **فعّل Pause on exceptions** - لتتبع الأخطاء فوراً
3. **استخدم Breakpoints** - ضع نقاط توقف في الكود
4. **راقب Network** - لمتابعة الطلبات (إن وجدت)
5. **استخدم React DevTools** - لفحص Components

## 🆘 إذا توقف التطبيق

### المشكلة: Port 5173 مشغول
```bash
# إيقاف العملية على Port 5173
netstat -ano | findstr :5173
taskkill /PID <رقم_العملية> /F
```

### المشكلة: Electron لا يفتح
```bash
# تأكد من تثبيت Electron
npm install electron --save-dev

# أعد تشغيل
npm run dev:electron
```

### المشكلة: تغييرات لا تظهر
```bash
# امسح الـ cache
rmdir /s /q node_modules\.vite
npm run dev:electron
```

## 📞 معلومات إضافية

- **Vite Server:** http://localhost:5173
- **Electron Version:** 39.0.0
- **React Version:** 19.2.0
- **Node Version:** (تحقق بـ `node --version`)

## 🎨 تخصيص DevTools

في `electron/main.js`:
```javascript
// لفتح DevTools في تبويب منفصل
mainWindow.webContents.openDevTools({ mode: 'detach' })

// لفتح DevTools في الأسفل
mainWindow.webContents.openDevTools({ mode: 'bottom' })

// لفتح DevTools على اليمين
mainWindow.webContents.openDevTools({ mode: 'right' })
```
