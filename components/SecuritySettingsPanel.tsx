// components/SecuritySettingsPanel.tsx - لوحة إعدادات الأمان

import React, { useState, useEffect } from 'react';
import { SecurityService } from '../services/SecurityService';
import { SessionManager, SessionSettings } from '../services/SessionManager';
import { AuditLogger } from '../services/AuditLogger';
import { ConnectionActivity } from '../interfaces/database';
import { Icons } from './icons';
import { Button } from './ui/Button';
import AuditLogViewer from './AuditLogViewer';

interface SecuritySettingsPanelProps {
  securityService: SecurityService;
  sessionManager: SessionManager;
  auditLogger: AuditLogger;
  className?: string;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  securityService,
  sessionManager,
  auditLogger,
  className = ''
}) => {
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    timeout: 60,
    autoLogout: true,
    warningTime: 300,
    extendOnActivity: true
  });
  
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState<number>(-1);
  const [encryptionTest, setEncryptionTest] = useState({
    input: '',
    encrypted: '',
    decrypted: '',
    isProcessing: false
  });
  
  const [activeTab, setActiveTab] = useState<'session' | 'encryption' | 'audit'>('session');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // تحديث البيانات
  useEffect(() => {
    // تحميل إعدادات الجلسة
    const settings = sessionManager.getSettings();
    setSessionSettings(settings);
    
    // تحميل معلومات الجلسة الحالية
    const session = sessionManager.getCurrentSession();
    setCurrentSession(session);
    
    // تحديث الوقت المتبقي
    const updateRemainingTime = () => {
      const time = sessionManager.getRemainingTime();
      setRemainingTime(time);
    };
    
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    
    // الاستماع لأحداث الجلسة
    const handleSessionExpiry = () => {
      setCurrentSession(null);
      setRemainingTime(-1);
    };
    
    const handleSessionWarning = (time: number) => {
      // يمكن إضافة تنبيه هنا
      console.log(`تحذير: ستنتهي الجلسة خلال ${time} ثانية`);
    };
    
    sessionManager.onSessionExpiry(handleSessionExpiry);
    sessionManager.onSessionWarning(handleSessionWarning);
    
    return () => {
      clearInterval(interval);
    };
  }, [sessionManager]);

  // تحديث إعدادات الجلسة
  const updateSessionSettings = (newSettings: Partial<SessionSettings>) => {
    const updated = { ...sessionSettings, ...newSettings };
    setSessionSettings(updated);
    sessionManager.updateSettings(updated);
  };

  // تمديد الجلسة
  const extendSession = () => {
    sessionManager.extendSession();
    const session = sessionManager.getCurrentSession();
    setCurrentSession(session);
  };

  // إنهاء الجلسة
  const endSession = () => {
    sessionManager.endSession();
    setCurrentSession(null);
    setRemainingTime(-1);
  };

  // اختبار التشفير
  const testEncryption = async () => {
    if (!encryptionTest.input.trim()) return;
    
    setEncryptionTest(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // تشفير النص
      const encrypted = await securityService.encryptConnectionData(encryptionTest.input);
      
      // فك التشفير
      const decrypted = await securityService.decryptConnectionData(encrypted);
      
      setEncryptionTest(prev => ({
        ...prev,
        encrypted,
        decrypted,
        isProcessing: false
      }));
      
    } catch (error) {
      console.error('فشل اختبار التشفير:', error);
      setEncryptionTest(prev => ({
        ...prev,
        encrypted: 'خطأ في التشفير',
        decrypted: 'خطأ في فك التشفير',
        isProcessing: false
      }));
    }
  };

  // تنسيق الوقت
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // تنسيق مدة الجلسة
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    }
    
    return `${minutes} دقيقة`;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* رأس اللوحة */}
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Icons.Shield className="h-5 w-5 text-primary" />
          إعدادات الأمان والحماية
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          إدارة إعدادات الأمان والجلسات والتشفير
        </p>
      </div>

      {/* تبويبات */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'session', name: 'إدارة الجلسات', icon: Icons.Clock },
            { id: 'encryption', name: 'التشفير', icon: Icons.Lock },
            { id: 'audit', name: 'سجل الأنشطة', icon: Icons.FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* محتوى التبويبات */}
      <div className="p-6">
        {/* تبويب إدارة الجلسات */}
        {activeTab === 'session' && (
          <div className="space-y-6">
            {/* معلومات الجلسة الحالية */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Icons.Activity className="h-4 w-4 text-primary" />
                الجلسة الحالية
              </h4>
              
              {currentSession ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-600">حالة الجلسة</div>
                    <div className="text-lg font-semibold text-green-600">نشطة</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600">الوقت المتبقي</div>
                    <div className={`text-lg font-semibold ${
                      remainingTime < 300 ? 'text-red-600' : 
                      remainingTime < 900 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {formatTime(remainingTime)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-600">مدة الجلسة</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {formatDuration(sessionManager.getSessionDuration())}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Icons.Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">لا توجد جلسة نشطة</p>
                </div>
              )}
              
              {currentSession && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={extendSession}
                    className="flex items-center gap-2"
                  >
                    <Icons.RefreshCw className="h-4 w-4" />
                    تمديد الجلسة
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={endSession}
                    className="flex items-center gap-2"
                  >
                    <Icons.LogOut className="h-4 w-4" />
                    إنهاء الجلسة
                  </Button>
                </div>
              )}
            </div>

            {/* إعدادات الجلسة */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">إعدادات الجلسة</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    مهلة الجلسة (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={sessionSettings.timeout}
                    onChange={(e) => updateSessionSettings({ timeout: parseInt(e.target.value) })}
                    min="1"
                    max="1440"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    الحد الأدنى: 1 دقيقة، الحد الأقصى: 1440 دقيقة (24 ساعة)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    وقت التحذير (ثانية)
                  </label>
                  <input
                    type="number"
                    value={sessionSettings.warningTime}
                    onChange={(e) => updateSessionSettings({ warningTime: parseInt(e.target.value) })}
                    min="30"
                    max="1800"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    وقت التحذير قبل انتهاء الجلسة
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      تسجيل خروج تلقائي
                    </label>
                    <p className="text-xs text-slate-500">
                      إنهاء الجلسة تلقائياً عند انتهاء المهلة
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sessionSettings.autoLogout}
                    onChange={(e) => updateSessionSettings({ autoLogout: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      تمديد عند النشاط
                    </label>
                    <p className="text-xs text-slate-500">
                      تمديد الجلسة تلقائياً عند نشاط المستخدم
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sessionSettings.extendOnActivity}
                    onChange={(e) => updateSessionSettings({ extendOnActivity: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* إحصائيات الجلسة */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-3">إحصائيات الجلسة</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-600">إجمالي الجلسات</div>
                  <div className="font-semibold text-slate-900">
                    {sessionManager.getSessionStats().totalSessions}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600">متوسط المدة</div>
                  <div className="font-semibold text-slate-900">
                    {formatDuration(sessionManager.getSessionStats().averageDuration)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600">أطول جلسة</div>
                  <div className="font-semibold text-slate-900">
                    {formatDuration(sessionManager.getSessionStats().longestSession)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600">الجلسة الحالية</div>
                  <div className="font-semibold text-slate-900">
                    {formatDuration(sessionManager.getSessionStats().currentSessionDuration)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تبويب التشفير */}
        {activeTab === 'encryption' && (
          <div className="space-y-6">
            {/* معلومات التشفير */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <Icons.Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">التشفير مفعل</h4>
                  <p className="text-sm text-green-700 mt-1">
                    جميع البيانات الحساسة محمية بتشفير AES-256-GCM
                  </p>
                </div>
              </div>
            </div>

            {/* اختبار التشفير */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">اختبار التشفير</h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  النص المراد تشفيره
                </label>
                <input
                  type="text"
                  value={encryptionTest.input}
                  onChange={(e) => setEncryptionTest(prev => ({ ...prev, input: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="أدخل نص للاختبار..."
                />
              </div>
              
              <Button
                onClick={testEncryption}
                disabled={!encryptionTest.input.trim() || encryptionTest.isProcessing}
                className="flex items-center gap-2"
              >
                {encryptionTest.isProcessing ? (
                  <Icons.Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.Lock className="h-4 w-4" />
                )}
                اختبار التشفير
              </Button>
              
              {encryptionTest.encrypted && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      النص المشفر
                    </label>
                    <textarea
                      value={encryptionTest.encrypted}
                      readOnly
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      النص بعد فك التشفير
                    </label>
                    <input
                      type="text"
                      value={encryptionTest.decrypted}
                      readOnly
                      className={`w-full px-3 py-2 border rounded-lg ${
                        encryptionTest.decrypted === encryptionTest.input
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-red-300 bg-red-50 text-red-700'
                      }`}
                    />
                    {encryptionTest.decrypted === encryptionTest.input && (
                      <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                        <Icons.CheckCircle className="h-4 w-4" />
                        التشفير وفك التشفير يعملان بشكل صحيح
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات تقنية */}
            {showAdvanced && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">المعلومات التقنية</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">خوارزمية التشفير:</span>
                    <span className="font-mono">AES-256-GCM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">طول المفتاح:</span>
                    <span className="font-mono">256 بت</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">طول IV:</span>
                    <span className="font-mono">96 بت</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">مشتق المفتاح:</span>
                    <span className="font-mono">PBKDF2-SHA256</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">عدد التكرارات:</span>
                    <span className="font-mono">100,000</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Icons.Info className="h-4 w-4" />
              {showAdvanced ? 'إخفاء' : 'عرض'} المعلومات التقنية
            </Button>
          </div>
        )}

        {/* تبويب سجل الأنشطة */}
        {activeTab === 'audit' && (
          <div>
            <AuditLogViewer auditLogger={auditLogger} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;