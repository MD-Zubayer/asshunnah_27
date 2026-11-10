/**
 * Utilities for detecting & parsing YouTube / Facebook URLs and Markdown text.
 */

const URL_REGEX = /https?:\/\/[^\s<>"'`\)\]]+/gi;

export function parseYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleanUrl = rawUrl.trim().replace(/[.,;!?]+$/, '');

  // Match youtu.be/<id>, youtube.com/watch?v=<id>, /shorts/<id>, /live/<id>, /embed/<id>
  const ytMatch = cleanUrl.match(
    /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );

  if (!ytMatch) return null;

  const videoId = ytMatch[1];
  const isShort = /\/shorts\//i.test(cleanUrl);
  const isLive = /\/live\//i.test(cleanUrl);

  return {
    platform: 'youtube',
    url: cleanUrl,
    videoId,
    isShort,
    isLive,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
  };
}

export function parseFacebookUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleanUrl = rawUrl.trim().replace(/[.,;!?]+$/, '');

  const isFbDomain = /^https?:\/\/(?:www\.|m\.|mbasic\.|web\.|l\.)?(?:facebook\.com|fb\.watch|fb\.com)\/.+/i.test(cleanUrl);
  if (!isFbDomain) return null;

  const lower = cleanUrl.toLowerCase();
  const isReel = lower.includes('/reel/');
  const isVideo =
    isReel ||
    lower.includes('/videos/') ||
    lower.includes('/watch') ||
    lower.includes('fb.watch/') ||
    lower.includes('/share/v/') ||
    lower.includes('/share/r/');

  // Facebook's official plugins/post.php & plugins/video.php work with direct permalink/post/video/reel URLs,
  // whereas /share/ or fb.watch shortlinks often require direct in-app webview loading.
  const isShareShortLink = lower.includes('/share/') || lower.includes('fb.watch/');

  const encoded = encodeURIComponent(cleanUrl);
  const pluginUrl = isVideo
    ? `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=500`
    : `https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`;

  return {
    platform: 'facebook',
    url: cleanUrl,
    fbType: isReel ? 'reel' : isVideo ? 'video' : 'post',
    isVideo,
    isShareShortLink,
    pluginUrl,
  };
}

export function parseSocialEmbedUrl(rawUrl) {
  return parseYouTubeUrl(rawUrl) || parseFacebookUrl(rawUrl);
}

/**
 * Extracts all unique YouTube and Facebook embeds found in text.
 */
export function extractSocialEmbeds(text) {
  if (!text || typeof text !== 'string') return [];

  const matches = text.match(URL_REGEX) || [];
  const seen = new Set();
  const embeds = [];

  for (const raw of matches) {
    const parsed = parseSocialEmbedUrl(raw);
    if (!parsed) continue;
    const dedupeKey = parsed.platform === 'youtube' ? `yt:${parsed.videoId}` : `fb:${parsed.url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    embeds.push(parsed);
  }

  return embeds;
}

/**
 * Checks whether text contains Markdown syntax or embeddable URLs.
 */
export function hasMarkdownOrEmbeds(text) {
  if (!text || typeof text !== 'string') return false;
  if (extractSocialEmbeds(text).length > 0) return true;
  // Headers, bold, italic, code, blockquotes, lists, links, horizontal rule, strikethrough
  return /(^#{1,6}\s+|^>\s*|^[-*+]\s+|^\d+\.\s+|^([-*_])\1{2,}$|\*\*.*?\*\*|~~.*?~~|`.*?`|```|\[.+?\]\(https?:\/\/.+?\)|https?:\/\/[^\s]+)/m.test(
    text
  );
}

/**
 * Strips common Markdown markers for plain single/two-line previews (e.g., Home cards).
 */
export function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/```[\s\S]*?```/g, ' [কোড] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}
