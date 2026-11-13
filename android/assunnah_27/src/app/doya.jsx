import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ToastAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useEffect, useState, useRef, useMemo } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import ShareOptionsModal from '../components/ShareOptionsModal';
import { getImageUri } from '../utils/image';

const toBn = (num) => {
  if (num === undefined || num === null) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bn[d]);
};

const duas = [
  { id: 1, title: 'ঘুম থেকে ওঠার দোয়া', icon: 'sunny-outline', arabic: 'اَلْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', pronunciation: 'আলহামদু লিল্লা-হিল্লাযী আহ্ইয়া-না- বা\'দা মা- আমা-তানা- ওয়া ইলাইহিন্ নুশূ-র।', meaning: 'সকল প্রশংসা সেই আল্লাহর জন্য, যিনি আমাদেরকে মৃত্যুর পর (ঘুমের পর) জীবন দান করেছেন এবং তাঁরই দিকে আমাদের পুনরুত্থান।', pronunciationAudio: null, recitationAudio: null },
  { id: 2, title: 'ঘুমাতে যাওয়ার দোয়া', icon: 'moon-outline', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', pronunciation: 'বিস্‌মিকাল্লা-হুম্মা আমূতু ওয়া আহ্ইয়া।', meaning: 'হে আল্লাহ! তোমারই নামে আমি মৃত্যুবরণ করছি (ঘুমাচ্ছি) এবং তোমারই নামে জীবিত (জাগ্রত) হব।', pronunciationAudio: null, recitationAudio: null },
  { id: 3, title: 'বাড়িতে প্রবেশের দোয়া', icon: 'home-outline', arabic: 'بِسْمِ اللهِ وَلَجْنَا، وَبِسْمِ اللهِ خَرَجْنَا، وَعَلَى الله رَبِّنَا تَوَكَّلْنَا', pronunciation: 'বিসমিল্লা-হি ওয়ালাজনা, ওয়া বিসমিল্লা-হি খারাজনা, ওয়া \'আলা রব্বিনা তাওয়াক্কালনা।', meaning: 'আল্লাহর নামে আমরা প্রবেশ করলাম এবং আল্লাহর নামেই আমরা বের হলাম এবং আমাদের রব আল্লাহর উপরই আমরা ভরসা করলাম।', pronunciationAudio: null, recitationAudio: null },
  { id: 4, title: 'বাড়ি থেকে বের হওয়ার দোয়া', icon: 'walk-outline', arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', pronunciation: 'বিসমিল্লা-হি, তাওয়াক্কালতু \'আলাল্লা-হ, লা হাওলা ওয়ালা ক্বুওয়াতা ইল্লা বিল্লা-হ।', meaning: 'আল্লাহর নামে (বের হচ্ছি), আল্লাহর উপর ভরসা করছি, আল্লাহ ছাড়া কোনো আশ্রয় ও ক্ষমতা নেই।', pronunciationAudio: null, recitationAudio: null },
  { id: 5, title: 'খাবার খাওয়ার আগের দোয়া', icon: 'restaurant-outline', arabic: 'بِسْمِ اللَّهِ', pronunciation: 'বিসমিল্লা-হ।', meaning: 'আল্লাহর নামে (শুরু করছি)।', pronunciationAudio: null, recitationAudio: null },
];

function DoyaScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const isStaff = user?.is_staff;

  const [selectedDua, setSelectedDua] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [duaList, setDuaList] = useState(duas);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDuaId, setCopiedDuaId] = useState(null);
  const playerRef = useRef(null);

  const filteredDuaList = useMemo(() => {
    if (!searchQuery.trim()) return duaList;
    const q = searchQuery.toLowerCase().trim();
    return duaList.filter((d) => {
      const matchTitle = (d.title || '').toLowerCase().includes(q);
      const matchPron = (d.pronunciation || '').toLowerCase().includes(q);
      const matchMean = (d.meaning || '').toLowerCase().includes(q);
      const matchArab = (d.arabic || '').includes(q);
      return matchTitle || matchPron || matchMean || matchArab;
    });
  }, [duaList, searchQuery]);

  const copyDuaText = async (dua) => {
    const textToCopy = `${dua.title}\n\n${dua.arabic}\n\nউচ্চারণ: ${dua.pronunciation || ''}\n\nঅর্থ: ${dua.meaning || ''}\n\n[সংগৃহীত: জামিয়াতুস সুন্নাহ]`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedDuaId(dua.id);
    if (Platform.OS === 'android') {
      ToastAndroid.show('দোয়া কপি করা হয়েছে', ToastAndroid.SHORT);
    }
    setTimeout(() => {
      setCopiedDuaId((cur) => (cur === dua.id ? null : cur));
    }, 2000);
  };

  // FileSystem & Offline Audio State
  const [downloadingIds, setDownloadingIds] = useState({});
  const [localAudioPaths, setLocalAudioPaths] = useState({});

  const getDuaDir = () => FileSystem.documentDirectory + 'duas/';

  const getFilenameFromUrl = (url) => {
    if (!url) return '';
    const decodedUrl = decodeURIComponent(url);
    const parts = decodedUrl.split('/');
    return parts[parts.length - 1];
  };

  useEffect(() => {
    let isMounted = true;
    const scan = async () => {
      try {
        const dir = getDuaDir();
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        const files = await FileSystem.readDirectoryAsync(dir);
        const paths = {};
        files.forEach((file) => {
          paths[file] = dir + file;
        });
        if (isMounted) {
          setLocalAudioPaths(paths);
        }
      } catch (_err) {
        // scan error
      }
    };
    scan();
    return () => {
      isMounted = false;
    };
  }, [duaList]);

  const getAudioPlayUri = (remoteUrl) => {
    if (!remoteUrl) return null;
    const filename = getFilenameFromUrl(remoteUrl);
    if (localAudioPaths[filename]) {
      return localAudioPaths[filename];
    }
    return remoteUrl;
  };

  const isAudioDownloaded = (remoteUrl) => {
    if (!remoteUrl) return false;
    const filename = getFilenameFromUrl(remoteUrl);
    return !!localAudioPaths[filename];
  };

  const downloadAudio = async (remoteUrl, id) => {
    if (!remoteUrl) return;
    const filename = getFilenameFromUrl(remoteUrl);
    const localUri = getDuaDir() + filename;

    try {
      setDownloadingIds((prev) => ({ ...prev, [id]: true }));
      const dirInfo = await FileSystem.getInfoAsync(getDuaDir());
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(getDuaDir(), { intermediates: true });
      }
      const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
      setLocalAudioPaths((prev) => ({ ...prev, [filename]: uri }));
      Alert.alert('সফল', 'অডিও ডাউনলোড সম্পন্ন হয়েছে। এখন অফলাইনেও শুনতে পারবেন।');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('ত্রুটি', 'অডিও ডাউনলোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const deleteLocalAudio = async (remoteUrl) => {
    if (!remoteUrl) return;
    const filename = getFilenameFromUrl(remoteUrl);
    const localUri = localAudioPaths[filename];
    if (!localUri) return;

    Alert.alert(
      'ডিলিট করুন',
      'আপনি কি ডিভাইস থেকে এই অডিও ফাইলটি ডিলিট করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'ডিলিট',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(localUri, { idempotent: true });
              setLocalAudioPaths((prev) => {
                const updated = { ...prev };
                delete updated[filename];
                return updated;
              });
              Alert.alert('সফল', 'ডিভাইস থেকে অডিও ফাইলটি ডিলিট করা হয়েছে।');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('ত্রুটি', 'ফাইল ডিলিট করতে সমস্যা হয়েছে।');
            }
          }
        }
      ]
    );
  };

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDuaData, setShareDuaData] = useState(null);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
      }
    };
  }, []);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    arabic: '',
    pronunciation: '',
    meaning: '',
    icon: 'hand-left-outline',
    audio: null,
  });

  const pickAudioFile = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });

      if (result.type === 'success') {
        const audioFile = result.assets?.[0] ?? result;
        setUploadForm({
          ...uploadForm,
          audio: audioFile,
        });
      }
    } catch (_err) {
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const uploadNewDua = async () => {
    if (!uploadForm.title || !uploadForm.arabic) {
      Alert.alert('Error', 'Please fill title and Arabic text');
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('arabic', uploadForm.arabic);
    formData.append('pronunciation', uploadForm.pronunciation);
    formData.append('meaning', uploadForm.meaning);
    formData.append('icon', uploadForm.icon);

    if (uploadForm.audio) {
      formData.append('audio', {
        uri: uploadForm.audio.uri,
        name: uploadForm.audio.name || 'dua_audio.mp3',
        type: uploadForm.audio.mimeType || uploadForm.audio.type || 'audio/mpeg',
      });
    }

    try {
      const response = await fetch(API_ENDPOINTS.DUAS, {
        method: 'POST',
        headers: {
          Authorization: token ? `Token ${token}` : '',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setDuaList([result, ...duaList]);
        Alert.alert('Success', 'Dua uploaded successfully!');
        setUploadModalVisible(false);
        setUploadForm({
          title: '',
          arabic: '',
          pronunciation: '',
          meaning: '',
          icon: 'hand-left-outline',
          audio: null,
        });
        return;
      }

      const errorBody = await response.json();
      Alert.alert('Upload failed', JSON.stringify(errorBody));
    } catch (error) {
      Alert.alert('Upload failed', error.message || 'Something went wrong');
    }
  };

  const playAudio = async (audioUri, id) => {
    try {
      const playUri = getAudioPlayUri(audioUri);
      if (!playUri) return;

      // 1. If currently playing this audio, stop it
      if (playingAudioId === id) {
        if (playerRef.current) {
          playerRef.current.pause();
          playerRef.current.release();
          playerRef.current = null;
        }
        setPlayingAudioId(null);
        return;
      }

      // 2. If playing something else, stop it
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
        playerRef.current = null;
      }

      // 3. Create a new audio player and start playing
      setPlayingAudioId(id);
      console.log('[Audio] Attempting to play URI:', playUri);
      const player = createAudioPlayer({ uri: playUri });
      playerRef.current = player;
      
      // Listen for when it finishes
      player.addListener('playbackStatusUpdate', (status) => {
        if (!status.playing && status.currentTime >= status.duration) {
          setPlayingAudioId(null);
          player.release();
          if (playerRef.current === player) {
            playerRef.current = null;
          }
        }
      });

      player.play();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to play audio');
      setPlayingAudioId(null);
    }
  };

  useEffect(() => {
    const fetchDuas = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.DUAS, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setDuaList(data);
        }
      } catch (error) {
        console.error('Failed to load duas', error);
      }
    };

    fetchDuas();
  }, [token]);

  const normalizeAudioUri = (audioValue) => {
    if (!audioValue) return null;
    const uri = typeof audioValue === 'string' ? audioValue : (audioValue.uri || null);
    if (!uri) return null;
    return getImageUri(uri);
  };

  const shareDua = (dua) => {
    setShareDuaData(dua);
    setShowShareModal(true);
  };

  const handleDuaShare = async (platform) => {
    // Track share if needed (optional for duas)
    console.log(`Dua shared via: ${platform}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>প্রয়োজনীয় দোয়া</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>দোয়া সমূহ</Text>
        </View>
        {isStaff && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setUploadModalVisible(true)}
            style={[styles.uploadButton, { backgroundColor: colors.accentBlue }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroContentRow}>
            <View style={[styles.heroIconBadge, { backgroundColor: `${colors.accentEmerald}18` }]}>
              <Ionicons name="hand-left" size={26} color={colors.accentEmerald} />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={[styles.heroMainTitle, { color: colors.text }]}>প্রয়োজনীয় দোয়া ও আমল</Text>
              <Text style={[styles.heroSubLabel, { color: colors.textSecondary }]}>
                দৈনন্দিন জীবনের সহীহ দোয়া সমূহ • {toBn(filteredDuaList.length)} টি দোয়া
              </Text>
            </View>
          </View>
        </View>

        {/* Live Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={18} color={colors.accentEmerald} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="দোয়া খুঁজুন (নাম, উচ্চারণ বা অর্থ)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Full Daily Amol & Dua Book Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/doinondin-amol')}
          style={styles.bookBanner}
        >
          <View style={styles.bookBannerIcon}>
            <Ionicons name="book" size={22} color="#FDE68A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookBannerTitle}>
              দৈনন্দিন আমল ও দু‘আসমূহ (সম্পূর্ণ কিতাব)
            </Text>
            <Text style={styles.bookBannerSub}>
              সকাল-সন্ধ্যা, নামাযের পর, ইস্তিগফার, দুরূদ, সফর, বিশেষ আমল ও ৯৯ নাম
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FDE68A" />
        </TouchableOpacity>

        {/* Empty state for search */}
        {filteredDuaList.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>কোনো দোয়া পাওয়া যায়নি</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              &quot;{searchQuery}&quot; এর সাথে মিলে এমন কোনো দোয়া নেই। অন্য কি-ওয়ার্ড দিয়ে খুঁজুন।
            </Text>
          </View>
        )}

        {/* Modern Duas List */}
        {filteredDuaList.map((dua) => {
          const isExpanded = selectedDua === dua.id;
          const isCopied = copiedDuaId === dua.id;
          const rawAudio = dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio;
          const normalizedAudio = normalizeAudioUri(rawAudio);
          const isDownloaded = isAudioDownloaded(normalizedAudio);
          const isDownloading = downloadingIds[`${dua.id}-audio`];
          const isPlaying = playingAudioId === `${dua.id}-audio`;

          return (
            <View
              key={dua.id}
              style={[
                styles.modernCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isExpanded ? colors.accentEmerald : colors.cardBorder,
                  shadowColor: isDark ? '#000' : '#059669',
                },
              ]}
            >
              {/* Header (Tap to expand/collapse) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedDua(isExpanded ? null : dua.id)}
                style={styles.cardHeaderPress}
              >
                <View style={styles.headerLeftGroup}>
                  <View
                    style={[
                      styles.duaNumberBadge,
                      {
                        backgroundColor: isExpanded ? `${colors.accentEmerald}20` : colors.inputBg,
                        borderColor: isExpanded ? colors.accentEmerald : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.duaNumberText,
                        { color: isExpanded ? colors.accentEmerald : colors.textSecondary },
                      ]}
                    >
                      {toBn(dua.id)}
                    </Text>
                  </View>
                  <View style={styles.duaTitleCol}>
                    <Text style={[styles.modernDuaTitle, { color: colors.text }]}>
                      {dua.title}
                    </Text>
                    {!isExpanded && (
                      <Text
                        style={[styles.collapsedArabicPreview, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {dua.arabic}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.headerRightActions}>
                  <TouchableOpacity
                    onPress={() => shareDua(dua)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.smallIconBtn, { backgroundColor: colors.inputBg }]}
                  >
                    <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.chevronCircle,
                      {
                        backgroundColor: isExpanded ? `${colors.accentEmerald}15` : colors.inputBg,
                        transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                      },
                    ]}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={isExpanded ? colors.accentEmerald : colors.textMuted}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={[styles.modernCardBody, { borderTopColor: colors.cardBorder }]}>
                  {/* Arabic Text Box with Calligraphy Styling */}
                  <View
                    style={[
                      styles.arabicDisplayBox,
                      {
                        backgroundColor: isDark ? 'rgba(6, 78, 59, 0.15)' : 'rgba(236, 253, 245, 0.85)',
                        borderColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(167, 243, 208, 0.8)',
                      },
                    ]}
                  >
                    <View style={styles.arabicActionStrip}>
                      <TouchableOpacity
                        onPress={() => copyDuaText(dua)}
                        style={styles.inlineCopyPill}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                          size={13}
                          color={isCopied ? '#059669' : colors.textMuted}
                        />
                        <Text style={[styles.inlineCopyText, { color: isCopied ? '#059669' : colors.textMuted }]}>
                          {isCopied ? 'কপি হয়েছে' : 'কপি করুন'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.modernArabicText, { color: isDark ? '#E2E8F0' : '#064E3B' }]}>
                      {dua.arabic}
                    </Text>
                  </View>

                  {/* Pronunciation */}
                  {dua.pronunciation ? (
                    <View style={styles.textSectionWrap}>
                      <View style={styles.sectionBadgeRow}>
                        <View style={[styles.sectionBadge, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                          <Text style={[styles.sectionBadgeText, { color: '#0284C7' }]}>উচ্চারণ</Text>
                        </View>
                      </View>
                      <Text style={[styles.modernPronunciationText, { color: colors.text }]}>
                        {dua.pronunciation}
                      </Text>
                    </View>
                  ) : null}

                  {/* Meaning */}
                  {dua.meaning ? (
                    <View style={styles.textSectionWrap}>
                      <View style={styles.sectionBadgeRow}>
                        <View style={[styles.sectionBadge, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                          <Text style={[styles.sectionBadgeText, { color: '#059669' }]}>অর্থ</Text>
                        </View>
                      </View>
                      <Text style={[styles.modernMeaningText, { color: colors.text }]}>
                        {dua.meaning}
                      </Text>
                    </View>
                  ) : null}

                  {/* Modern Audio Player Capsule */}
                  {normalizedAudio && (
                    <View style={styles.audioPlayerStrip}>
                      <TouchableOpacity
                        style={[
                          styles.modernAudioCapsule,
                          {
                            backgroundColor: isPlaying
                              ? (isDark ? '#065F46' : '#D1FAE5')
                              : (isDark ? '#1E293B' : '#F1F5F9'),
                            borderColor: isPlaying ? '#059669' : colors.cardBorder,
                          },
                        ]}
                        onPress={() => playAudio(normalizedAudio, `${dua.id}-audio`)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.audioPlayIconWrap,
                            { backgroundColor: isPlaying ? '#059669' : colors.accentEmerald },
                          ]}
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.modernAudioTitle,
                              { color: isPlaying ? '#059669' : colors.text },
                            ]}
                          >
                            {isPlaying ? 'দোয়া শোনা চলছে...' : 'দোয়া ও অর্থ শুনুন'}
                          </Text>
                          <Text style={[styles.modernAudioSub, { color: colors.textMuted }]}>
                            {isDownloaded ? '💾 অফলাইন সংরক্ষিত' : 'অনলাইন স্ট্রিমিং'}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Download / Offline Management */}
                      {isDownloading ? (
                        <View style={[styles.audioActionSquare, { backgroundColor: colors.inputBg }]}>
                          <ActivityIndicator size="small" color={colors.accentEmerald} />
                        </View>
                      ) : isDownloaded ? (
                        <TouchableOpacity
                          onPress={() => deleteLocalAudio(normalizedAudio)}
                          style={[styles.audioActionSquare, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => downloadAudio(normalizedAudio, `${dua.id}-audio`)}
                          style={[styles.audioActionSquare, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={20} color={colors.accentEmerald} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Upload Modal */}
      {isStaff && (
        <Modal
          visible={uploadModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContainer, { backgroundColor: colors.background }]}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>নতুন দোয়া যোগ করুন</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
              <Text style={[styles.label, { color: colors.text }]}>দোয়ার শিরোনাম *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                placeholder="দোয়ার নাম লিখুন"
                placeholderTextColor={colors.textMuted}
                value={uploadForm.title}
                onChangeText={(text) => setUploadForm({ ...uploadForm, title: text })}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>আরবি টেক্সট *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg, height: 100, textAlignVertical: 'top' }]}
                placeholder="আরবি দোয়া লিখুন"
                placeholderTextColor={colors.textMuted}
                value={uploadForm.arabic}
                onChangeText={(text) => setUploadForm({ ...uploadForm, arabic: text })}
                multiline
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>উচ্চারণ</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg, height: 80, textAlignVertical: 'top' }]}
                placeholder="উচ্চারণ লিখুন"
                placeholderTextColor={colors.textMuted}
                value={uploadForm.pronunciation}
                onChangeText={(text) => setUploadForm({ ...uploadForm, pronunciation: text })}
                multiline
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>অর্থ</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg, height: 100, textAlignVertical: 'top' }]}
                placeholder="দোয়ার অর্থ লিখুন"
                placeholderTextColor={colors.textMuted}
                value={uploadForm.meaning}
                onChangeText={(text) => setUploadForm({ ...uploadForm, meaning: text })}
                multiline
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>দোয়া ও অনুবাদ অডিও</Text>
              <TouchableOpacity
                style={[styles.pickButton, { borderColor: colors.border }]}
                onPress={() => pickAudioFile('audio')}
              >
                <Ionicons name="document-attach" size={20} color={colors.accentBlue} />
                <Text style={[styles.pickButtonText, { color: colors.accentBlue }]}>
                  {uploadForm.audio ? '✓ অডিও নির্বাচিত' : 'অডিও ফাইল বেছে নিন'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.accentBlue }]}
                onPress={uploadNewDua}
              >
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>দোয়া আপলোড করুন</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleDuaShare}
        title={shareDuaData?.title || 'দোয়া'}
        message={shareDuaData ? `${shareDuaData.title}\n\n${shareDuaData.arabic}\n\nউচ্চারণ: ${shareDuaData.pronunciation}\n\nঅর্থ: ${shareDuaData.meaning}` : ''}
      />
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
    borderRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroMainTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  heroSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  bookBanner: {
    backgroundColor: '#065F46',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  bookBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(253,230,138,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBannerTitle: {
    color: '#FFFBEB',
    fontSize: 14.5,
    fontWeight: '900',
  },
  bookBannerSub: {
    color: 'rgba(254,243,199,0.85)',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modernCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeaderPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  duaNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaNumberText: {
    fontSize: 13,
    fontWeight: '800',
  },
  duaTitleCol: {
    flex: 1,
  },
  modernDuaTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  collapsedArabicPreview: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Amiri-Regular',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCardBody: {
    borderTopWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  arabicDisplayBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    paddingTop: 8,
    marginBottom: 14,
  },
  arabicActionStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  inlineCopyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  inlineCopyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modernArabicText: {
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    fontFamily: 'Amiri-Regular',
    writingDirection: 'rtl',
  },
  textSectionWrap: {
    marginBottom: 12,
  },
  sectionBadgeRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modernPronunciationText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  modernMeaningText: {
    fontSize: 14,
    lineHeight: 22,
  },
  audioPlayerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modernAudioCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  audioPlayIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernAudioTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modernAudioSub: {
    fontSize: 11,
    marginTop: 1,
  },
  audioActionSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default DoyaScreen;