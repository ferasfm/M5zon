// utils/connectionValidation.ts - أدوات التحقق من صحة الاتصالات

import { DatabaseConnection, ConnectionConfig } from '../interfaces/database';
import { DatabaseType } from '../types/database';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export class ConnectionValidator {
  
  // التحقق من صحة الاتصال الكامل
  static validateConnection(connection: Partial<DatabaseConnection>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // التحقق من الحقول الأساسية
    this.validateBasicFields(connection, errors);
    
    // التحقق من تكوين الاتصال
    if (connection.connectionConfig) {
      this.validateConnectionConfig(connection.connectionConfig, errors, warnings);
    } else {
      errors.push({
        field: 'connectionConfig',
        message: 'تكوين الاتصال مطلوب',
        code: 'MISSING_CONFIG'
      });
    }

    // التحقق من إعدادات الأمان
    if (connection.security) {
      this.validateSecurityConfig(connection.security, errors, warnings);
    }

    // التحقق من إعدادات النسخ الاحتياطي
    if (connection.backup) {
      this.validateBackupConfig(connection.backup, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // التحقق من الحقول الأساسية
  private static validateBasicFields(connection: Partial<DatabaseConnection>, errors: ValidationError[]): void {
    // التحقق من الاسم
    if (!connection.name || connection.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'اسم الاتصال مطلوب',
        code: 'REQUIRED_FIELD'
      });
    } else if (connection.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'اسم الاتصال يجب أن يكون أقل من 100 حرف',
        code: 'MAX_LENGTH'
      });
    } else if (!/^[a-zA-Z0-9\u0600-\u06FF\s\-_]+$/.test(connection.name)) {
      errors.push({
        field: 'name',
        message: 'اسم الاتصال يحتوي على أحرف غير مسموحة',
        code: 'INVALID_CHARACTERS'
      });
    }

    // التحقق من الاسم المعروض
    if (connection.displayName && connection.displayName.length > 150) {
      errors.push({
        field: 'displayName',
        message: 'الاسم المعروض يجب أن يكون أقل من 150 حرف',
        code: 'MAX_LENGTH'
      });
    }

    // التحقق من الوصف
    if (connection.description && connection.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'الوصف يجب أن يكون أقل من 500 حرف',
        code: 'MAX_LENGTH'
      });
    }
  }

  // التحقق من تكوين الاتصال
  private static validateConnectionConfig(config: ConnectionConfig, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // التحقق من URL
    if (!config.url || config.url.trim().length === 0) {
      errors.push({
        field: 'connectionConfig.url',
        message: 'رابط قاعدة البيانات مطلوب',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const urlValidation = this.validateURL(config.url, config.type);
      if (!urlValidation.isValid) {
        errors.push({
          field: 'connectionConfig.url',
          message: urlValidation.message,
          code: 'INVALID_URL'
        });
      }
      
      // تحذيرات URL
      if (urlValidation.warnings) {
        warnings.push(...urlValidation.warnings.map(warning => ({
          field: 'connectionConfig.url',
          message: warning,
          suggestion: 'تأكد من أن الرابط صحيح ويدعم HTTPS'
        })));
      }
    }

    // التحقق من المفتاح
    if (!config.key || config.key.trim().length === 0) {
      errors.push({
        field: 'connectionConfig.key',
        message: 'مفتاح قاعدة البيانات مطلوب',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const keyValidation = this.validateKey(config.key, config.type);
      if (!keyValidation.isValid) {
        errors.push({
          field: 'connectionConfig.key',
          message: keyValidation.message,
          code: 'INVALID_KEY'
        });
      }
    }

    // التحقق من نوع قاعدة البيانات
    if (!config.type) {
      errors.push({
        field: 'connectionConfig.type',
        message: 'نوع قاعدة البيانات مطلوب',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidDatabaseType(config.type)) {
      errors.push({
        field: 'connectionConfig.type',
        message: 'نوع قاعدة البيانات غير مدعوم',
        code: 'INVALID_TYPE'
      });
    }

    // التحقق من مهلة الاتصال
    if (config.timeout !== undefined) {
      if (config.timeout < 1000 || config.timeout > 60000) {
        errors.push({
          field: 'connectionConfig.timeout',
          message: 'مهلة الاتصال يجب أن تكون بين 1000 و 60000 مللي ثانية',
          code: 'INVALID_RANGE'
        });
      }
    }

    // تحذير SSL
    if (config.ssl === false) {
      warnings.push({
        field: 'connectionConfig.ssl',
        message: 'SSL غير مفعل',
        suggestion: 'يُنصح بتفعيل SSL لحماية البيانات'
      });
    }
  }

  // التحقق من إعدادات الأمان
  private static validateSecurityConfig(security: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // التحقق من مهلة الجلسة
    if (security.sessionTimeout !== undefined) {
      if (security.sessionTimeout < 1 || security.sessionTimeout > 1440) {
        errors.push({
          field: 'security.sessionTimeout',
          message: 'مهلة الجلسة يجب أن تكون بين 1 و 1440 دقيقة',
          code: 'INVALID_RANGE'
        });
      } else if (security.sessionTimeout < 15) {
        warnings.push({
          field: 'security.sessionTimeout',
          message: 'مهلة الجلسة قصيرة جداً',
          suggestion: 'يُنصح بمهلة لا تقل عن 15 دقيقة'
        });
      }
    }

    // تحذير التشفير
    if (security.encryptionEnabled === false) {
      warnings.push({
        field: 'security.encryptionEnabled',
        message: 'التشفير غير مفعل',
        suggestion: 'يُنصح بتفعيل التشفير لحماية البيانات الحساسة'
      });
    }

    // تحذير التسجيل التلقائي للخروج
    if (security.autoLogout === false) {
      warnings.push({
        field: 'security.autoLogout',
        message: 'التسجيل التلقائي للخروج غير مفعل',
        suggestion: 'يُنصح بتفعيل التسجيل التلقائي للخروج لحماية إضافية'
      });
    }
  }

  // التحقق من إعدادات النسخ الاحتياطي
  private static validateBackupConfig(backup: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // التحقق من مدة الاحتفاظ
    if (backup.retentionDays !== undefined) {
      if (backup.retentionDays < 1 || backup.retentionDays > 365) {
        errors.push({
          field: 'backup.retentionDays',
          message: 'مدة الاحتفاظ بالنسخ الاحتياطية يجب أن تكون بين 1 و 365 يوم',
          code: 'INVALID_RANGE'
        });
      } else if (backup.retentionDays < 7) {
        warnings.push({
          field: 'backup.retentionDays',
          message: 'مدة الاحتفاظ قصيرة',
          suggestion: 'يُنصح بالاحتفاظ بالنسخ الاحتياطية لمدة أسبوع على الأقل'
        });
      }
    }

    // تحذير النسخ الاحتياطي التلقائي
    if (backup.autoBackupEnabled === false) {
      warnings.push({
        field: 'backup.autoBackupEnabled',
        message: 'النسخ الاحتياطي التلقائي غير مفعل',
        suggestion: 'يُنصح بتفعيل النسخ الاحتياطي التلقائي لحماية البيانات'
      });
    }

    // التحقق من جدولة النسخ الاحتياطي
    if (backup.backupSchedule) {
      const scheduleValidation = this.validateBackupSchedule(backup.backupSchedule);
      if (!scheduleValidation.isValid) {
        errors.push({
          field: 'backup.backupSchedule',
          message: scheduleValidation.message,
          code: 'INVALID_SCHEDULE'
        });
      }
    }
  }

  // التحقق من صحة URL
  private static validateURL(url: string, type: DatabaseType): { isValid: boolean; message: string; warnings?: string[] } {
    const warnings: string[] = [];
    
    try {
      const urlObj = new URL(url);
      
      // التحقق من البروتوكول
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          message: 'البروتوكول يجب أن يكون HTTP أو HTTPS'
        };
      }

      // تحذير HTTP
      if (urlObj.protocol === 'http:') {
        warnings.push('يُنصح باستخدام HTTPS بدلاً من HTTP');
      }

      // التحقق حسب نوع قاعدة البيانات
      switch (type) {
        case 'supabase':
          if (!urlObj.hostname.includes('supabase')) {
            warnings.push('الرابط لا يبدو كرابط Supabase صحيح');
          }
          break;
        case 'postgresql':
          if (urlObj.port && (parseInt(urlObj.port) < 1 || parseInt(urlObj.port) > 65535)) {
            return {
              isValid: false,
              message: 'رقم المنفذ غير صحيح'
            };
          }
          break;
      }

      return {
        isValid: true,
        message: 'URL صحيح',
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
    } catch (error) {
      return {
        isValid: false,
        message: 'تنسيق URL غير صحيح'
      };
    }
  }

  // التحقق من صحة المفتاح
  private static validateKey(key: string, type: DatabaseType): { isValid: boolean; message: string } {
    switch (type) {
      case 'supabase':
        // التحقق من تنسيق مفتاح Supabase
        if (!key.startsWith('eyJ')) {
          return {
            isValid: false,
            message: 'مفتاح Supabase يجب أن يبدأ بـ eyJ'
          };
        }
        
        // التحقق من طول المفتاح
        if (key.length < 100) {
          return {
            isValid: false,
            message: 'مفتاح Supabase قصير جداً'
          };
        }
        
        break;
        
      case 'postgresql':
      case 'mysql':
        // التحقق من طول كلمة المرور
        if (key.length < 8) {
          return {
            isValid: false,
            message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
          };
        }
        break;
    }

    return {
      isValid: true,
      message: 'المفتاح صحيح'
    };
  }

  // التحقق من نوع قاعدة البيانات
  private static isValidDatabaseType(type: string): type is DatabaseType {
    return ['supabase', 'postgresql', 'mysql'].includes(type);
  }

  // التحقق من جدولة النسخ الاحتياطي
  private static validateBackupSchedule(schedule: any): { isValid: boolean; message: string } {
    if (!schedule.frequency) {
      return {
        isValid: false,
        message: 'تكرار النسخ الاحتياطي مطلوب'
      };
    }

    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      return {
        isValid: false,
        message: 'تكرار النسخ الاحتياطي غير صحيح'
      };
    }

    // التحقق من الوقت
    if (schedule.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
      return {
        isValid: false,
        message: 'تنسيق الوقت غير صحيح (يجب أن يكون HH:MM)'
      };
    }

    // التحقق من أيام الأسبوع للجدولة الأسبوعية
    if (schedule.frequency === 'weekly' && schedule.daysOfWeek) {
      if (!Array.isArray(schedule.daysOfWeek) || 
          schedule.daysOfWeek.some((day: any) => day < 0 || day > 6)) {
        return {
          isValid: false,
          message: 'أيام الأسبوع غير صحيحة'
        };
      }
    }

    // التحقق من يوم الشهر للجدولة الشهرية
    if (schedule.frequency === 'monthly' && schedule.dayOfMonth) {
      if (schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        return {
          isValid: false,
          message: 'يوم الشهر يجب أن يكون بين 1 و 31'
        };
      }
    }

    return {
      isValid: true,
      message: 'الجدولة صحيحة'
    };
  }

  // التحقق من تفرد الاسم
  static async validateUniqueName(name: string, excludeId?: string, existingConnections?: DatabaseConnection[]): Promise<boolean> {
    if (!existingConnections) {
      return true; // لا يمكن التحقق بدون قائمة الاتصالات
    }

    return !existingConnections.some(conn => 
      conn.name.toLowerCase() === name.toLowerCase() && 
      conn.id !== excludeId
    );
  }

  // التحقق السريع من الحقول المطلوبة
  static validateRequiredFields(connection: Partial<DatabaseConnection>): string[] {
    const missingFields: string[] = [];

    if (!connection.name) missingFields.push('الاسم');
    if (!connection.connectionConfig?.url) missingFields.push('رابط قاعدة البيانات');
    if (!connection.connectionConfig?.key) missingFields.push('مفتاح قاعدة البيانات');
    if (!connection.connectionConfig?.type) missingFields.push('نوع قاعدة البيانات');

    return missingFields;
  }

  // اقتراحات التحسين
  static getImprovementSuggestions(connection: DatabaseConnection): string[] {
    const suggestions: string[] = [];

    // اقتراحات الأمان
    if (!connection.security.encryptionEnabled) {
      suggestions.push('فعّل التشفير لحماية البيانات الحساسة');
    }

    if (!connection.security.autoLogout) {
      suggestions.push('فعّل التسجيل التلقائي للخروج لحماية إضافية');
    }

    if (connection.security.sessionTimeout > 120) {
      suggestions.push('قلل مهلة الجلسة لحماية أفضل');
    }

    // اقتراحات النسخ الاحتياطي
    if (!connection.backup.autoBackupEnabled) {
      suggestions.push('فعّل النسخ الاحتياطي التلقائي');
    }

    if (connection.backup.retentionDays < 7) {
      suggestions.push('زد مدة الاحتفاظ بالنسخ الاحتياطية');
    }

    // اقتراحات الاتصال
    if (!connection.connectionConfig.ssl) {
      suggestions.push('فعّل SSL لحماية البيانات أثناء النقل');
    }

    if (connection.connectionConfig.timeout > 30000) {
      suggestions.push('قلل مهلة الاتصال لتحسين الاستجابة');
    }

    return suggestions;
  }
}