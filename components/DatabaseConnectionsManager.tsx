// components/DatabaseConnectionsManager.tsx - إدارة اتصالات قواعد البيانات

import React, { useState } from 'react';
import { Icons } from './icons';
import { Button } from './ui/Button';
import DatabaseTypeSelector, { DatabaseOption } from './DatabaseTypeSelector';
import DatabaseConnectionForm from './DatabaseConnectionForm';

interface SavedConnection {
  id: string;
  name: string;
  type: string;
  databaseType: string;
  isActive: boolean;
  lastConnected?: Date;
  status: 'connected' | 'disconnected' | 'error';
}

const DatabaseConnectionsManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'selector' | 'form'>('list');
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseOption | null>(null);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([
    {
      id: 'current-supabase',
      name: 'Supabase - الإنتاج',
      type: 'cloud',
      databaseType: 'supabase',
      isActive: true,
      lastConnected: new Date(),
      status: 'connected'
    }
  ]);

  const handleDatabaseSelect = (option: DatabaseOption) => {
    setSelectedDatabase(option);
    setCurrentView('form');
  };

  const handleConnectionSave = (connectionData: any) => {
    const newConnection: SavedConnection = {
      id: Date.now().toString(),
      name: connectionData.name,
      type: selectedDatabase?.type || 'cloud',
      databaseType: selectedDatabase?.id || 'unknown',
      isActive: false,
      status: 'disconnected'
    };

    setSavedConnections(prev => [...prev, newConnection]);
    setCurrentView('list');
    setSelectedDatabase(null);
  };

  const handleConnectionActivate = (connectionId: string) => {
    setSavedConnections(prev => 
      prev.map(conn => ({
        ...conn,
        isActive: conn.id === connectionId,
        status: conn.id === connectionId ? 'connected' : 'disconnected'
      }))
    );
  };

  const handleConnectionDelete = (connectionId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاتصال؟')) {
      setSavedConnections(prev => prev.filter(conn => conn.id !== connectionId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'disconnected': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'متصل';
      case 'disconnected': return 'غير متصل';
      case 'error': return 'خطأ';
      default: return 'غير معروف';
    }
  };

  const getDatabaseTypeIcon = (type: string) => {
    switch (type) {
      case 'supabase':
      case 'postgresql-local':
      case 'mysql-local':
      case 'mariadb-local':
      case 'sqlserver-express':
        return Icons.Database;
      case 'firebase':
      case 'neon':
        return Icons.Zap;
      case 'sqlite':
        return Icons.FileText;
      default:
        return Icons.Database;
    }
  };

  if (currentView === 'selector') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">اختيار نوع قاعدة البيانات</h3>
          <Button
            variant="secondary"
            onClick={() => setCurrentView('list')}
          >
            <Icons.X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
        </div>
        <DatabaseTypeSelector onSelect={handleDatabaseSelect} />
      </div>
    );
  }

  if (currentView === 'form' && selectedDatabase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">إضافة اتصال جديد</h3>
          <Button
            variant="secondary"
            onClick={() => {
              setCurrentView('list');
              setSelectedDatabase(null);
            }}
          >
            <Icons.X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
        </div>
        <DatabaseConnectionForm
          selectedDatabase={selectedDatabase}
          onSave={handleConnectionSave}
          onCancel={() => {
            setCurrentView('list');
            setSelectedDatabase(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس القسم */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">إدارة اتصالات قواعد البيانات</h3>
          <p className="text-sm text-slate-600">إضافة وإدارة اتصالات متعددة لقواعد البيانات</p>
        </div>
        <Button onClick={() => setCurrentView('selector')}>
          <Icons.PlusCircle className="h-4 w-4 ml-2" />
          إضافة اتصال جديد
        </Button>
      </div>

      {/* قائمة الاتصالات */}
      <div className="space-y-4">
        {savedConnections.map((connection) => {
          const DatabaseIcon = getDatabaseTypeIcon(connection.databaseType);
          
          return (
            <div
              key={connection.id}
              className={`border rounded-lg p-4 ${
                connection.isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <DatabaseIcon className="h-6 w-6 text-slate-600" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{connection.name}</h4>
                      {connection.isActive && (
                        <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                          نشط
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                      <span className="capitalize">
                        {connection.type === 'cloud' ? 'سحابي' : 'محلي'}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{connection.databaseType}</span>
                      {connection.lastConnected && (
                        <>
                          <span>•</span>
                          <span>آخر اتصال: {connection.lastConnected.toLocaleString('ar-SA')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* حالة الاتصال */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                    {getStatusText(connection.status)}
                  </span>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-2">
                    {!connection.isActive && (
                      <Button
                        size="sm"
                        onClick={() => handleConnectionActivate(connection.id)}
                      >
                        <Icons.Zap className="h-4 w-4 ml-2" />
                        تفعيل
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="secondary"
                    >
                      <Icons.Edit className="h-4 w-4" />
                    </Button>
                    
                    {!connection.isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleConnectionDelete(connection.id)}
                      >
                        <Icons.Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* معلومات إضافية للاتصال النشط */}
              {connection.isActive && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-600">وقت الاستجابة</div>
                      <div className="font-semibold text-slate-900">~120ms</div>
                    </div>
                    <div>
                      <div className="text-slate-600">عدد الجلسات</div>
                      <div className="font-semibold text-slate-900">1</div>
                    </div>
                    <div>
                      <div className="text-slate-600">آخر نشاط</div>
                      <div className="font-semibold text-slate-900">الآن</div>
                    </div>
                    <div>
                      <div className="text-slate-600">الأمان</div>
                      <div className="font-semibold text-green-600">SSL مفعل</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* معلومات إضافية */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">نصائح مهمة:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• يمكن حفظ عدة اتصالات والتبديل بينها بسهولة</li>
              <li>• الاتصال النشط هو الذي يستخدمه البرنامج حالياً</li>
              <li>• تأكد من اختبار الاتصال قبل التفعيل</li>
              <li>• البيانات المحلية ستبقى آمنة عند التبديل</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnectionsManager;