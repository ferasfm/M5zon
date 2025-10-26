// services/SecurityService.ts - خدمة الأمان والتشفير

import { ISecurityService } from '../interfaces/services';
import { ConnectionActivity, DatabaseError, ErrorType } from '../interfaces/database';
import { ActivityType, SYSTEM_CONSTANTS } from '../types/database';

export class SecurityService implements ISecurityService {
  private sessionStartTime: Date | null = null;
  private sessionTimeout: number = SYSTEM_CONSTANTS.DEFAULT_SESSION_TIMEOUT;
  private autoLogoutEnabled: boolean = true;
  private encryptionLevel: 'basic' | 'advanced' = 'basic';
  private activityLog: ConnectionActivity[] = [];
  private sessionCallbacks: (() => void)[] = [];
  private securityEventCallbacks: ((activity: ConnectionActivity) => void)[] = [];
  private sessionTimer: NodeJS.Timeout | null = null;

  // تشفير البيانات باستخدام Web Crypto API
  async encryptConnectionData(data: string): Promise<string> {
    try {
      // توليد مفتاح التشفير
      const key = await this.generateCryptoKey();
      
      // تحويل البيانات إلى ArrayBuffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // توليد IV عشوائي
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // تشفير البيانات
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
      );
      
      // دمج IV مع البيانات المشفرة
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // تحويل إلى Base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      const dbError: DatabaseError = {
        type: ErrorType.ENCRYPTION_ERROR,
        message: 'فشل تشفير البيانات',
        details: error,
        timestamp: new Date(),
        recoverable: false,
        suggestedActions: ['تحقق من دعم المتصفح للتشفير', 'جرب إعادة تحميل الصفحة']
      };
      throw dbError;
    }
  }

  // فك تشفير البيانات
  async decryptConnectionData(encryptedData: string): Promise<string> {
    try {
      // تحويل من Base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // استخراج IV والبيانات المشفرة
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);
      
      // توليد نفس مفتاح التشفير
      const key = await this.generateCryptoKey();
      
      // فك التشفير
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedBuffer
      );
      
      // تحويل إلى نص
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      const dbError: DatabaseError = {
        type: ErrorType.ENCRYPTION_ERROR,
        message: 'فشل فك تشفير البيانات',
        details: error,
        timestamp: new Date(),
        recoverable: false,
        suggestedActions: ['تحقق من صحة البيانات المشفرة', 'قد تحتاج لإعادة إدخال كلمة المرور']
      };
      throw dbError;
    }
  }

  // توليد مفتاح التشفير
  async generateEncryptionKey(): Promise<string> {
    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('raw', key);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch (error) {
      throw new Error('فشل توليد مفتاح التشفير');
    }
  }

  // توليد مفتاح التشفير الداخلي
  private async generateCryptoKey(): Promise<CryptoKey> {
    // استخدام مفتاح ثابت مشتق من معرف المتصفح
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('inventory-system-encryption-key-2024'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('inventory-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // بدء الجلسة
  startSession(connectionId: string): void {
    this.sessionStartTime = new Date();
    
    // تسجيل النشاط
    this.logConnectionActivity({
      action: ActivityType.LOGIN,
      connectionId,
      connectionName: 'اتصال نشط',
      success: true
    });

    // بدء مؤقت انتهاء الجلسة
    this.startSessionTimer();
  }

  // تمديد الجلسة
  extendSession(): void {
    if (this.sessionStartTime) {
      this.sessionStartTime = new Date();
      this.startSessionTimer(); // إعادة تشغيل المؤقت
    }
  }

  // إنهاء الجلسة
  endSession(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    this.sessionStartTime = null;
    
    // تسجيل النشاط
    this.logConnectionActivity({
      action: ActivityType.LOGOUT,
      connectionId: 'current',
      connectionName: 'جلسة منتهية',
      success: true
    });
  }

  // التحقق من انتهاء الجلسة
  checkSessionExpiry(): boolean {
    if (!this.sessionStartTime || !this.autoLogoutEnabled) {
      return false;
    }

    const now = new Date();
    const sessionEnd = new Date(
      this.sessionStartTime.getTime() + (this.sessionTimeout * 60 * 1000)
    );
    
    return now > sessionEnd;
  }

  // الحصول على الوقت المتبقي للجلسة
  getRemainingTime(): number {
    if (!this.sessionStartTime || !this.autoLogoutEnabled) {
      return -1;
    }

    const now = new Date();
    const sessionEnd = new Date(
      this.sessionStartTime.getTime() + (this.sessionTimeout * 60 * 1000)
    );
    
    const remaining = sessionEnd.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000)); // بالثواني
  }

  // بدء مؤقت الجلسة
  private startSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    if (this.autoLogoutEnabled) {
      this.sessionTimer = setTimeout(() => {
        this.handleSessionExpiry();
      }, this.sessionTimeout * 60 * 1000);
    }
  }

  // معالجة انتهاء الجلسة
  private handleSessionExpiry(): void {
    this.endSession();
    
    // إشعار المستمعين
    this.sessionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('خطأ في معالج انتهاء الجلسة:', error);
      }
    });
  }

  // تسجيل نشاط الاتصال
  logConnectionActivity(activity: Omit<ConnectionActivity, 'id' | 'timestamp'>): void {
    const fullActivity: ConnectionActivity = {
      id: this.generateActivityId(),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      ...activity
    };

    // إضافة إلى السجل
    this.activityLog.unshift(fullActivity);
    
    // الحفاظ على حد أقصى من الإدخالات
    if (this.activityLog.length > SYSTEM_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES) {
      this.activityLog = this.activityLog.slice(0, SYSTEM_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES);
    }

    // حفظ في التخزين المحلي
    this.saveActivityLog();

    // إشعار المستمعين
    this.securityEventCallbacks.forEach(callback => {
      try {
        callback(fullActivity);
      } catch (error) {
        console.error('خطأ في معالج الأحداث الأمنية:', error);
      }
    });
  }

  // الحصول على سجل الأنشطة
  getActivityLog(limit?: number): ConnectionActivity[] {
    const log = limit ? this.activityLog.slice(0, limit) : this.activityLog;
    return [...log]; // نسخة للحماية
  }

  // مسح سجل الأنشطة
  clearActivityLog(): void {
    this.activityLog = [];
    localStorage.removeItem('security_activity_log');
  }

  // ضبط مهلة الجلسة
  setSessionTimeout(minutes: number): void {
    if (minutes < 1 || minutes > 1440) {
      throw new Error('مهلة الجلسة يجب أن تكون بين 1 و 1440 دقيقة');
    }
    
    this.sessionTimeout = minutes;
    
    // إعادة تشغيل المؤقت إذا كانت الجلسة نشطة
    if (this.sessionStartTime) {
      this.startSessionTimer();
    }
  }

  // تفعيل/إلغاء تفعيل التسجيل التلقائي للخروج
  enableAutoLogout(enabled: boolean): void {
    this.autoLogoutEnabled = enabled;
    
    if (enabled && this.sessionStartTime) {
      this.startSessionTimer();
    } else if (!enabled && this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  // ضبط مستوى التشفير
  setEncryptionLevel(level: 'basic' | 'advanced'): void {
    this.encryptionLevel = level;
  }

  // تسجيل معالج انتهاء الجلسة
  onSessionExpiry(callback: () => void): void {
    this.sessionCallbacks.push(callback);
  }

  // تسجيل معالج الأحداث الأمنية
  onSecurityEvent(callback: (activity: ConnectionActivity) => void): void {
    this.securityEventCallbacks.push(callback);
  }

  // توليد معرف النشاط
  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // الحصول على IP العميل (محاولة تقريبية)
  private getClientIP(): string {
    // في بيئة المتصفح، لا يمكن الحصول على IP الحقيقي
    // يمكن استخدام خدمة خارجية إذا لزم الأمر
    return 'localhost';
  }

  // حفظ سجل الأنشطة
  private saveActivityLog(): void {
    try {
      const logData = JSON.stringify(this.activityLog);
      localStorage.setItem('security_activity_log', logData);
    } catch (error) {
      console.error('فشل حفظ سجل الأنشطة:', error);
    }
  }

  // تحميل سجل الأنشطة
  loadActivityLog(): void {
    try {
      const logData = localStorage.getItem('security_activity_log');
      if (logData) {
        const activities = JSON.parse(logData);
        this.activityLog = activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      }
    } catch (error) {
      console.error('فشل تحميل سجل الأنشطة:', error);
      this.activityLog = [];
    }
  }

  // تهيئة الخدمة
  initialize(): void {
    this.loadActivityLog();
    
    // التحقق من الجلسة المحفوظة
    const savedSession = localStorage.getItem('security_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        this.sessionStartTime = new Date(sessionData.startTime);
        this.sessionTimeout = sessionData.timeout || SYSTEM_CONSTANTS.DEFAULT_SESSION_TIMEOUT;
        this.autoLogoutEnabled = sessionData.autoLogout ?? true;
        
        // التحقق من انتهاء الجلسة
        if (this.checkSessionExpiry()) {
          this.endSession();
          localStorage.removeItem('security_session');
        } else {
          this.startSessionTimer();
        }
      } catch (error) {
        console.error('فشل استعادة الجلسة:', error);
        localStorage.removeItem('security_session');
      }
    }
  }

  // حفظ حالة الجلسة
  saveSessionState(): void {
    if (this.sessionStartTime) {
      const sessionData = {
        startTime: this.sessionStartTime.toISOString(),
        timeout: this.sessionTimeout,
        autoLogout: this.autoLogoutEnabled
      };
      localStorage.setItem('security_session', JSON.stringify(sessionData));
    }
  }

  // تنظيف الموارد
  cleanup(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    this.sessionCallbacks = [];
    this.securityEventCallbacks = [];
    this.saveSessionState();
  }
}