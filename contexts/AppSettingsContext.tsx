import React, { createContext, useContext, useState, useEffect } from 'react';
import ConfigService from '../services/ConfigService';

// أنواع الإعدادات المحلية
interface DatabaseConnection {
    id: string;
    name: string;
    displayName: string;
    url: string;
    key: string; // مشفر
    isActive: boolean;
    lastConnected?: Date;
    health: 'healthy' | 'warning' | 'error';
    metadata: {
        createdAt: Date;
        updatedAt: Date;
        connectionCount: number;
    };
}

interface SecuritySettings {
    encryptionEnabled: boolean;
    sessionTimeout: number; // بالدقائق
    autoLogout: boolean;
    auditLogEnabled: boolean;
    maxConnectionAttempts: number;
    lockoutDuration: number; // بالدقائق
}

interface BackupSettings {
    autoBackupEnabled: boolean;
    retentionDays: number;
    compressionEnabled: boolean;
    backupBeforeDisconnect: boolean;
    maxBackupSize: number; // بالميجابايت
}

interface OfflineSettings {
    enabled: boolean;
    maxCacheSize: number; // بالميجابايت
    syncInterval: number; // بالثواني
    conflictResolutionStrategy: 'manual' | 'server-wins' | 'client-wins';
}

interface UISettings {
    theme: 'light' | 'dark' | 'auto';
    language: 'ar' | 'en';
    showAdvancedOptions: boolean;
    autoRefreshInterval: number; // بالثواني
}

interface AppSettings {
    // إعدادات الاتصالات
    connections: DatabaseConnection[];
    activeConnectionId: string | null;
    
    // إعدادات الأمان
    security: SecuritySettings;
    
    // إعدادات النسخ الاحتياطي
    backup: BackupSettings;
    
    // إعدادات وضع عدم الاتصال
    offline: OfflineSettings;
    
    // إعدادات الواجهة
    ui: UISettings;
    
    // معلومات النظام
    system: {
        version: string;
        lastUpdated: Date;
        installDate: Date;
    };
}

// الإعدادات الافتراضية
const defaultSettings: AppSettings = {
    connections: [],
    activeConnectionId: null,
    security: {
        encryptionEnabled: true,
        sessionTimeout: 30,
        autoLogout: true,
        auditLogEnabled: true,
        maxConnectionAttempts: 3,
        lockoutDuration: 15
    },
    backup: {
        autoBackupEnabled: true,
        retentionDays: 30,
        compressionEnabled: true,
        backupBeforeDisconnect: true,
        maxBackupSize: 100
    },
    offline: {
        enabled: false,
        maxCacheSize: 50,
        syncInterval: 300,
        conflictResolutionStrategy: 'manual'
    },
    ui: {
        theme: 'light',
        language: 'ar',
        showAdvancedOptions: false,
        autoRefreshInterval: 30
    },
    system: {
        version: '1.0.0',
        lastUpdated: new Date(),
        installDate: new Date()
    }
};

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
    APP_SETTINGS: 'inventory_app_settings',
    CONNECTIONS: 'inventory_connections',
    AUDIT_LOG: 'inventory_audit_log',
    BACKUP_LIST: 'inventory_backups'
};

interface AppSettingsContextType {
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    
    // إدارة الاتصالات
    addConnection: (connection: Omit<DatabaseConnection, 'id' | 'metadata'>) => string;
    updateConnection: (id: string, updates: Partial<DatabaseConnection>) => void;
    deleteConnection: (id: string) => void;
    setActiveConnection: (id: string) => void;
    getActiveConnection: () => DatabaseConnection | null;
    
    // إدارة الأمان
    updateSecuritySettings: (updates: Partial<SecuritySettings>) => void;
    logSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => void;
    getAuditLog: () => SecurityEvent[];
    clearAuditLog: () => void;
    
    // إدارة النسخ الاحتياطي
    updateBackupSettings: (updates: Partial<BackupSettings>) => void;
    addBackupRecord: (backup: BackupRecord) => void;
    getBackupList: () => BackupRecord[];
    deleteBackupRecord: (id: string) => void;
    
    // إدارة وضع عدم الاتصال
    updateOfflineSettings: (updates: Partial<OfflineSettings>) => void;
    
    // إدارة الواجهة
    updateUISettings: (updates: Partial<UISettings>) => void;
    
    // تصدير/استيراد الإعدادات
    exportSettings: () => string;
    importSettings: (settingsJson: string) => boolean;
    resetSettings: () => void;
}

interface SecurityEvent {
    id: string;
    timestamp: Date;
    action: 'connect' | 'disconnect' | 'test' | 'backup' | 'restore' | 'login' | 'logout';
    connectionId?: string;
    connectionName?: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
}

interface BackupRecord {
    id: string;
    name: string;
    connectionId: string;
    connectionName: string;
    createdAt: Date;
    size: number;
    type: 'auto' | 'manual' | 'pre-disconnect';
    status: 'completed' | 'failed' | 'in-progress';
    filePath?: string;
    metadata: {
        tableCount: number;
        recordCount: number;
        version: string;
    };
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

// خدمة التشفير البسيطة
class EncryptionService {
    private static key = 'inventory-app-2024';
    
    static encrypt(text: string): string {
        try {
            // تشفير بسيط باستخدام Base64 (يمكن تحسينه لاحقاً)
            return btoa(unescape(encodeURIComponent(text + this.key)));
        } catch {
            return text;
        }
    }
    
    static decrypt(encryptedText: string): string {
        try {
            const decoded = decodeURIComponent(escape(atob(encryptedText)));
            return decoded.replace(this.key, '');
        } catch {
            return encryptedText;
        }
    }
}

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);

    // تحميل الإعدادات عند بدء التطبيق
    useEffect(() => {
        loadSettings();
        setIsInitialized(true);
    }, []);

    // حفظ الإعدادات عند تغييرها (تجنب الحفظ في التحميل الأول)
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        if (isInitialized) {
            saveSettings();
        }
    }, [settings, isInitialized]);

    const loadSettings = () => {
        try {
            const savedSettings = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
            if (savedSettings) {
                const parsed = JSON.parse(EncryptionService.decrypt(savedSettings));
                // دمج الإعدادات المحفوظة مع الافتراضية
                // تحويل التواريخ من strings إلى Date objects
                const processedSettings = {
                    ...defaultSettings,
                    ...parsed,
                    system: {
                        ...defaultSettings.system,
                        ...parsed.system,
                        installDate: parsed.system?.installDate ? new Date(parsed.system.installDate) : new Date(),
                        lastUpdated: new Date()
                    },
                    connections: parsed.connections?.map((conn: any) => ({
                        ...conn,
                        lastConnected: conn.lastConnected ? new Date(conn.lastConnected) : undefined,
                        metadata: {
                            ...conn.metadata,
                            createdAt: new Date(conn.metadata.createdAt),
                            updatedAt: new Date(conn.metadata.updatedAt)
                        }
                    })) || []
                };
                
                setSettings(processedSettings);
            }
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
            setSettings(defaultSettings);
        }
    };

    const saveSettings = () => {
        try {
            const settingsToSave = {
                ...settings,
                system: {
                    ...settings.system,
                    lastUpdated: new Date()
                }
            };
            const encrypted = EncryptionService.encrypt(JSON.stringify(settingsToSave));
            localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, encrypted);
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
        }
    };

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    // إدارة الاتصالات
    const addConnection = (connection: Omit<DatabaseConnection, 'id' | 'metadata'>): string => {
        const id = `conn_${Date.now()}`;
        const newConnection: DatabaseConnection = {
            ...connection,
            id,
            key: EncryptionService.encrypt(connection.key),
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                connectionCount: 0
            }
        };

        setSettings(prev => ({
            ...prev,
            connections: [...prev.connections, newConnection]
        }));

        return id;
    };

    const updateConnection = (id: string, updates: Partial<DatabaseConnection>) => {
        setSettings(prev => ({
            ...prev,
            connections: prev.connections.map(conn =>
                conn.id === id
                    ? {
                        ...conn,
                        ...updates,
                        key: updates.key ? EncryptionService.encrypt(updates.key) : conn.key,
                        metadata: {
                            ...conn.metadata,
                            updatedAt: new Date()
                        }
                    }
                    : conn
            )
        }));
    };

    const deleteConnection = (id: string) => {
        setSettings(prev => ({
            ...prev,
            connections: prev.connections.filter(conn => conn.id !== id),
            activeConnectionId: prev.activeConnectionId === id ? null : prev.activeConnectionId
        }));
    };

    const setActiveConnection = (id: string) => {
        setSettings(prev => ({
            ...prev,
            activeConnectionId: id,
            connections: prev.connections.map(conn => ({
                ...conn,
                isActive: conn.id === id,
                lastConnected: conn.id === id ? new Date() : conn.lastConnected,
                metadata: conn.id === id 
                    ? { ...conn.metadata, connectionCount: conn.metadata.connectionCount + 1 }
                    : conn.metadata
            }))
        }));
    };

    const getActiveConnection = (): DatabaseConnection | null => {
        return settings.connections.find(conn => conn.isActive) || null;
    };

    // إدارة الأمان
    const updateSecuritySettings = (updates: Partial<SecuritySettings>) => {
        setSettings(prev => ({
            ...prev,
            security: { ...prev.security, ...updates }
        }));
    };

    const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
        if (!settings.security.auditLogEnabled) return;

        const newEvent: SecurityEvent = {
            ...event,
            id: `event_${Date.now()}`,
            timestamp: new Date()
        };

        try {
            const existingLog = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]');
            const updatedLog = [newEvent, ...existingLog].slice(0, 1000); // الاحتفاظ بآخر 1000 حدث
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(updatedLog));
        } catch (error) {
            console.error('خطأ في تسجيل الحدث الأمني:', error);
        }
    };

    const getAuditLog = (): SecurityEvent[] => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]');
        } catch {
            return [];
        }
    };

    const clearAuditLog = () => {
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOG);
    };

    // إدارة النسخ الاحتياطي
    const updateBackupSettings = (updates: Partial<BackupSettings>) => {
        setSettings(prev => ({
            ...prev,
            backup: { ...prev.backup, ...updates }
        }));
    };

    const addBackupRecord = (backup: BackupRecord) => {
        try {
            const existingBackups = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_LIST) || '[]');
            const updatedBackups = [backup, ...existingBackups];
            localStorage.setItem(STORAGE_KEYS.BACKUP_LIST, JSON.stringify(updatedBackups));
        } catch (error) {
            console.error('خطأ في إضافة سجل النسخة الاحتياطية:', error);
        }
    };

    const getBackupList = (): BackupRecord[] => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_LIST) || '[]');
        } catch {
            return [];
        }
    };

    const deleteBackupRecord = (id: string) => {
        try {
            const existingBackups = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_LIST) || '[]');
            const updatedBackups = existingBackups.filter((backup: BackupRecord) => backup.id !== id);
            localStorage.setItem(STORAGE_KEYS.BACKUP_LIST, JSON.stringify(updatedBackups));
        } catch (error) {
            console.error('خطأ في حذف سجل النسخة الاحتياطية:', error);
        }
    };

    // إدارة وضع عدم الاتصال
    const updateOfflineSettings = (updates: Partial<OfflineSettings>) => {
        setSettings(prev => ({
            ...prev,
            offline: { ...prev.offline, ...updates }
        }));
    };

    // إدارة الواجهة
    const updateUISettings = (updates: Partial<UISettings>) => {
        setSettings(prev => ({
            ...prev,
            ui: { ...prev.ui, ...updates }
        }));
    };

    // تصدير/استيراد الإعدادات
    const exportSettings = (): string => {
        const exportData = {
            ...settings,
            exportDate: new Date(),
            version: settings.system.version
        };
        return JSON.stringify(exportData, null, 2);
    };

    const importSettings = (settingsJson: string): boolean => {
        try {
            const importedSettings = JSON.parse(settingsJson);
            
            // التحقق من صحة البيانات
            if (!importedSettings.system || !importedSettings.system.version) {
                throw new Error('ملف الإعدادات غير صالح');
            }

            setSettings({
                ...defaultSettings,
                ...importedSettings,
                system: {
                    ...importedSettings.system,
                    lastUpdated: new Date()
                }
            });

            return true;
        } catch (error) {
            console.error('خطأ في استيراد الإعدادات:', error);
            return false;
        }
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOG);
        localStorage.removeItem(STORAGE_KEYS.BACKUP_LIST);
    };

    const contextValue: AppSettingsContextType = {
        settings,
        updateSettings,
        addConnection,
        updateConnection,
        deleteConnection,
        setActiveConnection,
        getActiveConnection,
        updateSecuritySettings,
        logSecurityEvent,
        getAuditLog,
        clearAuditLog,
        updateBackupSettings,
        addBackupRecord,
        getBackupList,
        deleteBackupRecord,
        updateOfflineSettings,
        updateUISettings,
        exportSettings,
        importSettings,
        resetSettings
    };

    return (
        <AppSettingsContext.Provider value={contextValue}>
            {children}
        </AppSettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
};

export type { AppSettings, DatabaseConnection, SecuritySettings, BackupSettings, OfflineSettings, UISettings, SecurityEvent, BackupRecord };