/**
 * Article Service - Facebook-style post interactions
 * Handles API calls for articles, likes, comments, views, shares
 * Now with AsyncStorage caching for instant loading
 */

import { API_ENDPOINTS } from '../constants/api';
import { setCache, getCache, CacheKeys } from './cacheService';
import NetInfo from '@react-native-community/netinfo';

/**
 * Safely parse JSON response without throwing unhandled errors
 */
async function parseResponse(response) {
  try {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML error page, Cloudflare 1033)
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get auth headers (optional - works without token for guest users)
 */
function getAuthHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
}

/**
 * Check if device is online
 */
async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected;
}

/**
 * Get all articles (feed) - with cache-first strategy
 * Returns cached data instantly, fetches fresh in background
 * @param {string|null} token - Auth token
 * @param {number} page - Page number
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {{ data: *, fromCache: boolean }}
 */
export async function getArticles(token, page = 1, forceRefresh = false) {
  const cacheKey = page === 1 ? CacheKeys.ARTICLES_FEED : CacheKeys.ARTICLES_FEED_PAGE(page);

  // 1. Try cache first (for instant loading) - skip if forceRefresh
  if (!forceRefresh) {
    const cached = await getCache(cacheKey);

    // 2. Check if we need to fetch from network
    const online = await isOnline();

    if (cached.exists && !cached.expired && online) {
      // Cache is fresh - return immediately
      return { ...cached.data, fromCache: true };
    }

    if (cached.exists && !online) {
      // Offline - return stale cache
      console.log('[ArticleService] Offline, returning cached data');
      return { ...cached.data, fromCache: true };
    }
  }

  // 3. Fetch from network
  try {
    const url = page === 1
      ? API_ENDPOINTS.ARTICLES
      : `${API_ENDPOINTS.ARTICLES}?page=${page}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      console.log(`[ArticleService] Server unreachable or returned ${response.status}`);
      const staleCache = await getCache(cacheKey);
      if (staleCache.exists) {
        return { ...staleCache.data, fromCache: true, stale: true };
      }
      return { results: [], count: 0, fromCache: false, isOffline: true };
    }

    const data = await parseResponse(response);
    if (!data) {
      console.log('[ArticleService] Server returned non-JSON response, using fallback');
      const staleCache = await getCache(cacheKey);
      if (staleCache.exists) {
        return { ...staleCache.data, fromCache: true, stale: true };
      }
      return { results: [], count: 0, fromCache: false, isOffline: true };
    }

    // 4. Cache the result (15 min TTL) - only cache first 3 pages to prevent memory full
    if (page <= 3) {
      await setCache(cacheKey, data, 15);
    }

    return { ...data, fromCache: false };
  } catch (error) {
    console.log('[ArticleService] Network or server error:', error.message);
    const staleCache = await getCache(cacheKey);
    if (staleCache.exists) {
      return { ...staleCache.data, fromCache: true, stale: true };
    }
    return { results: [], count: 0, fromCache: false, isOffline: true };
  }
}

/**
 * Get single article detail
 */
export async function getArticleDetail(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleDetail(articleId), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      return null;
    }

    return await parseResponse(response);
  } catch (error) {
    console.log('[ArticleService] Error fetching article detail:', error.message);
    return null;
  }
}

/**
 * Create a new article
 * Uses XMLHttpRequest for reliable file upload (same pattern as profile photo upload)
 */
export function createArticle(token, content, imageUri = null) {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('is_published', 'true');

  if (imageUri) {
    // Ensure file:// prefix - required for React Native file uploads
    const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
    const filename = fileUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: fileUri,
      name: filename,
      type,
    });
  }

  const url = API_ENDPOINTS.ARTICLES;
  console.log('[ArticleService] Creating article at:', url);
  console.log('[ArticleService] Token present:', !!token);
  console.log('[ArticleService] Image URI:', imageUri ? 'included' : 'none');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Token ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[ArticleService] Article created successfully');
          resolve(data);
        } else {
          console.error('[ArticleService] Error response:', data);
          reject(new Error(data.detail || data.content?.[0] || data.error || `HTTP ${xhr.status}`));
        }
      } catch (e) {
        console.error('[ArticleService] Parse error:', xhr.responseText);
        reject(new Error('সার্ভার থেকে ত্রুটি পাওয়া গেছে'));
      }
    };

    xhr.onerror = () => {
      console.error('[ArticleService] Network error during article creation');
      reject(new Error('নেটওয়ার্ক সংযোগ ত্রুটি'));
    };

    xhr.send(formData);
  });
}

/**
 * Delete an article (only own articles)
 */
export async function deleteArticle(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleDetail(articleId), {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

/**
 * React to an article
 */
export async function reactToArticle(token, articleId, reactionType = 'like') {
  try {
    const response = await fetch(API_ENDPOINTS.articleReact(articleId), {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ reaction_type: reactionType })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await parseResponse(response);
  } catch (error) {
    console.error('Error reacting to article:', error);
    throw error;
  }
}

/**
 * Log reading dwell time on an article (>10s)
 */
export async function logDwellTime(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleDwell(articleId), {
      method: 'POST',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      return null;
    }

    return await parseResponse(response);
  } catch (error) {
    // Fail silently for background telemetry
    return null;
  }
}

/**
 * Get articles by a specific user - with cache-first strategy
 * @param {string|null} token - Auth token
 * @param {number} userId - User ID
 * @param {number} page - Page number
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 */
export async function getUserArticles(token, userId, page = 1, forceRefresh = false) {
  const cacheKey = CacheKeys.USER_ARTICLES(userId) + (page > 1 ? `_p${page}` : '');

  // 1. Try cache first - skip if forceRefresh
  if (!forceRefresh) {
    const cached = await getCache(cacheKey);
    const online = await isOnline();

    if (cached.exists && !cached.expired && online) {
      return { ...cached.data, fromCache: true };
    }

    if (cached.exists && !online) {
      console.log('[ArticleService] Offline, returning cached user articles');
      return { ...cached.data, fromCache: true };
    }
  }

  // 2. Fetch from network
  try {
    const url = `${API_ENDPOINTS.userArticles(userId)}&page=${page}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: token ? getAuthHeaders(token) : {},
    });

    if (!response.ok) {
      console.log(`[ArticleService] Server unreachable (${response.status}) for user articles`);
      const staleCache = await getCache(cacheKey);
      if (staleCache.exists) {
        return { ...staleCache.data, fromCache: true, stale: true };
      }
      return { results: [], count: 0, fromCache: false, isOffline: true };
    }

    const data = await parseResponse(response);
    if (!data) {
      const staleCache = await getCache(cacheKey);
      if (staleCache.exists) {
        return { ...staleCache.data, fromCache: true, stale: true };
      }
      return { results: [], count: 0, fromCache: false, isOffline: true };
    }

    // 3. Cache the result (15 min TTL) - only cache first 3 pages to prevent memory full
    if (page <= 3) {
      await setCache(cacheKey, data, 15);
    }

    return { ...data, fromCache: false };
  } catch (error) {
    console.log('[ArticleService] Error fetching user articles:', error.message);
    const staleCache = await getCache(cacheKey);
    if (staleCache.exists) {
      return { ...staleCache.data, fromCache: true, stale: true };
    }
    return { results: [], count: 0, fromCache: false, isOffline: true };
  }
}

/**
 * Track view on an article
 */
export async function trackView(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleView(articleId), {
      method: 'POST',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      return null;
    }

    return await parseResponse(response);
  } catch (error) {
    // Fail silently for analytics
    return null;
  }
}

/**
 * Track share on an article
 */
export async function trackShare(token, articleId, platform) {
  try {
    const response = await fetch(API_ENDPOINTS.articleShare(articleId), {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ platform }),
    });

    if (!response.ok) {
      return null;
    }

    return await parseResponse(response);
  } catch (error) {
    // Fail silently for analytics
    return null;
  }
}

/**
 * Get comments for an article
 */
export async function getComments(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleComments(articleId), {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await parseResponse(response);
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Create a comment on an article
 */
export async function createComment(token, articleId, text) {
  try {
    const response = await fetch(API_ENDPOINTS.articleComments(articleId), {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await parseResponse(response);
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await parseResponse(response);
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

/**
 * Fetch or generate AI summary for an article
 */
export async function getArticleSummary(token, articleId) {
  try {
    const response = await fetch(API_ENDPOINTS.articleSummary(articleId), {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
      },
    });

    if (!response.ok) {
      const errorData = await parseResponse(response);
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await parseResponse(response);
  } catch (error) {
    console.error('Error fetching article summary:', error);
    throw error;
  }
}

/**
 * Format count for display (e.g., 1.2k, 1M) - Bangla digits
 */
export function formatCount(count) {
  if (!count && count !== 0) return '০';

  const toBangla = (num) => {
    const digits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(num).replace(/[0-9]/g, d => digits[d] || d);
  };

  if (count >= 1000000) {
    return toBangla((count / 1000000).toFixed(1)) + 'M';
  }
  if (count >= 1000) {
    return toBangla((count / 1000).toFixed(1)) + 'k';
  }
  return toBangla(count);
}

/**
 * Format time ago in Bangla
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return 'এইমাত্র';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const toBangla = (num) => {
    const digits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(num).replace(/[0-9]/g, d => digits[d] || d);
  };

  if (diffSecs < 60) return 'এইমাত্র';
  if (diffMins < 60) return `${toBangla(diffMins)} মিনিট আগে`;
  if (diffHours < 24) return `${toBangla(diffHours)} ঘণ্টা আগে`;
  if (diffDays < 7) return `${toBangla(diffDays)} দিন আগে`;
  if (diffDays < 30) return `${toBangla(Math.floor(diffDays / 7))} সপ্তাহ আগে`;

  return date.toLocaleDateString('bn-BD');
}

// Default export for convenience
const articleService = {
  getArticles,
  getArticleDetail,
  createArticle,
  deleteArticle,
  reactToArticle,
  logDwellTime,
  getComments,
  createComment,
  getArticleSummary,
  trackView,
  trackShare,
  getUserArticles,
  formatCount,
  formatTimeAgo,
};

export default articleService;