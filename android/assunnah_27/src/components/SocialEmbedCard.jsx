import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let WebViewComponent = null;
try {
  WebViewComponent = require('react-native-webview').WebView;
} catch (_e) {
  WebViewComponent = null;
}

function buildYouTubeHtml(videoId) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=https://assunnah.app"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

function buildFacebookEmbedHtml(pluginUrl, isVideo) {
  const height = isVideo ? 240 : 380;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; background: #ffffff; font-family: -apple-system, sans-serif; }
      .wrap { width: 100%; display: flex; justify-content: center; overflow: hidden; }
      iframe { width: 100%; min-height: ${height}px; border: none; overflow: hidden; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <iframe
        src="${pluginUrl}"
        scrolling="yes"
        frameborder="0"
        allowfullscreen="true"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      ></iframe>
    </div>
  </body>
</html>`;
}

function InAppWebModal({ visible, url, title, colors, onClose }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  if (!visible || !url) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors?.background || '#0F172A' }]}>
        <View
          style={[
            styles.modalHeader,
            {
              paddingTop: Math.max(insets.top, 12),
              backgroundColor: colors?.card || '#1E293B',
              borderBottomColor: colors?.cardBorder || 'rgba(255,255,255,0.1)',
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.modalIconBtn}>
            <Ionicons name="close" size={24} color={colors?.text || '#fff'} />
          </TouchableOpacity>
          <View style={styles.modalTitleWrap}>
            <Text style={[styles.modalTitle, { color: colors?.text || '#fff' }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.modalUrl, { color: colors?.textMuted || '#94A3B8' }]} numberOfLines={1}>
              {url}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(url).catch(() => {})}
            style={styles.modalIconBtn}
          >
            <Ionicons name="open-outline" size={20} color={colors?.primary || '#3B82F6'} />
          </TouchableOpacity>
        </View>

        {WebViewComponent ? (
          <View style={{ flex: 1 }}>
            <WebViewComponent
              source={{ uri: url }}
              style={{ flex: 1, backgroundColor: '#fff' }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              userAgent={
                Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                  : undefined
              }
            />
            {loading && (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color={colors?.primary || '#1877F2'} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.fallbackCenter}>
            <Text style={{ color: colors?.text || '#fff', marginBottom: 12 }}>
              ইন-অ্যাপ ব্রাউজার লোড করা যায়নি।
            </Text>
            <TouchableOpacity
              style={[styles.fallbackBtn, { backgroundColor: '#1877F2' }]}
              onPress={() => Linking.openURL(url).catch(() => {})}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>বাইরে খুলুন</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function SocialEmbedCard({ embed, colors, isDark, compact = false }) {
  const [playing, setPlaying] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  if (!embed) return null;

  const stopProp = (e) => {
    e?.stopPropagation?.();
  };

  const openExternal = (e) => {
    stopProp(e);
    Linking.openURL(embed.url).catch(() => {});
  };

  // ==================== YOUTUBE EMBED ====================
  if (embed.platform === 'youtube') {
    const handlePlayPress = (e) => {
      stopProp(e);
      if (WebViewComponent) {
        setWebLoading(true);
        setPlaying(true);
      } else {
        Linking.openURL(embed.url).catch(() => {});
      }
    };

    const handleStopPress = (e) => {
      stopProp(e);
      setPlaying(false);
    };

    return (
      <View
        onStartShouldSetResponder={() => true}
        style={[
          styles.embedContainer,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={[styles.videoFrame, compact && { aspectRatio: 16 / 9 }]}>
          {playing && WebViewComponent ? (
            <View style={styles.webViewWrap}>
              <WebViewComponent
                source={{
                  html: buildYouTubeHtml(embed.videoId),
                  baseUrl: 'https://assunnah.app',
                }}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                onLoadEnd={() => setWebLoading(false)}
              />
              {webLoading && (
                <View style={styles.loaderOverlay}>
                  <ActivityIndicator size="large" color="#EF4444" />
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.9} onPress={handlePlayPress} style={styles.thumbnailWrap}>
              <Image
                source={{ uri: embed.thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
              />
              <View style={styles.thumbDarkOverlay} />

              {/* Platform Badge */}
              <View style={styles.ytBadge}>
                <Ionicons name="logo-youtube" size={14} color="#FFFFFF" />
                <Text style={styles.badgeLabel}>
                  {embed.isShort ? 'YouTube Shorts' : embed.isLive ? 'YouTube Live' : 'YouTube ভিডিও'}
                </Text>
              </View>

              {/* Center Play Button */}
              <View style={styles.playCircle}>
                <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Bar */}
        <View style={styles.embedFooter}>
          <TouchableOpacity
            onPress={playing ? handleStopPress : handlePlayPress}
            style={styles.footerActionLeft}
            activeOpacity={0.7}
          >
            <Ionicons
              name={playing ? 'stop-circle-outline' : 'play-circle-outline'}
              size={16}
              color="#EF4444"
            />
            <Text style={[styles.footerText, { color: colors?.text || '#0F172A' }]}>
              {playing ? 'ভিডিও বন্ধ করুন' : 'অ্যাপের ভেতরে দেখুন'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRightBtns}>
            <TouchableOpacity
              onPress={(e) => {
                stopProp(e);
                setModalVisible(true);
              }}
              style={styles.smallIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="expand-outline" size={15} color={colors?.textSecondary || '#64748B'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openExternal} style={styles.smallIconBtn} activeOpacity={0.7}>
              <Ionicons name="open-outline" size={15} color={colors?.textSecondary || '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>

        <InAppWebModal
          visible={modalVisible}
          url={embed.url}
          title="YouTube ভিডিও"
          colors={colors}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );
  }

  // ==================== FACEBOOK EMBED ====================
  const fbLabel =
    embed.fbType === 'reel'
      ? 'Facebook রিলস'
      : embed.fbType === 'video'
        ? 'Facebook ভিডিও'
        : 'Facebook পোস্ট';

  const handleOpenFbInlineOrModal = (e) => {
    stopProp(e);
    if (!WebViewComponent) {
      Linking.openURL(embed.url).catch(() => {});
      return;
    }
    if (embed.isShareShortLink || compact) {
      setModalVisible(true);
    } else {
      setWebLoading(true);
      setPlaying((prev) => !prev);
    }
  };

  return (
    <View
      onStartShouldSetResponder={() => true}
      style={[
        styles.embedContainer,
        {
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderColor: isDark ? 'rgba(24, 119, 242, 0.35)' : 'rgba(24, 119, 242, 0.25)',
        },
      ]}
    >
      {/* Card Header */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenFbInlineOrModal}
        style={styles.fbCardTop}
      >
        <View style={styles.fbIconCircle}>
          <Ionicons name="logo-facebook" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.fbTitleRow}>
            <Text style={[styles.fbTitle, { color: colors?.text || '#0F172A' }]}>{fbLabel}</Text>
            <View style={styles.fbChip}>
              <Text style={styles.fbChipText}>Embed</Text>
            </View>
          </View>
          <Text style={[styles.fbUrlText, { color: colors?.textSecondary || '#64748B' }]} numberOfLines={1}>
            {embed.url.replace(/^https?:\/\/(www\.)?/, '')}
          </Text>
        </View>
        <View style={styles.fbPlayBadge}>
          <Ionicons
            name={embed.isVideo ? 'play' : 'eye-outline'}
            size={16}
            color="#1877F2"
          />
        </View>
      </TouchableOpacity>

      {/* Inline Facebook WebView Plugin when toggled */}
      {playing && !embed.isShareShortLink && WebViewComponent && (
        <View style={[styles.fbEmbedWrap, { height: embed.isVideo ? 235 : 360 }]}>
          <WebViewComponent
            source={{
              html: buildFacebookEmbedHtml(embed.pluginUrl, embed.isVideo),
              baseUrl: 'https://www.facebook.com',
            }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            onLoadEnd={() => setWebLoading(false)}
          />
          {webLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="small" color="#1877F2" />
            </View>
          )}
        </View>
      )}

      {/* Footer Actions */}
      <View style={[styles.embedFooter, { borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <TouchableOpacity
          onPress={handleOpenFbInlineOrModal}
          style={styles.footerActionLeft}
          activeOpacity={0.7}
        >
          <Ionicons
            name={playing ? 'chevron-up-circle-outline' : embed.isVideo ? 'play-circle' : 'browsers-outline'}
            size={16}
            color="#1877F2"
          />
          <Text style={[styles.footerText, { color: '#1877F2' }]}>
            {playing ? 'এম্বেড লুকান' : embed.isShareShortLink || compact ? 'অ্যাপের ভেতরে দেখুন' : 'এখানেই দেখুন'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerRightBtns}>
          {!embed.isShareShortLink && (
            <TouchableOpacity
              onPress={(e) => {
                stopProp(e);
                setModalVisible(true);
              }}
              style={styles.smallIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="expand-outline" size={15} color={colors?.textSecondary || '#64748B'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openExternal} style={styles.smallIconBtn} activeOpacity={0.7}>
            <Ionicons name="open-outline" size={15} color={colors?.textSecondary || '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      <InAppWebModal
        visible={modalVisible}
        url={embed.url}
        title={fbLabel}
        colors={colors}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  embedContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
    width: '100%',
  },
  videoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  thumbnailWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  ytBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  webViewWrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  embedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  footerActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallIconBtn: {
    padding: 4,
  },

  // Facebook card
  fbCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  fbIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fbTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  fbChip: {
    backgroundColor: 'rgba(24, 119, 242, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fbChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1877F2',
  },
  fbUrlText: {
    fontSize: 11,
    marginTop: 2,
  },
  fbPlayBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(24, 119, 242, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbEmbedWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  // In-App Browser Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  modalIconBtn: {
    padding: 6,
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalUrl: {
    fontSize: 11,
  },
  modalLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  fallbackCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
