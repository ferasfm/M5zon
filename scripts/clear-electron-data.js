#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('   مسح بيانات تطبيق Electron');
console.log('========================================\n');

// مسارات بيانات Electron
const appName = 'm5zon-inventory-pro';
const userDataPaths = [
    path.join(process.env.APPDATA || '', appName),
    path.join(process.env.LOCALAPPDATA || '', appName),
    path.join(process.env.HOME || '', '.config', appName),
];

let cleared = false;

userDataPaths.forEach(dataPath => {
    if (fs.existsSync(dataPath)) {
        try {
            console.log(`🔍 وجدت بيانات في: ${dataPath}`);
            
            // حذف المجلد بالكامل
            fs.rmSync(dataPath, { recursive: true, force: true });
            
            console.log(`✅ تم مسح البيانات من: ${dataPath}\n`);
            cleared = true;
        } catch (error) {
            console.error(`❌ خطأ في مسح البيانات من ${dataPath}:`, error.message);
        }
    }
});

if (!cleared) {
    console.log('ℹ️  لا توجد بيانات محفوظة للمسح\n');
}

console.log('========================================');
console.log('   ✨ اكتمل! ✨');
console.log('========================================\n');

if (cleared) {
    console.log('📝 الآن عند تشغيل التطبيق:');
    console.log('   - ستظهر صفحة تسجيل الدخول');
    console.log('   - أدخل: admin / admin123\n');
} else {
    console.log('💡 نصيحة: إذا كان التطبيق يعمل، أغلقه أولاً ثم أعد تشغيل هذا السكريبت\n');
}
