// components/ConnectionListManager.tsx - مدير قائمة الاتصالات

import React, { useState, useEffect } from 'react';
import { ConnectionManagerService } from '../services/ConnectionManagerService';
import { DatabaseConnection } from '../interfaces/database';
import { ConnectionValidator } from '../utils/connectionValidation';
import { Icons } from './icons';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ConnectionListManagerProps {
  connectionManager: ConnectionManagerService;
  className?: string;
}

interface ConnectionFormData {
  name: string;
  displayName: string;
  description: string;
  url: string;
  key: string;
  type: 'supabase' | 'postgresql' | 'mysql';
  ssl: boolean;
  timeout: number;
  sessionTimeout: number;
  encryptionEnabled: boolean;
  autoLogout: boolean;
  autoBackupEnabled: boolean;
  retentionDays: number;
}

const ConnectionListManager: React.FC<ConnectionListManagerProps> = ({
  connectionManager,
  className = ''
}) => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    displayName: '',
    description: '',
    url: '',
    key: '',
    type: 'supabase',
    ssl: true,
    timeout: 10000,
    sessionTimeout: 60,
    encryptionEnabled: true,
    autoLogout: true,
    autoBackupEnabled: true,
    retentionDays: 30
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحديث البيانات
  useEffect(() => {
    loadConnections();
    
    // الاستماع لتغييرات الاتصال
    const handleConnectionChange = (connection: DatabaseConnection | null) => {
      setActiveConnectionId(connection?.id || null);
      loadConnections();
    };

    connectionManager.onConnectionChange(handleConnectionChange);
    
    return () => {
      // تنظيف المستمعين
    };
  }, [connectionManager]);

  // تحميل الاتصالات
  const loadConnections = () => {
    const allConnections = connectionManager.getConnections();
    setConnections(allConnections);
    
    const active = connectionManager.getActiveConnection();
    setActiveConnectionId(active?.id || null);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      url: '',
      key: '',
      type: 'supabase',
      ssl: true,
      timeout: 10000,
      sessionTimeout: 60,
      encryptionEnabled: true,
      autoLogout: true,
      autoBackupEnabled: true,
      retentionDays: 30
    });
    setFormErrors({});
  };

  // ملء النموذج من الاتصال
  const fillFormFromConnection = (connection: DatabaseConnection) => {
    setFormData({
      name: connection.name,
      displayName: connection.displayName,
      description: connection.description || '',
      url: connection.connectionConfig.url,
      key: connection.connectionConfig.key,
      type: connection.connectionConfig.type as any,
      ssl: connection.connectionConfig.ssl,
      timeout: connection.connectionConfig.timeout,
      sessionTimeout: connection.security.sessionTimeout,
      encryptionEnabled: connection.security.encryptionEnabled,
      autoLogout: connection.security.autoLogout,
      autoBackupEnabled: connection.backup.autoBackupEnabled,
      retentionDays: connection.backup.retentionDays
    });
  };

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'اسم الاتصال مطلوب';
    }

    if (!formData.url.trim()) {
      errors.url = 'رابط قاعدة البيانات مطلوب';
    } else {
      try {
        new URL(formData.url);
      } catch {
        errors.url = 'رابط غير صحيح';
      }
    }

    if (!formData.key.trim()) {
      errors.key = 'مفتاح قاعدة البيانات مطلوب';
    }

    if (formData.sessionTimeout < 1 || formData.sessionTimeout > 1440) {
      errors.sessionTimeout = 'مهلة الجلسة يجب أن تكون بين 1 و 1440 دقيقة';
    }

    if (formData.retentionDays < 1 || formData.retentionDays > 365) {
      errors.retentionDays = 'مدة الاحتفاظ يجب أن تكون بين 1 و 365 يوم';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // إضافة اتصال جديد
  const handleAddConnection = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const connectionData = {
        name: formData.name,
        displayName: formData.displayName || formData.name,
        description: formData.description,
        connectionConfig: {
          url: formData.url,
          key: formData.key,
          type: formData.type,
          ssl: formData.ssl,
          timeout: formData.timeout
        },
        security: {
          encryptionEnabled: formData.encryptionEnabled,
          sessionTimeout: formData.sessionTimeout,
          autoLogout: formData.autoLogout,
          encryptionLevel: 'basic' as const
        },
        backup: {
          autoBackupEnabled: formData.autoBackupEnabled,
          retentionDays: formData.retentionDays,
          compressionLevel: 'low' as const
        },
        status: {
          isActive: false,
          health: 'unknown' as const,
          connectionCount: 0
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          environment: 'development' as const
        }
      };

      await connectionManager.addConnection(connectionData);
      loadConnections();
      setShowAddModal(false);
      resetForm();
      
    } catch (error) {
      console.error('فشل إضافة الاتصال:', error);
      setFormErrors({ general: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تحديث اتصال موجود
  const handleUpdateConnection = async () => {
    if (!selectedConnection || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updates = {
        name: formData.name,
        displayName: formData.displayName || formData.name,
        description: formData.description,
        connectionConfig: {
          url: formData.url,
          key: formData.key,
          type: formData.type,
          ssl: formData.ssl,
          timeout: formData.timeout
        },
        security: {
          encryptionEnabled: formData.encryptionEnabled,
          sessionTimeout: formData.sessionTimeout,
          autoLogout: formData.autoLogout,
          encryptionLevel: 'basic' as const
        },
        backup: {
          autoBackupEnabled: formData.autoBackupEnabled,
          retentionDays: formData.retentionDays,
          compressionLevel: 'low' as const
        }
      };

      await connectionManager.updateConnection(selectedConnection.id, updates);
      loadConnections();
      setShowEditModal(false);
      setSelectedConnection(null);
      resetForm();
      
    } catch (error) {
      console.error('فشل تحديث الاتصال:', error);
      setFormErrors({ general: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف اتصال
  const handleDeleteConnection = async () => {
    if (!selectedConnection) return;

    setIsSubmitting(true);
    try {
      await connectionManager.deleteConnection(selectedConnection.id);
      loadConnections();
      setShowDeleteModal(false);
      setSelectedConnection(null);
      
    } catch (error) {
      console.error('فشل حذف الاتصال:', error);
      alert(`فشل حذف الاتصال: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // الاتصال بقاعدة بيانات
  const handleConnect = async (connectionId: string) => {
    try {
      await connectionManager.connectTo(connectionId);
      loadConnections();
    } catch (error) {
      console.error('فشل الاتصال:', error);
      alert(`فشل الاتصال: ${(error as Error).message}`);
    }
  };

  // فتح نموذج التحرير
  const openEditModal = (connection: DatabaseConnection) => {
    setSelectedConnection(connection);
    fillFormFromConnection(connection);
    setShowEditModal(true);
  };

  // فتح نموذج الحذف
  const openDeleteModal = (connection: DatabaseConnection) => {
    setSelectedConnection(connection);
    setShowDeleteModal(true);
  };

  // الحصول على أيقونة نوع قاعدة البيانات
  const getDatabaseIcon = (type: string) => {
    switch (type) {
      case 'supabase':
        return <Icons.Database className="h-4 w-4 text-green-600" />;
      case 'postgresql':
        return <Icons.Database className="h-4 w-4 text-blue-600" />;
      case 'mysql':
        return <Icons.Database className="h-4 w-4 text-orange-600" />;
      default:
        return <Icons.Database className="h-4 w-4 text-gray-600" />;
    }
  };

  // تنسيق آخر اتصال
  const formatLastConnection = (date?: Date) => {
    if (!date) return 'لم يتم الاتصال';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* رأس القائمة */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Icons.List className="h-5 w-5 text-primary" />
            إدارة الاتصالات ({connections.length})
          </h3>
          <Button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Icons.PlusCircle className="h-4 w-4" />
            إضافة اتصال
          </Button>
        </div>
      </div>

      {/* قائمة الاتصالات */}
      <div className="p-6">
        {connections.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Database className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              لا توجد اتصالات محفوظة
            </h4>
            <p className="text-slate-500 mb-6">
              قم بإضافة اتصال جديد للبدء في استخدام النظام
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              إضافة أول اتصال
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className={`p-4 rounded-lg border transition-all ${
                  connection.id === activeConnectionId
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getDatabaseIcon(connection.connectionConfig.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {connection.displayName || connection.name}
                        </h4>
                        {connection.id === activeConnectionId && (
                          <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                            نشط
                          </span>
                        )}
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                          {connection.connectionConfig.type}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 truncate mb-2">
                        {connection.connectionConfig.url.replace(/https?:\/\//, '').substring(0, 50)}...
                      </p>
                      
                      {connection.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                          {connection.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          آخر اتصال: {formatLastConnection(connection.status.lastConnected)}
                        </span>
                        <span>
                          عدد الاتصالات: {connection.status.connectionCount}
                        </span>
                        {connection.security.encryptionEnabled && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Icons.Shield className="h-3 w-3" />
                            مشفر
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {connection.id !== activeConnectionId ? (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(connection.id)}
                      >
                        اتصال
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled
                      >
                        متصل
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(connection)}
                    >
                      <Icons.Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteModal(connection)}
                      disabled={connection.id === activeConnectionId}
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

      {/* نموذج إضافة اتصال */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إضافة اتصال جديد"
        size="lg"
      >
        <ConnectionForm
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleAddConnection}
          onCancel={() => setShowAddModal(false)}
          submitText="إضافة الاتصال"
        />
      </Modal>

      {/* نموذج تحرير اتصال */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="تحرير الاتصال"
        size="lg"
      >
        <ConnectionForm
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleUpdateConnection}
          onCancel={() => setShowEditModal(false)}
          submitText="حفظ التغييرات"
        />
      </Modal>

      {/* نموذج تأكيد الحذف */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="تأكيد الحذف"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <Icons.AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">تحذير</p>
              <p className="mt-1">
                هل أنت متأكد من حذف الاتصال "{selectedConnection?.name}"؟
                هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConnection}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Icons.Loader className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Icons.Trash2 className="h-4 w-4 ml-2" />
              )}
              حذف الاتصال
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// مكون النموذج المشترك
interface ConnectionFormProps {
  formData: ConnectionFormData;
  setFormData: (data: ConnectionFormData) => void;
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitText: string;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({
  formData,
  setFormData,
  formErrors,
  isSubmitting,
  onSubmit,
  onCancel,
  submitText
}) => {
  const updateField = (field: keyof ConnectionFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {formErrors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {formErrors.general}
        </div>
      )}

      {/* معلومات أساسية */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900">المعلومات الأساسية</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              اسم الاتصال *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.name ? 'border-red-300' : 'border-slate-300'
              }`}
              placeholder="مثال: قاعدة بيانات الإنتاج"
            />
            {formErrors.name && (
              <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الاسم المعروض
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="اسم مخصص للعرض"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الوصف
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="وصف اختياري للاتصال"
          />
        </div>
      </div>

      {/* إعدادات الاتصال */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900">إعدادات الاتصال</h4>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            نوع قاعدة البيانات *
          </label>
          <select
            value={formData.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="supabase">Supabase</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رابط قاعدة البيانات *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => updateField('url', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              formErrors.url ? 'border-red-300' : 'border-slate-300'
            }`}
            placeholder="https://your-project.supabase.co"
          />
          {formErrors.url && (
            <p className="text-red-600 text-sm mt-1">{formErrors.url}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            مفتاح قاعدة البيانات *
          </label>
          <input
            type="password"
            value={formData.key}
            onChange={(e) => updateField('key', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
              formErrors.key ? 'border-red-300' : 'border-slate-300'
            }`}
            placeholder="eyJhbGciOiJI..."
          />
          {formErrors.key && (
            <p className="text-red-600 text-sm mt-1">{formErrors.key}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ssl"
              checked={formData.ssl}
              onChange={(e) => updateField('ssl', e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="ssl" className="mr-2 text-sm text-slate-700">
              تفعيل SSL
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مهلة الاتصال (مللي ثانية)
            </label>
            <input
              type="number"
              value={formData.timeout}
              onChange={(e) => updateField('timeout', parseInt(e.target.value))}
              min="1000"
              max="60000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* إعدادات الأمان */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900">إعدادات الأمان</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مهلة الجلسة (دقيقة)
            </label>
            <input
              type="number"
              value={formData.sessionTimeout}
              onChange={(e) => updateField('sessionTimeout', parseInt(e.target.value))}
              min="1"
              max="1440"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.sessionTimeout ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {formErrors.sessionTimeout && (
              <p className="text-red-600 text-sm mt-1">{formErrors.sessionTimeout}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مدة الاحتفاظ بالنسخ الاحتياطية (يوم)
            </label>
            <input
              type="number"
              value={formData.retentionDays}
              onChange={(e) => updateField('retentionDays', parseInt(e.target.value))}
              min="1"
              max="365"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                formErrors.retentionDays ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {formErrors.retentionDays && (
              <p className="text-red-600 text-sm mt-1">{formErrors.retentionDays}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="encryptionEnabled"
              checked={formData.encryptionEnabled}
              onChange={(e) => updateField('encryptionEnabled', e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="encryptionEnabled" className="mr-2 text-sm text-slate-700">
              تفعيل التشفير
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoLogout"
              checked={formData.autoLogout}
              onChange={(e) => updateField('autoLogout', e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="autoLogout" className="mr-2 text-sm text-slate-700">
              تسجيل خروج تلقائي
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoBackupEnabled"
              checked={formData.autoBackupEnabled}
              onChange={(e) => updateField('autoBackupEnabled', e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="autoBackupEnabled" className="mr-2 text-sm text-slate-700">
              نسخ احتياطي تلقائي
            </label>
          </div>
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Icons.Loader className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Icons.Save className="h-4 w-4 ml-2" />
          )}
          {submitText}
        </Button>
      </div>
    </div>
  );
};

export default ConnectionListManager;