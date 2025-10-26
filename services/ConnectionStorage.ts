// services/ConnectionStorage.ts - خدمة تخزين الاتصالات مع التشفير

import { DatabaseConnection } from '../interfaces/database';
import { DatabaseConnectionModel } from '../models/DatabaseConnectionModel';
import { SecurityService } from './SecurityService';
import { ErrorType } from '../types/database';

export interface StorageOptions {
  encrypted: boolean;
  compressionEnabled: boolean;
  backupEnabled: boolean;
}

export class ConnectionStorage {
  private securityService: SecurityService;
  private storageKey: string = 'database_connections';
  private backupKey: string = 'database_connections_backup';
  private options: StorageOptions;

  constructor(securityService: SecurityService, options?: Partial<StorageOptions>) {
    this.securityService = securityService;
    this.options = {
      encrypted: true,
      compressionEnabled: false,
      backupEnabled: true,
      ...options
    };
  }

  // حفظ جميع الاتصالات
  async saveConnections(connections: DatabaseConnectionModel[]): Promise<void> {
    try {
      // إنشاء نسخة احتياطية أولاً
      if (this.options.backupEnabled) {
        await this.createBackup();
      }

      // تحويل إلى JSON
      const connectionsData = connections.map(conn => conn.toJSON());
      let dataToStore = JSON.stringify(connectionsData);

      // ضغط البيانات إذا كان مفعلاً
      if (this.options.compressionEnabled) {
        dataToStore = this.compressData(dataToStore);
      }

      // تشفير البيانات إذا كان مفعلاً
      if (this.options.encrypted) {
        dataToStore = await this.securityService.encryptConnectionData(dataToStore);
      }

      // حفظ في التخزين المحلي
      localStorage.setItem(this.storageKey, dataToStore);

      // حفظ معلومات التشفير والضغط
      localStorage.setItem(`${this.storageKey}_meta`, JSON.stringify({
        encrypted: this.options.encrypted,
        compressed: this.options.compressionEnabled,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));

    } catch (error) {
      throw {
        type: ErrorType.STORAGE_ERROR,
        message: 'فشل حفظ الاتصالات',
        details: error,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: [
          'تحقق من مساحة التخزين المتاحة',
          'جرب إعادة تحميل الصفحة',
          'تحقق من إعدادات المتصفح'
        ]
      };
    }
  }

  // تحميل جميع الاتصالات
  async loadConnections(): Promise<DatabaseConnectionModel[]> {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return [];
      }

      // تحميل معلومات التشفير والضغط
      const metaData = this.getStorageMetadata();
      let dataToProcess = storedData;

      // فك التشفير إذا كان مشفراً
      if (metaData.encrypted) {
        dataToProcess = await this.securityService.decryptConnectionData(dataToProcess);
      }

      // فك الضغط إذا كان مضغوطاً
      if (metaData.compressed) {
        dataToProcess = this.decompressData(dataToProcess);
      }

      // تحويل من JSON
      const connectionsData = JSON.parse(dataToProcess);
      
      // التحقق من صحة البيانات
      if (!Array.isArray(connectionsData)) {
        throw new Error('تنسيق البيانات غير صحيح');
      }

      // تحويل إلى نماذج
      return connectionsData.map((data: any) => {
        try {
          return DatabaseConnectionModel.fromJSON(data);
        } catch (error) {
          console.warn('تجاهل اتصال غير صحيح:', error);
          return null;
        }
      }).filter(Boolean) as DatabaseConnectionModel[];

    } catch (error) {
      console.error('فشل تحميل الاتصالات:', error);
      
      // محاولة استعادة من النسخة الاحتياطية
      if (this.options.backupEnabled) {
        try {
          return await this.restoreFromBackup();
        } catch (backupError) {
          console.error('فشل الاستعادة من النسخة الاحتياطية:', backupError);
        }
      }

      throw {
        type: ErrorType.STORAGE_ERROR,
        message: 'فشل تحميل الاتصالات',
        details: error,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: [
          'تحقق من صحة البيانات المحفوظة',
          'جرب مسح البيانات وإعادة الإعداد',
          'استعد من نسخة احتياطية إن وجدت'
        ]
      };
    }
  }

  // حفظ اتصال واحد
  async saveConnection(connection: DatabaseConnectionModel): Promise<void> {
    const connections = await this.loadConnections();
    const existingIndex = connections.findIndex(conn => conn.id === connection.id);
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connection;
    } else {
      connections.push(connection);
    }
    
    await this.saveConnections(connections);
  }

  // حذف اتصال
  async deleteConnection(connectionId: string): Promise<void> {
    const connections = await this.loadConnections();
    const filteredConnections = connections.filter(conn => conn.id !== connectionId);
    await this.saveConnections(filteredConnections);
  }

  // البحث عن اتصال
  async findConnection(connectionId: string): Promise<DatabaseConnectionModel | null> {
    const connections = await this.loadConnections();
    return connections.find(conn => conn.id === connectionId) || null;
  }

  // البحث بالاسم
  async findConnectionByName(name: string): Promise<DatabaseConnectionModel | null> {
    const connections = await this.loadConnections();
    return connections.find(conn => conn.name === name) || null;
  }

  // الحصول على الاتصال النشط
  async getActiveConnection(): Promise<DatabaseConnectionModel | null> {
    const connections = await this.loadConnections();
    return connections.find(conn => conn.status.isActive) || null;
  }

  // تحديث حالة الاتصال النشط
  async setActiveConnection(connectionId: string): Promise<void> {
    const connections = await this.loadConnections();
    
    // إلغاء تفعيل جميع الاتصالات
    connections.forEach(conn => {
      conn.status.isActive = false;
    });
    
    // تفعيل الاتصال المحدد
    const targetConnection = connections.find(conn => conn.id === connectionId);
    if (targetConnection) {
      targetConnection.status.isActive = true;
      targetConnection.status.lastConnected = new Date();
      targetConnection.updateMetadata();
    }
    
    await this.saveConnections(connections);
  }

  // إنشاء نسخة احتياطية
  async createBackup(): Promise<void> {
    try {
      const currentData = localStorage.getItem(this.storageKey);
      const currentMeta = localStorage.getItem(`${this.storageKey}_meta`);
      
      if (currentData) {
        const backupData = {
          data: currentData,
          meta: currentMeta,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(this.backupKey, JSON.stringify(backupData));
      }
    } catch (error) {
      console.error('فشل إنشاء نسخة احتياطية:', error);
    }
  }

  // الاستعادة من النسخة الاحتياطية
  async restoreFromBackup(): Promise<DatabaseConnectionModel[]> {
    try {
      const backupData = localStorage.getItem(this.backupKey);
      if (!backupData) {
        throw new Error('لا توجد نسخة احتياطية');
      }

      const backup = JSON.parse(backupData);
      
      // استعادة البيانات
      localStorage.setItem(this.storageKey, backup.data);
      if (backup.meta) {
        localStorage.setItem(`${this.storageKey}_meta`, backup.meta);
      }

      // تحميل البيانات المستعادة
      return await this.loadConnections();
    } catch (error) {
      throw new Error('فشل الاستعادة من النسخة الاحتياطية');
    }
  }

  // مسح جميع البيانات
  async clearAll(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(`${this.storageKey}_meta`);
    localStorage.removeItem(this.backupKey);
  }

  // تصدير البيانات
  async exportData(): Promise<string> {
    const connections = await this.loadConnections();
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      connections: connections.map(conn => conn.toJSON())
    }, null, 2);
  }

  // استيراد البيانات
  async importData(jsonData: string): Promise<void> {
    try {
      const importedData = JSON.parse(jsonData);
      
      if (!importedData.connections || !Array.isArray(importedData.connections)) {
        throw new Error('تنسيق البيانات غير صحيح');
      }

      const connections = importedData.connections.map((data: any) => 
        DatabaseConnectionModel.fromJSON(data)
      );

      await this.saveConnections(connections);
    } catch (error) {
      throw {
        type: ErrorType.VALIDATION_ERROR,
        message: 'فشل استيراد البيانات',
        details: error,
        timestamp: new Date(),
        recoverable: false,
        suggestedActions: [
          'تحقق من تنسيق ملف الاستيراد',
          'تأكد من أن الملف صحيح وغير تالف'
        ]
      };
    }
  }

  // الحصول على معلومات التخزين
  getStorageInfo(): {
    totalConnections: number;
    storageSize: number;
    lastModified: Date | null;
    isEncrypted: boolean;
    isCompressed: boolean;
  } {
    const connections = localStorage.getItem(this.storageKey);
    const meta = this.getStorageMetadata();
    
    return {
      totalConnections: 0, // سيتم حسابه عند التحميل
      storageSize: connections ? connections.length : 0,
      lastModified: meta.timestamp ? new Date(meta.timestamp) : null,
      isEncrypted: meta.encrypted,
      isCompressed: meta.compressed
    };
  }

  // الحصول على معلومات التشفير والضغط
  private getStorageMetadata(): {
    encrypted: boolean;
    compressed: boolean;
    timestamp?: string;
    version?: string;
  } {
    try {
      const metaData = localStorage.getItem(`${this.storageKey}_meta`);
      if (metaData) {
        return JSON.parse(metaData);
      }
    } catch (error) {
      console.error('فشل قراءة معلومات التخزين:', error);
    }
    
    return {
      encrypted: false,
      compressed: false
    };
  }

  // ضغط البيانات (تنفيذ بسيط)
  private compressData(data: string): string {
    // يمكن استخدام مكتبة ضغط حقيقية هنا
    // هذا مجرد مثال بسيط
    return btoa(data);
  }

  // فك ضغط البيانات
  private decompressData(compressedData: string): string {
    try {
      return atob(compressedData);
    } catch (error) {
      throw new Error('فشل فك ضغط البيانات');
    }
  }

  // تحديث إعدادات التخزين
  updateOptions(newOptions: Partial<StorageOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  // الحصول على إعدادات التخزين
  getOptions(): StorageOptions {
    return { ...this.options };
  }

  // التحقق من صحة التخزين
  async validateStorage(): Promise<{
    isValid: boolean;
    issues: string[];
    canRecover: boolean;
  }> {
    const issues: string[] = [];
    let canRecover = true;

    try {
      // التحقق من وجود البيانات
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        issues.push('لا توجد بيانات محفوظة');
        return { isValid: false, issues, canRecover: true };
      }

      // محاولة تحميل البيانات
      await this.loadConnections();
      
    } catch (error) {
      issues.push('فشل تحميل البيانات المحفوظة');
      
      // التحقق من وجود نسخة احتياطية
      const backupData = localStorage.getItem(this.backupKey);
      if (!backupData) {
        issues.push('لا توجد نسخة احتياطية للاستعادة');
        canRecover = false;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      canRecover
    };
  }
}