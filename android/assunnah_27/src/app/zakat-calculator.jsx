import React, { useState, useCallback } from 'react';
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
import { addDiary } from '../services/diary-service';
import { CacheKeys, getCache, setCache } from '../services/cacheService';
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

  // 2. Gold & Silver Quantities (কত ভরি বা গ্রাম আছে)
  const [goldUnit, setGoldUnit] = useState('bhori'); // 'bhori' | 'gram'
  const [goldQuantity, setGoldQuantity] = useState('');
  const [goldExtraCash, setGoldExtraCash] = useState('');

  const [silverUnit, setSilverUnit] = useState('bhori'); // 'bhori' | 'gram'
  const [silverQuantity, setSilverQuantity] = useState('');
  const [silverExtraCash, setSilverExtraCash] = useState('');

  // 3. Cash & Financial Assets (নগদ টাকা ও আর্থিক সম্পদ)
  const [cashInHand, setCashInHand] = useState('');
  const [bankBalance, setBankBalance] = useState('');
  const [sanchayapatra, setSanchayapatra] = useState('');
  const [loanReceivable, setLoanReceivable] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');

  // 4. Business & Investments (ব্যবসা-বাণিজ্য ও শেয়ার)
  const [businessGoods, setBusinessGoods] = useState('');
  const [rawMaterials, setRawMaterials] = useState('');
  const [sharesInvest, setSharesInvest] = useState('');

  // 5. Liabilities (যাকাত থেকে বাদ যাওয়ার খাত)
  const [personalDebts, setPersonalDebts] = useState('');
  const [houseBuildingLoan, setHouseBuildingLoan] = useState('');
  const [goodsDue, setGoodsDue] = useState('');
  const [billsDue, setBillsDue] = useState('');
  const [salariesDue, setSalariesDue] = useState('');

  // 6. Adjustments (সমন্বয়)
  const [advanceZakat, setAdvanceZakat] = useState('');
  const [previousDueZakat, setPreviousDueZakat] = useState('');

  // UI state
  const [savingToDiary, setSavingToDiary] = useState(false);
  const [showFiqhModal, setShowFiqhModal] = useState(false);

  // Calculations
  const goldRate = parseAmount(goldRatePerBhori);
  const silverRate = parseAmount(silverRatePerBhori);

  // Gold calculations
  const rawGoldQty = parseAmount(goldQuantity);
  const goldBhori = goldUnit === 'bhori' ? rawGoldQty : rawGoldQty / 11.664;
  const computedGoldValue = goldRate > 0 && goldBhori > 0 ? Math.round(goldBhori * goldRate) : 0;
  const totalGoldValue = computedGoldValue + parseAmount(goldExtraCash);

  // Silver calculations
  const rawSilverQty = parseAmount(silverQuantity);
  const silverBhori = silverUnit === 'bhori' ? rawSilverQty : rawSilverQty / 11.664;
  const computedSilverValue = silverRate > 0 && silverBhori > 0 ? Math.round(silverBhori * silverRate) : 0;
  const totalSilverValue = computedSilverValue + parseAmount(silverExtraCash);

  // Nisab benchmarks (87.48 gm gold = 7.5 bhori / 612.36 gm silver = 52.5 bhori)
  const goldNisabValue = goldRate > 0 ? goldRate * 7.5 : 0;
  const silverNisabValue = silverRate > 0 ? silverRate * 52.5 : 0;

  // Asset Totals
  const totalGoldSilver = totalGoldValue + totalSilverValue;
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

  // =========================================================================
  // HANAFI FIQH NISAB BENCHMARK (আল-হিদায়া, রদ্দুল মুহতার ও বাদায়েউস সানায়ে')
  // =========================================================================
  // ১. যদি কারও কাছে শুধুমাত্র স্বর্ণ থাকে এবং কোনো প্রকার নগদ টাকা, রূপা বা
  //    ব্যবসাপণ্য না থাকে (১ টাকাও নগদ নেই), কেবল তখনই স্বর্ণের একক নেসাব (৭.৫ ভরি)।
  // ২. যদি স্বর্ণের সাথে সামান্য নগদ টাকা (এমনকি ৫০০/১০০০ টাকা), রূপা বা ব্যবসাপণ্য থাকে,
  //    তাহলে হানাফী মাযহাবের ইজমা (ضم الأموال بالقيمة وأنفع للفقراء) অনুযায়ী
  //    নেসাব হবে রূপার সাড়ে ৫২ ভরির বাজারদর!
  // =========================================================================
  const isPureGoldOnly =
    goldBhori > 0 &&
    totalCash === 0 &&
    totalBusiness === 0 &&
    silverBhori === 0 &&
    parseAmount(silverExtraCash) === 0;

  const isPureSilverOnly =
    silverBhori > 0 &&
    totalCash === 0 &&
    totalBusiness === 0 &&
    goldBhori === 0 &&
    parseAmount(goldExtraCash) === 0;

  const isMixedWealth =
    (totalGoldValue > 0 && (totalCash > 0 || totalBusiness > 0 || totalSilverValue > 0)) ||
    (totalSilverValue > 0 && (totalCash > 0 || totalBusiness > 0)) ||
    (totalCash > 0 || totalBusiness > 0);

  let applicableNisab = 0;
  let nisabExplanation = '';
  let isNisabReached = null;

  if (isPureGoldOnly) {
    applicableNisab = goldNisabValue;
    nisabExplanation = 'আপনার কাছে শুধুই স্বর্ণ রয়েছে (কোনো নগদ টাকা বা রূপা নেই)। তাই একক স্বর্ণের নেসাব (৭.৫ ভরি বা ৮৭.৪৮ গ্রাম) প্রযোজ্য।';
    if (goldBhori >= 7.5) {
      isNisabReached = true;
    } else {
      isNisabReached = false;
    }
  } else if (isMixedWealth || isPureSilverOnly) {
    applicableNisab = silverNisabValue;
    nisabExplanation = isMixedWealth && totalGoldValue > 0
      ? 'হানাফী ফিকহ (আল-হিদায়া ও রদ্দুল মুহতার): আপনার স্বর্ণের সাথে নগদ টাকা/অন্য সম্পদ থাকায় একক স্বর্ণের নেসাব নয়, বরং রূপার নেসাব (সাড়ে ৫২ ভরি) প্রযোজ্য এবং সম্পূর্ণ সম্পদের ওপর যাকাত আসবে।'
      : 'হানাফী ফিকহ অনুযায়ী নগদ টাকা, ব্যবসা ও রূপার নেসাব মানদণ্ড হলো সাড়ে ৫২ ভরি রূপার বাজারদর।';

    if (silverRate > 0) {
      isNisabReached = netWealth >= silverNisabValue;
    } else {
      isNisabReached = null; // Silver rate required
    }
  }

  // Zakat amounts (2.5% or 1/40)
  const baseZakat = isNisabReached === true ? netWealth * 0.025 : 0;
  const netPayableZakat = Math.max(
    0,
    baseZakat - parseAmount(advanceZakat) + parseAmount(previousDueZakat)
  );

  const showToast = (msg) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
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
          setGoldQuantity('');
          setGoldExtraCash('');
          setSilverQuantity('');
          setSilverExtraCash('');
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

  const buildSummaryText = useCallback(() => {
    const today = new Date();
    const hijri = getHijriDate(today);
    const engDate = toBanglaDigits(
      today.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    );

    return `❖ বার্ষিক যাকাত হিসাব খতিয়ান (হানাফী ফিকহ অনুযায়ী) ❖\nতারিখ: ${engDate} (${hijri})\n\n` +
      `[১] বাজারদর ও নেসাব মানদণ্ড:\n` +
      `• রূপার দর (মূল নেসাব): ${silverRate > 0 ? `${formatTaka(silverRate)}/ভরি (সাড়ে ৫২ ভরি = ${formatTaka(silverNisabValue)})` : 'দেওয়া নেই'}\n` +
      `• স্বর্ণের দর: ${goldRate > 0 ? `${formatTaka(goldRate)}/ভরি (সাড়ে ৭ ভরি = ${formatTaka(goldNisabValue)})` : 'দেওয়া নেই'}\n` +
      `• ফিকহ কানুন: ${nisabExplanation}\n\n` +
      `[২] আপনার সম্পদ বিবরণ:\n` +
      `• স্বর্ণ: ${goldBhori > 0 ? `${toBanglaDigits(goldBhori.toFixed(2))} ভরি (${formatTaka(totalGoldValue)})` : 'নেই'}\n` +
      `• রূপা: ${silverBhori > 0 ? `${toBanglaDigits(silverBhori.toFixed(2))} ভরি (${formatTaka(totalSilverValue)})` : 'নেই'}\n` +
      `• নগদ টাকা ও ব্যাংক জমা: ${formatTaka(totalCash)}\n` +
      `• ব্যবসা-বাণিজ্য ও শেয়ার: ${formatTaka(totalBusiness)}\n` +
      `• মোট যাকাতযোগ্য সম্পদ: ${formatTaka(totalAssets)}\n\n` +
      `[৩] বাদ দেওয়ার মোট দায়/দেনা: - ${formatTaka(totalLiabilities)}\n\n` +
      `[৪] নিট যাকাতযোগ্য সম্পদ: ${formatTaka(netWealth)}\n` +
      `• নেসাব স্ট্যাটাস: ${
        isNisabReached === true
          ? 'আলহামদুলিল্লাহ, নেসাব পূর্ণ হয়েছে (সম্পূর্ণ সম্পদের ওপর যাকাত ফরজ)'
          : isNisabReached === false
            ? 'নেসাব পরিমাণ হয়নি (যাকাত প্রযোজ্য নয়)'
            : 'রূপার বাজারদর উল্লেখ না থাকায় অমীমাংসিত'
      }\n\n` +
      `[৫] চূড়ান্ত যাকাত হিসাব (২.৫% বা ৪০ ভাগের ১ ভাগ):\n` +
      `• চলতি বছরের মূল যাকাত: ${formatTaka(baseZakat)}\n` +
      `• বাদ: চলতি বছরে অগ্রিম দেওয়া যাকাত: ${formatTaka(parseAmount(advanceZakat))}\n` +
      `• যোগ: পূর্বের বছরের বকেয়া যাকাত: ${formatTaka(parseAmount(previousDueZakat))}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `পরিশোধযোগ্য নিট যাকাত: ${formatTaka(netPayableZakat)}\n\n` +
      `রেফারেন্স: আল-হিদায়া, রদ্দুল মুহতার আলাদ দুররিল মুখতার (ফাতাওয়া শামী), বাদায়েউস সানায়ে'।\n` +
      `— জামিয়া ইসলামিয়া ইমদাদিয়া অ্যাপ যাকাত ক্যালকুলেটর`;
  }, [
    silverRate,
    silverNisabValue,
    goldRate,
    goldNisabValue,
    nisabExplanation,
    goldBhori,
    totalGoldValue,
    silverBhori,
    totalSilverValue,
    totalCash,
    totalBusiness,
    totalAssets,
    totalLiabilities,
    netWealth,
    isNisabReached,
    baseZakat,
    advanceZakat,
    previousDueZakat,
    netPayableZakat,
  ]);

  const handleCopy = async () => {
    const text = buildSummaryText();
    await Clipboard.setStringAsync(text);
    showToast('যাকাত হিসাব ক্লিপবোর্ডে কপি হয়েছে');
  };

  const handleSaveToDiary = useCallback(async () => {
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
        await addDiary(token, payload);
      } else {
        // Offline / Unauthenticated local caching
        const cached = await getCache(CacheKeys.DIARIES);
        const entries = cached.exists && Array.isArray(cached.data) ? cached.data : [];
        const localEntry = {
          ...payload,
          id: `local_zakat_${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        entries.unshift(localEntry);
        await setCache(CacheKeys.DIARIES, entries, 1440);
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
  }, [totalAssets, totalLiabilities, buildSummaryText, isDark, token, router]);

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

  const renderMetalQuantityCard = (
    label,
    quantityValue,
    onQuantityChange,
    unit,
    onUnitChange,
    computedValue,
    computedBhori,
    rate,
    extraCash,
    onExtraCashChange,
    placeholder
  ) => (
    <View style={[styles.metalBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
      <View style={styles.metalHeaderRow}>
        <Text style={[styles.metalTitle, { color: colors.text }]}>{label}</Text>
        <View style={styles.unitToggleRow}>
          <TouchableOpacity
            onPress={() => onUnitChange('bhori')}
            style={[
              styles.unitToggleBtn,
              unit === 'bhori' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.unitToggleText, { color: unit === 'bhori' ? '#fff' : colors.textMuted }]}>
              ভরি (তোলা)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onUnitChange('gram')}
            style={[
              styles.unitToggleBtn,
              unit === 'gram' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.unitToggleText, { color: unit === 'gram' ? '#fff' : colors.textMuted }]}>
              গ্রাম
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TextInput
          value={quantityValue}
          onChangeText={onQuantityChange}
          keyboardType="decimal-pad"
          placeholder={placeholder || (unit === 'bhori' ? 'যেমন: ৮ বা ৭.৫' : 'যেমন: ৮৭.৫')}
          placeholderTextColor={colors.textMuted}
          style={[styles.inputText, { color: colors.text }]}
        />
        <Text style={[styles.takaSuffix, { color: colors.textMuted }]}>
          {unit === 'bhori' ? 'ভরি' : 'গ্রাম'}
        </Text>
      </View>

      {/* Live computed valuation badge */}
      {parseAmount(quantityValue) > 0 && (
        <View
          style={[
            styles.liveComputedBadge,
            { backgroundColor: rate > 0 ? (isDark ? '#064E3B40' : '#ECFDF5') : (isDark ? '#78350F40' : '#FEF3C7') },
          ]}
        >
          <Ionicons
            name={rate > 0 ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={rate > 0 ? '#059669' : '#D97706'}
          />
          <Text style={[styles.liveComputedText, { color: rate > 0 ? '#059669' : '#D97706' }]}>
            {rate > 0
              ? `হিসাব: ${toBanglaDigits(computedBhori.toFixed(2))} ভরি = ${formatTaka(computedValue)}`
              : `${toBanglaDigits(computedBhori.toFixed(2))} ভরি (টাকার মূল্য পেতে উপরে ১ ভরির দর লিখুন)`}
          </Text>
        </View>
      )}

      {/* Extra cash option */}
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.inputHint, { color: colors.textMuted, marginBottom: 4 }]}>
          + অতিরিক্ত বিক্রয়মূল্য বা নগদ অংশ (যদি থাকে):
        </Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, height: 38 }]}>
          <TextInput
            value={extraCash}
            onChangeText={onExtraCashChange}
            keyboardType="numeric"
            placeholder="০ (ঐচ্ছিক)"
            placeholderTextColor={colors.textMuted}
            style={[styles.inputText, { color: colors.text, fontSize: 13 }]}
          />
          <Text style={[styles.takaSuffix, { color: colors.textMuted }]}>৳</Text>
        </View>
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
            হানাফী ফিকহ (আল-হিদায়া ও ফাতাওয়া শামী) অনুযায়ী
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
          <Ionicons name="shield-checkmark" size={22} color="#059669" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
              হানাফী মাযহাবের মূল নেসাব মানদণ্ড
            </Text>
            <Text style={[styles.infoBannerText, { color: isDark ? '#D1FAE5' : '#047857' }]}>
              স্বর্ণের সাথে সামান্য নগদ টাকা বা রূপা থাকলে রূপার নেসাব (সাড়ে ৫২ ভরি) দ্বারা বিচার হয়। তাই নির্ভুল হিসাবের জন্য নিচে আজকের রূপা ও স্বর্ণের ১ ভরির বাজারদর লিখুন।
            </Text>
          </View>
        </View>

        {/* 1. Nisab Configuration Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#05966918' }]}>
              <Ionicons name="diamond-outline" size={18} color="#059669" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>১. আজকের বাজারদর ও নেসাব</Text>
          </View>

          {renderInputField(
            '১ ভরি রূপার বিক্রয়মূল্য (হানাফী মূল মানদণ্ড)',
            silverRatePerBhori,
            setSilverRatePerBhori,
            'যেমন: ২,৫০০',
            'সাড়ে ৫২ ভরি রূপা = ৬১২.৩৬ গ্রাম'
          )}

          {renderInputField(
            '১ ভরি স্বর্ণের বিক্রয়মূল্য',
            goldRatePerBhori,
            setGoldRatePerBhori,
            'যেমন: ১৫০,০০০',
            'সাড়ে ৭ ভরি সোনা = ৮৭.৪৮ গ্রাম'
          )}

          <View style={[styles.nisabSummaryRow, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
            <View style={styles.nisabItem}>
              <Text style={[styles.nisabLabel, { color: colors.textMuted }]}>রূপার নেসাব (৫২.৫ ভরি):</Text>
              <Text style={[styles.nisabValue, { color: '#059669' }]}>
                {silverNisabValue > 0 ? formatTaka(silverNisabValue) : 'দর দিন'}
              </Text>
            </View>
            <View style={styles.nisabDivider} />
            <View style={styles.nisabItem}>
              <Text style={[styles.nisabLabel, { color: colors.textMuted }]}>স্বর্ণের নেসাব (৭.৫ ভরি):</Text>
              <Text style={[styles.nisabValue, { color: '#D97706' }]}>
                {goldNisabValue > 0 ? formatTaka(goldNisabValue) : 'দর দিন'}
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

          <Text style={[styles.subGroupHeader, { color: colors.primary }]}>ক. স্বর্ণ ও রৌপ্যের পরিমাণ</Text>

          {/* Gold Input Card */}
          {renderMetalQuantityCard(
            'আপনার কাছে থাকা স্বর্ণের পরিমাণ',
            goldQuantity,
            setGoldQuantity,
            goldUnit,
            setGoldUnit,
            computedGoldValue,
            goldBhori,
            goldRate,
            goldExtraCash,
            setGoldExtraCash,
            'যেমন: ৮ বা ৭.৫'
          )}

          {/* Silver Input Card */}
          {renderMetalQuantityCard(
            'আপনার কাছে থাকা রূপার পরিমাণ',
            silverQuantity,
            setSilverQuantity,
            silverUnit,
            setSilverUnit,
            computedSilverValue,
            silverBhori,
            silverRate,
            silverExtraCash,
            setSilverExtraCash,
            'যেমন: ৬০ বা ৫২.৫'
          )}

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

        {/* Dynamic Hanafi Fiqh Insight Card */}
        {nisabExplanation ? (
          <View style={[styles.fiqhInsightCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
              <Text style={[styles.fiqhInsightTitle, { color: colors.primary }]}>
                হানাফী ফিকহ সিদ্ধান্ত (আল-হিদায়া ও রদ্দুল মুহতার)
              </Text>
            </View>
            <Text style={[styles.fiqhInsightText, { color: colors.textSecondary }]}>
              {nisabExplanation}
            </Text>
            {isMixedWealth && silverRate === 0 && (
              <View style={styles.warningPill}>
                <Ionicons name="warning" size={14} color="#B45309" />
                <Text style={styles.warningPillText}>
                  সতর্কতা: আপনার স্বর্ণের সাথে নগদ/অন্যান্য সম্পদ থাকায় নেসাব যাচাইয়ের জন্য উপরে রূপার ভরির দর দেওয়া আবশ্যক।
                </Text>
              </View>
            )}
          </View>
        ) : null}

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
                ? `আলহামদুলিল্লাহ, নেসাব পূর্ণ হয়েছে (${applicableNisab > 0 ? formatTaka(applicableNisab) : ''})। সম্পূর্ণ সম্পদের ওপর যাকাত ফরজ।`
                : isNisabReached === false
                  ? `আপনার সম্পদ নেসাব পরিমাণ হয়নি (${applicableNisab > 0 ? formatTaka(applicableNisab) : ''})। যাকাত ফরজ নয়।`
                  : 'হানাফী ফিকহ অনুযায়ী নেসাব যাচাইয়ের জন্য দয়া করে রূপার বাজারদর লিখুন।'}
            </Text>
          </View>

          <View style={styles.resultDivider} />

          {/* Main Payable Zakat */}
          <View style={styles.finalPayableBox}>
            <Text style={styles.finalPayableLabel}>সর্বমোট প্রদেয় নিট যাকাত (২.৫% বা ৪০ ভাগের ১ ভাগ):</Text>
            <Text style={styles.finalPayableAmount}>{formatTaka(netPayableZakat)}</Text>
            {isNisabReached === false && (
              <Text style={styles.finalPayableNote}>
                (নেসাব স্পর্শ না করায় বর্তমান হিসাবে যাকাত ওয়াজিব নয়)
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

      {/* Fiqh Rules Modal with Classical References */}
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>হানাফী ফিকহের প্রামাণ্য নস ও বিধান</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFiqhModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={true}>
              <Text style={[styles.modalSectionHeading, { color: colors.primary }]}>
                ১. সোনা ও নগদ টাকা একত্রীকরণ (ضم الذهب إلى الفضة والنقد)
              </Text>
              <Text style={[styles.modalArabic, { color: colors.text }]}>
                «وتضم قيمة العروض إلى الثمنين والذهب إلى الفضة قيمة بالإجماع... والمعتمد الضم بالقيمة مطلقاً لأن المقصود هو المالية والغنى وأنفع للفقراء»
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                — রদ্দুল মুহতার আলাদ দুররিল মুখতার (ফাতাওয়া শামী), বাব জাকাতির মাল।{'\n'}
                হানাফী মাযহাবের ইজমা অনুযায়ী: কারও কাছে ৭.৫ ভরির কম সোনা থাকলে এবং সাথে যদি সামান্য কিছু নগদ টাকা, রূপা বা ব্যবসাপণ্য থাকে, তবে উভয়টির মূল্য যোগ হবে এবং সাড়ে বায়ান্ন ভরি রূপার মূল্য অনুযায়ী নেসাব নির্ধারিত হবে। রূপার সমমূল্য হলেই সম্পূর্ণ সোনা ও নগদ টাকার ওপর ২.৫% যাকাত দিতে হবে।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ২. ব্যবহৃত অলংকারের যাকাত (حلي مستعمل)
              </Text>
              <Text style={[styles.modalArabic, { color: colors.text }]}>
                «تجب الزكاة في الحلي مستعملاً كان أو غير مستعمل، تبراً كان أو مصوغاً»
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                — আল-হিদায়া ও আল-বাহরুর রায়েক।{'\n'}
                ইমাম আবু হানীফা (রহ.)-এর মতে নারীদের নিত্য ব্যবহৃত অলংকার হোক বা লকারে রাখা স্বর্ণ—নেসাব পূর্ণ হলে সব ধরণের স্বর্ণ-রৌপ্যেই যাকাত ফরজ।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ৩. যাকাতের নেসাব ও পরিমাণ
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                • সোনা: সাড়ে সাত ভরি (তোলা) বা ৮৭.৪৮ গ্রাম (একক স্বর্ণের ক্ষেত্রে)।{'\n'}
                • রূপা: সাড়ে বায়ান্ন ভরি (তোলা) বা ৬১২.৩৬ গ্রাম রূপা।{'\n'}
                • নগদ বা ব্যবসা থাকলে: সাড়ে বায়ান্ন ভরি রূপার বর্তমান বাজারমূল্যই হানাফী মাযহাবের সর্বজনগ্রাহ্য নেসাব।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ৪. যাকাতবর্ষ ও حولান الحول (Hawlan al-Hawl)
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                ব্যক্তি যেদিন প্রথম নেসাবের মালিক হবে, সেদিন থেকেই তার যাকাতবর্ষ শুরু হয়। চন্দ্রবর্ষ ৩৫৪ দিনে পূর্ণ হয়। ৩৫৪তম দিনে নেসাব পরিমাণ সম্পদ অবশিষ্ট থাকলে ওই দিন বিদ্যমান সমুদয় সম্পদের ৪০ ভাগের ১ ভাগ তথা ২.৫% যাকাত আদায় করা ফরজ।
              </Text>

              <Text style={[styles.modalSectionHeading, { color: colors.primary, marginTop: 12 }]}>
                ৫. দীর্ঘমেয়াদী ঋণের হানাফী ফতোয়া
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                — ফাতাওয়া উসমানী ও আহসানুল ফাতাওয়া।{'\n'}
                গৃহঋণ বা দীর্ঘমেয়াদী ঋণের পুরো মূল টাকা একবারে বাদ যাবে না, বরং চলতি বছরে যে পরিমাণ কিস্তি পরিশোধ করতে হবে, কেবল সেই অংশটুকুই দায় হিসেবে সম্পদ থেকে বিয়োগ হবে।
              </Text>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowFiqhModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalCloseBtnText}>আলহামদুলিল্লাহ, বুঝেছি</Text>
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
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  metalBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  metalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metalTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  unitToggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: '#05966940',
  },
  unitToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unitToggleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveComputedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 2,
  },
  liveComputedText: {
    fontSize: 11,
    fontWeight: '700',
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
  fiqhInsightCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  fiqhInsightTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  fiqhInsightText: {
    fontSize: 11,
    lineHeight: 17,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  warningPillText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '700',
  },
  modalSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalArabic: {
    fontSize: 13,
    fontFamily: 'Amiri-Bold',
    lineHeight: 22,
    marginBottom: 4,
    textAlign: 'right',
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
