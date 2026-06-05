import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle } from 'lucide-react';

interface OnboardingTourProps {
  theme: string;
  onClose: () => void;
}

interface TourStep {
  title: string;
  description: string;
  selector: string | null;
  placement: 'top' | 'bottom' | 'top-left' | 'center';
}

export function OnboardingTour({ theme, onClose }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const steps: TourStep[] = [
    {
      title: "Welcome to Quran Tilawat",
      description: "Welcome to an immersive, spiritually focused environment. Let's take a quick look at the main controls and unique functionalities designed to elevate your daily reading and listening habit.",
      selector: null,
      placement: "center"
    },
    {
      title: "Browse & Select Surahs",
      description: "Browse all 114 Surahs from the Noble Quran. Search by name or number, view completion stats, and select the specific Surah and Ayah you want to load.",
      selector: "#tour-surah-selector",
      placement: "bottom"
    },
    {
      title: "Toggle Translation Layout",
      description: "Quickly toggle translation text on or off. Keep it hidden to focus on the original Arabic script, or enable it to read meanings inline.",
      selector: "#tour-translation-toggle",
      placement: "bottom"
    },
    {
      title: "Select Translation Language",
      description: "Customize your translation language. We support English, Urdu, Bengali, French, Hindi, Turkish, and more.",
      selector: "#tour-language-selector",
      placement: "bottom"
    },
    {
      title: "Personalize Atmosphere",
      description: "Configure Display Theme Atmospheres (Emerald, Sepia, Cosmic, OLED), adjust text sizing, modify auto-scroll, toggles, and manage offline data caching.",
      selector: "#tour-atmosphere-settings",
      placement: "bottom"
    },
    {
      title: "Daily Goal & Habit Tracker",
      description: "Build a consistent relationship with the Quran. Set a daily target of verses to study, track today's completion ring, and monitor your daily streak.",
      selector: "#tour-daily-habit",
      placement: "bottom"
    },
    {
      title: "Bookmarks Ledger",
      description: "Access all your bookmarked verses instantly. While reading, you can tap the bookmark icon on any verse to save it here for quick lookup.",
      selector: "#tour-bookmarks",
      placement: "bottom"
    },
    {
      title: "Audio Player & Reciter controls",
      description: "Listen to world-class reciters. Change reciters, control audio speeds, play/pause, skip verses, and enable read-translation-aloud (TTS) options.",
      selector: "#tour-audio-player",
      placement: "top"
    },
    {
      title: "Al-Mualim Scholar Voice Hotline",
      description: "Tap this floating microphone bubble to call Al-Mualim, your AI Islamic Scholar. Speak naturally to recite verses for Makhraj/Tajweed corrections, or ask theological and Tafseer questions.",
      selector: "#voice-hotline-bubble",
      placement: "top-left"
    }
  ];

  const currentStep = steps[stepIndex];

  const updateCoords = useCallback(() => {
    if (!currentStep.selector) {
      setCoords(null);
      return;
    }
    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        
        // Only scroll if element is far offscreen
        const isOffscreen = rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth;
        if (isOffscreen) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }
    setCoords(null);
  }, [currentStep.selector]);

  // Track resizing and scrolling to adjust coordinates
  useEffect(() => {
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, { passive: true });
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [updateCoords]);

  // Repeated checks to ensure layout changes are fully processed
  useEffect(() => {
    updateCoords();
    const t1 = setTimeout(updateCoords, 100);
    const t2 = setTimeout(updateCoords, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stepIndex, updateCoords]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('quran_onboarding_completed', 'true');
    } catch (e) {
      console.warn("LocalStorage setItem failed:", e);
    }
    onClose();
  };

  // Color theme mapping
  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';
  const isOled = theme === 'oled';

  const overlayBg = "rgba(0, 0, 0, 0.75)";

  const cardClass = isSepia
    ? "bg-[#faf6ee] border border-amber-900/15 text-amber-955 shadow-2xl p-5 rounded-2xl md:rounded-3xl"
    : isOled
      ? "bg-black border border-white/20 text-white shadow-[0_10px_40px_rgba(255,255,255,0.05)] p-5 rounded-2xl md:rounded-3xl"
      : isEmerald
        ? "bg-[#13201d]/95 backdrop-blur-2xl border border-[#2d5048]/40 text-[#ebf3f1] shadow-[0_20px_50px_rgba(7,19,14,0.6)] p-5 rounded-2xl md:rounded-3xl"
        : "bg-slate-950/90 backdrop-blur-2xl border border-white/10 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] p-5 rounded-2xl md:rounded-3xl";

  const buttonPrimary = isSepia
    ? "bg-amber-800 hover:bg-amber-900 text-amber-50 shadow-sm"
    : isEmerald
      ? "bg-[#caae7a] hover:bg-[#bda272] text-[#07130e] font-bold shadow-md shadow-emerald-950/20"
      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-650/25";

  const buttonSecondary = isSepia
    ? "bg-amber-900/5 hover:bg-amber-900/10 border border-amber-900/10 text-amber-850"
    : isEmerald
      ? "bg-[#2d5048]/20 hover:bg-[#2d5048]/30 border border-[#2d5048]/30 text-[#caae7a]"
      : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/80";

  const getTooltipStyle = () => {
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? window.innerWidth - 32 : 340;

    if (!coords) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${tooltipWidth}px`,
        maxWidth: '420px',
        zIndex: 100,
      } as React.CSSProperties;
    }

    if (isMobile) {
      // On mobile, position card at top of screen if the element is in the bottom half,
      // and at the bottom of screen if the element is in the top half.
      const elementCenterY = coords.top + coords.height / 2;
      const isElementInBottomHalf = elementCenterY > window.innerHeight / 2;
      
      if (isElementInBottomHalf) {
        return {
          position: 'fixed',
          top: '24px',
          left: '16px',
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      } else {
        return {
          position: 'fixed',
          bottom: '24px',
          left: '16px',
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      }
    }

    const gap = 16;
    let top = 0;
    let left = coords.left + coords.width / 2 - tooltipWidth / 2;

    // Constrain inside viewport horizontally
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    if (currentStep.placement === 'top') {
      const estimatedTop = coords.top - gap - 180;
      if (estimatedTop < 10) {
        // Fallback below
        top = coords.top + coords.height + gap;
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      } else {
        top = coords.top - gap;
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateY(-100%)',
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      }
    } else if (currentStep.placement === 'top-left') {
      top = coords.top - gap;
      const rightLeft = coords.left - tooltipWidth + coords.width;
      const estimatedTop = coords.top - gap - 180;
      
      if (estimatedTop < 10) {
        // Fallback below
        top = coords.top + coords.height + gap;
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${Math.max(16, rightLeft)}px`,
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      } else {
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${Math.max(16, rightLeft)}px`,
          transform: 'translateY(-100%)',
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      }
    } else {
      // default: bottom placement with top fallback
      const estimatedBottom = coords.top + coords.height + gap + 180;
      if (estimatedBottom > window.innerHeight - 10) {
        top = coords.top - gap;
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateY(-100%)',
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      } else {
        top = coords.top + coords.height + gap;
        return {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${tooltipWidth}px`,
          zIndex: 100,
        } as React.CSSProperties;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden pointer-events-none select-none">
      {/* Background Mask Overlay */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[61]">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {coords && (
              <rect
                x={coords.left - 8}
                y={coords.top - 8}
                width={coords.width + 16}
                height={coords.height + 16}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={overlayBg}
          mask="url(#tour-mask)"
          className="pointer-events-auto cursor-default"
        />
      </svg>

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, scale: 0.95, y: coords ? 5 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={getTooltipStyle()}
          className={`${cardClass} pointer-events-auto flex flex-col gap-4 font-sans`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={isSepia ? "text-amber-800" : isEmerald ? "text-[#caae7a]" : "text-indigo-400"} />
              <span className={`text-[10px] font-bold tracking-widest uppercase ${
                isSepia ? "text-amber-800/80" : isEmerald ? "text-[#caae7a]/80" : "text-indigo-400/80"
              }`}>
                Step {stepIndex + 1} of {steps.length}
              </span>
            </div>
            
            <button
              onClick={handleComplete}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isSepia ? "hover:bg-amber-900/10 text-amber-900/60" : "hover:bg-white/10 text-white/50"
              }`}
              title="Close Tour"
            >
              <X size={15} />
            </button>
          </div>

          {/* Text Content */}
          <div className="space-y-1.5 text-left">
            <h3 className="text-sm font-extrabold uppercase tracking-wide leading-snug">
              {currentStep.title}
            </h3>
            <p className={`text-xs leading-relaxed font-sans font-medium ${
              isSepia ? "text-amber-955/80" : "text-white/70"
            }`}>
              {currentStep.description}
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-current/5 mt-1">
            <button
              onClick={handleComplete}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg hover:underline transition-all cursor-pointer ${
                isSepia ? "text-amber-900/60 hover:text-amber-900" : "text-white/60 hover:text-white"
              }`}
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={handleBack}
                  className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${buttonSecondary}`}
                >
                  <ChevronLeft size={12} />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${buttonPrimary}`}
              >
                <span>{stepIndex === steps.length - 1 ? "Finish" : "Next"}</span>
                {stepIndex < steps.length - 1 && <ChevronRight size={12} />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
