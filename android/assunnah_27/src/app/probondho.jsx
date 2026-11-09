import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { articles } from '../data/probondho-data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ======================= প্রবন্ধ রিডার কম্পোনেন্ট =======================

function ArticleReader({ article, onBack, colors }) {
  const [fontSize, setFontSize] = useState(15);

  const increaseFontSize = () => {
    if (fontSize < 22) setFontSize(fontSize + 1);
  };

  const decreaseFontSize = () => {
    if (fontSize > 13) setFontSize(fontSize - 1);
  };

  // অনুচ্ছেদটি কি আরবি বা কোনো শিরোনাম কিনা যাচাই
  const isArabicOnly = (text) => {
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasBangla = /[\u0980-\u09FF]/.test(text);
    return hasArabic && !hasBangla;
  };

  const isHeading = (text) => {
    if (text.length > 70) return false;
    const t = text.trim();
    return (
      t.endsWith(':') ||
      t.endsWith('ঃ') ||
      t.startsWith('আপত্তি:') ||
      t.startsWith('আপত্তি :') ||
      t.startsWith('পরিচ্ছেদ') ||
      t.startsWith('অধ্যায়') ||
      t.startsWith('ঐতিহাসিক')
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* হেডার */}
      <View style={[styles.header, { paddingTop: 16, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>বিষয়ভিত্তিক প্রবন্ধ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{article.title}</Text>
        </View>

        {/* ফন্ট সাইজ কন্ট্রোল */}
        <View style={styles.fontSizeControls}>
          <TouchableOpacity
            onPress={decreaseFontSize}
            style={[styles.fontBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.fontBtnText, { color: colors.text }]}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={increaseFontSize}
            style={[styles.fontBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.fontBtnText, { color: colors.text }]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* আর্টিকেল হিরো কার্ড */}
        <View style={[styles.readerHeroOuter, { backgroundColor: `${article.color}12`, borderColor: `${article.color}30` }]}>
          <View style={[styles.readerHeroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.heroBadgeRow}>
              <View style={[styles.categoryBadge, { backgroundColor: `${article.color}18` }]}>
                <Ionicons name="bookmark" size={11} color={article.color} />
                <Text style={[styles.categoryText, { color: article.color }]}>{article.category}</Text>
              </View>
              {article.readTime ? (
                <View style={[styles.readTimeBadge, { backgroundColor: `${colors.accentPurple}12` }]}>
                  <Ionicons name="time-outline" size={11} color={colors.accentPurple} />
                  <Text style={[styles.readTimeText, { color: colors.accentPurple }]}>{article.readTime}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.readerTitle, { color: colors.text }]}>{article.title}</Text>

            {article.author ? (
              <View style={styles.authorRow}>
                <Ionicons name="person-circle-outline" size={16} color={article.color} />
                <Text style={[styles.authorText, { color: colors.textSecondary }]}>লেখক: {article.author}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* মূল প্রবন্ধের অনুচ্ছেদসমূহ */}
        <View style={styles.articleBody}>
          {article.fullText && article.fullText.map((paragraph, index) => {
            const trimmed = paragraph.trim();

            // যদি কেবল আরবি ইবারত বা হাদিস উদ্ধৃতি হয়
            if (isArabicOnly(trimmed)) {
              return (
                <View
                  key={index}
                  style={[
                    styles.arabicCard,
                    { backgroundColor: `${article.color}08`, borderColor: `${article.color}25` }
                  ]}
                >
                  <Text style={[styles.arabicText, { color: colors.text, fontSize: fontSize + 2 }]}>
                    {trimmed}
                  </Text>
                </View>
              );
            }

            // যদি কোনো সাব-হেডিং বা শিরোনাম হয়
            if (isHeading(trimmed)) {
              return (
                <View key={index} style={styles.headingBox}>
                  <View style={[styles.headingLine, { backgroundColor: article.color }]} />
                  <Text style={[styles.headingText, { color: article.color, fontSize: fontSize + 1.5 }]}>
                    {trimmed}
                  </Text>
                </View>
              );
            }

            // সাধারণ অনুচ্ছেদ
            return (
              <Text
                key={index}
                style={[
                  styles.paragraphText,
                  {
                    color: colors.text,
                    fontSize: fontSize,
                    lineHeight: Math.round(fontSize * 1.8),
                  }
                ]}
              >
                {trimmed}
              </Text>
            );
          })}
        </View>

        {/* সমাপ্তি কার্ড */}
        <View style={[styles.footerCard, { backgroundColor: `${article.color}10`, borderColor: `${article.color}25` }]}>
          <Ionicons name="checkmark-circle-outline" size={28} color={article.color} />
          <Text style={[styles.footerTitle, { color: colors.text }]}>— প্রবন্ধ সমাপ্ত —</Text>
          <TouchableOpacity
            style={[styles.footerBackBtn, { backgroundColor: article.color }]}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#FFF" />
            <Text style={styles.footerBackBtnText}>প্রবন্ধ তালিকায় ফিরে যান</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ======================= মূল স্ক্রিন =======================

export default function ProbondhoScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [view, setView] = useState('main'); // 'main' | 'detail'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'দ্বীন ও আদর্শ', 'ইতিহাস ও ঐতিহ্য', 'আকাইদ ও কালাম', 'ইতিহাস', 'দ্বীন ও ঈমান', 'নারী ও সমাজ', 'স্মৃতি', 'কবিতা'];

  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter(a => a.category === selectedCategory);

  const handleArticlePress = (article) => {
    setSelectedArticle(article);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail') {
      setView('main');
      setSelectedArticle(null);
    } else {
      router.back();
    }
  };

  // ===== Detail / Reader View =====
  if (view === 'detail' && selectedArticle) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ArticleReader
          article={selectedArticle}
          onBack={() => {
            setView('main');
            setSelectedArticle(null);
          }}
          colors={colors}
        />
      </View>
    );
  }

  // ===== Main List View =====
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>জামিয়াতুস সুন্নাহ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>বিষয়ভিত্তিক প্রবন্ধ</Text>
        </View>
        <View style={[styles.articleCountBadge, { backgroundColor: `${colors.accentPurple}15` }]}>
          <Text style={[styles.articleCountBadgeText, { color: colors.accentPurple }]}>{articles.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroOuter, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentPurple}15`, borderColor: `${colors.accentPurple}30` }]}>
              <Ionicons name="newspaper" size={32} color={colors.accentPurple} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>বিষয়ভিত্তিক প্রবন্ধমালা</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              আকাবির, দেওবন্দের অবদান, আকাইদ ও গবেষণামূলক প্রবন্ধসমূহ
            </Text>
          </View>
        </View>

        {/* ক্যাটাগরি ফিল্টার চিপস */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            const label = cat === 'all' ? 'সকল প্রবন্ধ' : cat;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.accentPurple : colors.card,
                    borderColor: isSelected ? colors.accentPurple : colors.cardBorder,
                  }
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFF' : colors.textSecondary }
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* প্রবন্ধের তালিকা */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {selectedCategory === 'all' ? 'নির্বাচিত প্রবন্ধসমূহ' : selectedCategory} ({filteredArticles.length})
        </Text>

        {filteredArticles.map((article) => (
          <TouchableOpacity
            key={article.id}
            style={styles.articleWrapper}
            onPress={() => handleArticlePress(article)}
            activeOpacity={0.7}
          >
            <View style={[styles.articleOuter, { backgroundColor: `${article.color}12`, borderColor: `${article.color}25` }]}>
              <View style={[styles.articleInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {/* কার্ড হেডার */}
                <View style={styles.articleHeader}>
                  <View style={[styles.articleIcon, { backgroundColor: `${article.color}15`, borderColor: `${article.color}30` }]}>
                    <Ionicons name={article.icon} size={20} color={article.color} />
                  </View>
                  <View style={styles.articleTitleArea}>
                    <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: `${article.color}15` }]}>
                        <Text style={[styles.categoryText, { color: article.color }]}>{article.category}</Text>
                      </View>
                      {article.readTime ? (
                        <Text style={[styles.readTimeSmall, { color: colors.textSecondary }]}>
                          • {article.readTime}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* লেখক */}
                {article.author ? (
                  <View style={styles.authorBadgeRow}>
                    <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.authorSnippet, { color: colors.textSecondary }]}>
                      {article.author}
                    </Text>
                  </View>
                ) : null}

                {/* সারসংক্ষেপ / বিষয়বস্তু */}
                <Text style={[styles.articleContent, { color: colors.textSecondary }]} numberOfLines={3}>
                  {article.summary || article.content}
                </Text>

                {/* আরও দেখুন বাটন */}
                <View style={styles.cardFooter}>
                  <View style={[styles.readMoreBadge, { backgroundColor: `${article.color}10` }]}>
                    <Text style={[styles.readMoreText, { color: article.color }]}>সম্পূর্ণ প্রবন্ধ পড়ুন</Text>
                    <Ionicons name="arrow-forward" size={14} color={article.color} />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ======================= স্টাইলসমূহ =======================

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 20,
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
  articleCountBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleCountBadgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero Section
  heroOuter: {
    borderRadius: 22,
    padding: 2.5,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  heroInner: {
    borderRadius: 19,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  // ক্যাটাগরি ফিল্টার চিপস
  categoryScroll: { marginBottom: 16 },
  categoryScrollContent: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },

  // প্রবন্ধ কার্ড
  articleWrapper: { marginBottom: 12 },
  articleOuter: {
    borderRadius: 18,
    padding: 2,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  articleInner: {
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  articleIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleTitleArea: { flex: 1 },
  articleTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
  },
  readTimeSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  authorSnippet: {
    fontSize: 12,
    fontWeight: '600',
  },
  articleContent: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'justify',
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  readMoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ===== রিডার ভিউ স্টাইলসমূহ =====
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fontBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  readerHeroOuter: {
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    marginBottom: 18,
  },
  readerHeroInner: {
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readTimeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  readerTitle: {
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 28,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  authorText: {
    fontSize: 13,
    fontWeight: '700',
  },
  articleBody: {
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  paragraphText: {
    fontWeight: '500',
    textAlign: 'justify',
    marginBottom: 16,
  },
  headingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  headingLine: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  headingText: {
    fontWeight: '800',
    flex: 1,
  },
  arabicCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginVertical: 12,
  },
  arabicText: {
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 30,
    fontFamily: 'serif',
  },
  footerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 14,
  },
  footerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerBackBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
