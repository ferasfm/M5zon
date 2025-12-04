import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { browserSettingsService } from '../services/browserSettingsService';
import { setCurrentCurrency } from '../utils/currencyHelper';

interface Settings {
  [key: string]: string;
}

interface SettingsContextType {
  settings: Settings;
  getSetting: (key: string, defaultValue?: string) => Promise<string>;
  updateSetting: (key: string, value: string) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  // جلب الإعدادات من الملف المحلي
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settingsObject = await browserSettingsService.getAllSettings();
      setSettings(settingsObject);
      
      // تحديث العملة العامة
      const currency = settingsObject.currency || 'شيكل';
      setCurrentCurrency(currency);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحديث إعداد معين
  const updateSetting = async (key: string, value: string): Promise<boolean> => {
    try {
      const success = await browserSettingsService.updateSetting(key, value);

      if (success) {
        // تحديث الحالة المحلية
        setSettings(prev => ({
          ...prev,
          [key]: value
        }));
        
        // إذا تم تحديث العملة، حدث العملة العامة
        if (key === 'currency') {
          setCurrentCurrency(value);
        }
      }

      return success;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  // الحصول على قيمة إعداد معين
  const getSetting = async (key: string, defaultValue = ''): Promise<string> => {
    try {
      return await browserSettingsService.getSetting(key, defaultValue);
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  };

  // تحديث جميع الإعدادات
  const refreshSettings = async () => {
    await fetchSettings();
  };

  // تحميل الإعدادات عند تحميل المكون
  useEffect(() => {
    fetchSettings();
  }, []);

  const value = {
    settings,
    getSetting,
    updateSetting,
    refreshSettings,
    loading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
