import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { getFavoriteUstads } from '../services/favorite-ustad-service';
import UstadSelectionModal from './UstadSelectionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function FavoriteUstadsSection() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [favorites, setFavorites] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const loadFavorites = async () => {
    const list = await getFavoriteUstads();
    setFavorites(list || []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFavorites();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCall = (name, phone) => {
    if (!phone) {
      Alert.alert('ফোন নম্বর নেই', `${name} হুজুরের যোগাযোগের মোবাইল নম্বর সংরক্ষিত নেই।`);
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('ত্রুটি', 'কল চালু করা যায়নি।');
    });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconBox, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)' }]}>
            <Ionicons name="school" size={18} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>শ্রদ্ধেয় প্রিয় উস্তাদগণ</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {favorites.length > 0 ? `${favorites.length} জন নির্বাচিত` : 'অনুপ্রেরণা ও দোয়ার উসিলা'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.manageBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={14} color="#7C3AED" />
          <Text style={styles.manageBtnText}>
            {favorites.length > 0 ? 'পরিবর্তন' : 'যুক্ত করুন'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content: Empty State or Carousel */}
      {favorites.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)' }]}>
            <Ionicons name="star-outline" size={26} color="#7C3AED" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>পছন্দের উস্তাদ নির্বাচন করুন</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            জামিয়ার সম্মানিত উস্তাদদের মধ্য থেকে আপনার পছন্দের উস্তাদদের যুক্ত করুন যাতে প্রয়োজনে সরাসরি যোগাযোগ ও দোয়া নেওয়া যায়।
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>উস্তাদ নির্বাচন করুন</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 14}
        >
          {favorites.map((ustad) => (
            <View
              key={ustad.id}
              style={[
                styles.ustadCard,
                {
                  width: CARD_WIDTH,
                  backgroundColor: colors.card,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Card Top: Avatar and Badge */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardAvatar, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE' }]}>
                  <Ionicons name="person" size={22} color="#7C3AED" />
                </View>
                <View style={[styles.cardCategoryBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
                  <Text style={styles.cardCategoryText}>{ustad.category || 'উস্তাদ'}</Text>
                </View>
              </View>

              {/* Ustad Details */}
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                  {ustad.name}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {ustad.title}
                </Text>

                {ustad.address ? (
                  <View style={styles.cardAddressRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.cardAddressText, { color: colors.textMuted }]}>{ustad.address}</Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons: Direct Call */}
              <View style={[styles.cardFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                {ustad.phone ? (
                  <TouchableOpacity
                    style={styles.cardCallBtn}
                    onPress={() => handleCall(ustad.name, ustad.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={13} color="#FFFFFF" />
                    <Text style={styles.cardCallBtnText}>সরাসরি কল</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.noPhoneBadge, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.noPhoneText, { color: colors.textMuted }]}>ফোন নম্বর নেই</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Quick Add More Card at end of carousel */}
          <TouchableOpacity
            style={[
              styles.addMoreCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.addMoreIconBox, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#EDE9FE' }]}>
              <Ionicons name="add" size={24} color="#7C3AED" />
            </View>
            <Text style={[styles.addMoreText, { color: colors.text }]}>আরও যোগ করুন</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Selection Modal */}
      <UstadSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={() => loadFavorites()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  addBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  carouselContent: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 4,
  },
  ustadCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardCategoryText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    marginBottom: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAddressText: {
    fontSize: 11,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  cardCallBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  cardCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noPhoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  noPhoneText: {
    fontSize: 11,
  },
  addMoreCard: {
    width: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  addMoreIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
