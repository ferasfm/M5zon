import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';

interface SavedConnection {
  id: string;
  name: string;
  url: string;
  key: string;
  lastConnected?: Date;
  isActive: boolean;
}

interface CurrentConnectionInfo {
  url: string;
  isConnected: boolean;
  lastConnected?: Date;
  connectionCount: number;
}

const DatabaseConnectionManager: React.FC = () => {
  const { supabase, isConfigured, configureSupabase, checkConnection } = useSupabase();
  const notification = useNotification();
  
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    url: '',
    key: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(null);
  const [autoLogoutTime, setAutoLogoutTime] = useState('60'); // minutes
  const [encryptConnections, setEncryptConnections] = useState(true);

  // تحميل الاتصالات المحفوظة
  useEffect(() => {
    loadSavedConnections();
    if (isConfigured) {
      checkConnectionStatus();
    }
  }, [isConfigured]);

  const loadSavedConnections = () => {
    try {
      const saved = localStorage.getItem('savedConnections');
      if (saved) {
        const connections = JSON.parse(saved);
        setSavedConnections(connections.map((conn: any) => ({
          ...conn,
          lastConnected: conn.lastConnected ? new Date(conn.lastConnected) : undefined
        })));
      }
    } catch (error) {
      console.error('Error loading saved connections:', error);
    }
  };

  const saveConnections = (connections: SavedConnection[]) => {
    try {
      localStorage.setItem('savedConnections', JSON.stringify(connections));
      setSavedConnections(connections);
    } catch (error) {
      console.error('Error saving connections:', error);
      notification?.addNotification('فشل حفظ الاتصالات', 'error');
    }
  };

  const checkConnectionStatus = async () => {
    setConnectionStatus('checking');
    try {
      const isConnected = await checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'error');
      setLastConnectionCheck(new Date());
    } catch (error) {
      setConnectionStatus('error');
      setLastConnectionCheck(new Date());
    }
  };

  const addNewConnection = () => {
    if (!newConnection.name || !newConnection.url || !newConnection.key) {
      notification?.addNotification('يرجى ملء جميع الحقول', 'error');
      return;
    }

    const connection: SavedConnection = {
      id: Date.now().toString(),
      name: newConnection.name,
      url: newConnection.url,
      key: encryptConnections ? btoa(newConnection.key) : newConnection.key, // تشفير بسيط
      lastConnected: new Date(),
      isActive: false
    };

    const updatedConnections = [...savedConnections, connection];
    saveConnections(updatedConnections);
    setNewConnection({ name: '', url: '', key: '' });
    setShowAddConnection(false);
    notification?.addNotification('تم حفظ الاتصال بنجاح', 'success');
  };

  const connectToDatabase = async (connection: SavedConnection) => {
    try {
      const key = encryptConnections ? atob(connection.key) : connection.key;
      configureSupabase(connection.url, key);
      
      // تحديث حالة الاتصال
      const updatedConnections = savedConnections.map(conn => ({
        ...conn,
        isActive: conn.id === connection.id,
        lastConnected: conn.id === connection.id ? new Date() : conn.lastConnected
      }));
      saveConnections(updatedConnections);
      
      notification?.addNotification(`تم الاتصال بـ ${connection.name}`, 'success');
      await checkConnectionStatus();
    } catch (error) {
      notification?.addNotification('فشل الاتصال بقاعدة البيانات', 'error');
    }
  };

  const disconnectFromDatabase = () => {
    // مسح معلومات الاتصال
    localStorage.removeItem('supabaseUrl');
    localStorage.removeItem('supabaseKey');
    
    // تحديث حالة الاتصالات المحفوظة
    const updatedConnections = savedConnections.map(conn => ({
      ...conn,
      isActive: false
    }));
    saveConnections(updatedConnections);
    
    setConnectionStatus('disconnected');
    setShowDisconnectModal(false);
    notification?.addNotification('تم قطع الاتصال بقاعدة البيانات', 'info');
    
    // إعادة تحميل الصفحة لإعادة تعيين الحالة
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const deleteConnection = (connectionId: string) => {
    const updatedConnections = savedConnections.filter(conn => conn.id !== connectionId);
    saveConnections(updatedConnections);
    notification?.addNotification('تم حذف الاتصال', 'success');
  };

  const getCurrentConnection = () => {
    return savedConnections.find(conn => conn.isActive);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'checking': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'متصل';
      case 'checking': return 'جاري الفحص...';
      case 'error': return 'خطأ في الاتصال';
      default: return 'غير متصل';
    }
  };

  const currentConnection = getCurrentConnection();

  return (
    <div className="space-y-6">
      {/* حالة الاتصال الحالية */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Icons.Database className="h-5 w-5 text-primary" />
          حالة الاتصال الحالية
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">الحالة:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            {currentConnection && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">قاعدة البيانات:</span>
                  <span className="text-sm font-medium text-slate-900">{currentConnection.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">الخادم:</span>
                  <span className="text-sm text-slate-500 font-mono">
                    {currentConnection.url.replace(/https?:\/\//, '').substring(0, 20)}...
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">آخر اتصال:</span>
                  <span className="text-sm text-slate-500">
                    {currentConnection.lastConnected?.toLocaleString('ar-SA')}
                  </span>
                </div>
              </>
            )}
            
            {lastConnectionCheck && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">آخر فحص:</span>
                <span className="text-sm text-slate-500">
                  {lastConnectionCheck.toLocaleTimeString('ar-SA')}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={checkConnectionStatus}
              disabled={connectionStatus === 'checking'}
              className="w-full"
              variant="secondary"
            >
              <Icons.RefreshCw className={`h-4 w-4 ml-2 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
              فحص الاتصال
            </Button>
            
            {isConfigured && (
              <Button
                onClick={() => setShowDisconnectModal(true)}
                variant="danger"
                className="w-full"
              >
                <Icons.WifiOff className="h-4 w-4 ml-2" />
                قطع الاتصال
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* الاتصالات المحفوظة */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Icons.List className="h-5 w-5 text-primary" />
            الاتصالات المحفوظة
          </h3>
          <Button
            onClick={() => setShowAddConnection(true)}
            className="flex items-center gap-2"
          >
            <Icons.PlusCircle className="h-4 w-4" />
            إضافة اتصال
          </Button>
        </div>

        {savedConnections.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">لا توجد اتصالات محفوظة</p>
            <Button onClick={() => setShowAddConnection(true)}>
              إضافة أول اتصال
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {savedConnections.map((connection) => (
              <div
                key={connection.id}
                className={`p-4 rounded-lg border transition-colors ${
                  connection.isActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{connection.name}</h4>
                      {connection.isActive && (
                        <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                          نشط
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-mono mt-1">
                      {connection.url.replace(/https?:\/\//, '').substring(0, 40)}...
                    </p>
                    {connection.lastConnected && (
                      <p className="text-xs text-slate-400 mt-1">
                        آخر اتصال: {connection.lastConnected.toLocaleString('ar-SA')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!connection.isActive && (
                      <Button
                        size="sm"
                        onClick={() => connectToDatabase(connection)}
                      >
                        اتصال
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteConnection(connection.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* إعدادات الأمان */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Icons.Settings className="h-5 w-5 text-primary" />
          إعدادات الأمان والاتصال
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-700">تشفير معلومات الاتصال</label>
              <p className="text-xs text-slate-500">تشفير كلمات المرور المحفوظة محلياً</p>
            </div>
            <input
              type="checkbox"
              checked={encryptConnections}
              onChange={(e) => setEncryptConnections(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-700">مهلة انتهاء الجلسة (دقيقة)</label>
              <p className="text-xs text-slate-500">قطع الاتصال التلقائي بعد عدم النشاط</p>
            </div>
            <select
              value={autoLogoutTime}
              onChange={(e) => setAutoLogoutTime(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-sm"
            >
              <option value="30">30 دقيقة</option>
              <option value="60">60 دقيقة</option>
              <option value="120">120 دقيقة</option>
              <option value="0">بدون انتهاء</option>
            </select>
          </div>
        </div>
      </div>

      {/* نافذة إضافة اتصال جديد */}
      <Modal
        isOpen={showAddConnection}
        onClose={() => setShowAddConnection(false)}
        title="إضافة اتصال جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              اسم الاتصال
            </label>
            <input
              type="text"
              value={newConnection.name}
              onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="مثال: قاعدة بيانات الإنتاج"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Supabase URL
            </label>
            <input
              type="url"
              value={newConnection.url}
              onChange={(e) => setNewConnection({...newConnection, url: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://your-project.supabase.co"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={newConnection.key}
              onChange={(e) => setNewConnection({...newConnection, key: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="eyJhbGciOiJI..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddConnection(false)}
            >
              إلغاء
            </Button>
            <Button onClick={addNewConnection}>
              حفظ الاتصال
            </Button>
          </div>
        </div>
      </Modal>

      {/* نافذة تأكيد قطع الاتصال */}
      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title="تأكيد قطع الاتصال"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Icons.AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">تحذير</p>
              <p className="mt-1">سيتم قطع الاتصال بقاعدة البيانات وإعادة تحميل التطبيق. تأكد من حفظ أي تغييرات قبل المتابعة.</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowDisconnectModal(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={disconnectFromDatabase}
            >
              قطع الاتصال
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseConnectionManager;