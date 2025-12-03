// components/ConnectionStatusDisplay.tsx - عرض حالة الاتصال مع النظام الجديد

import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { Button } from './ui/Button';

// نوع بيانات مبسط لحالة الاتصال
interface ConnectionStatus {
  isOnline: boolean;
  isCloudConnected: boolean;
  lastSyncTime: Date | null;
  pendingLocalData: number;
  connectionAttempts: number;
  mode: 'cloud' | 'offline' | 'syncing';
}

// مدير مبسط للاتصال
class SimpleOfflineManager {
  private status: ConnectionStatus = {
    isOnline: navigator.onLine,
    isCloudConnected: false,
    lastSyncTime: null,
    pendingLocalData: 0,
    connectionAttempts: 0,
    mode: 'offline'
  };

  getConnectionStatus(): ConnectionStatus {
    return { ...this.status };
  }

  async forcSync(): Promise<boolean> {
    // محاكاة المزامنة
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1000);
    });
  }

  onStatusChange(callback: (status: ConnectionStatus) => void) {
    // محاكاة تحديث الحالة
    setTimeout(() => callback(this.status), 100);
  }
}

const simpleManager = new SimpleOfflineManager();

interface ConnectionStatusDisplayProps {
  className?: string;
}

const ConnectionStatusDisplay: React.FC<ConnectionStatusDisplayProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<ConnectionStatus>(simpleManager.getConnectionStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // الاشتراك في تحديثات الحالة
    simpleManager.onStatusChange(setStatus);

    return () => {
      // تنظيف عند إلغاء المكون
    };
  }, []);

  const getStatusColor = () => {
    switch (status.mode) {
      case 'cloud': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'offline': return 'text-amber-600 bg-amber-100';
      case 'cloud': return 'متصل بالسحابة';
      case 'syncing': return 'جاري المزامنة...';
      case 'offline': return 'العمل محلياً';
      default: return 'غير محدد';
    }
  };

  const getStatusIcon = () => {
    switch (status.mode) {
      case 'cloud': return <Icons.Cloud className="h-5 w-5" />;
      case 'syncing': return <Icons.RefreshCw className="h-5 w-5 animate-spin" />;
      case 'offline': return <Icons.Database className="h-5 w-5" />;
      default: return <Icons.AlertTriangle className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    switch (status.mode) {
      case 'cloud': return 'متصل بالسحابة';
      case 'syncing': return 'جاري المزامنة...';
      case 'offline': return 'العمل محلياً';
      default: return 'غير محدد';
    }
  };

  const getStatusDescription = () => {
    switch (status.mode) {
      case 'cloud':
        return 'جميع البيانات محفوظة في قاعدة البيانات السحابية';
      case 'syncing':
        return 'جاري نقل البيانات المحلية إلى السحابة...';
      case 'offline':
        return 'البيانات محفوظة محلياً وسيتم مزامنتها عند عودة الاتصال';
      default:
        return 'حالة غير معروفة';
    }
  };

  const handleForceSync = async () => {
    const success = await simpleManager.forcSync();
    if (!success) {
      alert('فشل في المزامنة. تأكد من الاتصال بالإنترنت.');
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`}>
      {/* الحالة الرئيسية */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{getStatusText()}</h4>
            <p className="text-sm text-slate-600">{getStatusDescription()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status.mode === 'offline' && status.pendingLocalData > 0 && (
            <Button size="sm" onClick={handleForceSync} className="flex items-center gap-2">
              <Icons.RefreshCw className="h-4 w-4" />
              مزامنة ({status.pendingLocalData})
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Icons.Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* التفاصيل المتقدمة */}
      {showDetails && (
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-600">حالة الإنترنت</div>
              <div className={`font-semibold ${status.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {status.isOnline ? 'متصل' : 'منقطع'}
              </div>
            </div>

            <div>
              <div className="text-slate-600">قاعدة البيانات السحابية</div>
              <div className={`font-semibold ${status.isCloudConnected ? 'text-green-600' : 'text-red-600'}`}>
                {status.isCloudConnected ? 'متصل' : 'منقطع'}
              </div>
            </div>

            <div>
              <div className="text-slate-600">البيانات المعلقة</div>
              <div className="font-semibold text-slate-900">
                {status.pendingLocalData} عنصر
              </div>
            </div>

            <div>
              <div className="text-slate-600">محاولات الاتصال</div>
              <div className="font-semibold text-slate-900">
                {status.connectionAttempts}
              </div>
            </div>
          </div>

          {status.lastSyncTime && (
            <div className="text-sm text-slate-600">
              آخر مزامنة: {status.lastSyncTime.toLocaleString('ar-SA')}
            </div>
          )}

          {/* رسائل توضيحية حسب الحالة */}
          {status.mode === 'offline' && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Icons.Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">العمل في الوضع المحلي</p>
                  <p className="mt-1">
                    البرنامج يعمل بشكل طبيعي ويحفظ البيانات محلياً.
                    سيتم مزامنة جميع التغييرات تلقائياً عند عودة الاتصال بالإنترنت.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status.mode === 'syncing' && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Icons.RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">جاري المزامنة</p>
                  <p className="mt-1">
                    يتم الآن نقل البيانات المحلية إلى قاعدة البيانات السحابية.
                    الرجاء عدم إغلاق البرنامج حتى اكتمال العملية.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status.mode === 'cloud' && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <Icons.CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">متصل بالسحابة</p>
                  <p className="mt-1">
                    جميع البيانات محفوظة بأمان في قاعدة البيانات السحابية.
                    يمكنك الوصول إليها من أي جهاز آخر.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusDisplay;