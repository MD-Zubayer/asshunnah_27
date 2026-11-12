import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { API_ENDPOINTS } from '../constants/api';
import {
  TOTAL_QURAN_PAGES,
  QURAN_PARAS,
  QURAN_SURAHS,
  QURAN_SIJDAHS,
  getQuranPageInfo,
} from '../data/quranIndex';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STORAGE_KEY_LAST_READ = '@hafezi_quran_last_read';
const STORAGE_KEY_BOOKMARKS = '@hafezi_quran_bookmarks';

// Convert English numbers to Bengali numerals
const toBn = (num) => {
  if (num === undefined || num === null) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bn[d]);
};

// Convert Bengali numerals to ASCII numbers
const bnToEn = (str) => {
  if (!str) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str)
    .split('')
    .map((c) => {
      const idx = bn.indexOf(c);
      return idx !== -1 ? idx : c;
    })
    .join('');
};

export default function HafeziQuranScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDarkApp = scheme === 'dark';
  const colors = Colors[isDarkApp ? 'dark' : 'light'];
  const params = useLocalSearchParams();

  const webViewRef = useRef(null);

  // Initial page: from params, or default to 2 (Surah Al-Fatiha)
  const initialPage = params.page ? Math.max(1, Math.min(TOTAL_QURAN_PAGES, Number(params.page))) : 2;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(TOTAL_QURAN_PAGES);
  const [readingTheme, setReadingTheme] = useState('day'); // 'day' | 'night' | 'sepia'
  const [fullscreen, setFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfSourceUrl, setPdfSourceUrl] = useState(API_ENDPOINTS.QURAN_PDF);

  // Fast-Scroll Scrubber & Continuous Navigation States
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPage, setScrubPage] = useState(initialPage);
  const scrubberWidthRef = useRef(SCREEN_WIDTH - 32);
  const autoFlipIntervalRef = useRef(null);

  // Modals
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [indexTab, setIndexTab] = useState('surah'); // 'surah' | 'para' | 'sijdah' | 'bookmarks'
  const [searchQuery, setSearchQuery] = useState('');
  const [surahFilter, setSurahFilter] = useState('all'); // 'all' | 'মাক্কী' | 'মাদানী'

  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarks, setBookmarks] = useState([]);

  // Animation for toolbar fade in/out
  const toolbarOpacity = useRef(new Animated.Value(1)).current;

  // Page Info (Para, Surah, Sijdah)
  const pageInfo = useMemo(() => getQuranPageInfo(currentPage), [currentPage]);

  // Load Bookmarks and Last Read on mount
  useEffect(() => {
    loadBookmarks();
    if (!params.page) {
      loadLastRead();
    }
  }, []);

  // Save Last Read whenever currentPage changes
  useEffect(() => {
    if (currentPage > 0) {
      saveLastRead(currentPage);
    }
  }, [currentPage]);

  // Fade animation when fullscreen changes
  useEffect(() => {
    Animated.timing(toolbarOpacity, {
      toValue: fullscreen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fullscreen]);

  // Sync scrubPage with currentPage when not actively dragging
  useEffect(() => {
    if (!isScrubbing) {
      setScrubPage(currentPage);
    }
  }, [currentPage, isScrubbing]);

  // Clean up auto-flip interval on unmount
  useEffect(() => {
    return () => {
      if (autoFlipIntervalRef.current) {
        clearInterval(autoFlipIntervalRef.current);
      }
    };
  }, []);

  const loadLastRead = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_LAST_READ);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.page && parsed.page !== currentPage) {
          goToPage(parsed.page);
        }
      }
    } catch (e) {
      console.log('Error loading last read:', e);
    }
  };

  const saveLastRead = async (page) => {
    try {
      const info = getQuranPageInfo(page);
      await AsyncStorage.setItem(
        STORAGE_KEY_LAST_READ,
        JSON.stringify({
          page,
          paraId: info.para.id,
          paraName: info.para.bangla,
          surahId: info.surah.id,
          surahName: info.surah.nameBangla,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.log('Error saving last read:', e);
    }
  };

  const loadBookmarks = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (data) {
        setBookmarks(JSON.parse(data));
      }
    } catch (e) {
      console.log('Error loading bookmarks:', e);
    }
  };

  const isCurrentPageBookmarked = useMemo(() => {
    return bookmarks.some((b) => b.page === currentPage);
  }, [bookmarks, currentPage]);

  const toggleBookmarkCurrentPage = () => {
    if (isCurrentPageBookmarked) {
      // Remove bookmark
      const updated = bookmarks.filter((b) => b.page !== currentPage);
      setBookmarks(updated);
      AsyncStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(updated));
    } else {
      // Open add bookmark modal with default title
      setBookmarkTitle(`${pageInfo.surah.nameBangla} (পৃষ্ঠা ${toBn(currentPage)})`);
      setBookmarkNote(`পারা ${toBn(pageInfo.para.id)} - ${pageInfo.para.bangla}`);
      setShowBookmarkModal(true);
    }
  };

  const saveNewBookmark = async () => {
    if (!bookmarkTitle.trim()) {
      Alert.alert('সতর্কতা', 'অনুগ্রহ করে বুকমার্কের একটি নাম দিন।');
      return;
    }
    const newBookmark = {
      id: Date.now().toString(),
      page: currentPage,
      title: bookmarkTitle.trim(),
      note: bookmarkNote.trim(),
      surah: pageInfo.surah.nameBangla,
      para: pageInfo.para.bangla,
      date: new Date().toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
    const updated = [newBookmark, ...bookmarks.filter((b) => b.page !== currentPage)];
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(updated));
    setShowBookmarkModal(false);
    setBookmarkTitle('');
    setBookmarkNote('');
  };

  const deleteBookmark = async (id) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(updated));
  };

  // Navigate to a specific page
  const goToPage = (page) => {
    const target = Math.max(1, Math.min(TOTAL_QURAN_PAGES, Number(page)));
    setCurrentPage(target);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.goToPage && window.goToPage(${target}); true;`);
    }
  };

  const handleNextPage = () => {
    // In Quran (RTL reading), Next page = Page + 1
    if (currentPage < TOTAL_QURAN_PAGES) {
      goToPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    // Previous page = Page - 1
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleSkipPages = (delta) => {
    const target = Math.max(1, Math.min(TOTAL_QURAN_PAGES, currentPage + delta));
    goToPage(target);
  };

  const startAutoFlip = (direction) => {
    stopAutoFlip();
    autoFlipIntervalRef.current = setInterval(() => {
      setCurrentPage((prev) => {
        const next = Math.max(1, Math.min(TOTAL_QURAN_PAGES, prev + direction));
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.goToPage && window.goToPage(${next}); true;`);
        }
        return next;
      });
    }, 180);
  };

  const stopAutoFlip = () => {
    if (autoFlipIntervalRef.current) {
      clearInterval(autoFlipIntervalRef.current);
      autoFlipIntervalRef.current = null;
    }
  };

  const handleScrubberTouch = (event) => {
    const touchX = event.nativeEvent.locationX;
    const width = Math.max(100, scrubberWidthRef.current || (SCREEN_WIDTH - 32));
    const ratio = Math.max(0, Math.min(1, touchX / width));
    const targetPage = Math.max(1, Math.min(TOTAL_QURAN_PAGES, Math.round(ratio * (TOTAL_QURAN_PAGES - 1)) + 1));
    setScrubPage(targetPage);
  };

  const handleThemeChange = (newTheme) => {
    setReadingTheme(newTheme);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.setTheme && window.setTheme('${newTheme}'); true;`);
    }
  };

  const handleJumpSubmit = () => {
    const cleanNum = Number(bnToEn(jumpPageInput.trim()));
    if (!cleanNum || cleanNum < 1 || cleanNum > TOTAL_QURAN_PAGES) {
      Alert.alert('ভুল পৃষ্ঠা নম্বর', `১ থেকে ${toBn(TOTAL_QURAN_PAGES)} এর মধ্যে পৃষ্ঠা নম্বর দিন।`);
      return;
    }
    goToPage(cleanNum);
    setShowJumpModal(false);
    setJumpPageInput('');
  };

  // WebView message listener
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAGE_LOADED') {
        setCurrentPage(data.page);
        setIsLoading(false);
      } else if (data.type === 'PAGE_CHANGE') {
        setCurrentPage(data.page);
      } else if (data.type === 'TOGGLE_FULLSCREEN') {
        setFullscreen((prev) => !prev);
      } else if (data.type === 'LOG') {
        console.log('[QuranViewer]', data.message);
      }
    } catch (e) {
      console.log('Error parsing WebView message:', e);
    }
  };

  // Filtered Surahs
  const filteredSurahs = useMemo(() => {
    return QURAN_SURAHS.filter((s) => {
      if (surahFilter !== 'all' && s.type !== surahFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.nameBangla.toLowerCase().includes(q) ||
        s.nameArabic.includes(q) ||
        s.meaningBangla.toLowerCase().includes(q) ||
        String(s.id).includes(bnToEn(q))
      );
    });
  }, [searchQuery, surahFilter]);

  // Filtered Paras
  const filteredParas = useMemo(() => {
    if (!searchQuery.trim()) return QURAN_PARAS;
    const q = searchQuery.toLowerCase().trim();
    return QURAN_PARAS.filter(
      (p) =>
        p.bangla.toLowerCase().includes(q) ||
        p.arabic.includes(q) ||
        String(p.id).includes(bnToEn(q)) ||
        p.surah.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // HTML content for PDF.js inside WebView
  const htmlContent = useMemo(() => {
    return `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>হাফেজী কুরআন শরীফ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background-color: #F8F6F0;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      touch-action: pan-x pan-y pinch-zoom;
    }
    #viewer-container {
      width: 100%; height: 100%;
      display: flex; justify-content: center; align-items: center;
      position: relative; overflow: auto; -webkit-overflow-scrolling: touch;
    }
    #quran-canvas {
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border-radius: 4px;
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      transition: filter 0.3s ease;
    }
    /* Reading Themes */
    body.theme-day { background-color: #F8F6F0; }
    body.theme-day #quran-canvas { filter: none; }

    body.theme-night { background-color: #121212; }
    body.theme-night #quran-canvas {
      filter: invert(0.92) hue-rotate(180deg) contrast(1.15) brightness(1.02);
      box-shadow: 0 4px 25px rgba(255,255,255,0.06);
    }

    body.theme-sepia { background-color: #F4ECD8; }
    body.theme-sepia #quran-canvas {
      filter: sepia(0.38) contrast(1.05) brightness(0.98);
      box-shadow: 0 4px 20px rgba(139,90,43,0.12);
    }

    /* Loading Overlay */
    #loader {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(248, 246, 240, 0.85);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      z-index: 100; font-family: sans-serif; color: #065F46;
      transition: opacity 0.2s ease;
    }
    .spinner {
      width: 44px; height: 44px; border: 4px solid #E5E7EB;
      border-top-color: #059669; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body class="theme-day">
  <div id="loader">
    <div class="spinner"></div>
    <div style="margin-top: 12px; font-weight: bold; font-size: 14px;">পৃষ্ঠা লোড হচ্ছে...</div>
  </div>

  <div id="viewer-container">
    <canvas id="quran-canvas"></canvas>
  </div>

  <script>
    const PDF_URL = "${pdfSourceUrl}";
    let pdfDoc = null;
    let pageRendering = false;
    let pageNumPending = null;
    let currentPageNum = ${initialPage};
    let scale = 1.0;
    const canvas = document.getElementById('quran-canvas');
    const ctx = canvas.getContext('2d');
    const loader = document.getElementById('loader');

    function sendToApp(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
      }
    }

    function initPdf() {
      if (!window.pdfjsLib) {
        setTimeout(initPdf, 100);
        return;
      }

      // Disable external worker to prevent cross-origin SecurityError in WebView:
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      } catch (e) {}

      // Load PDF Document
      const loadingTask = window.pdfjsLib.getDocument({
        url: PDF_URL,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
        rangeChunkSize: 65536,
        disableAutoFetch: false,
        disableStream: false
      });

      loadingTask.promise.then(function(pdf) {
        pdfDoc = pdf;
        renderPage(currentPageNum);
      }).catch(function(err) {
        sendToApp('LOG', { message: 'PDF Load Error: ' + err.message });
        loader.innerHTML = '<div style="color: #DC2626; padding: 24px; text-align: center; font-size: 14px;">' +
          '<div style="font-weight: 700; margin-bottom: 6px;">কুরআন লোড করা সম্ভব হয়নি</div>' +
          '<div style="color: #6B7280; font-size: 12px; margin-bottom: 14px;">' + (err.message || 'ইন্টারনেট সংযোগ পরীক্ষা করুন') + '</div>' +
          '<button onclick="location.reload()" style="padding: 8px 20px; background: #059669; color: #FFF; border: none; border-radius: 20px; font-weight: 600; cursor: pointer;">আবার চেষ্টা করুন</button>' +
          '</div>';
      });
    }

    initPdf();

    function renderPage(num) {
      pageRendering = true;
      loader.style.opacity = '1';
      loader.style.display = 'flex';

      pdfDoc.getPage(num).then(function(page) {
        const viewportRaw = page.getViewport({ scale: 1.0 });
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;

        // Auto-fit to screen with sharp high-DPI resolution
        const scaleX = containerWidth / viewportRaw.width;
        const scaleY = containerHeight / viewportRaw.height;
        const calculatedScale = Math.min(scaleX, scaleY) * (window.devicePixelRatio || 1.5);

        const viewport = page.getViewport({ scale: calculatedScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = (viewport.width / (window.devicePixelRatio || 1.5)) + 'px';
        canvas.style.height = (viewport.height / (window.devicePixelRatio || 1.5)) + 'px';

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
          pageRendering = false;
          loader.style.opacity = '0';
          setTimeout(() => { loader.style.display = 'none'; }, 200);

          sendToApp('PAGE_LOADED', { page: num });

          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });
    }

    function queueRenderPage(num) {
      currentPageNum = num;
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
    }

    // Exposed to React Native
    window.goToPage = function(num) {
      if (num >= 1 && num <= (pdfDoc ? pdfDoc.numPages : 614)) {
        queueRenderPage(num);
      }
    };

    window.setTheme = function(theme) {
      document.body.className = 'theme-' + theme;
    };

    // Tap on screen to toggle full-screen header/footer
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        // Check for Tap (not swipe or pinch)
        if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && deltaTime < 300) {
          sendToApp('TOGGLE_FULLSCREEN', {});
        } 
        // Horizontal Swipe (RTL: swipe right-to-left -> Next Page, swipe left-to-right -> Prev Page)
        else if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60 && deltaTime < 500) {
          let step = 1;
          const velocity = Math.abs(deltaX) / Math.max(1, deltaTime); // px per ms
          if (velocity > 1.2 || Math.abs(deltaX) > 200) {
            step = Math.min(5, Math.max(2, Math.round(velocity * 2.5)));
          }

          if (deltaX < 0) {
            // Swipe Left -> Next Page(s)
            if (currentPageNum < 614) {
              window.goToPage(Math.min(614, currentPageNum + step));
            }
          } else {
            // Swipe Right -> Prev Page(s)
            if (currentPageNum > 1) {
              window.goToPage(Math.max(1, currentPageNum - step));
            }
          }
        }
      }
    }, { passive: true });
  </script>
</body>
</html>
    `;
  }, [pdfSourceUrl]);

  return (
    <View style={[styles.container, { backgroundColor: readingTheme === 'night' ? '#121212' : '#F8F6F0' }]}>
      <StatusBar
        barStyle={readingTheme === 'night' ? 'light-content' : 'dark-content'}
        hidden={fullscreen}
      />

      {/* Top Floating App Bar */}
      {!fullscreen && (
        <Animated.View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 6,
              backgroundColor: readingTheme === 'night' ? '#1E1E1E' : '#FFFFFF',
              borderBottomColor: readingTheme === 'night' ? '#333333' : '#E5E7EB',
              opacity: toolbarOpacity,
            },
          ]}
        >
          <View style={styles.topBarContent}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={22}
                color={readingTheme === 'night' ? '#F3F4F6' : '#1F2937'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerInfoBox}
              activeOpacity={0.7}
              onPress={() => setShowIndexModal(true)}
            >
              <View style={styles.headerInfoTopRow}>
                <Text
                  style={[
                    styles.headerSurahText,
                    { color: readingTheme === 'night' ? '#10B981' : '#047857' },
                  ]}
                  numberOfLines={1}
                >
                  {pageInfo.surah.nameBangla} ({pageInfo.surah.nameArabic})
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={readingTheme === 'night' ? '#9CA3AF' : '#6B7280'}
                />
              </View>
              <Text style={styles.headerParaText}>
                পারা {toBn(pageInfo.para.id)}: {pageInfo.para.bangla} • পৃষ্ঠা {toBn(currentPage)}
              </Text>
            </TouchableOpacity>

            <View style={styles.topActionGroup}>
              {/* Bookmark Toggle */}
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  isCurrentPageBookmarked && { backgroundColor: 'rgba(217, 119, 6, 0.15)' },
                ]}
                onPress={toggleBookmarkCurrentPage}
              >
                <Ionicons
                  name={isCurrentPageBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isCurrentPageBookmarked ? '#D97706' : readingTheme === 'night' ? '#E5E7EB' : '#4B5563'}
                />
              </TouchableOpacity>

              {/* Theme Toggle (Day / Night / Sepia) */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  const themes = ['day', 'night', 'sepia'];
                  const nextTheme = themes[(themes.indexOf(readingTheme) + 1) % themes.length];
                  handleThemeChange(nextTheme);
                }}
              >
                <MaterialCommunityIcons
                  name={
                    readingTheme === 'night'
                      ? 'weather-night'
                      : readingTheme === 'sepia'
                      ? 'book-open-page-variant'
                      : 'white-balance-sunny'
                  }
                  size={20}
                  color={
                    readingTheme === 'night'
                      ? '#FBBF24'
                      : readingTheme === 'sepia'
                      ? '#B45309'
                      : '#059669'
                  }
                />
              </TouchableOpacity>

              {/* Index & Menu */}
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowIndexModal(true)}>
                <Ionicons
                  name="list"
                  size={22}
                  color={readingTheme === 'night' ? '#F3F4F6' : '#1F2937'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Main Quran PDF WebView */}
      <View style={styles.webViewWrapper}>
        <WebView
          ref={webViewRef}
          source={{
            html: htmlContent,
            baseUrl: 'https://api-assunnah-27.newsmartagent.com'
          }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          scalesPageToFit={true}
          scrollEnabled={false}
          bounces={false}
        />
      </View>

      {/* Sijdah Ayat Warning Banner */}
      {pageInfo.sijdah && !fullscreen && (
        <View style={styles.sijdahBanner}>
          <MaterialCommunityIcons name="star-crescent" size={16} color="#DC2626" />
          <Text style={styles.sijdahBannerText}>
            এই পৃষ্ঠায় তিলাওয়াতের সিজদাহ রয়েছে (আয়াত: {toBn(pageInfo.sijdah.ayah)})
          </Text>
        </View>
      )}

      {/* Khatam-e-Quran Dua Notification */}
      {pageInfo.isDuaKhatmulQuran && !fullscreen && (
        <View style={[styles.sijdahBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Ionicons name="sparkles" size={16} color="#059669" />
          <Text style={[styles.sijdahBannerText, { color: '#065F46' }]}>
            খতমে কুরআন শরীফের মোবারক দু‘আ ও মুনাজাত
          </Text>
        </View>
      )}

      {/* Subtle Floating Page Pill in Fullscreen Mode */}
      {fullscreen && (
        <TouchableOpacity
          style={styles.fullscreenPill}
          activeOpacity={0.8}
          onPress={() => setFullscreen(false)}
        >
          <Text style={styles.fullscreenPillText}>
            পৃষ্ঠা {toBn(currentPage)} • পারা {toBn(pageInfo.para.id)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom Floating Navigation Bar */}
      {!fullscreen && (
        <Animated.View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: readingTheme === 'night' ? '#1E1E1E' : '#FFFFFF',
              borderTopColor: readingTheme === 'night' ? '#333333' : '#E5E7EB',
              opacity: toolbarOpacity,
            },
          ]}
        >
          {/* 1. Para Horizontal Fast Selector */}
          <View style={styles.paraScrollViewWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paraScrollContent}
            >
              {QURAN_PARAS.map((para) => {
                const isActive = pageInfo.para.id === para.id;
                return (
                  <TouchableOpacity
                    key={para.id}
                    onPress={() => goToPage(para.page)}
                    style={[
                      styles.paraChip,
                      isActive && styles.paraChipActive,
                      {
                        backgroundColor: isActive
                          ? '#059669'
                          : (readingTheme === 'night' ? '#2A2A2A' : '#F1F5F9'),
                        borderColor: isActive ? '#047857' : (readingTheme === 'night' ? '#3E3E3E' : '#E2E8F0'),
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.paraChipText,
                        { color: isActive ? '#FFFFFF' : (readingTheme === 'night' ? '#D1D5DB' : '#4B5563') }
                      ]}
                    >
                      পারা {toBn(para.id)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. Live Scrubber Tooltip when Dragging */}
          {isScrubbing && (
            <View style={styles.scrubberTooltip}>
              <Text style={styles.scrubberTooltipText}>
                পৃষ্ঠা {toBn(scrubPage)} • পারা {toBn(getQuranPageInfo(scrubPage).para.id)} ({getQuranPageInfo(scrubPage).para.bangla}) • {getQuranPageInfo(scrubPage).surah.nameBangla}
              </Text>
            </View>
          )}

          {/* 3. Fast-Scroll Scrubber Track */}
          <View
            style={styles.scrubberContainer}
            onLayout={(e) => {
              scrubberWidthRef.current = e.nativeEvent.layout.width;
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              setIsScrubbing(true);
              handleScrubberTouch(e);
            }}
            onResponderMove={(e) => {
              handleScrubberTouch(e);
            }}
            onResponderRelease={(e) => {
              setIsScrubbing(false);
              goToPage(scrubPage);
            }}
          >
            <View style={[styles.scrubberTrack, { backgroundColor: readingTheme === 'night' ? '#333333' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.scrubberProgress,
                  {
                    width: `${((isScrubbing ? scrubPage : currentPage) / TOTAL_QURAN_PAGES) * 100}%`,
                    backgroundColor: '#059669',
                  }
                ]}
              />
              <View
                style={[
                  styles.scrubberThumb,
                  {
                    left: `${((isScrubbing ? scrubPage : currentPage) / TOTAL_QURAN_PAGES) * 100}%`,
                  }
                ]}
              />
            </View>
            <View style={styles.scrubberLabelsRow}>
              <Text style={styles.scrubberLabelText}>পৃষ্ঠা ১</Text>
              <Text style={styles.scrubberLabelText}>পৃষ্ঠা {toBn(TOTAL_QURAN_PAGES)}</Text>
            </View>
          </View>

          {/* 4. Multi-Page Navigation Buttons Row */}
          <View style={styles.bottomBarRow}>
            {/* -10 Pages Quick Skip */}
            <TouchableOpacity
              style={[
                styles.navBtnSmall,
                currentPage <= 1 && styles.navBtnDisabled,
                { backgroundColor: readingTheme === 'night' ? '#2A2A2A' : '#F1F5F9' },
              ]}
              onPress={() => handleSkipPages(-10)}
              disabled={currentPage <= 1}
            >
              <Text style={[styles.navBtnSmallText, { color: currentPage <= 1 ? '#9CA3AF' : readingTheme === 'night' ? '#E5E7EB' : '#1F2937' }]}>
                -১০
              </Text>
            </TouchableOpacity>

            {/* Prev Page Button (RTL: Previous page is right) */}
            <TouchableOpacity
              style={[
                styles.navBtn,
                currentPage <= 1 && styles.navBtnDisabled,
                { backgroundColor: readingTheme === 'night' ? '#2A2A2A' : '#F1F5F9' },
              ]}
              onPress={handlePrevPage}
              onLongPress={() => startAutoFlip(-1)}
              onPressOut={stopAutoFlip}
              disabled={currentPage <= 1}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={currentPage <= 1 ? '#9CA3AF' : readingTheme === 'night' ? '#E5E7EB' : '#1F2937'}
              />
              <Text
                style={[
                  styles.navBtnText,
                  { color: currentPage <= 1 ? '#9CA3AF' : readingTheme === 'night' ? '#E5E7EB' : '#1F2937' },
                ]}
              >
                পূর্ববর্তী
              </Text>
            </TouchableOpacity>

            {/* Page Jump Center Box */}
            <TouchableOpacity
              style={[
                styles.pageIndicatorBox,
                { backgroundColor: readingTheme === 'night' ? '#2A2A2A' : '#ECFDF5' },
              ]}
              onPress={() => {
                setJumpPageInput(String(currentPage));
                setShowJumpModal(true);
              }}
            >
              <Text style={[styles.pageIndicatorNumber, { color: '#059669' }]}>
                পৃষ্ঠা {toBn(currentPage)} / {toBn(TOTAL_QURAN_PAGES)}
              </Text>
              <Text style={styles.pageIndicatorHint}>জাম্প করতে ট্যাপ করুন</Text>
            </TouchableOpacity>

            {/* Next Page Button (RTL: Next page is left) */}
            <TouchableOpacity
              style={[
                styles.navBtn,
                currentPage >= TOTAL_QURAN_PAGES && styles.navBtnDisabled,
                { backgroundColor: readingTheme === 'night' ? '#2A2A2A' : '#F1F5F9' },
              ]}
              onPress={handleNextPage}
              onLongPress={() => startAutoFlip(1)}
              onPressOut={stopAutoFlip}
              disabled={currentPage >= TOTAL_QURAN_PAGES}
            >
              <Text
                style={[
                  styles.navBtnText,
                  {
                    color:
                      currentPage >= TOTAL_QURAN_PAGES
                        ? '#9CA3AF'
                        : readingTheme === 'night'
                        ? '#E5E7EB'
                        : '#1F2937',
                  },
                ]}
              >
                পরবর্তী
              </Text>
              <Ionicons
                name="chevron-back"
                size={18}
                color={
                  currentPage >= TOTAL_QURAN_PAGES
                    ? '#9CA3AF'
                    : readingTheme === 'night'
                    ? '#E5E7EB'
                    : '#1F2937'
                }
              />
            </TouchableOpacity>

            {/* +10 Pages Quick Skip */}
            <TouchableOpacity
              style={[
                styles.navBtnSmall,
                currentPage >= TOTAL_QURAN_PAGES && styles.navBtnDisabled,
                { backgroundColor: readingTheme === 'night' ? '#2A2A2A' : '#F1F5F9' },
              ]}
              onPress={() => handleSkipPages(10)}
              disabled={currentPage >= TOTAL_QURAN_PAGES}
            >
              <Text style={[styles.navBtnSmallText, { color: currentPage >= TOTAL_QURAN_PAGES ? '#9CA3AF' : readingTheme === 'night' ? '#E5E7EB' : '#1F2937' }]}>
                +১০
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ============================================================
          INDEX & NAVIGATION MODAL (Surah, Para, Sijdah, Bookmarks)
          ============================================================ */}
      <Modal visible={showIndexModal} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.indexModalBox,
              { backgroundColor: isDarkApp ? '#1E293B' : '#FFFFFF', paddingTop: insets.top + 8 },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>কুরআন সূচিপত্র</Text>
                <Text style={styles.modalSubtitle}>এমদাদিয়া ১৫ লাইন হাফেজী সংস্করণ</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowIndexModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabBar}>
              {[
                { id: 'surah', label: 'সূরা (১১৪)' },
                { id: 'para', label: 'পারা (৩০)' },
                { id: 'bookmarks', label: 'বুকমার্ক' },
                { id: 'sijdah', label: 'সিজদা (১৪)' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
                    indexTab === tab.id && styles.tabItemActive,
                    { borderBottomColor: indexTab === tab.id ? '#059669' : 'transparent' },
                  ]}
                  onPress={() => setIndexTab(tab.id)}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: indexTab === tab.id ? '#059669' : colors.textMuted },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Box */}
            {(indexTab === 'surah' || indexTab === 'para') && (
              <View style={[styles.searchBox, { backgroundColor: isDarkApp ? '#0F172A' : '#F1F5F9' }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={
                    indexTab === 'surah' ? 'সূরার নাম বা নম্বর দিয়ে খুঁজুন...' : 'পারা খুঁজুন...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Makki / Madani Filter for Surah */}
            {indexTab === 'surah' && (
              <View style={styles.filterRow}>
                {['all', 'মাক্কী', 'মাদানী'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      surahFilter === f && styles.filterChipActive,
                      { borderColor: surahFilter === f ? '#059669' : isDarkApp ? '#334155' : '#E2E8F0' },
                    ]}
                    onPress={() => setSurahFilter(f)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: surahFilter === f ? '#059669' : colors.textMuted },
                      ]}
                    >
                      {f === 'all' ? 'সকল সূরা' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tab 1: Surah List */}
            {indexTab === 'surah' && (
              <FlatList
                data={filteredSurahs}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      currentPage >= item.page &&
                        (QURAN_SURAHS[item.id] ? currentPage < QURAN_SURAHS[item.id].page : true) &&
                        styles.listItemActive,
                      { borderBottomColor: isDarkApp ? '#334155' : '#F1F5F9' },
                    ]}
                    onPress={() => {
                      goToPage(item.page);
                      setShowIndexModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberBadgeText}>{toBn(item.id)}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.surahNameBn, { color: colors.text }]}>
                          {item.nameBangla}
                        </Text>
                        <View
                          style={[
                            styles.typeBadge,
                            {
                              backgroundColor:
                                item.type === 'মাক্কী' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              { color: item.type === 'মাক্কী' ? '#059669' : '#0284C7' },
                            ]}
                          >
                            {item.type}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.surahMeaning}>
                        {item.meaningBangla} • {toBn(item.totalAyahs)} আয়াত
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.surahNameAr}>{item.nameArabic}</Text>
                      <Text style={styles.pageLabel}>পৃষ্ঠা {toBn(item.page)}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Tab 2: Para List */}
            {indexTab === 'para' && (
              <FlatList
                data={filteredParas}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      currentPage >= item.page && currentPage < (QURAN_PARAS[item.id] ? QURAN_PARAS[item.id].page : 615) && styles.listItemActive,
                      { borderBottomColor: isDarkApp ? '#334155' : '#F1F5F9' },
                    ]}
                    onPress={() => {
                      goToPage(item.page);
                      setShowIndexModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={[styles.numberBadge, { backgroundColor: '#0284C7' }]}>
                      <Text style={styles.numberBadgeText}>{toBn(item.id)}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.surahNameBn, { color: colors.text }]}>
                        পারা {toBn(item.id)}: {item.bangla}
                      </Text>
                      <Text style={styles.surahMeaning}>
                        শুরু: {item.surah} (আয়াত {toBn(item.ayah)})
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.surahNameAr}>{item.arabic}</Text>
                      <Text style={styles.pageLabel}>পৃষ্ঠা {toBn(item.page)}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Tab 3: Bookmarks List */}
            {indexTab === 'bookmarks' && (
              <FlatList
                data={bookmarks}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      এখনো কোনো বুকমার্ক যোগ করা হয়নি।
                    </Text>
                    <Text style={styles.emptySubText}>
                      পড়ার সময় উপরের বুকমার্ক আইকনে ট্যাপ করে পৃষ্ঠা সংরক্ষণ করুন।
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.bookmarkItem,
                      { borderBottomColor: isDarkApp ? '#334155' : '#F1F5F9' },
                    ]}
                  >
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => {
                        goToPage(item.page);
                        setShowIndexModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="bookmark" size={16} color="#D97706" />
                        <Text style={[styles.bookmarkTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                      </View>
                      {item.note ? <Text style={styles.bookmarkNote}>{item.note}</Text> : null}
                      <Text style={styles.bookmarkDate}>
                        পৃষ্ঠা {toBn(item.page)} • {item.date}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBookmarkBtn}
                      onPress={() => deleteBookmark(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* Tab 4: Sijdah Ayat List */}
            {indexTab === 'sijdah' && (
              <FlatList
                data={QURAN_SIJDAHS}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: isDarkApp ? '#334155' : '#F1F5F9' }]}
                    onPress={() => {
                      goToPage(item.page);
                      setShowIndexModal(false);
                    }}
                  >
                    <View style={[styles.numberBadge, { backgroundColor: '#DC2626' }]}>
                      <Text style={styles.numberBadgeText}>{toBn(item.id)}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.surahNameBn, { color: colors.text }]}>
                        সূরা {item.surah}
                      </Text>
                      <Text style={styles.surahMeaning}>
                        আয়াত: {toBn(item.ayah)} • পারা {toBn(item.para)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.pageLabel, { color: '#DC2626', fontWeight: '700' }]}>
                        পৃষ্ঠা {toBn(item.page)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Khatam-e-Quran Dua Shortcut Button at Bottom */}
            <TouchableOpacity
              style={styles.khatamDuaBtn}
              onPress={() => {
                goToPage(612);
                setShowIndexModal(false);
              }}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.khatamDuaBtnText}>খতমে কুরআনের দু‘আ ও মুনাজাত (পৃষ্ঠা ৬১২)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          PAGE JUMP MODAL
          ============================================================ */}
      <Modal visible={showJumpModal} animationType="fade" transparent={true}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.jumpBox, { backgroundColor: isDarkApp ? '#1E293B' : '#FFFFFF' }]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#059669" />
              <Text style={[styles.jumpTitle, { color: colors.text }]}>পৃষ্ঠায় জাম্প করুন</Text>
              <Text style={styles.jumpSubtitle}>
                ১ থেকে {toBn(TOTAL_QURAN_PAGES)} এর মধ্যে পৃষ্ঠা নম্বর দিন
              </Text>
            </View>

            <TextInput
              style={[
                styles.jumpInput,
                { color: colors.text, borderColor: isDarkApp ? '#334155' : '#E2E8F0' },
              ]}
              placeholder={`১ - ${TOTAL_QURAN_PAGES}`}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={jumpPageInput}
              onChangeText={setJumpPageInput}
              autoFocus={true}
            />

            <View style={styles.jumpActions}>
              <TouchableOpacity
                style={[styles.jumpCancelBtn, { borderColor: isDarkApp ? '#334155' : '#E2E8F0' }]}
                onPress={() => setShowJumpModal(false)}
              >
                <Text style={{ color: colors.text }}>বাতিল</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.jumpConfirmBtn} onPress={handleJumpSubmit}>
                <Text style={styles.jumpConfirmText}>যান</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          ADD BOOKMARK MODAL
          ============================================================ */}
      <Modal visible={showBookmarkModal} animationType="fade" transparent={true}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.jumpBox, { backgroundColor: isDarkApp ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.jumpTitle, { color: colors.text, marginBottom: 4 }]}>
              বুকমার্ক সংরক্ষণ
            </Text>
            <Text style={[styles.jumpSubtitle, { marginBottom: 12 }]}>
              পৃষ্ঠা {toBn(currentPage)} ({pageInfo.surah.nameBangla})
            </Text>

            <TextInput
              style={[
                styles.jumpInput,
                {
                  color: colors.text,
                  borderColor: isDarkApp ? '#334155' : '#E2E8F0',
                  textAlign: 'left',
                  fontSize: 14,
                  marginBottom: 8,
                },
              ]}
              placeholder="বুকমার্কের শিরোনাম..."
              placeholderTextColor={colors.textMuted}
              value={bookmarkTitle}
              onChangeText={setBookmarkTitle}
            />

            <TextInput
              style={[
                styles.jumpInput,
                {
                  color: colors.text,
                  borderColor: isDarkApp ? '#334155' : '#E2E8F0',
                  textAlign: 'left',
                  fontSize: 13,
                  marginBottom: 14,
                },
              ]}
              placeholder="সংক্ষিপ্ত নোট (ঐচ্ছিক)..."
              placeholderTextColor={colors.textMuted}
              value={bookmarkNote}
              onChangeText={setBookmarkNote}
            />

            <View style={styles.jumpActions}>
              <TouchableOpacity
                style={[styles.jumpCancelBtn, { borderColor: isDarkApp ? '#334155' : '#E2E8F0' }]}
                onPress={() => setShowBookmarkModal(false)}
              >
                <Text style={{ color: colors.text }}>বাতিল</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.jumpConfirmBtn, { backgroundColor: '#D97706' }]}
                onPress={saveNewBookmark}
              >
                <Text style={styles.jumpConfirmText}>সেভ করুন</Text>
              </TouchableOpacity>
            </View>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoBox: {
    flex: 1,
    paddingHorizontal: 6,
  },
  headerInfoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSurahText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerParaText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  topActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  webViewWrapper: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sijdahBanner: {
    position: 'absolute',
    top: 86,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sijdahBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  fullscreenPill: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 40,
  },
  fullscreenPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 4,
  },
  paraScrollViewWrapper: {
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  paraScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paraChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  paraChipActive: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  paraChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrubberContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  scrubberTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberProgress: {
    height: 6,
    borderRadius: 3,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -6,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 4,
  },
  scrubberLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scrubberLabelText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  scrubberTooltip: {
    alignSelf: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  scrubberTooltipText: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '700',
  },
  navBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  navBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicatorBox: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pageIndicatorNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageIndicatorHint: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  indexModalBox: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabItemActive: {},
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  surahNameBn: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  surahMeaning: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  surahNameAr: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
    color: '#059669',
  },
  pageLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  khatamDuaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginVertical: 10,
  },
  khatamDuaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bookmarkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookmarkNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bookmarkDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteBookmarkBtn: {
    padding: 8,
  },
  jumpBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  jumpTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  jumpSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  jumpInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  jumpActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  jumpCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  jumpConfirmBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  jumpConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
