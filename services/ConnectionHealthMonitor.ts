// services/ConnectionHealthMonitor.ts - مراقب صحة الاتصال

import { 
  ConnectionHealthInfo, 
  HealthIssue, 
  DatabaseError,
  ConnectionTestResult 
} from '../interfaces/database';
import { ConnectionManagerService } from './ConnectionManagerService';
import { AuditLogger } from './AuditLogger';
import { ErrorType, ActivityType, SYSTEM_CONSTANTS } from '../types/database';

export interface HealthMonitorConfig {
  checkInterval: number; // بالمللي ثانية
  enabled: boolean;
  alertThresholds: {
    responseTime: number; // مللي ثانية
    failureRate: number; // نسبة مئوية
    consecutiveFailures: number;
  };
  notifications: {
    enabled: boolean;
    criticalOnly: boolean;
  };
}

export interface HealthAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'connectivity' | 'security' | 'configuration';
  message: string;
  connectionId: string;
  connectionName: string;
  resolved: boolean;
  resolvedAt?: Date;
}

export class ConnectionHealthMonitor {
  private config: HealthMonitorConfig;
  private connectionManager: ConnectionManagerService;
  private auditLogger: AuditLogger;
  private monitorTimer: NodeJS.Timeout | null = null;
  private healthHistory: Map<string, ConnectionHealthInfo[]> = new Map();
  private activeAlerts: Map<string, HealthAlert> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private healthCallbacks: ((health: ConnectionHealthInfo) => void)[] = [];
  private alertCallbacks: ((alert: HealthAlert) => void)[] = [];

  constructor(
    connectionManager: ConnectionManagerService,
    auditLogger: AuditLogger,
    config?: Partial<HealthMonitorConfig>
  ) {
    this.connectionManager = connectionManager;
    this.auditLogger = auditLogger;
    
    this.config = {
      checkInterval: 30000, // 30 ثانية
      enabled: true,
      alertThresholds: {
        responseTime: 5000, // 5 ثوان
        failureRate: 20, // 20%
        consecutiveFailures: 3
      },
      notifications: {
        enabled: true,
        criticalOnly: false
      },
      ...config
    };

    this.initialize();
  }

  // تهيئة المراقب
  private initialize(): void {
    if (this.config.enabled) {
      this.startMonitoring();
    }

    // الاستماع لتغييرات الاتصال
    this.connectionManager.onConnectionChange((connection) => {
      if (connection) {
        this.initializeConnectionHealth(connection.id);
      }
    });
  }

  // بدء المراقبة
  startMonitoring(): void {
    if (this.monitorTimer) {
      this.stopMonitoring();
    }

    this.monitorTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    this.auditLogger.logActivity({
      action: ActivityType.CONNECT,
      connectionId: 'system',
      connectionName: 'مراقب الصحة',
      success: true
    });
  }

  // إيقاف المراقبة
  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    this.auditLogger.logActivity({
      action: ActivityType.DISCONNECT,
      connectionId: 'system',
      connectionName: 'مراقب الصحة',
      success: true
    });
  }

  // إجراء فحص الصحة
  private async performHealthCheck(): Promise<void> {
    try {
      const activeConnection = this.connectionManager.getActiveConnection();
      if (!activeConnection) {
        return; // لا يوجد اتصال نشط للفحص
      }

      const healthInfo = await this.checkConnectionHealth(activeConnection.id);
      
      // حفظ في التاريخ
      this.addToHealthHistory(activeConnection.id, healthInfo);
      
      // تحليل الصحة والتنبيهات
      await this.analyzeHealth(activeConnection.id, healthInfo);
      
      // إشعار المستمعين
      this.notifyHealthChange(healthInfo);

    } catch (error) {
      console.error('خطأ في فحص الصحة:', error);
      this.auditLogger.logError({
        type: ErrorType.NETWORK_ERROR,
        message: 'فشل فحص صحة الاتصال',
        details: error,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['إعادة المحاولة', 'التحقق من الاتصال']
      });
    }
  }

  // فحص صحة اتصال محدد
  async checkConnectionHealth(connectionId: string): Promise<ConnectionHealthInfo> {
    const startTime = Date.now();
    
    try {
      // اختبار الاتصال
      const testResult = await this.connectionManager.testConnection(connectionId);
      const responseTime = testResult.responseTime;
      
      // تحليل النتائج
      const issues: HealthIssue[] = [];
      const recommendations: string[] = [];

      // فحص وقت الاستجابة
      if (responseTime > this.config.alertThresholds.responseTime) {
        issues.push({
          type: 'performance',
          severity: responseTime > this.config.alertThresholds.responseTime * 2 ? 'high' : 'medium',
          description: `وقت الاستجابة بطيء: ${responseTime}ms`,
          solution: 'تحقق من سرعة الشبكة وحالة الخادم'
        });
        recommendations.push('تحسين اتصال الشبكة');
      }

      // فحص حالة الاتصال
      if (!testResult.success) {
        issues.push({
          type: 'connectivity',
          severity: 'critical',
          description: testResult.message,
          solution: 'تحقق من معلومات الاتصال وحالة الخادم'
        });
        recommendations.push('إعادة تكوين الاتصال');
      }

      // فحص معدل الفشل
      const failureRate = this.calculateFailureRate(connectionId);
      if (failureRate > this.config.alertThresholds.failureRate) {
        issues.push({
          type: 'connectivity',
          severity: failureRate > 50 ? 'critical' : 'high',
          description: `معدل فشل عالي: ${failureRate.toFixed(1)}%`,
          solution: 'تحقق من استقرار الاتصال'
        });
        recommendations.push('مراجعة إعدادات الشبكة');
      }

      return {
        status: testResult.success ? 
          (issues.length > 0 ? 'warning' : 'healthy') : 'error',
        lastCheck: new Date(),
        responseTime,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        status: 'error',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        issues: [{
          type: 'connectivity',
          severity: 'critical',
          description: 'فشل فحص الصحة',
          solution: 'إعادة المحاولة أو إعادة تكوين الاتصال'
        }],
        recommendations: ['إعادة تشغيل التطبيق', 'التحقق من الاتصال']
      };
    }
  }

  // تحليل الصحة وإنشاء التنبيهات
  private async analyzeHealth(connectionId: string, health: ConnectionHealthInfo): Promise<void> {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    // تحديث عداد الفشل المتتالي
    if (health.status === 'error') {
      const failures = (this.consecutiveFailures.get(connectionId) || 0) + 1;
      this.consecutiveFailures.set(connectionId, failures);
      
      // إنشاء تنبيه للفشل المتتالي
      if (failures >= this.config.alertThresholds.consecutiveFailures) {
        await this.createAlert({
          severity: 'critical',
          type: 'connectivity',
          message: `فشل متتالي في الاتصال (${failures} مرات)`,
          connectionId,
          connectionName: connection.name
        });
      }
    } else {
      this.consecutiveFailures.set(connectionId, 0);
      
      // حل التنبيهات المتعلقة بالاتصال
      await this.resolveConnectionAlerts(connectionId);
    }

    // إنشاء تنبيهات للمشاكل الجديدة
    for (const issue of health.issues) {
      if (issue.severity === 'critical' || 
          (issue.severity === 'high' && !this.config.notifications.criticalOnly)) {
        
        await this.createAlert({
          severity: issue.severity,
          type: issue.type,
          message: issue.description,
          connectionId,
          connectionName: connection.name
        });
      }
    }
  }

  // إنشاء تنبيه جديد
  private async createAlert(alertData: Omit<HealthAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alertId = this.generateAlertId();
    const alert: HealthAlert = {
      id: alertId,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    // التحقق من وجود تنبيه مشابه
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(a => 
        a.connectionId === alert.connectionId && 
        a.type === alert.type && 
        a.message === alert.message &&
        !a.resolved
      );

    if (existingAlert) {
      return; // تنبيه مشابه موجود بالفعل
    }

    this.activeAlerts.set(alertId, alert);

    // تسجيل في سجل الأنشطة
    this.auditLogger.logActivity({
      action: ActivityType.TEST,
      connectionId: alert.connectionId,
      connectionName: alert.connectionName,
      success: false,
      errorMessage: alert.message
    }, {
      level: alert.severity === 'critical' ? 'critical' : 'warning',
      category: 'connection',
      metadata: { alertType: alert.type }
    });

    // إشعار المستمعين
    this.notifyAlert(alert);
  }

  // حل التنبيهات المتعلقة بالاتصال
  private async resolveConnectionAlerts(connectionId: string): Promise<void> {
    const alertsToResolve = Array.from(this.activeAlerts.values())
      .filter(alert => 
        alert.connectionId === connectionId && 
        !alert.resolved &&
        alert.type === 'connectivity'
      );

    for (const alert of alertsToResolve) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: alert.connectionId,
        connectionName: alert.connectionName,
        success: true
      }, {
        level: 'info',
        category: 'connection',
        metadata: { resolvedAlert: alert.id }
      });
    }
  }

  // حساب معدل الفشل
  private calculateFailureRate(connectionId: string): number {
    const history = this.healthHistory.get(connectionId) || [];
    if (history.length < 5) return 0; // عدد قليل من العينات

    const recentHistory = history.slice(-20); // آخر 20 فحص
    const failures = recentHistory.filter(h => h.status === 'error').length;
    
    return (failures / recentHistory.length) * 100;
  }

  // إضافة إلى تاريخ الصحة
  private addToHealthHistory(connectionId: string, health: ConnectionHealthInfo): void {
    if (!this.healthHistory.has(connectionId)) {
      this.healthHistory.set(connectionId, []);
    }

    const history = this.healthHistory.get(connectionId)!;
    history.push(health);

    // الحفاظ على حد أقصى من الإدخالات
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  // تهيئة صحة الاتصال
  private initializeConnectionHealth(connectionId: string): void {
    if (!this.healthHistory.has(connectionId)) {
      this.healthHistory.set(connectionId, []);
    }
    this.consecutiveFailures.set(connectionId, 0);
  }

  // الحصول على تاريخ الصحة
  getHealthHistory(connectionId: string, limit?: number): ConnectionHealthInfo[] {
    const history = this.healthHistory.get(connectionId) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  // الحصول على التنبيهات النشطة
  getActiveAlerts(connectionId?: string): HealthAlert[] {
    const alerts = Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved);
    
    if (connectionId) {
      return alerts.filter(alert => alert.connectionId === connectionId);
    }
    
    return alerts;
  }

  // الحصول على جميع التنبيهات
  getAllAlerts(connectionId?: string): HealthAlert[] {
    const alerts = Array.from(this.activeAlerts.values());
    
    if (connectionId) {
      return alerts.filter(alert => alert.connectionId === connectionId);
    }
    
    return alerts;
  }

  // حل تنبيه يدوياً
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: alert.connectionId,
        connectionName: alert.connectionName,
        success: true
      }, {
        level: 'info',
        category: 'connection',
        metadata: { manuallyResolvedAlert: alertId }
      });
    }
  }

  // مسح التنبيهات القديمة
  clearOldAlerts(daysOld: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffDate) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  // الحصول على إحصائيات الصحة
  getHealthStats(connectionId: string): {
    totalChecks: number;
    successRate: number;
    averageResponseTime: number;
    currentStatus: string;
    lastCheck: Date | null;
  } {
    const history = this.healthHistory.get(connectionId) || [];
    
    if (history.length === 0) {
      return {
        totalChecks: 0,
        successRate: 0,
        averageResponseTime: 0,
        currentStatus: 'unknown',
        lastCheck: null
      };
    }

    const successfulChecks = history.filter(h => h.status === 'healthy').length;
    const totalResponseTime = history.reduce((sum, h) => sum + h.responseTime, 0);
    const lastHealth = history[history.length - 1];

    return {
      totalChecks: history.length,
      successRate: (successfulChecks / history.length) * 100,
      averageResponseTime: totalResponseTime / history.length,
      currentStatus: lastHealth.status,
      lastCheck: lastHealth.lastCheck
    };
  }

  // تحديث إعدادات المراقب
  updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };
    
    // إعادة تشغيل المراقبة إذا تغيرت الإعدادات
    if (wasEnabled !== this.config.enabled) {
      if (this.config.enabled) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    } else if (this.config.enabled && this.monitorTimer) {
      // إعادة تشغيل بالفترة الجديدة
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // الحصول على الإعدادات الحالية
  getConfig(): HealthMonitorConfig {
    return { ...this.config };
  }

  // تسجيل معالج تغيير الصحة
  onHealthChange(callback: (health: ConnectionHealthInfo) => void): void {
    this.healthCallbacks.push(callback);
  }

  // تسجيل معالج التنبيهات
  onAlert(callback: (alert: HealthAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // إشعار المستمعين بتغيير الصحة
  private notifyHealthChange(health: ConnectionHealthInfo): void {
    this.healthCallbacks.forEach(callback => {
      try {
        callback(health);
      } catch (error) {
        console.error('خطأ في معالج تغيير الصحة:', error);
      }
    });
  }

  // إشعار المستمعين بالتنبيهات
  private notifyAlert(alert: HealthAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('خطأ في معالج التنبيهات:', error);
      }
    });
  }

  // توليد معرف التنبيه
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // تنظيف الموارد
  cleanup(): void {
    this.stopMonitoring();
    this.healthCallbacks = [];
    this.alertCallbacks = [];
    this.healthHistory.clear();
    this.activeAlerts.clear();
    this.consecutiveFailures.clear();
  }
}