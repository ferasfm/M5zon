import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { browserSettingsService } from '../services/browserSettingsService';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
}

const SystemSettings: React.FC = () => {
  const { settings: appSettings, updateSetting, refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  // تحويل الإعدادات من الكائن إلى مصفوفة للعرض
  const settings = Object.entries(appSettings).map(([key, value]) => ({
    id: key,
    key,
    value,
    description: ''
  }));

  // جلب الإعدادات من الملف المحلي
  const fetchSettings = async () => {
    setLoading(true);
    try {
      await refreshSettings();
    } catch (error) {
      console.error('Error fetching settings:', error);
      alert('حدث خطأ أثناء جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  // تحديث إعداد
  const updateSettingValue = async (key: string, value: string) => {
    setSaving(true);
    try {
      const success = await updateSetting(key, value);
      if (success) {
        alert('تم تحديث الإعداد بنجاح');
      } else {
        alert('فشل تحديث الإعداد');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('حدث خطأ أثناء تحديث الإعداد');
    } finally {
      setSaving(false);
    }
  };

  // حذف إعداد
  const deleteSetting = async (key: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإعداد؟')) return;

    try {
      const success = await browserSettingsService.deleteSetting(key);
      if (success) {
        await refreshSettings();
        alert('تم حذف الإعداد بنجاح');
      } else {
        alert('فشل حذف الإعداد');
      }
    } catch (error) {
      console.error('Error deleting setting:', error);
      alert('حدث خطأ أثناء حذف الإعداد');
    }
  };

  // إضافة إعداد جديد
  const addSetting = async () => {
    if (!newSetting.key || !newSetting.value) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const success = await updateSetting(newSetting.key, newSetting.value);

      if (success) {
        // إعادة تعيين النموذج
        setNewSetting({ key: '', value: '', description: '' });
        setShowAddForm(false);
        alert('تم إضافة الإعداد بنجاح');
      } else {
        alert('فشل إضافة الإعداد');
      }
    } catch (error) {
      console.error('Error adding setting:', error);
      alert('حدث خطأ أثناء إضافة الإعداد');
    } finally {
      setSaving(false);
    }
  };

  // تحميل الإعدادات عند تحميل المكون
  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إعدادات النظام</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <Icons.PlusCircle className="h-4 w-4" />
          إضافة إعداد جديد
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة إعداد جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">المفتاح</label>
              <input
                type="text"
                value={newSetting.key}
                onChange={(e) => setNewSetting({...newSetting, key: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="مثال: company_name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">القيمة</label>
              <input
                type="text"
                value={newSetting.value}
                onChange={(e) => setNewSetting({...newSetting, value: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="مثال: شركة المخزون الاحترافية"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الوصف (اختياري)</label>
              <input
                type="text"
                value={newSetting.description}
                onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="وصف الإعداد"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
              >
                إلغاء
              </Button>
              <Button 
                onClick={addSetting}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-gray-500">لا توجد إعدادات حالياً</p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="mt-4"
            >
              إضافة أول إعداد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => (
            <Card key={setting.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{setting.key}</div>
                    {setting.description && (
                      <div className="text-sm text-gray-500">{setting.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        // تحديث القيمة في الواجهة مؤقتاً
                        const index = settings.findIndex(s => s.id === setting.id);
                        if (index !== -1) {
                          const newSettings = [...settings];
                          newSettings[index] = { ...setting, value: newValue };
                          // تحديث القيمة في appSettings
                          appSettings[setting.key] = newValue;
                        }
                      }}
                      className="w-64 p-2 border border-gray-300 rounded-md"
                    />
                    <Button
                      size="sm"
                      onClick={() => updateSettingValue(setting.key, setting.value)}
                      disabled={saving}
                    >
                      {saving ? '...' : 'حفظ'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSetting(setting.key)}
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
