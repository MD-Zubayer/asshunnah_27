import { StyleSheet, Text, View, SectionList, useColorScheme, TouchableOpacity, Modal, Dimensions, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useState } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;

const imageCategories = [
  {
    id: 1,
    title: 'মাদ্রাসা ক্যাম্পাস',
    icon: 'business-outline',
    color: '#2563EB',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/madrasa1.jpg'), name: 'মাদ্রাসা ১' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa2.jpg'), name: 'মাদ্রাসা ২' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa3.jpg'), name: 'মাদ্রাসা ৩' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa4.jpg'), name: 'মাদ্রাসা ৪' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa7.jpg'), name: 'মাদ্রাসা ৭' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa8.jpg'), name: 'মাদ্রাসা ৮' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa9.jpg'), name: 'মাদ্রাসা ৯' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa10.jpg'), name: 'মাদ্রাসা ১০' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa11.jpg'), name: 'মাদ্রাসা ১১' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa88.jpg'), name: 'মাদ্রাসা ৮৮' },
      { file: require('../../assets/expo.icon/Assets/images/madrada5.jpg'), name: 'মাদ্রাসা ৫' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa444.jpg'), name: 'মাদ্রাসা ৪৪৪' },
      { file: require('../../assets/expo.icon/Assets/images/madrasa99.jpg'), name: 'মাদ্রাসা ৯৯' },
    ],
  },
  {
    id: 7,
    title: 'ড্রোন ভিউ ও এরিয়াল ক্যাম্পাস',
    icon: 'airplane-outline',
    color: '#0284C7',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/dji_0285.jpg'), name: 'ড্রোন দৃশ্য ১' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0286.jpg'), name: 'ড্রোন দৃশ্য ২' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0287.jpg'), name: 'ড্রোন দৃশ্য ৩' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0288.jpg'), name: 'ড্রোন দৃশ্য ৪' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0289.jpg'), name: 'ড্রোন দৃশ্য ৫' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0296.jpg'), name: 'ড্রোন দৃশ্য ৬' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0297.jpg'), name: 'ড্রোন দৃশ্য ৭' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0298.jpg'), name: 'ড্রোন দৃশ্য ৮' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0299.jpg'), name: 'ড্রোন দৃশ্য ৯' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0300.jpg'), name: 'ড্রোন দৃশ্য ১০' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0301.jpg'), name: 'ড্রোন দৃশ্য ১১' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0302.jpg'), name: 'ড্রোন দৃশ্য ১২' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0303.jpg'), name: 'ড্রোন দৃশ্য ১৩' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0304.jpg'), name: 'ড্রোন দৃশ্য ১৪' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0305.jpg'), name: 'ড্রোন দৃশ্য ১৫' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0307.jpg'), name: 'ড্রোন দৃশ্য ১৬' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0308.jpg'), name: 'ড্রোন দৃশ্য ১৭' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0309.jpg'), name: 'ড্রোন দৃশ্য ১৮' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0312.jpg'), name: 'ড্রোন দৃশ্য ১৯' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0313.jpg'), name: 'ড্রোন দৃশ্য ২০' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0314.jpg'), name: 'ড্রোন দৃশ্য ২১' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0315.jpg'), name: 'ড্রোন দৃশ্য ২২' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0316.jpg'), name: 'ড্রোন দৃশ্য ২৩' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0317.jpg'), name: 'ড্রোন দৃশ্য ২৪' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0318.jpg'), name: 'ড্রোন দৃশ্য ২৫' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0341.jpg'), name: 'ড্রোন দৃশ্য ২৬' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0350.jpg'), name: 'ড্রোন দৃশ্য ২৭' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0351.jpg'), name: 'ড্রোন দৃশ্য ২৮' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0352.jpg'), name: 'ড্রোন দৃশ্য ২৯' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0353.jpg'), name: 'ড্রোন দৃশ্য ৩০' },
      { file: require('../../assets/expo.icon/Assets/images/dji_0354.jpg'), name: 'ড্রোন দৃশ্য ৩১' },
    ],
  },
  {
    id: 8,
    title: 'জামিয়া অ্যালবাম ও স্মৃতিচারণ',
    icon: 'camera-outline',
    color: '#059669',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_01.jpg'), name: 'ক্যাম্পাস স্মৃতি ১' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_02.jpg'), name: 'ক্যাম্পাস স্মৃতি ২' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_03.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_04.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_05.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_06.jpg'), name: 'ক্যাম্পাস স্মৃতি ৬' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_07.jpg'), name: 'ক্যাম্পাস স্মৃতি ৭' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_08.jpg'), name: 'ক্যাম্পাস স্মৃতি ৮' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_09.jpg'), name: 'ক্যাম্পাস স্মৃতি ৯' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_10.jpg'), name: 'ক্যাম্পাস স্মৃতি ১০' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_11.jpg'), name: 'ক্যাম্পাস স্মৃতি ১১' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_12.jpg'), name: 'ক্যাম্পাস স্মৃতি ১২' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_13.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৩' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_14.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৪' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_15.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৫' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_16.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৬' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_17.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৭' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_18.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৮' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_19.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৯' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_20.jpg'), name: 'ক্যাম্পাস স্মৃতি ২০' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_21.jpg'), name: 'ক্যাম্পাস স্মৃতি ২১' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_22.jpg'), name: 'ক্যাম্পাস স্মৃতি ২২' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_23.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৩' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_24.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৪' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_25.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৫' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_26.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৬' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_27.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৭' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_28.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৮' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_29.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৯' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_30.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩০' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_31.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩১' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_32.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩২' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_33.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৩' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_34.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৪' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_35.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৫' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_36.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৬' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_37.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৭' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_38.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৮' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_39.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৯' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_40.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪০' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_41.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪১' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_42.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪২' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_43.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৩' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_44.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৪' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_45.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৫' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_46.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৬' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_47.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৭' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_48.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৮' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_49.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৯' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_50.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫০' },
      { file: require('../../assets/expo.icon/Assets/images/jamia_album_51.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫১' },
    ],
  },
  {
    id: 2,
    title: 'দারস ও শিক্ষা',
    icon: 'school-outline',
    color: '#9333EA',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/dars.jpg'), name: 'দারস' },
      { file: require('../../assets/expo.icon/Assets/images/dars_adab_01.jpg'), name: 'আদব দারস' },
      { file: require('../../assets/expo.icon/Assets/images/dars_daura_01.jpg'), name: 'দওরা দারস ১' },
      { file: require('../../assets/expo.icon/Assets/images/dars_daura_2.jpg'), name: 'দওরা দারস ২' },
      { file: require('../../assets/expo.icon/Assets/images/dars_daura_3.jpg'), name: 'দওরা দারস ৩' },
      { file: require('../../assets/expo.icon/Assets/images/dars_daura_4.jpg'), name: 'দওরা দারস ৪' },
      { file: require('../../assets/expo.icon/Assets/images/dars_ifta_01.jpg'), name: 'ইফতা দারস' },
      { file: require('../../assets/expo.icon/Assets/images/dars_ulum_01.jpg'), name: 'উলুম দারস' },
    ],
  },
  {
    id: 3,
    title: 'পরীক্ষা হল',
    icon: 'clipboard-outline',
    color: '#059669',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/exam_hall_01.jpg'), name: 'পরীক্ষা হল ১' },
      { file: require('../../assets/expo.icon/Assets/images/exam_hall_02.jpg'), name: 'পরীক্ষা হল ২' },
    ],
  },
  {
    id: 4,
    title: 'বোর্ডিং',
    icon: 'bed-outline',
    color: '#D97706',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/boarding_01.jpg'), name: 'বোর্ডিং ১' },
      { file: require('../../assets/expo.icon/Assets/images/boarding_02.jpg'), name: 'বোর্ডিং ২' },
    ],
  },
  {
    id: 5,
    title: 'মসজিদ',
    icon: 'moon-outline',
    color: '#EC4899',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/masjid.png'), name: 'মসজিদ' },
      { file: require('../../assets/expo.icon/Assets/images/masjid1.png'), name: 'মসজিদ ১' },
      { file: require('../../assets/expo.icon/Assets/images/masjid2.png'), name: 'মসজিদ ২' },
      { file: require('../../assets/expo.icon/Assets/images/masjid3.png'), name: 'মসজিদ ৩' },
    ],
  },
  {
    id: 6,
    title: 'অন্যান্য',
    icon: 'images-outline',
    color: '#DC2626',
    images: [
      { file: require('../../assets/expo.icon/Assets/images/1.jpg'), name: 'ছবি ১' },
      { file: require('../../assets/expo.icon/Assets/images/2.jpg'), name: 'ছবি ২' },
      { file: require('../../assets/expo.icon/Assets/images/3.jpg'), name: 'ছবি ৩' },
      { file: require('../../assets/expo.icon/Assets/images/4.jpg'), name: 'ছবি ৪' },
      { file: require('../../assets/expo.icon/Assets/images/44.jpg'), name: 'ছবি ৪৪' },
      { file: require('../../assets/expo.icon/Assets/images/hefz.png'), name: 'হিফজ' },
      { file: require('../../assets/expo.icon/Assets/images/muallim.png'), name: 'মুআল্লিম' },
      { file: require('../../assets/expo.icon/Assets/images/staf.jpg'), name: 'স্টাফ' },
      { file: require('../../assets/expo.icon/Assets/images/staf1.png'), name: 'স্টাফ পিএনজি' },
      { file: require('../../assets/expo.icon/Assets/images/office_01.jpg'), name: 'অফিস' },
    ],
  },
];

const chunkArray = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

function GalleryImage({ source, label }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={styles.imageCardContent}>
      {!isLoaded && !hasError && (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="images-outline" size={24} color="#94a3b8" />
        </View>
      )}

      {!hasError && (
        <Image
          source={source}
          style={[styles.galleryImage, isLoaded ? styles.galleryImageVisible : styles.galleryImageHidden]}
          resizeMode="cover"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {(isLoaded || hasError) && (
        <View style={styles.imageOverlay}>
          <Text style={styles.imageLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function GalleryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openImage = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const gallerySections = imageCategories.map((category) => ({
    ...category,
    data: chunkArray(category.images, 2),
  }));

  const renderImageRow = ({ item: rowImages, section, index }) => (
    <View style={styles.imageRow}>
      {rowImages.map((img, imgIndex) => (
        <TouchableOpacity
          key={`${section.id}-${index}-${imgIndex}`}
          activeOpacity={0.75}
          onPress={() => openImage(img)}
          style={styles.imageCard}
          pointerEvents="box-only"
        >
          <GalleryImage source={img.file} label={img.name} />
        </TouchableOpacity>
      ))}
      {rowImages.length === 1 && <View style={styles.emptyCard} />}
    </View>
  );

  const renderCategoryHeader = ({ section }) => (
    <View style={styles.categoryWrapper}>
      <View style={[styles.categoryHeader, { borderLeftColor: section.color }]}>
        <Ionicons name={section.icon} size={18} color={section.color} />
        <Text style={[styles.categoryTitle, { color: colors.text }]}>{section.title}</Text>
        <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
          {section.images.length}টি
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>জামিয়াতুস সুন্নাহ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ফটো গ্যালারি</Text>
        </View>
      </View>

      <SectionList
        style={styles.sectionList}
        sections={gallerySections}
        keyExtractor={(item, index) => `${item[0]?.name || 'row'}-${index}`}
        renderSectionHeader={renderCategoryHeader}
        renderItem={renderImageRow}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        scrollEnabled={!modalVisible}
        initialNumToRender={6}
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews={false}
        ListHeaderComponent={
          <View>
            <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="images" size={36} color={colors.accentBlue} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>ফটো গ্যালারি</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  {"জামিয়াতুস সুন্নাহ'র বিরল মুহূর্তের স্মৃতিচিত্র"}
                </Text>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={[styles.footerCard, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
              <View style={[styles.footerInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="heart" size={20} color={colors.accentEmerald} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {"জামিয়াতুস সুন্নাহ'র স্মৃতিময় মুহূর্তগুলি ছবির মাধ্যমে উপভোগ করুন"}
                </Text>
              </View>
            </View>
            <View style={{ height: 60 }} />
          </View>
        }
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.9)' }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={closeModal}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Text style={styles.modalImageName} numberOfLines={1}>
                {selectedImage.name}
              </Text>
            )}
            <View style={{ width: 40 }} />
          </View>

          {/* Image */}
          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <Image
                source={selectedImage.file}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalFooterText}>
              ছবিটি দেখতে ট্যাপ করুন • স্ক্রল করে দেখুন
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroInner: {
    borderRadius: 21,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryWrapper: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryOuter: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  categoryInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  imageRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: 14,
  },
  emptyCard: {
    flex: 1,
  },
  imageCard: {
    flex: 1,
    minHeight: 200,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  imageCardContent: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  galleryImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  imageLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerCard: {
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    marginTop: 8,
  },
  footerInner: {
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
  modalFooter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
  },
  modalFooterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImageVisible: {
    opacity: 1,
  },
  galleryImageHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
});