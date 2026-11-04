/**
 * ShareOptionsModal - Bottom sheet modal with sharing options
 * Shows various social media platforms for sharing content
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Share,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

export default function ShareOptionsModal({
  visible,
  onClose,
  onShare,
  title,
  message,
  url,
}) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  // Share options with translation keys
  const SHARE_OPTIONS = [
    {
      id: 'native',
      nameKey: 'share.more_apps',
      icon: 'share-outline',
      color: '#8B5CF6',
      bgColor: '#F3F0FF',
      isNative: true,
    },
    {
      id: 'facebook',
      nameKey: 'share.facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      bgColor: '#E7F3FF',
    },
    {
      id: 'whatsapp',
      nameKey: 'share.whatsapp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      bgColor: '#E8F8EE',
    },
    {
      id: 'messenger',
      nameKey: 'share.messenger',
      icon: 'logo-messenger',
      color: '#0084FF',
      bgColor: '#E5F3FF',
    },
    {
      id: 'twitter',
      nameKey: 'share.twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      bgColor: '#E5F5FD',
    },
    {
      id: 'telegram',
      nameKey: 'share.telegram',
      icon: 'send',
      color: '#0088CC',
      bgColor: '#E5F4FA',
    },
    {
      id: 'copy_link',
      nameKey: 'share.copy_link',
      icon: 'link-outline',
      color: '#6B7280',
      bgColor: '#F3F4F6',
    },
  ];

  const handleShareOption = async (option) => {
    const shareUrl = url || '';
    const shareMessage = message || title || '';

    // Native share - opens system share sheet
    if (option.isNative) {
      try {
        const result = await Share.share({
          message: shareMessage ? `${shareMessage}\n${shareUrl}` : shareUrl,
          url: shareUrl,
          title: t('share.title'),
        });
        if (result.action === Share.sharedAction) {
          onShare?.('native');
        }
      } catch (error) {
        console.error('Native share error:', error);
        if (error.message !== 'User did not share') {
          Alert.alert(t('common.ok'), t('share.share_error'));
        }
      }
      onClose();
      return;
    }

    switch (option.id) {
      case 'facebook':
        try {
          const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          await Linking.openURL(fbUrl);
          onShare?.('facebook');
        } catch (error) {
          console.error('Facebook share error:', error);
        }
        break;

      case 'whatsapp':
        try {
          const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage + ' ' + shareUrl)}`;
          await Linking.openURL(waUrl);
          onShare?.('whatsapp');
        } catch (error) {
          console.error('WhatsApp share error:', error);
        }
        break;

      case 'messenger':
        try {
          // Try new Messenger deep link scheme first
          const msgUrl = `messenger://share/?link=${encodeURIComponent(shareUrl)}`;
          const supported = await Linking.canOpenURL(msgUrl);
          if (supported) {
            await Linking.openURL(msgUrl);
          } else {
            // Fallback: open Messenger web (m.me)
            const webUrl = `https://m.me/?link=${encodeURIComponent(shareUrl)}`;
            await Linking.openURL(webUrl);
          }
          onShare?.('messenger');
        } catch (error) {
          console.error('Messenger share error:', error);
          // Final fallback to web
          try {
            await Linking.openURL(`https://m.me/?link=${encodeURIComponent(shareUrl)}`);
            onShare?.('messenger');
          } catch (e) {
            Alert.alert('Error', 'Messenger-এ শেয়ার করা যায়নি');
          }
        }
        break;

      case 'twitter':
        try {
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`;
          await Linking.openURL(twitterUrl);
          onShare?.('twitter');
        } catch (error) {
          console.error('Twitter share error:', error);
        }
        break;

      case 'telegram':
        try {
          const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`;
          await Linking.openURL(tgUrl);
          onShare?.('telegram');
        } catch (error) {
          console.error('Telegram share error:', error);
        }
        break;

      case 'copy_link':
        try {
          await Clipboard.setStringAsync(shareUrl);
          onShare?.('copy_link');
        } catch (error) {
          console.error('Copy link error:', error);
        }
        break;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.bottomSheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('share.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Share Options Grid */}
          <View style={styles.optionsGrid}>
            {SHARE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => handleShareOption(option)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : option.bgColor },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={28}
                    color={isDark ? '#fff' : option.color}
                  />
                </View>
                <Text style={[styles.optionName, { color: colors.text }]}>
                  {t(option.nameKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.inputBg }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>{t('share.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  optionItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});