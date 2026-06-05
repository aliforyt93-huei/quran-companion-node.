import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ListMusic, User, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Reciter, Surah } from '../types';

interface AudioPlayerProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  reciter: Reciter;
  surah: Surah | null;
  onOpenSurahList: () => void;
  onOpenReciterList: () => void;
  onAyahEnd: () => void;
  playbackSpeed: number;
  onChangePlaybackSpeed: (speed: number) => void;
  showTranslation: boolean;
  isReadTranslationAloudEnabled: boolean;
  onToggleReadTranslationAloud: () => void;
  theme: string;
  onAudioError?: (error: any) => void;
  id?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  id,
  audioUrl,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  reciter,
  surah,
  onOpenSurahList,
  onOpenReciterList,
  onAyahEnd,
  playbackSpeed,
  onChangePlaybackSpeed,
  theme,
  onAudioError,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      try {
        audio.load();
      } catch (err) {
        console.warn("Failed to invoke audio.load() explicitly:", err);
      }
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isSubscribed = true;
    let playPromise: Promise<void> | null = null;

    const controlPlayback = async () => {
      if (isPlaying && audioUrl) {
        try {
          playPromise = audio.play();
          await playPromise;
        } catch (error: any) {
          if (
            error.name === 'AbortError' || 
            error.name === 'NotSupportedError' ||
            (error.message && (
              error.message.includes('interrupted') || 
              error.message.includes('not supported') ||
              error.message.includes('supported')
            ))
          ) {
            console.warn("Playback transition ignored or not fully supported yet by browser:", error.message || error.name);
            return;
          }
          console.warn("Playback failed with warning:", error);
        }
      } else {
        if (playPromise) {
          try {
            await playPromise;
          } catch {
            // Ignore any aborted plays
          }
        }
        if (isSubscribed) {
          try {
            audio.pause();
          } catch (err) {
            // Ignore pause errors
          }
        }
      }
    };

    const timer = setTimeout(() => {
      if (isSubscribed) {
        controlPlayback();
      }
    }, 50);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const isSepia = theme === 'sepia';
  const isOled = theme === 'oled';
  const isEmerald = theme === 'emerald';

  // Responsive, highly polished, premium container styling
  const containerClass = isSepia
    ? "max-w-5xl mx-auto bg-[#faf6ee]/95 border border-amber-900/15 backdrop-blur-2xl p-4 md:py-4 md:px-6 shadow-[0_20px_45px_rgba(139,92,26,0.12)] relative overflow-hidden rounded-2xl md:rounded-[1.75rem] text-amber-955"
    : isOled
      ? "max-w-5xl mx-auto bg-neutral-950/95 border border-neutral-900 p-4 md:py-4 md:px-6 relative overflow-hidden rounded-2xl md:rounded-[1.75rem] text-white"
      : isEmerald
        ? "max-w-5xl mx-auto bg-[#13201d]/95 border border-[#2d5048]/30 backdrop-blur-2xl p-4 md:py-4 md:px-6 shadow-[0_20px_45px_rgba(11,20,18,0.25)] relative overflow-hidden rounded-2xl md:rounded-[1.75rem] text-[#ebf3f1]"
        : "max-w-5xl mx-auto bg-slate-950/75 border border-white/10 backdrop-blur-3xl p-4 md:py-4 md:px-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden rounded-2xl md:rounded-[1.75rem] text-white";

  const progressBgClass = isSepia ? "bg-amber-900/10" : isEmerald ? "bg-[#ebf3f1]/10" : "bg-white/5";
  const progressFillStyle = isSepia
    ? { width: `${progress}%`, backgroundColor: '#92400e' }
    : isEmerald
      ? { width: `${progress}%`, backgroundColor: '#caae7a' }
      : { width: `${progress}%` };

  const buttonHoverClass = isSepia
    ? "p-2.5 hover:bg-amber-900/5 active:scale-95 text-amber-955/60 hover:text-amber-955 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-amber-900/5 md:p-3"
    : isEmerald
      ? "p-2.5 hover:bg-emerald-950/10 active:scale-95 text-[#ebf3f1]/60 hover:text-[#ebf3f1] rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-[#2d5048]/20 md:p-3"
      : "p-2.5 hover:bg-white/5 active:scale-95 text-white/50 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-white/5 md:p-3";

  const centerButtonClass = isSepia
    ? "w-12 h-12 flex items-center justify-center bg-amber-800 text-amber-50 hover:bg-amber-900 hover:scale-105 active:scale-95 transition-all rounded-full shadow-md shadow-amber-800/15 shrink-0 cursor-pointer"
    : isEmerald
      ? "w-12 h-12 flex items-center justify-center bg-[#caae7a] text-[#0a1210] hover:bg-[#d8c199] hover:scale-105 active:scale-95 transition-all rounded-full shadow-lg shrink-0 cursor-pointer"
      : isOled
        ? "w-12 h-12 flex items-center justify-center bg-white text-black hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all rounded-full shadow-lg shrink-0 cursor-pointer"
        : "w-12 h-12 flex items-center justify-center bg-white text-black hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all rounded-full shadow-[0_4px_16px_rgba(255,255,255,0.2)] shrink-0 cursor-pointer";

  return (
    <div id={id} className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 md:px-6 md:pb-6 select-none font-sans">
      <motion.div 
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.15 }}
        className={containerClass}
      >
        {/* Progress Bar Track */}
        <div className={`absolute top-0 left-0 right-0 h-[4px] cursor-pointer group ${progressBgClass}`}>
          <motion.div 
            className={`h-full relative ${(!isSepia && !isEmerald) ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : ''}`}
            style={progressFillStyle}
          />
        </div>

        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onAyahEnd}
          onError={(e) => {
            console.warn("Audio tag error occurred:", e);
            if (onAudioError) {
              onAudioError(e);
            }
          }}
          onCanPlay={() => {
            if (audioRef.current) {
              audioRef.current.playbackRate = playbackSpeed;
            }
          }}
        />

        {/* Symmetric Responsive Layout */}
        <div className="flex items-center md:grid md:grid-cols-3 justify-between gap-4 font-sans mt-1">
          
          {/* Left Column (Metadata) - Symmetrical & compact */}
          <div className="flex flex-1 items-center gap-3 min-w-0 md:flex-initial">
            <div className={`flex flex-col truncate`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs md:text-sm font-extrabold tracking-tight font-sans transition-colors duration-500 truncate ${
                  isSepia ? 'text-amber-955 font-sans' : isEmerald ? 'text-[#ebf3f1]' : 'text-neutral-50'
                }`}>
                  {surah ? surah.englishName : 'Select Surah'}
                </span>
                {isPlaying && (
                  <div className="flex items-center space-x-0.5 h-3 px-1">
                    <span className={`w-0.5 h-2 rounded-full animate-bounce ${isEmerald ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} style={{ animationDelay: '0s' }} />
                    <span className={`w-0.5 h-3 rounded-full animate-bounce ${isEmerald ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} style={{ animationDelay: '0.15s' }} />
                    <span className={`w-0.5 h-1.5 rounded-full animate-bounce ${isEmerald ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} style={{ animationDelay: '0.3s' }} />
                  </div>
                )}
              </div>
              <span className={`text-[9px] md:text-[10px] font-sans font-medium tracking-wide opacity-50 truncate ${
                isSepia ? 'text-amber-900' : isEmerald ? 'text-[#a2b0ac]' : 'text-neutral-400'
              }`}>
                {reciter.name}
              </span>
            </div>
          </div>

          {/* Center Column (Play Controls) - Perfectly centered on desktop */}
          <div className="flex items-center gap-4 md:gap-7 justify-center shrink-0">
            <button 
              onClick={onPrev}
              className={`p-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                isSepia ? "text-amber-800/60 hover:text-amber-955" : isEmerald ? "text-[#a2b0ac]/60 hover:text-[#ebf3f1]" : "text-white/45 hover:text-white"
              }`}
              title="Previous Ayah"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            
            <button 
              onClick={onPlayPause}
              className={centerButtonClass}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            
            <button 
              onClick={onNext}
              className={`p-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                isSepia ? "text-amber-800/60 hover:text-amber-955" : isEmerald ? "text-[#a2b0ac]/60 hover:text-[#ebf3f1]" : "text-white/45 hover:text-white"
              }`}
              title="Next Ayah"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Right Column (Actions) - Perfectly aligned to the right */}
          <div className="flex items-center gap-1.5 justify-end md:gap-2.5 shrink-0">
            <button 
              onClick={onOpenSurahList}
              className={buttonHoverClass}
              title="Choose Surah"
            >
              <ListMusic size={16} />
            </button>

            <button 
              onClick={onOpenReciterList}
              className={buttonHoverClass}
              title="Choose Reciter"
            >
              <User size={16} />
            </button>

            <button
              onClick={() => {
                const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                const currentIndex = speeds.indexOf(playbackSpeed);
                const nextIndex = (currentIndex + 1) % speeds.length;
                onChangePlaybackSpeed(speeds[nextIndex]);
              }}
              className={`text-[10px] font-bold font-mono px-2 py-1 border rounded-lg transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
                isSepia
                  ? 'bg-amber-900/5 hover:bg-amber-900/10 text-amber-800 border-amber-900/10'
                  : isEmerald
                    ? 'bg-emerald-900/10 hover:bg-emerald-900/20 text-[#caae7a] border-[#2d5048]/30'
                    : 'bg-white/5 hover:bg-white/10 text-indigo-300 border-white/10'
              }`}
              title="Playback Speed"
            >
              {playbackSpeed}x
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
