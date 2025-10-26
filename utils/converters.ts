// utils/converters.ts

const arabicToLatinMap: { [key: string]: string } = {
  // Eastern Arabic numerals
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  
  // Unshifted keys - Main keyboard
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
  'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l',
  'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'ى': 'n', 'ة': 'm',
  'ج': '[', 'د': ']', 'ك': ';', 'ط': "'", 'و': ',', 'ز': '.', 'ظ': '/', 'ذ': '`',

  // Shifted keys - Main keyboard (Common Windows Arabic 101 layout)
  'َ': 'Q', 'ً': 'W', 'ُ': 'E', 'ٌ': 'R', 'لإ': 'T', 'إ': 'Y', '‘': 'U', '÷': 'I', '×': 'O', '؛': 'P',
  'ِ': 'A', 'ٍ': 'S', ']': 'D', '[': 'F', 'ﻷ': 'G', 'أ': 'H', 'ـ': 'J', '،': 'K', '/': 'L',
  '~': 'Z', 'ْ': 'X', '}': 'C', '{': 'V', 'آ': 'N', '’': 'M',

  // Shifted number row
  'ّ': '~', 
  '!': '!', '@': '@', '#': '#', '$': '$', '%': '%', '^': '^', '&': '&', '*': '*', '(': ')', ')': '(',
  '_': '_', '+': '+',
};

/**
 * Converts a string that may contain Arabic characters from a QWERTY keyboard
 * layout into its Latin (English) equivalent.
 * @param input The string to convert.
 * @returns The converted string with Arabic characters mapped to Latin characters.
 */
export const convertArabicInput = (input: string): string => {
  if (!input) return '';
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    // If the character is in our map, use the Latin equivalent.
    // Otherwise, use the character as is (e.g., if it's already a Latin character or a symbol).
    result += arabicToLatinMap[char] || char;
  }
  return result;
};