// services/SettingsService.ts - خدمة إدارة الإعدادات العامة

import { ISettingsService } from '../interfaces/services';
import { SystemSettings } from '../interfaces/database';
import { AuditLogger } from './AuditLogger';
import { SecurityService } from './SecurityService';
import { ActivityType, SYSTEM_CONSTANTS } from '../types/database';

export class SettingsService implements ISettingsService {
  private auditLogger: AuditLogger;
  private securityService: SecurityService;
  private settings: SystemSettings;
  private settingsCallbacks: ((settings: SystemSettings) => void)[] = [];
  private storageKey = 'system_settings';

  constructor(auditLogger: AuditLogger, securityService: SecurityService) {
    this.auditLogger = auditLogger;
    this.securityService = securityService;
    
    // الإعدادات الافتراضية
    this.settings = this.getDefaultSettings();
    
    this.initialize();
  }

  // تهيئة الخدمة
  private async initialize(): Promise<void> {
    try {
      // تحميل الإعدادات المحفوظة
      await this.loadSettings();
      
      this.auditLogger.logActivity({
        action: ActivityType.CONNECT,
        connectionId: 'system',
        connectionName: 'خدمة الإعدادات',
        success: true
      });
      
    } catch (error) {
      console.error('فشل تهيئة خدمة الإعدادات:', error);
      
      // استخدام الإعدادات الافتراضية في حالة الفشل
      this.settings = this.getDefaultSettings();
    }
  }

  // الحصول على الإعدادات الافتراضية
  private getDefaultSettings(): SystemSettings {
    return {
      security: {
        globalEncryption: true,
        defaultSessionTimeout: SYSTEM_CONSTANTS.DEFAULT_SESSION_TIMEOUT,
        maxConnectionAttempts: SYSTEM_CONSTANTS.MAX_CONNECTION_ATTEMPTS,
        lockoutDuration: 300, // 5 دقائق
        auditLogEnabled: true
      },
      backup: {
        defaultRetentionDays: SYSTEM_CONSTANTS.DEFAULT_BACKUP_RETENTION,
        compressionEnabled: true,
        autoBackupBeforeDisconnect: true,
        maxBackupSize: SYSTEM_CONSTANTS.MAX_BACKUP_SIZE
      },
      offline: {
        enabled: true,
        maxCacheSize: SYSTEM_CONSTANTS.MAX_CACHE_SIZE,
        syncInterval: SYSTEM_CONSTANTS.DEFAULT_SYNC_INTERVAL,
        conflictResolutionStrategy: 'manual'
      },
      ui: {
        theme: 'light',
        language: 'ar',
        showAdvancedOptions: false,
        autoRefreshInterval: 30000 // 30 ثانية
      }
    };
  }

  // الحصول على جميع الإعدادات
  getSettings(): SystemSettings {
    return JSON.parse(JSON.stringify(this.settings)); // نسخة عميقة
  }

  // تحديث الإعدادات
  updateSettings(newSettings: Partial<SystemSettings>): void {
    const oldSettings = { ...this.settings };
    
    try {
      // دمج الإعدادات الجديدة
      this.settings = this.mergeSettings(this.settings, newSettings);
      
      // التحقق من صحة الإعدادات
      this.validateSettings(this.settings);
      
      // حفظ الإعدادات
      this.saveSettings();
      
      // تسجيل التغيير
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: 'تحديث الإعدادات',
        success: true
      });
      
      // إشعار المستمعين
      this.notifySettingsChange(this.settings);
      
    } catch (error) {
      // استعادة الإعدادات السابقة في حالة الخطأ
      this.settings = oldSettings;
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: 'فشل تحديث الإعدادات',
        success: false,
        errorMessage: (error as Error).message
      });
      
      throw error;
    }
  }

  // إعادة تعيين إلى الإعدادات الافتراضية
  resetToDefaults(): void {
    const defaultSettings = this.getDefaultSettings();
    this.updateSettings(defaultSettings);
    
    this.auditLogger.logActivity({
      action: ActivityType.TEST,
      connectionId: 'system',
      connectionName: 'إعادة تعيين الإعدادات الافتراضية',
      success: true
    });
  }

  // الحصول على إعدادات الأمان
  getSecuritySettings(): SystemSettings['security'] {
    return { ...this.settings.security };
  }

  // تحديث إعدادات الأمان
  updateSecuritySettings(settings: Partial<SystemSettings['security']>): void {
    this.updateSettings({
      security: { ...this.settings.security, ...settings }
    });
  }

  // الحصول على إعدادات النسخ الاحتياطي
  getBackupSettings(): SystemSettings['backup'] {
    return { ...this.settings.backup };
  }

  // تحديث إعدادات النسخ الاحتياطي
  updateBackupSettings(settings: Partial<SystemSettings['backup']>): void {
    this.updateSettings({
      backup: { ...this.settings.backup, ...settings }
    });
  }

  // الحصول على إعدادات العمل بدون اتصال
  getOfflineSettings(): SystemSettings['offline'] {
    return { ...this.settings.offline };
  }

  // تحديث إعدادات العمل بدون اتصال
  updateOfflineSettings(settings: Partial<SystemSettings['offline']>): void {
    this.updateSettings({
      offline: { ...this.settings.offline, ...settings }
    });
  }

  // الحصول على إعدادات واجهة المستخدم
  getUISettings(): SystemSettings['ui'] {
    return { ...this.settings.ui };
  }

  // تحديث إعدادات واجهة المستخدم
  updateUISettings(settings: Partial<SystemSettings['ui']>): void {
    this.updateSettings({
      ui: { ...this.settings.ui, ...settings }
    });
  }

  // تصدير الإعدادات
  exportSettings(): string {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      settings: this.settings
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // استيراد الإعدادات
  importSettings(settingsJson: string): void {
    try {
      const importData = JSON.parse(settingsJson);
      
      // التحقق من صحة البيانات المستوردة
      if (!importData.settings) {
        throw new Error('بيانات الإعدادات غير صحيحة');
      }
      
      // التحقق من الإصدار
      if (importData.version && importData.version !== '1.0') {
        console.warn('إصدار الإعدادات المستوردة مختلف، قد تحدث مشاكل في التوافق');
      }
      
      // تطبيق الإعدادات المستوردة
      this.updateSettings(importData.settings);
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: 'استيراد الإعدادات',
        success: true
      });
      
    } catch (error) {
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: 'فشل استيراد الإعدادات',
        success: false,
        errorMessage: (error as Error).message
      });
      
      throw new Error(`فشل استيراد الإعدادات: ${(error as Error).message}`);
    }
  }

  // دمج الإعدادات
  private mergeSettings(current: SystemSettings, updates: Partial<SystemSettings>): SystemSettings {
    const merged = { ...current };
    
    if (updates.security) {
      merged.security = { ...current.security, ...updates.security };
    }
    
    if (updates.backup) {
      merged.backup = { ...current.backup, ...updates.backup };
    }
    
    if (updates.offline) {
      merged.offline = { ...current.offline, ...updates.offline };
    }
    
    if (updates.ui) {
      merged.ui = { ...current.ui, ...updates.ui };
    }
    
    return merged;
  }

  // التحقق من صحة الإعدادات
  private validateSettings(settings: SystemSettings): void {
    const errors: string[] = [];
    
    // التحقق من إعدادات الأمان
    if (settings.security.defaultSessionTimeout < 1 || settings.security.defaultSessionTimeout > 1440) {
      errors.push('مهلة الجلسة الافتراضية يجب أن تكون بين 1 و 1440 دقيقة');
    }
    
    if (settings.security.maxConnectionAttempts < 1 || settings.security.maxConnectionAttempts > 10) {
      errors.push('عدد محاولات الاتصال يجب أن يكون بين 1 و 10');
    }
    
    if (settings.security.lockoutDuration < 60 || settings.security.lockoutDuration > 3600) {
      errors.push('مدة الحظر يجب أن تكون بين 60 و 3600 ثانية');
    }
    
    // التحقق من إعدادات النسخ الاحتياطي
    if (settings.backup.defaultRetentionDays < 1 || settings.backup.defaultRetentionDays > 365) {
      errors.push('مدة الاحتفاظ بالنسخ الاحتياطية يجب أن تكون بين 1 و 365 يوم');
    }
    
    if (settings.backup.maxBackupSize < 1024 * 1024 || settings.backup.maxBackupSize > 1024 * 1024 * 1024) {
      errors.push('حجم النسخة الاحتياطية يجب أن يكون بين 1MB و 1GB');
    }
    
    // التحقق من إعدادات العمل بدون اتصال
    if (settings.offline.maxCacheSize < 1024 * 1024 || settings.offline.maxCacheSize > 500 * 1024 * 1024) {
      errors.push('حجم التخزين المؤقت يجب أن يكون بين 1MB و 500MB');
    }
    
    if (settings.offline.syncInterval < 1000 || settings.offline.syncInterval > 300000) {
      errors.push('فترة المزامنة يجب أن تكون بين 1 و 300 ثانية');
    }
    
    // التحقق من إعدادات واجهة المستخدم
    if (!['light', 'dark', 'auto'].includes(settings.ui.theme)) {
      errors.push('سمة واجهة المستخدم غير صحيحة');
    }
    
    if (!['ar', 'en'].includes(settings.ui.language)) {
      errors.push('لغة واجهة المستخدم غير مدعومة');
    }
    
    if (settings.ui.autoRefreshInterval < 5000 || settings.ui.autoRefreshInterval > 300000) {
      errors.push('فترة التحديث التلقائي يجب أن تكون بين 5 و 300 ثانية');
    }
    
    if (errors.length > 0) {
      throw new Error(`إعدادات غير صحيحة:\n${errors.join('\n')}`);
    }
  }

  // حفظ الإعدادات
  private async saveSettings(): Promise<void> {
    try {
      let dataToSave = JSON.stringify(this.settings);
      
      // تشفير الإعدادات إذا كان مفعلاً
      if (this.settings.security.globalEncryption) {
        dataToSave = await this.securityService.encryptConnectionData(dataToSave);
      }
      
      localStorage.setItem(this.storageKey, dataToSave);
      localStorage.setItem(`${this.storageKey}_meta`, JSON.stringify({
        encrypted: this.settings.security.globalEncryption,
        lastModified: new Date().toISOString(),
        version: '1.0'
      }));
      
    } catch (error) {
      throw new Error(`فشل حفظ الإعدادات: ${(error as Error).message}`);
    }
  }

  // تحميل الإعدادات
  private async loadSettings(): Promise<void> {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (!savedData) {
        return; // لا توجد إعدادات محفوظة
      }
      
      // تحميل معلومات التشفير
      const metaData = localStorage.getItem(`${this.storageKey}_meta`);
      let isEncrypted = false;
      
      if (metaData) {
        const meta = JSON.parse(metaData);
        isEncrypted = meta.encrypted || false;
      }
      
      // فك التشفير إذا لزم الأمر
      let dataToProcess = savedData;
      if (isEncrypted) {
        dataToProcess = await this.securityService.decryptConnectionData(savedData);
      }
      
      // تحليل البيانات
      const loadedSettings = JSON.parse(dataToProcess);
      
      // دمج مع الإعدادات الافتراضية لضمان وجود جميع الحقول
      this.settings = this.mergeSettings(this.getDefaultSettings(), loadedSettings);
      
      // التحقق من صحة الإعدادات المحملة
      this.validateSettings(this.settings);
      
    } catch (error) {
      console.error('فشل تحميل الإعدادات:', error);
      throw error;
    }
  }

  // الحصول على إعداد محدد
  getSetting<T>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.settings;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current as T;
  }

  // تحديث إعداد محدد
  setSetting(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      throw new Error('مسار الإعداد غير صحيح');
    }
    
    let current: any = this.settings;
    
    // التنقل إلى الكائن الأب
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // تحديث القيمة
    current[lastKey] = value;
    
    // التحقق من صحة الإعدادات وحفظها
    this.validateSettings(this.settings);
    this.saveSettings();
    
    // إشعار المستمعين
    this.notifySettingsChange(this.settings);
  }

  // إنشاء ملف تعريف إعدادات
  createProfile(name: string, settings?: Partial<SystemSettings>): void {
    const profileSettings = settings || this.settings;
    const profileKey = `settings_profile_${name}`;
    
    try {
      localStorage.setItem(profileKey, JSON.stringify({
        name,
        settings: profileSettings,
        createdAt: new Date().toISOString()
      }));
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: `إنشاء ملف تعريف: ${name}`,
        success: true
      });
      
    } catch (error) {
      throw new Error(`فشل إنشاء ملف التعريف: ${(error as Error).message}`);
    }
  }

  // تحميل ملف تعريف إعدادات
  loadProfile(name: string): void {
    const profileKey = `settings_profile_${name}`;
    
    try {
      const profileData = localStorage.getItem(profileKey);
      if (!profileData) {
        throw new Error('ملف التعريف غير موجود');
      }
      
      const profile = JSON.parse(profileData);
      this.updateSettings(profile.settings);
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: `تحميل ملف تعريف: ${name}`,
        success: true
      });
      
    } catch (error) {
      throw new Error(`فشل تحميل ملف التعريف: ${(error as Error).message}`);
    }
  }

  // الحصول على قائمة ملفات التعريف
  getProfiles(): Array<{ name: string; createdAt: Date }> {
    const profiles: Array<{ name: string; createdAt: Date }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('settings_profile_')) {
        try {
          const profileData = localStorage.getItem(key);
          if (profileData) {
            const profile = JSON.parse(profileData);
            profiles.push({
              name: profile.name,
              createdAt: new Date(profile.createdAt)
            });
          }
        } catch (error) {
          console.error('خطأ في قراءة ملف التعريف:', error);
        }
      }
    }
    
    return profiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // حذف ملف تعريف
  deleteProfile(name: string): void {
    const profileKey = `settings_profile_${name}`;
    localStorage.removeItem(profileKey);
    
    this.auditLogger.logActivity({
      action: ActivityType.TEST,
      connectionId: 'system',
      connectionName: `حذف ملف تعريف: ${name}`,
      success: true
    });
  }

  // تسجيل معالج تغيير الإعدادات
  onSettingsChange(callback: (settings: SystemSettings) => void): void {
    this.settingsCallbacks.push(callback);
  }

  // إزالة معالج تغيير الإعدادات
  removeSettingsCallback(callback: (settings: SystemSettings) => void): void {
    this.settingsCallbacks = this.settingsCallbacks.filter(cb => cb !== callback);
  }

  // إشعار المستمعين بتغيير الإعدادات
  private notifySettingsChange(settings: SystemSettings): void {
    this.settingsCallbacks.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('خطأ في معالج تغيير الإعدادات:', error);
      }
    });
  }

  // الحصول على معلومات النظام
  getSystemInfo(): {
    version: string;
    platform: string;
    userAgent: string;
    language: string;
    timezone: string;
    storageUsage: number;
    totalStorage: number;
  } {
    // حساب استخدام التخزين
    let storageUsage = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            storageUsage += new Blob([key + value]).size;
          }
        }
      }
    } catch (error) {
      console.error('فشل حساب استخدام التخزين:', error);
    }

    return {
      version: '1.0.0',
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      storageUsage,
      totalStorage: 5 * 1024 * 1024 // 5MB تقريبي للتخزين المحلي
    };
  }

  // تنظيف الموارد
  cleanup(): void {
    this.settingsCallbacks = [];
    this.saveSettings().catch(error => {
      console.error('فشل حفظ الإعدادات عند التنظيف:', error);
    });
  }
}