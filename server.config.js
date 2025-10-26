/**
 * ملف تكوين شامل لإدارة تشغيل البرنامج ومنع التشغيل المتعدد
 * Server Configuration File for Managing Application Startup and Preventing Multiple Instances
 */

import net from 'net';
import { exec, spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعدادات الخادم
const SERVER_CONFIG = {
  // إعدادات المنفذ
  port: 3000,
  host: 'localhost',
  
  // إعدادات الأمان
  security: {
    preventMultipleInstances: true,
    autoKillExisting: false, // تغيير إلى true لإيقاف العمليات الموجودة تلقائياً
    maxRetries: 3,
    retryDelay: 2000, // بالميلي ثانية
  },
  
  // إعدادات التشغيل
  startup: {
    openBrowser: false,
    showLogs: true,
    clearConsole: true,
    showWelcomeMessage: true,
  },
  
  // إعدادات المراقبة
  monitoring: {
    healthCheck: true,
    healthCheckInterval: 30000, // 30 ثانية
    logActivity: true,
    saveProcessInfo: true,
  },
  
  // مسارات الملفات
  paths: {
    lockFile: '.server.lock',
    logFile: 'logs/server.log',
    pidFile: '.server.pid',
  }
};

class ServerManager {
  constructor(config = SERVER_CONFIG) {
    this.config = config;
    this.isRunning = false;
    this.processInfo = null;
    this.healthCheckInterval = null;
    
    // إنشاء مجلد السجلات إذا لم يكن موجوداً
    this.ensureDirectories();
  }
  
  // إنشاء المجلدات المطلوبة
  ensureDirectories() {
    const logDir = path.dirname(this.config.paths.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  // تسجيل الأحداث
  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    
    if (this.config.startup.showLogs) {
      console.log(logMessage);
    }
    
    if (this.config.monitoring.logActivity) {
      fs.appendFileSync(this.config.paths.logFile, logMessage + '\n');
    }
  }
  
  // فحص توفر المنفذ
  async checkPortAvailability(port = this.config.port, host = this.config.host) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, host, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }
  
  // البحث عن العمليات التي تستخدم المنفذ
  async findProcessesUsingPort(port = this.config.port) {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const command = isWindows 
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti :${port}`;
      
      exec(command, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve([]);
          return;
        }
        
        if (isWindows) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              pids.add(parts[4]);
            }
          });
          resolve(Array.from(pids));
        } else {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          resolve(pids);
        }
      });
    });
  }
  
  // إيقاف العمليات الموجودة
  async killExistingProcesses(pids) {
    const isWindows = os.platform() === 'win32';
    const killPromises = pids.map(pid => {
      return new Promise((resolve) => {
        const command = isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
        exec(command, (error) => {
          if (error) {
            this.log(`فشل في إيقاف العملية ${pid}: ${error.message}`, 'ERROR');
          } else {
            this.log(`تم إيقاف العملية ${pid}`, 'SUCCESS');
          }
          resolve();
        });
      });
    });
    
    await Promise.all(killPromises);
  }
  
  // إنشاء ملف القفل
  createLockFile() {
    const lockData = {
      pid: process.pid,
      port: this.config.port,
      startTime: new Date().toISOString(),
      platform: os.platform(),
      nodeVersion: process.version,
    };
    
    fs.writeFileSync(this.config.paths.lockFile, JSON.stringify(lockData, null, 2));
    fs.writeFileSync(this.config.paths.pidFile, process.pid.toString());
  }
  
  // حذف ملف القفل
  removeLockFile() {
    try {
      if (fs.existsSync(this.config.paths.lockFile)) {
        fs.unlinkSync(this.config.paths.lockFile);
      }
      if (fs.existsSync(this.config.paths.pidFile)) {
        fs.unlinkSync(this.config.paths.pidFile);
      }
    } catch (error) {
      this.log(`خطأ في حذف ملفات القفل: ${error.message}`, 'ERROR');
    }
  }
  
  // فحص وجود ملف القفل
  checkLockFile() {
    if (!fs.existsSync(this.config.paths.lockFile)) {
      return null;
    }
    
    try {
      const lockData = JSON.parse(fs.readFileSync(this.config.paths.lockFile, 'utf8'));
      return lockData;
    } catch (error) {
      this.log(`خطأ في قراءة ملف القفل: ${error.message}`, 'ERROR');
      return null;
    }
  }
  
  // بدء مراقبة صحة الخادم
  startHealthCheck() {
    if (!this.config.monitoring.healthCheck) return;
    
    this.healthCheckInterval = setInterval(async () => {
      const isPortAvailable = await this.checkPortAvailability();
      if (isPortAvailable && this.isRunning) {
        this.log('تحذير: المنفذ أصبح متاحاً بشكل غير متوقع', 'WARNING');
        this.isRunning = false;
      }
    }, this.config.monitoring.healthCheckInterval);
  }
  
  // إيقاف مراقبة الصحة
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  // عرض رسالة الترحيب
  showWelcomeMessage() {
    if (!this.config.startup.showWelcomeMessage) return;
    
    console.log('\n🚀 نظام إدارة المخزون الاحترافي');
    console.log('═══════════════════════════════════════');
    console.log(`📡 الخادم يعمل على: http://localhost:${this.config.port}`);
    console.log(`🕒 وقت البدء: ${new Date().toLocaleString('ar-SA')}`);
    console.log(`💻 النظام: ${os.platform()} ${os.arch()}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log('═══════════════════════════════════════\n');
  }
  
  // التحقق من إمكانية التشغيل
  async canStart() {
    // فحص ملف القفل
    const lockData = this.checkLockFile();
    if (lockData) {
      this.log(`ملف القفل موجود - العملية ${lockData.pid} بدأت في ${lockData.startTime}`, 'WARNING');
    }
    
    // فحص توفر المنفذ
    const isPortAvailable = await this.checkPortAvailability();
    if (!isPortAvailable) {
      const processes = await this.findProcessesUsingPort();
      
      if (this.config.security.preventMultipleInstances) {
        this.log(`المنفذ ${this.config.port} مستخدم بواسطة العمليات: ${processes.join(', ')}`, 'ERROR');
        
        if (this.config.security.autoKillExisting && processes.length > 0) {
          this.log('إيقاف العمليات الموجودة تلقائياً...', 'INFO');
          await this.killExistingProcesses(processes);
          
          // انتظار قليل ثم فحص مرة أخرى
          await new Promise(resolve => setTimeout(resolve, 1000));
          const isNowAvailable = await this.checkPortAvailability();
          
          if (!isNowAvailable) {
            this.log('فشل في تحرير المنفذ', 'ERROR');
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return true;
  }
  
  // بدء الخادم
  async start() {
    try {
      if (this.config.startup.clearConsole) {
        console.clear();
      }
      
      this.log('بدء فحص إمكانية تشغيل الخادم...', 'INFO');
      
      const canStart = await this.canStart();
      if (!canStart) {
        this.log('لا يمكن بدء الخادم - المنفذ مستخدم', 'ERROR');
        this.showExistingInstanceInfo();
        process.exit(1);
      }
      
      // إنشاء ملف القفل
      this.createLockFile();
      
      // بدء مراقبة الصحة
      this.startHealthCheck();
      
      // تسجيل معالجات الإغلاق
      this.registerExitHandlers();
      
      this.isRunning = true;
      this.log(`الخادم جاهز للتشغيل على المنفذ ${this.config.port}`, 'SUCCESS');
      this.showWelcomeMessage();
      
      return true;
    } catch (error) {
      this.log(`خطأ في بدء الخادم: ${error.message}`, 'ERROR');
      return false;
    }
  }
  
  // إيقاف الخادم
  async stop() {
    this.log('إيقاف الخادم...', 'INFO');
    
    this.isRunning = false;
    this.stopHealthCheck();
    this.removeLockFile();
    
    this.log('تم إيقاف الخادم بنجاح', 'SUCCESS');
  }
  
  // عرض معلومات النسخة الموجودة
  showExistingInstanceInfo() {
    console.log('\n❌ البرنامج يعمل بالفعل!');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 رابط البرنامج: http://localhost:${this.config.port}`);
    console.log('\n💡 خيارات متاحة:');
    console.log('   • npm run stop          - إيقاف البرنامج الحالي');
    console.log('   • npm run status        - فحص حالة البرنامج');
    console.log('   • npm run dev:force     - تشغيل قسري على منفذ مختلف');
    console.log('   • Ctrl+C في Terminal   - إيقاف يدوي');
    console.log('═══════════════════════════════════════\n');
  }
  
  // تسجيل معالجات الإغلاق
  registerExitHandlers() {
    const cleanup = () => {
      this.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', () => this.removeLockFile());
    
    // معالجة الأخطاء غير المتوقعة
    process.on('uncaughtException', (error) => {
      this.log(`خطأ غير متوقع: ${error.message}`, 'ERROR');
      cleanup();
    });
    
    process.on('unhandledRejection', (reason) => {
      this.log(`رفض غير معالج: ${reason}`, 'ERROR');
      cleanup();
    });
  }
  
  // فحص حالة الخادم
  async getStatus() {
    const lockData = this.checkLockFile();
    const isPortAvailable = await this.checkPortAvailability();
    const processes = await this.findProcessesUsingPort();
    
    return {
      isRunning: !isPortAvailable,
      lockFile: lockData,
      port: this.config.port,
      processes: processes,
      uptime: lockData ? Date.now() - new Date(lockData.startTime).getTime() : 0,
    };
  }
}

// تصدير الكلاس والإعدادات
export {
  ServerManager,
  SERVER_CONFIG,
};

// إذا تم تشغيل الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ServerManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      manager.start();
      break;
      
    case 'stop':
      manager.stop();
      break;
      
    case 'status':
      manager.getStatus().then(status => {
        console.log('حالة الخادم:', JSON.stringify(status, null, 2));
      });
      break;
      
    case 'check':
      manager.canStart().then(canStart => {
        console.log(canStart ? '✅ يمكن بدء الخادم' : '❌ لا يمكن بدء الخادم');
        process.exit(canStart ? 0 : 1);
      });
      break;
      
    default:
      console.log('الاستخدام: node server.config.js [start|stop|status|check]');
  }
}