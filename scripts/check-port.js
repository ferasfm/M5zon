import { ServerManager } from '../server.config.js';

async function main() {
  const manager = new ServerManager();
  
  try {
    const canStart = await manager.canStart();
    
    if (!canStart) {
      manager.showExistingInstanceInfo();
      process.exit(1);
    }
    
    console.log(`✅ المنفذ ${manager.config.port} متاح للاستخدام`);
  } catch (error) {
    console.error('خطأ في فحص المنفذ:', error.message);
    process.exit(1);
  }
}

main();