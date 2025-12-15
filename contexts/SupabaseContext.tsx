// contexts/SupabaseContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { SupabaseClient, createSupabaseClient } from '../lib/supabaseClient';
import SupabaseConfigScreen from '../components/SupabaseConfigScreen';
import LocalConnectionSettings from '../components/LocalConnectionSettings';
import { localDb } from '../services/DatabaseService';

interface SupabaseContextType {
  supabase: any; // Changed to any to support both SupabaseClient and localDb
  isConfigured: boolean;
  connectionType: 'supabase' | 'local';
  configureSupabase: (url: string, key: string) => void;
  checkConnection: () => Promise<boolean>;
  setConnectionType: (type: 'supabase' | 'local') => void;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabase, setSupabase] = useState<any | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionType] = useState<'supabase' | 'local'>('local'); // دائماً محلي

  useEffect(() => {
    // الاتصال التلقائي بـ PostgreSQL المحلي
    const savedConfig = localStorage.getItem('localDbConfig');
    
    if (savedConfig) {
      // محاولة الاتصال بالإعدادات المحفوظة
      const config = JSON.parse(savedConfig);
      console.log('🔄 محاولة الاتصال بـ PostgreSQL المحلي...', config);
      
      localDb.connect({ ...config, port: parseInt(config.port) }).then(result => {
        if (result.success) {
          console.log('✅ تم الاتصال بـ PostgreSQL بنجاح');
          setSupabase(localDb);
          setIsConfigured(true);
        } else {
          console.error('❌ فشل الاتصال بـ PostgreSQL:', result.error);
        }
      });
    } else {
      // إعدادات افتراضية لـ PostgreSQL المحلي
      const defaultConfig = {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: ''
      };
      
      console.log('🔄 محاولة الاتصال بالإعدادات الافتراضية...');
      
      localDb.connect(defaultConfig).then(result => {
        if (result.success) {
          console.log('✅ تم الاتصال بـ PostgreSQL بنجاح (إعدادات افتراضية)');
          setSupabase(localDb);
          setIsConfigured(true);
          // حفظ الإعدادات
          localStorage.setItem('localDbConfig', JSON.stringify(defaultConfig));
        } else {
          console.error('❌ فشل الاتصال بـ PostgreSQL:', result.error);
        }
      });
    }
  }, []);

  const configureSupabase = async (host: string, port: string, database: string, user: string, password: string) => {
    try {
      console.log('🔄 محاولة الاتصال بـ PostgreSQL...', { host, port, database, user });
      
      const config = {
        host,
        port: parseInt(port),
        database,
        user,
        password
      };
      
      const result = await localDb.connect(config);
      
      if (result.success) {
        console.log('✅ تم الاتصال بـ PostgreSQL بنجاح');
        setSupabase(localDb);
        setIsConfigured(true);
        // حفظ الإعدادات
        localStorage.setItem('localDbConfig', JSON.stringify(config));
        return true;
      } else {
        console.error('❌ فشل الاتصال:', result.error);
        alert(`فشل الاتصال بقاعدة البيانات: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("خطأ في الاتصال:", error);
      alert("حدث خطأ أثناء الاتصال بقاعدة البيانات");
      return false;
    }
  };

  const handleLocalConnect = () => {
    // هذه الدالة لم تعد مستخدمة - الاتصال يتم تلقائياً
    setSupabase(localDb);
    setIsConfigured(true);
  };

  const checkConnection = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  };

  const updateConnectionType = (type: 'supabase' | 'local') => {
    setConnectionType(type);
    localStorage.setItem('connectionType', type);
  };

  const value = useMemo(() => ({
    supabase,
    isConfigured,
    connectionType,
    configureSupabase,
    checkConnection,
    setConnectionType: updateConnectionType
  }), [supabase, isConfigured, connectionType]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🗄️ قاعدة بيانات PostgreSQL</h1>
          <p className="text-gray-600">قم بإدخال معلومات الاتصال بقاعدة البيانات المحلية</p>
        </div>

        <LocalConnectionSettings onConfigured={configureSupabase} />
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
