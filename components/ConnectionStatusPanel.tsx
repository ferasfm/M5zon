// components/ConnectionStatusPanel.tsx - لوحة حالة الاتصال المحسنة

import React, { useState, useEffect } from 'react';
import { ConnectionManagerService } from '../services/ConnectionManagerService';
import { ConnectionHealthMonitor, HealthAlert } from '../services/ConnectionHealthMonitor';
import { DatabaseConnection, ConnectionHealthInfo } from '../interfaces/database';
import { Icons } from './icons';
import { Button } from './ui/Button';

interface ConnectionStatusPanelProps {
  connectionManager: ConnectionManagerService;
  healthMonitor: ConnectionHealthMonitor;
  className?: string;
}

const ConnectionStatusPanel: React.FC<ConnectionStatusPanelProps> = ({
  connectionManager,
  healthMonitor,
  className = ''
}) => {
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [healthInfo, setHealthInfo] = useState<ConnectionHealthInfo | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // تحديث البيانات
  useEffect(() => {
    // الحصول على الاتصال النشط
    const connection = connectionManager.getActiveConnection();
    setActiveConnection(connection);

    // الحصول على معلومات الصحة
    if (connection) {
      healthMonitor.checkConnectionHealth(connection.id).then(setHealthInfo);
      setAlerts(healthMonitor.getActiveAlerts(connection.id));
    } else {
      setHealthInfo(null);
      setAlerts([]);
    }

    // الاستماع للتغييرات
    const handleConnectionChange = (conn: DatabaseConnection | null) => {
      setActiveConnection(conn);
      if (conn) {
        healthMonitor.checkConnectionHealth(conn.id).then(setHealthInfo);
        setAlerts(healthMonitor.getActiveAlerts(conn.id));
      } else {
        setHealthInfo(null);
        setAlerts([]);
      }
    };

    const handleHealthChange = (health: ConnectionHealthInfo) => {
      setHealthInfo(health);
    };

    const handleAlert = (alert: HealthAlert) => {
      if (activeConnection && alert.connectionId === activeConnection.id) {
        setAlerts(prev => [...prev.filter(a => a.id !== alert.id), alert]);
      }
    };

    connectionManager.onConnectionChange(handleConnectionChange);
    healthMonitor.onHealthChange(handleHealthChange);
    healthMonitor.onAlert(handleAlert);

    return () => {
      // تنظيف المستمعين (في تطبيق حقيقي)
    };
  }, [connectionManager, healthMonitor, activeConnection?.id]);

  // اختبار الاتصال
  const testConnection = async () => {
    if (!activeConnection) return;

    setIsTestingConnection(true);
    setLastTestResult(null);

    try {
      const result = await connectionManager.testConnection(activeConnection.id);

      if (result.success) {
        setLastTestResult(`✓ الاتصال ناجح (${result.responseTime}ms)`);
      } else {
        setLastTestResult(`✗ فشل الاتصال: ${result.message}`);
      }

      // تحديث معلومات الصحة
      const health = await healthMonitor.checkConnectionHealth(activeConnection.id);
      setHealthInfo(health);

    } catch (error) {
      setLastTestResult(`✗ خطأ في الاختبار: ${(error as Error).message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // قطع الاتصال
  const disconnect = async () => {
    try {
      await connectionManager.disconnect();
      setLastTestResult('تم قطع الاتصال');
    } catch (error) {
      setLastTestResult(`خطأ في قطع الاتصال: ${(error as Error).message}`);
    }
  };

  // تنسيق الوقت
  const formatTime = (date: Date) => {
    return date.toLocaleString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // إخفاء معلومات حساسة من URL
  const maskSensitiveUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        parts[0] = parts[0].substring(0, 3) + '***';
      }
      return `${urlObj.protocol}//${parts.join('.')}`;
    } catch {
      return url.substring(0, 20) + '***';
    }
  };

  // الحصول على أيقونة الحالة
  const getStatusIcon = () => {
    if (!activeConnection) {
      return <Icons.Database className="h-5 w-5 text-gray-400" />;
    }

    if (!healthInfo) {
      return <Icons.Loader className="h-5 w-5 text-yellow-500 animate-spin" />;
    }

    switch (healthInfo.status) {
      case 'healthy':
        return <Icons.CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Icons.AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <Icons.AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Icons.Info className="h-5 w-5 text-gray-400" />;
    }
  };

  // الحصول على لون الحالة
  const getStatusColor = () => {
    if (!activeConnection || !healthInfo) {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }

    switch (healthInfo.status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // ترجمة حالة الصحة
  const translateHealthStatus = (status: string) => {
    const translations = {
      healthy: 'سليم',
      warning: 'تحذير',
      error: 'خطأ',
      unknown: 'غير معروف'
    };
    return translations[status as keyof typeof translations] || status;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* رأس اللوحة */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Icons.Activity className="h-5 w-5 text-primary" />
            حالة الاتصال
          </h3>
          <div className="flex items-center gap-2">
            {activeConnection && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={testConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <Icons.Loader className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Icons.RefreshCw className="h-4 w-4 ml-2" />
                  )}
                  اختبار
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <Icons.Info className="h-4 w-4 ml-2" />
                  تفاصيل
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* محتوى اللوحة */}
      <div className="p-4">
        {!activeConnection ? (
          // لا يوجد اتصال نشط
          <div className="text-center py-8">
            <Icons.Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">لا يوجد اتصال نشط</p>
            <p className="text-sm text-gray-400">
              قم بالاتصال بقاعدة بيانات لعرض معلومات الحالة
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* معلومات الاتصال الأساسية */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getStatusIcon()}
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {activeConnection.displayName || activeConnection.name}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {maskSensitiveUrl(activeConnection.connectionConfig.url)}
                  </p>
                  {activeConnection.description && (
                    <p className="text-xs text-slate-500 mt-1">
                      {activeConnection.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                  {healthInfo ? translateHealthStatus(healthInfo.status) : 'جاري الفحص...'}
                </div>
                {healthInfo && (
                  <p className="text-xs text-slate-500 mt-1">
                    آخر فحص: {formatTime(healthInfo.lastCheck)}
                  </p>
                )}
              </div>
            </div>

            {/* معلومات الأداء */}
            {healthInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-600">وقت الاستجابة</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {healthInfo.responseTime}ms
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-600">عدد الاتصالات</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {activeConnection.status.connectionCount}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-600">آخر اتصال</div>
                  <div className="text-sm font-medium text-slate-900">
                    {activeConnection.status.lastConnected
                      ? formatTime(activeConnection.status.lastConnected)
                      : 'غير محدد'
                    }
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-600">نوع قاعدة البيانات</div>
                  <div className="text-sm font-medium text-slate-900 capitalize">
                    {activeConnection.connectionConfig.type}
                  </div>
                </div>
              </div>
            )}

            {/* التنبيهات النشطة */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Icons.AlertTriangle className="h-4 w-4 text-yellow-500" />
                  التنبيهات النشطة ({alerts.length})
                </h5>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border text-sm ${alert.severity === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : alert.severity === 'high'
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-xs mt-1 opacity-75">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => healthMonitor.resolveAlert(alert.id)}
                          className="text-xs"
                        >
                          حل
                        </Button>
                      </div>
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-xs text-slate-500 text-center">
                      و {alerts.length - 3} تنبيهات أخرى...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* نتيجة آخر اختبار */}
            {lastTestResult && (
              <div className={`p-3 rounded-lg text-sm ${lastTestResult.startsWith('✓')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                {lastTestResult}
              </div>
            )}

            {/* تفاصيل إضافية */}
            {showDetails && healthInfo && (
              <div className="border-t border-slate-200 pt-4 space-y-4">
                {/* مشاكل الصحة */}
                {healthInfo.issues.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-700 mb-2">
                      المشاكل المكتشفة
                    </h5>
                    <div className="space-y-2">
                      {healthInfo.issues.map((issue, index) => (
                        <div key={index} className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Icons.AlertCircle className={`h-4 w-4 mt-0.5 ${issue.severity === 'critical' ? 'text-red-500' :
                              issue.severity === 'high' ? 'text-orange-500' :
                                issue.severity === 'medium' ? 'text-yellow-500' :
                                  'text-blue-500'
                              }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">
                                {issue.description}
                              </p>
                              {issue.solution && (
                                <p className="text-xs text-slate-600 mt-1">
                                  الحل: {issue.solution}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* التوصيات */}
                {healthInfo.recommendations.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-700 mb-2">
                      التوصيات
                    </h5>
                    <ul className="space-y-1">
                      {healthInfo.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                          <Icons.CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* إعدادات الاتصال */}
                <div>
                  <h5 className="text-sm font-medium text-slate-700 mb-2">
                    إعدادات الاتصال
                  </h5>
                  <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">SSL:</span>
                      <span className={activeConnection.connectionConfig.ssl ? 'text-green-600' : 'text-red-600'}>
                        {activeConnection.connectionConfig.ssl ? 'مفعل' : 'غير مفعل'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">مهلة الاتصال:</span>
                      <span className="text-slate-900">
                        {activeConnection.connectionConfig.timeout}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">التشفير:</span>
                      <span className={activeConnection.security.encryptionEnabled ? 'text-green-600' : 'text-red-600'}>
                        {activeConnection.security.encryptionEnabled ? 'مفعل' : 'غير مفعل'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">مهلة الجلسة:</span>
                      <span className="text-slate-900">
                        {activeConnection.security.sessionTimeout} دقيقة
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Button
                size="sm"
                variant="secondary"
                onClick={testConnection}
                disabled={isTestingConnection}
                className="flex-1"
              >
                {isTestingConnection ? (
                  <Icons.Loader className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Icons.RefreshCw className="h-4 w-4 ml-2" />
                )}
                اختبار الاتصال
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={disconnect}
                className="flex-1"
              >
                <Icons.LogOut className="h-4 w-4 ml-2" />
                قطع الاتصال
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusPanel;