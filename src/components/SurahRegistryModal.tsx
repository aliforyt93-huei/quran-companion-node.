import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, BookOpen, Loader2, Check, Cloud } from 'lucide-react';
import { SurahListItem } from '../types';

interface SurahRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  surahs: SurahListItem[];
  currentSurahNumber?: number;
  currentAyahNumber?: number;
  onSelectSurahAndAyah: (surahNumber: number, ayahNumberInSurah: number) => void;
  translationEditionId?: string;
  isOffline?: boolean;
  downloadedSurahNumbers?: number[];
}

const JUZ_NAMES: { [key: number]: string } = {
  1: 'Alif-Laam-Meem',
  2: 'Sayaqool',
  3: 'Tilkal Rusul',
  4: 'Lan Tanaloo',
  5: 'Wal Muhsanat',
  6: 'La Yuhibbullah',
  7: 'Wa Iza Sami\'oo',
  8: 'Wa Lau Annana',
  9: 'Qal-Al-Mala\'',
  10: 'Wa\'lamoo',
  11: 'Ya\'taziroon',
  12: 'Wa Ma Min Daabbah',
  13: 'Wa Ma Ubari\'oo',
  14: 'Rubama',
  15: 'Subhanallazi',
  16: 'Qala Alam',
  17: 'Aqtaraba',
  18: 'Qad Aflaha',
  19: 'Wa Qalallazina',
  20: 'Am-Man Khalaq',
  21: 'Utlu Ma Uhiya',
  22: 'Wa Man Yaqnut',
  23: 'Wa Mali',
  24: 'Faman Azlam',
  25: 'Ilaihi Yurad',
  26: 'Ha-Meem',
  27: 'Qala Fama Khatbukum',
  28: 'Qad Sami\'allahu',
  29: 'Tabarakallazi',
  30: 'Amma',
};

const JUZ_MAPPING: { [key: number]: { surah: number; ayah: number } } = {
  1: { surah: 1, ayah: 1 },
  2: { surah: 2, ayah: 142 },
  3: { surah: 2, ayah: 253 },
  4: { surah: 3, ayah: 92 },
  5: { surah: 4, ayah: 24 },
  6: { surah: 4, ayah: 148 },
  7: { surah: 5, ayah: 83 },
  8: { surah: 6, ayah: 111 },
  9: { surah: 7, ayah: 88 },
  10: { surah: 8, ayah: 41 },
  11: { surah: 9, ayah: 94 },
  12: { surah: 11, ayah: 6 },
  13: { surah: 12, ayah: 53 },
  14: { surah: 15, ayah: 1 },
  15: { surah: 17, ayah: 1 },
  16: { surah: 18, ayah: 75 },
  17: { surah: 21, ayah: 1 },
  18: { surah: 23, ayah: 1 },
  19: { surah: 25, ayah: 21 },
  20: { surah: 27, ayah: 56 },
  21: { surah: 29, ayah: 45 },
  22: { surah: 33, ayah: 31 },
  23: { surah: 36, ayah: 28 },
  24: { surah: 39, ayah: 32 },
  25: { surah: 41, ayah: 47 },
  26: { surah: 46, ayah: 1 },
  27: { surah: 51, ayah: 31 },
  28: { surah: 58, ayah: 1 },
  29: { surah: 67, ayah: 1 },
  30: { surah: 78, ayah: 1 },
};

const getJuzForVerse = (s: number, a: number): number => {
  let foundJuz = 1;
  for (let j = 2; j <= 30; j++) {
    const start = JUZ_MAPPING[j];
    if (s > start.surah || (s === start.surah && a >= start.ayah)) {
      foundJuz = j;
    } else {
      break;
    }
  }
  return foundJuz;
};

type TabType = 'surah' | 'verse' | 'juz' | 'page';

export const SurahRegistryModal: React.FC<SurahRegistryModalProps> = ({
  isOpen,
  onClose,
  theme,
  surahs,
  currentSurahNumber = 1,
  currentAyahNumber = 1,
  onSelectSurahAndAyah,
  translationEditionId = 'en.sahih',
  isOffline = false,
  downloadedSurahNumbers = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('surah');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local active Surah selection for the Verse tab
  const [localSelectedSurahNumber, setLocalSelectedSurahNumber] = useState(currentSurahNumber);
  
  // Reading Progress State to track read verses
  const [readingProgress, setReadingProgress] = useState<{ surah: number; ayah: number }>({ surah: 1, ayah: 1 });

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('quran_reading_progress');
        if (saved) {
          const parsed = JSON.parse(saved);
          setReadingProgress({ 
            surah: parsed.surahNumber || currentSurahNumber, 
            ayah: (parsed.ayahIndex !== undefined ? parsed.ayahIndex + 1 : currentAyahNumber) 
          });
        } else {
          setReadingProgress({ surah: currentSurahNumber, ayah: currentAyahNumber });
        }
      } catch (e) {
        setReadingProgress({ surah: currentSurahNumber, ayah: currentAyahNumber });
      }
    }
  }, [isOpen, currentSurahNumber, currentAyahNumber]);

  // Precalculate total verses in each Juz, and read ones based on sequential reading progress
  const juzProgressList = useMemo(() => {
    const stats = Array.from({ length: 30 }, (_, i) => ({
      juz: i + 1,
      totalVerses: 0,
      readVerses: 0,
    }));

    if (!surahs || surahs.length === 0) return stats;

    const progressSurah = readingProgress.surah;
    const progressAyah = readingProgress.ayah;

    for (const surah of surahs) {
      const sNum = surah.number;
      const count = surah.numberOfAyahs;
      for (let aNum = 1; aNum <= count; aNum++) {
        const juzOfVerse = getJuzForVerse(sNum, aNum);
        if (juzOfVerse >= 1 && juzOfVerse <= 30) {
          const idx = juzOfVerse - 1;
          stats[idx].totalVerses += 1;
          
          const isRead = sNum < progressSurah || (sNum === progressSurah && aNum <= progressAyah);
          if (isRead) {
            stats[idx].readVerses += 1;
          }
        }
      }
    }

    return stats;
  }, [surahs, readingProgress]);

  // Page fetching state
  const [isPageFetching, setIsPageFetching] = useState(false);
  const [fetchingPageNumber, setFetchingPageNumber] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to automatically scroll selected item into view when tab changes
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);

  // Reset tab search/local states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setLocalSelectedSurahNumber(currentSurahNumber || 1);
      setErrorMessage(null);
    }
  }, [isOpen, currentSurahNumber]);

  // Handle hotkey shortcut if requested (optional)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K to toggle/focus something if desired, but let's keep it harmless
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter Surahs
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const query = searchQuery.toLowerCase();
    return surahs.filter(
      (s) =>
        s.number.toString() === query ||
        s.englishName.toLowerCase().includes(query) ||
        s.englishNameTranslation.toLowerCase().includes(query) ||
        s.name.includes(query)
    );
  }, [surahs, searchQuery]);

  // Filter Juzs
  const juzsList = useMemo(() => {
    const arr = Array.from({ length: 30 }, (_, i) => i + 1);
    if (!searchQuery.trim()) return arr;
    const query = searchQuery.toLowerCase().replace(/juz/g, '').trim();
    return arr.filter((juz) => juz.toString().includes(query));
  }, [searchQuery]);

  // Filter Pages
  const pagesList = useMemo(() => {
    const arr = Array.from({ length: 604 }, (_, i) => i + 1);
    if (!searchQuery.trim()) return arr;
    const query = searchQuery.toLowerCase().replace(/page/g, '').trim();
    return arr.filter((page) => page.toString().includes(query));
  }, [searchQuery]);

  // Get current active Surah for Verse Tab
  const localSelectedSurah = useMemo(() => {
    return surahs.find((s) => s.number === localSelectedSurahNumber) || surahs[0];
  }, [surahs, localSelectedSurahNumber]);

  // Handle select Juz
  const handleSelectJuz = (juzNumber: number) => {
    const mapping = JUZ_MAPPING[juzNumber];
    if (mapping) {
      onSelectSurahAndAyah(mapping.surah, mapping.ayah);
      onClose();
    }
  };

  // Handle select Page (real API connection / offline fallback formula mapping)
  const handleSelectPage = async (pageNumber: number) => {
    setIsPageFetching(true);
    setFetchingPageNumber(pageNumber);
    setErrorMessage(null);

    // OFFLINE fallback mapping using standard Madinah Mushaf formula
    if (isOffline) {
      try {
        let juzNumber = 1;
        if (pageNumber >= 2) {
          juzNumber = Math.min(30, Math.max(1, Math.floor((pageNumber - 2) / 20) + 1));
        }
        const mapping = JUZ_MAPPING[juzNumber];
        if (mapping) {
          onSelectSurahAndAyah(mapping.surah, mapping.ayah);
          onClose();
          return;
        }
      } catch (err) {
        console.warn("Offline page map calculation error:", err);
      } finally {
        setIsPageFetching(false);
        setFetchingPageNumber(null);
      }
    }

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-uthmani`);
      if (!res.ok) throw new Error('Failed to fetch page metadata');
      const data = await res.json();
      if (data && data.data && data.data.ayahs && data.data.ayahs.length > 0) {
        const firstAyah = data.data.ayahs[0];
        const surahNo = firstAyah.surah.number;
        const ayahNoInSurah = firstAyah.numberInSurah;
        onSelectSurahAndAyah(surahNo, ayahNoInSurah);
        onClose();
      } else {
        throw new Error('No verses found on page');
      }
    } catch (err: any) {
      console.error(err);
      
      // Secondary fallback calculation on fetch failure
      try {
        let juzNumber = 1;
        if (pageNumber >= 2) {
          juzNumber = Math.min(30, Math.max(1, Math.floor((pageNumber - 2) / 20) + 1));
        }
        const mapping = JUZ_MAPPING[juzNumber];
        if (mapping) {
          onSelectSurahAndAyah(mapping.surah, mapping.ayah);
          onClose();
          return;
        }
      } catch (_) {}

      setErrorMessage(`Error loading page ${pageNumber}. Please check your connection.`);
    } finally {
      setIsPageFetching(false);
      setFetchingPageNumber(null);
    }
  };

  const isSepia = theme === 'sepia';
  const isOled = theme === 'oled';
  const isEmerald = theme === 'emerald';

  const modalBg = isSepia
    ? 'bg-[#fcf8f2] border-amber-900/15 text-[#3e2723]'
    : isOled
      ? 'bg-black border-neutral-900 text-white'
      : isEmerald
        ? 'bg-[#0a1612]/98 border-[#2d5048]/30 text-[#ebf3f1]'
        : 'bg-[#0f0a1d]/95 md:bg-[#0c0715]/98 border-white/10 text-white';

  const tabPillContainerClass = isSepia
    ? 'bg-amber-900/5 border-amber-900/10'
    : isEmerald
      ? 'bg-[#12221b] border-[#2d5048]/30'
      : 'bg-white/5 border-white/10';

  const searchInputClass = isSepia
    ? 'bg-[#faf6ee] border-amber-900/10 text-amber-955 placeholder-amber-900/30 focus:border-amber-800 focus:ring-amber-800/20'
    : isOled
      ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-white focus:ring-white/15'
      : isEmerald
        ? 'bg-[#12221b] border-[#2d5048]/30 text-[#ebf3f1] placeholder-[#a2b0ac]/40 focus:border-[#caae7a] focus:ring-[#caae7a]/20'
        : 'bg-white/5 border-white/10 text-white placeholder-white/35 focus:border-indigo-500 focus:ring-indigo-500/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[12px] transition-all"
          />

          {/* Symmetrical Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className={`fixed bottom-0 md:bottom-12 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[110] w-full md:max-w-3xl h-[85vh] md:h-[75vh] backdrop-blur-3xl rounded-t-[2.2rem] md:rounded-[2.2rem] p-5 md:p-8 flex flex-col border-t md:border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.95)] transition-all ${modalBg}`}
          >
            {/* Slide Down Bar Indicator for mobile */}
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 shrink-0 block md:hidden ${
              isSepia ? 'bg-amber-900/20' : isEmerald ? 'bg-emerald-800/40' : 'bg-white/15'
            }`} />

            {/* Header with Title and Close */}
            <div className="flex items-start justify-between shrink-0 mb-4">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-[0.25em] mb-0.5 block ${
                  isSepia ? 'text-amber-800' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'
                }`}>
                  Sura Registry
                </span>
                <h3 className="text-xl md:text-2xl font-serif font-medium tracking-wide">
                  Choose a Surah
                </h3>
              </div>
              
              <button
                onClick={onClose}
                className={`p-2 rounded-full border transition-all cursor-pointer active:scale-95 ${
                  isSepia
                    ? 'bg-amber-900/5 hover:bg-amber-900/10 text-amber-900/60 hover:text-amber-900 border-amber-900/10'
                    : isEmerald
                      ? 'bg-[#12221b] hover:bg-[#1a3026] text-[#ebf3f1]/50 hover:text-white border border-[#2d5048]/30 hover:border-[#caae7a]/40'
                      : 'bg-white/5 hover:bg-neutral-800 text-white/50 hover:text-white border border-white/5 hover:border-white/10'
                }`}
              >
                <X size={15} />
              </button>
            </div>

            {/* Pill Tab Selector */}
            <div className="flex justify-center mb-5 shrink-0">
              <div className={`flex p-1 rounded-full border backdrop-blur-md shadow-inner transition-all ${tabPillContainerClass}`}>
                {(['surah', 'verse', 'juz', 'page'] as TabType[]).map((tab) => {
                  const isSelected = activeTab === tab;
                  const label = 
                    tab === 'surah' ? 'Surah' : 
                    tab === 'verse' ? 'Verse' : 
                    tab === 'juz' ? 'Juz' : 'Page';
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setSearchQuery('');
                        setErrorMessage(null);
                      }}
                      className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? isSepia
                            ? 'bg-amber-800 text-[#fcf8f2] shadow-sm font-bold'
                            : isOled
                              ? 'bg-white text-black font-bold'
                              : isEmerald
                                ? 'bg-[#caae7a] text-[#07130e] shadow-[0_4px_12px_rgba(202,174,122,0.25)] font-bold'
                                : 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] font-bold'
                          : isSepia
                            ? 'text-amber-955/60 hover:text-amber-955'
                            : isEmerald
                              ? 'text-[#ebf3f1]/50 hover:text-[#ebf3f1]'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIP info shown in screenshot */}
            <div className={`flex items-center justify-between text-[11px] mb-3 shrink-0 px-1 opacity-75 font-sans`}>
              <span className="italic">
                Tip: try navigating with {activeTab === 'surah' ? 'surah name' : activeTab === 'verse' ? 'verse or surah' : activeTab === 'juz' ? 'juz number' : 'page number'}
              </span>
              <span className={`px-2 py-0.5 rounded border leading-none shrink-0 font-sans hidden md:inline-block ${
                isSepia 
                  ? 'border-amber-900/10 bg-amber-900/5 text-amber-905' 
                  : isEmerald
                    ? 'border-[#2d5048]/30 bg-[#12221b] text-[#caae7a]'
                    : 'border-white/10 bg-white/5 text-white/50'
              }`}>
                ctrl K
              </span>
            </div>

            {/* Error Message bar if any */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-2.5 rounded-xl mb-3 shrink-0 font-sans text-center">
                {errorMessage}
              </div>
            )}

            {/* Search Input Box */}
            <div className="relative mb-4 shrink-0">
              <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                isSepia ? 'text-amber-900/40' : isEmerald ? 'text-[#caae7a]/60' : 'text-white/40'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'surah'
                    ? 'Search Surah'
                    : activeTab === 'verse'
                      ? 'Search Surah'
                      : activeTab === 'juz'
                        ? 'Search Juz'
                        : 'Search Page'
                }
                className={`w-full py-3 pl-11 pr-4 rounded-xl border font-semibold text-xs outline-none transition-all duration-200 focus:ring-4 ${searchInputClass}`}
              />
            </div>

            {/* TAB PANELS SCROLLABLE CONTENT */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              
              {/* Load spinner Overlay back if fetching */}
              {isPageFetching && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                  <Loader2 size={32} className={`animate-spin mb-3 ${isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'}`} />
                  <span className={`text-xs font-semibold uppercase tracking-widest ${isEmerald ? 'text-[#caae7a]' : 'text-indigo-200'}`}>
                    Locating Page {fetchingPageNumber}...
                  </span>
                </div>
              )}

              {/* 1. SURAH PANEL */}
              {activeTab === 'surah' && (
                <div className="h-full overflow-y-auto pr-1 space-y-2 select-none custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                    {filteredSurahs.map((surah) => {
                      const isSelected = currentSurahNumber === surah.number;
                      return (
                        <button
                          key={surah.number}
                          onClick={() => {
                            onSelectSurahAndAyah(surah.number, 1);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group cursor-pointer border text-left ${
                            isSepia
                              ? isSelected
                                ? 'bg-[#78350f] text-[#fcf8f2] border-amber-805 shadow-sm font-semibold'
                                : 'bg-amber-900/5 hover:bg-amber-100/60 border-amber-900/10 text-[#3e2723]'
                              : isEmerald
                                ? isSelected
                                  ? 'bg-[#caae7a]/25 text-[#caae7a] border-[#caae7a]/50 shadow-sm font-semibold'
                                  : 'bg-[#12221b] hover:bg-[#1a3026] border-[#2d5048]/25 text-[#ebf3f1]'
                                : isSelected
                                  ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                                  : 'bg-white/[0.03] hover:bg-indigo-600/10 border-white/5 hover:border-indigo-500/25 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-mono w-5 text-center ${
                              isSepia ? (isSelected ? 'text-[#faf6ee]' : 'text-amber-900/45') : isEmerald ? (isSelected ? 'text-[#caae7a]' : 'text-[#a2b0ac]/50') : 'text-white/30'
                            }`}>{surah.number}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold tracking-wide transition-colors ${
                                  isSepia ? (isSelected ? 'text-white' : 'text-[#3e2723]') : isEmerald ? (isSelected ? 'text-[#caae7a]' : 'text-[#ebf3f1]') : 'text-white'
                                }`}>{surah.englishName}</span>
                                {([1, 112, 113, 114].includes(surah.number) || downloadedSurahNumbers.includes(surah.number)) && (
                                  <Cloud size={10} className={`${isSelected ? 'text-white' : isSepia ? 'text-amber-700' : isEmerald ? 'text-emerald-400' : 'text-indigo-400'} opacity-80 stroke-[2.5] shrink-0`} title="Available Offline" />
                                )}
                              </div>
                              <div className={`text-[9px] font-medium opacity-60 ${
                                isSepia ? (isSelected ? 'text-[#faf6ee]/80' : 'text-amber-900/70') : isEmerald ? (isSelected ? 'text-[#caae7a]/80' : 'text-[#a2b0ac]') : 'text-white/50'
                              }`}>{surah.englishNameTranslation}</div>
                            </div>
                          </div>
                          <div className={`text-base font-serif font-medium ${
                            isSepia ? (isSelected ? 'text-white' : 'text-[#3e2723]') : isEmerald ? (isSelected ? 'text-[#caae7a]' : 'text-[#ebf3f1]/90') : 'text-white/80'
                          }`}>{surah.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. VERSE SPLIT PANEL (Left column: Surah List, Right Column: Verses of that Surah) */}
              {activeTab === 'verse' && (
                <div className="h-full flex gap-3 overflow-hidden select-none">
                  {/* Left Column (Filtered Surah list) */}
                  <div className="w-[45%] md:w-[45%] flex flex-col h-full border-r pr-2 pb-2 border-dashed border-current/10">
                    <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
                      {filteredSurahs.map((surah) => {
                        const isFocused = localSelectedSurahNumber === surah.number;
                        const isOriginalSelected = currentSurahNumber === surah.number;
                        return (
                          <button
                            key={surah.number}
                            onClick={() => setLocalSelectedSurahNumber(surah.number)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group cursor-pointer ${
                              isSepia
                                ? isFocused
                                  ? 'bg-[#78350f] text-[#fcf8f2] border-amber-805'
                                  : 'bg-amber-900/5 border-amber-900/5 text-[#3e2723]'
                                : isEmerald
                                  ? isFocused
                                    ? 'bg-[#caae7a]/25 border-[#caae7a]/40 text-[#caae7a]'
                                    : 'bg-[#12221b] border-[#2d5048]/20 text-[#ebf3f1]'
                                  : isFocused
                                    ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200'
                                    : 'bg-white/[0.03] border-white/5 text-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono opacity-55 w-4 font-bold shrink-0">{surah.number}</span>
                              <div className="truncate flex items-center gap-1 min-w-0">
                                <span className="text-[11px] font-bold tracking-wide truncate">{surah.englishName}</span>
                                {([1, 112, 113, 114].includes(surah.number) || downloadedSurahNumbers.includes(surah.number)) && (
                                  <Cloud size={9} className={`${isFocused ? 'text-white' : isSepia ? 'text-amber-700' : isEmerald ? 'text-emerald-400' : 'text-indigo-400'} opacity-80 shrink-0`} title="Available Offline" />
                                )}
                              </div>
                            </div>
                            {isOriginalSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 select-none ml-1 shadow shadow-emerald-500/50" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column (Scrollable Ayah indices list) */}
                  <div className="flex-1 flex flex-col h-full pb-2">
                    <div className={`text-[10px] uppercase font-bold tracking-widest pl-2 mb-2 italic ${
                      isSepia ? 'text-[#78350f]' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'
                    }`}>
                      Verse Numbers for {localSelectedSurah.englishName}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 pr-1.5 pb-2">
                        {Array.from({ length: localSelectedSurah.numberOfAyahs }, (_, idx) => {
                          const verseNo = idx + 1;
                          const isCurrentlyPlaying = currentSurahNumber === localSelectedSurah.number && currentAyahNumber === verseNo;
                          return (
                            <button
                              key={verseNo}
                              onClick={() => {
                                onSelectSurahAndAyah(localSelectedSurah.number, verseNo);
                                onClose();
                              }}
                             className={`aspect-square flex flex-col items-center justify-center rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                                isSepia
                                  ? isCurrentlyPlaying
                                    ? 'bg-[#78350f] text-[#fcf8f2] border-amber-805 shadow scale-105 font-extrabold'
                                    : 'bg-amber-900/5 hover:bg-amber-100 border-amber-900/10 text-[#3e2723]'
                                  : isEmerald
                                    ? isCurrentlyPlaying
                                      ? 'bg-[#caae7a] text-[#07130e] border-[#caae7a] shadow shadow-[#caae7a]/15 scale-105 font-extrabold'
                                      : 'bg-[#12221b] hover:bg-[#2d5048]/30 hover:text-white hover:scale-105 active:scale-95 border-[#2d5048]/30 text-[#ebf3f1]/70'
                                    : isCurrentlyPlaying
                                      ? 'bg-indigo-600 text-white border-indigo-400 shadow shadow-indigo-600/15 scale-105 font-extrabold'
                                      : 'bg-white/5 hover:bg-indigo-505 hover:bg-indigo-600/25 hover:border-indigo-500/35 hover:scale-105 active:scale-95 border-white/5 text-white/70 hover:text-white'
                              }`}
                            >
                              {verseNo}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. JUZ PANEL */}
              {activeTab === 'juz' && (
                <div className="h-full overflow-y-auto pr-1 space-y-2 select-none custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-4">
                    {juzsList.map((juz) => {
                      const mapping = JUZ_MAPPING[juz];
                      const stats = juzProgressList[juz - 1] || { totalVerses: 0, readVerses: 0 };
                      const percentage = stats.totalVerses > 0 ? Math.round((stats.readVerses / stats.totalVerses) * 100) : 0;
                      const isCompleted = percentage === 100;
                      
                      return (
                        <button
                          key={juz}
                          onClick={() => handleSelectJuz(juz)}
                          className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center cursor-pointer group hover:scale-102 ${
                            isSepia
                              ? 'bg-amber-900/5 border-amber-900/10 hover:bg-amber-100/60 text-[#3e2723]'
                              : isEmerald
                                ? 'bg-[#12221b] border-[#2d5048]/25 hover:bg-[#1a3026] text-[#ebf3f1]'
                                : 'bg-white/[0.03] border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/25 text-white shadow-inner'
                          }`}
                        >
                          <BookOpen size={16} className={`mb-1.5 opacity-60 group-hover:scale-110 transition-transform ${
                            isCompleted
                              ? isSepia ? 'text-emerald-700' : 'text-emerald-400'
                              : isSepia ? 'text-amber-800' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'
                          }`} />
                          
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="text-sm font-bold tracking-wide">Juz {juz}</span>
                            {isCompleted && (
                              <Check size={11} className={isSepia ? "text-emerald-800 font-extrabold" : "text-emerald-400 font-extrabold"} />
                            )}
                          </div>

                          <div className={`text-[11px] font-semibold mt-1 ${
                            isSepia 
                              ? 'text-amber-800' 
                              : isEmerald 
                                ? 'text-[#caae7a]' 
                                : 'text-indigo-300'
                          }`}>
                            {JUZ_NAMES[juz]}
                          </div>

                          {mapping && (
                            <div className="text-[9px] font-medium opacity-50 mt-0.5 font-sans">
                              {surahs.find((s) => s.number === mapping.surah)?.englishName || ''} ({mapping.ayah})
                            </div>
                          )}

                          {/* Progress bar info and line */}
                          <div className="w-full mt-3.5 px-0.5 select-none font-sans bg-transparent">
                            <div className="flex justify-between items-center text-[9px] opacity-60 mb-1">
                              <span>{stats.readVerses}/{stats.totalVerses} read</span>
                              <span className="font-bold">{percentage}%</span>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${
                              isSepia ? 'bg-amber-900/15' : isEmerald ? 'bg-emerald-950' : 'bg-white/10'
                            }`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                  isCompleted 
                                    ? isSepia ? 'bg-[#15803d]' : 'bg-emerald-500 shadow-[0_0_4px_#10b981]' 
                                    : isSepia ? 'bg-amber-800' : isEmerald ? 'bg-[#caae7a]' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. PAGE PANEL */}
              {activeTab === 'page' && (
                <div className="h-full overflow-y-auto pr-1 space-y-2 select-none custom-scrollbar">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pb-4">
                    {pagesList.map((page) => {
                      return (
                        <button
                          key={page}
                          onClick={() => handleSelectPage(page)}
                          className={`flex items-center justify-center p-3.5 rounded-xl border transition-all text-center cursor-pointer font-mono font-bold text-xs ${
                            isSepia
                              ? 'bg-amber-900/5 hover:bg-amber-100 border-amber-900/10 text-[#3e2723] hover:scale-105 active:scale-95'
                              : isEmerald
                                ? 'bg-[#12221b] hover:bg-[#1a3026] border-[#2d5048]/30 text-[#caae7a] hover:scale-105 active:scale-95'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/10 text-white/80 hover:text-white hover:scale-105 active:scale-95 shadow shadow-white/[0.01]'
                          }`}
                        >
                          Page {page}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
