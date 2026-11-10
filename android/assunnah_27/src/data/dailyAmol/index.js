import { BOOK_META, INTRO_SECTIONS } from './intro.js';
import { CH1_MORNING_EVENING } from './ch1MorningEvening.js';
import { CH1_AFTER_PRAYER } from './ch1AfterPrayer.js';
import { CH2_HAMD_QURAN } from './ch2Part1.js';
import { CH2_HADITH_DUAS } from './ch2Part2.js';
import { CH3_DAILY_AND_SAFAR } from './ch3DailyAndSafar.js';
import { CH4_ISTIGHFAR, CH5_DUROOD } from './ch4ch5IstighfarDurood.js';
import { CH6_SPECIAL_AMOL } from './ch6SpecialAmol.js';
import { APPENDIX_MISC, ASMAUL_HUSNA_DATA } from './appendixAndAsmaulHusna.js';

export { BOOK_META, ASMAUL_HUSNA_DATA };

export const AMOL_CHAPTERS = [
  CH1_MORNING_EVENING,
  CH1_AFTER_PRAYER,
  CH2_HAMD_QURAN,
  CH2_HADITH_DUAS,
  CH3_DAILY_AND_SAFAR,
  CH4_ISTIGHFAR,
  CH5_DUROOD,
  CH6_SPECIAL_AMOL,
  APPENDIX_MISC,
  INTRO_SECTIONS,
];

/**
 * Compute total dua/amol count across all chapters + Asmaul Husna.
 */
export function getTotalAmolStats() {
  let itemCount = 0;
  let subItemCount = 0;
  AMOL_CHAPTERS.forEach((ch) => {
    ch.items.forEach((it) => {
      itemCount += 1;
      if (Array.isArray(it.subItems) && it.subItems.length > 0) {
        subItemCount += it.subItems.length;
      } else {
        subItemCount += 1;
      }
    });
  });
  return {
    chaptersCount: AMOL_CHAPTERS.length + 1, // + Asmaul Husna
    topicsCount: itemCount,
    totalDuasCount: subItemCount,
    asmaulHusnaCount: ASMAUL_HUSNA_DATA.names.length,
  };
}

/**
 * Format an item (and optional subItems) into plain text for sharing or saving into Diary.
 */
export function formatAmolForDiaryOrShare(item, chapterTitle = '') {
  const parts = [];
  if (chapterTitle) {
    parts.push(`**${chapterTitle}**`);
  }
  parts.push(`**${item.title}**`);
  parts.push('');

  if (item.arabic) {
    parts.push(item.arabic);
    parts.push('');
  }
  if (item.pronunciation) {
    parts.push(`উচ্চারণ: ${item.pronunciation}`);
    parts.push('');
  }
  if (item.meaning) {
    parts.push(`অর্থ: ${item.meaning}`);
    parts.push('');
  }
  if (item.extraContent) {
    parts.push(item.extraContent);
    parts.push('');
  }
  if (Array.isArray(item.subItems)) {
    item.subItems.forEach((sub) => {
      if (sub.label) parts.push(`• ${sub.label}`);
      if (sub.arabic) parts.push(sub.arabic);
      if (sub.pronunciation) parts.push(`উচ্চারণ: ${sub.pronunciation}`);
      if (sub.meaning) parts.push(`অর্থ: ${sub.meaning}`);
      if (sub.fazilat) parts.push(`ফযীলত: ${sub.fazilat}`);
      if (sub.reference) parts.push(`সূত্র: ${sub.reference}`);
      parts.push('');
    });
  }
  if (Array.isArray(item.checklistItems)) {
    item.checklistItems.forEach((ci) => {
      parts.push(`☐ ${ci}`);
    });
    parts.push('');
  }
  if (item.fazilat) {
    parts.push(`ফযীলত: ${item.fazilat}`);
  }
  if (item.note) {
    parts.push(`বি.দ্র.: ${item.note}`);
  }
  if (item.reference) {
    parts.push(`রেফারেন্স: ${item.reference}`);
  }
  return parts.join('\n').trim();
}
