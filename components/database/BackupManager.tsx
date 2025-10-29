import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icons } from '../icons';

interface BackupInfo {
    id: string;
    name: string;
    createdAt: Date;
    size: number;
    type: 'auto' | 'manual' | 'pre-disconnect';
    status: 'completed' | 'failed' | 'in-progress';
    tableCount: number;
    recordCount: number;
}

interface BackupManagerProps {
    onCreateBackup: () => void;
    onRestoreBackup: (backupId: string) => void;
    onDeleteBackup: (backupId: string) => void;
    isBackupInProgress: boolean;
}

const BackupManager: React.FC<BackupManagerProps> = ({
    onCreateBackup,
    onRestoreBackup,
    onDeleteBackup,
    isBackupInProgress
}) => {
    const [backups, setBackups] = useState<BackupInfo[]>([
        {
            id: '1',
            name: 'نسخة احتياطية تلقائية',
            createdAt: new Date(),
            size: 2.5 * 1024 * 1024, // 2.5 MB
            type: 'auto',
            status: 'completed',
            tableCount: 6,
            recordCount: 1250
        },
        {
            id: '2',
            name: 'نسخة احتياطية يدوية - قبل التحديث',
            createdAt: new Date(Date.now() - 86400000), // يوم واحد
            size: 2.3 * 1024 * 1024, // 2.3 MB
            type: 'manual',
            status: 'completed',
            tableCount: 6,
            recordCount: 1180
        },
        {
            id: '3',
            name: 'نسخة احتياطية قبل قطع الاتصال',
            createdAt: new Date(Date.now() - 172800000), // يومين
            size: 2.1 * 1024 * 1024, // 2.1 MB
            type: 'pre-disconnect',
            status: 'completed',
            tableCount: 6,
            recordCount: 1100
        }
    ]);

    const [backupSettings, setBackupSettings] = useState({
        autoBackupEnabled: true,
        retentionDays: 30,
        compressionEnabled: true,
        backupBeforeDisconnect: true
    });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'auto': return <Icons.Clock className="h-4 w-4 text-blue-500" />;
            case 'manual': return <Icons.User className="h-4 w-4 text-green-500" />;
            case 'pre-disconnect': return <Icons.Shield className="h-4 w-4 text-orange-500" />;
            default: return <Icons.HardDrive className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'auto': return 'تلقائية';
            case 'manual': return 'يدوية';
            case 'pre-disconnect': return 'قبل قطع الاتصال';
            default: return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'failed': return 'text-red-600 bg-red-50';
            case 'in-progress': return 'text-blue-600 bg-blue-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="space-y-6">
            {/* إعدادات النسخ الاحتياطي */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Settings className="h-5 w-5 ml-2" />
                        إعدادات النسخ الاحتياطي
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-medium">النسخ الاحتياطي التلقائي</h3>
                                    <p className="text-sm text-gray-600">
                                        إنشاء نسخة احتياطية تلقائياً بشكل دوري
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={backupSettings.autoBackupEnabled}
                                        onChange={(e) => setBackupSettings({
                                            ...backupSettings,
                                            autoBackupEnabled: e.target.checked
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-medium">نسخة احتياطية قبل قطع الاتصال</h3>
                                    <p className="text-sm text-gray-600">
                                        إنشاء نسخة احتياطية تلقائياً قبل تغيير الاتصال
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={backupSettings.backupBeforeDisconnect}
                                        onChange={(e) => setBackupSettings({
                                            ...backupSettings,
                                            backupBeforeDisconnect: e.target.checked
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                مدة الاحتفاظ بالنسخ (بالأيام)
                            </label>
                            <select
                                value={backupSettings.retentionDays}
                                onChange={(e) => setBackupSettings({
                                    ...backupSettings,
                                    retentionDays: parseInt(e.target.value)
                                })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value={7}>7 أيام</option>
                                <option value={14}>14 يوم</option>
                                <option value={30}>30 يوم</option>
                                <option value={60}>60 يوم</option>
                                <option value={90}>90 يوم</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-medium">ضغط النسخ الاحتياطية</span>
                                <p className="text-sm text-gray-600">
                                    تقليل حجم الملفات لتوفير المساحة
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={backupSettings.compressionEnabled}
                                    onChange={(e) => setBackupSettings({
                                        ...backupSettings,
                                        compressionEnabled: e.target.checked
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* إنشاء نسخة احتياطية */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Plus className="h-5 w-5 ml-2" />
                        إنشاء نسخة احتياطية جديدة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                            <h3 className="font-medium">نسخة احتياطية يدوية</h3>
                            <p className="text-sm text-gray-600">
                                إنشاء نسخة احتياطية فورية من جميع البيانات الحالية
                            </p>
                        </div>
                        <Button 
                            onClick={onCreateBackup}
                            disabled={isBackupInProgress}
                        >
                            {isBackupInProgress ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    جارٍ الإنشاء...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <Icons.Download className="h-4 w-4 ml-2" />
                                    إنشاء نسخة احتياطية
                                </span>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* قائمة النسخ الاحتياطية */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Archive className="h-5 w-5 ml-2" />
                        النسخ الاحتياطية المتاحة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {backups.map((backup) => (
                            <div
                                key={backup.id}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        {getTypeIcon(backup.type)}
                                        <div>
                                            <h3 className="font-medium">{backup.name}</h3>
                                            <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                                                <span>{backup.createdAt.toLocaleString('ar-SA')}</span>
                                                <span>{formatFileSize(backup.size)}</span>
                                                <span>{backup.tableCount} جداول</span>
                                                <span>{backup.recordCount.toLocaleString()} سجل</span>
                                            </div>
                                            <div className="flex items-center space-x-2 space-x-reverse mt-1">
                                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(backup.status)}`}>
                                                    {backup.status === 'completed' ? 'مكتملة' : 
                                                     backup.status === 'failed' ? 'فشلت' : 'جارية'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {getTypeText(backup.type)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <Button
                                            size="sm"
                                            onClick={() => onRestoreBackup(backup.id)}
                                            disabled={backup.status !== 'completed'}
                                        >
                                            <Icons.RefreshCw className="h-4 w-4 ml-2" />
                                            استعادة
                                        </Button>
                                        
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                        >
                                            <Icons.Download className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => {
                                                if (confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟')) {
                                                    onDeleteBackup(backup.id);
                                                }
                                            }}
                                        >
                                            <Icons.Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {backups.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Icons.Archive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>لا توجد نسخ احتياطية</p>
                                <p className="text-sm">انقر على "إنشاء نسخة احتياطية" لإنشاء أول نسخة احتياطية</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BackupManager;