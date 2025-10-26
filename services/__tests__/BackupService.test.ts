// services/__tests__/BackupService.test.ts - اختبارات خدمة النسخ الاحتياطي

import { BackupService } from '../BackupService';
import { ConnectionManagerService } from '../ConnectionManagerService';
import { AuditLogger } from '../AuditLogger';
import { ErrorType } from '../../types/database';

// Mock للخدمات المطلوبة
jest.mock('../ConnectionManagerService');
jest.mock('../AuditLogger');

describe('BackupService', () => {
  let backupService: BackupService;
  let mockConnectionManager: jest.Mocked<ConnectionManagerService>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    // إعداد المحاكيات
    mockConnectionManager = new ConnectionManagerService({} as any, {} as any) as jest.Mocked<ConnectionManagerService>;
    mockAuditLogger = new AuditLogger() as jest.Mocked<AuditLogger>;
    
    // إعداد localStorage mock
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // إعداد Blob mock
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      size: content[0].length,
      type: options?.type || 'text/plain'
    })) as any;

    backupService = new BackupService(mockConnectionManager, mockAuditLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    backupService.cleanup();
  });

  describe('إنشاء النسخ الاحتياطية', () => {
    const mockConnection = {
      id: 'test-connection-id',
      name: 'اتصال تجريبي',
      connectionConfig: {
        url: 'https://test.supabase.co',
        key: 'test-key',
        type: 'supabase' as const
      }
    };

    beforeEach(() => {
      mockConnectionManager.getConnection.mockReturnValue(mockConnection as any);
      mockConnectionManager.testConnection.mockResolvedValue({
        success: true,
        responseTime: 100,
        message: 'اتصال ناجح'
      });
    });

    test('يجب إنشاء نسخة احتياطية يدوية بنجاح', async () => {
      const result = await backupService.createManualBackup('test-connection-id', 'نسخة تجريبية');

      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.message).toBe('تم إنشاء النسخة الاحتياطية بنجاح');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);

      expect(mockAuditLogger.logBackup).toHaveBeenCalledWith(
        'test-connection-id',
        'اتصال تجريبي',
        'backup',
        true,
        expect.any(Object)
      );
    });

    test('يجب إنشاء نسخة احتياطية تلقائية بنجاح', async () => {
      const result = await backupService.createAutoBackup('test-connection-id');

      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      
      const backups = backupService.listBackups('test-connection-id');
      expect(backups).toHaveLength(1);
      expect(backups[0].type).toBe('auto');
    });

    test('يجب رفض إنشاء نسخة احتياطية لاتصال غير موجود', async () => {
      mockConnectionManager.getConnection.mockReturnValue(null);

      const result = await backupService.createManualBackup('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error?.message).toBe('الاتصال غير موجود');
    });

    test('يجب رفض إنشاء نسخة احتياطية عند فشل الاتصال', async () => {
      mockConnectionManager.testConnection.mockResolvedValue({
        success: false,
        responseTime: 0,
        message: 'فشل الاتصال',
        error: {
          type: ErrorType.CONNECTION_FAILED,
          message: 'فشل الاتصال',
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: []
        }
      });

      const result = await backupService.createManualBackup('test-connection-id');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CONNECTION_FAILED);
    });
  });

  describe('إدارة النسخ الاحتياطية', () => {
    let testBackupId: string;

    beforeEach(async () => {
      const mockConnection = {
        id: 'test-connection-id',
        name: 'اتصال تجريبي'
      };

      mockConnectionManager.getConnection.mockReturnValue(mockConnection as any);
      mockConnectionManager.testConnection.mockResolvedValue({
        success: true,
        responseTime: 100,
        message: 'اتصال ناجح'
      });

      const result = await backupService.createManualBackup('test-connection-id', 'نسخة للاختبار');
      testBackupId = result.backupId!;
    });

    test('يجب الحصول على قائمة النسخ الاحتياطية', () => {
      const backups = backupService.listBackups();
      
      expect(backups).toHaveLength(1);
      expect(backups[0].name).toContain('نسخة للاختبار');
      expect(backups[0].connectionId).toBe('test-connection-id');
    });

    test('يجب الحصول على نسخة احتياطية محددة', () => {
      const backup = backupService.getBackup(testBackupId);
      
      expect(backup).toBeDefined();
      expect(backup?.id).toBe(testBackupId);
      expect(backup?.name).toContain('نسخة للاختبار');
    });

    test('يجب إرجاع null للنسخة الاحتياطية غير الموجودة', () => {
      const backup = backupService.getBackup('non-existent-id');
      
      expect(backup).toBeNull();
    });

    test('يجب حذف نسخة احتياطية', async () => {
      await backupService.deleteBackup(testBackupId);
      
      const backup = backupService.getBackup(testBackupId);
      expect(backup).toBeNull();
      
      const backups = backupService.listBackups();
      expect(backups).toHaveLength(0);
    });

    test('يجب رفض حذف نسخة احتياطية غير موجودة', async () => {
      await expect(backupService.deleteBackup('non-existent-id'))
        .rejects
        .toMatchObject({
          type: ErrorType.STORAGE_ERROR,
          message: 'فشل حذف النسخة الاحتياطية'
        });
    });
  });

  describe('التحقق من صحة النسخ الاحتياطية', () => {
    let testBackupId: string;

    beforeEach(async () => {
      const mockConnection = {
        id: 'test-connection-id',
        name: 'اتصال تجريبي'
      };

      mockConnectionManager.getConnection.mockReturnValue(mockConnection as any);
      mockConnectionManager.testConnection.mockResolvedValue({
        success: true,
        responseTime: 100,
        message: 'اتصال ناجح'
      });

      const result = await backupService.createManualBackup('test-connection-id');
      testBackupId = result.backupId!;
    });

    test('يجب التحقق من صحة نسخة احتياطية صحيحة', async () => {
      const validation = await backupService.validateBackup(testBackupId);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.summary.corruptedTables).toBe(0);
    });

    test('يجب اكتشاف نسخة احتياطية غير موجودة', async () => {
      const validation = await backupService.validateBackup('non-existent-id');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].description).toBe('النسخة الاحتياطية غير موجودة');
    });
  });

  describe('استعادة النسخ الاحتياطية', () => {
    let testBackupId: string;

    beforeEach(async () => {
      const mockConnection = {
        id: 'test-connection-id',
        name: 'اتصال تجريبي'
      };

      mockConnectionManager.getConnection.mockReturnValue(mockConnection as any);
      mockConnectionManager.testConnection.mockResolvedValue({
        success: true,
        responseTime: 100,
        message: 'اتصال ناجح'
      });

      const result = await backupService.createManualBackup('test-connection-id');
      testBackupId = result.backupId!;
    });

    test('يجب استعادة نسخة احتياطية بنجاح', async () => {
      const options = {
        overwriteExisting: true,
        validateBeforeRestore: false,
        createBackupBeforeRestore: false
      };

      const result = await backupService.restoreFromBackup(testBackupId, options);

      expect(result.success).toBe(true);
      expect(result.message).toBe('تمت استعادة البيانات بنجاح');
      expect(result.duration).toBeGreaterThan(0);

      expect(mockAuditLogger.logBackup).toHaveBeenCalledWith(
        'test-connection-id',
        'اتصال تجريبي',
        'restore',
        true,
        expect.any(Object)
      );
    });

    test('يجب رفض استعادة نسخة احتياطية غير موجودة', async () => {
      const options = {
        overwriteExisting: true,
        validateBeforeRestore: false,
        createBackupBeforeRestore: false
      };

      const result = await backupService.restoreFromBackup('non-existent-id', options);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error?.message).toBe('النسخة الاحتياطية غير موجودة');
    });

    test('يجب إنشاء نسخة احتياطية قبل الاستعادة عند الطلب', async () => {
      const options = {
        overwriteExisting: true,
        validateBeforeRestore: false,
        createBackupBeforeRestore: true
      };

      const result = await backupService.restoreFromBackup(testBackupId, options);

      expect(result.success).toBe(true);
      
      // يجب أن يكون هناك نسختان احتياطيتان الآن
      const backups = backupService.listBackups('test-connection-id');
      expect(backups.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('جدولة النسخ الاحتياطي', () => {
    const mockConnection = {
      id: 'test-connection-id',
      name: 'اتصال تجريبي'
    };

    beforeEach(() => {
      mockConnectionManager.getConnection.mockReturnValue(mockConnection as any);
      mockConnectionManager.testConnection.mockResolvedValue({
        success: true,
        responseTime: 100,
        message: 'اتصال ناجح'
      });

      // Mock للـ setTimeout
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('يجب جدولة نسخ احتياطي يومي', () => {
      const schedule = {
        enabled: true,
        frequency: 'daily' as const,
        time: '02:00'
      };

      expect(() => {
        backupService.scheduleAutoBackup('test-connection-id', schedule);
      }).not.toThrow();

      expect(mockAuditLogger.logActivity).toHaveBeenCalledWith({
        action: expect.any(String),
        connectionId: 'test-connection-id',
        connectionName: 'جدولة النسخ الاحتياطي',
        success: true
      });
    });

    test('يجب إلغاء النسخ الاحتياطي المجدول', () => {
      const schedule = {
        enabled: true,
        frequency: 'daily' as const,
        time: '02:00'
      };

      backupService.scheduleAutoBackup('test-connection-id', schedule);
      
      expect(() => {
        backupService.cancelScheduledBackup('test-connection-id');
      }).not.toThrow();
    });

    test('يجب عدم جدولة نسخ احتياطي معطل', () => {
      const schedule = {
        enabled: false,
        frequency: 'daily' as const,
        time: '02:00'
      };

      backupService.scheduleAutoBackup('test-connection-id', schedule);
      
      // لا يجب أن يكون هناك مؤقت نشط
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('إعدادات الخدمة', () => {
    test('يجب ضبط مدة الاحتفاظ بالنسخ الاحتياطية', () => {
      expect(() => {
        backupService.setBackupRetention(60);
      }).not.toThrow();
    });

    test('يجب ضبط مستوى الضغط', () => {
      expect(() => {
        backupService.setCompressionLevel('high');
      }).not.toThrow();
      
      expect(() => {
        backupService.setCompressionLevel('none');
      }).not.toThrow();
    });
  });

  describe('معالجات الأحداث', () => {
    test('يجب تسجيل معالج التقدم', () => {
      const progressCallback = jest.fn();
      
      expect(() => {
        backupService.onBackupProgress(progressCallback);
      }).not.toThrow();
    });

    test('يجب تسجيل معالج الإكمال', () => {
      const completeCallback = jest.fn();
      
      expect(() => {
        backupService.onBackupComplete(completeCallback);
      }).not.toThrow();
    });
  });

  describe('التنظيف', () => {
    test('يجب تنظيف الموارد بدون أخطاء', () => {
      expect(() => {
        backupService.cleanup();
      }).not.toThrow();
    });
  });
});