/**
 * دوال مساعدة لتنسيق الأرقام والتواريخ
 * تستخدم أرقام إنجليزية مع نص عربي
 */

/**
 * تنسيق الأرقام كعملة بأرقام إنجليزية
 */
export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
  // تنسيق الرقم مع فواصل
  const formatted = amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // إضافة رمز العملة حسب النوع
  const currencySymbols: Record<string, string> = {
    'SAR': 'ر.س',
    'USD': '$',
    'EUR': '€',
    'ILS': '₪',
    'EGP': 'ج.م',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'QAR': 'ر.ق',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
    'JOD': 'د.أ'
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${formatted} ${symbol}`;
};

/**
 * تنسيق التاريخ بأرقام إنجليزية
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

/**
 * تنسيق التاريخ والوقت بأرقام إنجليزية
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * تنسيق الأرقام العادية بأرقام إنجليزية
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};
