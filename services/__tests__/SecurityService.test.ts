// services/__tests__/SecurityService.test.ts - اختبارات خدمة الأمان

import { SecurityService } from '../SecurityService';
import { ActivityType, ErrorType } from '../../types/database';

// Mock للـ Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    exportKey: jest.fn()
  },
  getRandomValues: jest.fn()
};

// Mock للـ localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

// إعداد المتغيرات العامة
(global as any).crypto = mockCrypto;
(global as any).localStorage = mockLocalStorage;
(global as any).navigator = { userAgent: 'test-browser' };

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = new SecurityService();
    jest.clearAllMocks();
    
    // إعداد mock للـ crypto
    mockCrypto.getRandomValues.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });
  });

  afterEach(() => {
    securityService.cleanup();
  });

  describe('التشفير وفك التشفير', () => {
    beforeEach(() => {
      // إعداد mock للتشفير
      const mockKey = { type: 'secret' };
      const mockEncrypted = new ArrayBuffer(32);
      const mockDecrypted = new ArrayBuffer(16);

      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);
      mockCrypto.subtle.decrypt.mockResolvedValue(mockDecrypted);
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));

      // Mock للـ TextEncoder/TextDecoder
      (global as any).TextEncoder = class {
        encode(text: string) {
          return new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
        }
      };

      (global as any).TextDecoder = class {
        decode(buffer: ArrayBuffer) {
          return 'decrypted-data';
        }
      };

      // Mock للـ btoa/atob
      (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
      (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    });

    test('يجب تشفير البيانات بنجاح', async () => {
      const testData = 'test-connection-data';
      
      const encrypted = await securityService.encryptConnectionData(testData);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    test('يجب فك تشفير البيانات بنجاح', async () => {
      const encryptedData = 'encrypted-test-data';
      
      const decrypted = await securityService.decryptConnectionData(encryptedData);
      
      expect(decrypted).toBe('decrypted-data');
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    test('يجب رفع خطأ عند فشل التشفير', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      await expect(securityService.encryptConnectionData('test'))
        .rejects
        .toMatchObject({
          type: ErrorType.ENCRYPTION_ERROR,
          message: 'فشل تشفير البيانات'
        });
    });

    test('يجب توليد مفتاح تشفير', async () => {
      const key = await securityService.generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalled();
    });
  });

  describe('إدارة الجلسات', () => {
    test('يجب بدء الجلسة بنجاح', () => {
      const connectionId = 'test-connection';
      
      securityService.startSession(connectionId);
      
      expect(securityService.getRemainingTime()).toBeGreaterThan(0);
    });

    test('يجب تمديد الجلسة', () => {
      const connectionId = 'test-connection';
      
      securityService.startSession(connectionId);
      const initialTime = securityService.getRemainingTime();
      
      // انتظار قصير
      setTimeout(() => {
        securityService.extendSession();
        const extendedTime = securityService.getRemainingTime();
        
        expect(extendedTime).toBeGreaterThanOrEqual(initialTime);
      }, 100);
    });

    test('يجب إنهاء الجلسة', () => {
      const connectionId = 'test-connection';
      
      securityService.startSession(connectionId);
      securityService.endSession();
      
      expect(securityService.getRemainingTime()).toBe(-1);
    });

    test('يجب التحقق من انتهاء الجلسة', () => {
      securityService.setSessionTimeout(1); // دقيقة واحدة
      securityService.enableAutoLogout(true);
      
      expect(securityService.checkSessionExpiry()).toBe(false);
      
      // محاكاة جلسة منتهية
      securityService.startSession('test');
      // تعديل الوقت للمحاكاة
      (securityService as any).sessionStartTime = new Date(Date.now() - 2 * 60 * 1000); // منذ دقيقتين
      
      expect(securityService.checkSessionExpiry()).toBe(true);
    });

    test('يجب ضبط مهلة الجلسة', () => {
      securityService.setSessionTimeout(30);
      
      // اختبار قيم غير صحيحة
      expect(() => securityService.setSessionTimeout(0)).toThrow();
      expect(() => securityService.setSessionTimeout(1500)).toThrow();
    });

    test('يجب تفعيل/إلغاء تفعيل التسجيل التلقائي للخروج', () => {
      securityService.enableAutoLogout(true);
      securityService.enableAutoLogout(false);
      
      // لا يجب أن يرفع أخطاء
      expect(true).toBe(true);
    });
  });

  describe('تسجيل الأنشطة', () => {
    test('يجب تسجيل نشاط الاتصال', () => {
      const activity = {
        action: ActivityType.CONNECT,
        connectionId: 'test-connection',
        connectionName: 'اتصال تجريبي',
        success: true
      };
      
      securityService.logConnectionActivity(activity);
      
      const log = securityService.getActivityLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject(activity);
      expect(log[0].id).toBeDefined();
      expect(log[0].timestamp).toBeInstanceOf(Date);
    });

    test('يجب الحصول على سجل الأنشطة مع حد أقصى', () => {
      // إضافة عدة أنشطة
      for (let i = 0; i < 5; i++) {
        securityService.logConnectionActivity({
          action: ActivityType.TEST,
          connectionId: `connection-${i}`,
          connectionName: `اتصال ${i}`,
          success: true
        });
      }
      
      const limitedLog = securityService.getActivityLog(3);
      expect(limitedLog).toHaveLength(3);
      
      const fullLog = securityService.getActivityLog();
      expect(fullLog).toHaveLength(5);
    });

    test('يجب مسح سجل الأنشطة', () => {
      securityService.logConnectionActivity({
        action: ActivityType.CONNECT,
        connectionId: 'test',
        connectionName: 'test',
        success: true
      });
      
      expect(securityService.getActivityLog()).toHaveLength(1);
      
      securityService.clearActivityLog();
      
      expect(securityService.getActivityLog()).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('security_activity_log');
    });
  });

  describe('معالجات الأحداث', () => {
    test('يجب تسجيل معالج انتهاء الجلسة', () => {
      const callback = jest.fn();
      
      securityService.onSessionExpiry(callback);
      
      // محاكاة انتهاء الجلسة
      securityService.setSessionTimeout(1);
      securityService.startSession('test');
      (securityService as any).handleSessionExpiry();
      
      expect(callback).toHaveBeenCalled();
    });

    test('يجب تسجيل معالج الأحداث الأمنية', () => {
      const callback = jest.fn();
      
      securityService.onSecurityEvent(callback);
      
      securityService.logConnectionActivity({
        action: ActivityType.CONNECT,
        connectionId: 'test',
        connectionName: 'test',
        success: true
      });
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('التهيئة والتنظيف', () => {
    test('يجب تهيئة الخدمة', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));
      
      securityService.initialize();
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('security_activity_log');
    });

    test('يجب حفظ حالة الجلسة', () => {
      securityService.startSession('test');
      securityService.saveSessionState();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'security_session',
        expect.any(String)
      );
    });

    test('يجب تنظيف الموارد', () => {
      securityService.startSession('test');
      securityService.cleanup();
      
      // لا يجب أن يرفع أخطاء
      expect(true).toBe(true);
    });
  });
});