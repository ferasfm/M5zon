import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icons } from '../icons';

interface SecuritySettings {
    encryptionEnabled: boolean;
    sessionTimeout: number;
    autoLogout: boolean;
    auditLogEnabled: boolean;
}

interface SecuritySettingsPanelProps {
    settings: SecuritySettings;
    onUpdateSettings: (settings: Partial<SecuritySettings>) => void;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
    settings,
    onUpdateSettings
}) => {
    const [auditLogs, setAuditLogs] = useState([
        {
            id: '1',
            timestamp: new Date(),
            action: 'connect',
            connectionName: 'قاعدة البيانات الرئيسية',
            success: true,
            ipAddress: '192.168.1.100'
        },
        {
            id: '2',
            timestamp: new Date(Date.now() - 3600000),
            action: 'backup',
            connectionName: 'قاعدة البيانات الرئيسية',
            success: true,
            ipAddress: '192.168.1.100'
        },
        {
            id: '3',
            timestamp: new Date(Date.now() - 7200000),
            action: 'test',
            connectionName: 'قاعدة البيانات الرئيسية',
            success: false,
            ipAddress: '192.168.1.100',
            errorMessage: 'انتهت مهلة الاتصال'
        }
    ]);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'connect': return <Icons.Link className="h-4 w-4 text-green-500" />;
            case 'disconnect': return <Icons.Unlink className="h-4 w-4 text-red-500" />;
            case 'backup': return <Icons.HardDrive className="h-4 w-4 text-blue-500" />;
            case 'restore': return <Icons.RefreshCw className="h-4 w-4 text-orange-500" />;
            case 'test': return <Icons.Zap className="h-4 w-4 text-purple-500" />;
            default: return <Icons.Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActionText = (action: string) => {
        switch (action) {
            case 'connect': return 'اتصال';
            case 'disconnect': return 'قطع اتصال';
            case 'backup': return 'نسخ احتياطي';
            case 'restore': return 'استعادة';
            case 'test': return 'اختبار اتصال';
            default: return action;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Shield className="h-5 w-5 ml-2" />
                        إعدادات الأمان
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* تشفير البيانات */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-medium">تشفير البيانات</h3>
                                <p className="text-sm text-gray-600">
                                    تشفير معلومات الاتصال والبيانات الحساسة محلياً
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.encryptionEnabled}
                                    onChange={(e) => onUpdateSettings({ encryptionEnabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        {settings.encryptionEnabled && (
                            <div className="text-sm text-green-600 flex items-center">
                                <Icons.CheckCircle className="h-4 w-4 ml-2" />
                                التشفير مُفعل - البيانات محمية
                            </div>
                        )}
                    </div>

                    {/* إدارة الجلسات */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <h3 className="font-medium mb-3">إدارة الجلسات</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    مهلة انتهاء الجلسة (بالدقائق)
                                </label>
                                <select
                                    value={settings.sessionTimeout}
                                    onChange={(e) => onUpdateSettings({ sessionTimeout: parseInt(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value={15}>15 دقيقة</option>
                                    <option value={30}>30 دقيقة</option>
                                    <option value={60}>60 دقيقة</option>
                                    <option value={120}>120 دقيقة</option>
                                    <option value={0}>بدون انتهاء</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-medium">تسجيل خروج تلقائي</span>
                                    <p className="text-sm text-gray-600">
                                        تسجيل خروج تلقائي عند انتهاء مهلة الجلسة
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoLogout}
                                        onChange={(e) => onUpdateSettings({ autoLogout: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* تسجيل الأنشطة */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-medium">تسجيل الأنشطة الأمنية</h3>
                                <p className="text-sm text-gray-600">
                                    تسجيل جميع عمليات الاتصال والأنشطة الأمنية
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.auditLogEnabled}
                                    onChange={(e) => onUpdateSettings({ auditLogEnabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* سجل الأنشطة الأمنية */}
            {settings.auditLogEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Icons.FileText className="h-5 w-5 ml-2" />
                            سجل الأنشطة الأمنية
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className={`p-3 border rounded-lg ${
                                        log.success 
                                            ? 'border-green-200 bg-green-50' 
                                            : 'border-red-200 bg-red-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 space-x-reverse">
                                            {getActionIcon(log.action)}
                                            <div>
                                                <div className="flex items-center space-x-2 space-x-reverse">
                                                    <span className="font-medium">
                                                        {getActionText(log.action)}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        - {log.connectionName}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {log.timestamp.toLocaleString('ar-SA')} - {log.ipAddress}
                                                </div>
                                                {!log.success && log.errorMessage && (
                                                    <div className="text-xs text-red-600 mt-1">
                                                        خطأ: {log.errorMessage}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs ${
                                            log.success 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {log.success ? 'نجح' : 'فشل'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-600">
                                عرض آخر {auditLogs.length} أنشطة
                            </span>
                            <div className="space-x-2 space-x-reverse">
                                <Button size="sm" variant="secondary">
                                    تصدير السجل
                                </Button>
                                <Button size="sm" variant="secondary">
                                    مسح السجل
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SecuritySettingsPanel;