/**
 * مساعد للعملة - يجلب العملة من الإعدادات ويستخدمها في التنسيق
 */

import { formatCurrency as baseFormatCurrency } from './formatters';

// متغير عام لتخزين العملة الحالية
let currentCurrency = 'شيكل';

/**
 * تعيين العملة الحالية
 */
export const setCurrentCurrency = (currency: string) => {
  currentCurrency = currency;
};

/**
 * الحصول على العملة الحالية
 */
export const getCurrentCurrency = (): string => {
  return currentCurrency;
};

/**
 * تنسيق المبلغ باستخدام العملة من الإعدادات
 */
export const formatCurrency = (amount: number): string => {
  return baseFormatCurrency(amount, currentCurrency);
};
