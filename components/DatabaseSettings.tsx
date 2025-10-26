import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';
import { useNotification } from '../contexts/NotificationContext';

const DatabaseSettings: React.FC = () => {
    const { supabase } = useSupabase();
    const notification = useNotification();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isBackupInProgress, setIsBackupInProgress] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [exportData, setExportData] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">إعدادات قاعدة البيانات</h2>

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
    );
};

export default DatabaseSettings;
