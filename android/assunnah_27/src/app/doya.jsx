import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Share, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useEffect, useState, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import ShareOptionsModal from '../components/ShareOptionsModal';
import { getImageUri } from '../utils/image';

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
  const playerRef = useRef(null);

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

  const scanLocalAudios = async () => {
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
      setLocalAudioPaths(paths);
    } catch (error) {
      console.error('Error scanning local audios:', error);
    }
  };

  useEffect(() => {
    scanLocalAudios();
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
    } catch (error) {
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
      >
        {/* Hero Section */}
        <View style={[styles.heroOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
              <Ionicons name="hand-left" size={36} color={colors.accentEmerald} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>প্রয়োজনীয় দোয়া</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>দৈনন্দিন জীবনের দোয়া সমূহ</Text>
          </View>
        </View>

        {/* Duas List */}
        {duaList.map((dua) => (
          <TouchableOpacity
            key={dua.id}
            activeOpacity={0.7}
            onPress={() => setSelectedDua(selectedDua === dua.id ? null : dua.id)}
            style={styles.duaWrapper}
          >
            <View style={[styles.duaOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.duaInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {/* Header */}
                <View style={styles.duaHeader}>
                  <View style={[styles.duaIcon, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                    <Ionicons name={dua.icon} size={18} color={colors.accentBlue} />
                  </View>
                  <Text style={[styles.duaTitle, { color: colors.text }]}>{dua.id}. {dua.title}</Text>
                  <TouchableOpacity onPress={() => shareDua(dua)} style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Details */}
                {selectedDua === dua.id && (
                  <View style={styles.duaDetails}>
                    <Text style={styles.arabicText}>{dua.arabic}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Text style={[styles.pronunciationLabel, { color: colors.textSecondary }]}>উচ্চারণ:</Text>
                    <Text style={[styles.pronunciationText, { color: colors.text }]}>{dua.pronunciation}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Text style={[styles.meaningLabel, { color: colors.textSecondary }]}>অর্থ:</Text>
                    <Text style={[styles.meaningText, { color: colors.text }]}>{dua.meaning}</Text>

                    {normalizeAudioUri(dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                        <TouchableOpacity
                          style={[styles.audioButton, { flex: 1, backgroundColor: colors.accentEmerald + '20', marginTop: 0 }]}
                          onPress={() => playAudio(normalizeAudioUri(dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio), `${dua.id}-audio`)}
                        >
                          <Ionicons
                            name={playingAudioId === `${dua.id}-audio` ? 'pause-circle' : 'play-circle'}
                            size={20}
                            color={colors.accentEmerald}
                          />
                          <Text style={[styles.audioButtonText, { color: colors.accentEmerald }]}>
                            {playingAudioId === `${dua.id}-audio` ? 'শোনা চলছে...' : 'দোয়া ও অর্থ শুনুন'}
                          </Text>
                        </TouchableOpacity>

                        {/* Download / Delete Action */}
                        {downloadingIds[`${dua.id}-audio`] ? (
                          <ActivityIndicator size="small" color={colors.accentEmerald} style={{ padding: 10 }} />
                        ) : isAudioDownloaded(normalizeAudioUri(dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio)) ? (
                          <TouchableOpacity
                            onPress={() => deleteLocalAudio(normalizeAudioUri(dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio))}
                            style={{ padding: 10, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <Ionicons name="trash" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => downloadAudio(normalizeAudioUri(dua.audio ?? dua.recitation_audio ?? dua.pronunciation_audio), `${dua.id}-audio`)}
                            style={{ padding: 10, borderRadius: 8, backgroundColor: colors.accentEmerald + '15' }}
                          >
                            <Ionicons name="download-outline" size={20} color={colors.accentEmerald} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
    paddingTop: 16,
  },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#059669',
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
  duaWrapper: {
    marginBottom: 14,
  },
  duaOuter: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  duaInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  duaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  shareBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaDetails: {
    marginTop: 12,
  },
  arabicText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'right',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  pronunciationLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  meaningLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  meaningText: {
    fontSize: 13,
    lineHeight: 20,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  audioButtonText: {
    fontSize: 12,
    fontWeight: '700',
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