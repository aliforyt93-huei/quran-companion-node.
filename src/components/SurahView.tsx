import React, { useEffect, useRef, useState } from 'react';
import { Ayah, Surah, isRtlText } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, Sparkles, Volume2, VolumeX, BookOpen, ChevronDown, ChevronUp, Share2, Check, X, ChevronLeft, ChevronRight, Cloud, Download, CloudOff, Loader2, Trash2 } from 'lucide-react';

const BISMILLAH_SIMPLE = "بسم الله الرحمن الرحيم";
const BISMILLAH_UTHMANI = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const LOCALIZED_STRINGS: Record<string, {
  scholarlyAnalysis: string;
  transliteration: string;
  comparativeMatrix: string;
  linguisticNuance: string;
  lexicalRoots: string;
  scholarlyCrossReferences: string;
  faqsTitle: string;
  questionPrefix: string;
  clickToView: string;
  surahLabel: string;
  verseLabel: string;
}> = {
  English: {
    scholarlyAnalysis: "Scholarly Analysis",
    transliteration: "Transliteration",
    comparativeMatrix: "Comparative Translation Matrix",
    linguisticNuance: "Linguistic Nuance",
    lexicalRoots: "Lexical & Linguistic Roots",
    scholarlyCrossReferences: "Scholarly Cross-References",
    faqsTitle: "Verse FAQs",
    questionPrefix: "Q:",
    clickToView: "Click to view analysis",
    surahLabel: "Surah",
    verseLabel: "Verse"
  },
  Urdu: {
    scholarlyAnalysis: "علمی تجزیہ",
    transliteration: "نقل حرفی (ٹرانسلیٹریشن)",
    comparativeMatrix: "موازنہ ترجمہ میٹرکس",
    linguisticNuance: "لسانی باریکیاں",
    lexicalRoots: "لغوی اور لسانی جڑیں",
    scholarlyCrossReferences: "علمی حوالہ جات",
    faqsTitle: "آیت کے متعلق سوال و جواب",
    questionPrefix: "سوال:",
    clickToView: "تجزیہ دیکھنے کے لیے کلک کریں",
    surahLabel: "سورہ",
    verseLabel: "آیت"
  },
  Bengali: {
    scholarlyAnalysis: "পণ্ডিতদের বিশ্লেষণ",
    transliteration: "লিপ্যন্তর (উচ্চারণ)",
    comparativeMatrix: "অনুবাদ তুলনা ম্যাট্রিক্স",
    linguisticNuance: "ভাষাগত সূক্ষ্মতা",
    lexicalRoots: "শাব্দিক এবং ভাষাগত মূল শব্দ",
    scholarlyCrossReferences: "পণ্ডিতদের ক্রস রেফারেন্স",
    faqsTitle: "আয়াত সম্পর্কিত প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
    questionPrefix: "প্রশ্ন:",
    clickToView: "বিশ্লেষণ দেখতে ক্লিক করুন",
    surahLabel: "সূরা",
    verseLabel: "আয়াত"
  },
  Hindi: {
    scholarlyAnalysis: "विद्वानों का विश्लेषण",
    transliteration: "लिप्यंतरण (उच्चारण)",
    comparativeMatrix: "तुलनात्मक अनुवाद मैट्रिक्स",
    linguisticNuance: "भाषाई सूक्ष्मता",
    lexicalRoots: "शाब्दिक और भाषाई मूल शब्द",
    scholarlyCrossReferences: "विद्वानों के क्रॉस-रेफरेंस",
    faqsTitle: "आयत से संबंधित अक्सर पूछे जाने वाले प्रश्न",
    questionPrefix: "प्रश्न:",
    clickToView: "विश्लेषण देखने के लिए क्लिक करें",
    surahLabel: "सूरा",
    verseLabel: "आयत"
  },
  French: {
    scholarlyAnalysis: "Analyse érudite",
    transliteration: "Translittération",
    comparativeMatrix: "Matrice de comparaison des traductions",
    linguisticNuance: "Nuance linguistique",
    lexicalRoots: "Racines lexicales et linguistiques",
    scholarlyCrossReferences: "Références croisées savantes",
    faqsTitle: "FAQ du verset",
    questionPrefix: "Q:",
    clickToView: "Cliquez pour voir l'analyse",
    surahLabel: "Sourate",
    verseLabel: "Verset"
  },
  Turkish: {
    scholarlyAnalysis: "Akademik Analiz",
    transliteration: "Transkripsiyon",
    comparativeMatrix: "Karşılaştırmalı Çeviri Matrisi",
    linguisticNuance: "Dilbilimsel İncelik",
    lexicalRoots: "Sözcük ve Dilbilimsel Kökler",
    scholarlyCrossReferences: "Akademik Çapraz Referanslar",
    faqsTitle: "Ayet SSS",
    questionPrefix: "S:",
    clickToView: "Analiz için tıklayın",
    surahLabel: "Sure",
    verseLabel: "Ayet"
  }
};

interface SurahViewProps {
  surah: Surah;
  translationLanguage?: string;
  currentAyahNumber: number; // numberInSurah
  onAyahClick: (index: number) => void;
  onReadTranslation: (index: number) => void;
  showTranslation: boolean;
  showTafsir: boolean;
  isBookmarked: (ayahGlobalNumber: number) => boolean;
  onToggleBookmark: (ayah: Ayah, event: React.MouseEvent) => void;
  theme: string;
  fontSizeMultiplier: number;
  onOpenContext?: (index: number) => void;
  isReadingTranslation?: boolean;
  isPlaying?: boolean;
  onPauseTranslation?: () => void;
  layoutMode?: 'verse' | 'arabic' | 'translation' | 'context';
  onLayoutModeChange?: (mode: 'verse' | 'arabic' | 'translation' | 'context') => void;
  renderQuranBotInline?: () => React.ReactNode;
  savedProgress?: {
    surahNumber: number;
    surahName: string;
    surahEnglishName: string;
    ayahIndex: number;
    timestamp: number;
  } | null;
  onResumeReading?: () => void;
  isReadTranslationAloudEnabled?: boolean;
  onToggleReadTranslationAloud?: () => void;
  isAutoScrollEnabled?: boolean;
  isOffline?: boolean;
  downloadedSurahNumbers?: number[];
  onDownloadSurah?: (surahNumber: number) => void;
  onDeleteOfflineSurah?: (surahNumber: number) => void;
  downloadProgressSurah?: number | null;
  downloadProgressMessage?: string;
  onToggleAyahRead?: (ayah: Ayah, event: React.MouseEvent) => void;
  isAyahRead?: (ayahGlobalNumber: number) => boolean;
}

export const SurahView: React.FC<SurahViewProps> = ({
  surah,
  translationLanguage = 'English',
  currentAyahNumber,
  onAyahClick,
  onReadTranslation,
  showTranslation,
  showTafsir,
  isBookmarked,
  onToggleBookmark,
  theme,
  fontSizeMultiplier,
  onOpenContext,
  isReadingTranslation,
  isPlaying,
  onPauseTranslation,
  layoutMode = 'verse',
  onLayoutModeChange,
  renderQuranBotInline,
  savedProgress,
  onResumeReading,
  isReadTranslationAloudEnabled,
  onToggleReadTranslationAloud,
  isAutoScrollEnabled = true,
  isOffline = false,
  downloadedSurahNumbers = [],
  onDownloadSurah,
  onDeleteOfflineSurah,
  downloadProgressSurah = null,
  downloadProgressMessage = "",
  onToggleAyahRead,
  isAyahRead
}) => {
  const ayahRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [copiedAyahNumber, setCopiedAyahNumber] = useState<number | null>(null);

  const activeAyah = surah.ayahs?.[currentAyahNumber - 1];
  const activeTranslation = activeAyah?.translation || "";
  const activeArabic = activeAyah?.text || "";



  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';
  const isOled = theme === 'oled';

  const loc = LOCALIZED_STRINGS[translationLanguage] || LOCALIZED_STRINGS.English;

  const handleShare = (e: React.MouseEvent, ayah: Ayah) => {
    e.stopPropagation();
    const shareText = `Surah ${surah.englishName} [${surah.number}:${ayah.numberInSurah}]\n\n${ayah.text}\n\nTranslation:\n${ayah.translation}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedAyahNumber(ayah.number);
      setTimeout(() => setCopiedAyahNumber(null), 2000);
    }).catch(err => {
      console.error("Failed to copy verse text:", err);
    });
  };

  useEffect(() => {
    const shouldScroll = isAutoScrollEnabled || !isPlaying;
    if (shouldScroll && ayahRefs.current[currentAyahNumber]) {
      ayahRefs.current[currentAyahNumber]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentAyahNumber, isAutoScrollEnabled, isPlaying]);

  return (
    <div className={`max-w-4xl mx-auto px-6 py-24 pb-48 ${isSepia ? 'text-amber-955' : isEmerald ? 'text-[#ebf3f1]' : 'text-white'} animate-fade-in`}>
      <header className="text-center mb-16 space-y-6">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif mb-4"
          >
            {surah.name}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-xl uppercase tracking-widest font-sans font-medium"
          >
            {surah.englishName} • {surah.englishNameTranslation}
          </motion.p>
        </div>



        {savedProgress && onResumeReading && (savedProgress.surahNumber !== surah.number || savedProgress.ayahIndex !== (currentAyahNumber - 1)) && (
          <div className="flex justify-center pt-2">
            <motion.button
              onClick={onResumeReading}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all duration-300 shadow-md cursor-pointer border ${
                isSepia
                  ? 'bg-amber-900/10 border-amber-900/15 text-[#3e2723] hover:bg-amber-900/20 shadow-amber-900/5'
                  : isOled
                    ? 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-850'
                    : isEmerald
                      ? 'bg-emerald-900/20 border-[#2d5048]/30 text-[#caae7a] hover:bg-emerald-900/35 shadow-emerald-950/20'
                      : 'bg-indigo-600/15 border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/25 shadow-[0_4px_15px_rgba(99,102,241,0.15)]'
              }`}
            >
              <BookOpen size={13} className={`animate-pulse ${isSepia ? 'text-amber-800' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'}`} />
              <span>Resume: Surah {savedProgress.surahEnglishName} (Ayah {savedProgress.ayahIndex + 1})</span>
            </motion.button>
          </div>
        )}

        {onLayoutModeChange && (
          <div className="flex justify-center pt-2">
            <div className={`flex p-1 rounded-full border backdrop-blur-md shadow-md transition-all ${
              isSepia 
                ? 'bg-amber-900/5 border-amber-900/10' 
                : isEmerald
                  ? 'bg-[#13201d]/50 border-[#2d5048]/30'
                  : 'bg-white/5 border-white/10'
            }`}>
              {(['verse', 'arabic', 'translation', 'context'] as const).map((mode) => {
                const isSelected = layoutMode === mode;
                const label = mode === 'verse' ? 'Verse by Verse' : mode === 'arabic' ? 'Arabic' : mode === 'translation' ? 'Translation' : 'Ayat Context';
                return (
                  <button
                    key={mode}
                    onClick={() => onLayoutModeChange(mode)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? theme === 'sepia'
                          ? 'bg-amber-800 text-[#fcf8f2] shadow-sm font-bold'
                          : theme === 'oled'
                            ? 'bg-white text-black font-bold'
                            : theme === 'emerald'
                              ? 'bg-[#caae7a] text-[#0a1210] shadow-[0_4px_12px_rgba(202,174,122,0.25)] font-bold'
                              : 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] font-bold'
                        : theme === 'sepia'
                          ? 'text-amber-955/65 hover:text-amber-955 hover:bg-amber-900/5'
                          : theme === 'emerald'
                            ? 'text-[#a2b0ac] hover:text-[#ebf3f1] hover:bg-[#2d5048]/25'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {onDownloadSurah && (
          <div className="flex justify-center pt-3 select-none">
            {downloadProgressSurah === surah.number ? (
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider border uppercase transition-all duration-300 shadow-md ${
                isSepia
                  ? 'bg-amber-900/5 border-amber-900/15 text-amber-900 shadow-amber-900/5'
                  : isEmerald
                    ? 'bg-emerald-900/10 border-emerald-800/20 text-[#caae7a]'
                    : 'bg-white/5 border-white/10 text-indigo-300'
              }`}>
                <Loader2 size={11} className="animate-spin text-purple-400" />
                <span>{downloadProgressMessage || 'Preparing...'}</span>
              </div>
            ) : downloadedSurahNumbers.includes(surah.number) ? (
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider border uppercase transition-all duration-300 shadow-md ${
                  isSepia
                    ? 'bg-emerald-990/5 border-emerald-900/15 text-emerald-850 shadow-emerald-900/5'
                    : isEmerald
                      ? 'bg-emerald-950/40 border-emerald-800/30 text-emerald-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
                  <Cloud size={11} className="text-emerald-400 animate-pulse" />
                  <span>Available Offline</span>
                </span>
                
                {onDeleteOfflineSurah && (
                  <button
                    onClick={() => {
                      if (window.confirm && window.confirm(`Delete offline data cache and audio files for Surah ${surah.englishName}?`)) {
                        onDeleteOfflineSurah(surah.number);
                      }
                    }}
                    className={`p-1.5 rounded-full border transition-all hover:scale-105 cursor-pointer text-red-450 border-red-500/10 hover:border-red-500/25 hover:bg-red-500/10`}
                    title="Remove offline copy"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ) : (
              <motion.button
                onClick={() => onDownloadSurah(surah.number)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-semibold tracking-wider border uppercase transition-all duration-300 shadow-sm cursor-pointer ${
                  isSepia
                    ? 'bg-amber-950/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-955'
                    : isEmerald
                      ? 'bg-[#182c27]/45 hover:bg-emerald-950/40 border-emerald-850/20 text-[#caae7a]'
                      : 'bg-white/[0.03] hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
                }`}
                title="Download this Surah complete for offline use"
              >
                <Download size={11} className={isSepia ? 'text-amber-800' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'} />
                <span>Save Offline</span>
              </motion.button>
            )}
          </div>
        )}
      </header>

      {/* Conditional Layout Rendering */}
      {layoutMode === 'arabic' ? (
        <div 
          className={`p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border backdrop-blur-md transition-all duration-500 shadow-xl ${
            isSepia 
              ? 'bg-[#faf6ee]/70 border-amber-900/15' 
              : isOled 
                ? 'bg-neutral-950/70 border-neutral-900 text-white' 
                : isEmerald
                  ? 'bg-[#13201d]/85 border-[#2d5048]/30'
                  : 'bg-white/[0.04] border-white/10'
          }`}
        >
          {surah.number !== 1 && surah.number !== 9 && (
            <div 
              className={`font-quran text-center py-6 select-none border-b mb-8 ${
                theme === 'sepia' ? 'text-amber-900/90 border-amber-900/10' : 'text-emerald-100/90 border-white/5'
              }`}
              style={{ fontSize: `calc(2.1rem * ${fontSizeMultiplier})`, lineHeight: 1.8 }}
            >
              {BISMILLAH_UTHMANI}
            </div>
          )}

          <div 
            className="text-right w-full selection:bg-emerald-500/30 whitespace-normal leading-[3] md:leading-[3.5] text-justify select-text animate-fadeIn"
            style={{ direction: 'rtl' }}
          >
            {surah.ayahs?.map((ayah, index) => {
              const isActive = ayah.numberInSurah === currentAyahNumber;
              
              let ayahText = ayah.text;
              if (ayah.numberInSurah === 1 && surah.number !== 1 && surah.number !== 9) {
                if (ayahText.startsWith(BISMILLAH_UTHMANI)) {
                  ayahText = ayahText.substring(BISMILLAH_UTHMANI.length).trim();
                } else if (ayahText.startsWith(BISMILLAH_SIMPLE)) {
                  ayahText = ayahText.substring(BISMILLAH_SIMPLE.length).trim();
                } else {
                  const match = ayahText.match(/^بِسْمِ\s+[ٱا]للَّهِ\s+[ٱا]لرَّحْمَٰنِ\s+[ٱا]لرَّحِيمِ\s*/);
                  if (match) {
                    ayahText = ayahText.substring(match[0].length).trim();
                  }
                }
              }

              return (
                <motion.span
                  key={ayah.number}
                  ref={(el) => (ayahRefs.current[ayah.numberInSurah] = el)}
                  onClick={() => onAyahClick(index)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`inline cursor-pointer font-quran transition-all duration-300 rounded-xl px-2 py-1 mx-0.5 ${
                    isActive 
                      ? isSepia
                        ? 'bg-amber-850 text-amber-955 font-semibold ring-1 ring-amber-850/20 shadow-sm'
                        : isOled
                          ? 'bg-white/15 text-white font-semibold ring-1 ring-white/10'
                          : isEmerald
                            ? 'bg-[#caae7a]/15 text-[#caae7a] font-semibold ring-1 ring-[#caae7a]/20 shadow-sm shadow-[#caae7a]/5'
                            : 'bg-indigo-600/15 text-indigo-300 font-semibold ring-1 ring-indigo-500/20 shadow-sm shadow-indigo-500/5'
                      : isSepia
                        ? 'text-amber-955/85 hover:text-amber-955 hover:bg-amber-900/5'
                        : isOled
                          ? 'text-white/70 hover:text-white hover:bg-white/5'
                          : isEmerald
                            ? 'text-[#ebf3f1]/75 hover:text-[#ebf3f1] hover:bg-[#caae7a]/5'
                            : 'text-white/75 hover:text-white hover:bg-white/5'
                  }`}
                  style={{ 
                    fontSize: `calc(1.8rem * ${fontSizeMultiplier})`
                  }}
                >
                  {ayahText}
                  <span 
                    className={`inline-flex items-center justify-center font-sans w-7 h-7 rounded-full mx-2 text-[10px] font-bold border align-middle select-none transition-all duration-300 ${
                      isActive 
                        ? theme === 'sepia'
                          ? 'bg-amber-800 text-[#fcf8f2] border-amber-700 shadow-sm'
                          : theme === 'emerald'
                            ? 'bg-[#caae7a] text-[#0a1210] border-[#caae7a] shadow-sm'
                            : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : theme === 'sepia'
                          ? 'bg-amber-900/5 text-amber-900/60 border-amber-900/15'
                          : theme === 'emerald'
                            ? 'bg-[#2d5048]/10 text-[#caae7a]/70 border-[#2d5048]/25'
                            : 'bg-white/5 text-white/50 border-white/10'
                    }`}
                  >
                    {ayah.numberInSurah}
                  </span>
                </motion.span>
              );
            })}
          </div>
        </div>
      ) : layoutMode === 'translation' ? (
        <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border backdrop-blur-md transition-all duration-500 shadow-xl flex flex-col gap-4 md:gap-6 ${
          isSepia 
            ? 'bg-[#faf6ee]/70 border-amber-900/15 text-amber-955' 
            : isOled 
              ? 'bg-neutral-950/70 border-neutral-900 text-white' 
              : isEmerald
                ? 'bg-[#13201d]/85 border-[#2d5048]/30 text-[#ebf3f1]'
                : 'bg-white/[0.04] border-white/10 text-white'
        }`}>
          {surah.ayahs?.map((ayah, index) => {
            const isActive = ayah.numberInSurah === currentAyahNumber;
            return (
              <motion.div
                key={ayah.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ type: "spring", stiffness: 100, damping: 16 }}
                className="w-full"
              >
                <motion.div
                  ref={(el) => (ayahRefs.current[ayah.numberInSurah] = el)}
                  onClick={() => onAyahClick(index)}
                  initial={false}
                  animate={isActive ? {
                    scale: 1,
                    backgroundColor: isSepia
                      ? 'rgba(180, 83, 9, 0.08)'
                      : isOled
                        ? 'rgba(255, 255, 255, 0.12)'
                        : isEmerald
                          ? 'rgba(45, 80, 72, 0.3)'
                          : 'rgba(99, 102, 241, 0.12)',
                    borderColor: isSepia
                      ? 'rgba(180, 83, 9, 0.25)'
                      : isOled
                        ? 'rgba(255, 255, 255, 0.22)'
                        : isEmerald
                          ? 'rgba(202, 174, 122, 0.35)'
                          : 'rgba(99, 102, 241, 0.25)',
                    boxShadow: isSepia
                      ? '0 10px 25px -10px rgba(180, 83, 9, 0.08)'
                      : isOled
                        ? '0 10px 25px -10px rgba(255, 255, 255, 0.02)'
                        : isEmerald
                          ? '0 10px 25px -10px rgba(11, 20, 18, 0.3)'
                          : '0 10px 25px -10px rgba(99, 102, 241, 0.12)'
                  } : {
                    scale: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    borderColor: 'rgba(0, 0, 0, 0)',
                    boxShadow: 'none'
                  }}
                  whileHover={{
                    scale: 1,
                    backgroundColor: isActive
                      ? (isSepia ? 'rgba(180, 83, 9, 0.11)' : isOled ? 'rgba(255, 255, 255, 0.15)' : isEmerald ? 'rgba(45, 80, 72, 0.35)' : 'rgba(99, 102, 241, 0.15)')
                      : (isSepia ? 'rgba(180, 83, 9, 0.03)' : isOled ? 'rgba(255, 255, 255, 0.04)' : isEmerald ? 'rgba(45, 80, 72, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                    borderColor: isActive
                      ? (isSepia ? 'rgba(180, 83, 9, 0.3)' : isOled ? 'rgba(255, 255, 255, 0.28)' : isEmerald ? 'rgba(202, 174, 122, 0.4)' : 'rgba(99, 102, 241, 0.33)')
                      : (isSepia ? 'rgba(180, 83, 9, 0.08)' : isOled ? 'rgba(255, 255, 255, 0.08)' : isEmerald ? 'rgba(45, 80, 72, 0.15)' : 'rgba(255, 255, 255, 0.08)')
                  }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  className={`group flex items-start gap-4 p-5 md:p-6 rounded-2xl cursor-pointer relative border ${
                    isSepia
                      ? 'text-amber-955'
                      : isOled
                        ? 'text-white'
                        : isEmerald
                          ? 'text-[#ebf3f1]'
                          : 'text-indigo-100'
                  }`}
                >
                {/* Verse Number Indicator, Bookmark Button & Share Button */}
                <div className="flex flex-col items-center gap-2.5 shrink-0 select-none">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    isActive
                      ? isSepia 
                        ? 'bg-amber-850 text-white bg-amber-800' 
                        : isOled 
                          ? 'bg-white text-black' 
                          : isEmerald 
                            ? 'bg-[#caae7a] text-[#0a1210]' 
                            : 'bg-indigo-500 text-white'
                      : isSepia 
                        ? 'bg-amber-900/10 text-amber-900/60' 
                        : isEmerald 
                          ? 'bg-[#2d5048]/30 text-[#a2b0ac]' 
                          : 'bg-white/5 text-white/40'
                  }`}>
                    {ayah.numberInSurah}
                  </span>
                  
                  <button 
                    onClick={(e) => onToggleAyahRead?.(ayah, e)}
                    className={`p-1.5 rounded-full transition-all border pointer-events-auto cursor-pointer flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                      isAyahRead?.(ayah.number) ? 'opacity-100' : ''
                    } ${
                      isAyahRead?.(ayah.number)
                        ? 'bg-green-600 border-green-550 text-white shadow-md shadow-green-600/15'
                        : isSepia
                          ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                          : isEmerald
                            ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    title={isAyahRead?.(ayah.number) ? "Marked as read" : "Mark as read"}
                  >
                    <Check size={10} className="stroke-[3]" />
                  </button>

                  <button 
                    onClick={(e) => onToggleBookmark(ayah, e)}
                    className={`p-1.5 rounded-full transition-all border pointer-events-auto cursor-pointer flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                      isBookmarked(ayah.number) ? 'opacity-100' : ''
                    } ${
                      isBookmarked(ayah.number)
                        ? isSepia
                          ? 'bg-amber-850 border-amber-800 text-amber-955 shadow-md'
                          : isEmerald
                            ? 'bg-[#caae7a] border-[#caae7a] text-[#0a1210] shadow-md shadow-emerald-900/15'
                            : 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/15'
                        : isSepia
                          ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                          : isEmerald
                            ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    title={isBookmarked(ayah.number) ? "Remove bookmark" : "Bookmark ayah"}
                  >
                    <Bookmark size={10} fill={isBookmarked(ayah.number) ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={(e) => handleShare(e, ayah)}
                    className={`p-1.5 rounded-full transition-all border pointer-events-auto cursor-pointer flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                      copiedAyahNumber === ayah.number ? 'opacity-100' : ''
                    } ${
                      copiedAyahNumber === ayah.number
                        ? isSepia
                          ? 'bg-emerald-800 border-emerald-700 text-white shadow-sm'
                          : isEmerald
                            ? 'bg-emerald-600 border-[#2d5048]/30 text-white shadow-sm'
                            : 'bg-emerald-600 border-emerald-550 text-white shadow-sm'
                        : isSepia
                          ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                          : isEmerald
                            ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/55 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    title="Share verse (copy translation)"
                  >
                    {copiedAyahNumber === ayah.number ? <Check size={10} /> : <Share2 size={10} />}
                  </button>

                </div>

                {/* Translation Text Description */}
                <div className="flex-1 space-y-2.5">
                  <motion.div 
                    className={`font-sans tracking-wide leading-relaxed transition-all duration-500 rounded-xl px-4 py-3 border border-transparent ${
                      isActive ? 'font-semibold text-white/95' : 'font-normal opacity-90'
                    } ${isSepia ? (isActive ? 'text-amber-955' : 'text-amber-955/85') : isEmerald ? (isActive ? 'text-[#ebf3f1]' : 'text-[#ebf3f1]/85') : ''}`}
                    style={{ fontSize: `calc(1.1rem * ${fontSizeMultiplier})` }}
                    animate={isActive && isReadingTranslation && isPlaying ? {
                      scale: [1, 1.012, 1],
                      borderColor: isSepia 
                        ? 'rgba(180,83,9,0.3)' 
                        : isEmerald 
                          ? 'rgba(202,174,122,0.45)' 
                          : 'rgba(99,102,241,0.45)',
                      backgroundColor: isSepia 
                        ? 'rgba(180,83,9,0.04)' 
                        : isEmerald 
                          ? 'rgba(20,40,36,0.3)' 
                          : isOled 
                            ? 'rgba(255,255,255,0.06)' 
                            : 'rgba(99,102,241,0.06)',
                      boxShadow: isSepia 
                        ? [
                            '0 0 4px rgba(180, 83, 9, 0.05)',
                            '0 0 15px rgba(180, 83, 9, 0.25)',
                            '0 0 4px rgba(180, 83, 9, 0.05)'
                          ]
                        : isEmerald
                          ? [
                              '0 0 4px rgba(202, 174, 122, 0.05)',
                              '0 0 18px rgba(202, 174, 122, 0.35)',
                              '0 0 4px rgba(202, 174, 122, 0.05)'
                            ]
                          : isOled
                            ? [
                                '0 0 4px rgba(255, 255, 255, 0.02)',
                                '0 0 15px rgba(255, 255, 255, 0.15)',
                                '0 0 4px rgba(255, 255, 255, 0.02)'
                              ]
                            : [
                                '0 0 4px rgba(99, 102, 241, 0.05)',
                                '0 0 18px rgba(99, 102, 241, 0.35)',
                                '0 0 4px rgba(99, 102, 241, 0.05)'
                              ]
                    } : {
                      scale: 1,
                      borderColor: 'rgba(0,0,0,0)',
                      backgroundColor: 'rgba(0,0,0,0)',
                      boxShadow: 'none'
                    }}
                    transition={isActive && isReadingTranslation && isPlaying ? {
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : { duration: 0.3 }}
                  >
                    {ayah.translation}
                  </motion.div>
                  
                  {/* Micro listen button only for active verse */}
                  {isActive && (
                    <div className="space-y-4 pt-1 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReadTranslation(index);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none ${
                          isReadingTranslation && isPlaying
                            ? isSepia 
                              ? 'bg-amber-800 text-[#fcf8f2] border-amber-800' 
                              : isEmerald
                                ? 'bg-[#caae7a] border-[#caae7a] text-[#0a1210]'
                                : 'bg-indigo-600 border-indigo-500 text-indigo-100'
                            : isSepia
                              ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/12 text-amber-955/65 hover:text-amber-955'
                              : isEmerald
                                ? 'bg-emerald-900/15 hover:bg-emerald-900/25 border-[#2d5048]/30 text-[#caae7a] hover:text-[#caae7a]'
                                : 'bg-white/5 hover:bg-white/10 border-white/8 text-white/55 hover:text-white'
                        }`}
                      >
                        {isReadingTranslation && isPlaying ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-3 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <span className="w-1 h-3 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            Playing
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Volume2 size={10} />
                            Listen
                          </span>
                        )}
                      </button>

                      {/* Scholarly Analysis Expandable Panel inside Translation layout */}
                      
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
            );
          })}
        </div>
      ) : layoutMode === 'context' ? (
        <div className="w-full">
          {renderQuranBotInline ? renderQuranBotInline() : null}
        </div>
      ) : (
        <div className="flex flex-col gap-8 md:gap-11 w-full animate-fadeIn">
          {onToggleReadTranslationAloud && (
            <div 
              className="flex flex-row items-center justify-between gap-3 p-2.5 px-4 rounded-xl border backdrop-blur-md transition-all shadow-sm"
              style={{
                backgroundColor: isSepia ? 'rgba(180, 83, 9, 0.03)' : isEmerald ? 'rgba(19, 32, 29, 0.35)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: isSepia ? 'rgba(180, 83, 9, 0.12)' : isEmerald ? 'rgba(45, 80, 72, 0.25)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-full ${isSepia ? 'bg-amber-900/10 text-amber-800' : isEmerald ? 'bg-emerald-950 text-[#caae7a]' : 'bg-indigo-500/15 text-indigo-300'}`}>
                  {isReadTranslationAloudEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </div>
                <div className="text-left">
                  <span className={`block text-[10px] md:text-xs font-bold tracking-wide ${isSepia ? 'text-amber-955' : isEmerald ? 'text-[#ebf3f1]' : 'text-white'}`}>
                    Read Translation Aloud (TTS)
                  </span>
                  <span className={`block text-[9px] mt-0.5 leading-tight ${isSepia ? 'text-amber-900/60' : isEmerald ? 'text-[#a2b0ac]' : 'text-stone-400'}`}>
                    Play translation automatically after each Arabic verse.
                  </span>
                </div>
              </div>
              <button
                onClick={onToggleReadTranslationAloud}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-all duration-200 ease-in-out focus:outline-none ${
                   isReadTranslationAloudEnabled 
                    ? (isSepia ? 'bg-amber-805 bg-amber-800' : isEmerald ? 'bg-[#caae7a]' : 'bg-indigo-600') 
                    : (isSepia ? 'bg-amber-900/10' : isEmerald ? 'bg-[#2d5048]/35' : 'bg-white/10')
                }`}
                aria-label="Toggle translation read aloud"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    isReadTranslationAloudEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
          {surah.ayahs?.map((ayah, index) => {
            const isActive = ayah.numberInSurah === currentAyahNumber;
            
            let ayahText = ayah.text;
            let showStandaloneBismillah = false;
            
            if (ayah.numberInSurah === 1 && surah.number !== 1 && surah.number !== 9) {
              if (ayahText.startsWith(BISMILLAH_UTHMANI)) {
                ayahText = ayahText.substring(BISMILLAH_UTHMANI.length).trim();
                showStandaloneBismillah = true;
              } else if (ayahText.startsWith(BISMILLAH_SIMPLE)) {
                ayahText = ayahText.substring(BISMILLAH_SIMPLE.length).trim();
                showStandaloneBismillah = true;
              } else {
                const match = ayahText.match(/^بِسْمِ\s+[ٱا]للَّهِ\s+[ٱا]لرَّحْمَٰنِ\s+[ٱا]لرَّحِيمِ\s*/);
                if (match) {
                  ayahText = ayahText.substring(match[0].length).trim();
                  showStandaloneBismillah = true;
                }
              }
            }

            return (
              <motion.div
                key={ayah.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ type: "spring", stiffness: 100, damping: 18 }}
                className="w-full"
              >
                <motion.div
                  ref={(el) => (ayahRefs.current[ayah.numberInSurah] = el)}
                  onClick={() => onAyahClick(index)}
                  initial={false}
                  animate={isActive ? {
                    scale: 1,
                    backgroundColor: isSepia 
                      ? 'rgba(227, 211, 182, 0.95)' 
                      : isOled 
                        ? 'rgba(20, 20, 20, 0.95)' 
                        : isEmerald
                          ? 'rgba(19, 32, 29, 0.95)'
                          : 'rgba(255, 255, 255, 0.15)',
                    borderColor: isSepia 
                      ? 'rgba(139, 92, 26, 0.4)' 
                      : isOled 
                        ? 'rgba(255, 255, 255, 0.25)' 
                        : isEmerald
                          ? 'rgba(202, 174, 122, 0.4)'
                          : 'rgba(129, 140, 248, 0.3)',
                    boxShadow: isSepia
                      ? '0 20px 40px -15px rgba(139, 92, 26, 0.1)'
                      : isOled
                        ? '0 20px 40px -15px rgba(255, 255, 255, 0.02)'
                        : isEmerald
                          ? '0 20px 40px -15px rgba(11, 20, 18, 0.3)'
                          : '0 20px 40px -15px rgba(129, 140, 248, 0.15)',
                    opacity: 1
                  } : {
                    scale: 1,
                    backgroundColor: isSepia 
                      ? 'rgba(240, 227, 204, 0.35)' 
                      : isOled 
                        ? 'rgba(5, 5, 5, 0.6)' 
                        : isEmerald
                          ? 'rgba(19, 32, 29, 0.45)'
                          : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isSepia 
                      ? 'rgba(139, 92, 26, 0.08)' 
                      : isOled 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : isEmerald
                          ? 'rgba(45, 80, 72, 0.15)'
                          : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 20px -10px rgba(0, 0, 0, 0.3)',
                    opacity: isSepia ? 0.65 : isOled ? 0.4 : isEmerald ? 0.75 : 0.4
                  }}
                  whileHover={{ 
                    scale: 1.002,
                    opacity: 1,
                    backgroundColor: isActive 
                      ? (isSepia ? 'rgba(227, 211, 182, 0.98)' : isOled ? 'rgba(25, 25, 25, 0.98)' : isEmerald ? 'rgba(19, 32, 29, 0.98)' : 'rgba(255, 255, 255, 0.18)')
                      : (isSepia ? 'rgba(240, 227, 204, 0.6)' : isOled ? 'rgba(12, 12, 12, 0.8)' : isEmerald ? 'rgba(25, 42, 38, 0.65)' : 'rgba(255, 255, 255, 0.08)'),
                    borderColor: isActive 
                      ? (isSepia ? 'rgba(139, 92, 26, 0.5)' : isOled ? 'rgba(255, 255, 255, 0.35)' : isEmerald ? 'rgba(202, 174, 122, 0.55)' : 'rgba(129, 140, 248, 0.4)')
                      : (isSepia ? 'rgba(139, 92, 26, 0.15)' : isOled ? 'rgba(255, 255, 255, 0.12)' : isEmerald ? 'rgba(45, 80, 72, 0.3)' : 'rgba(255, 255, 255, 0.15)')
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  className={`group relative p-5 md:p-8 rounded-2xl cursor-pointer border backdrop-blur-md select-none ${
                    isSepia 
                      ? 'text-amber-955 shadow-amber-900/5' 
                      : isOled 
                        ? 'text-white shadow-none' 
                        : isEmerald
                          ? 'text-[#ebf3f1] shadow-emerald-950/10'
                          : 'text-white'
                  }`}
                >
                <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
                  isSepia ? 'border-amber-900/10' : isEmerald ? 'border-[#2d5048]/25' : 'border-white/5'
                }`}>
                  <div className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-500 ${
                    isActive 
                      ? (isSepia ? 'text-amber-800' : isOled ? 'text-white' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-300')
                      : (isSepia ? 'text-amber-900/40' : isOled ? 'text-white/20' : isEmerald ? 'text-[#a2b0ac]/45' : 'text-white/20')
                  }`}>
                    Ayat {ayah.numberInSurah} {isActive && '(Reciting)'}
                  </div>

                  <div className="flex items-center gap-2 pointer-events-auto">
                    {onOpenContext && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenContext(index);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer border ${
                          isSepia
                            ? 'bg-amber-900/5 border-amber-900/10 text-amber-955 hover:bg-amber-900/10 hover:scale-105 active:scale-95'
                            : isOled
                              ? 'bg-white/5 border-white/10 text-white hover:bg-white/12 hover:scale-105 active:scale-95'
                              : isEmerald
                                ? 'bg-[#caae7a]/15 border-[#caae7a]/40 text-[#caae7a] hover:bg-[#caae7a]/25 hover:scale-105 active:scale-95 shadow-md shadow-emerald-950/20'
                                : 'bg-indigo-600/25 border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/40 hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(99,102,241,0.15)]'
                        }`}
                        title="Ayat Context (Tafsir & Analysis)"
                      >
                        <Sparkles size={11} className={isActive ? 'animate-spin' : ''} />
                        <span>Ayat Context</span>
                      </button>
                    )}
                    <button 
                      onClick={(e) => onToggleAyahRead?.(ayah, e)}
                      className={`p-1.5 rounded-full transition-all border ${
                        isAyahRead?.(ayah.number)
                          ? 'bg-green-600 border-green-550 text-white shadow-md shadow-green-600/15'
                          : isSepia
                            ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                            : isEmerald
                              ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                      title={isAyahRead?.(ayah.number) ? "Marked as read" : "Mark as read"}
                    >
                      <Check size={12} className="stroke-[3]" />
                    </button>

                    <button 
                      onClick={(e) => onToggleBookmark(ayah, e)}
                      className={`p-1.5 rounded-full transition-all border ${
                        isBookmarked(ayah.number)
                          ? isSepia
                            ? 'bg-amber-850 border-amber-800 text-amber-955 shadow-md'
                            : isEmerald
                              ? 'bg-[#caae7a] border-[#caae7a] text-[#0a1210] shadow-md shadow-emerald-900/15'
                              : 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/15'
                          : isSepia
                            ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                            : isEmerald
                              ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                      title={isBookmarked(ayah.number) ? "Remove bookmark" : "Bookmark ayah"}
                    >
                      <Bookmark size={12} fill={isBookmarked(ayah.number) ? 'currentColor' : 'none'} />
                    </button>

                    <button 
                      onClick={(e) => handleShare(e, ayah)}
                      className={`p-1.5 rounded-full transition-all border ${
                        copiedAyahNumber === ayah.number
                          ? isSepia
                            ? 'bg-emerald-800 border-emerald-700 text-white shadow-md'
                            : isEmerald
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                              : 'bg-emerald-600 border-emerald-550 text-white shadow-md'
                          : isSepia
                            ? 'bg-amber-900/5 border-amber-900/10 text-amber-955/40 hover:text-amber-955 hover:bg-amber-900/10'
                            : isEmerald
                              ? 'bg-[#2d5048]/20 border-[#2d5048]/25 text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-[#2d5048]/30'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                      title="Share verse (copy translation)"
                    >
                      {copiedAyahNumber === ayah.number ? <Check size={12} /> : <Share2 size={12} />}
                    </button>

                  </div>
                </div>
                
                {layoutMode !== 'translation' && (
                  <div 
                    className="text-right w-full"
                    style={{ direction: 'rtl' }}
                  >
                    {showStandaloneBismillah && (
                      <div 
                        className={`font-quran text-center mb-10 pb-6 opacity-95 tracking-wide select-none ${
                          isSepia ? 'text-amber-900/90' : isEmerald ? 'text-[#caae7a]/90' : 'text-emerald-100/90'
                        }`}
                        style={{ fontSize: `calc(1.8rem * ${fontSizeMultiplier})`, lineHeight: 1.8 }}
                      >
                        {BISMILLAH_UTHMANI}
                      </div>
                    )}
                    <div 
                      className={`font-quran mb-8 tracking-wide text-right selection:bg-emerald-500/30 ${
                        isActive 
                          ? (isSepia ? 'text-amber-955' : isOled ? 'text-white' : isEmerald ? 'text-[#caae7a]' : 'text-emerald-50')
                          : (isSepia ? 'text-amber-955/80' : isOled ? 'text-white/70' : isEmerald ? 'text-[#ebf3f1]/70' : 'text-emerald-50/75')
                      }`}
                      style={{ 
                        fontSize: `calc(1.9rem * ${fontSizeMultiplier})`, 
                        lineHeight: 2.15
                      }}
                    >
                      {ayahText}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col items-center gap-4 w-full">
                  {(layoutMode === 'translation' || layoutMode === 'context' || (showTranslation && layoutMode !== 'arabic')) && (
                    <div className="flex flex-col items-center gap-3.5 w-full">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        dir={isRtlText(ayah.translation) ? 'rtl' : 'ltr'}
                        className={`text-center font-sans tracking-wide leading-relaxed mx-auto max-w-3xl rounded-2xl px-6 py-4.5 border transition-all duration-500`}
                        style={{ 
                          fontSize: `calc(1.05rem * ${fontSizeMultiplier})`,
                          color: isActive 
                            ? (isSepia ? '#2d1b0d' : isOled ? '#e5e5e5' : isEmerald ? '#ebf3f1' : '#e0e7ff')
                            : (isSepia ? '#6d5a4d' : isOled ? '#737373' : isEmerald ? '#829c97' : 'rgba(255, 255, 255, 0.6)'),
                          fontWeight: isActive ? 600 : 400,
                          borderColor: 'transparent',
                          backgroundColor: 'transparent'
                        }}
                        animate={isActive && isReadingTranslation && isPlaying ? {
                          opacity: 1,
                          scale: [1, 1.015, 1],
                          borderColor: isSepia 
                            ? 'rgba(180,83,9,0.22)' 
                            : isEmerald 
                              ? 'rgba(202,174,122,0.4)' 
                              : 'rgba(99,102,241,0.4)',
                          backgroundColor: isSepia 
                            ? 'rgba(180,83,9,0.03)' 
                            : isEmerald 
                              ? 'rgba(20,40,36,0.25)' 
                              : isOled 
                                ? 'rgba(255,255,255,0.05)' 
                                : 'rgba(99,102,241,0.05)',
                          boxShadow: isSepia 
                            ? [
                                '0 0 4px rgba(180, 83, 9, 0.05)',
                                '0 0 15px rgba(180, 83, 9, 0.22)',
                                '0 0 4px rgba(180, 83, 9, 0.05)'
                              ]
                            : isEmerald
                              ? [
                                  '0 0 4px rgba(202, 174, 122, 0.05)',
                                  '0 0 18px rgba(202, 174, 122, 0.3)',
                                  '0 0 4px rgba(202, 174, 122, 0.05)'
                                ]
                              : isOled
                                ? [
                                    '0 0 4px rgba(255, 255, 255, 0.02)',
                                    '0 0 15px rgba(255, 255, 255, 0.12)',
                                    '0 0 4px rgba(255, 255, 255, 0.02)'
                                  ]
                                : [
                                    '0 0 4px rgba(99, 102, 241, 0.05)',
                                    '0 0 18px rgba(99, 102, 241, 0.3)',
                                    '0 0 4px rgba(99, 102, 241, 0.05)'
                                  ]
                        } : {
                          opacity: 1,
                          scale: 1,
                          borderColor: 'transparent',
                          backgroundColor: 'transparent',
                          boxShadow: 'none'
                        }}
                        transition={isActive && isReadingTranslation && isPlaying ? {
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "easeInOut"
                        } : { duration: 0.3 }}
                      >
                        {ayah.translation}
                      </motion.div>

                      {/* Button Bar under Translation */}
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 pointer-events-auto">
                        {/* Listen to translation button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const isThisPlaying = isActive && isReadingTranslation && isPlaying;
                            if (isThisPlaying) {
                              if (onPauseTranslation) onPauseTranslation();
                            } else {
                              onReadTranslation(index);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md rounded-full border transition-all duration-300 transform cursor-pointer hover:scale-105 active:scale-95 pointer-events-auto ${
                            isActive && isReadingTranslation && isPlaying
                              ? (isSepia 
                                  ? 'bg-amber-800 text-[#fcf8f2] border-amber-800 shadow-[0_4px_12px_rgba(146,64,14,0.2)]' 
                                  : isOled
                                    ? 'bg-white text-black border-white shadow-none'
                                    : isEmerald
                                      ? 'bg-[#caae7a] border-[#caae7a] text-[#0a1210] shadow-[0_4px_12px_rgba(11,20,18,0.3)]'
                                      : 'bg-indigo-600 border-indigo-500 text-indigo-100 shadow-[0_4px_12px_rgba(99,102,241,0.25)]')
                              : (isSepia
                                  ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/12 text-amber-955/65 hover:text-amber-955'
                                  : isOled
                                    ? 'bg-white/5 hover:bg-white/10 border-white/8 text-white/50 hover:text-white'
                                    : isEmerald
                                      ? 'bg-emerald-900/15 hover:bg-emerald-900/25 border-[#2d5048]/30 text-[#caae7a] hover:text-[#caae7a]'
                                      : 'bg-white/5 hover:bg-white/10 border-white/8 text-white/55 hover:text-white hover:border-white/20')
                          }`}
                          title={isActive && isReadingTranslation && isPlaying ? "Pause recitation" : "Listen to translation"}
                        >
                          {isActive && isReadingTranslation && isPlaying ? (
                            <>
                              <div className="flex items-center justify-center space-x-0.5 w-3 h-3">
                                <span className={`w-0.5 h-2.5 ${isSepia ? 'bg-[#fcf8f2]' : isEmerald ? 'bg-[#0a1210]' : 'bg-white'} rounded-full animate-bounce`} style={{ animationDelay: '0s' }}></span>
                                <span className={`w-0.5 h-2.5 ${isSepia ? 'bg-[#fcf8f2]' : isEmerald ? 'bg-[#0a1210]' : 'bg-white'} rounded-full animate-bounce`} style={{ animationDelay: '0.15s' }}></span>
                                <span className={`w-0.5 h-2.5 ${isSepia ? 'bg-[#fcf8f2]' : isEmerald ? 'bg-[#0a1210]' : 'bg-white'} rounded-full animate-bounce`} style={{ animationDelay: '0.3s' }}></span>
                              </div>
                              <span>Playing</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={11} />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {(showTafsir || layoutMode === 'context') && ayah.tafsir && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-6 rounded-2xl text-left transition-all duration-500 border w-full max-w-3xl ${
                        isSepia
                          ? 'bg-amber-900/5 border-amber-900/10 text-[#4e3629]'
                          : isOled
                            ? 'bg-white/5 border-white/10 text-stone-350'
                            : isEmerald
                              ? 'bg-[#182824]/40 border-[#2d5048]/30 text-[#ebf3f1]/90'
                              : 'bg-white/5 border-indigo-500/10 text-white/90'
                      }`}
                    >
                      <div className={`text-[10px] uppercase font-bold tracking-widest mb-2 ${
                        isSepia ? 'text-amber-800' : isOled ? 'text-white' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'
                      }`}>Exegesis (Tafsir)</div>
                      <div 
                        className="text-sm md:text-base leading-relaxed font-sans"
                        style={{ fontSize: `calc(0.95rem * ${fontSizeMultiplier})` }}
                        dangerouslySetInnerHTML={{ __html: ayah.tafsir }} 
                      />
                    </motion.div>
                  )}


                </div>

                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className={`absolute left-0 top-12 bottom-12 w-1.5 rounded-r-full`}
                    style={{
                      backgroundColor: isSepia ? '#b45309' : isOled ? '#ffffff' : isEmerald ? '#caae7a' : '#818cf8',
                      boxShadow: isSepia 
                        ? '0 0 15px rgba(180, 83, 9, 0.5)' 
                        : isOled 
                          ? '0 0 15px rgba(255, 255, 255, 0.5)' 
                          : isEmerald
                            ? '0 0 15px rgba(202, 174, 122, 0.5)'
                            : '0 0 15px #818cf8'
                    }}
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>
            </motion.div>
          );
        })}
        </div>
      )}

    </div>
  );
};
