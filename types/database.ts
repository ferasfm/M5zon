// types/database.ts - أنواع البيانات الأساسية لنظام إدارة قواعد البيانات

export type DatabaseType = 'supabase' | 'postgresql' | 'mysql';
export type ConnectionHealth = 'healthy' | 'warning' | 'error' | 'unknown';
export type BackupType = 'auto' | 'manual' | 'pre-disconnect';
export type BackupStatus = 'completed' | 'failed' | 'in-progress';
export type EnvironmentType = 'development' | 'staging' | 'production';
export type ConflictResolutionStrategy = 'manual' | 'server-wins' | 'client-wins';
export type EncryptionLevel = 'basic' | 'advanced';
export type BackoffStrategy = 'linear' | 'exponential';
export type CompressionLevel = 'none' | 'low' | 'high';

// تعدادات الأخطاء
export enum ErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  BACKUP_FAILED = 'BACKUP_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

// حالات الاتصال
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
  CHECKING = 'checking'
}

// أنواع الأنشطة
export enum ActivityType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  TEST = 'test',
  BACKUP = 'backup',
  RESTORE = 'restore',
  SYNC = 'sync',
  LOGIN = 'login',
  LOGOUT = 'logout'
}

// ثوابت النظام
export const SYSTEM_CONSTANTS = {
  DEFAULT_SESSION_TIMEOUT: 60, // دقيقة
  MAX_CONNECTION_ATTEMPTS: 3,
  DEFAULT_BACKUP_RETENTION: 30, // يوم
  MAX_BACKUP_SIZE: 100 * 1024 * 1024, // 100MB
  DEFAULT_SYNC_INTERVAL: 5000, // 5 ثوان
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CONNECTION_TEST_TIMEOUT: 10000, // 10 ثوان
  ENCRYPTION_KEY_LENGTH: 32,
  MAX_ACTIVITY_LOG_ENTRIES: 1000
} as const;

// رسائل الأخطاء باللغة العربية
export const ERROR_MESSAGES = {
  [ErrorType.CONNECTION_FAILED]: 'فشل الاتصال بقاعدة البيانات',
  [ErrorType.AUTHENTICATION_ERROR]: 'خطأ في المصادقة',
  [ErrorType.NETWORK_ERROR]: 'خطأ في الشبكة',
  [ErrorType.ENCRYPTION_ERROR]: 'خطأ في التشفير',
  [ErrorType.BACKUP_FAILED]: 'فشل إنشاء النسخة الاحتياطية',
  [ErrorType.SYNC_CONFLICT]: 'تضارب في البيانات أثناء المزامنة',
  [ErrorType.SESSION_EXPIRED]: 'انتهت صلاحية الجلسة',
  [ErrorType.VALIDATION_ERROR]: 'خطأ في التحقق من صحة البيانات',
  [ErrorType.STORAGE_ERROR]: 'خطأ في التخزين المحلي'
} as const;