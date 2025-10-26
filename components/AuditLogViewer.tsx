// components/AuditLogViewer.tsx - عارض سجل الأنشطة

import React, { useState, useEffect, useMemo } from 'react';
import { AuditLogger, AuditLogEntry, AuditLogFilter, AuditLogStats } from '../services/AuditLogger';
import { ActivityType } from '../types/database';
import { Icons } from './icons';
import { Button } from './ui/Button';

interface AuditLogViewerProps {
  auditLogger: AuditLogger;
  className?: string;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ auditLogger, className = '' }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // تحديث البيانات
  const refreshData = () => {
    const filteredLogs = searchQuery 
      ? auditLogger.searchLogs(searchQuery)
      : auditLogger.getLogs(filter);
    
    setLogs(filteredLogs);
    setStats(auditLogger.getStats());
  };

  useEffect(() => {
    refreshData();
    
    // الاستماع للسجلات الجديدة
    const handleNewLog = () => {
      refreshData();
    };
    
    auditLogger.onNewLog(handleNewLog);
    
    return () => {
      auditLogger.removeLogCallback(handleNewLog);
    };
  }, [filter, searchQuery]);

  // تطبيق الفلتر
  const applyFilter = (newFilter: Partial<AuditLogFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  // مسح الفلتر
  const clearFilter = () => {
    setFilter({});
    setSearchQuery('');
  };

  // تصدير السجلات
  const exportLogs = (format: 'json' | 'csv') => {
    const data = auditLogger.exportLogs(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // الحصول على أيقونة المستوى
  const getLevelIcon = (level: AuditLogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Icons.Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <Icons.AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <Icons.AlertCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <Icons.AlertTriangle className="h-4 w-4 text-red-700" />;
      default:
        return <Icons.Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // الحصول على لون المستوى
  const getLevelColor = (level: AuditLogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // ترجمة النشاط
  const translateActivity = (action: ActivityType) => {
    const translations = {
      [ActivityType.CONNECT]: 'اتصال',
      [ActivityType.DISCONNECT]: 'قطع اتصال',
      [ActivityType.TEST]: 'اختبار',
      [ActivityType.BACKUP]: 'نسخ احتياطي',
      [ActivityType.RESTORE]: 'استعادة',
      [ActivityType.SYNC]: 'مزامنة',
      [ActivityType.LOGIN]: 'تسجيل دخول',
      [ActivityType.LOGOUT]: 'تسجيل خروج'
    };
    return translations[action] || action;
  };

  // ترجمة الفئة
  const translateCategory = (category: AuditLogEntry['category']) => {
    const translations = {
      connection: 'اتصال',
      security: 'أمان',
      backup: 'نسخ احتياطي',
      sync: 'مزامنة',
      system: 'نظام'
    };
    return translations[category] || category;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* رأس الصفحة */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Icons.FileText className="h-5 w-5 text-primary" />
            سجل الأنشطة والمراجعة
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Icons.Filter className="h-4 w-4 ml-2" />
              فلترة
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportLogs('json')}
            >
              <Icons.Download className="h-4 w-4 ml-2" />
              تصدير JSON
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportLogs('csv')}
            >
              <Icons.FileText className="h-4 w-4 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-600">إجمالي الإدخالات</div>
              <div className="text-lg font-semibold text-slate-900">{stats.totalEntries}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600">العمليات الناجحة</div>
              <div className="text-lg font-semibold text-green-700">{stats.successfulActions}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-red-600">العمليات الفاشلة</div>
              <div className="text-lg font-semibold text-red-700">{stats.failedActions}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-yellow-600">التحذيرات</div>
              <div className="text-lg font-semibold text-yellow-700">{stats.byLevel.warning + stats.byLevel.error}</div>
            </div>
          </div>
        )}

        {/* شريط البحث */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Icons.Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث في السجلات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {(Object.keys(filter).length > 0 || searchQuery) && (
            <Button size="sm" variant="ghost" onClick={clearFilter}>
              <Icons.X className="h-4 w-4 ml-2" />
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* فلاتر متقدمة */}
      {showFilters && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المستوى</label>
              <select
                value={filter.level || ''}
                onChange={(e) => applyFilter({ level: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">جميع المستويات</option>
                <option value="info">معلومات</option>
                <option value="warning">تحذير</option>
                <option value="error">خطأ</option>
                <option value="critical">حرج</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">الفئة</label>
              <select
                value={filter.category || ''}
                onChange={(e) => applyFilter({ category: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">جميع الفئات</option>
                <option value="connection">اتصال</option>
                <option value="security">أمان</option>
                <option value="backup">نسخ احتياطي</option>
                <option value="sync">مزامنة</option>
                <option value="system">نظام</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">النجاح</label>
              <select
                value={filter.success === undefined ? '' : filter.success.toString()}
                onChange={(e) => applyFilter({ 
                  success: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">الكل</option>
                <option value="true">ناجح</option>
                <option value="false">فاشل</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* قائمة السجلات */}
      <div className="max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Icons.FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>لا توجد سجلات متاحة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getLevelIcon(entry.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">
                          {translateActivity(entry.action)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getLevelColor(entry.level)}`}>
                          {entry.level}
                        </span>
                        <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                          {translateCategory(entry.category)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">
                        {entry.connectionName}
                      </p>
                      {entry.errorMessage && (
                        <p className="text-sm text-red-600 mt-1 truncate">
                          {entry.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">
                      {entry.timestamp.toLocaleString('ar-SA')}
                    </div>
                    <div className={`text-xs mt-1 ${entry.success ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.success ? '✓ نجح' : '✗ فشل'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نافذة تفاصيل الإدخال */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">تفاصيل السجل</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEntry(null)}
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">النشاط</label>
                  <p className="text-slate-900">{translateActivity(selectedEntry.action)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">المستوى</label>
                  <div className="flex items-center gap-2">
                    {getLevelIcon(selectedEntry.level)}
                    <span>{selectedEntry.level}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">الفئة</label>
                  <p className="text-slate-900">{translateCategory(selectedEntry.category)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">النجاح</label>
                  <p className={selectedEntry.success ? 'text-green-600' : 'text-red-600'}>
                    {selectedEntry.success ? 'نجح' : 'فشل'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">التاريخ والوقت</label>
                  <p className="text-slate-900">{selectedEntry.timestamp.toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">معرف الاتصال</label>
                  <p className="text-slate-900 font-mono text-sm">{selectedEntry.connectionId}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">اسم الاتصال</label>
                <p className="text-slate-900">{selectedEntry.connectionName}</p>
              </div>
              
              {selectedEntry.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-slate-700">رسالة الخطأ</label>
                  <p className="text-red-600 bg-red-50 p-3 rounded-lg">{selectedEntry.errorMessage}</p>
                </div>
              )}
              
              {selectedEntry.duration && (
                <div>
                  <label className="text-sm font-medium text-slate-700">المدة</label>
                  <p className="text-slate-900">{selectedEntry.duration} مللي ثانية</p>
                </div>
              )}
              
              {selectedEntry.metadata && (
                <div>
                  <label className="text-sm font-medium text-slate-700">بيانات إضافية</label>
                  <pre className="text-sm bg-slate-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;