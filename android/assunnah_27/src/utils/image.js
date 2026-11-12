import { API_BASE_URL } from '../constants/api';

/**
 * Normalizes an image URL/URI.
 * Converts relative paths (e.g., '/media/...') or local mock URLs (localhost/127.0.0.1)
 * into absolute URLs mapped to the correct API_BASE_URL.
 *
 * @param {string} url - The original image URL or path.
 * @returns {string|null} The normalized absolute URL or null.
 */
export const getImageUri = (url) => {
  if (!url) return null;

  // If passed an object with uri property
  if (typeof url === 'object' && url?.uri) {
    url = url.uri;
  }
  if (typeof url !== 'string') return null;
  url = url.trim();
  if (!url) return null;

  // If it starts with file:// or data:, return it as is
  if (url.startsWith('file://') || url.startsWith('data:')) {
    return url;
  }

  // Replace localhost or 127.0.0.1 with API_BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_BASE_URL);
  }

  // Normalize path to prepend media/ if it's a chat upload missing the prefix
  let path = url;
  if (!path.startsWith('media/') && !path.startsWith('/media/')) {
    if (path.startsWith('chat_images') || path.startsWith('chat_audio') || path.startsWith('profiles')) {
      path = `media/${path}`;
    }
  }

  // If it is a relative path starting with /, append to API_BASE_URL
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }

  // Otherwise append to API_BASE_URL with a slash
  return `${API_BASE_URL}/${path}`;
};
