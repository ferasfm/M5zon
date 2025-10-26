// services/ErrorHandlerService.ts - خدمة معالجة الأخطاء الشاملة

import { IErrorHandlerService, INotificationService } from '../interfaces/services';
import { DatabaseError, RecoveryStrategy } from '../interfaces/database';
import { AuditLogger } from './AuditLogger';
import { ErrorType, ActivityType, ERROR_MESSAGES } from '../types/database';

export interface ErrorHandlerConfig {
  showUserNotifications: boolean;
  logErrors: boolean;
  autoRecovery: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  persistentErrorThreshold: number;
}

export class ErrorHandlerService implements IErrorHandlerService {
  private auditLogger: AuditLogger;
  private notificationService?: INotificationService;
  private config: ErrorHandlerConfig;
  private recoveryStrategy: RecoveryStrategy;
  private errorLog: DatabaseError[] = [];
  private errorCallbacks: ((error: DatabaseError) => void)[] = [];
  private recoveryCallbacks: ((success: boolean, error: DatabaseError) => void)[] = [];
  private retryAttempts: Map<string, number> = new Map();

  constructor(
    auditLogger: AuditLogger,
    notificationService?: INotificationService,
    config?: Partial<ErrorHandlerConfig>
  ) {
    this.auditLogger = auditLogger;
    this.notificationService = notificationService;
    
    this.config = {
      showUserNotifications: true,
      logErrors: true,
      autoRecovery: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      persistentErrorThreshold: 5,
      ...config
    };

    this.recoveryStrategy = {
      autoRetry: {
        enabled: true,
        maxAttempts: this.config.maxRetryAttempts,
        backoffStrategy: 'exponential',
        baseDelay: this.config.retryDelay
      },
      failover: {
        enabled: false,
        switchToOffline: true
      },
      notifications: {
        showErrorNotifications: true,
        showRecoveryNotifications: true,
        persistentErrors: true
      }
    };

    this.initialize();
  }

  // تهيئة الخدمة
  private initialize(): void {
    // تحميل سجل الأخطاء المحفوظ
    this.loadErrorLog();
    
    // تسجيل معالج الأخطاء العام
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  // معالجة الأخطاء العامة
  handleError(error: DatabaseError): void {
    try {
      // تسجيل الخطأ
      if (this.config.logErrors) {
        this.logError(error);
      }

      // عرض إشعار للمستخدم
      if (this.config.showUserNotifications) {
        this.showUserFriendlyError(error);
      }

      // محاولة الاسترداد التلقائي
      if (this.config.autoRecovery && error.recoverable) {
        this.attemptRecovery(error);
      }

      // إشعار المستمعين
      this.notifyErrorCallbacks(error);

    } catch (handlingError) {
      console.error('خطأ في معالجة الخطأ:', handlingError);
    }
  }

  // معالجة أخطاء الاتصال
  handleConnectionError(error: DatabaseError): void {
    const enhancedError: DatabaseError = {
      ...error,
      type: ErrorType.CONNECTION_FAILED,
      suggestedActions: [
        ...error.suggestedActions,
        'التحقق من اتصال الإنترنت',
        'إعادة تشغيل التطبيق',
        'التبديل إلى وضع عدم الاتصال'
      ]
    };

    this.handleError(enhancedError);
  }

  // معالجة أخطاء النسخ الاحتياطي
  handleBackupError(error: DatabaseError): void {
    const enhancedError: DatabaseError = {
      ...error,
      type: ErrorType.BACKUP_FAILED,
      suggestedActions: [
        ...error.suggestedActions,
        'التحقق من مساحة التخزين المتاحة',
        'إعادة المحاولة لاحقاً',
        'تقليل حجم البيانات المراد نسخها'
      ]
    };

    this.handleError(enhancedError);
  }

  // معالجة أخطاء المزامنة
  handleSyncError(error: DatabaseError): void {
    const enhancedError: DatabaseError = {
      ...error,
      type: ErrorType.SYNC_CONFLICT,
      suggestedActions: [
        ...error.suggestedActions,
        'حل التضارب يدوياً',
        'اختيار استراتيجية حل التضارب',
        'إعادة المزامنة'
      ]
    };

    this.handleError(enhancedError);
  }

  // عرض خطأ مفهوم للمستخدم
  showUserFriendlyError(error: DatabaseError): void {
    if (!this.notificationService) return;

    const userMessage = this.getUserFriendlyMessage(error);
    const severity = this.getErrorSeverity(error);

    switch (severity) {
      case 'critical':
        this.notificationService.showError(userMessage, 0); // دائم
        break;
      case 'high':
        this.notificationService.showError(userMessage, 10000);
        break;
      case 'medium':
        this.notificationService.showWarning(userMessage, 7000);
        break;
      case 'low':
        this.notificationService.showInfo(userMessage, 5000);
        break;
    }

    // عرض الإجراءات المقترحة
    if (error.suggestedActions.length > 0) {
      const actionsMessage = `الإجراءات المقترحة:\n${error.suggestedActions.map(action => `• ${action}`).join('\n')}`;
      this.notificationService.showInfo(actionsMessage, 8000);
    }
  }

  // الحصول على رسالة مفهومة للمستخدم
  private getUserFriendlyMessage(error: DatabaseError): string {
    // رسائل مخصصة حسب نوع الخطأ
    const baseMessage = ERROR_MESSAGES[error.type] || error.message;
    
    switch (error.type) {
      case ErrorType.CONNECTION_FAILED:
        return `${baseMessage}. تحقق من اتصال الإنترنت ومعلومات قاعدة البيانات.`;
      
      case ErrorType.AUTHENTICATION_ERROR:
        return `${baseMessage}. تحقق من صحة معلومات تسجيل الدخول.`;
      
      case ErrorType.NETWORK_ERROR:
        return `${baseMessage}. تحقق من اتصال الإنترنت وحاول مرة أخرى.`;
      
      case ErrorType.BACKUP_FAILED:
        return `${baseMessage}. تحقق من مساحة التخزين المتاحة.`;
      
      case ErrorType.SESSION_EXPIRED:
        return `${baseMessage}. سيتم إعادة توجيهك لتسجيل الدخول.`;
      
      case ErrorType.VALIDATION_ERROR:
        return `${baseMessage}. تحقق من صحة البيانات المدخلة.`;
      
      default:
        return baseMessage;
    }
  }

  // تحديد خطورة الخطأ
  private getErrorSeverity(error: DatabaseError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.type) {
      case ErrorType.SESSION_EXPIRED:
      case ErrorType.AUTHENTICATION_ERROR:
        return 'critical';
      
      case ErrorType.CONNECTION_FAILED:
      case ErrorType.BACKUP_FAILED:
        return 'high';
      
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SYNC_CONFLICT:
        return 'medium';
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.STORAGE_ERROR:
        return 'low';
      
      default:
        return 'medium';
    }
  }

  // الحصول على اقتراحات الأخطاء
  getErrorSuggestions(error: DatabaseError): string[] {
    const baseSuggestions = [...error.suggestedActions];
    
    // إضافة اقتراحات عامة حسب نوع الخطأ
    switch (error.type) {
      case ErrorType.CONNECTION_FAILED:
        baseSuggestions.push(
          'تحقق من حالة خادم قاعدة البيانات',
          'جرب الاتصال بشبكة أخرى',
          'تواصل مع مدير النظام'
        );
        break;
      
      case ErrorType.NETWORK_ERROR:
        baseSuggestions.push(
          'أعد تشغيل جهاز التوجيه',
          'تحقق من إعدادات الجدار الناري',
          'جرب استخدام VPN'
        );
        break;
      
      case ErrorType.STORAGE_ERROR:
        baseSuggestions.push(
          'امسح الملفات المؤقتة',
          'أعد تشغيل المتصفح',
          'تحقق من إعدادات المتصفح'
        );
        break;
    }
    
    return [...new Set(baseSuggestions)]; // إزالة التكرار
  }

  // تسجيل الخطأ
  logError(error: DatabaseError): void {
    // إضافة إلى سجل الأخطاء المحلي
    this.errorLog.unshift(error);
    
    // الحفاظ على حد أقصى من الأخطاء
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(0, 100);
    }
    
    // حفظ في التخزين المحلي
    this.saveErrorLog();
    
    // تسجيل في سجل الأنشطة
    this.auditLogger.logError(error);
    
    // التحقق من الأخطاء المستمرة
    this.checkPersistentErrors(error);
  }

  // التحقق من الأخطاء المستمرة
  private checkPersistentErrors(error: DatabaseError): void {
    const recentErrors = this.errorLog
      .filter(e => e.type === error.type)
      .filter(e => Date.now() - e.timestamp.getTime() < 300000); // آخر 5 دقائق
    
    if (recentErrors.length >= this.config.persistentErrorThreshold) {
      // خطأ مستمر - إشعار خاص
      if (this.notificationService && this.recoveryStrategy.notifications.persistentErrors) {
        this.notificationService.showPersistent(
          `persistent_${error.type}`,
          `خطأ متكرر: ${ERROR_MESSAGES[error.type]}. قد تحتاج لتدخل يدوي.`,
          'error'
        );
      }
      
      // تسجيل كحدث خاص
      this.auditLogger.logActivity({
        action: ActivityType.TEST,
        connectionId: 'system',
        connectionName: 'خطأ مستمر',
        success: false,
        errorMessage: `خطأ متكرر: ${error.type}`
      });
    }
  }

  // الحصول على سجل الأخطاء
  getErrorLog(limit?: number): DatabaseError[] {
    const log = limit ? this.errorLog.slice(0, limit) : this.errorLog;
    return [...log]; // نسخة للحماية
  }

  // مسح سجل الأخطاء
  clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('error_log');
  }

  // ضبط استراتيجية الاسترداد
  setRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategy = { ...this.recoveryStrategy, ...strategy };
  }

  // محاولة الاسترداد التلقائي
  async attemptRecovery(error: DatabaseError): Promise<boolean> {
    const errorKey = `${error.type}_${error.connectionId || 'global'}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;
    
    if (!this.recoveryStrategy.autoRetry.enabled || 
        currentAttempts >= this.recoveryStrategy.autoRetry.maxAttempts) {
      return false;
    }

    try {
      // تحديث عداد المحاولات
      this.retryAttempts.set(errorKey, currentAttempts + 1);
      
      // حساب تأخير إعادة المحاولة
      const delay = this.calculateRetryDelay(currentAttempts);
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // محاولة الاسترداد حسب نوع الخطأ
      const success = await this.performRecovery(error);
      
      if (success) {
        // نجح الاسترداد - مسح العداد
        this.retryAttempts.delete(errorKey);
        
        // إشعار النجاح
        if (this.recoveryStrategy.notifications.showRecoveryNotifications && this.notificationService) {
          this.notificationService.showSuccess('تم حل المشكلة تلقائياً', 3000);
        }
        
        // تسجيل النجاح
        this.auditLogger.logActivity({
          action: ActivityType.TEST,
          connectionId: error.connectionId || 'system',
          connectionName: 'استرداد تلقائي',
          success: true
        });
      }
      
      // إشعار المستمعين
      this.notifyRecoveryCallbacks(success, error);
      
      return success;
      
    } catch (recoveryError) {
      console.error('فشل محاولة الاسترداد:', recoveryError);
      
      // إشعار المستمعين بالفشل
      this.notifyRecoveryCallbacks(false, error);
      
      return false;
    }
  }

  // تنفيذ الاسترداد حسب نوع الخطأ
  private async performRecovery(error: DatabaseError): Promise<boolean> {
    switch (error.type) {
      case ErrorType.CONNECTION_FAILED:
        return this.recoverConnectionError(error);
      
      case ErrorType.NETWORK_ERROR:
        return this.recoverNetworkError(error);
      
      case ErrorType.STORAGE_ERROR:
        return this.recoverStorageError(error);
      
      case ErrorType.SESSION_EXPIRED:
        return this.recoverSessionError(error);
      
      default:
        return false;
    }
  }

  // استرداد خطأ الاتصال
  private async recoverConnectionError(error: DatabaseError): Promise<boolean> {
    try {
      // محاولة إعادة الاتصال
      // هذا سيتم تنفيذه مع ConnectionManager
      return false; // مؤقت
    } catch {
      return false;
    }
  }

  // استرداد خطأ الشبكة
  private async recoverNetworkError(error: DatabaseError): Promise<boolean> {
    try {
      // فحص الاتصال بالإنترنت
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch {
      return false;
    }
  }

  // استرداد خطأ التخزين
  private async recoverStorageError(error: DatabaseError): Promise<boolean> {
    try {
      // محاولة مسح بعض البيانات المؤقتة
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('temp_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return keysToRemove.length > 0;
    } catch {
      return false;
    }
  }

  // استرداد خطأ الجلسة
  private async recoverSessionError(error: DatabaseError): Promise<boolean> {
    try {
      // إعادة تشغيل الجلسة
      // هذا سيتم تنفيذه مع SessionManager
      return false; // مؤقت
    } catch {
      return false;
    }
  }

  // حساب تأخير إعادة المحاولة
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.recoveryStrategy.autoRetry.baseDelay;
    
    switch (this.recoveryStrategy.autoRetry.backoffStrategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt);
      case 'linear':
        return baseDelay * (attempt + 1);
      default:
        return baseDelay;
    }
  }

  // معالجة الأخطاء العامة في النافذة
  private handleGlobalError(event: ErrorEvent): void {
    const error: DatabaseError = {
      type: ErrorType.VALIDATION_ERROR,
      message: event.message || 'خطأ غير متوقع',
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      },
      timestamp: new Date(),
      recoverable: false,
      suggestedActions: ['إعادة تحميل الصفحة', 'مسح ذاكرة التخزين المؤقت']
    };
    
    this.handleError(error);
  }

  // معالجة الوعود المرفوضة
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error: DatabaseError = {
      type: ErrorType.VALIDATION_ERROR,
      message: 'خطأ في معالجة العملية غير المتزامنة',
      details: event.reason,
      timestamp: new Date(),
      recoverable: true,
      suggestedActions: ['إعادة المحاولة', 'التحقق من اتصال الشبكة']
    };
    
    this.handleError(error);
    event.preventDefault(); // منع عرض الخطأ في وحدة التحكم
  }

  // تحميل سجل الأخطاء
  private loadErrorLog(): void {
    try {
      const logData = localStorage.getItem('error_log');
      if (logData) {
        const errors = JSON.parse(logData);
        this.errorLog = errors.map((error: any) => ({
          ...error,
          timestamp: new Date(error.timestamp)
        }));
      }
    } catch (error) {
      console.error('فشل تحميل سجل الأخطاء:', error);
      this.errorLog = [];
    }
  }

  // حفظ سجل الأخطاء
  private saveErrorLog(): void {
    try {
      localStorage.setItem('error_log', JSON.stringify(this.errorLog));
    } catch (error) {
      console.error('فشل حفظ سجل الأخطاء:', error);
    }
  }

  // تسجيل معالج الأخطاء
  onError(callback: (error: DatabaseError) => void): void {
    this.errorCallbacks.push(callback);
  }

  // تسجيل معالج الاسترداد
  onRecovery(callback: (success: boolean, error: DatabaseError) => void): void {
    this.recoveryCallbacks.push(callback);
  }

  // إشعار معالجات الأخطاء
  private notifyErrorCallbacks(error: DatabaseError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('خطأ في معالج الأخطاء:', callbackError);
      }
    });
  }

  // إشعار معالجات الاسترداد
  private notifyRecoveryCallbacks(success: boolean, error: DatabaseError): void {
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(success, error);
      } catch (callbackError) {
        console.error('خطأ في معالج الاسترداد:', callbackError);
      }
    });
  }

  // تنظيف الموارد
  cleanup(): void {
    window.removeEventListener('error', this.handleGlobalError.bind(this));
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    this.errorCallbacks = [];
    this.recoveryCallbacks = [];
    this.retryAttempts.clear();
    
    this.saveErrorLog();
  }
}