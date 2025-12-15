// سكريبت لاستخراج كلمة المرور من ملفات التطبيق
import fs from 'fs';
import path from 'path';

console.log('🔍 البحث عن كلمات المرور في ملفات المشروع...\n');

const filesToCheck = [
    'scripts/test-local-db.js',
    'scripts/check-products-categories.js',
    'restore_to_local.bat'
];

console.log('📂 الملفات التي تحتوي على معلومات قاعدة البيانات:\n');

filesToCheck.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');

            // البحث عن كلمة المرور
            const passwordMatch = content.match(/password[:\s]*['"]([^'"]+)['"]/i);
            const hostMatch = content.match(/host[:\s]*['"]([^'"]+)['"]/i);
            const databaseMatch = content.match(/database[:\s]*['"]([^'"]+)['"]/i);
            const userMatch = content.match(/user[:\s]*['"]([^'"]+)['"]/i);

            if (passwordMatch || hostMatch) {
                console.log(`📄 ${file}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                if (hostMatch) console.log(`   Host:     ${hostMatch[1]}`);
                if (databaseMatch) console.log(`   Database: ${databaseMatch[1]}`);
                if (userMatch) console.log(`   User:     ${userMatch[1]}`);
                if (passwordMatch) console.log(`   Password: ${passwordMatch[1]}`);
                console.log('');
            }
        }
    } catch (error) {
        console.log(`⚠️  خطأ في قراءة ${file}: ${error.message}`);
    }
});

console.log('\n💡 طرق أخرى لمعرفة كلمة المرور:\n');
console.log('1️⃣  من خلال التطبيق:');
console.log('   - افتح التطبيق');
console.log('   - اضغط F12 لفتح DevTools');
console.log('   - في Console اكتب: localStorage.getItem("localDbConfig")');
console.log('   - ستظهر جميع المعلومات بما فيها كلمة المرور\n');

console.log('2️⃣  من خلال ملف HTML:');
console.log('   - افتح الملف: scripts/show-saved-password.html');
console.log('   - في المتصفح (يجب أن يكون نفس المتصفح المستخدم في التطبيق)\n');

console.log('3️⃣  إعادة تعيين كلمة المرور:');
console.log('   - إذا كنت تملك صلاحيات PostgreSQL');
console.log('   - يمكنك إعادة تعيين كلمة المرور من pgAdmin أو psql\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
