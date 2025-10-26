// services/OfflineService.ts - خدمة العمل بدون اتصال

import { IOfflineService } from '../interfaces/services';
import { SyncResult, SyncConflict, DatabaseError } from '../interfaces/database';
import { ConnectionManagerService } from './ConnectionManagerService';
import { AuditLogger } from './AuditLogger';
import { ErrorType, ActivityType, SYSTEM_CONSTANTS } from '../types/database';

export interface OfflineConfig {
  enabled: boolean;
  maxCacheSize: number;
  syncInterval: number;
  conflictResolutionStrategy: 'manual' | 'server-wins' | 'client-wins';
  autoSync: boolean;
  retryAttempts: number;
}

interface CachedTable {
  name: string;
  data: any[];
  lastModified: Date;
  version: number;
  changes: CachedChange[];
}

interface CachedChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: any;
  timestamp: Date;
  synced: boolean;
}

export class OfflineService implements IOfflineService {
  private connectionManager: ConnectionManagerService;
  private auditLogger: AuditLogger;
  private config: OfflineConfig;
  private isOnline: boolean = navigator.onLine;
  private cachedTables: Map<string, CachedTable> = new Map();
  private pendingChanges: CachedChange[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private connectionMonitor: NodeJS.Timeout | null = null;
  
  private connectionCallbacks: ((isOnline: boolean) => void)[] = [];
  private syncProgressCallbacks: ((progress: number, message: string) => void)[] = [];
  private syncConflictCallbacks: ((conflicts: SyncConflict[]) => void)[] = [];

  constructor(
    connectionManager: ConnectionManagerService,
    auditLogger: AuditLogger,
    config?: Partial<OfflineConfig>
  ) {
    this.connectionManager = connectionManager;
    this.auditLogger = auditLogger;
    
    this.config = {
      enabled: true,
      maxCacheSize: SYSTEM_CONSTANTS.MAX_CACHE_SIZE,
      syncInterval: SYSTEM_CONSTANTS.DEFAULT_SYNC_INTERVAL,
      conflictResolutionStrategy: 'manual',
      autoSync: true,
      retryAttempts: 3,
      ...config
    };

    this.initialize();
  }

  // تهيئة الخدمة
  private async initialize(): Promise<void> {
    try {
      // تحميل البيانات المخزنة محلياً
      await this.loadCachedData();
      
      // بدء مراقبة الاتصال
      this.startConnectionMonitoring();
      
      // بدء المزامنة التلقائية إذا كانت مفعلة
      if (this.config.autoSync && this.isOnline) {
        this.startAutoSync();
      }
      
      this.auditLogger.logActivity({
        action: ActivityType.SYNC,
        connectionId: 'system',
        connectionName: 'خدمة العمل بدون اتصال',
        success: true
      });
      
    } catch (error) {
      console.error('فشل تهيئة خدمة العمل بدون اتصال:', error);
    }
  }

  // تفعيل وضع عدم الاتصال
  enableOfflineMode(): void {
    this.config.enabled = true;
    this.saveConfig();
    
    this.auditLogger.logActivity({
      action: ActivityType.SYNC,
      connectionId: 'system',
      connectionName: 'تفعيل وضع عدم الاتصال',
      success: true
    });
  }

  // إلغاء تفعيل وضع عدم الاتصال
  disableOfflineMode(): void {
    this.config.enabled = false;
    this.saveConfig();
    
    // مسح البيانات المخزنة محلياً
    this.clearCache();
    
    this.auditLogger.logActivity({
      action: ActivityType.SYNC,
      connectionId: 'system',
      connectionName: 'إلغاء تفعيل وضع عدم الاتصال',
      success: true
    });
  }

  // التحقق من تفعيل وضع عدم الاتصال
  isOfflineModeEnabled(): boolean {
    return this.config.enabled;
  }

  // التحقق من حالة الاتصال الحالية
  isCurrentlyOffline(): boolean {
    return !this.isOnline;
  }

  // تخزين البيانات محلياً
  async cacheData(table: string, data: any[]): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // التحقق من حجم التخزين المؤقت
      const currentSize = await this.getCacheSize();
      const dataSize = new Blob([JSON.stringify(data)]).size;
      
      if (currentSize + dataSize > this.config.maxCacheSize) {
        // تنظيف البيانات القديمة
        await this.cleanupOldCache();
        
        // التحقق مرة أخرى
        const newSize = await this.getCacheSize();
        if (newSize + dataSize > this.config.maxCacheSize) {
          throw {
            type: ErrorType.STORAGE_ERROR,
            message: 'مساحة التخزين المؤقت ممتلئة',
            timestamp: new Date(),
            recoverable: true,
            suggestedActions: [
              'مسح البيانات القديمة',
              'زيادة حجم التخزين المؤقت',
              'تقليل البيانات المخزنة'
            ]
          };
        }
      }

      const cachedTable: CachedTable = {
        name: table,
        data: [...data], // نسخة من البيانات
        lastModified: new Date(),
        version: Date.now(),
        changes: []
      };

      this.cachedTables.set(table, cachedTable);
      await this.saveCachedData();
      
      this.auditLogger.logActivity({
        action: ActivityType.SYNC,
        connectionId: 'offline',
        connectionName: `تخزين بيانات ${table}`,
        success: true
      });
      
    } catch (error) {
      this.auditLogger.logError(error as DatabaseError);
      throw error;
    }
  }

  // الحصول على البيانات المخزنة محلياً
  async getCachedData(table: string): Promise<any[]> {
    if (!this.config.enabled) return [];

    const cachedTable = this.cachedTables.get(table);
    if (!cachedTable) return [];

    // تطبيق التغييرات المحلية على البيانات
    let data = [...cachedTable.data];
    
    for (const change of cachedTable.changes) {
      if (change.synced) continue;
      
      switch (change.type) {
        case 'create':
          data.push(change.data);
          break;
          
        case 'update':
          const updateIndex = data.findIndex(item => item.id === change.recordId);
          if (updateIndex >= 0) {
            data[updateIndex] = { ...data[updateIndex], ...change.data };
          }
          break;
          
        case 'delete':
          data = data.filter(item => item.id !== change.recordId);
          break;
      }
    }

    return data;
  }

  // مسح التخزين المؤقت
  async clearCache(table?: string): Promise<void> {
    try {
      if (table) {
        this.cachedTables.delete(table);
        localStorage.removeItem(`offline_table_${table}`);
      } else {
        // مسح جميع البيانات
        for (const tableName of this.cachedTables.keys()) {
          localStorage.removeItem(`offline_table_${tableName}`);
        }
        this.cachedTables.clear();
        this.pendingChanges = [];
        localStorage.removeItem('offline_pending_changes');
      }
      
      await this.saveCachedData();
      
      this.auditLogger.logActivity({
        action: ActivityType.SYNC,
        connectionId: 'offline',
        connectionName: table ? `مسح بيانات ${table}` : 'مسح جميع البيانات',
        success: true
      });
      
    } catch (error) {
      this.auditLogger.logError(error as DatabaseError);
      throw error;
    }
  }

  // الحصول على حجم التخزين المؤقت
  async getCacheSize(): Promise<number> {
    let totalSize = 0;
    
    try {
      // حساب حجم البيانات المخزنة
      for (const [tableName] of this.cachedTables) {
        const data = localStorage.getItem(`offline_table_${tableName}`);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      // إضافة حجم التغييرات المعلقة
      const pendingData = localStorage.getItem('offline_pending_changes');
      if (pendingData) {
        totalSize += new Blob([pendingData]).size;
      }
      
    } catch (error) {
      console.error('فشل حساب حجم التخزين المؤقت:', error);
    }
    
    return totalSize;
  }

  // إضافة تغيير محلي
  async addLocalChange(type: 'create' | 'update' | 'delete', table: string, recordId: string, data?: any): Promise<void> {
    if (!this.config.enabled) return;

    const change: CachedChange = {
      id: this.generateChangeId(),
      type,
      table,
      recordId,
      data: data || {},
      timestamp: new Date(),
      synced: false
    };

    // إضافة إلى قائمة التغييرات المعلقة
    this.pendingChanges.push(change);
    
    // إضافة إلى تغييرات الجدول
    const cachedTable = this.cachedTables.get(table);
    if (cachedTable) {
      cachedTable.changes.push(change);
    }

    await this.savePendingChanges();
    
    this.auditLogger.logActivity({
      action: ActivityType.SYNC,
      connectionId: 'offline',
      connectionName: `تغيير محلي: ${type} في ${table}`,
      success: true
    });
  }

  // المزامنة مع الخادم
  async syncWithServer(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isOnline) {
        throw {
          type: ErrorType.NETWORK_ERROR,
          message: 'لا يوجد اتصال بالإنترنت',
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['التحقق من اتصال الإنترنت']
        };
      }

      const activeConnection = this.connectionManager.getActiveConnection();
      if (!activeConnection) {
        throw {
          type: ErrorType.CONNECTION_FAILED,
          message: 'لا يوجد اتصال نشط بقاعدة البيانات',
          timestamp: new Date(),
          recoverable: true,
          suggestedActions: ['الاتصال بقاعدة بيانات']
        };
      }

      this.notifySyncProgress(0, 'بدء المزامنة...');

      const conflicts: SyncConflict[] = [];
      const syncedTables: string[] = [];
      const statistics = {
        totalRecords: 0,
        updatedRecords: 0,
        createdRecords: 0,
        deletedRecords: 0
      };

      // مزامنة التغييرات المحلية
      this.notifySyncProgress(20, 'مزامنة التغييرات المحلية...');
      
      for (const change of this.pendingChanges.filter(c => !c.synced)) {
        try {
          // محاولة تطبيق التغيير على الخادم
          const success = await this.applyChangeToServer(change);
          
          if (success) {
            change.synced = true;
            
            switch (change.type) {
              case 'create':
                statistics.createdRecords++;
                break;
              case 'update':
                statistics.updatedRecords++;
                break;
              case 'delete':
                statistics.deletedRecords++;
                break;
            }
          } else {
            // إنشاء تضارب
            const conflict: SyncConflict = {
              id: this.generateConflictId(),
              table: change.table,
              recordId: change.recordId,
              localData: change.data,
              serverData: {}, // سيتم جلبه من الخادم
              conflictType: change.type,
              timestamp: new Date(),
              resolved: false
            };
            conflicts.push(conflict);
          }
          
        } catch (error) {
          console.error('فشل مزامنة التغيير:', error);
        }
      }

      // جلب التحديثات من الخادم
      this.notifySyncProgress(60, 'جلب التحديثات من الخادم...');
      
      for (const [tableName, cachedTable] of this.cachedTables) {
        try {
          const serverData = await this.fetchServerData(tableName, cachedTable.version);
          
          if (serverData && serverData.length > 0) {
            // دمج البيانات
            await this.mergeServerData(tableName, serverData);
            syncedTables.push(tableName);
            statistics.totalRecords += serverData.length;
          }
          
        } catch (error) {
          console.error(`فشل مزامنة جدول ${tableName}:`, error);
        }
      }

      this.notifySyncProgress(90, 'حفظ البيانات المحدثة...');
      
      // حفظ البيانات المحدثة
      await this.saveCachedData();
      await this.savePendingChanges();

      this.notifySyncProgress(100, 'تمت المزامنة بنجاح');

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: true,
        syncedTables,
        conflicts,
        statistics,
        duration
      };

      // إشعار بالتضارب إذا وجد
      if (conflicts.length > 0) {
        this.notifySyncConflict(conflicts);
      }

      this.auditLogger.logSync(
        activeConnection.id,
        activeConnection.name,
        true,
        {
          syncedTables,
          conflictsCount: conflicts.length,
          duration,
          statistics
        }
      );

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const dbError = error as DatabaseError;
      
      const result: SyncResult = {
        success: false,
        syncedTables: [],
        conflicts: [],
        statistics: {
          totalRecords: 0,
          updatedRecords: 0,
          createdRecords: 0,
          deletedRecords: 0
        },
        duration,
        error: dbError
      };

      this.auditLogger.logSync(
        'unknown',
        'خطأ في المزامنة',
        false,
        { error: dbError.message, duration }
      );

      return result;
    }
  }

  // تطبيق تغيير على الخادم
  private async applyChangeToServer(change: CachedChange): Promise<boolean> {
    // هذا مثال مبسط - في التطبيق الحقيقي سيتم التفاعل مع Supabase
    try {
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // محاكاة نجاح العملية (90% نجاح)
      return Math.random() > 0.1;
      
    } catch (error) {
      return false;
    }
  }

  // جلب البيانات من الخادم
  private async fetchServerData(tableName: string, lastVersion: number): Promise<any[]> {
    // هذا مثال مبسط - في التطبيق الحقيقي سيتم جلب البيانات من Supabase
    try {
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // إرجاع بيانات وهمية
      return [];
      
    } catch (error) {
      throw error;
    }
  }

  // دمج البيانات من الخادم
  private async mergeServerData(tableName: string, serverData: any[]): Promise<void> {
    const cachedTable = this.cachedTables.get(tableName);
    if (!cachedTable) return;

    // دمج البيانات (استراتيجية بسيطة)
    cachedTable.data = serverData;
    cachedTable.lastModified = new Date();
    cachedTable.version = Date.now();
  }

  // حل تضارب المزامنة
  async resolveSyncConflicts(conflicts: SyncConflict[]): Promise<void> {
    try {
      for (const conflict of conflicts) {
        switch (this.config.conflictResolutionStrategy) {
          case 'server-wins':
            // الخادم يفوز - تجاهل التغيير المحلي
            await this.resolveConflictServerWins(conflict);
            break;
            
          case 'client-wins':
            // العميل يفوز - فرض التغيير المحلي
            await this.resolveConflictClientWins(conflict);
            break;
            
          case 'manual':
            // حل يدوي - ترك القرار للمستخدم
            conflict.resolved = false;
            continue;
        }
        
        conflict.resolved = true;
      }
      
      this.auditLogger.logActivity({
        action: ActivityType.SYNC,
        connectionId: 'offline',
        connectionName: 'حل تضارب المزامنة',
        success: true
      });
      
    } catch (error) {
      this.auditLogger.logError(error as DatabaseError);
      throw error;
    }
  }

  // حل التضارب لصالح الخادم
  private async resolveConflictServerWins(conflict: SyncConflict): Promise<void> {
    // تحديث البيانات المحلية بالبيانات من الخادم
    const cachedTable = this.cachedTables.get(conflict.table);
    if (cachedTable) {
      const recordIndex = cachedTable.data.findIndex(item => item.id === conflict.recordId);
      if (recordIndex >= 0) {
        cachedTable.data[recordIndex] = conflict.serverData;
      }
    }
  }

  // حل التضارب لصالح العميل
  private async resolveConflictClientWins(conflict: SyncConflict): Promise<void> {
    // إعادة محاولة تطبيق التغيير المحلي
    const change = this.pendingChanges.find(c => 
      c.table === conflict.table && 
      c.recordId === conflict.recordId
    );
    
    if (change) {
      await this.applyChangeToServer(change);
    }
  }

  // الحصول على التغييرات المعلقة
  async getPendingChanges(): Promise<any[]> {
    return this.pendingChanges.filter(change => !change.synced);
  }

  // بدء مراقبة الاتصال
  startConnectionMonitoring(): void {
    // مراقبة حالة الاتصال
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // فحص دوري لحالة الاتصال
    this.connectionMonitor = setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (wasOnline !== this.isOnline) {
        this.handleConnectionChange(this.isOnline);
      }
    }, 5000);
  }

  // إيقاف مراقبة الاتصال
  stopConnectionMonitoring(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
  }

  // معالجة الاتصال
  private handleOnline(): void {
    this.isOnline = true;
    this.handleConnectionChange(true);
  }

  // معالجة انقطاع الاتصال
  private handleOffline(): void {
    this.isOnline = false;
    this.handleConnectionChange(false);
  }

  // معالجة تغيير الاتصال
  private handleConnectionChange(isOnline: boolean): void {
    this.auditLogger.logActivity({
      action: ActivityType.SYNC,
      connectionId: 'system',
      connectionName: isOnline ? 'عودة الاتصال' : 'انقطاع الاتصال',
      success: true
    });

    // بدء المزامنة التلقائية عند عودة الاتصال
    if (isOnline && this.config.autoSync) {
      this.startAutoSync();
    } else if (!isOnline) {
      this.stopAutoSync();
    }

    // إشعار المستمعين
    this.notifyConnectionChange(isOnline);
  }

  // بدء المزامنة التلقائية
  private startAutoSync(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(async () => {
      if (this.isOnline && this.pendingChanges.some(c => !c.synced)) {
        try {
          await this.syncWithServer();
        } catch (error) {
          console.error('فشل المزامنة التلقائية:', error);
        }
      }
    }, this.config.syncInterval);
  }

  // إيقاف المزامنة التلقائية
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // تحميل البيانات المخزنة
  private async loadCachedData(): Promise<void> {
    try {
      // تحميل إعدادات الخدمة
      const configData = localStorage.getItem('offline_config');
      if (configData) {
        const savedConfig = JSON.parse(configData);
        this.config = { ...this.config, ...savedConfig };
      }

      // تحميل البيانات المخزنة
      const tableNames = JSON.parse(localStorage.getItem('offline_table_names') || '[]');
      
      for (const tableName of tableNames) {
        const tableData = localStorage.getItem(`offline_table_${tableName}`);
        if (tableData) {
          const cachedTable = JSON.parse(tableData);
          // تحويل التواريخ
          cachedTable.lastModified = new Date(cachedTable.lastModified);
          cachedTable.changes = cachedTable.changes.map((change: any) => ({
            ...change,
            timestamp: new Date(change.timestamp)
          }));
          
          this.cachedTables.set(tableName, cachedTable);
        }
      }

      // تحميل التغييرات المعلقة
      const pendingData = localStorage.getItem('offline_pending_changes');
      if (pendingData) {
        this.pendingChanges = JSON.parse(pendingData).map((change: any) => ({
          ...change,
          timestamp: new Date(change.timestamp)
        }));
      }
      
    } catch (error) {
      console.error('فشل تحميل البيانات المخزنة:', error);
    }
  }

  // حفظ البيانات المخزنة
  private async saveCachedData(): Promise<void> {
    try {
      // حفظ أسماء الجداول
      const tableNames = Array.from(this.cachedTables.keys());
      localStorage.setItem('offline_table_names', JSON.stringify(tableNames));
      
      // حفظ بيانات كل جدول
      for (const [tableName, cachedTable] of this.cachedTables) {
        localStorage.setItem(`offline_table_${tableName}`, JSON.stringify(cachedTable));
      }
      
    } catch (error) {
      console.error('فشل حفظ البيانات المخزنة:', error);
    }
  }

  // حفظ التغييرات المعلقة
  private async savePendingChanges(): Promise<void> {
    try {
      localStorage.setItem('offline_pending_changes', JSON.stringify(this.pendingChanges));
    } catch (error) {
      console.error('فشل حفظ التغييرات المعلقة:', error);
    }
  }

  // حفظ الإعدادات
  private saveConfig(): void {
    try {
      localStorage.setItem('offline_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('فشل حفظ إعدادات الخدمة:', error);
    }
  }

  // تنظيف البيانات القديمة
  private async cleanupOldCache(): Promise<void> {
    // حذف أقدم البيانات المخزنة
    const tables = Array.from(this.cachedTables.entries())
      .sort(([,a], [,b]) => a.lastModified.getTime() - b.lastModified.getTime());
    
    if (tables.length > 0) {
      const [oldestTable] = tables[0];
      await this.clearCache(oldestTable);
    }
  }

  // تسجيل معالج تغيير الاتصال
  onConnectionChange(callback: (isOnline: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  // تسجيل معالج تقدم المزامنة
  onSyncProgress(callback: (progress: number, message: string) => void): void {
    this.syncProgressCallbacks.push(callback);
  }

  // تسجيل معالج تضارب المزامنة
  onSyncConflict(callback: (conflicts: SyncConflict[]) => void): void {
    this.syncConflictCallbacks.push(callback);
  }

  // إشعار تغيير الاتصال
  private notifyConnectionChange(isOnline: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('خطأ في معالج تغيير الاتصال:', error);
      }
    });
  }

  // إشعار تقدم المزامنة
  private notifySyncProgress(progress: number, message: string): void {
    this.syncProgressCallbacks.forEach(callback => {
      try {
        callback(progress, message);
      } catch (error) {
        console.error('خطأ في معالج تقدم المزامنة:', error);
      }
    });
  }

  // إشعار تضارب المزامنة
  private notifySyncConflict(conflicts: SyncConflict[]): void {
    this.syncConflictCallbacks.forEach(callback => {
      try {
        callback(conflicts);
      } catch (error) {
        console.error('خطأ في معالج تضارب المزامنة:', error);
      }
    });
  }

  // توليد معرف التغيير
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // توليد معرف التضارب
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // تنظيف الموارد
  cleanup(): void {
    this.stopConnectionMonitoring();
    this.stopAutoSync();
    
    this.connectionCallbacks = [];
    this.syncProgressCallbacks = [];
    this.syncConflictCallbacks = [];
  }
}