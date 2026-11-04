/**
 * Text Direction Utility
 * Auto-detects if text should be RTL (Arabic/Hebrew) or LTR (Bengali/English)
 */

/**
 * Detect text direction based on character analysis
 * Returns 'rtl' or 'ltr'
 */
export function getTextDirection(text) {
  if (!text) return 'ltr';

  // Arabic Unicode ranges: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF
  // Hebrew Unicode ranges: \u0591-\u07FF, \uFB1D-\uFDFD
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0591-\u05FF\uFB1D-\uFDFD]/g;
  
  // Bengali: \u0980-\u09FF, English: A-Za-z
  const ltrRegex = /[A-Za-z\u0980-\u09FF]/g;

  const rtlMatches = text.match(rtlRegex) || [];
  const ltrMatches = text.match(ltrRegex) || [];

  // If RTL characters are more than 30% of total script characters, use RTL
  const totalScriptChars = rtlMatches.length + ltrMatches.length;
  if (totalScriptChars === 0) return 'ltr';
  
  const rtlRatio = rtlMatches.length / totalScriptChars;
  return rtlRatio > 0.3 ? 'rtl' : 'ltr';
}

/**
 * Get writing direction style for React Native Text component
 */
export function getDirectionStyle(text) {
  const direction = getTextDirection(text);
  return {
    writingDirection: direction,
    textAlign: direction === 'rtl' ? 'right' : 'left',
  };
}