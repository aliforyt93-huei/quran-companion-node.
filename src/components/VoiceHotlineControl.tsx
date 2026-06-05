import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, PhoneOff, Mic, MicOff, Languages, Loader2, Sparkles, 
  HelpCircle, BookOpen, Volume2, ChevronUp, ChevronDown, Radio, AlertCircle
} from 'lucide-react';
import { useGeminiLive } from './useGeminiLive';
import { Surah, Ayah } from '../types';
import { PRELOADED_DOCUMENTS } from '../ragEngine';

interface VoiceHotlineControlProps {
  currentSurah: Surah | null;
  currentAyahIndex: number;
  theme: string;
  activeLanguage?: string;
  onStartCall?: () => void;
}

const HOTLINE_LANGUAGES = [
  { id: 'english', label: 'English', native: 'English' },
  { id: 'urdu', label: 'Urdu', native: 'اردو' }
];

const KEYWORD_MAP = [
  { keywords: ['niyyah', 'intention', 'intentions', 'purify intention'], docId: 'pre-niyyah', label: 'Niyyah (Intention)' },
  { keywords: ['ikhlas', 'sincerity', 'pure faith'], docId: 'pre-ikhlas', label: 'Ikhlas (Purity of Faith)' },
  { keywords: ['taweed', 'tawheed', 'monotheism', 'oneness'], docId: 'pre-ikhlas', label: 'Tawheed (Monotheism)' },
  { keywords: ['ilm', 'knowledge', 'seeking knowledge', 'scholar', 'scholars'], docId: 'pre-ilm', label: 'Al-Ilm (Sacred Knowledge)' },
  { keywords: ['sabr', 'patience', 'patient', 'steadfast'], docId: 'pre-sabr-salah', label: 'Sabr (Patience)' },
  { keywords: ['salah', 'prayer', 'prayers', 'establish prayer'], docId: 'pre-sabr-salah', label: 'Salah (Prayer)' },
  { keywords: ['character', 'khuluq', 'manners', 'ethics', 'moral excellence'], docId: 'pre-khuluq', label: 'Husn al-Khuluq (Character)' },
  { keywords: ['wahy', 'revelation', 'revealed', 'jibreel', 'gabriel'], docId: 'pre-wahy', label: 'Wahy (Divine Revelation)' },
  { keywords: ['parents', 'walidayn', 'mother', 'father', 'birr al-walidayn'], docId: 'pre-parents', label: 'Birr al-Walidayn (Parents)' },
];

export function VoiceHotlineControl({
  currentSurah,
  currentAyahIndex,
  theme,
  activeLanguage = 'English',
  onStartCall
}: VoiceHotlineControlProps) {
  const currentAyahObj = currentSurah?.ayahs?.[currentAyahIndex] || null;
  
  const liveSession = useGeminiLive();
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const isUrdu = activeLanguage?.toLowerCase().includes('urdu');
    return isUrdu ? 'Urdu' : 'English';
  });
  const [isMinimized, setIsMinimized] = useState(true);
  const activeTab = 'recitation';
  
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [autoOpenedTerms, setAutoOpenedTerms] = useState<string[]>([]);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the live transcripts
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveSession.userTranscript, liveSession.aiTranscript, liveSession.liveStatus]);

  // Restart session if language is switched while active
  useEffect(() => {
    if (liveSession.isConnected) {
      handleDial(true);
    }
  }, [selectedLanguage]);

  // Clean stop when unmounting
  useEffect(() => {
    return () => {
      liveSession.stopSession();
    };
  }, []);

  // Stop background recitation when voice call is active/connecting
  useEffect(() => {
    if ((liveSession.isConnected || liveSession.isConnecting) && onStartCall) {
      onStartCall();
    }
  }, [liveSession.isConnected, liveSession.isConnecting, onStartCall]);

  const renderHighlightedText = (text: string, onSelectWord: (docId: string) => void) => {
    if (!text) return null;
    
    // Sort by length descending to match longer phrases first
    const allKeywords = KEYWORD_MAP.flatMap(item => item.keywords).sort((a, b) => b.length - a.length);
    const escapedKeywords = allKeywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');
    
    const parts = text.split(pattern);
    
    return parts.map((part, index) => {
      const isMatch = allKeywords.some(k => k.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        const mapItem = KEYWORD_MAP.find(item => 
          item.keywords.some(k => k.toLowerCase() === part.toLowerCase())
        );
        if (mapItem) {
          return (
            <button
              key={index}
              onClick={() => onSelectWord(mapItem.docId)}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded font-semibold text-[11px] cursor-pointer transition-all duration-200 border ${
                theme === 'sepia'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-900/30'
                  : theme === 'emerald'
                    ? 'bg-emerald-950/40 hover:bg-[#caae7a]/20 text-[#caae7a] border-[#caae7a]/30'
                    : 'bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 border-indigo-500/30'
              }`}
              title={`View verified classical context for ${mapItem.label}`}
            >
              <BookOpen size={9} className="opacity-75" />
              <span>{part}</span>
            </button>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Automatically open side-panel definition if a keyword is discovered in Al-Mualim's explanation
  useEffect(() => {
    if (liveSession.aiTranscript) {
      const textLower = liveSession.aiTranscript.toLowerCase();
      for (const item of KEYWORD_MAP) {
        if (!autoOpenedTerms.includes(item.docId)) {
          const found = item.keywords.some(k => {
            const regex = new RegExp(`\\b${k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
            return regex.test(textLower);
          });
          
          if (found) {
            setActiveDocId(item.docId);
            setIsSidePanelOpen(true);
            setAutoOpenedTerms(prev => [...prev, item.docId]);
            break; // Open one term at a time
          }
        }
      }
    }
  }, [liveSession.aiTranscript, autoOpenedTerms]);

  // Reset auto-opened terms on disconnect or restart
  useEffect(() => {
    if (!liveSession.isConnected) {
      setAutoOpenedTerms([]);
      setActiveDocId(null);
      setIsSidePanelOpen(false);
    }
  }, [liveSession.isConnected]);

  const handleDial = (forceRestart = false, overrideTab?: 'recitation' | 'qa') => {
    const targetMode = overrideTab || activeTab;
    if (liveSession.isConnected && !forceRestart) {
      liveSession.stopSession();
    } else {
      const startCtx = {
        language: selectedLanguage,
        mode: targetMode,
        ...(currentSurah && currentAyahObj ? {
          surahName: currentSurah.englishName,
          ayahNumber: currentAyahObj.numberInSurah,
          arabicText: currentAyahObj.text,
          translation: currentAyahObj.translation
        } : {})
      };
      
      liveSession.startSession(startCtx);
    }
  };



  // Theme variable colors
  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';

  const panelBg = isSepia 
    ? 'bg-[#fcf8f2]/95 border-amber-900/20 shadow-amber-900/10' 
    : isEmerald 
      ? 'bg-[#0f1d19]/95 border-[#2d5048]/40 shadow-emerald-950/40' 
      : 'bg-slate-900/95 border-indigo-500/20 shadow-[#1e1b4b]/50';

  const textPrimary = isSepia 
    ? 'text-amber-950' 
    : isEmerald 
      ? 'text-[#ebf3f1]' 
      : 'text-white';

  const textSecondary = isSepia 
    ? 'text-amber-800' 
    : isEmerald 
      ? 'text-[#9cbcae]' 
      : 'text-slate-400';

  const textMuted = isSepia 
    ? 'text-amber-700/60' 
    : isEmerald 
      ? 'text-[#9cbcae]/50' 
      : 'text-slate-500';

  const tagActive = isSepia 
    ? 'bg-amber-800/10 text-amber-900 border-amber-900/20' 
    : isEmerald 
      ? 'bg-[#caae7a]/10 text-[#caae7a] border-[#caae7a]/20' 
      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';

  const accentColor = isSepia 
    ? 'bg-amber-900 text-[#faf6ee]' 
    : isEmerald 
      ? 'bg-[#caae7a] text-[#07130e]' 
      : 'bg-indigo-600 text-white';

  return (
    <div className="fixed bottom-36 right-6 z-50">
      <AnimatePresence>
        {isMinimized ? (
          /* Minimized Pulsing Audio Bubble */
          <motion.button
            id="voice-hotline-bubble"
            key="minimized-bubble"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={() => {
              setIsMinimized(false);
              if (!liveSession.isConnected && !liveSession.isConnecting) {
                handleDial(false);
              }
            }}
            className={`p-4 rounded-full shadow-2xl flex items-center justify-center border group relative cursor-pointer ${
              liveSession.isConnected
                ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                : isSepia 
                  ? 'bg-[#f6f0e2] border-amber-800/20 text-amber-900 hover:bg-amber-100'
                  : isEmerald 
                    ? 'bg-[#182c27] border-[#2d5048]/30 text-[#caae7a] hover:bg-[#1f3a34]'
                    : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
            }`}
          >
            {liveSession.isConnected ? (
              <span className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-75 animate-ping" />
            ) : null}
            <Radio size={22} className={liveSession.isConnecting ? 'animate-spin' : 'group-hover:scale-105 transition-transform'} />
            
            {/* Hover Tooltip tooltip style */}
            <span className="absolute right-14 whitespace-nowrap bg-black/80 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl">
              {liveSession.isConnected ? "Calls Active: Hotline Connected" : "AI Scholar Live Voice Hotline"}
            </span>
          </motion.button>
        ) : (
          /* Expanded Holographic/Glassmorphic Call Board Console Wrapper */
          <div className="flex flex-col md:flex-row-reverse items-end gap-4 max-w-[95vw] md:max-w-none">
            <motion.div
              id="voice-hotline-console"
              key="expanded-console"
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              className={`w-[360px] md:w-[390px] rounded-3xl border shadow-3xl overflow-hidden backdrop-blur-xl transition-all ${panelBg}`}
            >
            {/* Holographic Header Gradient Strip */}
            <div className={`h-1 w-full ${
              liveSession.isConnected 
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500' 
                : liveSession.isConnecting 
                  ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500 animate-pulse' 
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500'
            }`} />

            {/* Header section */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className={`flex h-2.5 w-2.5 rounded-full ${
                    liveSession.isConnected 
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                      : liveSession.isConnecting 
                        ? 'bg-amber-400 animate-ping' 
                        : 'bg-slate-500'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-xs font-bold tracking-widest uppercase font-mono ${textPrimary}`}>
                    Al-Mualim Voice Hotline
                  </h3>
                  <p className="text-[10px] text-emerald-400/80 font-semibold font-sans">
                    {liveSession.liveStatus === 'speaking' && "📞 Al-Mualim is Explaining..."}
                    {liveSession.liveStatus === 'listening' && "🎙️ scholar is Listening..."}
                    {liveSession.liveStatus === 'connecting' && "⏳ Initializing Secure Tunnel..."}
                    {liveSession.liveStatus === 'disconnected' && "○ Scholar Line Offline"}
                    {liveSession.liveStatus === 'error' && "⚠️ Secure Link Failure"}
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <button
                onClick={() => setIsMinimized(true)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isSepia 
                    ? 'border-amber-900/10 hover:bg-amber-950/5 text-amber-900' 
                    : 'border-white/10 hover:bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Quick Context Tab Header Mode Selectors */}
            <div className="px-5 py-2.5 border-b border-white/5 bg-black/5 flex items-center justify-between gap-2 text-[11px] font-sans">
              <span className={`${textSecondary} truncate`}>
                {currentSurah && currentAyahObj ? (
                  <span>Current: <strong className="font-bold">{currentSurah.englishName} ({currentAyahObj.numberInSurah})</strong></span>
                ) : (
                  <span>General Sessions Mode</span>
                )}
              </span>
            </div>

            {/* Live Visual Board (Active Audio/Speech & Error State) */}
            <div className="p-5 flex flex-col space-y-4">
              
              {/* Errors container */}
              {liveSession.error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex gap-2.5 items-start text-xs font-sans leading-relaxed">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p>{liveSession.error}</p>
                </div>
              )}

              {/* Holographic Waveform Playout Console */}
              {liveSession.isConnected ? (
                <div className="p-5 bg-black/10 border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden h-28">
                  {/* Subtle dynamic backdrop glowing ring */}
                  <div className={`absolute w-32 h-32 rounded-full blur-2xl transition-all duration-700 opacity-20 ${
                    liveSession.liveStatus === 'speaking' 
                      ? 'bg-purple-500 animate-pulse' 
                      : 'bg-emerald-500'
                  }`} />

                  {/* Waveforms */}
                  <div className="flex items-end gap-1 px-1 h-8">
                    {[...Array(11)].map((_, i) => {
                      const delays = [0.1, 0.4, 0.25, 0.6, 0.15, 0.5, 0.3, 0.7, 0.2, 0.45, 0.35];
                      const heights = [
                        'h-3 hover:h-6', 'h-7 hover:h-8', 'h-4 hover:h-5', 'h-8 hover:h-3',
                        'h-5 hover:h-7', 'h-9 hover:h-6', 'h-6 hover:h-4', 'h-4 hover:h-8',
                        'h-7 hover:h-5', 'h-3 hover:h-7', 'h-5 hover:h-3'
                      ];
                      
                      const isVoiceActive = liveSession.liveStatus === 'speaking' || liveSession.liveStatus === 'listening';
                      
                      return (
                        <span 
                          key={i}
                          style={{ animationDelay: `${delays[i]}s` }}
                          className={`w-1 rounded-full bg-indigo-400 transition-all ${
                            isVoiceActive ? 'animate-pulse' : 'opacity-40'
                          } ${heights[i]} ${
                            liveSession.liveStatus === 'speaking'
                              ? isSepia ? 'bg-amber-900' : isEmerald ? 'bg-[#caae7a]' : 'bg-purple-400'
                              : liveSession.liveStatus === 'listening' 
                                ? 'bg-emerald-400' 
                                : 'bg-slate-400'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold animate-pulse text-center">
                    {liveSession.liveStatus === 'speaking' && "Al-Mualim is speaking..."}
                    {liveSession.liveStatus === 'listening' && "Speak now — Scholar listening..."}
                    {liveSession.liveStatus === 'connecting' && "Reconnecting safe channel..."}
                  </p>
                </div>
              ) : (
                /* Offline instructions helper card */
                <div className="p-4 bg-black/5 border border-white/5 rounded-2xl space-y-3.5">
                  <div className="flex gap-2.5 items-start">
                    <Sparkles size={14} className="text-[#caae7a] mt-0.5 shrink-0" />
                    <div className="text-xs font-sans text-left space-y-1">
                      {activeTab === 'recitation' ? (
                        <>
                          <strong className={`font-bold block ${textPrimary}`}>Qari Recitation Auditor</strong>
                          <span className={textSecondary}>
                            Call Al-Mualim above to read/recite the Quran verbally. Our expert Qari will listen in real-time to locate mistakes in your pronunciation (Makhraj or Tajweed) and correct them gently.
                          </span>
                        </>
                      ) : (
                        <>
                          <strong className={`font-bold block ${textPrimary}`}>Scholarly Theological Q&A</strong>
                          <span className={textSecondary}>
                            Call Al-Mualim above to speak comfortably with our Islamic scholar to clarify rulings, theological concepts, and explore traditional Tafseer morals.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Streaming Dialogue Logs */}
              {(liveSession.isConnected && (liveSession.userTranscript || liveSession.aiTranscript)) ? (
                <div className="p-3.5 bg-black/15 font-sans text-xs border border-white/5 rounded-2xl max-h-[140px] overflow-y-auto scrollbar-thin flex flex-col space-y-3.5 select-none leading-relaxed text-left">
                  {liveSession.userTranscript && (
                    <div className="space-y-1 font-sans">
                      <span className="text-[9px] font-mono tracking-widest uppercase text-emerald-400 block font-bold">You (Saying):</span>
                      <p className={`${textPrimary}/90 italic`}>"{liveSession.userTranscript}"</p>
                    </div>
                  )}

                  {liveSession.aiTranscript && (
                    <div className="space-y-1 pt-1.5 border-t border-white/5 font-sans">
                      <span className="text-[9px] font-mono tracking-widest uppercase text-purple-400 block font-bold">Al-Mualim (Spoken):</span>
                      <div className={`${textPrimary}/95 font-medium leading-relaxed`}>
                        {renderHighlightedText(liveSession.aiTranscript, (docId) => {
                          setActiveDocId(docId);
                          setIsSidePanelOpen(true);
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div ref={transcriptEndRef} />
                </div>
              ) : null}

              {/* Master Control Board: Action Controls Row */}
              <div className="flex items-center justify-between gap-4 pt-2">
                
                {/* Language Select Dropdown */}
                <div className="flex items-center gap-1.5 border border-white/5 bg-black/10 px-2.5 py-1.5 rounded-xl shrink-0">
                  <Languages size={12} className={textSecondary} />
                  <select
                    id="hotline-lang-selector"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    disabled={liveSession.isConnecting}
                    className={`bg-transparent text-[11px] font-bold border-none focus:outline-none cursor-pointer outline-none ${textPrimary}`}
                  >
                    {HOTLINE_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.label} className="bg-slate-900 text-white">
                        {lang.native}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dial State Center Controls */}
                <div className="flex items-center gap-3">
                  {/* Mute Mic Button (available when connected) */}
                  {liveSession.isConnected && (
                    <button
                      type="button"
                      onClick={() => liveSession.setIsMuted(!liveSession.isMuted)}
                      className={`p-3 rounded-full border cursor-pointer transition-all ${
                        liveSession.isMuted 
                          ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30' 
                          : 'bg-black/10 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                      title={liveSession.isMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {liveSession.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}

                  {/* Master Connect Trigger */}
                  <button
                    type="button"
                    onClick={() => handleDial()}
                    disabled={liveSession.isConnecting}
                    className={`px-4.5 py-2.5 rounded-full font-bold flex items-center gap-2 text-xs border transition-all cursor-pointer shadow-md ${
                      liveSession.isConnected 
                        ? 'bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-red-950/20' 
                        : isSepia 
                          ? 'bg-amber-800 border-amber-900 text-[#faf6ee] hover:bg-amber-900' 
                          : isEmerald 
                            ? 'bg-[#caae7a] border-[#bda272] text-[#07130e] hover:brightness-105' 
                            : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {liveSession.isConnecting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Bridging...</span>
                      </>
                    ) : liveSession.isConnected ? (
                      <>
                        <PhoneOff size={13} />
                        <span>Disconnect</span>
                      </>
                    ) : (
                      <>
                        <Phone size={13} />
                        <span>Call Scholar</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Scholarly Knowledge Side Panel definition drawer */}
          <AnimatePresence>
            {isSidePanelOpen && activeDocId && (() => {
              const activeDoc = PRELOADED_DOCUMENTS.find(doc => doc.id === activeDocId);
              if (!activeDoc) return null;
              return (
                <motion.div
                  id="voice-hotline-sidemenu"
                  key="knowledge-side-panel"
                  initial={{ scale: 0.95, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.95, opacity: 0, x: 20 }}
                  className={`w-[320px] md:w-[350px] max-h-[480px] rounded-3xl border shadow-3xl overflow-hidden backdrop-blur-xl transition-all flex flex-col ${panelBg}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className={isSepia ? 'text-amber-800' : isEmerald ? 'text-[#caae7a]' : 'text-indigo-400'} />
                      <h4 className={`text-xs font-bold uppercase tracking-widest font-mono ${textPrimary}`}>
                        Knowledge RAG
                      </h4>
                    </div>
                    <button
                      onClick={() => setIsSidePanelOpen(false)}
                      className={`p-1.5 rounded-xl transition-all hover:bg-white/5 cursor-pointer text-[10px] font-bold ${textSecondary}`}
                    >
                      ✕ CLOSE
                    </button>
                  </div>

                  {/* Content view */}
                  <div className="p-5 flex-1 overflow-y-auto scrollbar-thin text-left space-y-3.5 select-none scrollbar-track-transparent">
                    <div className="space-y-1 font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest ${
                        theme === 'sepia' 
                          ? 'bg-amber-800/10 text-amber-900 border border-amber-950/20' 
                          : theme === 'emerald' 
                            ? 'bg-[#caae7a]/10 text-[#caae7a] border border-[#caae7a]/20' 
                            : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {activeDoc.category} // {activeDoc.source}
                      </span>
                      <h3 className={`text-xs font-bold leading-snug ${textPrimary}`}>
                        {activeDoc.title}
                      </h3>
                    </div>

                    <div className={`p-4 rounded-2xl bg-black/20 border border-white/5 text-[11px] leading-relaxed font-sans ${textPrimary}/90 space-y-3 select-text max-h-[280px] overflow-y-auto scrollbar-thin`}>
                      {activeDoc.content.split('\n\n').map((para, pIdx) => (
                        <p key={pIdx}>
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Sparkles verified footnote */}
                    <div className="text-[9px] flex items-center gap-1.5 p-2 bg-black/10 rounded-xl border border-white/5 font-sans">
                      <Sparkles size={11} className="text-[#caae7a] shrink-0" />
                      <span className={textSecondary}>
                        Traditionally verified classical Sunni consensus.
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
        )}
      </AnimatePresence>
    </div>
  );
}
