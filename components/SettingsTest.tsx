import React from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';

const SettingsTest: React.FC = () => {
    const { settings, updateUISettings, updateSecuritySettings } = useAppSettings();

    const testUISettings = () => {
        updateUISettings({ 
            theme: settings.ui.theme === 'light' ? 'dark' : 'light',
            autoRefreshInterval: Math.floor(Math.random() * 60) + 10
        });
        console.log('تم تحديث إعدادات الواجهة');
    };

    const testSecuritySettings = () => {
        updateSecuritySettings({
            sessionTimeout: Math.floor(Math.random() * 60) + 15,
            encryptionEnabled: !settings.security.encryptionEnabled
        });
        console.log('تم تحديث إعدادات الأمان');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>اختبار الإعدادات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">الإعدادات الحالية:</h3>
                    <div className="text-sm space-y-1">
                        <div>المظهر: {settings.ui.theme}</div>
                        <div>فترة التحديث: {settings.ui.autoRefreshInterval} ثانية</div>
                        <div>التشفير: {settings.security.encryptionEnabled ? 'مُفعل' : 'معطل'}</div>
                        <div>مهلة الجلسة: {settings.security.sessionTimeout} دقيقة</div>
                        <div>عدد الاتصالات: {settings.connections.length}</div>
                    </div>
                </div>

                <div className="flex space-x-3 space-x-reverse">
                    <Button onClick={testUISettings}>
                        اختبار إعدادات الواجهة
                    </Button>
                    <Button onClick={testSecuritySettings} variant="secondary">
                        اختبار إعدادات الأمان
                    </Button>
                </div>

                <div className="text-xs text-gray-500">
                    افتح Developer Tools (F12) لرؤية رسائل التحديث
                </div>
            </CardContent>
        </Card>
    );
};

export default SettingsTest;