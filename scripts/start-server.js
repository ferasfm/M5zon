import { ServerManager } from '../server.config.js';
import { spawn } from 'child_process';

async function main() {
    const manager = new ServerManager();

    try {
        // التحقق من إمكانية البدء
        const success = await manager.start();

        if (!success) {
            process.exit(1);
        }

        // بدء خادم Vite
        console.log('🚀 بدء خادم التطوير...\n');

        const viteProcess = spawn('npx', ['vite'], {
            stdio: 'inherit',
            shell: true
        });

        // معالجة إغلاق العملية
        viteProcess.on('close', (code) => {
            manager.stop();
            process.exit(code);
        });

        viteProcess.on('error', (error) => {
            console.error('خطأ في بدء خادم Vite:', error.message);
            manager.stop();
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

    } catch (error) {
        console.error('خطأ في بدء الخادم:', error.message);
        process.exit(1);
    }
}

main();