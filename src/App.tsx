/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackgroundVisuals } from './components/BackgroundVisuals';
import { AudioPlayer } from './components/AudioPlayer';
import { SurahView } from './components/SurahView';
import { SelectionModal } from './components/SelectionModal';
import { SurahRegistryModal } from './components/SurahRegistryModal';
import { DailyGoalDashboard } from './components/DailyGoalDashboard';
import { GoalConfetti } from './components/GoalConfetti';
import { QuranBot } from './components/QuranBot';
import { VoiceHotlineControl } from './components/VoiceHotlineControl';
import { WordPressAdmin } from './components/WordPressAdmin';
import { CustomPageView } from './components/CustomPageView';
import { OnboardingTour } from './components/OnboardingTour';
import { POPULAR_RECITERS, BACKGROUND_VIDEOS, API_BASE_URL, TRANSLATION_LANGUAGES, TAFSIR_SOURCES, QURAN_COM_API_BASE_URL } from './constants';
import { Surah, SurahListItem, Reciter, Ayah, isRtlText } from './types';
import { OFFLINE_SURAHS, STATIC_SURAHS_LIST } from './offlineData';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, Music, Languages, ToggleRight, ToggleLeft, Upload, BookOpen, Sliders, X, Bookmark, Trash2, Sparkles, Volume2, VolumeX, ArrowUp, Scroll, Wifi, WifiOff, Download, Flame, Loader2 } from 'lucide-react';
import he from 'he';
import { BookmarkItem } from './types';
import { dbGet, dbSet, dbDelete, dbKeys } from './db';

const LANGUAGE_BCP47_MAP: Record<string, string> = {
  en: 'en-US',
  ur: 'ur-PK',
  bn: 'bn-IN',
  hi: 'hi-IN',
  fr: 'fr-FR',
  tr: 'tr-TR',
};

const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn(`Rate limit (429) received for ${url}. Retrying attempt ${i + 1}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Fetch error for ${url}: ${err instanceof Error ? err.message : String(err)}. Retrying attempt ${i + 1}/${retries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }
  return fetch(url);
};

const fetchAudioBlob = async (url: string): Promise<Blob> => {
  // Try proxy first to bypass CORS limitations on the client browser
  try {
    const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.blob();
    }
  } catch (proxyErr) {
    console.warn(`Proxy audio request failed for ${url}, falling back to direct fetch:`, proxyErr);
  }

  // Fallback to direct fetch
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed direct fetch of ${url} (HTTP status ${res.status})`);
  }
  return await res.blob();
};

export default function App() {
  const [surahs, setSurahs] = useState<SurahListItem[]>(() => {
    try {
      const cached = localStorage.getItem('surahs_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to retrieve cached surah list:", e);
    }
    return STATIC_SURAHS_LIST;
  });

  // Offline & Connection States
  const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine);
  const [forceOfflineMode, setForceOfflineMode] = useState(() => {
    try {
      return localStorage.getItem('offline_mode_forced') === 'true';
    } catch {
      return false;
    }
  });
  const [downloadedSurahs, setDownloadedSurahs] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('downloaded_offline_surahs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [downloadProgressSurah, setDownloadProgressSurah] = useState<number | null>(null);
  const [downloadProgressMessage, setDownloadProgressMessage] = useState<string>('');

  // Bulk offline downloader states
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);
  const [bulkDownloadCurrentIndex, setBulkDownloadCurrentIndex] = useState(0);
  const [bulkDownloadMessage, setBulkDownloadMessage] = useState('');
  const [bulkDownloadError, setBulkDownloadError] = useState<string | null>(null);

  // Search & tab states for offline sub panel
  const [offlineSearchQuery, setOfflineSearchQuery] = useState('');
  const [offlineTab, setOfflineTab] = useState<'all' | 'downloaded'>('all');

  const isOffline = isNetworkOffline || forceOfflineMode;

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOffline(false);
    };
    const handleOffline = () => {
      setIsNetworkOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync downloaded list across LocalStorage and IndexedDB
  useEffect(() => {
    const syncDownloadedList = async () => {
      try {
        const saved = localStorage.getItem('downloaded_offline_surahs');
        let list: number[] = saved ? JSON.parse(saved) : [];
        const idbSaved = await dbGet<number[]>('downloaded_offline_surahs');
        if (idbSaved && idbSaved.length > 0) {
          const combined = Array.from(new Set([...list, ...idbSaved]));
          setDownloadedSurahs(combined);
          localStorage.setItem('downloaded_offline_surahs', JSON.stringify(combined));
        } else if (list.length > 0) {
          await dbSet('downloaded_offline_surahs', list);
        }
      } catch (err) {
        console.warn("Failed syncing downloaded surahs list:", err);
      }
    };
    syncDownloadedList();
  }, []);

  // Silent background pre-cache for static offline Suras 1, 112, 113, and 114 audios
  useEffect(() => {
    if (isNetworkOffline) return;

    const cacheStaticAudios = async () => {
      const urls = [
        "https://audio.qurancdn.com/Alafasy/mp3/001001.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001002.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001003.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001004.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001005.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001006.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/001007.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/112001.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/112002.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/112003.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/112004.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/113001.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/113002.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/113003.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/113004.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/113005.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114001.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114002.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114003.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114004.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114005.mp3",
        "https://audio.qurancdn.com/Alafasy/mp3/114006.mp3",
        // Pre-cache Alafasy Bismillah audio file as well for offline playback support of Surahs 112, 113, and 114
        "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3"
      ];

      for (const url of urls) {
        try {
          const cached = await dbGet(url);
          if (!cached) {
            const blob = await fetchAudioBlob(url);
            await dbSet(url, blob);
          }
        } catch (err) {
          console.warn(`Startup background static audio caching failed for ${url}:`, err);
        }
      }
    };

    // Pause briefly before running to allow key components of the main thread to render smoothly
    const timer = setTimeout(cacheStaticAudios, 4000);
    return () => clearTimeout(timer);
  }, [isNetworkOffline]);
  const [currentSurah, setCurrentSurah] = useState<Surah | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(POPULAR_RECITERS[0]);
  const [selectedTranslation, setSelectedTranslation] = useState(TRANSLATION_LANGUAGES[0]);
  const [backgroundVideo, setBackgroundVideo] = useState<{id: string, name: string, url: string, type?: string}>(
    { ...BACKGROUND_VIDEOS[0], type: 'video/mp4' }
  );
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingBismillah, setIsPlayingBismillah] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isReadingTranslation, setIsReadingTranslation] = useState(false);
  const [isReadTranslationAloudEnabled, setIsReadTranslationAloudEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('quran_read_translation_aloud');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('quran_read_translation_aloud', isReadTranslationAloudEnabled.toString());
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
  }, [isReadTranslationAloudEnabled]);

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('quran_auto_scroll');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('quran_auto_scroll', isAutoScrollEnabled.toString());
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
  }, [isAutoScrollEnabled]);
  
  const [layoutMode, setLayoutMode] = useState<'verse' | 'arabic' | 'translation' | 'context'>(() => {
    try {
      const saved = localStorage.getItem('quran_layout_mode');
      return (saved as 'verse' | 'arabic' | 'translation' | 'context') || 'verse';
    } catch {
      return 'verse';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('quran_layout_mode', layoutMode);
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode === 'translation') {
      setIsReadingTranslation(true);
    } else {
      setIsReadingTranslation(false);
    }
  }, [layoutMode]);
  
  const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isTafsirModalOpen, setIsTafsirModalOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isDailyGoalOpen, setIsDailyGoalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activePageSlug, setActivePageSlug] = useState<string | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [selectedTafsir, setSelectedTafsir] = useState(TAFSIR_SOURCES[0]);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(() => {
    try {
      const saved = localStorage.getItem('quran_font_size');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('quran_theme');
      return saved || 'emerald';
    } catch {
      return 'emerald';
    }
  });

  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    try {
      const saved = localStorage.getItem('quran_playback_speed');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    localStorage.setItem('quran_font_size', fontSizeMultiplier.toString());
  }, [fontSizeMultiplier]);

  useEffect(() => {
    localStorage.setItem('quran_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('quran_playback_speed', playbackSpeed.toString());
  }, [playbackSpeed]);

  useEffect(() => {
    if (isBotOpen) {
      setIsPlaying(false);
      setIsPlayingBismillah(false);
    }
  }, [isBotOpen]);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('quran_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error("Failed to save bookmarks", e);
    }
  }, [bookmarks]);

  const isBookmarked = useCallback((ayahGlobalNumber: number) => {
    return bookmarks.some(b => b.ayahGlobalNumber === ayahGlobalNumber);
  }, [bookmarks]);

  const toggleBookmark = useCallback((ayah: Ayah, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!currentSurah) return;
    setBookmarks(prev => {
      const alreadySaved = prev.some(b => b.ayahGlobalNumber === ayah.number);
      if (alreadySaved) {
        return prev.filter(b => b.ayahGlobalNumber !== ayah.number);
      } else {
        const item: BookmarkItem = {
          surahNumber: currentSurah.number,
          surahName: currentSurah.name,
          surahEnglishName: currentSurah.englishName,
          ayahNumberInSurah: ayah.numberInSurah,
          ayahGlobalNumber: ayah.number,
          text: ayah.text,
          translation: ayah.translation
        };
        return [item, ...prev];
      }
    });
  }, [currentSurah]);

  const removeBookmarkByGlobalNumber = useCallback((ayahGlobalNumber: number) => {
    setBookmarks(prev => prev.filter(b => b.ayahGlobalNumber !== ayahGlobalNumber));
  }, []);

  // --- DAILY QURANIC GOAL DATA TYPES & MAIN STATE ---
  interface ReadAyahItem {
    surahNumber: number;
    surahName: string;
    surahEnglishName: string;
    ayahNumberInSurah: number;
    timestamp: number;
  }

  interface DailyGoalData {
    dailyGoal: number;
    streak: number;
    lastActiveDate: string;
    lastCompletedDate: string;
    history: {
      [dateKey: string]: ReadAyahItem[];
    };
  }

  const getTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [goalData, setGoalData] = useState<DailyGoalData>(() => {
    try {
      const saved = localStorage.getItem('quran_daily_goal_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          dailyGoal: parsed.dailyGoal || 10,
          streak: parsed.streak || 0,
          lastActiveDate: parsed.lastActiveDate || '',
          lastCompletedDate: parsed.lastCompletedDate || '',
          history: parsed.history || {}
        };
      }
    } catch (_) {}
    return {
      dailyGoal: 10,
      streak: 0,
      lastActiveDate: '',
      lastCompletedDate: '',
      history: {}
    };
  });

  // Startup streak validation: reset the streak if they missed yesterday's goal!
  useEffect(() => {
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();
    
    setGoalData(prev => {
      if (prev.streak === 0) return prev;
      
      const completedToday = prev.lastCompletedDate === todayStr;
      const completedYesterday = prev.lastCompletedDate === yesterdayStr;
      
      if (!completedToday && !completedYesterday) {
        const updated = {
          ...prev,
          streak: 0
        };
        localStorage.setItem('quran_daily_goal_data', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  // Update target daily goal target
  const updateDailyGoalTarget = useCallback((newGoal: number) => {
    setGoalData(prev => {
      const updated = {
        ...prev,
        dailyGoal: newGoal
      };
      localStorage.setItem('quran_daily_goal_data', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Track / mark an Ayah as completed/read automatically
  const markAyahAsRead = useCallback((surahNumber: number, surahName: string, surahEnglishName: string, ayahNumberInSurah: number) => {
    try {
      const todayStr = getTodayDateString();
      setGoalData(prev => {
        const todayList = prev.history[todayStr] || [];
        const alreadyRead = todayList.some(item => 
          item.surahNumber === surahNumber && item.ayahNumberInSurah === ayahNumberInSurah
        );
        if (alreadyRead) return prev;

        const newTodayList = [
          ...todayList,
          {
            surahNumber,
            surahName,
            surahEnglishName,
            ayahNumberInSurah,
            timestamp: Date.now()
          }
        ];

        const newHistory = {
          ...prev.history,
          [todayStr]: newTodayList
        };

        const wasCompletedBefore = todayList.length >= prev.dailyGoal;
        const isCompletedNow = newTodayList.length >= prev.dailyGoal;

        let newStreak = prev.streak;
        let newLastCompletedDate = prev.lastCompletedDate;

        if (isCompletedNow && !wasCompletedBefore) {
          const yesterdayStr = getYesterdayDateString();
          if (prev.lastCompletedDate === yesterdayStr) {
            newStreak = prev.streak + 1;
          } else if (prev.lastCompletedDate === todayStr) {
            // No change
          } else {
            newStreak = 1;
          }
          newLastCompletedDate = todayStr;
          
          // Trigger screen-wide interactive confetti burst!
          setTimeout(() => setShowConfetti(true), 150);
        }

        const updated = {
          ...prev,
          lastActiveDate: todayStr,
          lastCompletedDate: newLastCompletedDate,
          streak: newStreak,
          history: newHistory
        };

        localStorage.setItem('quran_daily_goal_data', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.warn("Failed to mark ayah as read:", err);
    }
  }, []);

  // Manual checkmark / uncheckmark toggle
  const toggleAyahRead = useCallback((surahNumber: number, surahName: string, surahEnglishName: string, ayahNumberInSurah: number) => {
    try {
      const todayStr = getTodayDateString();
      setGoalData(prev => {
        const todayList = prev.history[todayStr] || [];
        const isRead = todayList.some(item => 
          item.surahNumber === surahNumber && item.ayahNumberInSurah === ayahNumberInSurah
        );

        let newTodayList;
        if (isRead) {
          newTodayList = todayList.filter(item => 
            !(item.surahNumber === surahNumber && item.ayahNumberInSurah === ayahNumberInSurah)
          );
        } else {
          newTodayList = [
            ...todayList,
            {
              surahNumber,
              surahName,
              surahEnglishName,
              ayahNumberInSurah,
              timestamp: Date.now()
            }
          ];
        }

        const newHistory = {
          ...prev.history,
          [todayStr]: newTodayList
        };

        const wasCompletedBefore = todayList.length >= prev.dailyGoal;
        const isCompletedNow = newTodayList.length >= prev.dailyGoal;

        let newStreak = prev.streak;
        let newLastCompletedDate = prev.lastCompletedDate;

        if (isCompletedNow && !wasCompletedBefore) {
          const yesterdayStr = getYesterdayDateString();
          if (prev.lastCompletedDate === yesterdayStr) {
            newStreak = prev.streak + 1;
          } else if (prev.lastCompletedDate === todayStr) {
            // No change
          } else {
            newStreak = 1;
          }
          newLastCompletedDate = todayStr;
          
          // Trigger screen-wide interactive confetti burst!
          setTimeout(() => setShowConfetti(true), 150);
        } else if (!isCompletedNow && wasCompletedBefore) {
          if (prev.lastCompletedDate === todayStr) {
            const yesterdayStr = getYesterdayDateString();
            newStreak = Math.max(0, prev.streak - 1);
            newLastCompletedDate = prev.history[yesterdayStr]?.length >= prev.dailyGoal ? yesterdayStr : '';
          }
        }

        const updated = {
          ...prev,
          lastActiveDate: todayStr,
          lastCompletedDate: newLastCompletedDate,
          streak: newStreak,
          history: newHistory
        };

        localStorage.setItem('quran_daily_goal_data', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.warn("Failed to toggle ayah read status:", err);
    }
  }, []);

  const isAyahRead = useCallback((ayahGlobalNumber: number): boolean => {
    if (!currentSurah) return false;
    const ayah = currentSurah.ayahs?.find(a => a.number === ayahGlobalNumber);
    if (!ayah) return false;
    const todayStr = getTodayDateString();
    const todayList = goalData.history[todayStr] || [];
    return todayList.some(item => 
      item.surahNumber === currentSurah.number && item.ayahNumberInSurah === ayah.numberInSurah
    );
  }, [currentSurah, goalData.history]);

  // Focused study tracker: spending 3 seconds on a verse automatically counts it as read!
  useEffect(() => {
    if (!currentSurah) return;
    const current = currentSurah;
    const idx = currentAyahIndex;
    const ayah = current.ayahs?.[idx];
    if (!ayah) return;

    const timer = setTimeout(() => {
      markAyahAsRead(current.number, current.name, current.englishName, ayah.numberInSurah);
    }, 4000); // 4 seconds of focused study

    return () => clearTimeout(timer);
  }, [currentSurah?.number, currentAyahIndex, markAyahAsRead]);

  const [savedProgress, setSavedProgress] = useState<{
    surahNumber: number;
    surahName: string;
    surahEnglishName: string;
    ayahIndex: number;
    timestamp: number;
  } | null>(null);

  const isInitialMount = useRef(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quran_reading_progress');
      if (saved) {
        setSavedProgress(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to read progress", e);
    }
  }, []);

  const saveProgress = useCallback((surahNumber: number, surahName: string, surahEnglishName: string, ayahIndex: number) => {
    try {
      const progress = {
        surahNumber,
        surahName,
        surahEnglishName,
        ayahIndex,
        timestamp: Date.now()
      };
      localStorage.setItem('quran_reading_progress', JSON.stringify(progress));
      setSavedProgress(progress);
    } catch (e) {
      console.warn("Failed to save progress", e);
    }
  }, []);

  // Monitor changes of active surah or active ayah to save progress
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    if (currentSurah) {
      saveProgress(currentSurah.number, currentSurah.name, currentSurah.englishName, currentAyahIndex);
    }
  }, [currentSurah?.number, currentAyahIndex, saveProgress]);

  // Synchronize browser URL bar and dynamic meta tag values with the active surah and selected ayah index
  useEffect(() => {
    if (currentSurah) {
      const targetPath = `/surah/${currentSurah.number}/ayah/${currentAyahIndex + 1}`;
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ surah: currentSurah.number, ayah: currentAyahIndex }, '', targetPath);
        } catch (e) {
          console.warn("Failed to pushState, falling back to writing hash", e);
          try {
            window.location.hash = '#' + targetPath;
          } catch (he) {
            console.error("Failed to alter location hash fallback", he);
          }
        }
      }
      
      const title = `Surah ${currentSurah.englishName} Verse ${currentAyahIndex + 1} (Quran ${currentSurah.number}:${currentAyahIndex + 1}) - Meaning & Tafsir`;
      document.title = title;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', `Read Surah ${currentSurah.englishName} Ayat ${currentAyahIndex + 1} of the Noble Quran in Arabic with English translation, transliteration and scholarly Tafsir insights.`);
    }
  }, [currentSurah, currentAyahIndex]);

  // Turn off isInitialMount when first surah is loaded
  useEffect(() => {
    if (currentSurah && isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [currentSurah]);

  // Auto-start the tour if not completed and everything is loaded
  useEffect(() => {
    if (!isLoading && currentSurah) {
      try {
        const completed = localStorage.getItem('quran_onboarding_completed') === 'true';
        if (!completed) {
          setIsTourActive(true);
        }
      } catch (e) {
        console.warn("LocalStorage check failed:", e);
      }
    }
  }, [isLoading, currentSurah]);

  // Scroll to top button handling
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Fetch Surah List
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const cached = localStorage.getItem('surahs_list');
        if (cached) {
          try {
            setSurahs(JSON.parse(cached));
            return;
          } catch (parseErr) {
            console.warn("Failed to parse cached surah list, clearing:", parseErr);
            localStorage.removeItem('surahs_list');
          }
        }
        
        if (isOffline) {
          setSurahs(STATIC_SURAHS_LIST);
          return;
        }

        const res = await fetchWithRetry(`${API_BASE_URL}/surah`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        setSurahs(data.data);
        localStorage.setItem('surahs_list', JSON.stringify(data.data));
      } catch (e) {
        console.error("Failed to fetch surahs", e);
        if (surahs && surahs.length > 0) {
          console.log("Relying on pre-existing or static surah list.");
        } else {
          setError("Unable to load surah list. Please check your connection.");
        }
      }
    };
    fetchSurahs();
  }, [isOffline]);

  // Fetch Full Surah Data (Text + Audio + Translation)
  const loadSurah = useCallback(async (surahNumber: number, reciter: Reciter, translation: typeof TRANSLATION_LANGUAGES[0], tafsirSource?: typeof TAFSIR_SOURCES[0], targetAyahIndex?: number) => {
    setIsLoading(true);
    setError(null);
    const tafsirToUse = tafsirSource || selectedTafsir;
    const cacheKey = `Surah_${surahNumber}_${reciter.identifier}_${translation.id}_${tafsirToUse.id}`;

    const offlineItem = OFFLINE_SURAHS[surahNumber];
    
    // Look up offline data across potential databases and caches
    let downloadedData: Surah | null = null;
    try {
      downloadedData = await dbGet<Surah>(`Surah_offline_${surahNumber}`);
      if (!downloadedData) {
        const itemStr = localStorage.getItem(`Surah_offline_${surahNumber}`);
        if (itemStr) {
          downloadedData = JSON.parse(itemStr);
        }
      }
      
      // If we didn't find the general offline copy, check if there's any cached online copy
      if (!downloadedData) {
        downloadedData = await dbGet<Surah>(cacheKey);
      }
      if (!downloadedData) {
        const itemStr = localStorage.getItem(cacheKey);
        if (itemStr) {
          downloadedData = JSON.parse(itemStr);
        }
      }
    } catch (err) {
      console.warn("Failed retrieving offline data fallbacks:", err);
    }

    if (isOffline) {
      if (downloadedData && downloadedData.ayahs) {
        setCurrentSurah(downloadedData);
        if (targetAyahIndex !== undefined) {
          setCurrentAyahIndex(targetAyahIndex);
        } else {
          setCurrentAyahIndex(0);
        }
        setIsLoading(false);
        return;
      } else if (offlineItem) {
        setCurrentSurah(offlineItem);
        if (targetAyahIndex !== undefined) {
          setCurrentAyahIndex(targetAyahIndex);
        } else {
          setCurrentAyahIndex(0);
        }
        setIsReadingTranslation(false);
        setIsLoading(false);
        return;
      } else {
        setIsLoading(false);
        setError(`Notice: Surah ${surahNumber} is not downloaded for offline use yet. Please connect to the internet to download it, or click "Download All 114 Surahs" in Settings.`);
        return;
      }
    }

    // --- OFFLINE/LOCAL CACHE PRIORITISATION ---
    // If we have downloadedData from IndexedDB/localStorage that matches the current reciter & translation parameters,
    // load it instantly to achieve 0ms load speed and bypass unnecessary API network requests entirely!
    if (downloadedData && downloadedData.ayahs && downloadedData.ayahs[0]) {
      const firstAyah = downloadedData.ayahs[0];
      const hasExpectedAudio = !translation.audioId || ('translationAudio' in firstAyah);
      const hasTafsir = 'tafsir' in firstAyah;
      const matchesReciter = !firstAyah.audio || firstAyah.audio.includes(reciter.identifier);

      if (hasExpectedAudio && hasTafsir && matchesReciter) {
        const isSameSurah = currentSurah && currentSurah.number === downloadedData.number;
        setCurrentSurah(downloadedData);
        if (targetAyahIndex !== undefined) {
          setCurrentAyahIndex(targetAyahIndex);
        } else if (!isSameSurah) {
          setCurrentAyahIndex(0);
        }
        setIsReadingTranslation(false);
        setIsLoading(false);
        return;
      }
    }

    try {
      // Fallback localstorage cache validation
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data && data.ayahs) {
            const hasExpectedAudio = !translation.audioId || (data.ayahs[0] && 'translationAudio' in data.ayahs[0]);
            const hasTafsir = data.ayahs[0] && 'tafsir' in data.ayahs[0];
            
            if (hasExpectedAudio && hasTafsir) {
              const isSameSurah = currentSurah && currentSurah.number === data.number;
              setCurrentSurah(data);
              if (targetAyahIndex !== undefined) {
                setCurrentAyahIndex(targetAyahIndex);
              } else if (!isSameSurah) {
                setCurrentAyahIndex(0);
              }
              setIsReadingTranslation(false);
              setIsLoading(false);
              return;
            }
          }
        } catch (parseError) {
          console.warn("Failed to parse cached surah, clearing:", parseError);
          localStorage.removeItem(cacheKey);
        }
      }

      // Fetch Arabic, Translation, Arabic Audio, and potentially Translation Audio with smart fallback
      let quranData: any = null;
      let hasTranslationAudio = !!translation.audioId;

      let tafsirData = { tafsirs: [] };
      try {
        const tafsirRes = await fetchWithRetry(`${QURAN_COM_API_BASE_URL}/quran/tafsirs/${tafsirToUse.id}?chapter_number=${surahNumber}`);
        if (tafsirRes.ok) {
          tafsirData = await tafsirRes.json();
        }
      } catch (tafsirError) {
        console.warn("Failed to fetch tafsir, fallback to empty array:", tafsirError);
      }

      try {
        const editions = [
          'quran-uthmani',
          translation.id,
          reciter.identifier,
          translation.audioId
        ].filter(Boolean).join(',');

        const quranRes = await fetchWithRetry(`${API_BASE_URL}/surah/${surahNumber}/editions/${editions}`);
        if (!quranRes.ok) {
          throw new Error('Joint editions loading failed');
        }
        const temp = await quranRes.json();
        if (temp.status === 'OK' && temp.data && temp.data.length >= 3) {
          quranData = temp;
        } else {
          throw new Error('Joint editions format unexpected');
        }
      } catch (jointError) {
        console.warn('Joint editions loading failed, falling back to parallel individual fetches:', jointError);
        
        try {
          const fetchEdition = async (editionId: string) => {
            const res = await fetchWithRetry(`${API_BASE_URL}/surah/${surahNumber}/${editionId}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status} for ${editionId}`);
            const json = await res.json();
            if (json.status !== 'OK' || !json.data) throw new Error(`Invalid data status for ${editionId}`);
            return json.data;
          };

          const [arabicData, translationData, audioData] = await Promise.all([
            fetchEdition('quran-uthmani'),
            fetchEdition(translation.id).catch(err => {
              console.error('Failed to load selected translation, falling back to en.sahih', err);
              return fetchEdition('en.sahih');
            }),
            fetchEdition(reciter.identifier).catch(err => {
              console.error('Failed to load selected reciter, falling back to ar.alafasy', err);
              return fetchEdition('ar.alafasy');
            })
          ]);

          let transAudioData = null;
          if (translation.audioId) {
            try {
              transAudioData = await fetchEdition(translation.audioId);
            } catch (err) {
              console.warn('Failed to fetch translation audio, setting it to null', err);
              hasTranslationAudio = false;
            }
          }

          quranData = {
            status: 'OK',
            data: [
              arabicData,
              translationData,
              audioData,
              transAudioData
            ].filter(Boolean)
          };
        } catch (individualError) {
          throw new Error('Failed to load basic Surah text or audio. Please check your internet connection and try again.');
        }
      }

      if (quranData && quranData.status === 'OK') {
        processSurahData(quranData, hasTranslationAudio, tafsirData.tafsirs || [], cacheKey, targetAyahIndex);
      } else {
        throw new Error('Could not parse any Quranic source data');
      }
    } catch (e) {
      console.error("Failed to load surah details", e);
      // Attempt live error recovery to downloaded version first or pre-bundled version second
      if (downloadedData && downloadedData.ayahs) {
        setCurrentSurah(downloadedData);
        if (targetAyahIndex !== undefined) {
          setCurrentAyahIndex(targetAyahIndex);
        } else {
          setCurrentAyahIndex(0);
        }
        setIsReadingTranslation(false);
        setIsLoading(false);
        return;
      } else if (offlineItem) {
        setCurrentSurah(offlineItem);
        if (targetAyahIndex !== undefined) {
          setCurrentAyahIndex(targetAyahIndex);
        } else {
          setCurrentAyahIndex(0);
        }
        setIsReadingTranslation(false);
        setIsLoading(false);
        return;
      }
      if (!currentSurah) {
        setCurrentSurah(null); // Clear only if no active surah was loaded
      }
      setError(`Notice: ${e instanceof Error ? e.message : 'Connection error'}. Please connect to the internet or try reading an offline-ready Surah.`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTafsir, isOffline]);

  const downloadSurahForOffline = async (surahNumber: number) => {
    if (downloadProgressSurah !== null) return;
    setDownloadProgressSurah(surahNumber);
    setDownloadProgressMessage('Preparing...');
    
    try {
      setDownloadProgressMessage('Fetching text & audio links...');
      const editions = [
        'quran-uthmani',
        selectedTranslation.id,
        selectedReciter.identifier,
        selectedTranslation.audioId
      ].filter(Boolean).join(',');

      const quranRes = await fetchWithRetry(`${API_BASE_URL}/surah/${surahNumber}/editions/${editions}`);
      if (!quranRes.ok) throw new Error('Failed to retrieve Arabic text or translations');
      const quranData = await quranRes.json();
      
      setDownloadProgressMessage('Fetching scholars Tafsir...');
      let tafsirData = { tafsirs: [] };
      try {
        const tafsirRes = await fetchWithRetry(`${QURAN_COM_API_BASE_URL}/quran/tafsirs/${selectedTafsir.id}?chapter_number=${surahNumber}`);
        if (tafsirRes.ok) {
          tafsirData = await tafsirRes.json();
        }
      } catch (tafsirError) {
        console.warn("Failed to load Tafsir for download, continuing anyway:", tafsirError);
      }

      setDownloadProgressMessage('Composing dataset...');
      const arabicEd = quranData.data[0];
      const translationEd = quranData.data[1];
      const audioEd = quranData.data[2];
      const hasTranslationAudio = !!selectedTranslation.audioId;
      const transAudioEd = hasTranslationAudio ? quranData.data[3] : null;

      if (!arabicEd || !arabicEd.ayahs) throw new Error("Invalid Arabic data returned from server");

      const combinedAyahs: Ayah[] = arabicEd.ayahs.map((ayah: any, idx: number) => {
        const translationText = translationEd?.ayahs?.[idx]?.text || "Translation missing";
        const mainAudioUrl = audioEd?.ayahs?.[idx]?.audio || "";
        const transAudioUrl = transAudioEd?.ayahs?.[idx]?.audio;
        
        const verseKey = `${arabicEd.number}:${idx + 1}`;
        const tafsirItem = (tafsirData.tafsirs || []).find((t: any) => t.verse_key === verseKey);
        const tafsirText = tafsirItem ? he.decode(tafsirItem.text) : "Tafsir not available offline for this verse.";

        return {
          ...ayah,
          translation: translationText,
          tafsir: tafsirText,
          audio: mainAudioUrl,
          translationAudio: transAudioUrl,
        };
      });

      const fullSurah: Surah = {
        ...arabicEd,
        ayahs: combinedAyahs,
      };

      // Download all audio files for combinedAyahs to cache offline
      setDownloadProgressMessage('Preparing reciter audio files for offline use...');
      const audioToDownload: string[] = [];
      combinedAyahs.forEach(ayah => {
        if (ayah.audio) audioToDownload.push(ayah.audio);
        if (ayah.translationAudio) audioToDownload.push(ayah.translationAudio);
      });

      // Include Bismillah file
      const bismillahBitrate = selectedReciter.identifier === 'ar.abdulsamad' ? '64' : '128';
      const bismillahAudioUrl = (surahNumber !== 1 && surahNumber !== 9)
        ? `https://cdn.islamic.network/quran/audio/${bismillahBitrate}/${selectedReciter.identifier}/1.mp3`
        : null;
      if (bismillahAudioUrl) {
        audioToDownload.push(bismillahAudioUrl);
      }

      const totalAudios = audioToDownload.length;
      let downloadedAudiosCount = 0;

      // Run downloads in parallel batches of 8 to download very fast
      const BATCH_SIZE = 8;
      for (let i = 0; i < audioToDownload.length; i += BATCH_SIZE) {
        const batch = audioToDownload.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (url) => {
          try {
            const existing = await dbGet(url);
            if (!existing) {
              const blob = await fetchAudioBlob(url);
              await dbSet(url, blob);
            }
          } catch (audioErr) {
            console.warn(`Failed to cache offline audio for ${url}:`, audioErr);
          } finally {
            downloadedAudiosCount++;
            setDownloadProgressMessage(`Downloading Reciter Audio: ${Math.round((downloadedAudiosCount / totalAudios) * 100)}% ...`);
          }
        }));
      }

      setDownloadProgressMessage('Writing to local safe database...');
      try {
        localStorage.setItem(`Surah_offline_${surahNumber}`, JSON.stringify(fullSurah));
      } catch (e) {
        console.warn("LocalStorage quota exceeded, relying solely on IndexedDB for offline storage", e);
      }
      await dbSet(`Surah_offline_${surahNumber}`, fullSurah);

      const updatedList = Array.from(new Set([...downloadedSurahs, surahNumber]));
      setDownloadedSurahs(updatedList);
      localStorage.setItem('downloaded_offline_surahs', JSON.stringify(updatedList));
      await dbSet('downloaded_offline_surahs', updatedList);

      setDownloadProgressMessage('Offline cache complete!');
      setTimeout(() => {
        setDownloadProgressSurah(null);
      }, 1500);

    } catch (err) {
      console.error("Failed to download Surah details:", err);
      setDownloadProgressMessage(`Failed: ${err instanceof Error ? err.message : 'Error'}`);
      setTimeout(() => {
        setDownloadProgressSurah(null);
      }, 3050);
    }
  };

  const deleteOfflineSurah = async (surahNumber: number) => {
    try {
      localStorage.removeItem(`Surah_offline_${surahNumber}`);
      await dbDelete(`Surah_offline_${surahNumber}`);
      const updatedList = downloadedSurahs.filter(id => id !== surahNumber);
      setDownloadedSurahs(updatedList);
      localStorage.setItem('downloaded_offline_surahs', JSON.stringify(updatedList));
      await dbSet('downloaded_offline_surahs', updatedList);
    } catch (e) {
      console.error("Failed to delete offline surah:", e);
    }
  };

  const clearAllOfflineSurahs = async () => {
    if (window.confirm && !window.confirm("Are you sure you want to delete all offline downloaded Surahs and audio recitations? This will free up storage space.")) {
      return;
    }
    try {
      setBulkDownloadStatus('downloading');
      setBulkDownloadMessage('Clearing offline database and audio files...');
      
      for (let i = 1; i <= 114; i++) {
        localStorage.removeItem(`Surah_offline_${i}`);
        await dbDelete(`Surah_offline_${i}`);
      }
      
      // Clear stored surahs list and cached keys
      const keys = await dbKeys();
      for (const k of keys) {
        if (k.startsWith('http') || k.endsWith('.mp3')) {
          await dbDelete(k);
        }
      }

      setDownloadedSurahs([]);
      localStorage.removeItem('downloaded_offline_surahs');
      await dbDelete('downloaded_offline_surahs');

      setBulkDownloadStatus('completed');
      setBulkDownloadMessage('Offline cache fully cleared.');
      setTimeout(() => {
        setBulkDownloadStatus('idle');
      }, 3000);
    } catch (e) {
      console.error("Failed to clear offline database:", e);
      setBulkDownloadStatus('error');
      setBulkDownloadError(e instanceof Error ? e.message : String(e));
    }
  };

  // Bulk Downloading of all 114 Surahs
  const downloadAllSurahsOffline = async () => {
    if (isBulkDownloading) return;
    setIsBulkDownloading(true);
    setBulkDownloadStatus('downloading');
    setBulkDownloadError(null);
    setBulkDownloadProgress(0);
    setBulkDownloadCurrentIndex(1);
    setBulkDownloadMessage('Starting bulk download of all 114 Surahs...');

    const list: number[] = [...downloadedSurahs];

    try {
      for (let i = 1; i <= 114; i++) {
        if (!isBulkDownloading) {
          // If stopped/cancelled somehow in state
          break;
        }
        setBulkDownloadCurrentIndex(i);
        setBulkDownloadProgress(Math.round(((i - 1) / 114) * 100));

        const surahMeta = STATIC_SURAHS_LIST.find(s => s.number === i);
        const nameStr = surahMeta ? `(${surahMeta.englishName})` : '';
        setBulkDownloadMessage(`Surah ${i}/114 ${nameStr}...`);

        // Check if already in IndexedDB and matches the selected reciter/translation
        const existing = await dbGet<Surah>(`Surah_offline_${i}`);
        if (existing && existing.ayahs && existing.ayahs[0]) {
          const firstAyah = existing.ayahs[0];
          const hasCurrentReciter = firstAyah.audio && firstAyah.audio.includes(selectedReciter.identifier);
          const hasCurrentTranslation = !selectedTranslation.audioId || (firstAyah.translationAudio && firstAyah.translationAudio.includes(selectedTranslation.audioId));
          
          if (hasCurrentReciter && hasCurrentTranslation) {
            if (!list.includes(i)) {
              list.push(i);
            }
            continue;
          }
        }

        // Fetch joint editions
        const editions = [
          'quran-uthmani',
          selectedTranslation.id,
          selectedReciter.identifier,
          selectedTranslation.audioId
        ].filter(Boolean).join(',');

        let quranData: any = null;
        try {
          const quranRes = await fetchWithRetry(`${API_BASE_URL}/surah/${i}/editions/${editions}`, 3, 400);
          if (quranRes.ok) {
            quranData = await quranRes.json();
          }
        } catch (err) {
          console.warn(`Error loading joint editions for Surah ${i}:`, err);
        }

        // Fallback parallel downloads if joint loading fails for this surah
        if (!quranData || quranData.status !== 'OK' || !quranData.data) {
          try {
            const fetchEd = async (edId: string) => {
              const res = await fetchWithRetry(`${API_BASE_URL}/surah/${i}/${edId}`, 3, 400);
              const json = await res.json();
              return json.data;
            };
            const [ar, tr, au] = await Promise.all([
              fetchEd('quran-uthmani'),
              fetchEd(selectedTranslation.id),
              fetchEd(selectedReciter.identifier)
            ]);
            quranData = {
              status: 'OK',
              data: [ar, tr, au]
            };
          } catch (parallelErr) {
            console.error(`Parallel fallback also failed for Surah ${i}:`, parallelErr);
            continue; // Move to next surah instead of crashing the entire progress
          }
        }

        let tafsirData = { tafsirs: [] };
        try {
          const tafsirRes = await fetchWithRetry(`${QURAN_COM_API_BASE_URL}/quran/tafsirs/${selectedTafsir.id}?chapter_number=${i}`, 3, 400);
          if (tafsirRes.ok) {
            tafsirData = await tafsirRes.json();
          }
        } catch (tafsirErr) {
          console.warn(`Tafsir cache failed for Surah ${i}:`, tafsirErr);
        }

        const arabicEd = quranData.data[0];
        const translationEd = quranData.data[1];
        const audioEd = quranData.data[2];
        const hasTranslationAudio = !!selectedTranslation.audioId;
        const transAudioEd = hasTranslationAudio ? quranData.data[3] : null;

        if (!arabicEd || !arabicEd.ayahs) continue;

        const combinedAyahs: Ayah[] = arabicEd.ayahs.map((ayah: any, idx: number) => {
          const translationText = translationEd?.ayahs?.[idx]?.text || "Translation missing";
          const mainAudioUrl = audioEd?.ayahs?.[idx]?.audio || "";
          const transAudioUrl = transAudioEd?.ayahs?.[idx]?.audio;
          
          const verseKey = `${arabicEd.number}:${idx + 1}`;
          const tafsirItem = (tafsirData.tafsirs || []).find((t: any) => t.verse_key === verseKey);
          const tafsirText = tafsirItem ? he.decode(tafsirItem.text) : "Tafsir not available offline for this verse.";

          return {
            ...ayah,
            translation: translationText,
            tafsir: tafsirText,
            audio: mainAudioUrl,
            translationAudio: transAudioUrl,
          };
        });

        const fullSurah: Surah = {
          ...arabicEd,
          ayahs: combinedAyahs,
        };

        // Download all audio files for combinedAyahs to cache offline
        const audioUrls: string[] = [];
        combinedAyahs.forEach(ayah => {
          if (ayah.audio) audioUrls.push(ayah.audio);
          if (ayah.translationAudio) audioUrls.push(ayah.translationAudio);
        });

        const bismillahBitrate = selectedReciter.identifier === 'ar.abdulsamad' ? '64' : '128';
        const bismillahUrl = (i !== 1 && i !== 9)
          ? `https://cdn.islamic.network/quran/audio/${bismillahBitrate}/${selectedReciter.identifier}/1.mp3`
          : null;
        if (bismillahUrl) {
          audioUrls.push(bismillahUrl);
        }

        const BATCH_SIZE = 8;
        for (let j = 0; j < audioUrls.length; j += BATCH_SIZE) {
          const batch = audioUrls.slice(j, j + BATCH_SIZE);
          await Promise.all(batch.map(async (url) => {
            try {
              const cached = await dbGet(url);
              if (!cached) {
                const blob = await fetchAudioBlob(url);
                await dbSet(url, blob);
              }
            } catch (err) {
              console.warn(`Failed to download audio during bulk ${url}`, err);
            }
          }));

          const subProgress = Math.round(((j + batch.length) / audioUrls.length) * 100);
          setBulkDownloadMessage(`Surah ${i}/114 ${nameStr} (Audio ${subProgress}%)...`);
        }

        // Write to IndexedDB
        await dbSet(`Surah_offline_${i}`, fullSurah);
        
        // Try writing to LocalStorage selectively, ignoring if quota is full
        try {
          localStorage.setItem(`Surah_offline_${i}`, JSON.stringify(fullSurah));
        } catch {
          // completely fine to fail, IDB is the source of truth
        }

        if (!list.includes(i)) {
          list.push(i);
        }

        const updatedList = Array.from(new Set(list));
        setDownloadedSurahs(updatedList);
        localStorage.setItem('downloaded_offline_surahs', JSON.stringify(updatedList));
        await dbSet('downloaded_offline_surahs', updatedList);

        // Pause slightly to prevent overloading
        await new Promise(resolve => setTimeout(resolve, 60));
      }

      setBulkDownloadProgress(100);
      setBulkDownloadCurrentIndex(114);
      setBulkDownloadStatus('completed');
      setBulkDownloadMessage('Offline database complete! All available Surahs successfully stored for 100% offline usage.');
      
      const pSaved = Array.from(new Set([...list, ...Array.from({length: 114}, (_, idx) => idx + 1)]));
      setDownloadedSurahs(pSaved);
      localStorage.setItem('downloaded_offline_surahs', JSON.stringify(pSaved));
      await dbSet('downloaded_offline_surahs', pSaved);

      setTimeout(() => {
        setIsBulkDownloading(false);
        setBulkDownloadStatus('idle');
      }, 5000);

    } catch (err) {
      console.error("Bulk download failed:", err);
      setBulkDownloadStatus('error');
      setBulkDownloadError(err instanceof Error ? err.message : String(err));
      setIsBulkDownloading(false);
    }
  };

  const selectBookmarkedAyah = useCallback(async (bookmark: BookmarkItem) => {
    setIsBookmarksOpen(false);
    setIsMobileMenuOpen(false);
    
    // Check if we need to load a different surah first
    if (!currentSurah || currentSurah.number !== bookmark.surahNumber) {
      await loadSurah(bookmark.surahNumber, selectedReciter, selectedTranslation, selectedTafsir);
    }
    
    // Set active ayah index
    setCurrentAyahIndex(bookmark.ayahNumberInSurah - 1);
    setIsReadingTranslation(false);
    setIsPlaying(false);
  }, [currentSurah, loadSurah, selectedReciter, selectedTranslation, selectedTafsir]);

  const handleSelectHistoricalAyah = useCallback(async (surahNumber: number, ayahNumberInSurah: number) => {
    setIsDailyGoalOpen(false);
    setIsMobileMenuOpen(false);
    
    // Check if we need to load a different surah first
    if (!currentSurah || currentSurah.number !== surahNumber) {
      await loadSurah(surahNumber, selectedReciter, selectedTranslation, selectedTafsir);
    }
    
    // Set active index
    setCurrentAyahIndex(ayahNumberInSurah - 1);
    setIsReadingTranslation(false);
    setIsPlaying(false);
  }, [currentSurah, loadSurah, selectedReciter, selectedTranslation, selectedTafsir]);

  const processSurahData = (data: any, hasTranslationAudio: boolean, tafsirs: any[], cacheKey: string, targetAyahIndex?: number) => {
    const arabicEd = data.data[0];
    const translationEd = data.data[1];
    const audioEd = data.data[2];
    const transAudioEd = hasTranslationAudio ? data.data[3] : null;

    if (!arabicEd || !arabicEd.ayahs) throw new Error("Invalid Arabic data from API");

    const combinedAyahs: Ayah[] = arabicEd.ayahs.map((ayah: any, idx: number) => {
      // Find matching index in other editions
      const translationText = translationEd?.ayahs?.[idx]?.text || "Translation missing";
      const mainAudioUrl = audioEd?.ayahs?.[idx]?.audio || "";
      const transAudioUrl = transAudioEd?.ayahs?.[idx]?.audio;
      
      // Find tafsir for this verse
      // Quran.com API might return them with verse_key "1:1"
      const verseKey = `${arabicEd.number}:${idx + 1}`;
      const tafsirItem = tafsirs.find(t => t.verse_key === verseKey);
      const tafsirText = tafsirItem ? he.decode(tafsirItem.text) : "Tafsir not available for this verse.";

      return {
        ...ayah,
        translation: translationText,
        tafsir: tafsirText,
        audio: mainAudioUrl,
        translationAudio: transAudioUrl,
      };
    });

    const fullSurah: Surah = {
      ...arabicEd,
      ayahs: combinedAyahs,
    };

    const isSameSurah = currentSurah && currentSurah.number === arabicEd.number;
    setCurrentSurah(fullSurah);
    if (targetAyahIndex !== undefined) {
      setCurrentAyahIndex(targetAyahIndex);
    } else if (!isSameSurah) {
      setCurrentAyahIndex(0);
    }
    setIsReadingTranslation(false);
    
    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(fullSurah));
      dbSet(cacheKey, fullSurah);
    } catch (e) {
      console.warn("Storage quota exceeded, clearing cached Surahs to free up space");
      // Selectively clear only cached Surahs, keeping bookmarks and progress
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("Surah_") && !key.startsWith("Surah_offline_")) {
          localStorage.removeItem(key);
        }
      }
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fullSurah));
      } catch (retryErr) {
        console.warn("Still could not cache surah after clearing caches:", retryErr);
      }
      dbSet(cacheKey, fullSurah);
    }
  };

  const handleResumeReading = useCallback(() => {
    if (savedProgress) {
      loadSurah(
        savedProgress.surahNumber,
        selectedReciter,
        selectedTranslation,
        selectedTafsir,
        savedProgress.ayahIndex
      );
    }
  }, [savedProgress, selectedReciter, selectedTranslation, selectedTafsir, loadSurah]);

  // Initial load on mount - parses crawlable SEO URLs or fallback to saved progress / Surah 1, supporting custom pages & admin CMS
  const parsePathAndRouteState = useCallback(() => {
    let pathname = window.location.pathname;

    // Check hash fallback if we are in restricted preview/iframe systems and have a fallback routing hash
    if (window.location.hash) {
      const hashClean = window.location.hash.replace(/^#/, '');
      if (hashClean.startsWith('/')) {
        pathname = hashClean;
      }
    }

    if (pathname === '/admin') {
      setIsAdminOpen(true);
      setActivePageSlug(null);
      return;
    }

    const pageMatch = pathname.match(/\/page\/([a-zA-Z0-9_-]+)/);
    if (pageMatch) {
      setActivePageSlug(pageMatch[1]);
      setIsAdminOpen(false);
      return;
    }

    // Default Surah routing
    setActivePageSlug(null);
    setIsAdminOpen(false);

    const pathParts = pathname.match(/\/surah\/(\d+)(?:\/ayah\/(\d+))?/);
    if (pathParts) {
      const sNum = parseInt(pathParts[1], 10);
      const aNum = pathParts[2] ? parseInt(pathParts[2], 10) : 1;
      if (sNum >= 1 && sNum <= 114) {
        loadSurah(sNum, selectedReciter, selectedTranslation, selectedTafsir, aNum - 1);
        return;
      }
    }

    let progressToUse = savedProgress;
    if (!progressToUse) {
      try {
        const stored = localStorage.getItem('quran_reading_progress');
        if (stored) {
          progressToUse = JSON.parse(stored);
        }
      } catch (_) {}
    }

    if (progressToUse) {
      loadSurah(
        progressToUse.surahNumber,
        selectedReciter,
        selectedTranslation,
        selectedTafsir,
        progressToUse.ayahIndex
      );
    } else {
      loadSurah(1, selectedReciter, selectedTranslation, selectedTafsir);
    }
  }, [savedProgress, selectedReciter, selectedTranslation, selectedTafsir, loadSurah]);

  useEffect(() => {
    parsePathAndRouteState();
    window.addEventListener('popstate', parsePathAndRouteState);
    window.addEventListener('hashchange', parsePathAndRouteState);
    return () => {
      window.removeEventListener('popstate', parsePathAndRouteState);
      window.removeEventListener('hashchange', parsePathAndRouteState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync background video with ayah progress for immersive experience
  useEffect(() => {
    if (!currentSurah) return;
    
    // Cycle backgrounds every 5 ayahs or based on surah progress
    // This creates a subtle shift in atmosphere as the recitation progresses
    const videoIndex = Math.floor(currentAyahIndex / 5) % BACKGROUND_VIDEOS.length;
    const targetVideo = BACKGROUND_VIDEOS[videoIndex];
    
    if (backgroundVideo.id !== targetVideo.id) {
      setBackgroundVideo(targetVideo);
    }
  }, [currentAyahIndex, currentSurah, backgroundVideo.id]);

  const [hasPlayedBismillahForCurrent, setHasPlayedBismillahForCurrent] = useState(false);
  const [bismillahRetryWithDefault, setBismillahRetryWithDefault] = useState(false);

  useEffect(() => {
    setHasPlayedBismillahForCurrent(false);
    setBismillahRetryWithDefault(false);
  }, [currentSurah?.number, selectedReciter.identifier, currentAyahIndex]);

  useEffect(() => {
    const isAbdulBasit = selectedReciter.identifier.includes('abdulsamad') || selectedReciter.identifier.includes('abdulbasit');
    if (isPlaying && currentAyahIndex === 0 && currentSurah && currentSurah.number !== 1 && currentSurah.number !== 9 && !hasPlayedBismillahForCurrent && !isAbdulBasit) {
      setIsPlayingBismillah(true);
    } else {
      setIsPlayingBismillah(false);
    }
  }, [isPlaying, currentAyahIndex, currentSurah, hasPlayedBismillahForCurrent, selectedReciter.identifier]);

  // Stall-protection for Bismillah audio
  useEffect(() => {
    let stallTimeout: NodeJS.Timeout | null = null;
    if (isPlayingBismillah && isPlaying) {
      // If Bismillah stalls/fails to load within 15s (network stall), skip to avoid freeze
      stallTimeout = setTimeout(() => {
        console.warn("Bismillah audio playback stalled or failed to load. Skipping directly to main verse...");
        setHasPlayedBismillahForCurrent(true);
        setIsPlayingBismillah(false);
      }, 15000);
    }
    return () => {
      if (stallTimeout) clearTimeout(stallTimeout);
    };
  }, [isPlayingBismillah, isPlaying]);

  const handleNextAyah = useCallback(() => {
    if (!currentSurah) return;
    if (currentAyahIndex < currentSurah.ayahs!.length - 1) {
      setCurrentAyahIndex(prev => prev + 1);
      setIsReadingTranslation(layoutMode === 'translation');
    } else {
      // Load next surah
      if (currentSurah.number < 114) {
        loadSurah(currentSurah.number + 1, selectedReciter, selectedTranslation, selectedTafsir);
        setIsReadingTranslation(layoutMode === 'translation');
      } else {
        setIsPlaying(false);
        setIsReadingTranslation(false);
      }
    }
  }, [currentSurah, currentAyahIndex, loadSurah, selectedReciter, selectedTranslation, selectedTafsir, layoutMode]);

  const handlePrevAyah = useCallback(() => {
    if (currentAyahIndex > 0) {
      setCurrentAyahIndex(prev => prev - 1);
      setIsReadingTranslation(layoutMode === 'translation');
    }
  }, [currentAyahIndex, layoutMode]);

  const handleAudioEnd = useCallback(() => {
    if (isPlayingBismillah) {
      setHasPlayedBismillahForCurrent(true);
      setIsPlayingBismillah(false);
      return;
    }

    if (!currentSurah) return;
    const ayah = currentSurah.ayahs![currentAyahIndex];
    markAyahAsRead(currentSurah.number, currentSurah.name, currentSurah.englishName, ayah.numberInSurah);

    // Support reading any enabled translation languages
    if (!isReadingTranslation && isReadTranslationAloudEnabled) {
      setIsReadingTranslation(true);
    } else {
      handleNextAyah();
    }
  }, [isPlayingBismillah, currentSurah, currentAyahIndex, isReadingTranslation, showTranslation, isReadTranslationAloudEnabled, handleNextAyah]);

  const handleAudioError = useCallback((err: any) => {
    console.warn("Playback error encountered:", err);
    if (isPlayingBismillah) {
      if (!bismillahRetryWithDefault && selectedReciter.identifier !== 'ar.alafasy') {
        console.log("Primary reciter Bismillah failed, retrying with default reciter Alafasy Bismillah...");
        setBismillahRetryWithDefault(true);
      } else {
        console.log("Bismillah audio completely failed, skipping to main verse...");
        setHasPlayedBismillahForCurrent(true);
        setIsPlayingBismillah(false);
      }
    } else {
      console.warn("Main Verse audio failed to load.");
    }
  }, [isPlayingBismillah, bismillahRetryWithDefault, selectedReciter.identifier]);

  const currentAyah = currentSurah?.ayahs?.[currentAyahIndex] || null;

  const bismillahBitrate = selectedReciter.identifier === 'ar.abdulsamad' ? '64' : '128';
  const activeAudioUrl = isPlayingBismillah
    ? (bismillahRetryWithDefault 
       ? `https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3`
       : `https://cdn.islamic.network/quran/audio/${bismillahBitrate}/${selectedReciter.identifier}/1.mp3`)
    : isReadingTranslation 
      ? currentAyah?.translationAudio || null 
      : currentAyah?.audio || null;

  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let localUrl: string | null = null;

    if (!activeAudioUrl) {
      setResolvedAudioUrl(null);
      return;
    }

    const resolveUrl = async () => {
      try {
        const cachedBlob = await dbGet<Blob>(activeAudioUrl);
        if (cachedBlob && active) {
          localUrl = URL.createObjectURL(cachedBlob);
          setResolvedAudioUrl(localUrl);
        } else if (active) {
          setResolvedAudioUrl(activeAudioUrl);
        }
      } catch (err) {
        console.warn("Failed resolving cached audio blob:", err);
        if (active) {
          setResolvedAudioUrl(activeAudioUrl);
        }
      }
    };

    resolveUrl();

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [activeAudioUrl]);

  // Support high-quality browser speech synthesis (Text-to-Speech) read aloud for translation languages with no pre-recorded audio files
  useEffect(() => {
    // We only use TTS if we are playing a translation that has no pre-recorded/downloaded audio (or if it's missing)
    const needsTTS = isPlaying && isReadingTranslation && currentAyah && !resolvedAudioUrl;

    if (!needsTTS) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const langCode = selectedTranslation.id.split('.')[0]; // e.g., "bn", "hi", "fr", "tr", "en", "ur"
    
    // We only use Gemini-based TTS if online; offline must strictly use browser-native SpeechSynthesis
    const isGeminiTTSLanguage = !isOffline && ['hi', 'tr', 'fr', 'bn'].includes(langCode);

    let active = true;

    // Clean text of html tags, brackets, footnotes pointers for a seamless speech experience
    const rawText = currentAyah!.translation;

    const cleanText = rawText
      .replace(/<[^>]*>/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();

    if (!cleanText) {
      handleAudioEnd();
      return;
    }

    if (isGeminiTTSLanguage) {
      let activeAudioContext: AudioContext | null = null;

      const fetchAndPlay = async () => {
        try {
          const response = await fetch('/api/gemini/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, language: langCode }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch Gemini TTS');
          }

          const data = await response.json();
          if (!active) return;

          if (data.audio) {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            activeAudioContext = audioCtx;

            const binary = window.atob(data.audio);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
              float32Array[i] = int16Array[i] / 32768.0;
            }

            const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
            audioBuffer.getChannelData(0).set(float32Array);

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            
            source.onended = () => {
              try {
                audioCtx.close();
              } catch (e) {}
              if (active) {
                handleAudioEnd();
              }
            };

            source.start(0);
          } else {
            handleAudioEnd();
          }
        } catch (err) {
          console.error("Gemini TTS reading error:", err);
          handleAudioEnd();
        }
      };

      fetchAndPlay();

      return () => {
        active = false;
        if (activeAudioContext) {
          try {
            activeAudioContext.close();
          } catch (e) {}
        }
      };
    }

    // Default Browser-native Synthesis fallback
    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const bcp47 = LANGUAGE_BCP47_MAP[langCode] || langCode;
    utterance.lang = bcp47;
    utterance.rate = playbackSpeed;

    const doSpeak = () => {
      if (!active) return;
      const voices = synth.getVoices();
      
      const bcp47Lower = bcp47.toLowerCase();
      const langVoices = voices.filter(v => {
        const vl = v.lang.toLowerCase();
        return vl === langCode || vl === bcp47Lower || vl.startsWith(langCode + '-') || vl.startsWith(langCode + '_');
      });

      if (langVoices.length > 0) {
        // Find best match or default
        const selectedVoice = langVoices.find(v => v.lang.toLowerCase() === bcp47Lower) || langVoices[0];
        utterance.voice = selectedVoice;
      }

      synth.cancel();
      // Brief timeout to let cancel operation finish cleanly
      setTimeout(() => {
        if (active) {
          synth.speak(utterance);
        }
      }, 30);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => {
        if (active) {
          doSpeak();
        }
      };
    } else {
      doSpeak();
    }

    utterance.onend = () => {
      if (active) {
        handleAudioEnd();
      }
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      // If of type 'interrupted' because of standard cancel(), don't skip
      if (active && e.error !== 'interrupted') {
        handleAudioEnd();
      }
    };

    return () => {
      active = false;
      synth.cancel();
      if (synth.onvoiceschanged) {
        synth.onvoiceschanged = null;
      }
    };
  }, [isPlaying, isReadingTranslation, currentAyah, selectedTranslation, playbackSpeed, handleAudioEnd, isOffline, resolvedAudioUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomBackground(url);
      setBackgroundVideo({
        id: 'custom',
        name: 'Custom Background',
        url: url,
        type: file.type
      });
      setIsSettingsOpen(false);
    }
  };

  let wrapperClass = "min-h-screen font-sans transition-all duration-500 ";
  if (theme === 'sepia') {
    wrapperClass += " theme-sepia bg-[#f4ecd8] text-[#3e2723] selection:bg-amber-200/50 selection:text-amber-955";
  } else if (theme === 'oled') {
    wrapperClass += "bg-black text-white selection:bg-white/20 selection:text-white";
  } else if (theme === 'emerald') {
    wrapperClass += "bg-[#07130e] text-[#f2f8f5] selection:bg-emerald-600/30 selection:text-[#52d294]";
  } else {
    wrapperClass += "bg-[#05020a] text-white selection:bg-white selection:text-black";
  }

  return (
    <div className={wrapperClass}>
      <BackgroundVisuals videoUrl={backgroundVideo.url} mimeType={backgroundVideo.type} theme={theme} />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 p-4 md:p-6 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <motion.button
            id="tour-surah-selector"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSurahModalOpen(true)}
            className={`flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 backdrop-blur-md rounded-full border shadow-lg text-sm md:text-base transition-all duration-300 ${
              theme === 'sepia'
                ? 'bg-amber-900/10 border-amber-900/15 text-[#3e2723] hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 border-emerald-800/30 text-[#caae7a] hover:bg-emerald-950/60 hover:border-[#caae7a]/35'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Music size={16} />
            <span className="font-medium">{currentSurah?.englishName || 'Surah List'}</span>
          </motion.button>
        </div>

        {/* Desktop Controls (Only visible on medium devices and up) */}
        <div className="pointer-events-auto hidden md:flex items-center gap-4">
          <button 
            id="tour-translation-toggle"
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-2 px-4 py-3 backdrop-blur-md rounded-full border transition-all cursor-pointer ${
              theme === 'sepia'
                ? showTranslation
                  ? 'bg-amber-800 text-[#fcf8f2] border-amber-800'
                  : 'bg-amber-900/10 text-amber-900/70 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? showTranslation
                    ? 'bg-[#caae7a] text-[#07130e] border-[#caae7a] shadow-[0_4px_12px_rgba(202,174,122,0.25)]'
                    : 'bg-emerald-950/40 text-[#ebf3f1]/70 border-emerald-800/30 hover:bg-emerald-950/60 hover:text-white'
                  : showTranslation
                    ? 'bg-indigo-600/25 border-indigo-500/30 text-indigo-300'
                    : 'bg-white/10 border-white/10 text-white/40 hover:bg-white/20 hover:text-white'
            }`}
            title="Toggle Translation"
          >
            {showTranslation ? <ToggleRight size={20} className={theme === 'sepia' ? 'text-amber-200' : theme === 'emerald' ? 'text-[#07130e]' : 'text-indigo-400'} /> : <ToggleLeft size={20} />}
            <span className="text-xs font-semibold uppercase tracking-wider">Translation</span>
          </button>
          
          <button 
            id="tour-language-selector"
            onClick={() => setIsLanguageModalOpen(true)}
            className={`p-3 backdrop-blur-md rounded-full border transition-all cursor-pointer ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-900 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30 hover:bg-emerald-950/60 hover:scale-105'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Translation Language"
          >
            <Languages size={20} />
          </button>

          <button 
            id="tour-atmosphere-settings"
            onClick={() => setIsSettingsOpen(true)}
            className={`p-3 backdrop-blur-md rounded-full border transition-all cursor-pointer ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-[#3e2723] border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30 hover:bg-emerald-950/60 hover:scale-105'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Settings & Atmosphere"
          >
            <Settings size={20} />
          </button>

          <button 
            id="tour-daily-habit"
            onClick={() => setIsDailyGoalOpen(true)}
            className={`p-3 backdrop-blur-md rounded-full border transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-[#3e2723] border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30 hover:bg-emerald-950/60 hover:scale-105'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title={`Daily Quranic Goal: ${Math.min(Math.round(((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal) * 100), 100)}% completed`}
          >
            <svg width="20" height="20" className="transform -rotate-90 shrink-0">
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke={theme === 'sepia' ? 'rgba(120,53,4,0.1)' : theme === 'emerald' ? 'rgba(202,174,122,0.1)' : 'rgba(255,255,255,0.05)'}
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke={theme === 'sepia' ? '#b45309' : theme === 'emerald' ? '#caae7a' : '#6366f1'}
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${2 * Math.PI * 8 * (1 - Math.min((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal, 1))}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[10px] font-bold font-mono tracking-tight flex items-center gap-0.5 leading-none">
              {goalData.streak > 0 && <Flame size={12} fill="currentColor" className="text-orange-500 animate-pulse -mt-0.5" />}
              {goalData.streak > 0 ? `${goalData.streak}d` : `${goalData.history[getTodayDateString()]?.length || 0}/${goalData.dailyGoal}`}
            </span>
          </button>

          <button 
            id="tour-bookmarks"
            onClick={() => setIsBookmarksOpen(true)}
            className={`p-3 backdrop-blur-md rounded-full border transition-all cursor-pointer relative ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-[#3e2723] border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30 hover:bg-emerald-950/60 hover:scale-105'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Bookmarks"
          >
            <Bookmark size={20} />
            {bookmarks.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md border ${
                theme === 'sepia'
                  ? 'bg-amber-800 text-amber-50 border-amber-800'
                  : theme === 'emerald'
                    ? 'bg-[#caae7a] text-[#07130e] border-[#caae7a]'
                    : 'bg-indigo-550 text-white border-white/20'
              }`}>
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Menu Trigger & Translation Toggle */}
        <div className="pointer-events-auto flex md:hidden items-center gap-1.5">
          <button 
            onClick={() => setIsDailyGoalOpen(true)}
            className={`p-2 backdrop-blur-md rounded-full border transition-all cursor-pointer relative ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-955 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title={`Daily Quranic Goal: ${Math.min(Math.round(((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal) * 100), 100)}%`}
          >
            <div className="flex items-center gap-1 leading-none">
              <svg width="14" height="14" className="transform -rotate-90 shrink-0">
                <circle cx="7" cy="7" r="5" stroke={theme === 'sepia' ? 'rgba(120,53,4,0.1)' : theme === 'emerald' ? 'rgba(202,174,122,0.1)' : 'rgba(255,255,255,0.05)'} strokeWidth="2" fill="transparent" />
                <circle cx="7" cy="7" r="5" stroke={theme === 'sepia' ? '#b45309' : theme === 'emerald' ? '#caae7a' : '#6366f1'} strokeWidth="2" fill="transparent" strokeDasharray={`${2 * Math.PI * 5}`} strokeDashoffset={`${2 * Math.PI * 5 * (1 - Math.min((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal, 1))}`} strokeLinecap="round" />
              </svg>
              {goalData.streak > 0 && <Flame size={10} fill="currentColor" className="text-orange-500 animate-pulse" />}
              <span className="text-[9px] font-bold font-mono tracking-tight leading-none leading-none">
                {goalData.streak > 0 ? `${goalData.streak}d` : `${goalData.history[getTodayDateString()]?.length || 0}/${goalData.dailyGoal}`}
              </span>
            </div>
          </button>

          <button 
            onClick={() => setIsLanguageModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 backdrop-blur-md rounded-full border transition-all cursor-pointer active:scale-95 ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-955 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Translation Language"
          >
            <Languages size={12} className={theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400 animate-pulse'} />
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">{selectedTranslation.label}</span>
          </button>

          <button 
            onClick={() => setIsBookmarksOpen(true)}
            className={`p-2 backdrop-blur-md rounded-full border transition-all cursor-pointer relative ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-955 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Bookmarks"
          >
            <Bookmark size={13} fill={bookmarks.length > 0 ? "currentColor" : "none"} className={bookmarks.length > 0 ? (theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : "text-indigo-400") : ""} />
            {bookmarks.length > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse ${
                theme === 'sepia' 
                  ? 'bg-amber-850 shadow-[0_0_8px_rgba(180,83,9,0.5)]' 
                  : theme === 'emerald'
                    ? 'bg-[#caae7a] shadow-[0_0_8px_#caae7a]'
                    : 'bg-indigo-500 shadow-[0_0_8px_#6366f1]'
              }`} />
            )}
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className={`p-2 backdrop-blur-md rounded-full border transition-all relative ${
              theme === 'sepia'
                ? 'bg-amber-900/10 text-amber-955 border-amber-900/15 hover:bg-amber-900/20'
                : theme === 'emerald'
                  ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
            title="Settings & Toggles"
          >
            <Sliders size={13} />
            {bookmarks.length > 0 && (
              <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full animate-pulse ${
                theme === 'sepia' 
                  ? 'bg-amber-850 shadow-[0_0_8px_rgba(180,83,9,0.5)]' 
                  : theme === 'emerald'
                    ? 'bg-[#caae7a] shadow-[0_0_8px_#caae7a]'
                    : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
              }`} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Actions Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Drawer Content */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`relative w-full max-w-lg border-t p-6 shadow-2xl pb-12 overflow-y-auto scrollbar-none max-h-[85vh] rounded-t-[2.5rem] ${
                theme === 'sepia'
                  ? 'bg-[#fcf8f2] border-amber-800/15 text-amber-950'
                  : theme === 'oled'
                    ? 'bg-[#050505] border-white/10 text-white'
                    : 'bg-[#0a061a] border-white/10 text-white'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-xl font-bold font-sans ${theme === 'sepia' ? 'text-amber-950' : 'text-white'}`}>Controls</h3>
                  <p className={`text-xs ${theme === 'sepia' ? 'text-amber-900/60' : 'text-white/40'}`}>Customize your reading environment</p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2.5 rounded-full border transition-all ${
                    theme === 'sepia'
                      ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-900/70'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Daily Quranic Goal Summary Card */}
              <div 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsDailyGoalOpen(true);
                }}
                className={`p-4 rounded-3xl border mb-6 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-between ${
                  theme === 'sepia' 
                    ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-950' 
                    : theme === 'emerald' 
                      ? 'bg-[#2d5048]/20 hover:bg-[#2d5048]/30 border-[#2d5048]/30 text-[#caae7a]' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                <div className="space-y-1.5 flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest ${theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'}`}>
                      Daily Goal Progress
                    </span>
                    {goalData.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500 animate-pulse">
                        <Flame size={10} fill="currentColor" />
                        {goalData.streak} Day streak
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-black font-sans tracking-tight">
                      {Math.min(Math.round(((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal) * 100), 100)}%
                    </span>
                    <span className="text-[10px] font-mono opacity-60">
                      {goalData.history[getTodayDateString()]?.length || 0}/{goalData.dailyGoal} completed
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className={`w-full h-1 rounded-full overflow-hidden ${theme === 'sepia' ? 'bg-amber-900/10' : theme === 'emerald' ? 'bg-[#2d5048]/30' : 'bg-white/10'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-400'}`}
                      style={{ width: `${Math.min(((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Ring indicator */}
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg width="44" height="44" className="transform -rotate-90">
                    <circle cx="22" cy="22" r="18" stroke={theme === 'sepia' ? 'rgba(120,53,4,0.1)' : theme === 'emerald' ? 'rgba(202,174,122,0.1)' : 'rgba(255,255,255,0.05)'} strokeWidth="3" fill="transparent" />
                    <circle cx="22" cy="22" r="18" stroke={theme === 'sepia' ? '#b45309' : theme === 'emerald' ? '#caae7a' : '#6366f1'} strokeWidth="3" fill="transparent" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - Math.min((goalData.history[getTodayDateString()]?.length || 0) / goalData.dailyGoal, 1))}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono">
                    {goalData.history[getTodayDateString()]?.length || 0}
                  </div>
                </div>
              </div>

              {/* Toggles Group */}
              <div className="space-y-4 mb-6">
                {/* Font Scaling Slider directly inside mobile menu */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  theme === 'sepia' ? 'bg-amber-800/5 border-amber-900/10' : theme === 'emerald' ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                      theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
                    }`}>Text Font Size</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      theme === 'sepia' ? 'bg-amber-900/5 text-amber-900' : theme === 'emerald' ? 'bg-emerald-950 border-[#caae7a]/25 text-[#caae7a]' : 'bg-white/5 text-white/65'
                    }`}>{Math.round(fontSizeMultiplier * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs ${theme === 'sepia' ? 'text-amber-900/60' : 'text-white/40'}`}>Aa</span>
                    <input
                      type="range"
                      min="0.8"
                      max="1.7"
                      step="0.05"
                      value={fontSizeMultiplier}
                      onChange={(e) => setFontSizeMultiplier(parseFloat(e.target.value))}
                      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none ${
                        theme === 'sepia' ? 'accent-amber-900' : theme === 'emerald' ? 'accent-[#caae7a]' : 'accent-indigo-400'
                      }`}
                      style={{ background: theme === 'sepia' ? 'rgba(120, 53, 4, 0.15)' : theme === 'emerald' ? 'rgba(202, 174, 122, 0.15)' : 'rgba(255, 255, 255, 0.15)' }}
                    />
                    <span className={`text-sm font-semibold ${theme === 'sepia' ? 'text-amber-955' : 'text-white'}`}>Aa+</span>
                  </div>
                </div>

                {/* Theme Mode Grid directly inside mobile menu */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  theme === 'sepia' ? 'bg-amber-800/5 border-amber-900/10' : theme === 'emerald' ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/10'
                }`}>
                  <h4 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                    theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
                  }`}>Atmosphere & Mode</h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => setTheme('emerald')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        theme === 'emerald'
                          ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400'
                          : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#0b1e17] border border-emerald-500/30" />
                      <span className="text-[9px] font-semibold font-sans">Emerald</span>
                    </button>

                    <button
                      onClick={() => setTheme('cosmic')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        theme === 'cosmic'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                      <span className="text-[9px] font-semibold font-sans">Cosmic</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme('oled')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        theme === 'oled'
                          ? 'bg-neutral-905 bg-neutral-900 border-white/40 text-white'
                          : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/20" />
                      <span className="text-[9px] font-semibold font-sans">OLED</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme('sepia')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        theme === 'sepia'
                          ? 'bg-amber-900/20 border-amber-500/50 text-amber-800'
                          : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-[#f4ecd8] border border-amber-900/10" />
                      <span className="text-[9px] font-semibold font-sans">Sepia</span>
                    </button>
                  </div>
                </div>

                {/* Translation Configuration inside mobile menu */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${
                  theme === 'sepia' ? 'bg-amber-800/5 border-amber-900/10' : theme === 'emerald' ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                      theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
                    }`}>Translation</h4>
                    
                    <button
                      onClick={() => setShowTranslation(!showTranslation)}
                      className={`px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                        showTranslation 
                          ? (theme === 'sepia' 
                              ? 'bg-amber-800/20 border-amber-800/25 text-amber-900' 
                              : theme === 'emerald'
                                ? 'bg-emerald-950/40 border-[#caae7a]/30 text-[#caae7a]'
                                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300')
                          : (theme === 'sepia' 
                              ? 'bg-amber-900/5 border-amber-900/10 text-amber-900/30' 
                              : theme === 'emerald'
                                ? 'bg-emerald-950/20 border-emerald-800/10 text-[#caae7a]/30'
                                : 'bg-white/5 border-white/5 text-white/30')
                      }`}
                    >
                      <span>{showTranslation ? 'Visible' : 'Hidden'}</span>
                      {showTranslation ? <ToggleRight size={14} className={theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} /> : <ToggleLeft size={14} className={theme === 'sepia' ? 'text-amber-900/35' : theme === 'emerald' ? 'text-emerald-800/35' : 'text-white/30'} />}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLanguageModalOpen(true);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      theme === 'sepia' 
                        ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-955/10 text-amber-955/80' 
                        : theme === 'emerald'
                          ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800/20 text-[#caae7a]/80 hover:text-[#caae7a]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Languages size={14} className={theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                      <span className="text-xs font-semibold font-sans">Language</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      theme === 'sepia' ? 'bg-amber-900/10 text-amber-900' : theme === 'emerald' ? 'bg-emerald-950 border-[#caae7a]/20 text-[#caae7a]' : 'bg-white/10 text-white/60'
                    }`}>
                      {selectedTranslation.label}
                    </span>
                  </button>
                  
                  {showTranslation && (
                    <button
                      onClick={() => setIsReadTranslationAloudEnabled(!isReadTranslationAloudEnabled)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        theme === 'sepia' 
                          ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-955/10 text-amber-955/80' 
                          : theme === 'emerald'
                            ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800/20 text-[#caae7a]/80 hover:text-[#caae7a]'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isReadTranslationAloudEnabled ? <Volume2 size={14} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} /> : <VolumeX size={14} className={theme === 'sepia' ? 'text-amber-900/40' : theme === 'emerald' ? 'text-emerald-800/40' : 'text-white/40'} />}
                        <span className="text-xs font-semibold font-sans">Read Translation Aloud</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isReadTranslationAloudEnabled
                          ? (theme === 'sepia' ? 'bg-amber-800 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                          : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : theme === 'emerald' ? 'bg-emerald-950/40 text-[#caae7a]/40' : 'bg-white/10 text-white/40')
                      }`}>
                        {isReadTranslationAloudEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Scroll Options directly inside mobile menu */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${
                  theme === 'sepia' ? 'bg-amber-800/5 border-amber-900/10' : theme === 'emerald' ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/10'
                }`}>
                  <h4 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                    theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
                  }`}>Reading Behavior</h4>
                  
                  <button
                    onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      theme === 'sepia' 
                        ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-955/10 text-amber-955/80' 
                        : theme === 'emerald'
                          ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800/20 text-[#caae7a]/80 hover:text-[#caae7a]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Scroll size={14} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                      <span className="text-xs font-semibold font-sans">Auto-scroll during recitation</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isAutoScrollEnabled
                        ? (theme === 'sepia' ? 'bg-amber-800 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                        : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : theme === 'emerald' ? 'bg-emerald-950/40 text-[#caae7a]/40' : 'bg-white/10 text-white/40')
                    }`}>
                      {isAutoScrollEnabled ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                {/* Connection & Network directly inside mobile menu */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${
                  theme === 'sepia' ? 'bg-amber-800/5 border-amber-900/10' : theme === 'emerald' ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/10'
                }`}>
                  <h4 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                    theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
                  }`}>Connection & Storage</h4>
                  
                  <button
                    onClick={() => {
                      const nextVal = !forceOfflineMode;
                      setForceOfflineMode(nextVal);
                      try {
                        localStorage.setItem('offline_mode_forced', nextVal ? 'true' : 'false');
                      } catch (e) {
                        console.error("Failed to save force offline state in localStorage", e);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      theme === 'sepia' 
                        ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-955/10 text-amber-955/80' 
                        : theme === 'emerald'
                          ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-800/20 text-[#caae7a]/80 hover:text-[#caae7a]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {forceOfflineMode ? (
                        <WifiOff size={14} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                      ) : (
                        <Wifi size={14} className={theme === 'sepia' ? 'text-amber-900/40' : theme === 'emerald' ? 'text-[#caae7a]/40' : 'text-white/40'} />
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold font-sans">Forced Offline Mode</span>
                        <span className={`text-[9px] mt-0.5 ${theme === 'sepia' ? 'text-amber-900/50' : 'text-white/40'}`}>
                          Prioritize offline database files
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      forceOfflineMode
                        ? (theme === 'sepia' ? 'bg-amber-850 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                        : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : theme === 'emerald' ? 'bg-emerald-950/40 text-[#caae7a]/40' : 'bg-white/10 text-white/40')
                    }`}>
                      {forceOfflineMode ? 'Forced' : 'Off'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        {error && (
          <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="glass-panel p-8 rounded-3xl max-w-sm border-indigo-500/30">
              <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
              <p className="text-white/60 mb-6">{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  if (!surahs.length) {
                    window.location.reload();
                  } else if (currentSurah) {
                    loadSurah(currentSurah.number, selectedReciter, selectedTranslation, selectedTafsir);
                  } else {
                    loadSurah(1, selectedReciter, selectedTranslation, selectedTafsir);
                  }
                }}
                className="px-6 py-2 bg-indigo-500 text-white rounded-full font-medium hover:bg-indigo-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {activePageSlug ? (
          <CustomPageView
            slug={activePageSlug}
            onClose={() => {
              try {
                window.history.pushState({}, '', '/');
              } catch (e) {
                console.warn("Failed to pushState /, fallback to hash", e);
                try { window.location.hash = '#/'; } catch (_) {}
              }
              setActivePageSlug(null);
            }}
            theme={theme}
            onOpenBot={() => setIsBotOpen(true)}
          />
        ) : isLoading ? (
          <div className="h-screen flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-12 h-12 border-4 border-white/20 border-t-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,0.5)]"
            />
          </div>
        ) : !error && currentSurah && (
          <SurahView 
            key={`${currentSurah.number}_${selectedReciter.identifier}_${selectedTranslation.id}_${selectedTafsir.id}`}
            surah={currentSurah} 
            translationLanguage={selectedTranslation.label}
            currentAyahNumber={currentAyahIndex + 1}
            showTranslation={showTranslation}
            showTafsir={showTafsir}
            isBookmarked={isBookmarked}
            onToggleBookmark={toggleBookmark}
            isReadTranslationAloudEnabled={isReadTranslationAloudEnabled}
            onToggleReadTranslationAloud={() => setIsReadTranslationAloudEnabled(!isReadTranslationAloudEnabled)}
            isAutoScrollEnabled={isAutoScrollEnabled}
            onAyahClick={(idx) => {
              setCurrentAyahIndex(idx);
              setIsReadingTranslation(layoutMode === 'translation');
              setIsPlaying(true);
            }}
            onReadTranslation={(idx) => {
              setCurrentAyahIndex(idx);
              setIsReadingTranslation(true);
              setIsPlaying(true);
            }}
            onPauseTranslation={() => {
              setIsPlaying(false);
            }}
            isReadingTranslation={isReadingTranslation}
            isPlaying={isPlaying}
            onOpenContext={(idx) => {
              setCurrentAyahIndex(idx);
              setIsBotOpen(true);
              setIsPlaying(false);
              setIsPlayingBismillah(false);
            }}
            theme={theme}
            fontSizeMultiplier={fontSizeMultiplier}
            layoutMode={layoutMode}
            onLayoutModeChange={(mode) => {
              setLayoutMode(mode);
              if (mode === 'context') {
                setIsPlaying(false);
                setIsPlayingBismillah(false);
              }
            }}
            onToggleAyahRead={toggleAyahRead}
            isAyahRead={isAyahRead}
            savedProgress={savedProgress}
            onResumeReading={handleResumeReading}
            isOffline={isOffline}
            downloadedSurahNumbers={downloadedSurahs}
            onDownloadSurah={downloadSurahForOffline}
            onDeleteOfflineSurah={deleteOfflineSurah}
            downloadProgressSurah={downloadProgressSurah}
            downloadProgressMessage={downloadProgressMessage}
            renderQuranBotInline={() => (
              <QuranBot 
                currentSurah={currentSurah}
                currentAyahIndex={currentAyahIndex}
                theme={theme}
                isOpen={true}
                setIsOpen={() => {}}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                onNextAyah={handleNextAyah}
                onPrevAyah={handlePrevAyah}
                initialLanguage={selectedTranslation.label}
                isInline={true}
              />
            )}
          />
        )}
      </main>

      <AudioPlayer 
        id="tour-audio-player"
        audioUrl={resolvedAudioUrl}
        isPlaying={isPlaying}
        onPlayPause={() => {
          const nextPlaying = !isPlaying;
          setIsPlaying(nextPlaying);
          if (nextPlaying && layoutMode === 'translation') {
            setIsReadingTranslation(true);
          }
        }}
        onNext={handleNextAyah}
        onPrev={handlePrevAyah}
        reciter={selectedReciter}
        surah={currentSurah}
        onOpenSurahList={() => setIsSurahModalOpen(true)}
        onOpenReciterList={() => setIsReciterModalOpen(true)}
        onAyahEnd={handleAudioEnd}
        onAudioError={handleAudioError}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={setPlaybackSpeed}
        showTranslation={showTranslation}
        isReadTranslationAloudEnabled={isReadTranslationAloudEnabled}
        onToggleReadTranslationAloud={() => setIsReadTranslationAloudEnabled(!isReadTranslationAloudEnabled)}
        theme={theme}
      />

      {/* Floating Translation Toggle for ease of access */}
      <motion.div 
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        className="fixed right-6 bottom-52 z-40 hidden md:block group"
      >
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={`flex items-center justify-center p-4 rounded-full shadow-2xl transition-all border relative cursor-pointer ${
            theme === 'sepia'
              ? showTranslation
                ? 'bg-amber-800 text-[#faf6ee] border-amber-850 shadow-md shadow-amber-800/20 hover:bg-amber-900'
                : 'bg-[#fcf8f2]/90 backdrop-blur-xl text-amber-900/70 border-amber-900/15 hover:bg-amber-900/10'
              : theme === 'emerald'
                ? showTranslation
                  ? 'bg-[#caae7a] text-[#07130e] border-[#caae7a] shadow-md shadow-emerald-950/20 hover:brightness-105'
                  : 'bg-[#13201d]/90 backdrop-blur-xl text-[#caae7a] border-[#2d5048]/30 hover:bg-[#182a25]'
                : showTranslation 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md hover:bg-indigo-700' 
                  : 'bg-white/10 backdrop-blur-xl text-white/70 border-white/10 hover:bg-white/20'
          }`}
          title={showTranslation ? 'Hide Translation' : 'Show Translation'}
        >
          <Languages size={20} />
          
          {/* Hover Tooltip */}
          <span className="absolute right-14 whitespace-nowrap bg-black/80 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl">
            {showTranslation ? 'Translation On' : 'Translation Off'}
          </span>
        </button>
      </motion.div>

      {/* Surah Selection Modal */}
      <SurahRegistryModal
        isOpen={isSurahModalOpen}
        onClose={() => setIsSurahModalOpen(false)}
        theme={theme}
        surahs={surahs}
        currentSurahNumber={currentSurah?.number || 1}
        currentAyahNumber={(currentAyahIndex || 0) + 1}
        translationEditionId={selectedTranslation?.id}
        onSelectSurahAndAyah={async (surahNumber, ayahNumber) => {
          setIsPlaying(false);
          await loadSurah(surahNumber, selectedReciter, selectedTranslation, selectedTafsir, ayahNumber - 1);
          setIsPlaying(true);
        }}
        isOffline={isOffline}
        downloadedSurahNumbers={downloadedSurahs}
      />

      {/* Reciter Selection Modal */}
      <SelectionModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        title="Choose a Reciter"
        subtitle="Voice Recitation"
        theme={theme}
        items={POPULAR_RECITERS}
        renderItem={(reciter) => {
          const isSelected = selectedReciter.identifier === reciter.identifier;
          return (
            <button
              onClick={() => {
                setSelectedReciter(reciter);
                setIsReciterModalOpen(false);
                if (currentSurah) loadSurah(currentSurah.number, reciter, selectedTranslation, selectedTafsir);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border font-sans cursor-pointer ${
                theme === 'sepia'
                  ? isSelected
                    ? 'bg-amber-805 text-white border-amber-800 shadow-sm'
                    : 'bg-amber-900/5 text-amber-955 border-amber-905/10 hover:bg-amber-900/10'
                  : theme === 'emerald'
                    ? isSelected
                      ? 'bg-emerald-950/60 border-[#caae7a]/40 text-[#caae7a] shadow-sm'
                      : 'bg-[#182c27]/40 text-[#ebf3f1]/80 border-[#2d5048]/25 hover:bg-emerald-900/10 hover:text-white'
                    : isSelected 
                      ? 'bg-indigo-600/15 text-indigo-200 border-indigo-500/40 shadow-sm' 
                      : 'bg-white/[0.03] text-white/80 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="text-left">
                <div className="text-xs font-bold tracking-see">{reciter.englishName}</div>
                <div className={`text-[10px] ${
                  theme === 'sepia'
                    ? isSelected ? 'text-amber-100/80 font-semibold' : 'text-amber-900/40'
                    : theme === 'emerald'
                      ? isSelected ? 'text-[#caae7a]/80 font-semibold' : 'text-[#a2b0ac]/50'
                      : isSelected ? 'text-indigo-400/80 font-semibold' : 'text-white/40'
                }`}>
                  Quranic Audio Reader
                </div>
              </div>
              <div className="text-base font-serif font-semibold">{reciter.name}</div>
            </button>
          );
        }}
      />

      {/* Language Selection Modal */}
      <SelectionModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        title="Translation Language"
        subtitle="Holy Translation"
        theme={theme}
        items={TRANSLATION_LANGUAGES}
        renderItem={(lang) => {
          const isSelected = selectedTranslation.id === lang.id;
          return (
            <button
              onClick={() => {
                setSelectedTranslation(lang);
                setShowTranslation(true);
                setIsLanguageModalOpen(false);
                if (currentSurah) loadSurah(currentSurah.number, selectedReciter, lang, selectedTafsir);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border font-sans cursor-pointer ${
                theme === 'sepia'
                  ? isSelected
                    ? 'bg-amber-850 text-white border-amber-800 shadow-sm'
                    : 'bg-amber-900/5 text-amber-955 border-amber-905/10 hover:bg-amber-900/10'
                  : theme === 'emerald'
                    ? isSelected
                      ? 'bg-emerald-950/60 border-[#caae7a]/40 text-[#caae7a] shadow-sm'
                      : 'bg-[#182c27]/40 text-[#ebf3f1]/80 border-[#2d5048]/25 hover:bg-emerald-900/10 hover:text-white'
                    : isSelected 
                      ? 'bg-indigo-600/15 text-indigo-200 border-indigo-500/40 shadow-sm' 
                      : 'bg-white/[0.03] text-white/80 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="text-left">
                <div className="text-xs font-bold tracking-see">{lang.label}</div>
                <div className={`text-[10px] ${
                  theme === 'sepia'
                    ? isSelected ? 'text-amber-200/80' : 'text-amber-900/40'
                    : theme === 'emerald'
                      ? isSelected ? 'text-[#caae7a]/80' : 'text-[#a2b0ac]/50'
                      : isSelected ? 'text-indigo-400/80' : 'text-white/40'
                }`}>
                  {lang.name}
                </div>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                theme === 'sepia'
                  ? isSelected
                    ? 'bg-amber-100/10 border-amber-105/20 text-white'
                    : 'bg-amber-900/5 border-amber-905/10 text-amber-900/40'
                  : theme === 'emerald'
                    ? isSelected
                      ? 'bg-[#caae7a]/20 border-[#caae7a]/30 text-[#caae7a]'
                      : 'bg-[#182c27]/50 border-[#2d5048]/20 text-[#a2b0ac]/40'
                    : isSelected 
                      ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300 animate-pulse' 
                      : 'bg-white/5 border-white/5 text-white/40'
              }`}>
                <Languages size={12} />
              </div>
            </button>
          );
        }}
      />

      {/* Bookmarks Modal */}
      <SelectionModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        title="Bookmarks"
        subtitle="Saved Verses"
        theme={theme}
        items={bookmarks}
        gridColsClassName="grid-cols-1"
        renderItem={(bookmark) => (
          <div
            key={bookmark.ayahGlobalNumber}
            className={`w-full flex flex-col md:flex-row items-stretch md:items-center justify-between p-4.5 rounded-2xl transition-all gap-4 border ${
              theme === 'sepia'
                ? 'bg-amber-800/[0.03] border-amber-900/10 hover:border-amber-900/20 text-amber-955'
                : theme === 'emerald'
                  ? 'bg-[#182c27]/40 border-[#2d5048]/30 hover:border-[#caae7a]/30 text-[#ebf3f1]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-white'
            }`}
          >
            <div
              onClick={() => selectBookmarkedAyah(bookmark)}
              className="flex-1 text-left flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  theme === 'sepia'
                    ? 'text-amber-800 bg-amber-900/10 border-amber-900/10'
                    : theme === 'emerald'
                      ? 'text-[#caae7a] bg-[#182c27]/40 border-[#caae7a]/25'
                      : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/10'
                }`}>
                  {bookmark.surahEnglishName} • {bookmark.ayahNumberInSurah}
                </span>
                <span className={`text-[10px] font-serif ${theme === 'sepia' ? 'text-amber-900/40' : 'text-white/30'}`}>
                  {bookmark.surahName}
                </span>
              </div>
              <p 
                className={`text-right font-quran text-lg md:text-xl leading-[2.2] py-1 w-full max-w-full ${
                  theme === 'sepia' ? 'text-amber-955' : 'text-emerald-100/90'
                }`} 
                style={{ direction: 'rtl' }}
              >
                {bookmark.text}
              </p>
              <p 
                dir={isRtlText(bookmark.translation) ? 'rtl' : 'ltr'}
                className={`text-xs font-sans italic line-clamp-3 pr-1 leading-relaxed ${theme === 'sepia' ? 'text-amber-900/60' : 'text-white/50'} ${isRtlText(bookmark.translation) ? 'text-right' : 'text-left'}`}
              >
                {bookmark.translation}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeBookmarkByGlobalNumber(bookmark.ayahGlobalNumber);
              }}
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 hover:border-red-500/30 rounded-lg text-red-400/90 hover:text-red-300 cursor-pointer self-end md:self-center transition-all"
              title="Remove Bookmark"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      >
        {bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Bookmark size={36} className={`${theme === 'sepia' ? 'text-amber-900/25' : 'text-white/20'} mb-4`} />
            <p className={`text-sm font-bold tracking-wide ${theme === 'sepia' ? 'text-amber-900' : 'text-white/80'}`}>
              No Bookmarks Saved
            </p>
            <p className={`text-xs max-w-xs mt-1.5 leading-relaxed ${theme === 'sepia' ? 'text-amber-900/50' : 'text-white/40'}`}>
              Tap the bookmark button in the upper-right corner of any verse to save it for quick reference here.
            </p>
          </div>
        )}
      </SelectionModal>

      {/* Daily Quranic Goal Habit Dashboard */}
      <DailyGoalDashboard
        isOpen={isDailyGoalOpen}
        onClose={() => setIsDailyGoalOpen(false)}
        theme={theme}
        goalData={goalData}
        onUpdateGoal={updateDailyGoalTarget}
        onSelectAyah={handleSelectHistoricalAyah}
      />

      {/* Screen-wide Interactive Confetti Celebration Overlay */}
      <GoalConfetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
        theme={theme}
      />

      {/* Tafsir Selection Modal */}
      <SelectionModal
        isOpen={isTafsirModalOpen}
        onClose={() => setIsTafsirModalOpen(false)}
        title="Tafsir Source"
        subtitle="Exegesis Text"
        theme={theme}
        items={TAFSIR_SOURCES}
        renderItem={(tafsir) => {
          const isSelected = selectedTafsir.id === tafsir.id;
          return (
            <button
              onClick={() => {
                setSelectedTafsir(tafsir);
                setIsTafsirModalOpen(false);
                if (currentSurah) loadSurah(currentSurah.number, selectedReciter, selectedTranslation, tafsir);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border font-sans cursor-pointer ${
                theme === 'sepia'
                  ? isSelected
                    ? 'bg-amber-850 text-white border-amber-800 shadow-sm'
                    : 'bg-amber-900/5 text-amber-955 border-amber-905/10 hover:bg-amber-900/10'
                  : theme === 'emerald'
                    ? isSelected
                      ? 'bg-emerald-950/60 border-[#caae7a]/40 text-[#caae7a] shadow-sm'
                      : 'bg-[#182c27]/40 text-[#ebf3f1]/80 border-[#2d5048]/25 hover:bg-emerald-900/10 hover:text-white'
                    : isSelected 
                      ? 'bg-indigo-600/15 text-indigo-200 border-indigo-500/40 shadow-sm' 
                      : 'bg-white/[0.03] text-white/80 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="text-left">
                <div className="text-xs font-bold tracking-see">{tafsir.name}</div>
                <div className={`text-[10px] ${
                  theme === 'sepia'
                    ? isSelected ? 'text-amber-200/85' : 'text-amber-900/40'
                    : theme === 'emerald'
                      ? isSelected ? 'text-[#caae7a]/85' : 'text-[#a2b0ac]/50'
                      : isSelected ? 'text-indigo-400/80 font-semibold' : 'text-white/40'
                }`}>
                  {tafsir.author} ({tafsir.language})
                </div>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                theme === 'sepia'
                  ? isSelected
                    ? 'bg-amber-100/10 border-amber-105/20 text-white'
                    : 'bg-amber-900/5 border-amber-905/10 text-amber-900/40'
                  : theme === 'emerald'
                    ? isSelected
                      ? 'bg-[#caae7a]/20 border-[#caae7a]/30 text-[#caae7a]'
                      : 'bg-[#182c27]/50 border-[#2d5048]/20 text-[#a2b0ac]/40'
                    : isSelected 
                      ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300 animate-pulse' 
                      : 'bg-white/5 border-white/5 text-white/40'
              }`}>
                <BookOpen size={12} />
              </div>
            </button>
          );
        }}
      />

      {/* Settings/Visuals Modal */}
      <SelectionModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Atmosphere Settings"
        subtitle="Customization"
        theme={theme}
        items={[]}
        renderItem={() => null}
      >
        <div className={`px-1 py-1 space-y-6 font-sans ${theme === 'sepia' ? 'text-amber-955 font-sans' : 'text-white'}`}>
          
          {/* Onboarding Tutorial Reset */}
          <div className="space-y-2.5">
            <h4 className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
              theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
            }`}>Interactive Guide</h4>
            <button
              onClick={() => {
                setIsSettingsOpen(false);
                setIsTourActive(true);
              }}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer font-bold select-none ${
                theme === 'sepia'
                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/15 text-amber-955'
                  : theme === 'emerald'
                    ? 'bg-[#182c27]/40 hover:bg-[#caae7a]/15 border-[#2d5048]/25 text-[#caae7a]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Sparkles size={13} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
              <span className="text-[10px] uppercase tracking-wider font-bold font-sans">
                Start Onboarding Tutorial
              </span>
            </button>
          </div>

          {/* Theme Selection - Elegant Segmented Header Control */}
          <div className="space-y-2.5">
            <h4 className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
              theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
            }`}>Display Atmosphere</h4>
            <div className={`grid grid-cols-4 gap-1.5 p-1 rounded-xl border ${
              theme === 'sepia' ? 'bg-amber-900/10 border-amber-900/10' : 'bg-white/[0.03] border-white/5'
            }`}>
              <button
                onClick={() => setTheme('emerald')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer text-center border ${
                  theme === 'emerald'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm font-bold'
                    : theme === 'sepia'
                      ? 'text-amber-900/60 hover:text-[#3e2723] hover:bg-amber-900/5 border-transparent'
                      : 'text-white/50 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                Emerald
              </button>

              <button
                onClick={() => setTheme('cosmic')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer text-center ${
                  theme === 'cosmic'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : theme === 'sepia'
                      ? 'text-amber-900/60 hover:text-[#3e2723] hover:bg-amber-900/5'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Cosmic Blue
              </button>
              
              <button
                onClick={() => setTheme('oled')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer text-center ${
                  theme === 'oled'
                    ? 'bg-white text-black shadow-md'
                    : theme === 'sepia'
                      ? 'text-amber-900/60 hover:text-[#3e2723] hover:bg-amber-900/5'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                OLED Black
              </button>
              
              <button
                onClick={() => setTheme('sepia')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer text-center border ${
                  theme === 'sepia'
                    ? 'bg-amber-800 text-amber-50 border-amber-850 shadow-sm font-bold'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                Warm Sepia
              </button>
            </div>
          </div>

          {/* Font Scaling Control */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
                theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
              }`}>Text Font Size</h4>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                theme === 'sepia' ? 'bg-amber-900/10 border-amber-900/10 text-amber-900' : 'bg-white/5 border-white/5 text-white/50'
              }`}>
                {Math.round(fontSizeMultiplier * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-medium shrink-0 uppercase tracking-widest ${
                theme === 'sepia' ? 'text-amber-900/40' : 'text-white/30'
              }`}>Small</span>
              <div className="relative flex-1 flex items-center h-4">
                <input
                  type="range"
                  min="0.8"
                  max="1.7"
                  step="0.05"
                  value={fontSizeMultiplier}
                  onChange={(e) => setFontSizeMultiplier(parseFloat(e.target.value))}
                  className={`w-full h-1 rounded-full appearance-none cursor-pointer focus:outline-none transition-all ${
                    theme === 'sepia' ? 'accent-amber-850' : theme === 'emerald' ? 'accent-[#caae7a]' : 'accent-indigo-500 hover:accent-indigo-400'
                  }`}
                  style={{ background: theme === 'sepia' ? 'rgba(120, 53, 4, 0.15)' : 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
              <span className={`text-[10px] font-medium shrink-0 uppercase tracking-widest ${
                theme === 'sepia' ? 'text-amber-900/40' : 'text-white/30'
              }`}>Large</span>
            </div>
          </div>

          {/* Voice Aloud Audio Toggle & Auto Scroll Behavior */}
          <div className="space-y-2.5">
            <h4 className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
              theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
            }`}>Audio & Navigation</h4>
            
            <button
              onClick={() => setIsReadTranslationAloudEnabled(!isReadTranslationAloudEnabled)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'sepia'
                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-955'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {isReadTranslationAloudEnabled ? <Volume2 size={16} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} /> : <VolumeX size={16} className="text-white/40" />}
                <span className="text-xs font-semibold font-sans">Read Translation Aloud (Voice Out)</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isReadTranslationAloudEnabled
                  ? (theme === 'sepia' ? 'bg-amber-800 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                  : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : 'bg-white/10 text-white/40')
              }`}>
                {isReadTranslationAloudEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>

            <button
              onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'sepia'
                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-955'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scroll size={16} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                <span className="text-xs font-semibold font-sans">Auto-scroll during recitation</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isAutoScrollEnabled
                  ? (theme === 'sepia' ? 'bg-amber-800 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                  : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : 'bg-white/10 text-white/40')
              }`}>
                {isAutoScrollEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>

          {/* Connection & Network Storage */}
          <div className="space-y-4">
            <h4 className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
              theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
            }`}>Offline Settings</h4>
            
            <button
              onClick={() => {
                const nextVal = !forceOfflineMode;
                setForceOfflineMode(nextVal);
                try {
                  localStorage.setItem('offline_mode_forced', nextVal ? 'true' : 'false');
                } catch (e) {
                  console.error("Failed to save force offline state in localStorage", e);
                }
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'sepia'
                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-955'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {forceOfflineMode ? (
                  <WifiOff size={16} className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} />
                ) : (
                  <Wifi size={16} className="text-white/40" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold font-sans">Forced Offline Mode</span>
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${theme === 'sepia' ? 'text-amber-900/60' : 'text-white/40'}`}>
                    Prioritize offline cache database completely
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                forceOfflineMode
                  ? (theme === 'sepia' ? 'bg-amber-850 text-amber-50' : theme === 'emerald' ? 'bg-[#caae7a] text-[#07130e]' : 'bg-indigo-500 text-white')
                  : (theme === 'sepia' ? 'bg-amber-900/10 text-amber-900/60' : 'bg-white/10 text-white/40')
              }`}>
                {forceOfflineMode ? 'FORCED' : 'OFF'}
              </span>
            </button>

            {/* Offline Storage Dashboard */}
            <div className={`p-4 rounded-3xl border space-y-4 ${
              theme === 'sepia' 
                ? 'bg-amber-900/[0.02] border-amber-900/10' 
                : theme === 'emerald' 
                  ? 'bg-[#13201d]/60 border-emerald-850/15' 
                  : 'bg-white/[0.01] border-white/5'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h5 className={`text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'sepia' ? 'text-amber-950/80' : theme === 'emerald' ? 'text-emerald-300' : 'text-indigo-300'
                  }`}>
                    Offline Manager
                  </h5>
                  <p className={`text-[10px] mt-0.5 ${theme === 'sepia' ? 'text-amber-900/50' : 'text-white/45'}`}>
                    {downloadedSurahs.length} of 114 Surahs offline
                  </p>
                </div>
                
                {downloadedSurahs.length > 0 && (
                  <button
                    onClick={clearAllOfflineSurahs}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase cursor-pointer transition-all duration-300 ${
                      theme === 'sepia'
                        ? 'bg-red-550/5 border-red-550/10 hover:border-red-500/20 text-red-800'
                        : theme === 'emerald'
                          ? 'bg-red-950/20 border-red-500/10 hover:border-red-500/25 text-red-400'
                          : 'bg-red-500/10 border-red-500/10 hover:border-red-500/20 text-red-400'
                    }`}
                  >
                    <Trash2 size={10} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Progress of active downloads */}
              {(isBulkDownloading || downloadProgressSurah !== null || bulkDownloadStatus !== 'idle') && (
                <div className={`p-3 rounded-xl border space-y-2 text-left ${
                  theme === 'sepia' ? 'bg-amber-900/5 border-amber-900/10' : theme === 'emerald' ? 'bg-[#0a1210] border-emerald-850/10' : 'bg-neutral-900/50 border-white/5'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className={theme === 'sepia' ? 'text-amber-955' : 'text-white/85'}>
                      {isBulkDownloading 
                        ? (bulkDownloadMessage || 'Bulk downloading Surahs...') 
                        : downloadProgressSurah !== null 
                          ? (`Downloading Surah ${downloadProgressSurah}: ${downloadProgressMessage}`)
                          : (bulkDownloadMessage)
                      }
                    </span>
                    {isBulkDownloading && (
                      <button
                        onClick={() => setIsBulkDownloading(false)}
                        className="text-red-450 uppercase font-mono tracking-wider font-bold text-[9px] cursor-pointer hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  
                  {/* Progress Line */}
                  <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-500'
                      }`}
                      style={{ 
                        width: `${
                          isBulkDownloading 
                            ? bulkDownloadProgress 
                            : downloadProgressSurah !== null 
                              ? (downloadProgressMessage.includes('%') ? parseInt(downloadProgressMessage.match(/\d+/)?.[0] || '10') : 10)
                              : 100
                        }%` 
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Bulk downloader action banner */}
              {!isBulkDownloading && downloadedSurahs.length < 114 && (
                <button
                  onClick={downloadAllSurahsOffline}
                  className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer font-bold select-none ${
                    theme === 'sepia'
                      ? 'bg-amber-800 hover:bg-amber-850 text-amber-50 border-amber-850/40'
                      : theme === 'emerald'
                        ? 'bg-[#caae7a] hover:bg-[#caae7a]/90 text-[#0c1311] border-[#caae7a]/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/25'
                  }`}
                >
                  <Download size={13} />
                  <span className="text-[10px] uppercase tracking-wider font-bold font-sans">
                    Download All 114 Surahs
                  </span>
                </button>
              )}

              {/* Sub-tabs and Search */}
              <div className="space-y-2">
                <div className="flex gap-1.5 p-1 bg-black/10 rounded-xl border border-white/5">
                  <button
                    onClick={() => setOfflineTab('all')}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer text-center ${
                      offlineTab === 'all'
                        ? (theme === 'sepia' ? 'bg-amber-800/10 text-amber-955 border border-amber-900/10' : theme === 'emerald' ? 'bg-[#caae7a]/15 text-[#caae7a]' : 'bg-indigo-500/15 text-indigo-300')
                        : (theme === 'sepia' ? 'text-amber-900/40 hover:text-amber-900/70' : 'text-white/40 hover:text-white/70')
                    }`}
                  >
                    All Surahs
                  </button>
                  <button
                    onClick={() => setOfflineTab('downloaded')}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer text-center ${
                      offlineTab === 'downloaded'
                        ? (theme === 'sepia' ? 'bg-amber-800/10 text-amber-955 border border-amber-900/10' : theme === 'emerald' ? 'bg-[#caae7a]/15 text-[#caae7a]' : 'bg-indigo-500/15 text-indigo-300')
                        : (theme === 'sepia' ? 'text-amber-900/40 hover:text-amber-900/70' : 'text-white/40 hover:text-white/70')
                    }`}
                  >
                    Saved ({downloadedSurahs.length})
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search Surahs..."
                    value={offlineSearchQuery}
                    onChange={(e) => setOfflineSearchQuery(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border outline-none placeholder:text-white/20 text-left ${
                      theme === 'sepia'
                        ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-950 placeholder:text-amber-900/30 focus:border-amber-900/30'
                        : theme === 'emerald'
                          ? 'bg-[#0f1d19]/60 border-emerald-850/20 text-[#ebf3f1] focus:border-[#caae7a]/30'
                          : 'bg-black/25 border-white/5 text-white focus:border-indigo-500/30'
                    }`}
                  />
                  {offlineSearchQuery && (
                    <button
                      onClick={() => setOfflineSearchQuery('')}
                      className={`absolute right-2 px-2 top-1/2 -translate-y-1/2 text-[9px] font-bold ${theme === 'sepia' ? 'text-amber-900/40' : 'text-white/40'}`}
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable list content */}
              <div className={`max-h-[170px] overflow-y-auto rounded-xl border scrollbar-thin flex flex-col divide-y ${
                theme === 'sepia' 
                  ? 'border-amber-900/10 divide-amber-900/5 bg-amber-900/[0.01]' 
                  : theme === 'emerald' 
                    ? 'border-emerald-850/15 divide-[#182c27]/25 bg-black/10' 
                    : 'border-white/5 divide-white/[0.03] bg-black/15'
              }`}>
                {STATIC_SURAHS_LIST
                  .filter(surah => {
                    const matchesQuery = surah.englishName.toLowerCase().includes(offlineSearchQuery.toLowerCase()) || 
                                         surah.number.toString() === offlineSearchQuery.trim() ||
                                         (surah.englishNameTranslation || '').toLowerCase().includes(offlineSearchQuery.toLowerCase());
                    const matchesTab = offlineTab === 'all' || downloadedSurahs.includes(surah.number);
                    return matchesQuery && matchesTab;
                  })
                  .map(surah => {
                    const isDownloaded = downloadedSurahs.includes(surah.number);
                    const isCurrentDownloading = downloadProgressSurah === surah.number;
                    
                    return (
                      <div key={surah.number} className="flex items-center justify-between p-2.5 font-sans">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold w-5 shrink-0 text-left ${theme === 'sepia' ? 'text-amber-900/50' : 'text-white/30'}`}>
                            {surah.number}
                          </span>
                          <div className="flex flex-col text-left">
                            <span className={`text-xs font-semibold ${theme === 'sepia' ? 'text-[#3e2723]' : 'text-white'}`}>
                              {surah.englishName}
                            </span>
                            <span className={`text-[9.5px] ${theme === 'sepia' ? 'text-amber-900/55' : 'text-white/45'}`}>
                              {surah.numberOfAyahs} Verses
                            </span>
                          </div>
                        </div>

                        {/* Direct Download/Delete triggers mapped directly on each item row */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCurrentDownloading ? (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-purple-400">
                              <Loader2 size={10} className="animate-spin" />
                              <span className="line-clamp-1">{downloadProgressMessage.includes('%') ? downloadProgressMessage.match(/\d+%/)?.[0] : '...'}</span>
                            </div>
                          ) : isDownloaded ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                theme === 'sepia' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                              }`}>
                                Saved
                              </span>
                              <button
                                onClick={() => deleteOfflineSurah(surah.number)}
                                className={`p-1.5 rounded-lg border cursor-pointer hover:bg-red-500/10 hover:border-red-500/25 text-red-450 border-red-500/10`}
                                title="Remove downloaded cache"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => downloadSurahForOffline(surah.number)}
                              disabled={downloadProgressSurah !== null}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                                theme === 'sepia'
                                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/15 text-amber-900'
                                  : theme === 'emerald'
                                    ? 'bg-[#182c27]/50 hover:bg-[#caae7a]/15 border-[#2d5048]/25 text-[#caae7a]'
                                    : 'bg-white/[0.03] hover:bg-indigo-500/15 border-white/5 hover:border-indigo-500/20 text-indigo-300'
                              }`}
                              title="Download Surah and recitation"
                            >
                              <Download size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {STATIC_SURAHS_LIST.filter(surah => {
                  const matchesQuery = surah.englishName.toLowerCase().includes(offlineSearchQuery.toLowerCase()) || 
                                       surah.number.toString() === offlineSearchQuery.trim() ||
                                       (surah.englishNameTranslation || '').toLowerCase().includes(offlineSearchQuery.toLowerCase());
                  const matchesTab = offlineTab === 'all' || downloadedSurahs.includes(surah.number);
                  return matchesQuery && matchesTab;
                }).length === 0 && (
                  <div className={`p-6 text-center text-xs ${theme === 'sepia' ? 'text-amber-900/40' : 'text-white/40'}`}>
                    No Surahs match search filters.
                  </div>
                )}
              </div>
            </div>
          </div>



        </div>
      </SelectionModal>

      {/* Quran Scholar AI Assistant Bot */}
      <QuranBot 
        currentSurah={currentSurah}
        currentAyahIndex={currentAyahIndex}
        theme={theme}
        isOpen={isBotOpen}
        setIsOpen={setIsBotOpen}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onNextAyah={handleNextAyah}
        onPrevAyah={handlePrevAyah}
        initialLanguage={selectedTranslation.label}
      />

      {/* Real-time Bidirectional Scholar Voice Hotline Control Component */}
      <VoiceHotlineControl 
        currentSurah={currentSurah}
        currentAyahIndex={currentAyahIndex}
        theme={theme}
        activeLanguage={selectedTranslation.label}
        onStartCall={() => {
          setIsPlaying(false);
          setIsPlayingBismillah(false);
        }}
      />

      {/* WordPress CMS Admin Console */}
      {isAdminOpen && (
        <WordPressAdmin 
          theme={theme}
          activeLanguage={selectedTranslation.label}
          onClose={() => {
            try {
              window.history.pushState({}, '', '/');
            } catch (e) {
              console.warn("Failed to pushState /, fallback to hash", e);
              try { window.location.hash = '#/'; } catch (_) {}
            }
            setIsAdminOpen(false);
          }}
        />
      )}


      {/* Floating Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={scrollToTop}
            className={`fixed bottom-32 left-6 z-45 p-3.5 rounded-full shadow-2xl transition-all border cursor-pointer ${
              theme === 'sepia'
                ? 'bg-[#faf6ee] text-amber-900 border-amber-900/15 shadow-md shadow-amber-800/10 hover:bg-amber-900/10'
                : theme === 'oled'
                  ? 'bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-850'
                  : 'bg-white/10 backdrop-blur-xl text-white/80 border-white/10 hover:bg-white/20 hover:text-white shadow-md'
            }`}
            title="Scroll to Top"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Onboarding Tour Interactive Overlay */}
      {isTourActive && (
        <OnboardingTour
          theme={theme}
          onClose={() => setIsTourActive(false)}
        />
      )}
    </div>
  );
}
