// interfaces/database.ts - واجهات نظام إدارة قواعد البيانات

import { 
  DatabaseType, 
  ConnectionHealth, 
  BackupType, 
  BackupStatus, 
  EnvironmentType,
  ConflictResolutionStrategy,
  EncryptionLevel,
  BackoffStrategy,
  CompressionLevel,
  ErrorType,
  ActivityType
} from '../types/database';

// واجهة معلومات الاتصال
export interface ConnectionConfig {
  url: string;
  key: string;
  type: DatabaseType;
  ssl: boolean;
  timeout: number;
}

// واجهة حالة الاتصال
export interface ConnectionStatus {
  isActive: boolean;
  health: ConnectionHealth;
  lastConnected?: Date;
  lastHealthCheck?: Date;
  connectionCount: number;
  averageResponseTime?: number;
}

// واجهة إعدادات الأمان
export interface SecurityConfig {
  encryptionEnabled: boolean;
  sessionTimeout: number;
  autoLogout: boolean;
  lastPasswordChange?: Date;
  encryptionLevel: EncryptionLevel;
}

// واجهة إعدادات النسخ الاحتياطي
export interface BackupConfig {
  autoBackupEnabled: boolean;
  backupSchedule?: BackupSchedule;
  lastBackup?: Date;
  retentionDays: number;
  compressionLevel: CompressionLevel;
}

// واجهة البيانات الوصفية
export interface ConnectionMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
  environment: EnvironmentType;
}

// واجهة الاتصال الكاملة
export interface DatabaseConnection {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  connectionConfig: ConnectionConfig;
  status: ConnectionStatus;
  security: SecurityConfig;
  backup: BackupConfig;
  metadata: ConnectionMetadata;
}

// واجهة جدولة النسخ الاحتياطي
export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
}

// واجهة معلومات النسخة الاحتياطية
export interface BackupInfo {
  id: string;
  name: string;
  connectionId: string;
  connectionName: string;
  createdAt: Date;
  size: number;
  type: BackupType;
  status: BackupStatus;
  metadata: BackupMetadata;
  filePath?: string;
}

// واجهة البيانات الوصفية للنسخة الاحتياطية
export interface BackupMetadata {
  tableCount: number;
  recordCount: number;
  version: string;
  checksum?: string;
  compressed: boolean;
}

// واجهة نتيجة النسخ الاحتياطي
export interface BackupResult {
  success: boolean;
  backupId?: string;
  message: string;
  size?: number;
  duration?: number;
  error?: DatabaseError;
}

// واجهة خيارات الاستعادة
export interface RestoreOptions {
  overwriteExisting: boolean;
  validateBeforeRestore: boolean;
  createBackupBeforeRestore: boolean;
  selectedTables?: string[];
}

// واجهة نتيجة الاستعادة
export interface RestoreResult {
  success: boolean;
  message: string;
  restoredTables: string[];
  duration?: number;
  error?: DatabaseError;
}

// واجهة نتيجة التحقق
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalTables: number;
    totalRecords: number;
    corruptedTables: number;
  };
}

// واجهة مشكلة التحقق
export interface ValidationIssue {
  type: 'missing_table' | 'corrupted_data' | 'invalid_format';
  table: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// واجهة نشاط الاتصال
export interface ConnectionActivity {
  id: string;
  timestamp: Date;
  action: ActivityType;
  connectionId: string;
  connectionName: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
}

// واجهة خطأ قاعدة البيانات
export interface DatabaseError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  connectionId?: string;
  recoverable: boolean;
  suggestedActions: string[];
}

// واجهة نتيجة اختبار الاتصال
export interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  message: string;
  details?: {
    serverVersion?: string;
    databaseName?: string;
    tableCount?: number;
  };
  error?: DatabaseError;
}

// واجهة مقاييس الاتصال
export interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  uptime: number;
  lastError?: DatabaseError;
}

// واجهة صحة الاتصال
export interface ConnectionHealthInfo {
  status: ConnectionHealth;
  lastCheck: Date;
  responseTime: number;
  issues: HealthIssue[];
  recommendations: string[];
}

// واجهة مشكلة الصحة
export interface HealthIssue {
  type: 'performance' | 'connectivity' | 'security' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution?: string;
}

// واجهة تضارب المزامنة
export interface SyncConflict {
  id: string;
  table: string;
  recordId: string;
  localData: any;
  serverData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

// واجهة نتيجة المزامنة
export interface SyncResult {
  success: boolean;
  syncedTables: string[];
  conflicts: SyncConflict[];
  statistics: {
    totalRecords: number;
    updatedRecords: number;
    createdRecords: number;
    deletedRecords: number;
  };
  duration: number;
  error?: DatabaseError;
}

// واجهة إعدادات النظام
export interface SystemSettings {
  security: {
    globalEncryption: boolean;
    defaultSessionTimeout: number;
    maxConnectionAttempts: number;
    lockoutDuration: number;
    auditLogEnabled: boolean;
  };
  backup: {
    defaultRetentionDays: number;
    compressionEnabled: boolean;
    autoBackupBeforeDisconnect: boolean;
    maxBackupSize: number;
  };
  offline: {
    enabled: boolean;
    maxCacheSize: number;
    syncInterval: number;
    conflictResolutionStrategy: ConflictResolutionStrategy;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'ar' | 'en';
    showAdvancedOptions: boolean;
    autoRefreshInterval: number;
  };
}

// واجهة استراتيجية الاسترداد
export interface RecoveryStrategy {
  autoRetry: {
    enabled: boolean;
    maxAttempts: number;
    backoffStrategy: BackoffStrategy;
    baseDelay: number;
  };
  failover: {
    enabled: boolean;
    fallbackConnectionId?: string;
    switchToOffline: boolean;
  };
  notifications: {
    showErrorNotifications: boolean;
    showRecoveryNotifications: boolean;
    persistentErrors: boolean;
  };
}