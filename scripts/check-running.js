import { ServerManager } from '../server.config.js';

async function main() {
  const manager = new ServerManager();
  
  try {
    const status = await manager.getStatus();
    
    console.log('\n📊 حالة الخادم');
    console.log('═══════════════════════════════════════');
    
    if (status.isRunning) {
      console.log('🟢 الحالة: يعمل');
      console.log(`📡 المنفذ: ${status.port}`);
      console.log(`🌐 الرابط: http://localhost:${status.port}`);
      
      if (status.lockFile) {
        console.log(`🆔 معرف العملية: ${status.lockFile.pid}`);
        console.log(`🕒 وقت البدء: ${new Date(status.lockFile.startTime).toLocaleString('ar-SA')}`);
        console.log(`⏱️ مدة التشغيل: ${Math.floor(status.uptime / 1000)} ثانية`);
        console.log(`💻 النظام: ${status.lockFile.platform}`);
        console.log(`⚡ إصدار Node.js: ${status.lockFile.nodeVersion}`);
      }
      
      if (status.processes.length > 0) {
        console.log(`🔍 العمليات النشطة: ${status.processes.join(', ')}`);
      }
    } else {
      console.log('🔴 الحالة: متوقف');
      console.log(`📡 المنفذ ${status.port}: متاح`);
    }
    
    console.log('═══════════════════════════════════════\n');
    
    if (status.isRunning) {
      process.exit(1); // إشارة أن البرنامج يعمل
    }
  } catch (error) {
    console.error('خطأ في فحص العمليات:', error.message);
    process.exit(1);
  }
}

main();