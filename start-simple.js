import net from 'net';
import { spawn } from 'child_process';
import os from 'os';

const PORT = 3000;

// فحص توفر المنفذ
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

async function main() {
  console.clear();
  
  console.log('\n🚀 نظام إدارة المخزون الاحترافي');
  console.log('═══════════════════════════════════════');
  
  // فحص المنفذ
  const isPortAvailable = await checkPort(PORT);
  
  if (!isPortAvailable) {
    console.log(`❌ المنفذ ${PORT} مستخدم بالفعل!`);
    console.log(`💡 البرنامج يعمل بالفعل على: http://localhost:${PORT}`);
    console.log(`💡 لإيقاف البرنامج الحالي، اضغط Ctrl+C في Terminal الآخر`);
    console.log('═══════════════════════════════════════\n');
    process.exit(1);
  }
  
  console.log(`✅ المنفذ ${PORT} متاح للاستخدام`);
  console.log(`📡 الخادم سيعمل على: http://localhost:${PORT}`);
  console.log(`🕒 وقت البدء: ${new Date().toLocaleString('ar-SA')}`);
  console.log(`💻 النظام: ${os.platform()} ${os.arch()}`);
  console.log('═══════════════════════════════════════\n');
  
  console.log('🚀 بدء خادم التطوير...\n');
  
  // بدء خادم Vite
  const viteProcess = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
  });
  
  // معالجة إغلاق العملية
  viteProcess.on('close', (code) => {
    console.log('\n🛑 تم إيقاف الخادم');
    process.exit(code);
  });
  
  viteProcess.on('error', (error) => {
    console.error('❌ خطأ في بدء خادم Vite:', error.message);
    process.exit(1);
  });
  
  // معالجة إشارات الإغلاق
  process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    viteProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    viteProcess.kill('SIGTERM');
  });
}

main().catch(error => {
  console.error('❌ خطأ في بدء الخادم:', error.message);
  process.exit(1);
});