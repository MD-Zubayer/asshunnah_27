/**
 * Diary Export & Share Utilities
 * - Styled Physical Diary PDF export (single page or full book) via expo-print
 * - Word (.doc) export with full Bengali & Arabic UTF-8 support
 * - Native Save to Downloads (Android StorageAccessFramework) & Share (expo-sharing / RN Share)
 */

import { Platform, Share, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getFullDiaryDateMeta, toBanglaDigits } from './diaryDate';
import { getDiaryFont, getPaperTheme } from '../constants/diaryThemes';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatContentToHtml(content) {
  const lines = String(content ?? '').split('\n');
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p class="empty-line">&nbsp;</p>';
      if (trimmed.startsWith('☑ ') || trimmed.startsWith('[x] ')) {
        const text = trimmed.replace(/^(☑ |\[x\] )/, '');
        return `<p class="check-done">☑ <s>${escapeHtml(text)}</s></p>`;
      }
      if (trimmed.startsWith('☐ ') || trimmed.startsWith('[ ] ')) {
        const text = trimmed.replace(/^(☐ |\[ \] )/, '');
        return `<p class="check-todo">☐ ${escapeHtml(text)}</p>`;
      }
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
        const text = trimmed.replace(/^[•-] /, '');
        return `<p class="bullet-line">• ${escapeHtml(text)}</p>`;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
        return `<p class="bold-line"><strong>${escapeHtml(trimmed.slice(2, -2))}</strong></p>`;
      }
      // Simple inline **bold** support
      const formatted = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<p>${formatted}</p>`;
    })
    .join('\n');
}

function buildPageHtml(entry, pageNum, totalPages) {
  const dateMeta = getFullDiaryDateMeta(entry.entry_date || entry.created_at, entry.hijri_date);
  const theme = getPaperTheme(entry.paper_theme === 'night' ? 'cream' : entry.paper_theme);
  const font = getDiaryFont(entry.font_family);
  const displayPage = entry.page_number || pageNum;

  return `
    <div class="diary-page" style="background-color: ${theme.paperBg}; border-color: ${theme.borderColor}; font-family: ${font.cssFont}, 'Noto Sans Bengali', 'SolaimanLipi', serif;">
      <div class="margin-line" style="border-left-color: ${theme.marginColor};"></div>
      <div class="page-inner">
        <div class="page-header" style="background-color: ${theme.headerBg}; border-bottom-color: ${theme.marginColor};">
          <div class="header-top">
            <span class="weekday-badge" style="color: ${theme.accentColor};">${escapeHtml(dateMeta.weekday)}</span>
            <span class="page-num" style="color: ${theme.mutedColor};">পৃষ্ঠা ${toBanglaDigits(displayPage)} / ${toBanglaDigits(totalPages)}</span>
          </div>
          <div class="dates-row" style="color: ${theme.textColor};">
            <span>📅 ${escapeHtml(dateMeta.englishBn)}</span>
            <span>•</span>
            <span>🌿 ${escapeHtml(dateMeta.banglaDate)}</span>
            <span>•</span>
            <span>🌙 ${escapeHtml(dateMeta.hijriDate)}</span>
          </div>
          <div class="meta-row" style="color: ${theme.mutedColor};">
            <span>${escapeHtml(entry.emoji || '📝')} ${escapeHtml(entry.tag || 'সাধারণ')}</span>
            ${entry.mood ? `<span>• অনুভূতি: ${escapeHtml(entry.mood)}</span>` : ''}
            ${entry.weather ? `<span>• আবহাওয়া: ${escapeHtml(entry.weather)}</span>` : ''}
            ${entry.is_pinned ? `<span>• 📌 সংরক্ষিত</span>` : ''}
          </div>
        </div>

        <div class="page-title" style="color: ${theme.textColor}; border-bottom-color: ${theme.lineColor};">
          ${escapeHtml(entry.title)}
        </div>

        <div class="page-body" style="color: ${theme.textColor}; background-image: repeating-linear-gradient(transparent, transparent 29px, ${theme.lineColor} 30px);">
          ${formatContentToHtml(entry.content)}
        </div>

        <div class="page-footer" style="color: ${theme.mutedColor}; border-top-color: ${theme.lineColor};">
          <span>জামিয়াতুস সুন্নাহ ব্যক্তিগত ডায়েরি</span>
          <span>পৃষ্ঠা ${toBanglaDigits(displayPage)}</span>
        </div>
      </div>
    </div>
  `;
}

export function buildDiaryPdfHtml(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  const totalPages = list.length;
  const pagesHtml = list
    .map((entry, idx) => buildPageHtml(entry, idx + 1, totalPages))
    .join('\n<div class="page-break"></div>\n');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Atma:wght@400;600;700&family=Galada&family=Hind+Siliguri:wght@400;600;700&family=Noto+Serif+Bengali:wght@400;700&display=swap');
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Atma', 'Noto Sans Bengali', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .diary-page {
      position: relative;
      border: 1.5px solid #E5D5B5;
      border-radius: 10px;
      min-height: 262mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .margin-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 38px;
      width: 4px;
      border-left: 1.5px solid #E88585;
      border-right: 1px solid #E88585;
      opacity: 0.75;
    }
    .page-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 262mm;
    }
    .page-header {
      padding: 14px 20px 12px 54px;
      border-bottom: 2px solid #E88585;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .weekday-badge {
      font-size: 16px;
      font-weight: 700;
    }
    .page-num {
      font-size: 12px;
      font-weight: 700;
    }
    .dates-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
    }
    .page-title {
      padding: 14px 20px 10px 54px;
      font-size: 20px;
      font-weight: 700;
      border-bottom: 1.5px solid #DCE4EC;
    }
    .page-body {
      flex: 1;
      padding: 6px 22px 24px 54px;
      font-size: 15px;
      line-height: 30px;
    }
    .page-body p {
      margin: 0;
      min-height: 30px;
      line-height: 30px;
    }
    .check-done { color: #059669; }
    .check-todo { font-weight: 600; }
    .page-footer {
      padding: 10px 20px 10px 54px;
      border-top: 1px solid #DCE4EC;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

export function buildDiaryWordHtml(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  const sections = list
    .map((entry, idx) => {
      const dateMeta = getFullDiaryDateMeta(entry.entry_date || entry.created_at, entry.hijri_date);
      const displayPage = entry.page_number || idx + 1;
      const bodyParas = String(entry.content ?? '')
        .split('\n')
        .map((l) => `<p style="margin: 0 0 8pt 0; font-size: 13pt; line-height: 1.6;">${escapeHtml(l) || '&nbsp;'}</p>`)
        .join('');

      return `
        ${idx > 0 ? '<br clear="all" style="page-break-before: always" />' : ''}
        <div style="border: 1pt solid #D6C3A5; padding: 18pt; background-color: #FFFDF7;">
          <table width="100%" style="border-bottom: 2pt solid #C96A6A; margin-bottom: 12pt;">
            <tr>
              <td style="font-size: 13pt; font-weight: bold; color: #9A3412;">${escapeHtml(dateMeta.weekday)}</td>
              <td align="right" style="font-size: 10pt; color: #6B7280;">পৃষ্ঠা ${toBanglaDigits(displayPage)} / ${toBanglaDigits(list.length)}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size: 10.5pt; color: #374151; padding-bottom: 6pt;">
                ${escapeHtml(dateMeta.englishBn)} | ${escapeHtml(dateMeta.banglaDate)} | ${escapeHtml(dateMeta.hijriDate)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="font-size: 10pt; color: #6B7280; padding-bottom: 6pt;">
                ক্যাটাগরি: ${escapeHtml(entry.emoji || '📝')} ${escapeHtml(entry.tag || 'সাধারণ')}
                ${entry.mood ? ` | অনুভূতি: ${escapeHtml(entry.mood)}` : ''}
                ${entry.weather ? ` | আবহাওয়া: ${escapeHtml(entry.weather)}` : ''}
              </td>
            </tr>
          </table>
          <h2 style="font-size: 17pt; color: #111827; margin: 0 0 12pt 0; border-bottom: 1pt solid #E5E7EB; padding-bottom: 6pt;">
            ${escapeHtml(entry.title)}
          </h2>
          <div>
            ${bodyParas}
          </div>
          <p style="margin-top: 18pt; font-size: 9pt; color: #9CA3AF; border-top: 1pt solid #E5E7EB; padding-top: 6pt;">
            জামিয়াতুস সুন্নাহ ব্যক্তিগত ডায়েরি
          </p>
        </div>
      `;
    })
    .join('\n');

  return `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>আমার ডায়েরি</title>
<style>
  body { font-family: 'Kalpurush', 'SolaimanLipi', 'Noto Sans Bengali', Arial, sans-serif; }
</style>
</head>
<body>
  ${sections}
</body>
</html>`;
}

function sanitizeFileName(name) {
  const clean = String(name || 'diary').replace(/[^\w\u0980-\u09FF-]+/g, '_').replace(/^_+|_+$/g, '');
  return clean.slice(0, 40) || 'diary_page';
}

async function saveFileToAndroidDownloads(fileUri, fileName, mimeType) {
  if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return { saved: false, cancelled: true };
    }
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      mimeType
    );
    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { saved: true, uri: destUri };
  }
  return { saved: false, unsupported: true };
}

/**
 * Generate PDF and either Share or Download to device folder
 */
export async function exportDiaryToPdf(entries, { mode = 'share', fileNameBase = 'Assunnah_Diary' } = {}) {
  const html = buildDiaryPdfHtml(entries);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const fileName = `${sanitizeFileName(fileNameBase)}.pdf`;

  if (mode === 'download' && Platform.OS === 'android') {
    const res = await saveFileToAndroidDownloads(uri, fileName, 'application/pdf');
    if (res.saved) {
      Alert.alert('ডাউনলোড সফল', `"${fileName}" আপনার নির্বাচিত ফোল্ডারে সংরক্ষিত হয়েছে।`);
      return res;
    }
    if (res.cancelled) return res;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'PDF ডায়েরি শেয়ার বা সংরক্ষণ করুন',
      UTI: 'com.adobe.pdf',
    });
    return { saved: true, uri };
  }

  await Print.printAsync({ html });
  return { saved: true, uri };
}

/**
 * Generate Word (.doc) file and either Share or Download to device folder
 */
export async function exportDiaryToWord(entries, { mode = 'share', fileNameBase = 'Assunnah_Diary' } = {}) {
  const wordHtml = buildDiaryWordHtml(entries);
  const fileName = `${sanitizeFileName(fileNameBase)}.doc`;
  const tempUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(tempUri, wordHtml, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (mode === 'download' && Platform.OS === 'android') {
    const res = await saveFileToAndroidDownloads(tempUri, fileName, 'application/msword');
    if (res.saved) {
      Alert.alert('ডাউনলোড সফল', `"${fileName}" Word ফাইল হিসেবে সংরক্ষিত হয়েছে।`);
      return res;
    }
    if (res.cancelled) return res;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(tempUri, {
      mimeType: 'application/msword',
      dialogTitle: 'Word (.doc) ফাইল শেয়ার বা সংরক্ষণ করুন',
    });
    return { saved: true, uri: tempUri };
  }

  throw new Error('এই ডিভাইসে ফাইল শেয়ারিং সাপোর্ট করছে না।');
}

/**
 * Share diary entry as formatted plain text
 */
export async function shareDiaryAsText(entry) {
  const dateMeta = getFullDiaryDateMeta(entry.entry_date || entry.created_at, entry.hijri_date);
  const message =
    `📔 ${entry.title}\n` +
    `📅 ${dateMeta.englishBn} (${dateMeta.weekday})\n` +
    `🌿 ${dateMeta.banglaDate} | 🌙 ${dateMeta.hijriDate}\n` +
    `🏷️ ${entry.emoji || '📝'} ${entry.tag || 'সাধারণ'}\n` +
    `────────────────────\n\n` +
    `${entry.content}\n\n` +
    `— জামিয়াতুস সুন্নাহ ব্যক্তিগত ডায়েরি`;

  return Share.share({
    title: entry.title,
    message,
  });
}
