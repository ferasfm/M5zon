/**
 * دوال مساعدة لتنسيق الأرقام والتواريخ
 * تستخدم أرقام إنجليزية مع نص عربي
 */

/**
 * تنسيق الأرقام كعملة بأرقام إنجليزية
 */
export const formatCurrency = (amount: number, currency: string = 'ILS'): string => {
  return amount.toLocaleString('en-US', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
