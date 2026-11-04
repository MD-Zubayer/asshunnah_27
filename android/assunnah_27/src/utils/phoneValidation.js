import parsePhoneNumberFromString from 'libphonenumber-js';

/**
 * Validates and formats a phone number using Google's libphonenumber library.
 * Defaults to Bangladesh ('BD') if no country code is specified in the input string.
 *
 * @param {string} input - The phone number input by user
 * @returns {object} { isValid, formatted, e164, national, error }
 */
export const validatePhoneNumber = (input) => {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      formatted: '',
      e164: '',
      error: 'মোবাইল নাম্বার দেয়া আবশ্যক',
    };
  }

  const raw = input.trim();

  try {
    // Attempt parsing with 'BD' as default country
    const parsed = parsePhoneNumberFromString(raw, 'BD');

    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        formatted: parsed.formatInternational(), // e.g., +880 1712-345678
        e164: parsed.number,                     // e.g., +8801712345678
        national: parsed.formatNational(),       // e.g., 01712-345678
        country: parsed.country,                 // e.g., 'BD'
        error: null,
      };
    }
  } catch (_e) {
    // Parsing error
  }

  return {
    isValid: false,
    formatted: raw,
    e164: raw,
    error: 'সঠিক মোবাইল নাম্বার দিন (যেমন: 01712345678 বা +8801712345678)',
  };
};
