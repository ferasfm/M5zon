// interfaces/services.ts - واجهات الخدمات

import {
  DatabaseConnection,
  ConnectionTestResult,
  ConnectionMetrics,
  ConnectionHealthInfo,
  BackupInfo,
  BackupResult,
  RestoreOptions,
  RestoreResult,
  ValidationResult,
  BackupSchedule,
  ConnectionActivity,
  SyncResult,
  SyncConflict,
  SystemSettings,
  RecoveryStrategy,
  DatabaseError
} from './database';

// واجهة خدمة إدارة الاتصالات
export interface IConnectionManagerService {
  // إدارة الاتصالات
  addConnection(connection: Omit<DatabaseConnection, 'id' | 'metadata'>): Promise<string>;
  updateConnection(id: string, updates: Partial<DatabaseConnection>): Promise<void>;
  deleteConnection(id: string): Promise<void>;
  getConnections(): DatabaseConnection[];
  getConnection(id: string): DatabaseConnection | null;
  getActiveConnection(): DatabaseConnection | null;
  
  // إدارة الاتصال النشط
  connectTo(connectionId: string): Promise<boolean>;
  disconnect(): Promise<void>;
  testConnection(connectionId: string): Promise<ConnectionTestResult>;
  
  // مراقبة الصحة
  checkConnectionHealth(): Promise<ConnectionHealthInfo>;
  getConnectionMetrics(): ConnectionMetrics;
  
  // الأحداث
  onConnectionChange(callback: (connection: DatabaseConnection | null) => void): void;
  onHealthChange(callback: (health: ConnectionHealthInfo) => void): void;
}

// واجهة خدمة الأمان
export interface ISecurityService {
  // تشفير البيانات
  encryptConnectionData(data: string): Promise<string>;
  decryptConnectionData(encryptedData: string): Promise<string>;
  generateEncryptionKey(): Promise<string>;
  
  // إدارة الجلسات
  startSession(connectionId: string): void;
  extendSession(): void;
  endSession(): void;
  checkSessionExpiry(): boolean;
  getRemainingTime(): number;
  
  // تسجيل الأنشطة
  logConnectionActivity(activity: Omit<ConnectionActivity, 'id' | 'timestamp'>): void;
  getActivityLog(limit?: number): ConnectionActivity[];
  clearActivityLog(): void;
  
  // إعدادات الأمان
  setSessionTimeout(minutes: number): void;
  enableAutoLogout(enabled: boolean): void;
  setEncryptionLevel(level: 'basic' | 'advanced'): void;
  
  // الأحداث
  onSessionExpiry(callback: () => void): void;
  onSecurityEvent(callback: (activity: ConnectionActivity) => void): void;
}

// واجهة خدمة النسخ الاحتياطي
export interface IBackupService {
  // النسخ الاحتياطي التلقائي
  createAutoBackup(connectionId: string): Promise<BackupResult>;
  scheduleAutoBackup(connectionId: string, schedule: BackupSchedule): void;
  cancelScheduledBackup(connectionId: string): void;
  
  // إدارة النسخ الاحتياطية
  createManualBackup(connectionId: string, name?: string): Promise<BackupResult>;
  listBackups(connectionId?: string): BackupInfo[];
  getBackup(backupId: string): BackupInfo | null;
  deleteBackup(backupId: string): Promise<void>;
  
  // الاستعادة
  restoreFromBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult>;
  validateBackup(backupId: string): Promise<ValidationResult>;
  
  // إعدادات النسخ الاحتياطي
  setBackupRetention(days: number): void;
  setCompressionLevel(level: 'none' | 'low' | 'high'): void;
  
  // الأحداث
  onBackupProgress(callback: (progress: number, message: string) => void): void;
  onBackupComplete(callback: (result: BackupResult) => void): void;
}

// واجهة خدمة العمل بدون اتصال
export interface IOfflineService {
  // إدارة الوضع بدون اتصال
  enableOfflineMode(): void;
  disableOfflineMode(): void;
  isOfflineModeEnabled(): boolean;
  isCurrentlyOffline(): boolean;
  
  // تخزين البيانات محلياً
  cacheData(table: string, data: any[]): Promise<void>;
  getCachedData(table: string): Promise<any[]>;
  clearCache(table?: string): Promise<void>;
  getCacheSize(): Promise<number>;
  
  // المزامنة
  syncWithServer(): Promise<SyncResult>;
  resolveSyncConflicts(conflicts: SyncConflict[]): Promise<void>;
  getPendingChanges(): Promise<any[]>;
  
  // مراقبة الاتصال
  startConnectionMonitoring(): void;
  stopConnectionMonitoring(): void;
  
  // الأحداث
  onConnectionChange(callback: (isOnline: boolean) => void): void;
  onSyncProgress(callback: (progress: number, message: string) => void): void;
  onSyncConflict(callback: (conflicts: SyncConflict[]) => void): void;
}

// واجهة خدمة معالجة الأخطاء
export interface IErrorHandlerService {
  // معالجة الأخطاء
  handleError(error: DatabaseError): void;
  handleConnectionError(error: DatabaseError): void;
  handleBackupError(error: DatabaseError): void;
  handleSyncError(error: DatabaseError): void;
  
  // عرض الأخطاء
  showUserFriendlyError(error: DatabaseError): void;
  getErrorSuggestions(error: DatabaseError): string[];
  
  // تسجيل الأخطاء
  logError(error: DatabaseError): void;
  getErrorLog(limit?: number): DatabaseError[];
  clearErrorLog(): void;
  
  // الاسترداد التلقائي
  setRecoveryStrategy(strategy: RecoveryStrategy): void;
  attemptRecovery(error: DatabaseError): Promise<boolean>;
  
  // الأحداث
  onError(callback: (error: DatabaseError) => void): void;
  onRecovery(callback: (success: boolean, error: DatabaseError) => void): void;
}

// واجهة خدمة إدارة الإعدادات
export interface ISettingsService {
  // إدارة الإعدادات
  getSettings(): SystemSettings;
  updateSettings(settings: Partial<SystemSettings>): void;
  resetToDefaults(): void;
  
  // إعدادات محددة
  getSecuritySettings(): SystemSettings['security'];
  updateSecuritySettings(settings: Partial<SystemSettings['security']>): void;
  
  getBackupSettings(): SystemSettings['backup'];
  updateBackupSettings(settings: Partial<SystemSettings['backup']>): void;
  
  getOfflineSettings(): SystemSettings['offline'];
  updateOfflineSettings(settings: Partial<SystemSettings['offline']>): void;
  
  getUISettings(): SystemSettings['ui'];
  updateUISettings(settings: Partial<SystemSettings['ui']>): void;
  
  // تصدير واستيراد الإعدادات
  exportSettings(): string;
  importSettings(settingsJson: string): void;
  
  // الأحداث
  onSettingsChange(callback: (settings: SystemSettings) => void): void;
}

// واجهة خدمة التخزين
export interface IStorageService {
  // تخزين البيانات
  setItem(key: string, value: any): Promise<void>;
  getItem<T>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // تخزين مشفر
  setEncryptedItem(key: string, value: any): Promise<void>;
  getEncryptedItem<T>(key: string): Promise<T | null>;
  
  // إدارة المساحة
  getStorageSize(): Promise<number>;
  getAvailableSpace(): Promise<number>;
  
  // النسخ الاحتياطي للتخزين
  exportStorage(): Promise<string>;
  importStorage(data: string): Promise<void>;
}

// واجهة خدمة الإشعارات
export interface INotificationService {
  // إشعارات عامة
  showSuccess(message: string, duration?: number): void;
  showError(message: string, duration?: number): void;
  showWarning(message: string, duration?: number): void;
  showInfo(message: string, duration?: number): void;
  
  // إشعارات متقدمة
  showProgress(message: string, progress: number): void;
  hideProgress(): void;
  
  // إشعارات دائمة
  showPersistent(id: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void;
  hidePersistent(id: string): void;
  
  // إعدادات الإشعارات
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}