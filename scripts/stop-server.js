import { ServerManager } from '../server.config.js';

async function main() {
  const manager = new ServerManager();
  
  try {
    const status = await manager.getStatus();
    
    if (!status.isRunning) {
      console.log('✅ لا توجد عمليات تعمل على المنفذ ' + manager.config.port);
      return;
    }
    
    console.log('🛑 إيقاف الخادم...');
    
    // إيقاف العمليات الموجودة
    if (status.processes.length > 0) {
      await manager.killExistingProcesses(status.processes);
    }
    
    // تنظيف ملفات القفل
    manager.removeLockFile();
    
    console.log('🎉 تم إيقاف الخادم بنجاح');
    
  } catch (error) {
    console.error('خطأ في إيقاف الخادم:', error.message);
    process.exit(1);
  }
}

main();