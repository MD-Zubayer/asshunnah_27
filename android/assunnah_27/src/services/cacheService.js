/**
 * Cache Service - AsyncStorage-based caching with TTL support
 * Provides instant data loading from local cache
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache_';
const CACHE_META_PREFIX = '@cache_meta_';

const MAX_CACHE_ITEMS = 20;
const PROTECTED_KEYS = ['auth_token', 'user_profile'];

/**
 * Save data to cache with TTL
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttlMinutes - Time to live in minutes (default: 15)
 */
export async function setCache(key, data, ttlMinutes = 15) {
    try {
        // LRU Cache Eviction logic
        if (!PROTECTED_KEYS.includes(key)) {
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
            
            // Filter out protected keys from eviction candidates
            const evictionCandidates = [];
            for (const cKey of cacheKeys) {
                const innerKey = cKey.substring(CACHE_PREFIX.length);
                if (!PROTECTED_KEYS.includes(innerKey)) {
                    evictionCandidates.push(cKey);
                }
            }

            if (evictionCandidates.length >= MAX_CACHE_ITEMS) {
                // Find least recently used candidate
                let oldestKey = null;
                let oldestTime = Infinity;

                for (const cKey of evictionCandidates) {
                    try {
                        const raw = await AsyncStorage.getItem(cKey);
                        if (raw) {
                            const entry = JSON.parse(raw);
                            const lastAccessed = entry.lastAccessed || entry.timestamp || 0;
                            if (lastAccessed < oldestTime) {
                                oldestTime = lastAccessed;
                                oldestKey = cKey;
                            }
                        } else {
                            oldestKey = cKey;
                            break;
                        }
                    } catch (e) {
                        oldestKey = cKey;
                        break;
                    }
                }

                if (oldestKey) {
                    await AsyncStorage.removeItem(oldestKey);
                    console.log(`[CacheService] LRU Evicted cache item: ${oldestKey}`);
                }
            }
        }

        const cacheEntry = {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            ttl: ttlMinutes * 60 * 1000, // Convert to ms
        };
        await AsyncStorage.setItem(
            `${CACHE_PREFIX}${key}`,
            JSON.stringify(cacheEntry)
        );
        return true;
    } catch (error) {
        console.error('Cache set error:', error);
        return false;
    }
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {{ data: *, expired: boolean, exists: boolean }}
 */
export async function getCache(key) {
    try {
        const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!raw) {
            return { data: null, expired: true, exists: false };
        }

        const entry = JSON.parse(raw);
        const now = Date.now();
        const expired = now - entry.timestamp > entry.ttl;

        // Update lastAccessed timestamp for LRU policy
        entry.lastAccessed = now;
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry)).catch(() => {});

        return {
            data: entry.data,
            expired,
            exists: true,
            age: now - entry.timestamp,
        };
    } catch (error) {
        console.error('Cache get error:', error);
        return { data: null, expired: true, exists: false };
    }
}

/**
 * Delete a specific cache entry
 * @param {string} key - Cache key
 */
export async function deleteCache(key) {
    try {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error);
        return false;
    }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
        return true;
    } catch (error) {
        console.error('Cache clear error:', error);
        return false;
    }
}

/**
 * Clear expired cache entries only
 */
export async function clearExpiredCache() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
        const now = Date.now();
        const expiredKeys = [];

        for (const key of cacheKeys) {
            const raw = await AsyncStorage.getItem(key);
            if (raw) {
                const entry = JSON.parse(raw);
                if (now - entry.timestamp > entry.ttl) {
                    expiredKeys.push(key);
                }
            }
        }

        if (expiredKeys.length > 0) {
            await AsyncStorage.multiRemove(expiredKeys);
        }
        return expiredKeys.length;
    } catch (error) {
        console.error('Cache cleanup error:', error);
        return 0;
    }
}

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
    AUTH_TOKEN: 'auth_token',
    ARTICLES_FEED: 'articles_feed',
    ARTICLES_FEED_PAGE: (page) => `articles_feed_p${page}`,
    USER_PROFILE: 'user_profile',
    USER_ARTICLES: (userId) => `user_articles_${userId}`,
    ARTICLE_DETAIL: (id) => `article_detail_${id}`,
    DUAS: 'duas_list',
    APP_SETTINGS: 'app_settings',
    DIARIES: 'diary_entries',
};

const cacheService = {
    setCache,
    getCache,
    deleteCache,
    clearAllCache,
    clearExpiredCache,
    CacheKeys,
};

export default cacheService;