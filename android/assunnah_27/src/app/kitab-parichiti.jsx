import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useState } from 'react';

const categories = [
  {
    id: 'sihah',
    title: 'সিহাহ সিত্তাহ',
    icon: 'star',
    color: '#D97706',
    books: [
      {
        id: 'bukhari',
        title: 'বুখারী শরীফ',
        subtitle: 'صحيح البخاري',
        icon: 'book',
        color: '#2563EB',
        details: [
          { label: 'পূর্ণ নাম', value: 'الجامع المسند الصحيح المختصر من أمور رسول الله صلى الله عليه وسلم وسننه وأيامه (আল-জামি\'উল মুসনাদুস সহীহুল মুখতাসারু মিন উমুরি রাসূলিল্লাহি ওয়া সুনানিহি ওয়া আইয়্যামিহি)' },
          { label: 'সংকলক', value: 'ইমাম আবু আবদুল্লাহ মুহাম্মদ ইবনে ইসমাঈল বুখারী (রহ.)' },
          { label: 'জন্ম', value: '১৩ শাওয়াল, ১৯৪ হি.' },
          { label: 'মৃত্যু', value: '১ শাওয়াল, ২৫৬ হি. (জীবনকাল: ৬২ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'আবদুল্লাহ ইবনে ইয়াযিদ আল-মুকুরী, আবু বকর আবদুল্লাহ আল-হুমাইদী (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম তিরমিযী (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'আদাবুল মুফরাদ, আত-তারিখুল কাবীর' },
          { label: 'মোট হাদীস', value: '৭২৭৫টি (পুনরাবৃত্তি ছাড়া ২৫১৩টি)' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'তরজমাতুল বাব (শিরোনাম)' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'ফাতহুল বারী, উমদাতুল ক্বারী, ইরশাদুস সারী, আল-কাওকাবুদ্ দুরারী, ফয়যুল বারী, ফযলুল বারী, নাসরুল বারী, ইতমামুল বারী, কাশফুল বারী, লামিউদ্ দারারী' },
        ],
      },
      {
        id: 'muslim',
        title: 'মুসলিম শরীফ',
        subtitle: 'صحيح مسلم',
        icon: 'book',
        color: '#059669',
        details: [
          { label: 'পূর্ণ নাম', value: 'المسند الصحيح المختصر من السنن بنقل العدل عن العدل إلى رسول الله صلى الله عليه وسلم (আল-মুসনাদুস সহীহুল মুখতাসারু মিনাস সুনানি বিনাকলিল আদলি আনিল আদলি ইলা রাসূলিল্লাহি ﷺ)' },
          { label: 'সংকলক', value: 'ইমাম আবুল হুসাইন আসাকিরুদ্দীন মুসলিম ইবনুল হাজ্জাজ (রহ.)' },
          { label: 'জন্ম', value: '২০৪/২০৬ হি.' },
          { label: 'মৃত্যু', value: '২৫ রজব, ২৬১ হি. (জীবনকাল: ৫৫/৫৭ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'ইমাম আহমদ ইবনে হাম্বল (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম তিরমিযী, ইমাম আবু বকর ইবনে খুজাইমা (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'আল-মুসনাদুল কাবীর, আল-আসমা ওয়াল-কুনা' },
          { label: 'মোট হাদীস', value: '১২০০০টি (পুনরাবৃত্তি ছাড়া ৩০৩৩টি)' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'মুকাদ্দামা ও চমৎকার বিন্যাস' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'আল-মিনহাজ (শরহে নববী), আল-ইবতিহাজ, ফাতহুল মুলহিম, তাকমিলাতু ফাতহিল মুলহিম, আল-মুফহিম' },
        ],
      },
      {
        id: 'tirmidhi',
        title: 'তিরমিজী শরীফ',
        subtitle: 'جامع الترمذي',
        icon: 'book',
        color: '#9333EA',
        details: [
          { label: 'পূর্ণ নাম', value: 'الجامع المختصر من السنن عن رسول الله صلى الله عليه وسلم ومعرفة الصحيح والمعلول وما عليه العمل (আল-জামি\'উল মুখতাসারু মিনাস সুনানি আন রাসূলিল্লাহি ওয়া মা\'রিফাতুস সহীহি ওয়াল মা\'লুলি ওয়া মা আলাইহিল আমাল)' },
          { label: 'সংকলক', value: 'ইমাম আবু ঈসা মুহাম্মদ ইবনে ঈসা ইবনে সাওরাহ (রহ.)' },
          { label: 'জন্ম', value: '২০৯ হি.' },
          { label: 'মৃত্যু', value: '১৩ রজব, ২৭৯ হি. (জীবনকাল: ৭০ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'কুতাইবা ইবনে সাঈদ, ইমাম বুখারী (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'আবুল আব্বাস মুহাম্মদ ইবনে আহমদ ইবনে মাহবুব' },
          { label: 'অন্যান্য রচনা', value: 'আল-ইলাল, আশ-শামায়েল' },
          { label: 'মোট হাদীস', value: '৩৯৫৬টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'প্রতিটি হাদীসের সাথে ফিক্বহী আলোচনা, সংযুক্ত মুকাদ্দামা ও কিতাবুল ই\'লাল' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'আরিযাতুল আহওয়াযী, তাকমিলাতু শরহে ইবনি সায়্যিদিন নাস, আল-আরফুশ শাযী, কূতুল মুগতাযী, তুহফাতুল আহওয়াযী, আল-কাওকাবুদ্ দুরারী, মা\'আরিফুস সুনান, দরসে তিরমিযী, তুহফাতুল আলমায়ী, আওনুত তিরমিযী' },
        ],
      },
      {
        id: 'abudawud',
        title: 'আবু দাউদ শরীফ',
        subtitle: 'سنن أبي داود',
        icon: 'book',
        color: '#DC2626',
        details: [
          { label: 'পূর্ণ নাম', value: 'سنن أبي داود (সুনানু আবী দাউদ)' },
          { label: 'সংকলক', value: 'ইমাম আবু দাউদ সুলাইমান ইবনে আশআছ সিজিসতানী (রহ.)' },
          { label: 'জন্ম', value: '২০২ হি.' },
          { label: 'মৃত্যু', value: '১৬ শাওয়াল, ২৭৫ হি. (জীবনকাল: ৭৩ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'কুতাইবা ইবনে সাঈদ, আহমদ ইবনে হাম্বল (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম তিরমিযী, ইমাম নাসাঈ (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'মারাসীল, আন-নাসেখ ওয়াল-মানসুখ' },
          { label: 'মোট হাদীস', value: '৪৮০০টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: '"ক্বলা আবু দাউদ" (قال أبو داود) অংশে ইমাম আবু দাউদের নিজস্ব মন্তব্য' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'আওনুল মা\'বুদ, বাযলুল মাজহুদ, ফাতহুল ওয়াদুদ, আদ্-দুররুল মানদুদ, মা\'আলিমুস সুনান' },
        ],
      },
      {
        id: 'nasai',
        title: 'নাসাঈ শরীফ',
        subtitle: 'السنن الصغرى',
        icon: 'book',
        color: '#0891B2',
        details: [
          { label: 'পূর্ণ নাম', value: 'السنن الصغرى المجتبى (আস-সুনানুস সুগরা আল-মুজতাবা)' },
          { label: 'সংকলক', value: 'আবু আব্দুর রহমান আহমাদ ইবনে শোয়াইব (রহ.)' },
          { label: 'জন্ম', value: '২১৫ হি.' },
          { label: 'মৃত্যু', value: '১৩ সফর, ৩০৩ হি. (জীবনকাল: ৮৮ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'ইমাম আবু দাউদ, ইসহাক ইবনে রাহওয়াই (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'আলী ইবনে জা\'ফর আত-ত্বহাভী, ইমাম সুয়ূতী (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'মুসনাদে আলী, সুনানে কুবরা' },
          { label: 'মোট হাদীস', value: '৫৭৬১টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'বিভিন্ন শিরোনামে একই রেওয়াতের পুনরাবৃত্তি' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'যাহরুর রুবা আলাল মুজতাবা, আত-তা\'লিকাতুস সালাফিয়্যাহ, যাওয়াইদুন নাসাঈ, হাশিয়ায়ে সিন্ধী, আল-ইম\'আন ফী শরহে সুনানিন নাসাঈ' },
        ],
      },
      {
        id: 'ibnmajah',
        title: 'ইবনে মাজাহ শরীফ',
        subtitle: 'سنن ابن ماجه',
        icon: 'book',
        color: '#7C3AED',
        details: [
          { label: 'পূর্ণ নাম', value: 'سنن ابن ماجه (সুনানু ইবনি মাজাহ)' },
          { label: 'সংকলক', value: 'আবু আব্দুল্লাহ মুহাম্মদ ইবনে ইয়াযীদ (রহ.)' },
          { label: 'জন্ম', value: '২০৯ হি.' },
          { label: 'মৃত্যু', value: '২৭৩ হি. (জীবনকাল: ৬৪ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'আবু মুসয়াব আহমদ ইবনে আবুবকর যুহরী, আম্মার ইবনে খালেদ (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'জাফর ইবনে ইদ্রীস, আলী ইবনে সাঈদ ইবনে আব্দুল্লাহ আসকারী (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'আত-তাফসীর, আত-তারীখ' },
          { label: 'মোট হাদীস', value: '৪৩৪১টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'মুকাদ্দামা, হাদীসসমূহ পুনরাবৃত্তি মুক্ত' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'শরহু আলাউদ্দিন মুগলতায়ী, মিসবাহুয যুজাজাহ, ইনজাহুল হাজাহ, শরহু সুনানি ইবনি মাজাহ, মা তামাসসু ইলাইহিল হাজাহ' },
        ],
      },
    ],
  },
  {
    id: 'others',
    title: 'অন্যান্য',
    icon: 'layers',
    color: '#EC4899',
    books: [
      {
        id: 'tahawi',
        title: 'ত্বহাবী শরীফ',
        subtitle: 'شرح معاني الآثار',
        icon: 'book',
        color: '#2563EB',
        details: [
          { label: 'পূর্ণ নাম', value: 'شرح معاني الآثار المختلفة المروية عن رسول الله صلى الله عليه وسلم في الأحكام (শরহু মা\'আনিল আছারিল মুখতালিফাতিল মারবিয়্যাতি আন রাসূলিল্লাহি ﷺ ফিল আহকাম)' },
          { label: 'সংকলক', value: 'ইমাম আবু জাফর আহমদ ইবনে মুহাম্মদ আত-ত্বহাভী (রহ.)' },
          { label: 'জন্ম', value: '২৩৭/২৩৮/২৩৯ হি.' },
          { label: 'মৃত্যু', value: '৩২১ হি. (জীবনকাল: ৮২/৮৩/৮৪ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'ইমাম নাসাঈ, ইমাম মুযানী (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম কুরতুবী, সুলাইমান ইবনে আহমদ তাবরানী (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'আক্বীদাতুত ত্বহাভী, আহকামুল কুরআন, মুশকিলুল আছার' },
          { label: 'মোট হাদীস', value: '৬৯৪৫টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'নজরে ত্বহাভী (ইমাম ত্বহাভীর নিজস্ব বিশ্লেষণ)' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'আমানিউল আহবার, নাখবুল আফকার, ইযাহুত ত্বহাবী' },
        ],
      },
      {
        id: 'muwatta_malik',
        title: 'মুয়াত্তা মালেক',
        subtitle: 'الموطأ لمالك',
        icon: 'book',
        color: '#9333EA',
        details: [
          { label: 'পূর্ণ নাম', value: 'الموطأ (আল-মুয়াত্তা)' },
          { label: 'সংকলক', value: 'ইমাম আবু আব্দুল্লাহ মালেক ইবনে আনাস (রহ.)' },
          { label: 'জন্ম', value: '৯৩/৯৪/৯৫ হি.' },
          { label: 'মৃত্যু', value: '১৪ রবিউল আউয়াল, ১৭৯ হি. (জীবনকাল: ৮৪/৮৫/৮৬ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'আব্দুল্লাহ ইবনে শিহাব যুহরী, নাফে\' (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম শাফী, ইমাম মুহাম্মাদ (রহ.)' },
          { label: 'মোট হাদীস', value: '১৭২০টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'সব রাবী হেজাযী, মদিনাবাসীদের \'ইজমা\' বর্ণনা করেছেন, "উম্মুস সহীহাইন" (বুখারী ও মুসলিমের মা) বলা হয়' },
          { label: 'প্রসিদ্ধ শরাহসমূহ', value: 'আওজাযুল মাসালিক, তানভীরুল হাওয়ালিক, শরহুয যুরকানী' },
        ],
      },
      {
        id: 'muwatta_muhammad',
        title: 'মুয়াত্তা মুহাম্মাদ',
        subtitle: 'الموطأ لمحمد',
        icon: 'book',
        color: '#059669',
        details: [
          { label: 'পূর্ণ নাম', value: 'الموطأ (আল-মুয়াত্তা)' },
          { label: 'সংকলক', value: 'ইমাম আবু আব্দুল্লাহ মুহাম্মদ ইবনে হাসান আশ-শাইবানী (রহ.)' },
          { label: 'জন্ম', value: '১৩২ হি.' },
          { label: 'মৃত্যু', value: '১৮৯ হি. (জীবনকাল: ৫৭ বছর)' },
          { label: 'প্রসিদ্ধ উস্তাদ', value: 'ইমাম আবু হানিফা, ইমাম আবু ইউসুফ (রহ.)' },
          { label: 'প্রসিদ্ধ শাগরেদ', value: 'ইমাম শাফী, আসাদ ইবনে ফুরাত (রহ.)' },
          { label: 'অন্যান্য রচনা', value: 'কিতাবুল হুজ্জাহ আলা আহলিল মদীনা, মাবসুত' },
          { label: 'মোট হাদীস', value: '১১৮০টি' },
          { label: 'প্রধান বৈশিষ্ট্য', value: 'প্রতিটি বিষয়ের হাদীসের সাথে হানাফী মাযহাবের সিদ্ধান্ত প্রমাণসহ বর্ণনা করেছেন' },
          { label: 'প্রসিদ্ধ শরাহ', value: 'আত-তা\'লীকুল মুমাজ্জাদ' },
        ],
      },
    ],
  },
];

export default function KitabParichitiScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedBook, setExpandedBook] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState('sihah');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>দাওরা হাদীস</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>কিতাব পরিচিতি</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
              <Ionicons name="library" size={36} color={colors.accentEmerald} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>কিতাব পরিচিতি</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>দাওরা হাদীসের কিতাব পরিচয়</Text>
          </View>
        </View>

        {categories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
              style={[styles.categoryHeader, { borderLeftColor: category.color }]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15`, borderColor: `${category.color}30` }]}>
                <Ionicons name={category.icon} size={20} color={category.color} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
              <Ionicons name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {expandedCategory === category.id && (
              <View style={styles.booksContainer}>
                {category.books.map((book) => (
                  <TouchableOpacity
                    key={book.id}
                    activeOpacity={0.7}
                    onPress={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
                    style={styles.bookWrapper}
                  >
                    <View style={[styles.bookOuter, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
                      <View style={[styles.bookInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={styles.bookHeader}>
                          <View style={[styles.bookIcon, { backgroundColor: `${book.color}15`, borderColor: `${book.color}30` }]}>
                            <Ionicons name={book.icon} size={22} color={book.color} />
                          </View>
                          <View style={styles.bookTitleArea}>
                            <Text style={[styles.bookTitle, { color: colors.text }]}>{book.title}</Text>
                            <Text style={[styles.bookSubtitle, { color: colors.textSecondary }]}>{book.subtitle}</Text>
                          </View>
                          <Ionicons name={expandedBook === book.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </View>
                        {expandedBook === book.id && (
                          <View style={styles.bookDetails}>
                            {book.details.map((detail, index) => (
                              <View key={index} style={[styles.detailRow, index < book.details.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 8 }]}>
                                <Text style={[styles.detailLabel, { color: book.color }]}>{detail.label}</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{detail.value}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
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
  heroOuter: { borderRadius: 24, padding: 3, borderWidth: 1, marginBottom: 16, elevation: 4, shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  heroInner: { borderRadius: 21, padding: 24, alignItems: 'center', borderWidth: 1 },
  heroIconContainer: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', fontStyle: 'italic' },
  heroSubtitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  categorySection: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderLeftWidth: 4, borderRadius: 4, marginBottom: 8 },
  categoryIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { fontSize: 17, fontWeight: '900', flex: 1 },
  booksContainer: { marginLeft: 4 },
  bookWrapper: { marginBottom: 10 },
  bookOuter: { borderRadius: 16, padding: 2, borderWidth: 1 },
  bookInner: { borderRadius: 14, padding: 14, borderWidth: 1 },
  bookHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bookTitleArea: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '900' },
  bookSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  bookDetails: { marginTop: 14 },
  detailRow: { marginBottom: 4 },
  detailLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '500', lineHeight: 20 },
});