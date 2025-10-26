// index.ts - نقطة الدخول الرئيسية لنظام إدارة اتصالات قاعدة البيانات المتقدم

// الخدمات الأساسية
export { SecurityService } from './services/SecurityService';
export { SessionManager } from './services/SessionManager';
export { AuditLogger } from './services/AuditLogger';
export { ConnectionManagerService } from './services/ConnectionManagerService';
export { ConnectionHealthMonitor } from './services/ConnectionHealthMonitor';
export { BackupService } from './services/BackupService';
export { OfflineService } from './services/OfflineService';
export { ErrorHandlerService } from './services/ErrorHandlerService';
export { SettingsService } from './services/SettingsService';

// النماذج
export { DatabaseConnectionModel } from './models/DatabaseConnectionModel';

// الأدوات المساعدة
export { ConnectionValidator } from './utils/connectionValidation';
export { PerformanceOptimizer } from './utils/performanceOptimizer';
export { ConnectionStorage } from './services/ConnectionStorage';

// المكونات
export { default as ConnectionStatusPanel } from './components/ConnectionStatusPanel';
export { default as ConnectionListManager } from './components/ConnectionListManager';
export { default as SecuritySettingsPanel } from './components/SecuritySettingsPanel';
export { default as AuditLogViewer } from './components/AuditLogViewer';

// الواجهات والأنواع
export * from './interfaces/database';
export * from './interfaces/services';
export * from './types/database';

// مدير النظام الرئيسي
export class AdvancedDatabaseManager {
  private securityService: SecurityService;
  private sessionManager: SessionManager;
  private auditLogger: AuditLogger;
  private connectionManager: ConnectionManagerService;
  private healthMonitor: ConnectionHealthMonitor;
  private backupService: BackupService;
  private offlineService: OfflineService;
  private errorHandler: ErrorHandlerService;
  private settingsService: SettingsService;
  private performanceOptimizer: PerformanceOptimizer;

  constructor() {
    // تهيئة الخدمات بالترتيب الصحيح
    this.securityService = new SecurityService();
    this.auditLogger = new AuditLogger();
    this.sessionManager = new SessionManager();
    this.connectionManager = new ConnectionManagerService(this.securityService, this.auditLogger);
    this.healthMonitor = new ConnectionHealthMonitor(this.connectionManager, this.auditLogger);
    this.backupService = new BackupService(this.connectionManager, this.auditLogger);
    this.offlineService = new OfflineService(this.connectionManager, this.auditLogger);
    this.errorHandler = new ErrorHandlerService(this.auditLogger);
    this.settingsService = new SettingsService(this.auditLogger, this.securityService);
    this.performanceOptimizer = new PerformanceOptimizer();

    this.initialize();
  }

  // تهيئة النظام
  private async initialize(): Promise<void> {
    try {
      // تهيئة الخدمات
      this.securityService.initialize();
      
      // تحميل الإعدادات
      const settings = this.settingsService.getSettings();
      
      // تطبيق الإعدادات على الخدمات
      this.sessionManager.updateSettings({
        timeout: settings.security.defaultSessionTimeout,
        autoLogout: settings.security.auditLogEnabled
      });

      // بدء مراقبة الصحة
      this.healthMonitor.startMonitoring();

      // تفعيل وضع عدم الاتصال إذا كان مفعلاً
      if (settings.offline.enabled) {
        this.offlineService.enableOfflineMode();
      }

      console.log('تم تهيئة نظام إدارة قواعد البيانات المتقدم بنجاح');
      
    } catch (error) {
      console.error('فشل تهيئة النظام:', error);
      throw error;
    }
  }

  // الحصول على الخدمات
  getSecurityService(): SecurityService {
    return this.securityService;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  getConnectionManager(): ConnectionManagerService {
    return this.connectionManager;
  }

  getHealthMonitor(): ConnectionHealthMonitor {
    return this.healthMonitor;
  }

  getBackupService(): BackupService {
    return this.backupService;
  }

  getOfflineService(): OfflineService {
    return this.offlineService;
  }

  getErrorHandler(): ErrorHandlerService {
    return this.errorHandler;
  }

  getSettingsService(): SettingsService {
    return this.settingsService;
  }

  getPerformanceOptimizer(): PerformanceOptimizer {
    return this.performanceOptimizer;
  }

  // تنظيف الموارد
  cleanup(): void {
    this.securityService.cleanup();
    this.sessionManager.cleanup();
    this.connectionManager.cleanup();
    this.healthMonitor.cleanup();
    this.backupService.cleanup();
    this.offlineService.cleanup();
    this.errorHandler.cleanup();
    this.settingsService.cleanup();
    this.performanceOptimizer.cleanup();
  }
}

// إنشاء مثيل افتراضي
export const databaseManager = new AdvancedDatabaseManager();