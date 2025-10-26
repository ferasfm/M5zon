// services/__tests__/AuditLogger.test.ts - اختبارات نظام تسجيل الأنشطة

import { AuditLogger, AuditLogEntry } from '../AuditLogger';
import { ActivityType, ErrorType } from '../../types/database';
import { DatabaseError } from '../../interfaces/database';

// محاكاة localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// محاكاة navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Test User Agent'
  }
});

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    localStorageMock.clear();
    auditLogger = new AuditLogger(100); // حد أقصى 100 إدخال للاختبار
  });

  afterEach(() => {
    auditLogger.cleanup();
  });

  describe('تسجيل الأنشطة الأساسية', () => {
    test('يجب أن يسجل نشاط اتصال بنجاح', () => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات الاختبار', 'connect', true, 1500);
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.action).toBe(ActivityType.CONNECT);
      expect(log.connectionId).toBe('conn-1');
      expect(log.connectionName).toBe('قاعدة بيانات الاختبار');
      expect(log.success).toBe(true);
      expect(log.duration).toBe(1500);
      expect(log.level).toBe('info');
      expect(log.category).toBe('connection');
    });

    test('يجب أن يسجل نشاط اتصال فاشل', () => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات الاختبار', 'connect', false, undefined, 'فشل الاتصال');
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.success).toBe(false);
      expect(log.errorMessage).toBe('فشل الاتصال');
      expect(log.level).toBe('error');
    });

    test('يجب أن يسجل نشاط النسخ الاحتياطي', () => {
      const metadata = { size: 1024, tables: 5 };
      auditLogger.logBackup('conn-1', 'قاعدة بيانات الاختبار', 'backup', true, metadata);
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.action).toBe(ActivityType.BACKUP);
      expect(log.category).toBe('backup');
      expect(log.metadata).toEqual(metadata);
    });

    test('يجب أن يسجل نشاط الأمان', () => {
      const metadata = { sessionId: 'session-123' };
      auditLogger.logSecurity(ActivityType.LOGIN, 'conn-1', true, metadata);
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.action).toBe(ActivityType.LOGIN);
      expect(log.category).toBe('security');
      expect(log.level).toBe('info');
    });

    test('يجب أن يسجل نشاط المزامنة', () => {
      const metadata = { recordsSync: 50, conflicts: 2 };
      auditLogger.logSync('conn-1', 'قاعدة بيانات الاختبار', true, metadata);
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.action).toBe(ActivityType.SYNC);
      expect(log.category).toBe('sync');
    });
  });

  describe('تسجيل الأخطاء', () => {
    test('يجب أن يسجل خطأ الاتصال', () => {
      const error: DatabaseError = {
        type: ErrorType.CONNECTION_FAILED,
        message: 'فشل الاتصال بقاعدة البيانات',
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['تحقق من الاتصال بالإنترنت']
      };

      auditLogger.logError(error, 'conn-1');
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.level).toBe('error');
      expect(log.category).toBe('connection');
      expect(log.success).toBe(false);
      expect(log.errorMessage).toBe(error.message);
      expect(log.metadata?.errorType).toBe(ErrorType.CONNECTION_FAILED);
    });

    test('يجب أن يسجل خطأ أمني بمستوى حرج', () => {
      const error: DatabaseError = {
        type: ErrorType.AUTHENTICATION_ERROR,
        message: 'فشل المصادقة',
        timestamp: new Date(),
        recoverable: false,
        suggestedActions: ['تحقق من بيانات الاعتماد']
      };

      auditLogger.logError(error, 'conn-1');
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.level).toBe('critical');
      expect(log.category).toBe('security');
    });
  });

  describe('التصفية والبحث', () => {
    beforeEach(() => {
      // إضافة بيانات اختبار متنوعة
      auditLogger.logConnection('conn-1', 'قاعدة بيانات 1', 'connect', true);
      auditLogger.logConnection('conn-2', 'قاعدة بيانات 2', 'connect', false, undefined, 'خطأ');
      auditLogger.logBackup('conn-1', 'قاعدة بيانات 1', 'backup', true);
      auditLogger.logSecurity(ActivityType.LOGIN, 'conn-1', true);
    });

    test('يجب أن يصفي السجلات حسب معرف الاتصال', () => {
      const logs = auditLogger.getLogs({ connectionId: 'conn-1' });
      expect(logs).toHaveLength(3);
      logs.forEach(log => expect(log.connectionId).toBe('conn-1'));
    });

    test('يجب أن يصفي السجلات حسب النجاح', () => {
      const successLogs = auditLogger.getLogs({ success: true });
      expect(successLogs).toHaveLength(3);
      
      const failedLogs = auditLogger.getLogs({ success: false });
      expect(failedLogs).toHaveLength(1);
    });

    test('يجب أن يصفي السجلات حسب المستوى', () => {
      const infoLogs = auditLogger.getLogs({ level: 'info' });
      expect(infoLogs).toHaveLength(3);
      
      const errorLogs = auditLogger.getLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
    });

    test('يجب أن يصفي السجلات حسب الفئة', () => {
      const connectionLogs = auditLogger.getLogs({ category: 'connection' });
      expect(connectionLogs).toHaveLength(2);
      
      const backupLogs = auditLogger.getLogs({ category: 'backup' });
      expect(backupLogs).toHaveLength(1);
      
      const securityLogs = auditLogger.getLogs({ category: 'security' });
      expect(securityLogs).toHaveLength(1);
    });

    test('يجب أن يحدد عدد النتائج', () => {
      const logs = auditLogger.getLogs({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    test('يجب أن يبحث في السجلات', () => {
      const results = auditLogger.searchLogs('قاعدة بيانات 1');
      expect(results).toHaveLength(3);
      
      const errorResults = auditLogger.searchLogs('خطأ');
      expect(errorResults).toHaveLength(1);
    });
  });

  describe('الإحصائيات', () => {
    beforeEach(() => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات 1', 'connect', true);
      auditLogger.logConnection('conn-2', 'قاعدة بيانات 2', 'connect', false, undefined, 'خطأ');
      auditLogger.logBackup('conn-1', 'قاعدة بيانات 1', 'backup', true);
      auditLogger.logSecurity(ActivityType.LOGIN, 'conn-1', false);
    });

    test('يجب أن يحسب الإحصائيات بشكل صحيح', () => {
      const stats = auditLogger.getStats();
      
      expect(stats.totalEntries).toBe(4);
      expect(stats.successfulActions).toBe(2);
      expect(stats.failedActions).toBe(2);
      
      expect(stats.byLevel.info).toBe(2);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byLevel.critical).toBe(1);
      
      expect(stats.byCategory.connection).toBe(2);
      expect(stats.byCategory.backup).toBe(1);
      expect(stats.byCategory.security).toBe(1);
      
      expect(stats.recentActivity).toHaveLength(4);
    });
  });

  describe('التصدير والاستيراد', () => {
    beforeEach(() => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات الاختبار', 'connect', true);
      auditLogger.logBackup('conn-1', 'قاعدة بيانات الاختبار', 'backup', true);
    });

    test('يجب أن يصدر السجلات بتنسيق JSON', () => {
      const exported = auditLogger.exportLogs('json');
      const data = JSON.parse(exported);
      
      expect(data.logs).toHaveLength(2);
      expect(data.totalEntries).toBe(2);
      expect(data.exportDate).toBeDefined();
    });

    test('يجب أن يصدر السجلات بتنسيق CSV', () => {
      const exported = auditLogger.exportLogs('csv');
      const lines = exported.split('\n');
      
      expect(lines).toHaveLength(3); // رأس + سجلين
      expect(lines[0]).toContain('التاريخ والوقت');
    });

    test('يجب أن يستورد السجلات بنجاح', () => {
      const exported = auditLogger.exportLogs('json');
      
      auditLogger.clearLogs();
      expect(auditLogger.getLogs()).toHaveLength(0);
      
      auditLogger.importLogs(exported);
      expect(auditLogger.getLogs()).toHaveLength(2);
    });

    test('يجب أن يرفض استيراد بيانات غير صحيحة', () => {
      expect(() => {
        auditLogger.importLogs('بيانات غير صحيحة');
      }).toThrow('فشل استيراد السجلات: تنسيق غير صحيح');
    });
  });

  describe('إدارة السجلات', () => {
    test('يجب أن يحافظ على الحد الأقصى من الإدخالات', () => {
      const smallLogger = new AuditLogger(3);
      
      // إضافة 5 سجلات
      for (let i = 1; i <= 5; i++) {
        smallLogger.logConnection(`conn-${i}`, `قاعدة بيانات ${i}`, 'connect', true);
      }
      
      const logs = smallLogger.getLogs();
      expect(logs).toHaveLength(3);
      
      // يجب أن تكون السجلات الأحدث (4، 5، 3)
      expect(logs[0].connectionId).toBe('conn-5');
      expect(logs[1].connectionId).toBe('conn-4');
      expect(logs[2].connectionId).toBe('conn-3');
      
      smallLogger.cleanup();
    });

    test('يجب أن يمسح السجلات القديمة', () => {
      // إضافة سجل قديم
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      
      auditLogger.logConnection('conn-old', 'قاعدة بيانات قديمة', 'connect', true);
      // تعديل التاريخ يدوياً للاختبار
      const logs = auditLogger.getLogs();
      if (logs.length > 0) {
        logs[0].timestamp = oldDate;
      }
      
      auditLogger.logConnection('conn-new', 'قاعدة بيانات جديدة', 'connect', true);
      
      auditLogger.clearOldLogs(5); // مسح السجلات الأقدم من 5 أيام
      
      const remainingLogs = auditLogger.getLogs();
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].connectionId).toBe('conn-new');
    });

    test('يجب أن يمسح جميع السجلات', () => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات', 'connect', true);
      expect(auditLogger.getLogs()).toHaveLength(1);
      
      auditLogger.clearLogs();
      expect(auditLogger.getLogs()).toHaveLength(0);
    });
  });

  describe('إعدادات التسجيل', () => {
    test('يجب أن يتوقف عن التسجيل عند الإلغاء', () => {
      auditLogger.setEnabled(false);
      auditLogger.logConnection('conn-1', 'قاعدة بيانات', 'connect', true);
      
      expect(auditLogger.getLogs()).toHaveLength(0);
      
      auditLogger.setEnabled(true);
      auditLogger.logConnection('conn-1', 'قاعدة بيانات', 'connect', true);
      
      expect(auditLogger.getLogs()).toHaveLength(1);
    });

    test('يجب أن يشعر المعالجات بالسجلات الجديدة', () => {
      const mockCallback = jest.fn();
      auditLogger.onNewLog(mockCallback);
      
      auditLogger.logConnection('conn-1', 'قاعدة بيانات', 'connect', true);
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        connectionId: 'conn-1',
        action: ActivityType.CONNECT
      }));
      
      auditLogger.removeLogCallback(mockCallback);
      auditLogger.logConnection('conn-2', 'قاعدة بيانات', 'connect', true);
      
      expect(mockCallback).toHaveBeenCalledTimes(1); // لم يتم استدعاؤه مرة أخرى
    });
  });

  describe('التخزين المحلي', () => {
    test('يجب أن يحفظ ويحمل السجلات من التخزين المحلي', () => {
      auditLogger.logConnection('conn-1', 'قاعدة بيانات', 'connect', true);
      
      // إنشاء مثيل جديد يجب أن يحمل السجلات
      const newLogger = new AuditLogger();
      const logs = newLogger.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].connectionId).toBe('conn-1');
      
      newLogger.cleanup();
    });
  });
});

// دوال مساعدة للاختبار
function createMockError(type: ErrorType, message: string): DatabaseError {
  return {
    type,
    message,
    timestamp: new Date(),
    recoverable: true,
    suggestedActions: []
  };
}

// تصدير للاستخدام في اختبارات أخرى
export { createMockError };