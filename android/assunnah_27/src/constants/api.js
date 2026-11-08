/**
 * API Configuration Constants
 */

export const API_BASE_URL = 'https://api-assunnah-27.newsmartagent.com';

// Share URL for articles - uses the same domain with /article/{id} route
export const SHARE_BASE_URL = 'https://api-assunnah-27.newsmartagent.com';

export const API_ENDPOINTS = {
  SIGNUP_UNIVERSAL: `${API_BASE_URL}/api/auth/signup/`,
  SIGNUP_TAKMIL: `${API_BASE_URL}/api/auth/signup/takmil/`,
  SIGNUP_NON_TAKMIL: `${API_BASE_URL}/api/auth/signup/non-takmil/`,
  LOGIN: `${API_BASE_URL}/api/auth/login/`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout/`,
  PROFILE: `${API_BASE_URL}/api/auth/profile/`,
  UPLOAD_PROFILE_PHOTO: `${API_BASE_URL}/api/auth/profile/upload-photo/`,
  UPLOAD_COVER_PHOTO: `${API_BASE_URL}/api/auth/profile/upload-cover/`,
  DUAS: `${API_BASE_URL}/api/duas/`,
  SETTINGS: `${API_BASE_URL}/api/settings/`,

  // Password Reset OTP Endpoints
  PASSWORD_RESET_REQUEST: `${API_BASE_URL}/api/auth/password-reset/request/`,
  PASSWORD_RESET_VERIFY: `${API_BASE_URL}/api/auth/password-reset/verify/`,
  PASSWORD_RESET_CONFIRM: `${API_BASE_URL}/api/auth/password-reset/confirm/`,

  // ============================================
  // Prayer Alert Endpoints
  // ============================================
  ALERT_PREFERENCES: `${API_BASE_URL}/api/alerts/preferences/`,
  ALERT_TODAY: `${API_BASE_URL}/api/alerts/today/`,
  ALERT_LOGS: `${API_BASE_URL}/api/alerts/logs/`,
  ALERT_LOG_CREATE: `${API_BASE_URL}/api/alerts/logs/create/`,
  DEVICE_TOKEN: `${API_BASE_URL}/api/device-token/`,

  // Admin Alert Endpoints
  ADMIN_ALERT_GLOBAL_CONFIG: `${API_BASE_URL}/api/admin/alerts/global-config/`,
  ADMIN_ALERT_ANALYTICS: `${API_BASE_URL}/api/admin/alerts/analytics/`,
  ADMIN_ALERT_USER_STATS: `${API_BASE_URL}/api/admin/alerts/user-stats/`,
  ADMIN_SEND_PUSH: `${API_BASE_URL}/api/admin/alerts/send-push/`,
  ADMIN_ALERT_TOGGLE_GLOBAL: `${API_BASE_URL}/api/admin/alerts/toggle-global/`,

  // ============================================
  // Article / Post Endpoints (Facebook-style)
  // ============================================
  ARTICLES: `${API_BASE_URL}/api/articles/`,
  articleDetail: (id) => `${API_BASE_URL}/api/articles/${id}/`,
  articleReact: (id) => `${API_BASE_URL}/api/articles/${id}/react/`,
  articleDwell: (id) => `${API_BASE_URL}/api/articles/${id}/dwell/`,
  articleComments: (id) => `${API_BASE_URL}/api/articles/${id}/comments/`,
  articleView: (id) => `${API_BASE_URL}/api/articles/${id}/view/`,
  articleShare: (id) => `${API_BASE_URL}/api/articles/${id}/share/`,
  articleSummary: (id) => `${API_BASE_URL}/api/articles/${id}/summary/`,
  userArticles: (userId) => `${API_BASE_URL}/api/articles/user_articles/?user_id=${userId}`,

  // ============================================
  // Follow Endpoints
  // ============================================
  followUser: (userId) => `${API_BASE_URL}/api/follow/${userId}/`,
  followStatus: (userId) => `${API_BASE_URL}/api/follow/${userId}/status/`,
  userFollowers: (userId) => `${API_BASE_URL}/api/follow/${userId}/followers/`,
  userFollowing: (userId) => `${API_BASE_URL}/api/follow/${userId}/following/`,

  // ============================================
  // Fuzalaye Jamia & Graduates Endpoints
  // ============================================
  userByFuzalayeName: (name) => `${API_BASE_URL}/api/user/by-name/${encodeURIComponent(name)}/`,
  JAMIA_GRADUATES: `${API_BASE_URL}/api/jamia-graduates/`,
  jamiaGraduateDetail: (id) => `${API_BASE_URL}/api/jamia-graduates/${id}/`,

  // ============================================
  // Diary Endpoints
  // ============================================
  DIARIES: `${API_BASE_URL}/api/diaries/`,
  diaryDetail: (id) => `${API_BASE_URL}/api/diaries/${id}/`,

  // ============================================
  // User Stats Endpoint (Home Page Progress)
  // ============================================
  USER_STATS: `${API_BASE_URL}/api/user-stats/`,

  // ============================================
  // Mosque Endpoints
  // ============================================
  MOSQUES: `${API_BASE_URL}/api/mosques/`,

  // ============================================
  // Chat / Message Endpoints
  // ============================================
  CHAT_ROOMS: `${API_BASE_URL}/api/chat/rooms/`,
  CHAT_GET_OR_CREATE_ROOM: `${API_BASE_URL}/api/chat/rooms/get_or_create/`,
  chatRoomMessages: (roomId) => `${API_BASE_URL}/api/chat/rooms/${roomId}/messages/`,
  chatRoomMarkRead: (roomId) => `${API_BASE_URL}/api/chat/rooms/${roomId}/mark_read/`,
  chatRoomUploadAudio: (roomId) => `${API_BASE_URL}/api/chat/rooms/${roomId}/upload_audio/`,
  chatRoomUploadImage: (roomId) => `${API_BASE_URL}/api/chat/rooms/${roomId}/upload_image/`,
  CHAT_USERS: `${API_BASE_URL}/api/chat/users/`,
  CHAT_CALLS: `${API_BASE_URL}/api/chat/calls/`,
};

// WebSocket URL
export const WS_BASE_URL = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
export const WS_ARTICLES = `${WS_BASE_URL}/ws/articles/`;
export const WS_CHAT = (roomId) => `${WS_BASE_URL}/ws/chat/${roomId}/`;
