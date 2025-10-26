// services/OfflineFirstManager.ts - مدير الاتصال مع الأولوية للسحابة والعمل المحلي

import { useSupabase } from '../contexts/SupabaseContext';

export interface ConnectionStatus {
  isOnline: boolean;
  isCloudConnected: boolean;
  lastSyncTime: Date | null;
  pendingLocalData: number;
  connectionAttempts: number;
  mode: 'cloud' | 'offline' | 'syncing';
}

export class OfflineFirstManager {
  private connectionStatus: ConnectionStatus = {
    isOnline: navigator.onLine,
    isCloudConnected: false,
    lastSyncTime: null,
    pendingLocalData: 0,
    connectionAttempts: 0,
    mode: 'offline'
  };

  private retryInterval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private supabaseClient: any = null;

  constructor() {
    this.initializeConnectionMonitoring();
    this.startConnectionRetry();
  }

  // تهيئة مراقبة الاتصال
  private initializeConnectionMonitoring() {
    // مراقبة حالة الإنترنت
    window.addEventListener('online', () => {
      this.connectionStatus.isOnline = true;
      this.attemptCloudConnection();
      this.notifyStatusChange();
    });

    window.addEventListener('offline', () => {
      this.connectionStatus.isOnline = false;
      this.connectionStatus.isCloudConnected = false;
      this.connectionStatus.mode = 'offline';
      this.notifyStatusChange();
    });
  }

  // محاولة الاتصال بقاعدة البيانات السحابية
  private async attemptCloudConnection(): Promise<boolean> {
    if (!this.connectionStatus.isOnline) {
      return false;
    }

    try {
      this.connectionStatus.connectionAttempts++;
      
      // محاولة الاتصال بـ Supabase
      if (this.supabaseClient) {
        const { data, error } = await this.supabaseClient
          .from('products')
          .select('count')
          .limit(1);

        if (!error) {
          this.connectionStatus.isCloudConnected = true;
          this.connectionStatus.mode = 'cloud';
          
          // إذا كان هناك بيانات محلية معلقة، ابدأ المزامنة
          if (this.connectionStatus.pendingLocalData > 0) {
            this.startSyncProcess();
          }
          
          this.notifyStatusChange();
          return true;
        }
      }
    } catch (error) {
      console.warn('فشل الاتصال بقاعدة البيانات السحابية:', error);
    }

    this.connectionStatus.isCloudConnected = false;
    this.connectionStatus.mode = 'offline';
    this.notifyStatusChange();
    return false;
  }

  // بدء عملية المحاولة المستمرة للاتصال
  private startConnectionRetry() {
    // محاولة فورية
    this.attemptCloudConnection();

    // محاولات دورية كل 30 ثانية
    this.retryInterval = setInterval(() => {
      if (!this.connectionStatus.isCloudConnected && this.connectionStatus.isOnline) {
        this.attemptCloudConnection();
      }
    }, 30000);
  }

  // بدء عملية المزامنة
  private async startSyncProcess() {
    if (this.syncInProgress || !this.connectionStatus.isCloudConnected) {
      return;
    }

    this.syncInProgress = true;
    this.connectionStatus.mode = 'syncing';
    this.notifyStatusChange();

    try {
      // 1. رفع البيانات المحلية إلى السحابة
      await this.uploadLocalData();
      
      // 2. تحديث البيانات من السحابة
      await this.downloadCloudData();
      
      // 3. تصفير البيانات المحلية
      await this.clearLocalData();
      
      this.connectionStatus.lastSyncTime = new Date();
      this.connectionStatus.pendingLocalData = 0;
      this.connectionStatus.mode = 'cloud';
      
    } catch (error) {
      console.error('فشل في عملية المزامنة:', error);
      this.connectionStatus.mode = 'offline';
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  // رفع البيانات المحلية إلى السحابة
  private async uploadLocalData() {
    const localData = this.getLocalData();
    
    if (localData.length === 0) return;

    // رفع البيانات إلى Supabase
    for (const item of localData) {
      try {
        if (this.supabaseClient) {
          await this.supabaseClient
            .from(item.table)
            .upsert(item.data);
        }
      } catch (error) {
        console.error(`فشل رفع البيانات من جدول ${item.table}:`, error);
      }
    }
  }

  // تحديث البيانات من السحابة
  private async downloadCloudData() {
    // تحديث البيانات المحلية من السحابة
    const tables = ['products', 'inventory_items', 'suppliers', 'provinces', 'areas', 'clients'];
    
    for (const table of tables) {
      try {
        if (this.supabaseClient) {
          const { data, error } = await this.supabaseClient
            .from(table)
            .select('*');
            
          if (!error && data) {
            // حفظ البيانات محلياً (كنسخة احتياطية)
            localStorage.setItem(`backup_${table}`, JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error(`فشل تحديث البيانات من جدول ${table}:`, error);
      }
    }
  }

  // تصفير البيانات المحلية
  private async clearLocalData() {
    const localKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('local_') || key.startsWith('pending_')
    );
    
    localKeys.forEach(key => localStorage.removeItem(key));
  }

  // الحصول على البيانات المحلية المعلقة
  private getLocalData(): Array<{table: string, data: any}> {
    const localData: Array<{table: string, data: any}> = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pending_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          const table = key.replace('pending_', '');
          localData.push({ table, data });
        } catch (error) {
          console.error('فشل قراءة البيانات المحلية:', error);
        }
      }
    });
    
    return localData;
  }

  // حفظ البيانات محلياً (عند عدم توفر الاتصال)
  public saveDataLocally(table: string, data: any) {
    try {
      const existingData = JSON.parse(localStorage.getItem(`pending_${table}`) || '[]');
      existingData.push({
        ...data,
        _localId: Date.now(),
        _timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(`pending_${table}`, JSON.stringify(existingData));
      this.connectionStatus.pendingLocalData++;
      this.notifyStatusChange();
      
      // محاولة المزامنة إذا كان الاتصال متاح
      if (this.connectionStatus.isCloudConnected) {
        this.startSyncProcess();
      }
    } catch (error) {
      console.error('فشل حفظ البيانات محلياً:', error);
    }
  }

  // تسجيل callback لتغييرات الحالة
  public onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusCallbacks.push(callback);
  }

  // إشعار بتغيير الحالة
  private notifyStatusChange() {
    this.statusCallbacks.forEach(callback => callback(this.connectionStatus));
  }

  // تعيين عميل Supabase
  public setSupabaseClient(client: any) {
    this.supabaseClient = client;
    if (client) {
      this.attemptCloudConnection();
    }
  }

  // الحصول على حالة الاتصال
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // إجبار المزامنة
  public async forcSync(): Promise<boolean> {
    if (!this.connectionStatus.isCloudConnected) {
      const connected = await this.attemptCloudConnection();
      if (!connected) return false;
    }
    
    await this.startSyncProcess();
    return true;
  }

  // تنظيف الموارد
  public cleanup() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    
    window.removeEventListener('online', this.attemptCloudConnection);
    window.removeEventListener('offline', () => {});
  }
}

// إنشاء مثيل مشترك
export const offlineFirstManager = new OfflineFirstManager();