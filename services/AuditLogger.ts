// services/AuditLogger.ts - نظام تسجيل الأنشطة والمراجعة

import { ConnectionActivity, DatabaseError } from '../interfaces/database';
import { ActivityType, ErrorType, SYSTEM_CONSTANTS } from '../types/database';

export interface AuditLogEntry extends ConnectionActivity {
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'connection' | 'security' | 'backup' | 'sync' | 'system';
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  connectionId?: string;
  action?: ActivityType;
  level?: AuditLogEntry['level'];
  category?: AuditLogEntry['category'];
  success?: boolean;
  limit?: number;
}

export interface AuditLogStats {
  totalEntries: number;
  successfulActions: number;
  failedActions: number;
  byLevel: Record<AuditLogEntry['level'], number>;
  byCategory: Record<AuditLogEntry['category'], number>;
  byAction: Record<ActivityType, number>;
  recentActivity: AuditLogEntry[];
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxEntries: number = SYSTEM_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES;
  private storageKey: string = 'audit_log_entries';
  private isEnabled: boolean = true;
  private logCallbacks: ((entry: AuditLogEntry) => void)[] = [];

  constructor(maxEntries?: number) {
    if (maxEntries) {
      this.maxEntries = maxEntries;
    }
    this.loadLogs();
  }

  // تسجيل نشاط جديد
  logActivity(activity: Omit<ConnectionActivity, 'id' | 'timestamp'>, options?: {
    level?: AuditLogEntry['level'];
    category?: AuditLogEntry['category'];
    metadata?: Record<string, any>;
  }): void {
    if (!this.isEnabled) {
      return;
    }

    const entry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: options?.level || (activity.success ? 'info' : 'error'),
      category: this.categorizeActivity(activity.action),
      metadata: options?.metadata,
      ipAddress: this.getClientInfo().ip,
      userAgent: this.getClientInfo().userAgent,
      ...activity
    };

    // إضافة إلى بداية المصفوفة (الأحدث أولاً)
    this.logs.unshift(entry);

    // الحفاظ على الحد الأقصى من الإدخالات
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    // حفظ في التخزين المحلي
    this.saveLogs();

    // إشعار المستمعين
    this.notifyCallbacks(entry);
  }

  // تسجيل خطأ
  logError(error: DatabaseError, connectionId?: string): void {
    this.logActivity({
      action: this.getActionFromError(error.type),
      connectionId: connectionId || 'unknown',
      connectionName: 'خطأ في النظام',
      success: false,
      errorMessage: error.message,
      duration: 0
    }, {
      level: this.getErrorLevel(error.type),
      category: this.getCategoryFromError(error.type),
      metadata: {
        errorType: error.type,
        details: error.details,
        recoverable: error.recoverable,
        suggestedActions: error.suggestedActions
      }
    });
  }

  // تسجيل نشاط الاتصال
  logConnection(connectionId: string, connectionName: string, action: 'connect' | 'disconnect' | 'test', success: boolean, duration?: number, error?: string): void {
    this.logActivity({
      action: action as ActivityType,
      connectionId,
      connectionName,
      success,
      errorMessage: error,
      duration
    }, {
      level: success ? 'info' : 'warning',
      category: 'connection'
    });
  }

  // تسجيل نشاط النسخ الاحتياطي
  logBackup(connectionId: string, connectionName: string, action: 'backup' | 'restore', success: boolean, metadata?: Record<string, any>): void {
    this.logActivity({
      action: action as ActivityType,
      connectionId,
      connectionName,
      success
    }, {
      level: success ? 'info' : 'error',
      category: 'backup',
      metadata
    });
  }

  // تسجيل نشاط الأمان
  logSecurity(action: ActivityType, connectionId: string, success: boolean, metadata?: Record<string, any>): void {
    this.logActivity({
      action,
      connectionId,
      connectionName: 'نشاط أمني',
      success
    }, {
      level: success ? 'info' : 'critical',
      category: 'security',
      metadata
    });
  }

  // تسجيل نشاط المزامنة
  logSync(connectionId: string, connectionName: string, success: boolean, metadata?: Record<string, any>): void {
    this.logActivity({
      action: ActivityType.SYNC,
      connectionId,
      connectionName,
      success
    }, {
      level: success ? 'info' : 'warning',
      category: 'sync',
      metadata
    });
  }

  // الحصول على السجلات مع التصفية
  getLogs(filter?: AuditLogFilter): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      // تصفية حسب التاريخ
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }

      // تصفية حسب معرف الاتصال
      if (filter.connectionId) {
        filteredLogs = filteredLogs.filter(log => log.connectionId === filter.connectionId);
      }

      // تصفية حسب النشاط
      if (filter.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filter.action);
      }

      // تصفية حسب المستوى
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }

      // تصفية حسب الفئة
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      // تصفية حسب النجاح
      if (filter.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === filter.success);
      }

      // تحديد العدد
      if (filter.limit && filter.limit > 0) {
        filteredLogs = filteredLogs.slice(0, filter.limit);
      }
    }

    return filteredLogs;
  }

  // الحصول على إحصائيات السجل
  getStats(): AuditLogStats {
    const stats: AuditLogStats = {
      totalEntries: this.logs.length,
      successfulActions: this.logs.filter(log => log.success).length,
      failedActions: this.logs.filter(log => !log.success).length,
      byLevel: { info: 0, warning: 0, error: 0, critical: 0 },
      byCategory: { connection: 0, security: 0, backup: 0, sync: 0, system: 0 },
      byAction: {} as Record<ActivityType, number>,
      recentActivity: this.logs.slice(0, 10)
    };

    // إحصائيات حسب المستوى
    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
      
      if (!stats.byAction[log.action]) {
        stats.byAction[log.action] = 0;
      }
      stats.byAction[log.action]++;
    });

    return stats;
  }

  // البحث في السجلات
  searchLogs(query: string): AuditLogEntry[] {
    const searchTerm = query.toLowerCase();
    
    return this.logs.filter(log => 
      log.connectionName.toLowerCase().includes(searchTerm) ||
      log.action.toLowerCase().includes(searchTerm) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(searchTerm)) ||
      log.connectionId.toLowerCase().includes(searchTerm)
    );
  }

  // تصدير السجلات
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalEntries: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  // تصدير إلى CSV
  private exportToCSV(): string {
    const headers = [
      'التاريخ والوقت',
      'المستوى',
      'الفئة',
      'النشاط',
      'معرف الاتصال',
      'اسم الاتصال',
      'النجاح',
      'رسالة الخطأ',
      'المدة',
      'عنوان IP'
    ];

    const rows = this.logs.map(log => [
      log.timestamp.toLocaleString('ar-SA'),
      log.level,
      log.category,
      log.action,
      log.connectionId,
      log.connectionName,
      log.success ? 'نعم' : 'لا',
      log.errorMessage || '',
      log.duration?.toString() || '',
      log.ipAddress || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // استيراد السجلات
  importLogs(data: string): void {
    try {
      const imported = JSON.parse(data);
      if (imported.logs && Array.isArray(imported.logs)) {
        const validLogs = imported.logs
          .map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }))
          .filter((log: any) => this.isValidLogEntry(log));

        this.logs = [...validLogs, ...this.logs].slice(0, this.maxEntries);
        this.saveLogs();
      }
    } catch (error) {
      throw new Error('فشل استيراد السجلات: تنسيق غير صحيح');
    }
  }

  // مسح السجلات
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }

  // مسح السجلات القديمة
  clearOldLogs(daysOld: number): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    this.saveLogs();
  }

  // تفعيل/إلغاء تفعيل التسجيل
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // التحقق من حالة التفعيل
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  // تسجيل معالج للسجلات الجديدة
  onNewLog(callback: (entry: AuditLogEntry) => void): void {
    this.logCallbacks.push(callback);
  }

  // إزالة معالج
  removeLogCallback(callback: (entry: AuditLogEntry) => void): void {
    this.logCallbacks = this.logCallbacks.filter(cb => cb !== callback);
  }

  // إشعار المعالجات
  private notifyCallbacks(entry: AuditLogEntry): void {
    this.logCallbacks.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('خطأ في معالج السجل:', error);
      }
    });
  }

  // تصنيف النشاط
  private categorizeActivity(action: ActivityType): AuditLogEntry['category'] {
    switch (action) {
      case ActivityType.CONNECT:
      case ActivityType.DISCONNECT:
      case ActivityType.TEST:
        return 'connection';
      case ActivityType.LOGIN:
      case ActivityType.LOGOUT:
        return 'security';
      case ActivityType.BACKUP:
      case ActivityType.RESTORE:
        return 'backup';
      case ActivityType.SYNC:
        return 'sync';
      default:
        return 'system';
    }
  }

  // الحصول على النشاط من نوع الخطأ
  private getActionFromError(errorType: ErrorType): ActivityType {
    switch (errorType) {
      case ErrorType.CONNECTION_FAILED:
      case ErrorType.NETWORK_ERROR:
        return ActivityType.CONNECT;
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.SESSION_EXPIRED:
        return ActivityType.LOGIN;
      case ErrorType.BACKUP_FAILED:
        return ActivityType.BACKUP;
      case ErrorType.SYNC_CONFLICT:
        return ActivityType.SYNC;
      default:
        return ActivityType.TEST;
    }
  }

  // الحصول على مستوى الخطأ
  private getErrorLevel(errorType: ErrorType): AuditLogEntry['level'] {
    switch (errorType) {
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.SESSION_EXPIRED:
        return 'critical';
      case ErrorType.CONNECTION_FAILED:
      case ErrorType.BACKUP_FAILED:
        return 'error';
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SYNC_CONFLICT:
        return 'warning';
      default:
        return 'error';
    }
  }

  // الحصول على الفئة من نوع الخطأ
  private getCategoryFromError(errorType: ErrorType): AuditLogEntry['category'] {
    switch (errorType) {
      case ErrorType.CONNECTION_FAILED:
      case ErrorType.NETWORK_ERROR:
        return 'connection';
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.SESSION_EXPIRED:
      case ErrorType.ENCRYPTION_ERROR:
        return 'security';
      case ErrorType.BACKUP_FAILED:
        return 'backup';
      case ErrorType.SYNC_CONFLICT:
        return 'sync';
      default:
        return 'system';
    }
  }

  // الحصول على معلومات العميل
  private getClientInfo(): { ip: string; userAgent: string } {
    return {
      ip: 'localhost', // في بيئة المتصفح
      userAgent: navigator.userAgent
    };
  }

  // توليد معرف السجل
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // التحقق من صحة إدخال السجل
  private isValidLogEntry(log: any): boolean {
    return log &&
           typeof log.id === 'string' &&
           log.timestamp instanceof Date &&
           typeof log.action === 'string' &&
           typeof log.connectionId === 'string' &&
           typeof log.success === 'boolean';
  }

  // حفظ السجلات
  private saveLogs(): void {
    try {
      const data = JSON.stringify(this.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      })));
      localStorage.setItem(this.storageKey, data);
    } catch (error) {
      console.error('فشل حفظ السجلات:', error);
    }
  }

  // تحميل السجلات
  private loadLogs(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const logs = JSON.parse(data);
        this.logs = logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        })).filter((log: any) => this.isValidLogEntry(log));
      }
    } catch (error) {
      console.error('فشل تحميل السجلات:', error);
      this.logs = [];
    }
  }

  // تنظيف الموارد
  cleanup(): void {
    this.logCallbacks = [];
    this.saveLogs();
  }
}