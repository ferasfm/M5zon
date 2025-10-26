// models/DatabaseConnectionModel.ts - نموذج الاتصال بقاعدة البيانات

import { 
  DatabaseConnection, 
  ConnectionConfig, 
  ConnectionStatus, 
  SecurityConfig, 
  BackupConfig, 
  ConnectionMetadata,
  DatabaseType,
  ConnectionHealth,
  EnvironmentType,
  EncryptionLevel,
  CompressionLevel
} from '../interfaces/database';
import { SYSTEM_CONSTANTS } from '../types/database';

export class DatabaseConnectionModel implements DatabaseConnection {
  public id: string;
  public name: string;
  public displayName: string;
  public description?: string;
  public connectionConfig: ConnectionConfig;
  public status: ConnectionStatus;
  public security: SecurityConfig;
  public backup: BackupConfig;
  public metadata: ConnectionMetadata;

  constructor(data: Partial<DatabaseConnection> & { name: string; connectionConfig: ConnectionConfig }) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.displayName = data.displayName || data.name;
    this.description = data.description;
    
    // إعداد تكوين الاتصال
    this.connectionConfig = {
      url: data.connectionConfig.url,
      key: data.connectionConfig.key,
      type: data.connectionConfig.type || 'supabase',
      ssl: data.connectionConfig.ssl ?? true,
      timeout: data.connectionConfig.timeout || SYSTEM_CONSTANTS.CONNECTION_TEST_TIMEOUT
    };

    // إعداد حالة الاتصال
    this.status = {
      isActive: false,
      health: 'unknown' as ConnectionHealth,
      lastConnected: undefined,
      lastHealthCheck: undefined,
      connectionCount: 0,
      averageResponseTime: undefined,
      ...data.status
    };

    // إعداد الأمان
    this.security = {
      encryptionEnabled: true,
      sessionTimeout: SYSTEM_CONSTANTS.DEFAULT_SESSION_TIMEOUT,
      autoLogout: true,
      lastPasswordChange: undefined,
      encryptionLevel: 'basic' as EncryptionLevel,
      ...data.security
    };

    // إعداد النسخ الاحتياطي
    this.backup = {
      autoBackupEnabled: true,
      backupSchedule: undefined,
      lastBackup: undefined,
      retentionDays: SYSTEM_CONSTANTS.DEFAULT_BACKUP_RETENTION,
      compressionLevel: 'low' as CompressionLevel,
      ...data.backup
    };

    // إعداد البيانات الوصفية
    this.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: undefined,
      tags: [],
      environment: 'development' as EnvironmentType,
      ...data.metadata
    };
  }

  // توليد معرف فريد
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // تحديث البيانات الوصفية
  public updateMetadata(): void {
    this.metadata.updatedAt = new Date();
  }

  // تحديث حالة الاتصال
  public updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    this.updateMetadata();
  }

  // تحديث إعدادات الأمان
  public updateSecurityConfig(updates: Partial<SecurityConfig>): void {
    this.security = { ...this.security, ...updates };
    this.updateMetadata();
  }

  // تحديث إعدادات النسخ الاحتياطي
  public updateBackupConfig(updates: Partial<BackupConfig>): void {
    this.backup = { ...this.backup, ...updates };
    this.updateMetadata();
  }

  // تحديث تكوين الاتصال
  public updateConnectionConfig(updates: Partial<ConnectionConfig>): void {
    this.connectionConfig = { ...this.connectionConfig, ...updates };
    this.updateMetadata();
  }

  // التحقق من صحة البيانات
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // التحقق من الاسم
    if (!this.name || this.name.trim().length === 0) {
      errors.push('اسم الاتصال مطلوب');
    }

    // التحقق من URL
    if (!this.connectionConfig.url || this.connectionConfig.url.trim().length === 0) {
      errors.push('رابط قاعدة البيانات مطلوب');
    } else {
      try {
        new URL(this.connectionConfig.url);
      } catch {
        errors.push('رابط قاعدة البيانات غير صحيح');
      }
    }

    // التحقق من المفتاح
    if (!this.connectionConfig.key || this.connectionConfig.key.trim().length === 0) {
      errors.push('مفتاح قاعدة البيانات مطلوب');
    }

    // التحقق من مهلة الجلسة
    if (this.security.sessionTimeout < 1 || this.security.sessionTimeout > 1440) {
      errors.push('مهلة الجلسة يجب أن تكون بين 1 و 1440 دقيقة');
    }

    // التحقق من مدة الاحتفاظ بالنسخ الاحتياطية
    if (this.backup.retentionDays < 1 || this.backup.retentionDays > 365) {
      errors.push('مدة الاحتفاظ بالنسخ الاحتياطية يجب أن تكون بين 1 و 365 يوم');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // تحويل إلى JSON
  public toJSON(): DatabaseConnection {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      connectionConfig: { ...this.connectionConfig },
      status: { ...this.status },
      security: { ...this.security },
      backup: { ...this.backup },
      metadata: { ...this.metadata }
    };
  }

  // إنشاء من JSON
  public static fromJSON(data: any): DatabaseConnectionModel {
    return new DatabaseConnectionModel({
      ...data,
      metadata: {
        ...data.metadata,
        createdAt: new Date(data.metadata.createdAt),
        updatedAt: new Date(data.metadata.updatedAt)
      },
      status: {
        ...data.status,
        lastConnected: data.status.lastConnected ? new Date(data.status.lastConnected) : undefined,
        lastHealthCheck: data.status.lastHealthCheck ? new Date(data.status.lastHealthCheck) : undefined
      },
      backup: {
        ...data.backup,
        lastBackup: data.backup.lastBackup ? new Date(data.backup.lastBackup) : undefined
      },
      security: {
        ...data.security,
        lastPasswordChange: data.security.lastPasswordChange ? new Date(data.security.lastPasswordChange) : undefined
      }
    });
  }

  // نسخ الاتصال
  public clone(): DatabaseConnectionModel {
    const cloned = DatabaseConnectionModel.fromJSON(this.toJSON());
    cloned.id = cloned.generateId();
    cloned.name = `${this.name} - نسخة`;
    cloned.displayName = `${this.displayName} - نسخة`;
    cloned.status.isActive = false;
    cloned.metadata.createdAt = new Date();
    cloned.metadata.updatedAt = new Date();
    return cloned;
  }

  // مقارنة الاتصالات
  public equals(other: DatabaseConnectionModel): boolean {
    return this.id === other.id;
  }

  // الحصول على معلومات مختصرة
  public getSummary(): {
    id: string;
    name: string;
    type: DatabaseType;
    isActive: boolean;
    health: ConnectionHealth;
    lastConnected?: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      type: this.connectionConfig.type,
      isActive: this.status.isActive,
      health: this.status.health,
      lastConnected: this.status.lastConnected
    };
  }

  // التحقق من انتهاء صلاحية الجلسة
  public isSessionExpired(): boolean {
    if (!this.status.lastConnected || !this.security.autoLogout) {
      return false;
    }

    const now = new Date();
    const sessionEnd = new Date(this.status.lastConnected.getTime() + (this.security.sessionTimeout * 60 * 1000));
    return now > sessionEnd;
  }

  // الحصول على الوقت المتبقي للجلسة
  public getRemainingSessionTime(): number {
    if (!this.status.lastConnected || !this.security.autoLogout) {
      return -1;
    }

    const now = new Date();
    const sessionEnd = new Date(this.status.lastConnected.getTime() + (this.security.sessionTimeout * 60 * 1000));
    const remaining = sessionEnd.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000)); // بالثواني
  }
}