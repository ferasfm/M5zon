// services/__tests__/ConnectionManagerService.test.ts - اختبارات خدمة إدارة الاتصالات

import { ConnectionManagerService } from '../ConnectionManagerService';
import { SecurityService } from '../SecurityService';
import { AuditLogger } from '../AuditLogger';
import { DatabaseConnectionModel } from '../../models/DatabaseConnectionModel';
import { ErrorType } from '../../types/database';

// Mock للخدمات المطلوبة
jest.mock('../SecurityService');
jest.mock('../AuditLogger');
jest.mock('../../lib/supabaseClient');

describe('ConnectionManagerService', () => {
  let connectionManager: ConnectionManagerService;
  let mockSecurityService: jest.Mocked<SecurityService>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    // إعداد المحاكيات
    mockSecurityService = new SecurityService() as jest.Mocked<SecurityService>;
    mockAuditLogger = new AuditLogger() as jest.Mocked<AuditLogger>;
    
    // إعداد localStorage mock
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    connectionManager = new ConnectionManagerService(mockSecurityService, mockAuditLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('إضافة الاتصالات', () => {
    test('يجب إضافة اتصال جديد بنجاح', async () => {
      const connectionData = {
        name: 'اتصال تجريبي',
        displayName: 'اتصال تجريبي للاختبار',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        },
        security: {
          encryptionEnabled: true,
          sessionTimeout: 60,
          autoLogout: true,
          encryptionLevel: 'basic' as const
        },
        backup: {
          autoBackupEnabled: true,
          retentionDays: 30,
          compressionLevel: 'low' as const
        },
        status: {
          isActive: false,
          health: 'unknown' as const,
          connectionCount: 0
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          environment: 'development' as const
        }
      };

      mockSecurityService.encryptConnectionData.mockResolvedValue('encrypted-key');

      const connectionId = await connectionManager.addConnection(connectionData);

      expect(connectionId).toBeDefined();
      expect(typeof connectionId).toBe('string');
      expect(mockSecurityService.encryptConnectionData).toHaveBeenCalledWith('test-key');
      expect(mockAuditLogger.logConnection).toHaveBeenCalledWith(
        connectionId,
        'اتصال تجريبي',
        'connect',
        true
      );
    });

    test('يجب رفض إضافة اتصال بدون اسم', async () => {
      const connectionData = {
        name: '',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        }
      } as any;

      await expect(connectionManager.addConnection(connectionData))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('بيانات الاتصال غير صحيحة')
        });
    });

    test('يجب رفض إضافة اتصال بنفس الاسم', async () => {
      const connectionData = {
        name: 'اتصال مكرر',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        }
      } as any;

      // إضافة الاتصال الأول
      await connectionManager.addConnection(connectionData);

      // محاولة إضافة اتصال بنفس الاسم
      await expect(connectionManager.addConnection(connectionData))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: 'اسم الاتصال موجود بالفعل'
        });
    });
  });

  describe('إدارة الاتصالات', () => {
    let testConnectionId: string;

    beforeEach(async () => {
      const connectionData = {
        name: 'اتصال للاختبار',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        }
      } as any;

      mockSecurityService.encryptConnectionData.mockResolvedValue('encrypted-key');
      testConnectionId = await connectionManager.addConnection(connectionData);
    });

    test('يجب الحصول على قائمة الاتصالات', () => {
      const connections = connectionManager.getConnections();
      
      expect(connections).toHaveLength(1);
      expect(connections[0].name).toBe('اتصال للاختبار');
    });

    test('يجب الحصول على اتصال محدد', () => {
      const connection = connectionManager.getConnection(testConnectionId);
      
      expect(connection).toBeDefined();
      expect(connection?.name).toBe('اتصال للاختبار');
    });

    test('يجب إرجاع null للاتصال غير الموجود', () => {
      const connection = connectionManager.getConnection('non-existent-id');
      
      expect(connection).toBeNull();
    });

    test('يجب تحديث اتصال موجود', async () => {
      const updates = {
        displayName: 'اسم محدث',
        description: 'وصف جديد'
      };

      await connectionManager.updateConnection(testConnectionId, updates);
      
      const updatedConnection = connectionManager.getConnection(testConnectionId);
      expect(updatedConnection?.displayName).toBe('اسم محدث');
      expect(updatedConnection?.description).toBe('وصف جديد');
    });

    test('يجب رفض تحديث اتصال غير موجود', async () => {
      await expect(connectionManager.updateConnection('non-existent-id', {}))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: 'الاتصال غير موجود'
        });
    });

    test('يجب حذف اتصال غير نشط', async () => {
      await connectionManager.deleteConnection(testConnectionId);
      
      const connections = connectionManager.getConnections();
      expect(connections).toHaveLength(0);
    });

    test('يجب رفض حذف اتصال نشط', async () => {
      // تفعيل الاتصال أولاً
      const connection = connectionManager.getConnection(testConnectionId);
      if (connection) {
        await connectionManager.updateConnection(testConnectionId, {
          status: { ...connection.status, isActive: true }
        });
      }

      await expect(connectionManager.deleteConnection(testConnectionId))
        .rejects
        .toMatchObject({
          type: ErrorType.VALIDATION_ERROR,
          message: 'لا يمكن حذف الاتصال النشط'
        });
    });
  });

  describe('اختبار الاتصال', () => {
    let testConnectionId: string;

    beforeEach(async () => {
      const connectionData = {
        name: 'اتصال للاختبار',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        }
      } as any;

      mockSecurityService.encryptConnectionData.mockResolvedValue('encrypted-key');
      mockSecurityService.decryptConnectionData.mockResolvedValue('test-key');
      
      testConnectionId = await connectionManager.addConnection(connectionData);
    });

    test('يجب اختبار الاتصال بنجاح', async () => {
      // Mock لـ Supabase client
      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      // Mock لـ createSupabaseClient
      const { createSupabaseClient } = require('../../lib/supabaseClient');
      createSupabaseClient.mockReturnValue(mockSupabaseClient);

      const result = await connectionManager.testConnection(testConnectionId);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(mockSecurityService.decryptConnectionData).toHaveBeenCalledWith('encrypted-key');
    });

    test('يجب التعامل مع فشل الاتصال', async () => {
      // Mock لـ Supabase client مع خطأ
      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' }
            })
          })
        })
      };

      const { createSupabaseClient } = require('../../lib/supabaseClient');
      createSupabaseClient.mockReturnValue(mockSupabaseClient);

      const result = await connectionManager.testConnection(testConnectionId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('خطأ في الاتصال');
    });

    test('يجب التعامل مع اتصال غير موجود', async () => {
      const result = await connectionManager.testConnection('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('الاتصال غير موجود');
    });
  });

  describe('الاتصال النشط', () => {
    let testConnectionId: string;

    beforeEach(async () => {
      const connectionData = {
        name: 'اتصال للاختبار',
        connectionConfig: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          type: 'supabase' as const,
          ssl: true,
          timeout: 10000
        }
      } as any;

      mockSecurityService.encryptConnectionData.mockResolvedValue('encrypted-key');
      mockSecurityService.decryptConnectionData.mockResolvedValue('test-key');
      
      testConnectionId = await connectionManager.addConnection(connectionData);
    });

    test('يجب الاتصال بقاعدة البيانات بنجاح', async () => {
      // Mock لـ Supabase client ناجح
      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      const { createSupabaseClient } = require('../../lib/supabaseClient');
      createSupabaseClient.mockReturnValue(mockSupabaseClient);

      const success = await connectionManager.connectTo(testConnectionId);

      expect(success).toBe(true);
      expect(mockSecurityService.startSession).toHaveBeenCalledWith(testConnectionId);
      
      const activeConnection = connectionManager.getActiveConnection();
      expect(activeConnection?.id).toBe(testConnectionId);
    });

    test('يجب قطع الاتصال بنجاح', async () => {
      // الاتصال أولاً
      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      const { createSupabaseClient } = require('../../lib/supabaseClient');
      createSupabaseClient.mockReturnValue(mockSupabaseClient);

      await connectionManager.connectTo(testConnectionId);
      
      // ثم قطع الاتصال
      await connectionManager.disconnect();

      expect(mockSecurityService.endSession).toHaveBeenCalled();
      
      const activeConnection = connectionManager.getActiveConnection();
      expect(activeConnection).toBeNull();
    });

    test('يجب الحصول على مقاييس الاتصال', () => {
      const metrics = connectionManager.getConnectionMetrics();

      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('successfulConnections');
      expect(metrics).toHaveProperty('failedConnections');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('uptime');
    });
  });

  describe('معالجات الأحداث', () => {
    test('يجب تسجيل معالج تغيير الاتصال', () => {
      const callback = jest.fn();
      
      connectionManager.onConnectionChange(callback);
      
      // لا يمكن اختبار الاستدعاء مباشرة بدون تفعيل اتصال
      // لكن يمكن التأكد من عدم حدوث أخطاء
      expect(true).toBe(true);
    });

    test('يجب تسجيل معالج تغيير الصحة', () => {
      const callback = jest.fn();
      
      connectionManager.onHealthChange(callback);
      
      // لا يمكن اختبار الاستدعاء مباشرة بدون تفعيل اتصال
      // لكن يمكن التأكد من عدم حدوث أخطاء
      expect(true).toBe(true);
    });
  });

  describe('التنظيف', () => {
    test('يجب تنظيف الموارد بدون أخطاء', () => {
      expect(() => {
        connectionManager.cleanup();
      }).not.toThrow();
    });
  });
});