import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icons } from '../icons';

interface ConnectionStatus {
    isConnected: boolean;
    lastConnected: Date;
    health: 'healthy' | 'warning' | 'error';
    responseTime: number;
}

interface ConnectionStatusPanelProps {
    status: ConnectionStatus;
    onTestConnection: () => void;
    onDisconnect: () => void;
    onNewConnection: () => void;
}

const ConnectionStatusPanel: React.FC<ConnectionStatusPanelProps> = ({
    status,
    onTestConnection,
    onDisconnect,
    onNewConnection
}) => {
    const getStatusColor = (health: string) => {
        switch (health) {
            case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
            case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'error': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (health: string) => {
        switch (health) {
            case 'healthy': return <Icons.CheckCircle className="h-5 w-5" />;
            case 'warning': return <Icons.AlertTriangle className="h-5 w-5" />;
            case 'error': return <Icons.XCircle className="h-5 w-5" />;
            default: return <Icons.Circle className="h-5 w-5" />;
        }
    };

    const getStatusText = (health: string) => {
        switch (health) {
            case 'healthy': return 'متصل وصحي';
            case 'warning': return 'متصل مع تحذيرات';
            case 'error': return 'خطأ في الاتصال';
            default: return 'غير معروف';
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Icons.Activity className="h-5 w-5 ml-2" />
                        حالة الاتصال الحالية
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`p-4 rounded-lg border ${getStatusColor(status.health)}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                {getStatusIcon(status.health)}
                                <span className="mr-2 font-medium">
                                    {getStatusText(status.health)}
                                </span>
                            </div>
                            <div className="text-sm">
                                {status.responseTime > 0 && (
                                    <span>زمن الاستجابة: {status.responseTime}ms</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">حالة الاتصال:</span>
                                <span className="mr-2">
                                    {status.isConnected ? 'متصل' : 'منقطع'}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">آخر اتصال:</span>
                                <span className="mr-2">
                                    {status.lastConnected.toLocaleString('ar-SA')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                        <Button onClick={onTestConnection} variant="secondary">
                            <Icons.Zap className="h-4 w-4 ml-2" />
                            اختبار الاتصال
                        </Button>
                        
                        {status.isConnected && (
                            <Button onClick={onDisconnect} variant="secondary">
                                <Icons.Unlink className="h-4 w-4 ml-2" />
                                قطع الاتصال
                            </Button>
                        )}
                        
                        <Button onClick={onNewConnection}>
                            <Icons.Plus className="h-4 w-4 ml-2" />
                            اتصال جديد
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>معلومات قاعدة البيانات</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span>نوع قاعدة البيانات:</span>
                            <span className="font-medium">Supabase (PostgreSQL)</span>
                        </div>
                        <div className="flex justify-between">
                            <span>URL الخادم:</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                ******.supabase.co
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>حالة SSL:</span>
                            <span className="font-medium text-green-600">مُفعل</span>
                        </div>
                        <div className="flex justify-between">
                            <span>المنطقة الزمنية:</span>
                            <span className="font-medium">UTC+3 (الرياض)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ConnectionStatusPanel;