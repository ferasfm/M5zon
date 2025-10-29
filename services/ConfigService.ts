// خدمة إدارة الإعدادات من الملفات
class ConfigService {
    private static instance: ConfigService;
    private appConfig: any = null;
    private userSettings: any = null;

    private constructor() {}

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    // تحميل إعدادات التطبيق الأساسية
    async loadAppConfig(): Promise<any> {
        if (this.appConfig) return this.appConfig;

        try {
            const response = await fetch('/config/app-config.json');
            if (response.ok) {
                this.appConfig = await response.json();
                return this.appConfig;
            }
        } catch (error) {
            console.warn('لا يمكن تحميل ملف إعدادات التطبيق:', error);
        }

        // الإعدادات الافتراضية في حالة عدم وجود الملف
        this.appConfig = {
            version: "1.0.0",
            defaultSettings: {
                connections: [],
                security: {
                    encryptionEnabled: true,
                    sessionTimeout: 30,
                    autoLogout: true,
                    auditLogEnabled: true
                },
                backup: {
                    autoBackupEnabled: true,
                    retentionDays: 30,
                    compressionEnabled: true,
                    backupBeforeDisconnect: true
                },
                offline: {
                    enabled: false,
                    maxCacheSize: 50,
                    syncInterval: 300,
                    conflictResolutionStrategy: "manual"
                },
                ui: {
                    theme: "light",
                    language: "ar",
                    showAdvancedOptions: false,
                    autoRefreshInterval: 30
                }
            },
            deployment: {
                useFileConfig: true,
                fallbackToLocalStorage: true
            }
        };

        return this.appConfig;
    }

    // تحميل إعدادات المستخدم
    async loadUserSettings(): Promise<any> {
        if (this.userSettings) return this.userSettings;

        const appConfig = await this.loadAppConfig();
        
        // محاولة تحميل إعدادات المستخدم من الملف
        if (appConfig.deployment?.useFileConfig) {
            try {
                const response = await fetch('/config/user-settings.json');
                if (response.ok) {
                    this.userSettings = await response.json();
                    console.log('✅ تم تحميل إعدادات المستخدم من الملف');
                    return this.userSettings;
                }
            } catch (error) {
                console.warn('لا يمكن تحميل ملف إعدادات المستخدم:', error);
            }
        }

        // الرجوع إلى localStorage إذا كان مفعلاً
        if (appConfig.deployment?.fallbackToLocalStorage) {
            try {
                const localSettings = localStorage.getItem('inventory_app_settings');
                if (localSettings) {
                    this.userSettings = JSON.parse(localSettings);
                    console.log('✅ تم تحميل إعدادات المستخدم من التخزين المحلي');
                    return this.userSettings;
                }
            } catch (error) {
                console.warn('خطأ في قراءة الإعدادات من التخزين المحلي:', error);
            }
        }

        // استخدام الإعدادات الافتراضية
        this.userSettings = {
            ...appConfig.defaultSettings,
            system: {
                version: appConfig.version,
                installDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }
        };

        console.log('✅ تم استخدام الإعدادات الافتراضية');
        return this.userSettings;
    }

    // حفظ إعدادات المستخدم
    async saveUserSettings(settings: any): Promise<boolean> {
        const appConfig = await this.loadAppConfig();
        
        // محاولة حفظ في localStorage (دائماً متاح)
        try {
            localStorage.setItem('inventory_app_settings', JSON.stringify(settings));
            console.log('✅ تم حفظ الإعدادات في التخزين المحلي');
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات محلياً:', error);
        }

        // إشعار المستخدم بكيفية حفظ الإعدادات للنسخ
        this.showConfigInstructions(settings);
        
        return true;
    }

    // عرض تعليمات حفظ الإعدادات
    private showConfigInstructions(settings: any) {
        console.group('📋 تعليمات حفظ الإعدادات للنسخ:');
        console.log('1. انسخ الإعدادات التالية إلى ملف config/user-settings.json:');
        console.log(JSON.stringify(settings, null, 2));
        console.log('2. أو استخدم ميزة "تصدير الإعدادات" من واجهة البرنامج');
        console.log('3. عند نسخ البرنامج، انسخ ملف config/user-settings.json معه');
        console.groupEnd();
    }

    // فحص إمكانية الكتابة في الملفات
    async canWriteToFiles(): Promise<boolean> {
        // في بيئة المتصفح، لا يمكن الكتابة مباشرة في الملفات
        // هذه الوظيفة للاستخدام المستقبلي مع Electron أو Node.js
        return false;
    }

    // إنشاء ملف إعدادات للتصدير
    generateConfigFile(settings: any): string {
        const configFile = {
            ...settings,
            exportDate: new Date().toISOString(),
            instructions: {
                ar: "ضع هذا الملف في مجلد config/user-settings.json لاستخدام هذه الإعدادات تلقائياً",
                en: "Place this file in config/user-settings.json to use these settings automatically"
            }
        };

        return JSON.stringify(configFile, null, 2);
    }

    // التحقق من وجود إعدادات محفوظة
    async hasExistingSettings(): Promise<boolean> {
        // فحص الملف
        try {
            const response = await fetch('/config/user-settings.json');
            if (response.ok) return true;
        } catch {}

        // فحص التخزين المحلي
        try {
            const localSettings = localStorage.getItem('inventory_app_settings');
            return !!localSettings;
        } catch {}

        return false;
    }

    // مسح جميع الإعدادات
    async clearAllSettings(): Promise<void> {
        this.appConfig = null;
        this.userSettings = null;
        
        try {
            localStorage.removeItem('inventory_app_settings');
            localStorage.removeItem('inventory_connections');
            localStorage.removeItem('inventory_audit_log');
            localStorage.removeItem('inventory_backups');
        } catch (error) {
            console.error('خطأ في مسح الإعدادات:', error);
        }
    }
}

export default ConfigService;