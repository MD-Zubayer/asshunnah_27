/**
 * Diary Service - Personal diary entries
 * Uses cacheService for 15-day TTL caching with stale-while-revalidate
 */

import { API_ENDPOINTS } from '../constants/api';
import cacheService, { CacheKeys } from './cacheService';

const DIARY_TTL_MINUTES = 15 * 24 * 60; // 15 days in minutes

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

/**
 * Get all diary entries - Cache-first with stale-while-revalidate
 * 1. If cache exists and not expired → return instantly
 * 2. If cache exists but expired → return stale cache + refresh in background
 * 3. If no cache → fetch from API
 * @returns {{ data: Array, fromCache: boolean }}
 */
export async function getDiaries(token) {
    // Check cache first
    const cached = await cacheService.getCache(CacheKeys.DIARIES);

    if (cached.exists && !cached.expired) {
        // Fresh cache - return instantly
        console.log('[DiaryService] Loaded from cache (fresh)');
        return cached.data;
    }

    if (cached.exists && cached.expired) {
        // Stale cache - return stale data + refresh in background
        console.log('[DiaryService] Loaded from cache (stale), refreshing in background');
        _refreshDiariesInBackground(token);
        return cached.data;
    }

    // No cache - fetch from API
    console.log('[DiaryService] No cache, fetching from API');
    return _fetchAndCacheDiaries(token);
}

/**
 * Fetch diaries from API and cache
 */
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

/**
 * Background refresh - updates cache without blocking UI
 */
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
            console.log('[DiaryService] Background refresh complete');
        }
    } catch (error) {
        console.log('[DiaryService] Background refresh failed:', error.message);
    }
}

/**
 * Force refresh diaries from API (bypass cache)
 */
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
        body: JSON.stringify({
            title: entry.title,
            content: entry.content,
            tag: entry.tag || 'সাধারণ',
            emoji: entry.emoji || '📝',
        }),
    });

    if (!response.ok) {
        const errorData = await parseResponse(response);
        throw new Error(errorData.title?.[0] || errorData.content?.[0] || 'ডায়েরি সংরক্ষণ করা যায়নি');
    }

    const newEntry = await parseResponse(response);

    // Update cache - prepend new entry
    try {
        const cached = await cacheService.getCache(CacheKeys.DIARIES);
        const entries = cached.exists ? cached.data : [];
        entries.unshift(newEntry);
        await cacheService.setCache(CacheKeys.DIARIES, entries, DIARY_TTL_MINUTES);
    } catch (e) {
        console.log('[DiaryService] Cache update failed:', e.message);
    }

    return newEntry;
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

    // Update cache - remove deleted entry
    try {
        const cached = await cacheService.getCache(CacheKeys.DIARIES);
        if (cached.exists) {
            const filtered = cached.data.filter((d) => d.id !== id);
            await cacheService.setCache(CacheKeys.DIARIES, filtered, DIARY_TTL_MINUTES);
        }
    } catch (e) {
        console.log('[DiaryService] Cache update failed:', e.message);
    }

    return true;
}

const diaryService = { getDiaries, addDiary, deleteDiary, refreshDiaries };
export default diaryService;