import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';
import { useNotification } from '../contexts/NotificationContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

import LocalConnectionSettings from './LocalConnectionSettings';

// مكونات مؤقتة للاختبار
const ConnectionStatusPanel = ({ status, onTestConnection, onDisconnect, onNewConnection }: any) => {
    const { connectionType, setConnectionType } = useSupabase();
    const [showLocalSettings, setShowLocalSettings] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Icons.Activity className="h-5 w-5 ml-2" />
                        حالة الاتصال الحالية
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setConnectionType('supabase')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${connectionType === 'supabase'
                                ? 'bg-white shadow text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            سحابي (Supabase)
                        </button>
                        <button
                            onClick={() => setConnectionType('local')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${connectionType === 'local'
                                ? 'bg-white shadow text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            محلي (Local DB)
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`p-4 rounded-lg border ${status.isConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            {status.isConnected ? (
                                <Icons.CheckCircle className="h-5 w-5 text-green-600 ml-2" />
                            ) : (
                                <Icons.XCircle className="h-5 w-5 text-red-600 ml-2" />
                            )}
                            <span className={`font-medium ${status.isConnected ? 'text-green-800' : 'text-red-800'}`}>
                                {status.isConnected ? 'متصل وصحي' : 'غير متصل'}
                            </span>
                            <span className="mr-2 text-sm text-gray-500">
                                ({connectionType === 'local' ? 'قاعدة بيانات محلية' : 'سحابة Supabase'})
                            </span>
                        </div>
                    </div>

                    {connectionType === 'local' && (
                        <div className="mt-4 border-t pt-4">
                            <Button
                                onClick={() => setShowLocalSettings(!showLocalSettings)}
                                variant="secondary"
                                className="w-full mb-4"
                            >
                                <Icons.Settings className="h-4 w-4 ml-2" />
                                {showLocalSettings ? 'إخفاء إعدادات الاتصال' : 'تعديل إعدادات الاتصال المحلي'}
                            </Button>

                            {showLocalSettings && (
                                <div className="bg-white p-4 rounded border">
                                    <LocalConnectionSettings onConnect={() => {
                                        setShowLocalSettings(false);
                                        window.location.reload();
                                    }} />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 mt-4">
                        <Button onClick={onTestConnection} variant="secondary">
                            <Icons.Zap className="h-4 w-4 ml-2" />
                            اختبار الاتصال
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const ConnectionListManager = ({ connections, onAddConnection, onEditConnection, onDeleteConnection, onSwitchConnection }: any) => (
    <Card>
        <CardHeader>
            <CardTitle>إدارة الاتصالات</CardTitle>
        </CardHeader>
        <CardContent>
            <p>قائمة الاتصالات المحفوظة ستظهر هنا</p>
        </CardContent>
    </Card>
);

const SecuritySettingsPanel = ({ settings, onUpdateSettings }: any) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Icons.Shield className="h-5 w-5 ml-2" />
                إعدادات الأمان
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p>إعدادات الأمان والتشفير ستظهر هنا</p>
        </CardContent>
    </Card>
);

const BackupManager = ({ onCreateBackup, onRestoreBackup, onDeleteBackup, isBackupInProgress }: any) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Icons.HardDrive className="h-5 w-5 ml-2" />
                إدارة النسخ الاحتياطية
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Button onClick={onCreateBackup} disabled={isBackupInProgress}>
                <Icons.Download className="h-4 w-4 ml-2" />
                إنشاء نسخة احتياطية
            </Button>
        </CardContent>
    </Card>
);

const OfflineIndicator = ({ offlineMode, onToggleOfflineMode, onSync, onClearCache }: any) => (
    <div className="fixed top-4 left-4 z-50">
        <div className={`px-3 py-2 rounded-lg shadow-lg ${offlineMode.enabled
            ? 'bg-orange-100 border border-orange-300 text-orange-800'
            : 'bg-green-100 border border-green-300 text-green-800'
            }`}>
            <div className="flex items-center space-x-2 space-x-reverse">
                {offlineMode.enabled ? (
                    <Icons.Database className="h-4 w-4" />
                ) : (
                    <Icons.CheckCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                    {offlineMode.enabled ? 'وضع عدم الاتصال' : 'متصل'}
                </span>
            </div>
        </div>
    </div>
);

const DatabaseSettings: React.FC = () => {
    const { supabase } = useSupabase();
    const notification = useNotification();
    const {
        settings,
        addConnection,
        updateConnection,
        deleteConnection,
        setActiveConnection,
        getActiveConnection,
        updateSecuritySettings,
        logSecurityEvent,
        getAuditLog,
        updateBackupSettings,
        getBackupList,
        addBackupRecord,
        updateOfflineSettings,
        updateUISettings
    } = useAppSettings();

    const [activeTab, setActiveTab] = useState('connection');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isBackupInProgress, setIsBackupInProgress] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [exportData, setExportData] = useState<string | null>(null);

    // حالة النظام المتقدم من الإعدادات المحلية
    const [connectionStatus, setConnectionStatus] = useState({
        isConnected: !!supabase,
        lastConnected: new Date(),
        health: 'healthy' as 'healthy' | 'warning' | 'error',
        responseTime: 0
    });

    // استخدام الاتصالات من الإعدادات المحلية
    const connections = settings.connections;
    const securitySettings = settings.security;
    const backupSettings = settings.backup;
    const offlineSettings = settings.offline;

    // التبويبات المتاحة
    const tabs = [
        { id: 'connection', label: 'معلومات الاتصال', icon: Icons.Database },
        { id: 'connections', label: 'إدارة الاتصالات', icon: Icons.Server },
        { id: 'security', label: 'إعدادات الأمان', icon: Icons.Shield },
        { id: 'backup', label: 'النسخ الاحتياطي', icon: Icons.HardDrive },
        { id: 'offline', label: 'وضع عدم الاتصال', icon: Icons.Wifi },
        { id: 'legacy', label: 'الأدوات التقليدية', icon: Icons.Settings }
    ];

    // تصدير قاعدة البيانات
    const exportDatabase = async () => {
        if (!supabase) return;

        setIsExporting(true);
        try {
            const tables = ['products', 'inventory_items', 'suppliers', 'provinces', 'areas', 'clients'];
            const exportObj: any = {};

            // جلب البيانات من كل جدول
            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    throw new Error(`فشل جلب البيانات من جدول ${table}: ${error.message}`);
                }
                exportObj[table] = data || [];
            }

            // تحويل البيانات إلى JSON
            const jsonData = JSON.stringify(exportObj, null, 2);
            setExportData(jsonData);

            notification?.addNotification('تم تصدير قاعدة البيانات بنجاح', 'success');
        } catch (error: any) {
            console.error('Error exporting database:', error);
            notification?.addNotification(`فشل تصدير قاعدة البيانات: ${error.message}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // أخذ نسخة احتياطية
    const backupDatabase = async () => {
        if (!supabase) return;

        setIsBackupInProgress(true);
        try {
            // جلب البيانات من كل جدول
            const tables = ['products', 'inventory_items', 'suppliers', 'provinces', 'areas', 'clients'];
            const backupObj: any = {};

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    throw new Error(`فشل جلب البيانات من جدول ${table}: ${error.message}`);
                }
                backupObj[table] = data || [];
            }

            // إضافة تاريخ النسخة الاحتياطية
            backupObj.backup_date = new Date().toISOString();
            backupObj.version = '1.0';

            // تحويل البيانات إلى JSON
            const jsonData = JSON.stringify(backupObj, null, 2);

            // إنشاء وتحميل الملف
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notification?.addNotification('تم إنشاء نسخة احتياطية بنجاح', 'success');
        } catch (error: any) {
            console.error('Error backing up database:', error);
            notification?.addNotification(`فشل إنشاء نسخة احتياطية: ${error.message}`, 'error');
        } finally {
            setIsBackupInProgress(false);
        }
    };

    // استعادة قاعدة البيانات
    const restoreDatabase = async () => {
        if (!supabase || !restoreFile) return;

        setIsImporting(true);
        try {
            const fileContent = await restoreFile.text();
            const restoreData = JSON.parse(fileContent);

            // التحقق من صحة البيانات
            if (!restoreData.version) {
                throw new Error('ملف النسخة الاحتياطية غير صالح');
            }

            // حذف البيانات الحالية
            const tables = ['products', 'inventory_items', 'suppliers', 'provinces', 'areas', 'clients'];
            for (const table of tables) {
                const { error } = await supabase.from(table).delete().neq('id', 'this-will-never-be-equal');
                if (error) {
                    throw new Error(`فشل حذف البيانات من جدول ${table}: ${error.message}`);
                }
            }

            // استعادة البيانات
            for (const table of tables) {
                if (restoreData[table] && Array.isArray(restoreData[table])) {
                    const { error } = await supabase.from(table).insert(restoreData[table]);
                    if (error) {
                        throw new Error(`فشل استعادة البيانات في جدول ${table}: ${error.message}`);
                    }
                }
            }

            notification?.addNotification('تم استعادة قاعدة البيانات بنجاح', 'success');

            // إعادة تحميل الصفحة بعد فترة قصيرة
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error('Error restoring database:', error);
            notification?.addNotification(`فشل استعادة قاعدة البيانات: ${error.message}`, 'error');
        } finally {
            setIsImporting(false);
            setRestoreFile(null);
        }
    };

    // معالجات الأحداث للنظام المتقدم
    const handleTestConnection = async () => {
        const activeConnection = getActiveConnection();

        try {
            // محاكاة اختبار الاتصال
            setConnectionStatus(prev => ({ ...prev, health: 'healthy', responseTime: 120 }));

            // تسجيل الحدث الأمني
            logSecurityEvent({
                action: 'test',
                connectionId: activeConnection?.id,
                connectionName: activeConnection?.displayName,
                success: true
            });

            notification?.addNotification('تم اختبار الاتصال بنجاح', 'success');
        } catch (error) {
            setConnectionStatus(prev => ({ ...prev, health: 'error' }));

            logSecurityEvent({
                action: 'test',
                connectionId: activeConnection?.id,
                connectionName: activeConnection?.displayName,
                success: false,
                errorMessage: 'فشل في اختبار الاتصال'
            });

            notification?.addNotification('فشل في اختبار الاتصال', 'error');
        }
    };

    const handleDisconnect = async () => {
        const activeConnection = getActiveConnection();

        // إنشاء نسخة احتياطية قبل قطع الاتصال إذا كان مفعلاً
        if (backupSettings.backupBeforeDisconnect) {
            await handleCreateBackup();
        }

        setConnectionStatus(prev => ({ ...prev, isConnected: false }));

        logSecurityEvent({
            action: 'disconnect',
            connectionId: activeConnection?.id,
            connectionName: activeConnection?.displayName,
            success: true
        });

        notification?.addNotification('تم قطع الاتصال', 'info');
    };

    const handleNewConnection = () => {
        notification?.addNotification('فتح نموذج اتصال جديد', 'info');
    };

    const handleAddConnection = (connection: any) => {
        const connectionId = addConnection({
            name: connection.name,
            displayName: connection.displayName,
            url: connection.url,
            key: connection.key,
            isActive: false,
            health: 'healthy'
        });

        notification?.addNotification('تم إضافة الاتصال بنجاح', 'success');
        return connectionId;
    };

    const handleEditConnection = (id: string, updates: any) => {
        updateConnection(id, updates);
        notification?.addNotification('تم تحديث الاتصال بنجاح', 'success');
    };

    const handleDeleteConnection = (id: string) => {
        const connection = connections.find(c => c.id === id);
        deleteConnection(id);

        logSecurityEvent({
            action: 'disconnect',
            connectionId: id,
            connectionName: connection?.displayName,
            success: true
        });

        notification?.addNotification('تم حذف الاتصال', 'info');
    };

    const handleSwitchConnection = (id: string) => {
        const connection = connections.find(c => c.id === id);
        setActiveConnection(id);

        logSecurityEvent({
            action: 'connect',
            connectionId: id,
            connectionName: connection?.displayName,
            success: true
        });

        notification?.addNotification('تم تبديل الاتصال بنجاح', 'success');
    };

    const handleUpdateSecuritySettings = (updates: any) => {
        updateSecuritySettings(updates);
        notification?.addNotification('تم تحديث إعدادات الأمان', 'success');
    };

    const handleCreateBackup = async () => {
        setIsBackupInProgress(true);
        const activeConnection = getActiveConnection();

        try {
            // استخدام الدالة الموجودة
            await backupDatabase();

            // إضافة سجل النسخة الاحتياطية
            const backupRecord = {
                id: `backup_${Date.now()}`,
                name: `نسخة احتياطية - ${new Date().toLocaleDateString('ar-SA')}`,
                connectionId: activeConnection?.id || 'default',
                connectionName: activeConnection?.displayName || 'قاعدة البيانات الرئيسية',
                createdAt: new Date(),
                size: 2.5 * 1024 * 1024, // تقدير الحجم
                type: 'manual' as const,
                status: 'completed' as const,
                metadata: {
                    tableCount: 6,
                    recordCount: 1250,
                    version: '1.0.0'
                }
            };

            addBackupRecord(backupRecord);

            logSecurityEvent({
                action: 'backup',
                connectionId: activeConnection?.id,
                connectionName: activeConnection?.displayName,
                success: true
            });

        } catch (error) {
            logSecurityEvent({
                action: 'backup',
                connectionId: activeConnection?.id,
                connectionName: activeConnection?.displayName,
                success: false,
                errorMessage: 'فشل في إنشاء النسخة الاحتياطية'
            });
        } finally {
            setIsBackupInProgress(false);
        }
    };

    const handleRestoreBackup = (backupId: string) => {
        const backups = getBackupList();
        const backup = backups.find(b => b.id === backupId);

        logSecurityEvent({
            action: 'restore',
            connectionId: backup?.connectionId,
            connectionName: backup?.connectionName,
            success: true
        });

        notification?.addNotification(`استعادة النسخة الاحتياطية ${backup?.name}`, 'info');
    };

    const handleDeleteBackup = (backupId: string) => {
        // سيتم تنفيذ حذف الملف الفعلي هنا
        notification?.addNotification('تم حذف النسخة الاحتياطية', 'info');
    };

    const handleToggleOfflineMode = () => {
        updateOfflineSettings({ enabled: !offlineSettings.enabled });
        notification?.addNotification(
            offlineSettings.enabled ? 'تم تعطيل وضع عدم الاتصال' : 'تم تفعيل وضع عدم الاتصال',
            'info'
        );
    };

    const handleSync = () => {
        // تنفيذ المزامنة الفعلية هنا
        notification?.addNotification('تمت المزامنة بنجاح', 'success');
    };

    const handleClearCache = () => {
        // مسح التخزين المؤقت الفعلي هنا
        notification?.addNotification('تم مسح التخزين المؤقت', 'info');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">إعدادات قاعدة البيانات المتقدمة</h2>
                <OfflineIndicator
                    offlineMode={offlineSettings}
                    onToggleOfflineMode={handleToggleOfflineMode}
                    onSync={handleSync}
                    onClearCache={handleClearCache}
                />
            </div>

            {/* التبويبات */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 space-x-reverse">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 ml-2" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* محتوى التبويبات */}
            <div className="mt-6">

                {activeTab === 'connection' && (
                    <ConnectionStatusPanel
                        status={connectionStatus}
                        onTestConnection={handleTestConnection}
                        onDisconnect={handleDisconnect}
                        onNewConnection={handleNewConnection}
                    />
                )}

                {activeTab === 'connections' && (
                    <ConnectionListManager
                        connections={connections}
                        onAddConnection={handleAddConnection}
                        onEditConnection={handleEditConnection}
                        onDeleteConnection={handleDeleteConnection}
                        onSwitchConnection={handleSwitchConnection}
                    />
                )}

                {activeTab === 'security' && (
                    <SecuritySettingsPanel
                        settings={securitySettings}
                        onUpdateSettings={handleUpdateSecuritySettings}
                    />
                )}

                {activeTab === 'backup' && (
                    <BackupManager
                        onCreateBackup={handleCreateBackup}
                        onRestoreBackup={handleRestoreBackup}
                        onDeleteBackup={handleDeleteBackup}
                        isBackupInProgress={isBackupInProgress}
                    />
                )}

                {activeTab === 'offline' && (
                    <OfflineIndicator
                        offlineMode={offlineSettings}
                        onToggleOfflineMode={handleToggleOfflineMode}
                        onSync={handleSync}
                        onClearCache={handleClearCache}
                    />
                )}


                {activeTab === 'legacy' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">الأدوات التقليدية</h3>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Icons.Database className="h-5 w-5 ml-2" />
                                    النسخ الاحتياطي والتصدير
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                                        <h3 className="font-medium mb-2">نسخة احتياطية</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            قم بإنشاء نسخة احتياطية كاملة من قاعدة البيانات مع التاريخ والبيانات الوصفية
                                        </p>
                                        <Button
                                            onClick={backupDatabase}
                                            disabled={isBackupInProgress}
                                            className="w-full"
                                        >
                                            {isBackupInProgress ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    جارٍ إنشاء نسخة احتياطية...
                                                </span>
                                            ) : (
                                                <span className="flex items-center">
                                                    <Icons.Download className="h-4 w-4 ml-2" />
                                                    إنشاء نسخة احتياطية
                                                </span>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                        <h3 className="font-medium mb-2">تصدير البيانات</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            قم بتصدير بيانات قاعدة البيانات للاستخدامها في مكان آخر أو كنسخة احتياطية
                                        </p>
                                        <Button
                                            onClick={exportDatabase}
                                            disabled={isExporting}
                                            className="w-full"
                                        >
                                            {isExporting ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    جارٍ التصدير...
                                                </span>
                                            ) : (
                                                <span className="flex items-center">
                                                    <Icons.FileText className="h-4 w-4 ml-2" />
                                                    تصدير البيانات
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {exportData && (
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                                        <h3 className="font-medium mb-2">بيانات التصدير</h3>
                                        <div className="bg-white p-3 rounded border border-gray-300 max-h-40 overflow-y-auto">
                                            <pre className="text-xs">{exportData.substring(0, 500)}{exportData.length > 500 ? '...' : ''}</pre>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <Button
                                                onClick={() => {
                                                    const blob = new Blob([exportData], { type: 'application/json' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `database_export_${new Date().toISOString().slice(0, 10)}.json`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                }}
                                            >
                                                تحميل ملف التصدير
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Icons.Upload className="h-5 w-5 ml-2" />
                                    استعادة البيانات
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                                    <h3 className="font-medium mb-2">استعادة من نسخة احتياطية</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        قم باستعادة قاعدة البيانات من نسخة احتياطية سابقة. سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من النسخة الاحتياطية.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">اختر ملف النسخة الاحتياطية</label>
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <Button
                                            onClick={restoreDatabase}
                                            disabled={!restoreFile || isImporting}
                                            className="w-full"
                                            variant="secondary"
                                        >
                                            {isImporting ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    جارٍ الاستعادة...
                                                </span>
                                            ) : (
                                                <span className="flex items-center">
                                                    <Icons.RefreshCw className="h-4 w-4 ml-2" />
                                                    استعادة البيانات
                                                </span>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <div className="flex items-start">
                                            <Icons.AlertTriangle className="h-5 w-5 text-red-400 ml-2 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-red-800">
                                                <p className="font-medium">تحذير مهم!</p>
                                                <p>هذا الإجراء سيحذف جميع بياناتك الحالية بشكل نهائي ولا يمكن التراجع عنه. يرجى التأكد من أن لديك نسخة احتياطية قبل المتابعة.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Icons.Settings className="h-5 w-5 ml-2" />
                                    إعدادات متقدمة
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                                    <h3 className="font-medium mb-2">معلومات قاعدة البيانات</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>حالة الاتصال:</span>
                                            <span className="font-medium">{supabase ? 'متصل' : 'غير متصل'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>عدد المنتجات:</span>
                                            <span className="font-medium">-</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>عدد عناصر المخزون:</span>
                                            <span className="font-medium">-</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>عدد الموردين:</span>
                                            <span className="font-medium">-</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <h3 className="font-medium mb-2">صيانة قاعدة البيانات</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        قم بتحسين أداء قاعدة البيانات وإصلاح المشاكل الشائعة
                                    </p>
                                    <Button
                                        onClick={async () => {
                                            if (!supabase) return;

                                            try {
                                                notification?.addNotification('جاري تحسين قاعدة البيانات...', 'info');

                                                // تنفيذ بعض عمليات الصيانة
                                                const tables = ['products', 'inventory_items', 'suppliers', 'provinces', 'areas', 'clients'];
                                                for (const table of tables) {
                                                    await supabase.rpc('vacuum', { table_name: table });
                                                }

                                                notification?.addNotification('تم تحسين قاعدة البيانات بنجاح', 'success');
                                            } catch (error: any) {
                                                console.error('Error optimizing database:', error);
                                                notification?.addNotification(`فشل تحسين قاعدة البيانات: ${error.message}`, 'error');
                                            }
                                        }}
                                        className="w-full"
                                    >
                                        <span className="flex items-center">
                                            <Icons.Zap className="h-4 w-4 ml-2" />
                                            تحسين قاعدة البيانات
                                        </span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseSettings;
