import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icons } from '../icons';

interface OfflineMode {
    enabled: boolean;
    syncPending: number;
    lastSync: Date | null;
}

interface OfflineIndicatorProps {
    offlineMode: OfflineMode;
    onToggleOfflineMode: () => void;
    onSync: () => void;
    onClearCache: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
    offlineMode,
    onToggleOfflineMode,
    onSync,
    onClearCache
}) => {
    const [syncConflicts, setSyncConflicts] = useState([
        {
            id: '1',
            table: 'products',
            recordId: 'prod_123',
            conflictType: 'update' as const,
            localData: { name: 'منتج محدث محلياً', price: 150 },
            serverData: { name: 'منتج محدث على الخادم', price: 160 },
            timestamp: new Date()
        },
        {
            id: '2',
            table: 'inventory_items',
            recordId: 'inv_456',
            conflictType: 'delete' as const,
            localData: null,
            serverData: { quantity: 10, location: 'المستودع أ' },
            timestamp: new Date(Date.now() - 3600000)
        }
    ]);

    const [cacheStats, setCacheStats] = useState({
        totalSize: 5.2 * 1024 * 1024, // 5.2 MB
        itemCount: 1250,
        tables: {
            products: 450,
            inventory_items: 320,
            suppliers: 180,
            clients: 200,
            transactions: 100
        }
    });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getConflictIcon = (type: string) => {
        switch (type) {
            case 'update': return <Icons.Edit className="h-4 w-4 text-yellow-500" />;
            case 'delete': return <Icons.Trash2 className="h-4 w-4 text-red-500" />;
            case 'create': return <Icons.Plus className="h-4 w-4 text-green-500" />;
            default: return <Icons.AlertTriangle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getConflictText = (type: string) => {
        switch (type) {
            case 'update': return 'تحديث متضارب';
            case 'delete': return 'حذف متضارب';
            case 'create': return 'إنشاء متضارب';
            default: return 'تضارب غير معروف';
        }
    };

    return (
        <div className="space-y-6">
            {/* حالة وضع عدم الاتصال */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Wifi className="h-5 w-5 ml-2" />
                        وضع العمل بدون اتصال
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`p-4 rounded-lg border ${
                        offlineMode.enabled 
                            ? 'border-orange-300 bg-orange-50' 
                            : 'border-green-300 bg-green-50'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                {offlineMode.enabled ? (
                                    <Icons.WifiOff className="h-5 w-5 text-orange-600 ml-2" />
                                ) : (
                                    <Icons.Wifi className="h-5 w-5 text-green-600 ml-2" />
                                )}
                                <span className="font-medium">
                                    {offlineMode.enabled ? 'وضع عدم الاتصال مُفعل' : 'متصل بالإنترنت'}
                                </span>
                            </div>
                            <Button
                                onClick={onToggleOfflineMode}
                                variant={offlineMode.enabled ? "secondary" : "primary"}
                            >
                                {offlineMode.enabled ? 'تعطيل الوضع' : 'تفعيل الوضع'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="font-medium">البيانات المعلقة:</span>
                                <span className="mr-2">{offlineMode.syncPending} عنصر</span>
                            </div>
                            <div>
                                <span className="font-medium">آخر مزامنة:</span>
                                <span className="mr-2">
                                    {offlineMode.lastSync 
                                        ? offlineMode.lastSync.toLocaleString('ar-SA')
                                        : 'لم تتم بعد'
                                    }
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">حجم التخزين المؤقت:</span>
                                <span className="mr-2">{formatFileSize(cacheStats.totalSize)}</span>
                            </div>
                        </div>
                    </div>

                    {offlineMode.enabled && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-start">
                                <Icons.Info className="h-5 w-5 text-blue-400 ml-2 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">وضع عدم الاتصال نشط</p>
                                    <p>جميع التغييرات يتم حفظها محلياً وستتم مزامنتها عند إعادة الاتصال.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* إحصائيات التخزين المؤقت */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.HardDrive className="h-5 w-5 ml-2" />
                        إحصائيات التخزين المؤقت
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                    {cacheStats.itemCount.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600">إجمالي العناصر المخزنة</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatFileSize(cacheStats.totalSize)}
                                </div>
                                <div className="text-sm text-gray-600">حجم التخزين المؤقت</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium">توزيع البيانات حسب الجدول:</h4>
                            {Object.entries(cacheStats.tables).map(([table, count]) => (
                                <div key={table} className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm">{table}</span>
                                    <span className="text-sm font-medium">{count} عنصر</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end space-x-3 space-x-reverse">
                            <Button variant="secondary" onClick={onClearCache}>
                                <Icons.Trash2 className="h-4 w-4 ml-2" />
                                مسح التخزين المؤقت
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* المزامنة وحل التضارب */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center">
                            <Icons.RefreshCw className="h-5 w-5 ml-2" />
                            المزامنة وحل التضارب
                        </CardTitle>
                        <Button onClick={onSync} disabled={offlineMode.syncPending === 0}>
                            <Icons.RefreshCw className="h-4 w-4 ml-2" />
                            مزامنة الآن
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {syncConflicts.length > 0 ? (
                        <div className="space-y-3">
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div className="flex items-center">
                                    <Icons.AlertTriangle className="h-5 w-5 text-yellow-400 ml-2" />
                                    <span className="font-medium text-yellow-800">
                                        يوجد {syncConflicts.length} تضارب يحتاج حل
                                    </span>
                                </div>
                            </div>

                            {syncConflicts.map((conflict) => (
                                <div key={conflict.id} className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                            {getConflictIcon(conflict.conflictType)}
                                            <div className="mr-2">
                                                <span className="font-medium">{getConflictText(conflict.conflictType)}</span>
                                                <div className="text-sm text-gray-600">
                                                    {conflict.table} - {conflict.recordId}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {conflict.timestamp.toLocaleString('ar-SA')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                            <h4 className="font-medium text-blue-800 mb-2">البيانات المحلية</h4>
                                            <pre className="text-xs text-blue-700">
                                                {JSON.stringify(conflict.localData, null, 2)}
                                            </pre>
                                        </div>
                                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                                            <h4 className="font-medium text-green-800 mb-2">بيانات الخادم</h4>
                                            <pre className="text-xs text-green-700">
                                                {JSON.stringify(conflict.serverData, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 space-x-reverse mt-4">
                                        <Button size="sm" variant="secondary">
                                            استخدام المحلي
                                        </Button>
                                        <Button size="sm" variant="secondary">
                                            استخدام الخادم
                                        </Button>
                                        <Button size="sm">
                                            دمج يدوي
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Icons.CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                            <p>لا توجد تضاربات في المزامنة</p>
                            <p className="text-sm">جميع البيانات متزامنة بنجاح</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OfflineIndicator;