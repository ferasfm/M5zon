// services/browserSettingsService.ts
// نسخة من خدمة الإعدادات تعمل في المتصفح باستخدام localStorage

interface Settings {
  [key: string]: string;
}

const SETTINGS_KEY = 'inventory_system_settings';

class BrowserSettingsService {
  private settings: Settings = {};
  private initialized = false;

  // تهيئة الخدمة وقراءة الإعدادات من localStorage
  private async initialize() {
    if (this.initialized) return;

    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      } else {
        // استخدام إعدادات افتراضية
        this.settings = {
          company_name: 'شركة المخزون الاحترافية',
          currency: 'ريال سعودي',
          tax_rate: '15',
          low_stock_threshold: '10',
          warranty_days_threshold: '30',
          date_format: 'YYYY-MM-DD',
          language: 'ar'
        };
        // حفظ الإعدادات الافتراضية
        await this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // في حالة وجود خطأ، استخدم إعدادات افتراضية
      this.settings = {
        company_name: 'شركة المخزون الاحترافية',
        currency: 'ريال سعودي',
        tax_rate: '15',
        low_stock_threshold: '10',
        warranty_days_threshold: '30',
        date_format: 'YYYY-MM-DD',
        language: 'ar'
      };
    }
    this.initialized = true;
  }

  // حفظ الإعدادات في localStorage
  private async saveSettings(): Promise<boolean> {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  // الحصول على جميع الإعدادات
  async getAllSettings(): Promise<Settings> {
    await this.initialize();
    return { ...this.settings };
  }

  // الحصول على إعداد معين
  async getSetting(key: string, defaultValue = ''): Promise<string> {
    await this.initialize();
    return this.settings[key] || defaultValue;
  }

  // تحديث إعداد معين
  async updateSetting(key: string, value: string): Promise<boolean> {
    await this.initialize();
    this.settings[key] = value;
    return await this.saveSettings();
  }

  // تحديث عدة إعدادات دفعة واحدة
  async updateMultipleSettings(newSettings: Settings): Promise<boolean> {
    await this.initialize();
    this.settings = { ...this.settings, ...newSettings };
    return await this.saveSettings();
  }

  // حذف إعداد معين
  async deleteSetting(key: string): Promise<boolean> {
    await this.initialize();
    if (this.settings[key]) {
      delete this.settings[key];
      return await this.saveSettings();
    }
    return true;
  }

  // إعادة تعيين جميع الإعدادات إلى القيم الافتراضية
  async resetSettings(): Promise<boolean> {
    this.settings = {
      company_name: 'شركة المخزون الاحترافية',
      currency: 'ريال سعودي',
      tax_rate: '15',
      low_stock_threshold: '10',
      warranty_days_threshold: '30',
      date_format: 'YYYY-MM-DD',
      language: 'ar'
    };
    return await this.saveSettings();
  }
}

// تصدير نسخة واحدة من الخدمة (نمط Singleton)
export const browserSettingsService = new BrowserSettingsService();
