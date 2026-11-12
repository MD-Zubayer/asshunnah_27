import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import diaryService from '../services/diary-service';
import cacheService, { CacheKeys } from '../services/cacheService';
import { toBanglaDigits, getHijriDate, toISODateString } from '../utils/diaryDate';

/**
 * Convert Bengali/English digits string to standard number
 */
function parseAmount(val) {
  if (!val) return 0;
  const enStr = String(val)
    .replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d))
    .replace(/,/g, '')
    .trim();
  const num = parseFloat(enStr);
  return Number.isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Format currency with Indian comma grouping & Bengali numerals
 */
function formatTaka(num) {
  if (!num || num === 0) return '০ ৳';
  const rounded = Math.round(num);
  const formatted = rounded.toLocaleString('en-IN');
  return `${toBanglaDigits(formatted)} ৳`;
}

export default function ZakatCalculatorScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  // 1. Nisab Market Rates (No default values to prevent calculation errors)
  const [goldRatePerBhori, setGoldRatePerBhori] = useState('');
  const [silverRatePerBhori, setSilverRatePerBhori] = useState('');

  // 2. Assets (যাকাতযোগ্য সম্পদসমূহ)
  const [goldValue, setGoldValue] = useState('');
  const [silverValue, setSilverValue] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [bankBalance, setBankBalance] = useState('');
  const [sanchayapatra, setSanchayapatra] = useState('');
  const [loanReceivable, setLoanReceivable] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [businessGoods, setBusinessGoods] = useState('');
  const [rawMaterials, setRawMaterials] = useState('');
  const [sharesInvest, setSharesInvest] = useState('');

  // 3. Liabilities (যাকাত থেকে বাদ যাওয়ার খাত)
  const [personalDebts, setPersonalDebts] = useState('');
  const [houseBuildingLoan, setHouseBuildingLoan] = useState('');
  const [goodsDue, setGoodsDue] = useState('');
  const [billsDue, setBillsDue] = useState('');
  const [salariesDue, setSalariesDue] = useState('');

  // 4. Adjustments (সমন্বয়)
  const [advanceZakat, setAdvanceZakat] = useState('');
  const [previousDueZakat, setPreviousDueZakat] = useState('');

  // UI state
  const [savingToDiary, setSavingToDiary] = useState(false);
  const [showFiqhModal, setShowFiqhModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Calculations
  const goldRate = parseAmount(goldRatePerBhori);
  const silverRate = parseAmount(silverRatePerBhori);

  // Nisab benchmarks (87.48 gm gold / 612.36 gm silver)
  const goldNisabValue = goldRate > 0 ? goldRate * 7.5 : 0;
  const silverNisabValue = silverRate > 0 ? silverRate * 52.5 : 0;

  // Asset Totals
  const totalGoldSilver = parseAmount(goldValue) + parseAmount(silverValue);
  const totalCash =
    parseAmount(cashInHand) +
    parseAmount(bankBalance) +
    parseAmount(sanchayapatra) +
    parseAmount(loanReceivable) +
    parseAmount(securityDeposit);
  const totalBusiness =
    parseAmount(businessGoods) +
    parseAmount(rawMaterials) +
    parseAmount(sharesInvest);

  const totalAssets = totalGoldSilver + totalCash + totalBusiness;

  // Liabilities Total
  const totalLiabilities =
    parseAmount(personalDebts) +
    parseAmount(houseBuildingLoan) +
    parseAmount(goodsDue) +
    parseAmount(billsDue) +
    parseAmount(salariesDue);

  // Net Wealth
  const netWealth = Math.max(0, totalAssets - totalLiabilities);

  // Applicable Nisab Threshold (Hanafi Fiqh)
  const hasMultipleAssetTypes = totalCash > 0 || totalBusiness > 0 || parseAmount(silverValue) > 0;
  const applicableNisab =
    hasMultipleAssetTypes && silverNisabValue > 0
      ? silverNisabValue
      : goldNisabValue > 0
        ? goldNisabValue
        : silverNisabValue;

  const isRatesProvided = silverRate > 0 || goldRate > 0;
  const isNisabReached = isRatesProvided && applicableNisab > 0 ? netWealth >= applicableNisab : null;

  // Zakat amounts (2.5% or 1/40)
  const baseZakat = isNisabReached ? netWealth * 0.025 : 0;
  const netPayableZakat = Math.max(
    0,
    baseZakat - parseAmount(advanceZakat) + parseAmount(previousDueZakat)
  );

  const showToast = (msg) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handleReset = () => {
    Alert.alert('রিসেট করবেন?', 'সকল ইনপুট মুছে নতুন করে হিসাব করতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'হ্যাঁ, রিসেট করুন',
        style: 'destructive',
        onPress: () => {
          setGoldRatePerBhori('');
          setSilverRatePerBhori('');
          setGoldValue('');
          setSilverValue('');
          setCashInHand('');
          setBankBalance('');
          setSanchayapatra('');
          setLoanReceivable('');
          setSecurityDeposit('');
          setBusinessGoods('');
          setRawMaterials('');
          setSharesInvest('');
          setPersonalDebts('');
          setHouseBuildingLoan('');
          setGoodsDue('');
          setBillsDue('');
          setSalariesDue('');
          setAdvanceZakat('');
          setPreviousDueZakat('');
        },
      },
    ]);
  };

  const buildSummaryText = () => {
    const today = new Date();
    const hijri = getHijriDate(today);
    const engDate = toBanglaDigits(today.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }));

    return `❖ বার্ষিক যাকাত হিসাব খতিয়ান ❖\nতারিখ: ${engDate} (${hijri})\n\n` +
      `[১] নেসাব মানদণ্ড:\n` +
      `• স্বর্ণের দর (ভরি): ${goldRate > 0 ? formatTaka(goldRate) : 'উল্লেখ নেই'}\n` +
      `• রূপার দর (ভরি): ${silverRate > 0 ? formatTaka(silverRate) : 'উল্লেখ নেই'}\n` +
      `• প্রযোজ্য নেসাব মূল্য: ${applicableNisab > 0 ? formatTaka(applicableNisab) : 'দর অপ্রাপ্ত'}\n\n` +
      `[২] যাকাতযোগ্য মোট সম্পদ: ${formatTaka(totalAssets)}\n` +
      `• সোনা ও রূপা: ${formatTaka(totalGoldSilver)}\n` +
      `• নগদ, ব্যাংক ও জমানো অর্থ: ${formatTaka(totalCash)}\n` +
      `• ব্যবসা-বাণিজ্য ও শেয়ার: ${formatTaka(totalBusiness)}\n\n` +
      `[৩] বাদ দেওয়ার মোট দায়/দেনা: ${formatTaka(totalLiabilities)}\n\n` +
      `[৪] নিট যাকাতযোগ্য সম্পদ: ${formatTaka(netWealth)}\n` +
      `• নেসাব স্ট্যাটাস: ${
        isNisabReached === true
          ? 'আলহামদুলিল্লাহ, নেসাব পূর্ণ হয়েছে (যাকাত ফরজ)'
          : isNisabReached === false
            ? 'নেসাব পরিমাণ হয়নি (যাকাত প্রযোজ্য নয়)'
            : 'বাজারদর উল্লেখ করা হয়নি'
      }\n\n` +
      `[৫] চূড়ান্ত যাকাত হিসাব (২.৫%):\n` +
      `• চলতি বছরের মূল যাকাত: ${formatTaka(baseZakat)}\n` +
      `• বাদ: চলতি বছরে অগ্রিম দেওয়া যাকাত: ${formatTaka(parseAmount(advanceZakat))}\n` +
      `• যোগ: পূর্বের বছরের বকেয়া যাকাত: ${formatTaka(parseAmount(previousDueZakat))}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `পরিশোধযোগ্য নিট যাকাত: ${formatTaka(netPayableZakat)}\n\n` +
      `— জামিয়া ইসলামিয়া ইমদাদিয়া অ্যাপ যাকাত ক্যালকুলেটর`;
  };

  const handleCopy = async () => {
    const text = buildSummaryText();
    await Clipboard.setStringAsync(text);
    showToast('যাকাত হিসাব ক্লিপবোর্ডে কপি হয়েছে');
  };

  const handleSaveToDiary = async () => {
    if (totalAssets === 0 && totalLiabilities === 0) {
      Alert.alert('খালি হিসাব', 'সংরক্ষণ করার জন্য সম্পদের পরিমাণ লিখুন।');
      return;
    }

    const today = new Date();
    const hijri = getHijriDate(today);
    const engYear = toBanglaDigits(today.getFullYear());
    const title = `${engYear} সালের যাকাত খতিয়ান (${hijri})`;
    const content = buildSummaryText();

    const payload = {
      title,
      content,
      tag: 'যাকাত',
      emoji: '💰',
      entry_date: toISODateString(today),
      hijri_date: hijri,
      mood: 'আলহামদুলিল্লাহ',
      weather: '',
      paper_theme: isDark ? 'night' : 'cream',
      font_family: 'handwriting',
      is_pinned: true,
    };

    setSavingToDiary(true);
    try {
      if (token) {
        await diaryService.addDiary(token, payload);
      } else {
        // Offline / Unauthenticated local caching
        const cached = await cacheService.getCache(CacheKeys.DIARIES);
        const entries = cached.exists && Array.isArray(cached.data) ? cached.data : [];
        const localEntry = {
          ...payload,
          id: `local_zakat_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        entries.unshift(localEntry);
        await cacheService.setCache(CacheKeys.DIARIES, entries, 1440);
      }

      Alert.alert(
        'সফলভাবে সংরক্ষিত',
        'যাকাত হিসাবটি আপনার ডায়েরির একটি পৃষ্ঠা হিসেবে সংরক্ষিত হয়েছে!',
        [
          { text: 'এখানেই থাকুন', style: 'cancel' },
          {
            text: 'ডায়েরি খুলুন',
            onPress: () => router.push('/(tabs)/diary'),
          },
        ]
      );
    } catch (e) {
      Alert.alert('ত্রুটি', e.message || 'ডায়েরিতে সংরক্ষণ করা যায়নি');
    } finally {
      setSavingToDiary(false);
    }
  };

  const renderInputField = (label, value, onChange, placeholder, hint) => (
    <View style={styles.inputRow}>
      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.inputHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={placeholder || '০'}
          placeholderTextColor={colors.textMuted}
          style={[styles.inputText, { color: colors.text }]}
        />
        <Text style={[styles.takaSuffix, { color: colors.textMuted }]}>৳</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.inputBg }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>যাকাত ক্যালকুলেটর</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            হানাফী ফিকহ ও প্রামাণ্য বিধান অনুযায়ী
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setShowFiqhModal(true)}
            style={[styles.iconBtn, { backgroundColor: '#05966915' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="book-outline" size={20} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReset}
            style={[styles.iconBtn, { backgroundColor: '#EF444415' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Alert about Market Rates */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#064E3B30' : '#ECFDF5', borderColor: '#05966940' }]}>
          <Ionicons name="information-circle" size={22} color="#059669" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              স্বর্ণ ও রূপার বাজারদর সতকর্তা
            </Text>
            <Text style={[styles.infoBannerText, { color: isDark ? '#D1FAE5' : '#047857' }]}>
              ভুল এড়াতে কোনো ডিফল্ট দাম রাখা হয়নি। নেসাব নির্ধারণে আজকের জুয়েলার্স / বাজুস (BAJUS) নির্ধারিত ১ ভরি (১১.৬৬ গ্রাম) স্বর্ণ ও রূপার বিক্রয়মূল্য লিখুন।
            </Text>
          </View>
        </View>

        {/* 1. Nisab Configuration Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#D9770618' }]}>
              <Ionicons name="diamond-outline" size={18} color="#D97706" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>১. আজকের বাজারদর ও নেসাব</Text>
          </View>

          {renderInputField(
            '১ ভরি স্বর্ণের বিক্রয়মূল্য',
            goldRatePerBhori,
            setGoldRatePerBhori,
            'যেমন: ১৫০০০০',
            'সাড়ে ৭ ভরি = ৮৭.৪৮ গ্রাম'
          )}

          {renderInputField(
            '১ ভরি রূপার বিক্রয়মূল্য',
            silverRatePerBhori,
            setSilverRatePerBhori,
            'যেমন: ২৫০০',
            'সাড়ে ৫২ ভরি = ৬১২.৩৬ গ্রাম'
          )}

          <View style={[styles.nisabSummaryRow, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
            <View style={styles.nisabItem}>
              <Text style={[styles.nisabLabel, { color: colors.textMuted }]}>স্বর্ণের নেসাব (৭.৫ ভরি):</Text>
              <Text style={[styles.nisabValue, { color: '#D97706' }]}>
                {goldNisabValue > 0 ? formatTaka(goldNisabValue) : 'দর দিন'}
              </Text>
            </View>
            <View style={styles.nisabDivider} />
            <View style={styles.nisabItem}>
              <Text style={[styles.nisabLabel, { color: colors.textMuted }]}>রূপার নেসাব (৫২.৫ ভরি):</Text>
              <Text style={[styles.nisabValue, { color: '#059669' }]}>
                {silverNisabValue > 0 ? formatTaka(silverNisabValue) : 'দর দিন'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Assets Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#05966918' }]}>
              <Ionicons name="wallet-outline" size={18} color="#059669" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>২. যাকাতযোগ্য সম্পদ (ক)</Text>
          </View>

          <Text style={[styles.subGroupHeader, { color: colors.primary }]}>ক. সোনা ও রূপা</Text>
          {renderInputField('স্বর্ণের বর্তমান আনুমানিক বিক্রয়মূল্য', goldValue, setGoldValue, '০', 'ব্যবহার্য/লকারে রাখা অলংকার ও বার')}
          {renderInputField('রূপার বর্তমান আনুমানিক বিক্রয়মূল্য', silverValue, setSilverValue, '০', 'রূপার অলংকার ও বাসনকোশন')}

          <Text style={[styles.subGroupHeader, { color: colors.primary, marginTop: 12 }]}>খ. নগদ টাকা ও ব্যাংক জমা</Text>
          {renderInputField('হাতে নগদ, চেক ও জমানো অর্থ', cashInHand, setCashInHand, '০', 'হজ বা যেকোনো উদ্দেশ্যে সঞ্চিত টাকা')}
          {renderInputField('ব্যাংক একাউন্ট ও ফিক্সড ডিপোজিট', bankBalance, setBankBalance, '০', 'কারেন্ট, সেভিংস ও এফডিআরে নিজের অংশ')}
          {renderInputField('সঞ্চয়পত্র ও প্রভিডেন্ট ফান্ড', sanchayapatra, setSanchayapatra, '০', 'নিজের জমা করা ও প্রাপ্তি নিশ্চিত অংশ')}
          {renderInputField('ফেরতযোগ্য পাওনা ঋণ', loanReceivable, setLoanReceivable, '০', 'অন্যকে দেওয়া ঋণ যা ফেরত পাওয়ার আশা আছে')}
          {renderInputField('জামানত ও বৈদেশিক মুদ্রা', securityDeposit, setSecurityDeposit, '০', 'সিকিউরিটি ডিপোজিট ও বিদেশী মুদ্রার মান')}

          <Text style={[styles.subGroupHeader, { color: colors.primary, marginTop: 12 }]}>গ. ব্যবসা-বাণিজ্য ও শেয়ার</Text>
          {renderInputField('দোকান ও গোডাউনের বিক্রয়যোগ্য পণ্য', businessGoods, setBusinessGoods, '০', 'বিক্রয়ের জন্য রক্ষিত পণ্যের বর্তমান বাজারমূল্য')}
          {renderInputField('কারখানার কাঁচামাল ও প্রক্রিয়াধীন পণ্য', rawMaterials, setRawMaterials, '০', 'উৎপাদন ও প্রক্রিয়াজাত পণ্য')}
          {renderInputField('ট্রেডিং শেয়ার ও যৌথ ব্যবসার অংশ', sharesInvest, setSharesInvest, '০', 'মূলধন বৃদ্ধির উদ্দেশ্যে কেনা শেয়ার')}

          <View style={[styles.subTotalBadge, { backgroundColor: '#05966915', borderColor: '#05966940' }]}>
            <Text style={[styles.subTotalLabel, { color: colors.text }]}>মোট সম্পদ (ক):</Text>
            <Text style={[styles.subTotalVal, { color: '#059669' }]}>{formatTaka(totalAssets)}</Text>
          </View>
        </View>

        {/* 3. Liabilities Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="remove-circle-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>৩. বাদ দেওয়ার দায়/দেনা (খ)</Text>
          </View>

          {renderInputField('জরুরি প্রয়োজনে নেওয়া ব্যক্তিগত ঋণ', personalDebts, setPersonalDebts, '০', 'চলতি বছরের প্রদেয় ঋণ')}
          {renderInputField('বাড়ি নির্মাণ ও অন্যান্য কিস্তি ঋণ', houseBuildingLoan, setHouseBuildingLoan, '০', 'চলতি মেয়াদের প্রদেয় কিস্তি')}
          {renderInputField('বাকিতে ক্রয়কৃত পণ্যের বকেয়া দেনা', goodsDue, setGoodsDue, '০', 'ব্যবসায়িক মহাজন বা পাওনাদারের দাবি')}
          {renderInputField('বকেয়া ইউটিলিটি বিল', billsDue, setBillsDue, '০', 'বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেট বকেয়া')}
          {renderInputField('কর্মচারীদের বকেয়া বেতন ও বোনাস', salariesDue, setSalariesDue, '০', 'প্রদেয় মজুরি ও বেতন')}

          <View style={[styles.subTotalBadge, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}>
            <Text style={[styles.subTotalLabel, { color: colors.text }]}>মোট দায়/দেনা (খ):</Text>
            <Text style={[styles.subTotalVal, { color: '#EF4444' }]}>{formatTaka(totalLiabilities)}</Text>
          </View>
        </View>

        {/* 4. Adjustments Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#2563EB18' }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>৪. যাকাত সমন্বয়</Text>
          </View>

          {renderInputField(
            'চলতি বছরে আগেই দেওয়া যাকাত (বাদ যাবে)',
            advanceZakat,
            setAdvanceZakat,
            '০',
            'যাকাতের নিয়তে বছরের মাঝে অগ্রিম প্রদান'
          )}

          {renderInputField(
            'পূর্বের বছরের বকেয়া যাকাত (যোগ হবে)',
            previousDueZakat,
            setPreviousDueZakat,
            '০',
            'গত বছরগুলোর অপরিশোধিত যাকাত'
          )}
        </View>

        {/* 5. Final Result Card */}
        <View style={[styles.resultCard, { backgroundColor: isDark ? '#064E3B' : '#047857' }]}>
          <View style={styles.resultHeader}>
            <Ionicons name="calculator" size={24} color="#FDE68A" />
            <Text style={styles.resultTitle}>চূড়ান্ত যাকাত খতিয়ান</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultRowLabel}>মোট যাকাতযোগ্য সম্পদ:</Text>
            <Text style={styles.resultRowVal}>{formatTaka(totalAssets)}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultRowLabel}>বাদ: মোট দায় ও দেনা:</Text>
            <Text style={styles.resultRowVal}>- {formatTaka(totalLiabilities)}</Text>
          </View>

          <View style={styles.resultDivider} />

          <View style={styles.resultRow}>
            <Text style={[styles.resultRowLabel, { fontWeight: '700', color: '#FEF3C7' }]}>
              নিট যাকাতযোগ্য সম্পদ:
            </Text>
            <Text style={[styles.resultRowVal, { fontWeight: '700', color: '#FEF3C7' }]}>
              {formatTaka(netWealth)}
            </Text>
          </View>

          {/* Nisab Assessment Status */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  isNisabReached === true
                    ? '#059669'
                    : isNisabReached === false
                      ? '#B45309'
                      : 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            <Ionicons
              name={
                isNisabReached === true
                  ? 'checkmark-circle'
                  : isNisabReached === false
                    ? 'alert-circle'
                    : 'help-circle'
              }
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.statusPillText}>
              {isNisabReached === true
                ? 'আলহামদুলিল্লাহ, আপনার সম্পদ নেসাব স্পর্শ করেছে। যাকাত ফরজ।'
                : isNisabReached === false
                  ? 'আপনার সম্পদ নেসাব পরিমাণ হয়নি। যাকাত ফরজ নয়।'
                  : 'নেসাব মূল্যায়নের জন্য স্বর্ণ বা রূপার বাজারদর উল্লেখ করুন।'}
            </Text>
          </View>

          <View style={styles.resultDivider} />

          {/* Main Payable Zakat */}
          <View style={styles.finalPayableBox}>
            <Text style={styles.finalPayableLabel}>সর্বমোট প্রদেয় নিট যাকাত (২.৫%):</Text>
            <Text style={styles.finalPayableAmount}>{formatTaka(netPayableZakat)}</Text>
            {isNisabReached === false && (
              <Text style={styles.finalPayableNote}>
                (নেসাব স্পর্শ না করায় বর্তমান হিসাবে যাকাত বাধ্যতামূলক নয়)
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={handleSaveToDiary}
              disabled={savingToDiary}
              style={styles.saveDiaryBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="book" size={18} color="#064E3B" />
              <Text style={styles.saveDiaryBtnText}>
                {savingToDiary ? 'সংরক্ষিত হচ্ছে...' : 'ডায়েরিতে সেভ করুন'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.85}>
              <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>কপি</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fiqh Rules Modal */}
      <Modal
        visible={showFiqhModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiqhModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="book" size={22} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>যাকাতের শরয়ী বিধান</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFiqhModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
              <Text style={[styles.modalSectionHeading, { color: colors.primary }]}>
                ১. যাকাতযোগ্য সম্পদ ৪ প্রকার
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                • সোনা ও রূপা: কাঁচা, বার, মুদ্রা, ব্যবহৃত বা অব্যবহৃত অলংকার এবং লকারে রাখা অংশের সম্পূর্ণ বিক্রয়মূল্য।{'\n'}
                • নগদ টাকা: হাতে নগদ, চেক, ডেবিট কার্ড, প্রাইজবন্ড, বোনাস, হজের টাকা ও ব্যাংকে নিজের অংশ।{'\n'}
                • ব্যবসা-পণ্য: বিক্রয়ের উদ্দেশ্যে রাখা পণ্যের বাজারমূল্য, কারখানার কাঁচামাল ও ফিনিশড প্রডাক্ট।{'\n'}
                • শেয়ার ও বিনিয়োগ: ক্যাপিটাল গেইনের উদ্দেশ্যে কেনা শেয়ারের বাজারমূল্য।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ২. যাকাতের নেসাব
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                • সোনা: সাড়ে সাত ভরি বা ৮৭.৪৮ গ্রাম সোনা।{'\n'}
                • রূপা: সাড়ে বায়ান্ন ভরি বা ৬১২.৩৬ গ্রাম রূপা।{'\n'}
                • নগদ বা ব্যবসা-পণ্য থাকলে: হানাফী ফিকহ অনুযায়ী সাড়ে বায়ান্ন ভরি রূপার সমমূল্যের সম্পদ থাকলে নেসাবের মালিক গণ্য হবে।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ৩. যাকাতের হিসাব কখন করবেন? (যাকাতবর্ষ)
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                ব্যক্তি যেদিন প্রথম নেসাবের মালিক হবে, সেদিন থেকেই তার যাকাতবর্ষ শুরু হয়। চাঁদের হিসাবে যাকাতবর্ষ পূর্ণ হয় ৩৫৪ দিনে। ৩৫৪তম দিনে নেসাব পরিমাণ সম্পদ অবশিষ্ট থাকলে ওই দিন বিদ্যমান সম্পদের ৪০ ভাগের ১ ভাগ তথা ২.৫% যাকাত আদায় করা ফরজ।
              </Text>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowFiqhModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalCloseBtnText}>বুঝেছি</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  subGroupHeader: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    gap: 6,
  },
  inputLabelWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  takaSuffix: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  nisabSummaryRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 4,
  },
  nisabItem: {
    flex: 1,
    alignItems: 'center',
  },
  nisabDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  nisabLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  nisabValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  subTotalBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  subTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  subTotalVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FEF3C7',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultRowLabel: {
    fontSize: 13,
    color: '#D1FAE5',
  },
  resultRowVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusPillText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  finalPayableBox: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    gap: 4,
  },
  finalPayableLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FDE68A',
  },
  finalPayableAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  finalPayableNote: {
    fontSize: 10,
    color: '#D1FAE5',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  saveDiaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDE68A',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveDiaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
