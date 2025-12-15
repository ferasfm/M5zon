// عرض إعدادات قاعدة البيانات المحفوظة
console.log('📋 معلومات قاعدة البيانات المستخدمة في التطبيق:\n');

console.log('🔧 الإعدادات الافتراضية في الكود:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Host:     172.10.0.16');
console.log('Port:     5432');
console.log('Database: m5zon_local');
console.log('User:     postgres');
console.log('Password: (يتم إدخالها من المستخدم)');
console.log('');

console.log('🔐 كلمة المرور المستخدمة في السكريبتات:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Password: P@$$w0rd@1234');
console.log('');

console.log('💡 ملاحظات:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. الإعدادات المحفوظة في التطبيق موجودة في localStorage');
console.log('2. لعرض الإعدادات المحفوظة، افتح DevTools واكتب:');
console.log('   localStorage.getItem("localDbConfig")');
console.log('3. لحذف الإعدادات وإعادة الإدخال:');
console.log('   localStorage.removeItem("localDbConfig")');
console.log('');

console.log('🧪 لاختبار الاتصال:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('node scripts/test-local-db.js');
