/**
 * دوال مساعدة لتنسيق الأرقام والتواريخ
 * تستخدم أرقام إنجليزية مع نص عربي
 */

/**
 * تنسيق الأرقام كعملة بأرقام إنجليزية
 */
export const formatCurrency = (amount: number, currencyName?: string): string => {
  // تنسيق الرقم مع فواصل
  const formatted = amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // خريطة العملات - تدعم الاسم الكامل والرمز
  const currencyMap: Record<string, string> = {
    // بالعربي
    'شيكل': 'شيكل',
    'ريال سعودي': 'ر.س',
    'دولار': '$',
    'يورو': '€',
    'جنيه مصري': 'ج.م',
    'درهم إماراتي': 'د.إ',
    'دينار كويتي': 'د.ك',
    'ريال قطري': 'ر.ق',
    'دينار بحريني': 'د.ب',
    'ريال عماني': 'ر.ع',
    'دينار أردني': 'د.أ',
    // بالإنجليزي
    'SAR': 'ر.س',
    'USD': '$',
    'EUR': '€',
    'ILS': 'شيكل',
    'EGP': 'ج.م',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'QAR': 'ر.ق',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
    'JOD': 'د.أ'
  };
  
  // استخدام العملة من المعامل أو القيمة الافتراضية
  const currency = currencyName || 'شيكل';
  const symbol = currencyMap[currency] || currency;
  
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
