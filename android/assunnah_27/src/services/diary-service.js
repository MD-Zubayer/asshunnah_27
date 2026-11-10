/**
 * Diary Service - Personal diary entries
 * Uses cacheService for 15-day TTL caching with stale-while-revalidate
 * Supports create, update (PATCH), delete, pin toggle, and local draft persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/api';
import cacheService, { CacheKeys } from './cacheService';

const DIARY_TTL_MINUTES = 15 * 24 * 60; // 15 days in minutes
const DRAFT_KEY = '@diary_auto_draft_v1';
const FONT_PREF_KEY = '@diary_default_font_v1';
const THEME_PREF_KEY = '@diary_default_theme_v1';

function getAuthHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Token ${token}`;
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('সার্ভার থেকে সঠিক response পাওয়া যায়নি।');
  }
}

function buildDiaryPayload(entry) {
  const payload = {
    title: entry.title,
    content: entry.content,
    tag: entry.tag || 'সাধারণ',
    emoji: entry.emoji || '📝',
  };
  if (entry.entry_date !== undefined) payload.entry_date = entry.entry_date;
  if (entry.hijri_date !== undefined) payload.hijri_date = entry.hijri_date;
  if (entry.mood !== undefined) payload.mood = entry.mood;
  if (entry.weather !== undefined) payload.weather = entry.weather;
  if (entry.paper_theme !== undefined) payload.paper_theme = entry.paper_theme;
  if (entry.font_family !== undefined) payload.font_family = entry.font_family;
  if (entry.is_pinned !== undefined) payload.is_pinned = entry.is_pinned;
  if (entry.page_number !== undefined) payload.page_number = entry.page_number;
  return payload;
}

/**
 * Get all diary entries - Cache-first with stale-while-revalidate
 */
export async function getDiaries(token) {
  const cached = await cacheService.getCache(CacheKeys.DIARIES);

  if (cached.exists && !cached.expired) {
    return cached.data;
  }

  if (cached.exists && cached.expired) {
    _refreshDiariesInBackground(token);
    return cached.data;
  }

  return _fetchAndCacheDiaries(token);
}

async function _fetchAndCacheDiaries(token) {
  try {
    if (!token) return [];

    const response = await fetch(API_ENDPOINTS.DIARIES, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (response.ok) {
      const data = await parseResponse(response);
      await cacheService.setCache(CacheKeys.DIARIES, data, DIARY_TTL_MINUTES);
      return data;
    }
  } catch (error) {
    console.log('[DiaryService] API fetch failed:', error.message);
  }

  return [];
}

async function _refreshDiariesInBackground(token) {
  try {
    if (!token) return;

    const response = await fetch(API_ENDPOINTS.DIARIES, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (response.ok) {
      const data = await parseResponse(response);
      await cacheService.setCache(CacheKeys.DIARIES, data, DIARY_TTL_MINUTES);
    }
  } catch (error) {
    console.log('[DiaryService] Background refresh failed:', error.message);
  }
}

export async function refreshDiaries(token) {
  return _fetchAndCacheDiaries(token);
}

/**
 * Create a new diary entry
 */
export async function addDiary(token, entry) {
  if (!token) throw new Error('লগইন করা প্রয়োজন');

  const response = await fetch(API_ENDPOINTS.DIARIES, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(buildDiaryPayload(entry)),
  });

  if (!response.ok) {
    const errorData = await parseResponse(response);
    throw new Error(errorData.title?.[0] || errorData.content?.[0] || 'ডায়েরি সংরক্ষণ করা যায়নি');
  }

  const newEntry = await parseResponse(response);

  try {
    const cached = await cacheService.getCache(CacheKeys.DIARIES);
    const entries = cached.exists && Array.isArray(cached.data) ? cached.data : [];
    entries.unshift(newEntry);
    await cacheService.setCache(CacheKeys.DIARIES, entries, DIARY_TTL_MINUTES);
  } catch (e) {
    console.log('[DiaryService] Cache update failed:', e.message);
  }

  return newEntry;
}

/**
 * Update an existing diary entry (PATCH)
 */
export async function updateDiary(token, id, updates) {
  if (!token) throw new Error('লগইন করা প্রয়োজন');

  const response = await fetch(API_ENDPOINTS.diaryDetail(id), {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await parseResponse(response);
    throw new Error(errorData.error || errorData.title?.[0] || errorData.content?.[0] || 'ডায়েরি আপডেট করা যায়নি');
  }

  const updatedEntry = await parseResponse(response);

  try {
    const cached = await cacheService.getCache(CacheKeys.DIARIES);
    if (cached.exists && Array.isArray(cached.data)) {
      const updatedList = cached.data.map((d) => (String(d.id) === String(id) ? updatedEntry : d));
      await cacheService.setCache(CacheKeys.DIARIES, updatedList, DIARY_TTL_MINUTES);
    }
  } catch (e) {
    console.log('[DiaryService] Cache update failed:', e.message);
  }

  return updatedEntry;
}

/**
 * Delete a diary entry
 */
export async function deleteDiary(token, id) {
  if (!token) throw new Error('লগইন করা প্রয়োজন');

  const response = await fetch(API_ENDPOINTS.diaryDetail(id), {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error('ডায়েরি মুছে ফেলা যায়নি');
  }

  try {
    const cached = await cacheService.getCache(CacheKeys.DIARIES);
    if (cached.exists && Array.isArray(cached.data)) {
      const filtered = cached.data.filter((d) => String(d.id) !== String(id));
      await cacheService.setCache(CacheKeys.DIARIES, filtered, DIARY_TTL_MINUTES);
    }
  } catch (e) {
    console.log('[DiaryService] Cache update failed:', e.message);
  }

  return true;
}

// ======================= Draft & Preferences =======================

export async function saveDraft(draft) {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch (e) {
    console.log('[DiaryService] saveDraft error:', e.message);
  }
}

export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearDraft() {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.log('[DiaryService] clearDraft error:', e.message);
  }
}

export async function saveDiaryPrefs({ fontFamily, paperTheme }) {
  try {
    if (fontFamily) await AsyncStorage.setItem(FONT_PREF_KEY, fontFamily);
    if (paperTheme) await AsyncStorage.setItem(THEME_PREF_KEY, paperTheme);
  } catch (e) {
    console.log('[DiaryService] saveDiaryPrefs error:', e.message);
  }
}

export async function loadDiaryPrefs() {
  try {
    const [fontFamily, paperTheme] = await Promise.all([
      AsyncStorage.getItem(FONT_PREF_KEY),
      AsyncStorage.getItem(THEME_PREF_KEY),
    ]);
    return {
      fontFamily: fontFamily || 'handwriting',
      paperTheme: paperTheme || 'cream',
    };
  } catch (e) {
    return { fontFamily: 'handwriting', paperTheme: 'cream' };
  }
}

const diaryService = {
  getDiaries,
  addDiary,
  updateDiary,
  deleteDiary,
  refreshDiaries,
  saveDraft,
  loadDraft,
  clearDraft,
  saveDiaryPrefs,
  loadDiaryPrefs,
};

export default diaryService;
