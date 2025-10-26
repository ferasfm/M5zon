// services/SessionManager.ts - مدير الجلسات المتقدم

import { SYSTEM_CONSTANTS } from '../types/database';

export interface SessionInfo {
  id: string;
  connectionId: string;
  startTime: Date;
  lastActivity: Date;
  timeout: number;
  autoLogout: boolean;
  isActive: boolean;
}

export interface SessionSettings {
  timeout: number;
  autoLogout: boolean;
  warningTime: number; // وقت التحذير قبل انتهاء الجلسة (بالثواني)
  extendOnActivity: boolean;
}

export class SessionManager {
  private currentSession: SessionInfo | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private settings: SessionSettings;
  private expiryCallbacks: (() => void)[] = [];
  private warningCallbacks: ((remainingTime: number) => void)[] = [];
  private activityCallbacks: (() => void)[] = [];

  constructor(settings?: Partial<SessionSettings>) {
    this.settings = {
      timeout: SYSTEM_CONSTANTS.DEFAULT_SESSION_TIMEOUT,
      autoLogout: true,
      warningTime: 300, // 5 دقائق تحذير
      extendOnActivity: true,
      ...settings
    };

    // مراقبة نشاط المستخدم
    this.setupActivityMonitoring();
  }

  // بدء جلسة جديدة
  startSession(connectionId: string): SessionInfo {
    // إنهاء الجلسة الحالية إن وجدت
    if (this.currentSession) {
      this.endSession();
    }

    const now = new Date();
    this.currentSession = {
      id: this.generateSessionId(),
      connectionId,
      startTime: now,
      lastActivity: now,
      timeout: this.settings.timeout,
      autoLogout: this.settings.autoLogout,
      isActive: true
    };

    // بدء مؤقتات الجلسة
    this.startSessionTimers();

    // حفظ الجلسة
    this.saveSession();

    return { ...this.currentSession };
  }

  // إنهاء الجلسة الحالية
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      this.clearTimers();
      this.removeStoredSession();
      this.currentSession = null;
    }
  }

  // تمديد الجلسة
  extendSession(): void {
    if (this.currentSession && this.currentSession.isActive) {
      this.currentSession.lastActivity = new Date();
      this.startSessionTimers(); // إعادة تشغيل المؤقتات
      this.saveSession();
    }
  }

  // تحديث نشاط الجلسة
  updateActivity(): void {
    if (this.currentSession && this.currentSession.isActive && this.settings.extendOnActivity) {
      this.currentSession.lastActivity = new Date();
      this.saveSession();
    }

    // إشعار معالجات النشاط
    this.activityCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('خطأ في معالج النشاط:', error);
      }
    });
  }

  // الحصول على معلومات الجلسة الحالية
  getCurrentSession(): SessionInfo | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  // التحقق من صحة الجلسة
  isSessionValid(): boolean {
    if (!this.currentSession || !this.currentSession.isActive) {
      return false;
    }

    if (!this.settings.autoLogout) {
      return true;
    }

    const now = new Date();
    const sessionEnd = new Date(
      this.currentSession.lastActivity.getTime() + (this.settings.timeout * 60 * 1000)
    );

    return now <= sessionEnd;
  }

  // الحصول على الوقت المتبقي للجلسة (بالثواني)
  getRemainingTime(): number {
    if (!this.currentSession || !this.currentSession.isActive || !this.settings.autoLogout) {
      return -1;
    }

    const now = new Date();
    const sessionEnd = new Date(
      this.currentSession.lastActivity.getTime() + (this.settings.timeout * 60 * 1000)
    );

    const remaining = sessionEnd.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  // الحصول على مدة الجلسة الحالية (بالثواني)
  getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }

    const now = new Date();
    return Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 1000);
  }

  // تحديث إعدادات الجلسة
  updateSettings(newSettings: Partial<SessionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // إعادة تشغيل المؤقتات إذا كانت الجلسة نشطة
    if (this.currentSession && this.currentSession.isActive) {
      this.currentSession.timeout = this.settings.timeout;
      this.currentSession.autoLogout = this.settings.autoLogout;
      this.startSessionTimers();
      this.saveSession();
    }
  }

  // الحصول على إعدادات الجلسة
  getSettings(): SessionSettings {
    return { ...this.settings };
  }

  // بدء مؤقتات الجلسة
  private startSessionTimers(): void {
    this.clearTimers();

    if (!this.currentSession || !this.settings.autoLogout) {
      return;
    }

    const timeoutMs = this.settings.timeout * 60 * 1000;
    const warningMs = Math.max(0, timeoutMs - (this.settings.warningTime * 1000));

    // مؤقت التحذير
    if (warningMs > 0) {
      this.warningTimer = setTimeout(() => {
        this.handleSessionWarning();
      }, warningMs);
    }

    // مؤقت انتهاء الجلسة
    this.sessionTimer = setTimeout(() => {
      this.handleSessionExpiry();
    }, timeoutMs);
  }

  // مسح المؤقتات
  private clearTimers(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // معالجة تحذير انتهاء الجلسة
  private handleSessionWarning(): void {
    const remainingTime = this.getRemainingTime();
    
    this.warningCallbacks.forEach(callback => {
      try {
        callback(remainingTime);
      } catch (error) {
        console.error('خطأ في معالج تحذير الجلسة:', error);
      }
    });
  }

  // معالجة انتهاء الجلسة
  private handleSessionExpiry(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false;
    }

    this.expiryCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('خطأ في معالج انتهاء الجلسة:', error);
      }
    });

    this.endSession();
  }

  // إعداد مراقبة نشاط المستخدم
  private setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      this.updateActivity();
    };

    // إضافة مستمعي الأحداث
    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });

    // حفظ المراجع للتنظيف لاحقاً
    (this as any).activityHandler = activityHandler;
    (this as any).monitoredEvents = events;
  }

  // إزالة مراقبة النشاط
  private removeActivityMonitoring(): void {
    const events = (this as any).monitoredEvents;
    const handler = (this as any).activityHandler;

    if (events && handler) {
      events.forEach((event: string) => {
        document.removeEventListener(event, handler);
      });
    }
  }

  // توليد معرف الجلسة
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // حفظ الجلسة في التخزين المحلي
  private saveSession(): void {
    if (this.currentSession) {
      try {
        const sessionData = {
          ...this.currentSession,
          startTime: this.currentSession.startTime.toISOString(),
          lastActivity: this.currentSession.lastActivity.toISOString()
        };
        localStorage.setItem('session_manager_current', JSON.stringify(sessionData));
      } catch (error) {
        console.error('فشل حفظ الجلسة:', error);
      }
    }
  }

  // إزالة الجلسة المحفوظة
  private removeStoredSession(): void {
    localStorage.removeItem('session_manager_current');
  }

  // استعادة الجلسة من التخزين المحلي
  restoreSession(): boolean {
    try {
      const sessionData = localStorage.getItem('session_manager_current');
      if (!sessionData) {
        return false;
      }

      const parsed = JSON.parse(sessionData);
      const session: SessionInfo = {
        ...parsed,
        startTime: new Date(parsed.startTime),
        lastActivity: new Date(parsed.lastActivity)
      };

      // التحقق من صحة الجلسة المستعادة
      this.currentSession = session;
      if (this.isSessionValid()) {
        this.startSessionTimers();
        return true;
      } else {
        this.endSession();
        return false;
      }
    } catch (error) {
      console.error('فشل استعادة الجلسة:', error);
      this.removeStoredSession();
      return false;
    }
  }

  // تسجيل معالج انتهاء الجلسة
  onSessionExpiry(callback: () => void): void {
    this.expiryCallbacks.push(callback);
  }

  // تسجيل معالج تحذير الجلسة
  onSessionWarning(callback: (remainingTime: number) => void): void {
    this.warningCallbacks.push(callback);
  }

  // تسجيل معالج النشاط
  onActivity(callback: () => void): void {
    this.activityCallbacks.push(callback);
  }

  // إزالة معالج
  removeCallback(type: 'expiry' | 'warning' | 'activity', callback: Function): void {
    switch (type) {
      case 'expiry':
        this.expiryCallbacks = this.expiryCallbacks.filter(cb => cb !== callback);
        break;
      case 'warning':
        this.warningCallbacks = this.warningCallbacks.filter(cb => cb !== callback);
        break;
      case 'activity':
        this.activityCallbacks = this.activityCallbacks.filter(cb => cb !== callback);
        break;
    }
  }

  // تنظيف الموارد
  cleanup(): void {
    this.clearTimers();
    this.removeActivityMonitoring();
    this.expiryCallbacks = [];
    this.warningCallbacks = [];
    this.activityCallbacks = [];
    
    if (this.currentSession) {
      this.saveSession();
    }
  }

  // إحصائيات الجلسة
  getSessionStats(): {
    totalSessions: number;
    averageDuration: number;
    longestSession: number;
    currentSessionDuration: number;
  } {
    // يمكن توسيع هذا لحفظ إحصائيات تاريخية
    return {
      totalSessions: 1, // مؤقت
      averageDuration: this.getSessionDuration(),
      longestSession: this.getSessionDuration(),
      currentSessionDuration: this.getSessionDuration()
    };
  }
}