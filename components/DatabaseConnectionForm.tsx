// components/DatabaseConnectionForm.tsx - نموذج إعداد الاتصال

import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { Button } from './ui/Button';
import { DatabaseOption } from './DatabaseTypeSelector';

interface ConnectionFormData {
  name: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  filePath?: string;
  connectionString?: string;
  projectId?: string;
  apiKey?: string;
  [key: string]: any;
}

interface DatabaseConnectionFormProps {
  selectedDatabase: DatabaseOption;
  onSave: (connectionData: ConnectionFormData) => void;
  onCancel: () => void;
  initialData?: ConnectionFormData;
}

const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({
  selectedDatabase,
  onSave,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: `${selectedDatabase.name} - ${new Date().toLocaleDateString('ar-SA')}`,
    ...selectedDatabase.connectionTemplate,
    ...initialData
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // إعادة تعيين نتيجة الاختبار عند تغيير البيانات
    setTestResult(null);
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // محاكاة اختبار الاتصال
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // هنا يمكن إضافة منطق اختبار الاتصال الفعلي
      const success = Math.random() > 0.3; // محاكاة نجاح/فشل
      
      setTestResult({
        success,
        message: success 
          ? 'تم الاتصال بنجاح!' 
          : 'فشل الاتصال. تحقق من البيانات المدخلة.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'حدث خطأ أثناء اختبار الاتصال'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  const renderFormFields = () => {
    switch (selectedDatabase.id) {
      case 'supabase':
      case 'neon':
      case 'planetscale':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  عنوان الخادم *
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your-project.supabase.co"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  المنفذ
                </label>
                <input
                  type="number"
                  value={formData.port || ''}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                اسم قاعدة البيانات *
              </label>
              <input
                type="text"
                value={formData.database || ''}
                onChange={(e) => handleInputChange('database', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="postgres"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  اسم المستخدم *
                </label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </>
        );

      case 'firebase':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                معرف المشروع *
              </label>
              <input
                type="text"
                value={formData.projectId || ''}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your-project-id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                مفتاح API *
              </label>
              <input
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        );

      case 'mongodb-atlas':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              نص الاتصال *
            </label>
            <textarea
              value={formData.connectionString || ''}
              onChange={(e) => handleInputChange('connectionString', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
            />
          </div>
        );

      case 'sqlite':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مسار الملف *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.filePath || ''}
                onChange={(e) => handleInputChange('filePath', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="./database/inventory.db"
              />
              <Button variant="secondary" size="sm">
                <Icons.FileText className="h-4 w-4 ml-2" />
                تصفح
              </Button>
            </div>
          </div>
        );

      default:
        // PostgreSQL, MySQL, MariaDB, SQL Server محلي
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  عنوان الخادم *
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  المنفذ
                </label>
                <input
                  type="number"
                  value={formData.port || selectedDatabase.defaultPort || ''}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                اسم قاعدة البيانات *
              </label>
              <input
                type="text"
                value={formData.database || ''}
                onChange={(e) => handleInputChange('database', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="inventory_db"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  اسم المستخدم *
                </label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* رأس النموذج */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <selectedDatabase.icon className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              إعداد اتصال {selectedDatabase.name}
            </h3>
            <p className="text-sm text-slate-600">{selectedDatabase.description}</p>
          </div>
        </div>
      </div>

      {/* محتوى النموذج */}
      <div className="p-6 space-y-4">
        {/* اسم الاتصال */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            اسم الاتصال *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="اسم مميز لهذا الاتصال"
          />
        </div>

        {/* حقول الاتصال */}
        {renderFormFields()}

        {/* إعدادات متقدمة */}
        {selectedDatabase.type === 'cloud' && (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
            >
              <Icons.Settings className="h-4 w-4" />
              إعدادات متقدمة
              {showAdvanced ? <Icons.X className="h-4 w-4" /> : <Icons.PlusCircle className="h-4 w-4" />}
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    استخدام SSL
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.ssl || false}
                    onChange={(e) => handleInputChange('ssl', e.target.checked)}
                    className="h-4 w-4 text-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* اختبار الاتصال */}
        <div className="border-t border-slate-200 pt-4">
          <Button
            variant="secondary"
            onClick={testConnection}
            disabled={isTestingConnection}
            className="w-full mb-3"
          >
            {isTestingConnection ? (
              <>
                <Icons.RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                جاري اختبار الاتصال...
              </>
            ) : (
              <>
                <Icons.Zap className="h-4 w-4 ml-2" />
                اختبار الاتصال
              </>
            )}
          </Button>

          {testResult && (
            <div className={`p-3 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <Icons.CheckCircle className="h-4 w-4" />
                ) : (
                  <Icons.AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!formData.name || isTestingConnection}
            className="flex-1"
          >
            <Icons.CheckCircle className="h-4 w-4 ml-2" />
            حفظ الاتصال
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            <Icons.X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnectionForm;