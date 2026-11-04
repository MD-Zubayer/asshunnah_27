import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const articles = [
  {
    id: 1,
    title: 'পতনের ইতিহাস',
    icon: 'time-outline',
    color: '#2563EB',
    content: 'বাগদাদ, স্পেন ও অটোম্যান সাম্রাজ্যের পতন—এই তিনটি ইতিহাস মুসলিম বিশ্বে নৈতিক দুর্বলতা, নেতৃত্বের সংকট, রাজনৈতিক বিভাজন এবং বহিরাগত আগ্রাসনের ফলাফলকে সহজ ভাষায় তুলে ধরে। প্রবন্ধে বোঝানো হয়েছে কীভাবে জ্ঞান-সংস্কৃতি, প্রশাসন ও সামরিক শক্তি একসাথে ভেঙে পড়ে।',
    category: 'ইতিহাস',
  },
  {
    id: 2,
    title: 'আহলে কুরআন’দের কুফুরি মতবাদ',
    icon: 'book-outline',
    color: '#9333EA',
    content: 'এই প্রবন্ধে আহলে কুরআন নামধারী কিছু ভ্রান্ত চিন্তাধারার কুফুরী দিকগুলো, নবীজি ও হাদীসের মর্যাদা অস্বীকার, কুরআনের সাথে হাদীসকে পৃথক করে দেখার প্রবণতা, এবং তাদের ভ্রান্ত বিশ্বাসের ওপর আলো ফেলা হয়েছে। এতে স্পষ্টভাবে বোঝানো হয়েছে যে, নবীজি ও তার হাদীসের প্রতি ঈমান অস্বীকার করা কুফুরি।',
    category: 'দ্বীন ও ঈমান',
  },
  {
    id: 3,
    title: 'নারী সংস্কার কমিশনের সুপারিশ পর্যালোচনা',
    icon: 'woman-outline',
    color: '#EC4899',
    content: 'নারী সংস্কার কমিশনের কিছু প্রস্তাব কুরআন-হাদীসের সঙ্গে সাংঘর্ষিক এবং ধর্মীয় অনুভূতিতে আঘাত করছে বলে আলোচিত হয়েছে। প্রবন্ধে উত্তরাধিকার, পারিবারিক আইন, বহুবিবাহ, দত্তক, শ্রম ও অধিকার-সংক্রান্ত প্রস্তাবগুলোর উপর মুসলিম দৃষ্টিকোণ থেকে বিশ্লেষণ দেওয়া হয়েছে।',
    category: 'নারী ও সমাজ',
  },
  {
    id: 4,
    title: 'ভারত উপমহাদেশ মুসলিম নির্যাতন',
    icon: 'flag-outline',
    color: '#059669',
    content: 'এই প্রবন্ধে ভারত উপমহাদেশে মুসলিমদের ঐতিহাসিক অবদান, বর্তমান হিন্দুত্ববাদী আগ্রাসন, ধর্মীয় বৈষম্য, মসজিদ-মাদরাসা ধ্বংস, কাশ্মীর, পাকিস্তান ও শ্রীলঙ্কা-সহ অন্যান্য দেশে মুসলিমদের দুরবস্থার চিত্র তুলে ধরা হয়েছে।',
    category: 'সমাজ ও ইতিহাস',
  },
  {
    id: 5,
    title: 'বিদয়ী কথন',
    icon: 'heart-outline',
    color: '#D97706',
    content: 'শোকতুর ভোর, অলস দুপুর, বিবর্তিত গোধূলি আর আঁধার রাত্রির মতো সময়ের পরিবর্তন আমাদের জীবনের ক্ষুদ্রতাকে মনে করিয়ে দেয়। প্রবন্ধে স্মৃতির টুকরো, জামিয়ার দিনগুলো, বন্ধুত্বের মায়া, ও একদিন হারিয়ে যাওয়া সময়ের অনুভূতি সুন্দর করে ফুটে উঠেছে।',
    category: 'স্মৃতি',
  },
  {
    id: 6,
    title: 'কবিতা',
    icon: 'sparkles-outline',
    color: '#7C3AED',
    content: 'ভাই, আমাদের দিন ফুরিয়ে এলো যাবার পালা, হাসিমুখে নিলাম বিদায়, লুকিয়ে মনের জ্বালা। স্মৃতি সাগরে শেষ বেলার মতো এই কবিতাটা জীবনের মায়া, বিদায়, ভ্রাতৃত্ব আর একাকিত্বের গভীর অনুভূতি প্রকাশ করে।',
    category: 'কবিতা',
  },
];

export default function ProbondhoScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleArticlePress = (article) => {
    router.push({
      pathname: '/article-detail',
      params: {
        id: article.id,
        title: article.title,
        icon: article.icon,
        color: article.color,
        category: article.category,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>বিষয় ভিত্তিক প্রবন্ধ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>প্রবন্ধ সমূহ</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
              <Ionicons name="newspaper" size={36} color={colors.accentBlue} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>বিষয় ভিত্তিক প্রবন্ধ</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>বিভিন্ন ইসলামিক বিষয়ের উপর প্রবন্ধ</Text>
          </View>
        </View>

        {articles.map((article) => (
          <TouchableOpacity key={article.id} style={styles.articleWrapper} onPress={() => handleArticlePress(article)} activeOpacity={0.7}>
            <View style={[styles.articleOuter, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
              <View style={[styles.articleInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.articleHeader}>
                  <View style={[styles.articleIcon, { backgroundColor: `${article.color}15`, borderColor: `${article.color}30` }]}>
                    <Ionicons name={article.icon} size={18} color={article.color} />
                  </View>
                  <View style={styles.articleTitleArea}>
                    <Text style={[styles.articleTitle, { color: colors.text }]}>{article.title}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: `${article.color}20` }]}>
                      <Text style={[styles.categoryText, { color: article.color }]}>{article.category}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.articleContent, { color: colors.textSecondary }]} numberOfLines={2}>{article.content}</Text>
                <View style={[styles.readMoreBadge, { marginTop: 8 }]}>
                  <Text style={[styles.readMoreText, { color: article.color }]}>আরও দেখুন →</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroOuter: { borderRadius: 24, padding: 3, borderWidth: 1, marginBottom: 16, elevation: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  heroInner: { borderRadius: 21, padding: 24, alignItems: 'center', borderWidth: 1 },
  heroIconContainer: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', fontStyle: 'italic' },
  heroSubtitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  articleWrapper: { marginBottom: 10 },
  articleOuter: { borderRadius: 16, padding: 2, borderWidth: 1 },
  articleInner: { borderRadius: 14, padding: 14, borderWidth: 1 },
  articleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  articleIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  articleTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  articleTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontWeight: '700' },
  articleContent: { fontSize: 13, fontWeight: '500', lineHeight: 22, textAlign: 'justify' },
  readMoreBadge: { alignSelf: 'flex-start' },
  readMoreText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});