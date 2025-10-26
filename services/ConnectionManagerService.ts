// services/ConnectionManagerService.ts - خدمة إدارة الاتصالات المتعددة

import { IConnectionManagerService } from '../interfaces/services';
import { 
  DatabaseConnection, 
  ConnectionTestResult, 
  ConnectionMetrics, 
  ConnectionHealthInfo,
  DatabaseError 
} from '../interfaces/database';
import { DatabaseConnectionModel } from '../models/DatabaseConnectionModel';
import { ConnectionStorage } from './ConnectionStorage';
import { SecurityService } from './SecurityService';
import { AuditLogger } from './AuditLogger';
import { ConnectionValidator } from '../utils/connectionValidation';
import { ErrorType, ActivityType, SYSTEM_CONSTANTS } from '../types/database';
import { createSupabaseClient } from '../lib/supabaseClient';

export class ConnectionManagerService implements IConnectionManagerService {
  private storage: ConnectionStorage;
  private securityService: SecurityService;
  private auditLogger: AuditLogger;
  private connections: DatabaseConnectionModel[] = [];
  private activeConnection: DatabaseConnectionModel | null = null;
  private connectionChangeCallbacks: ((connection: DatabaseConnection | null) => void)[] = [];
  private healthChangeCallbacks: ((health: ConnectionHealthInfo) => void)[] = [];
  private metrics: ConnectionMetrics;

  constructor(
    securityService: SecurityService,
    auditLogger: AuditLogger
  ) {
    this.securityService = securityService;
    this.auditLogger = auditLogger;
    this.storage = new ConnectionStorage(securityService);
    
    this.metrics = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      uptime: 0
    };

    this.initialize();
  }

  // تهيئة الخدمة
  private async initialize(): Promise<void> {
    try {
      // تحميل الاتصالات المحفوظة
      this.connections = await this.storage.loadConnections();
      
      // البحث عن الاتصال النشط
      this.activeConnection = this.connections.find(conn => conn.status.isActive) || null;
      
      // تحديث المقاييس
      this.updateMetrics();
      
      // تسجيل النشاط
      this.auditLogger.logActivity({
        action: ActivityType.CONNECT,
        connectionId: 'system',
        connectionName: 'تهيئة النظام',
        success: true
      });
      
    } catch (error) {
      console.error('فشل تهيئة مدير الاتصالات:', error);
      this.auditLogger.logError({
        type: ErrorType.STORAGE_ERROR,
        message: 'فشل تهيئة مدير الاتصالات',
        details: error,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['إعادة تحميل الصفحة', 'مسح البيانات المحفوظة']
      });
    }
  }

  // إضافة اتصال جديد
  async addConnection(connectionData: Omit<DatabaseConnection, 'id' | 'metadata'>): Promise<string> {
    try {
      // التحقق من صحة البيانات
      const validation = ConnectionValidator.validateConnection(connectionData);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: `بيانات الاتصال غير صحيحة: ${errorMessage}`,
          details: validation.errors,
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['تصحيح البيانات المدخلة', 'التحقق من صحة المعلومات']
        };
      }

      // التحقق من تفرد الاسم
      const isUnique = await ConnectionValidator.validateUniqueName(
        connectionData.name, 
        undefined, 
        this.connections.map(c => c.toJSON())
      );
      
      if (!isUnique) {
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: 'اسم الاتصال موجود بالفعل',
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['اختيار اسم مختلف', 'تعديل الاتصال الموجود']
        };
      }

      // إنشاء الاتصال الجديد
      const newConnection = new DatabaseConnectionModel(connectionData);
      
      // تشفير معلومات الاتصال إذا كان مفعلاً
      if (newConnection.security.encryptionEnabled) {
        newConnection.connectionConfig.key = await this.securityService.encryptConnectionData(
          newConnection.connectionConfig.key
        );
      }

      // إضافة إلى القائمة
      this.connections.push(newConnection);
      
      // حفظ في التخزين
      await this.storage.saveConnections(this.connections);
      
      // تحديث المقاييس
      this.updateMetrics();
      
      // تسجيل النشاط
      this.auditLogger.logConnection(
        newConnection.id,
        newConnection.name,
        'connect',
        true
      );

      return newConnection.id;
      
    } catch (error) {
      this.auditLogger.logError(error as DatabaseError);
      throw error;
    }
  }

  // تحديث اتصال موجود
  async updateConnection(id: string, updates: Partial<DatabaseConnection>): Promise<void> {
    try {
      const connectionIndex = this.connections.findIndex(conn => conn.id === id);
      if (connectionIndex === -1) {
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: 'الاتصال غير موجود',
          timestamp: new Date(),
          recoverable: false,
          suggestedActions: ['التحقق من معرف الاتصال']
        };
      }

      const connection = this.connections[connectionIndex];
      const originalData = connection.toJSON();

      // تطبيق التحديثات
      if (updates.name) connection.name = updates.name;
      if (updates.displayName) connection.displayName = updates.displayName;
      if (updates.description !== undefined) connection.description = updates.description;
      
      if (updates.connectionConfig) {
        connection.updateConnectionConfig(updates.connectionConfig);
      }
      
      if (updates.security) {
        connection.updateSecurityConfig(updates.security);
      }
      
      if (updates.backup) {
        connection.updateBackupConfig(updates.backup);
      }

      // التحقق من صحة البيانات المحدثة
      const validation = ConnectionValidator.validateConnection(connection.toJSON());
      if (!validation.isValid) {
        // استعادة البيانات الأصلية
        this.connections[connectionIndex] = DatabaseConnectionModel.fromJSON(originalData);
        
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: `فشل تحديث الاتصال: ${errorMessage}`,
          details: validation.errors,
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['تصحيح البيانات المدخلة']
        };
      }

      // تشفير المفتاح إذا تم تغييره
      if (updates.connectionConfig?.key && connection.security.encryptionEnabled) {
        connection.connectionConfig.key = await this.securityService.encryptConnectionData(
          updates.connectionConfig.key
        );
      }

      // حفظ التغييرات
      await this.storage.saveConnections(this.connections);
      
      // تحديث الاتصال النشط إذا كان هو المحدث
      if (this.activeConnection && this.activeConnection.id === id) {
        this.activeConnection = connection;
      }

      // تسجيل النشاط
      this.auditLogger.logActivity({
        action: ActivityType.CONNECT,
        connectionId: id,
        connectionName: connection.name,
        success: true
      });

    } catch (error) {
      this.auditLogger.logError(error as DatabaseError, id);
      throw error;
    }
  }

  // حذف اتصال
  async deleteConnection(id: string): Promise<void> {
    try {
      const connectionIndex = this.connections.findIndex(conn => conn.id === id);
      if (connectionIndex === -1) {
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: 'الاتصال غير موجود',
          timestamp: new Date(),
          recoverable: false,
          suggestedActions: ['التحقق من معرف الاتصال']
        };
      }

      const connection = this.connections[connectionIndex];
      
      // التحقق من أن الاتصال ليس نشطاً
      if (connection.status.isActive) {
        throw {
          type: ErrorType.VALIDATION_ERROR,
          message: 'لا يمكن حذف الاتصال النشط',
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['قطع الاتصال أولاً', 'التبديل إلى اتصال آخر']
        };
      }

      // حذف من القائمة
      this.connections.splice(connectionIndex, 1);
      
      // حفظ التغييرات
      await this.storage.saveConnections(this.connections);
      
      // تحديث المقاييس
      this.updateMetrics();

      // تسجيل النشاط
      this.auditLogger.logActivity({
        action: ActivityType.DISCONNECT,
        connectionId: id,
        connectionName: connection.name,
        success: true
      });

    } catch (error) {
      this.auditLogger.logError(error as DatabaseError, id);
      throw error;
    }
  }

  // الحصول على جميع الاتصالات
  getConnections(): DatabaseConnection[] {
    return this.connections.map(conn => conn.toJSON());
  }

  // الحصول على اتصال محدد
  getConnection(id: string): DatabaseConnection | null {
    const connection = this.connections.find(conn => conn.id === id);
    return connection ? connection.toJSON() : null;
  }

  // الحصول على الاتصال النشط
  getActiveConnection(): DatabaseConnection | null {
    return this.activeConnection ? this.activeConnection.toJSON() : null;
  }

  // الاتصال بقاعدة بيانات
  async connectTo(connectionId: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const connection = this.connections.find(conn => conn.id === connectionId);
      if (!connection) {
        throw {
          type: ErrorType.CONNECTION_FAILED,
          message: 'الاتصال غير موجود',
          timestamp: new Date(),
          recoverable: false,
          suggestedActions: ['التحقق من معرف الاتصال']
        };
      }

      // فك تشفير المفتاح إذا كان مشفراً
      let key = connection.connectionConfig.key;
      if (connection.security.encryptionEnabled) {
        key = await this.securityService.decryptConnectionData(key);
      }

      // اختبار الاتصال
      const testResult = await this.performConnectionTest(
        connection.connectionConfig.url,
        key,
        connection.connectionConfig.type
      );

      if (!testResult.success) {
        throw {
          type: ErrorType.CONNECTION_FAILED,
          message: testResult.message,
          details: testResult.error,
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: [
            'التحقق من صحة معلومات الاتصال',
            'التأكد من أن الخادم متاح',
            'فحص اتصال الإنترنت'
          ]
        };
      }

      // إلغاء تفعيل جميع الاتصالات
      this.connections.forEach(conn => {
        conn.status.isActive = false;
      });

      // تفعيل الاتصال الجديد
      connection.status.isActive = true;
      connection.status.lastConnected = new Date();
      connection.status.health = 'healthy';
      connection.status.connectionCount++;
      
      // حساب متوسط وقت الاستجابة
      const responseTime = Date.now() - startTime;
      if (connection.status.averageResponseTime) {
        connection.status.averageResponseTime = 
          (connection.status.averageResponseTime + responseTime) / 2;
      } else {
        connection.status.averageResponseTime = responseTime;
      }

      connection.updateMetadata();

      // حفظ التغييرات
      await this.storage.saveConnections(this.connections);
      
      // تحديث الاتصال النشط
      this.activeConnection = connection;
      
      // بدء الجلسة
      this.securityService.startSession(connectionId);
      
      // تحديث المقاييس
      this.metrics.successfulConnections++;
      this.updateMetrics();

      // إشعار المستمعين
      this.notifyConnectionChange(connection.toJSON());

      // تسجيل النشاط
      this.auditLogger.logConnection(
        connectionId,
        connection.name,
        'connect',
        true,
        responseTime
      );

      return true;

    } catch (error) {
      this.metrics.failedConnections++;
      this.updateMetrics();

      this.auditLogger.logConnection(
        connectionId,
        'اتصال فاشل',
        'connect',
        false,
        Date.now() - startTime,
        (error as DatabaseError).message
      );

      throw error;
    }
  }

  // قطع الاتصال
  async disconnect(): Promise<void> {
    try {
      if (!this.activeConnection) {
        return; // لا يوجد اتصال نشط
      }

      const connection = this.activeConnection;
      
      // إلغاء تفعيل الاتصال
      connection.status.isActive = false;
      connection.updateMetadata();
      
      // حفظ التغييرات
      await this.storage.saveConnections(this.connections);
      
      // إنهاء الجلسة
      this.securityService.endSession();
      
      // مسح الاتصال النشط
      this.activeConnection = null;
      
      // إشعار المستمعين
      this.notifyConnectionChange(null);

      // تسجيل النشاط
      this.auditLogger.logConnection(
        connection.id,
        connection.name,
        'disconnect',
        true
      );

    } catch (error) {
      this.auditLogger.logError(error as DatabaseError);
      throw error;
    }
  }

  // اختبار اتصال
  async testConnection(connectionId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const connection = this.connections.find(conn => conn.id === connectionId);
      if (!connection) {
        return {
          success: false,
          responseTime: 0,
          message: 'الاتصال غير موجود',
          error: {
            type: ErrorType.VALIDATION_ERROR,
            message: 'الاتصال غير موجود',
            timestamp: new Date(),
            recoverable: false,
            suggestedActions: []
          }
        };
      }

      // فك تشفير المفتاح إذا كان مشفراً
      let key = connection.connectionConfig.key;
      if (connection.security.encryptionEnabled) {
        key = await this.securityService.decryptConnectionData(key);
      }

      // إجراء اختبار الاتصال
      const result = await this.performConnectionTest(
        connection.connectionConfig.url,
        key,
        connection.connectionConfig.type
      );

      // تحديث حالة الصحة
      connection.status.health = result.success ? 'healthy' : 'error';
      connection.status.lastHealthCheck = new Date();
      
      if (result.success && result.responseTime) {
        connection.status.averageResponseTime = result.responseTime;
      }

      connection.updateMetadata();
      await this.storage.saveConnections(this.connections);

      // تسجيل النشاط
      this.auditLogger.logConnection(
        connectionId,
        connection.name,
        'test',
        result.success,
        result.responseTime,
        result.success ? undefined : result.message
      );

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.auditLogger.logConnection(
        connectionId,
        'اختبار فاشل',
        'test',
        false,
        responseTime,
        (error as Error).message
      );

      return {
        success: false,
        responseTime,
        message: 'فشل اختبار الاتصال',
        error: error as DatabaseError
      };
    }
  }

  // إجراء اختبار الاتصال الفعلي
  private async performConnectionTest(url: string, key: string, type: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // حالياً ندعم Supabase فقط
      if (type === 'supabase') {
        const client = createSupabaseClient(url, key);
        const { data, error } = await client.from('products').select('count').limit(1);
        
        const responseTime = Date.now() - startTime;
        
        if (error) {
          return {
            success: false,
            responseTime,
            message: `خطأ في الاتصال: ${error.message}`,
            error: {
              type: ErrorType.CONNECTION_FAILED,
              message: error.message,
              details: error,
              timestamp: new Date(),
              recoverable: true,
              suggestedActions: [
                'التحقق من صحة URL والمفتاح',
                'التأكد من أن قاعدة البيانات متاحة'
              ]
            }
          };
        }

        return {
          success: true,
          responseTime,
          message: 'الاتصال ناجح',
          details: {
            serverVersion: 'Supabase',
            databaseName: 'PostgreSQL',
            tableCount: data ? 1 : 0
          }
        };
      }

      return {
        success: false,
        responseTime: Date.now() - startTime,
        message: 'نوع قاعدة البيانات غير مدعوم',
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'نوع قاعدة البيانات غير مدعوم',
          timestamp: new Date(),
          recoverable: false,
          suggestedActions: ['استخدام نوع قاعدة بيانات مدعوم']
        }
      };

    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        message: 'فشل الاتصال بقاعدة البيانات',
        error: {
          type: ErrorType.NETWORK_ERROR,
          message: 'فشل الاتصال بقاعدة البيانات',
          details: error,
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: [
            'التحقق من اتصال الإنترنت',
            'التأكد من صحة معلومات الاتصال'
          ]
        }
      };
    }
  }

  // فحص صحة الاتصال
  async checkConnectionHealth(): Promise<ConnectionHealthInfo> {
    if (!this.activeConnection) {
      return {
        status: 'unknown',
        lastCheck: new Date(),
        responseTime: 0,
        issues: [{
          type: 'connectivity',
          severity: 'high',
          description: 'لا يوجد اتصال نشط'
        }],
        recommendations: ['قم بالاتصال بقاعدة بيانات']
      };
    }

    const testResult = await this.testConnection(this.activeConnection.id);
    
    return {
      status: testResult.success ? 'healthy' : 'error',
      lastCheck: new Date(),
      responseTime: testResult.responseTime,
      issues: testResult.success ? [] : [{
        type: 'connectivity',
        severity: 'critical',
        description: testResult.message
      }],
      recommendations: testResult.success ? [] : [
        'تحقق من معلومات الاتصال',
        'تأكد من أن الخادم متاح'
      ]
    };
  }

  // الحصول على مقاييس الاتصال
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  // تحديث المقاييس
  private updateMetrics(): void {
    this.metrics.totalConnections = this.connections.length;
    
    // حساب متوسط وقت الاستجابة
    const responseTimes = this.connections
      .map(conn => conn.status.averageResponseTime)
      .filter(time => time !== undefined) as number[];
    
    if (responseTimes.length > 0) {
      this.metrics.averageResponseTime = 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    // حساب وقت التشغيل (مبسط)
    if (this.activeConnection && this.activeConnection.status.lastConnected) {
      this.metrics.uptime = Date.now() - this.activeConnection.status.lastConnected.getTime();
    }
  }

  // تسجيل معالج تغيير الاتصال
  onConnectionChange(callback: (connection: DatabaseConnection | null) => void): void {
    this.connectionChangeCallbacks.push(callback);
  }

  // تسجيل معالج تغيير الصحة
  onHealthChange(callback: (health: ConnectionHealthInfo) => void): void {
    this.healthChangeCallbacks.push(callback);
  }

  // إشعار المستمعين بتغيير الاتصال
  private notifyConnectionChange(connection: DatabaseConnection | null): void {
    this.connectionChangeCallbacks.forEach(callback => {
      try {
        callback(connection);
      } catch (error) {
        console.error('خطأ في معالج تغيير الاتصال:', error);
      }
    });
  }

  // إشعار المستمعين بتغيير الصحة
  private notifyHealthChange(health: ConnectionHealthInfo): void {
    this.healthChangeCallbacks.forEach(callback => {
      try {
        callback(health);
      } catch (error) {
        console.error('خطأ في معالج تغيير الصحة:', error);
      }
    });
  }

  // تنظيف الموارد
  cleanup(): void {
    this.connectionChangeCallbacks = [];
    this.healthChangeCallbacks = [];
  }
}