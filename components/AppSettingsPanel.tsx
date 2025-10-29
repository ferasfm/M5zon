import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useNotification } from '../contexts/NotificationContext';

const AppSettingsPanel: React.FC = () => {
    const {
        settings,
        updateUISettings,
        exportSettings,
        importSettings,
        resetSettings
    } = useAppSettings();
    
    const notification = useNotification();
    const [importFile, setImportFile] = useState<File | null>(null);

    const handleExportSettings = () => {
        try {
            const settingsData = exportSettings();
            const blob = new Blob([settingsData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-app-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            notification?.addNotification('تم تصدير إعدادات التطبيق بنجاح', 'success');
        } catch (error) {
            notification?.addNotification('فشل في تصدير الإعدادات', 'error');
        }
    };

    const handleImportSettings = async () => {
        if (!importFile) return;

        try {
            const fileContent = await importFile.text();
            const success = importSettings(fileContent);
            
            if (success) {
                notification?.addNotification('تم استيراد إعدادات التطبيق بنجاح', 'success');
                setImportFile(null);
                // إعادة تحميل الصفحة لتطبيق الإعدادات الجديدة
                setTimeout(() => window.location.reload(), 1000);
            } else {
                notification?.addNotification('فشل في استيراد الإعدادات - ملف غير صالح', 'error');
            }
        } catch (error) {
            notification?.addNotification('فشل في قراءة ملف الإعدادات', 'error');
        }
    };

    const handleResetSettings = () => {
        if (confirm('هل أنت متأكد من إعادة تعيين جميع إعدادات التطبيق؟ سيتم فقدان جميع الإعدادات المخصصة.')) {
            resetSettings();
            notification?.addNotification('تم إعادة تعيين إعدادات التطبيق', 'info');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Settings className="h-5 w-5 ml-2" />
                        إعدادات التطبيق
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* إعدادات الواجهة */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <h3 className="font-medium mb-4">إعدادات الواجهة</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">المظهر</label>
                                <select
                                    value={settings.ui.theme}
                                    onChange={(e) => updateUISettings({ theme: e.target.value as any })}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="light">فاتح</option>
                                    <option value="dark">داكن</option>
                                    <option value="auto">تلقائي</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">اللغة</label>
                                <select
                                    value={settings.ui.language}
                                    onChange={(e) => updateUISettings({ language: e.target.value as any })}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="ar">العربية</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    فترة التحديث التلقائي (ثانية)
                                </label>
                                <input
                                    type="number"
                                    min="10"
                                    max="300"
                                    value={settings.ui.autoRefreshInterval}
                                    onChange={(e) => updateUISettings({ autoRefreshInterval: parseInt(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-medium">عرض الخيارات المتقدمة</span>
                                    <p className="text-sm text-gray-600">
                                        إظهار إعدادات إضافية للمستخدمين المتقدمين
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.ui.showAdvancedOptions}
                                        onChange={(e) => updateUISettings({ showAdvancedOptions: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* معلومات النظام */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="font-medium mb-3">معلومات النظام</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>إصدار التطبيق:</span>
                                <span className="font-medium">{settings.system.version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>تاريخ التثبيت:</span>
                                <span className="font-medium">
                                    {settings.system.installDate.toLocaleDateString('ar-SA')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>آخر تحديث:</span>
                                <span className="font-medium">
                                    {settings.system.lastUpdated.toLocaleString('ar-SA')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>عدد الاتصالات المحفوظة:</span>
                                <span className="font-medium">{settings.connections.length}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* إدارة الإعدادات */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Download className="h-5 w-5 ml-2" />
                        إدارة الإعدادات
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* تصدير الإعدادات */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-medium mb-2">تصدير الإعدادات</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                حفظ جميع إعدادات التطبيق في ملف
                            </p>
                            <Button onClick={handleExportSettings} className="w-full">
                                <Icons.Download className="h-4 w-4 ml-2" />
                                تصدير
                            </Button>
                        </div>

                        {/* استيراد الإعدادات */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-medium mb-2">استيراد الإعدادات</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                استعادة الإعدادات من ملف محفوظ
                            </p>
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs"
                                />
                                <Button 
                                    onClick={handleImportSettings} 
                                    disabled={!importFile}
                                    className="w-full"
                                    variant="secondary"
                                >
                                    <Icons.Upload className="h-4 w-4 ml-2" />
                                    استيراد
                                </Button>
                            </div>
                        </div>

                        {/* إعادة تعيين الإعدادات */}
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="font-medium mb-2">إعادة تعيين</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                إعادة جميع الإعدادات للقيم الافتراضية
                            </p>
                            <Button 
                                onClick={handleResetSettings}
                                variant="danger"
                                className="w-full"
                            >
                                <Icons.RefreshCw className="h-4 w-4 ml-2" />
                                إعادة تعيين
                            </Button>
                        </div>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start">
                            <Icons.Info className="h-5 w-5 text-yellow-400 ml-2 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium">ملاحظة مهمة</p>
                                <p>
                                    إعدادات التطبيق (الاتصالات، الأمان، النسخ الاحتياطي) يتم حفظها محلياً في المتصفح.
                                    بينما بيانات المخزون (المنتجات، الموردين، العملاء) يتم حفظها في قاعدة البيانات.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AppSettingsPanel;