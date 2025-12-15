#!/usr/bin/env node

import bcrypt from 'bcryptjs';

console.log('========================================');
console.log('   توليد كلمة مرور مشفرة');
console.log('========================================\n');

// كلمة المرور الافتراضية
const password = 'admin123';

console.log(`كلمة المرور: ${password}`);
console.log('\nجاري التشفير...\n');

// تشفير كلمة المرور
const hashedPassword = bcrypt.hashSync(password, 10);

console.log('✅ تم التشفير بنجاح!\n');
console.log('========================================');
console.log('كلمة المرور المشفرة:');
console.log('========================================');
console.log(hashedPassword);
console.log('========================================\n');

console.log('📋 انسخ السطر أعلاه واستخدمه في ملف SQL\n');
console.log('📝 استبدل هذا الجزء في setup-auth-complete.sql:');
console.log("   '$2a$10$rQZ5YJ5YJ5YJ5YJ5YJ5YJO...'");
console.log('   بالسطر المشفر أعلاه\n');

console.log('========================================');
console.log('   ✨ اكتمل! ✨');
console.log('========================================\n');
