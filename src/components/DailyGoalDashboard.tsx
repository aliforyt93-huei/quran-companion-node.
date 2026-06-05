import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Flame, Trophy, Plus, Minus, Target, BookOpen, Sparkles, Calendar, ChevronRight, Award, Download } from 'lucide-react';
import { DailyBadges } from './DailyBadges';

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

interface DailyGoalDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  goalData: DailyGoalData;
  onUpdateGoal: (newGoal: number) => void;
  onSelectAyah: (surahNumber: number, ayahNumberInSurah: number) => void;
}

export const DailyGoalDashboard: React.FC<DailyGoalDashboardProps> = ({
  isOpen,
  onClose,
  theme,
  goalData,
  onUpdateGoal,
  onSelectAyah,
}) => {
  const [activeTab, setActiveTab] = useState<'tracker' | 'milestones'>('tracker');

  const getTodayDateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = getTodayDateKey();
  const todayReadList = useMemo(() => {
    return goalData.history[todayKey] || [];
  }, [goalData.history, todayKey]);

  const readCount = todayReadList.length;
  const targetGoal = goalData.dailyGoal;
  const percentage = Math.min(Math.round((readCount / targetGoal) * 100), 100);
  const isGoalCompleted = readCount >= targetGoal;

  const handleExportCSV = () => {
    try {
      const records: {
        date: string;
        timestamp: string;
        time: string;
        surahNumber: number;
        surahEnglishName: string;
        surahArabicName: string;
        ayahNumberInSurah: number;
      }[] = [];

      Object.entries(goalData.history).forEach(([dateString, items]) => {
        if (Array.isArray(items)) {
          items.forEach((item) => {
            let formattedTime = '';
            let formattedISO = '';
            try {
              const d = new Date(item.timestamp);
              formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
              formattedISO = d.toISOString();
            } catch (_) {
              formattedTime = 'N/A';
              formattedISO = 'N/A';
            }
            records.push({
              date: dateString,
              timestamp: formattedISO,
              time: formattedTime,
              surahNumber: item.surahNumber,
              surahEnglishName: item.surahEnglishName,
              surahArabicName: item.surahName,
              ayahNumberInSurah: item.ayahNumberInSurah,
            });
          });
        }
      });

      // Sort chronological
      records.sort((a, b) => {
        const tA = a.timestamp !== 'N/A' ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp !== 'N/A' ? new Date(b.timestamp).getTime() : 0;
        return tA - tB;
      });

      // Generate CSV
      const headers = ['Date', 'ISO Timestamp', 'Local Time', 'Surah Number', 'Surah Name (English)', 'Surah Name (Arabic)', 'Verse In Surah'];
      const escape = (str: string | number) => {
        const text = String(str).replace(/"/g, '""');
        return `"${text}"`;
      };

      const csvRows = [
        headers.join(','),
        ...records.map(r => [
          escape(r.date),
          escape(r.timestamp),
          escape(r.time),
          r.surahNumber,
          escape(r.surahEnglishName),
          escape(r.surahArabicName),
          r.ayahNumberInSurah
        ].join(','))
      ];

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `quranic_habit_reading_history_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV stats:', err);
    }
  };

  // SVG Progress Ring Calculations
  const radius = 64;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Active theme classes matching the main applet
  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';
  const isOled = theme === 'oled';

  const modalBgClass = isSepia
    ? 'bg-[#fcf8f2] border-amber-900/15 text-amber-955'
    : isEmerald
      ? 'bg-[#182824]/95 border-[#2d5048]/30 text-[#ebf3f1]'
      : 'bg-neutral-950/90 border-white/10 text-white';

  const textPrimary = isSepia
    ? 'text-amber-955 font-serif'
    : isEmerald
      ? 'text-[#caae7a] font-serif'
      : 'text-white font-serif';

  const accentText = isSepia
    ? 'text-amber-800'
    : isEmerald
      ? 'text-[#caae7a]'
      : 'text-indigo-400';

  const accentBg = isSepia
    ? 'bg-amber-900/10'
    : isEmerald
      ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30'
      : 'bg-indigo-500/10 text-indigo-200';

  const buttonAccent = isSepia
    ? 'bg-amber-900/10 text-amber-900 border-amber-900/15 hover:bg-amber-900/20'
    : isEmerald
      ? 'bg-emerald-950/40 text-[#caae7a] border-emerald-800/30 hover:bg-[#182824]/60'
      : 'bg-white/10 text-white border-white/10 hover:bg-white/20';

  const ringColor = isSepia
    ? '#b45309' // amber-700
    : isEmerald
      ? '#caae7a' // custom gold
      : '#6366f1'; // indigo-500

  const ringBg = isSepia
    ? '#f1e2ce'
    : isEmerald
      ? '#13201d'
      : 'rgba(255, 255, 255, 0.05)';

  if (!isOpen) return null;

  return (
    <>
      {/* Ambient Blurred Glass Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-[12px] transition-all"
      />

      {/* Centered Premium Floating Sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.9 }}
        transition={{ type: 'spring', damping: 30, stiffness: 250, restDelta: 0.01 }}
        className={`fixed bottom-0 md:bottom-12 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[170] w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] backdrop-blur-3xl rounded-t-[2.2rem] md:rounded-[2.2rem] px-5 py-6 md:px-8 md:py-7 overflow-hidden flex flex-col border-t md:border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9)] ${modalBgClass}`}
      >
        {/* Minimalist Slide Indicator (Touch Cue) */}
        <div className={`w-10 h-1 rounded-full mx-auto mb-4 shrink-0 block md:hidden ${isSepia ? 'bg-amber-900/20' : isEmerald ? 'bg-[#caae7a]/20' : 'bg-white/15'}`} />

        {/* Header Content */}
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-bold tracking-[0.25em] mb-0.5 font-sans ${accentText}`}>
              Spiritual Habit Builder
            </span>
            <h3 className={`text-lg md:text-xl tracking-wide font-medium ${textPrimary}`}>
              Daily Quranic Goal
            </h3>
          </div>

          <button
            id="daily_goal_close_btn"
            onClick={onClose}
            className={`p-1.5 md:p-2 rounded-full border transition-all cursor-pointer active:scale-95 ${buttonAccent}`}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Fixed Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border mb-5 text-[11px] font-semibold shrink-0" style={{
          borderColor: isSepia ? 'rgba(120,53,4,0.15)' : isEmerald ? 'rgba(45,80,72,0.3)' : 'rgba(255,255,255,0.08)',
          backgroundColor: isSepia ? 'rgba(120,53,4,0.04)' : isEmerald ? 'rgba(24,40,36,0.5)' : 'rgba(255,255,255,0.02)'
        }}>
          <button
            id="daily_goal_tracker_tab"
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'tracker'
                ? isSepia
                  ? 'bg-amber-900 border border-amber-955 text-[#fcf8f2] shadow-sm shadow-amber-900/15'
                  : isEmerald
                    ? 'bg-[#caae7a] text-[#07130e] border border-[#caae7a] shadow-sm'
                    : 'bg-indigo-600 border border-indigo-550 text-white shadow-sm shadow-indigo-600/15'
                : isSepia
                  ? 'text-amber-900/60 hover:text-amber-955'
                  : isEmerald
                    ? 'text-[#caae7a]/60 hover:text-[#caae7a]'
                    : 'text-white/50 hover:text-white'
            }`}
          >
            <Target size={13} />
            <span>Recitation Tracker</span>
          </button>
          <button
            id="daily_goal_milestones_tab"
            onClick={() => setActiveTab('milestones')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'milestones'
                ? isSepia
                  ? 'bg-amber-900 border border-amber-955 text-[#fcf8f2] shadow-sm shadow-amber-900/15'
                  : isEmerald
                    ? 'bg-[#caae7a] text-[#07130e] border border-[#caae7a] shadow-sm'
                    : 'bg-indigo-600 border border-indigo-550 text-white shadow-sm shadow-indigo-600/15'
                : isSepia
                  ? 'text-amber-900/60 hover:text-amber-955'
                  : isEmerald
                    ? 'text-[#caae7a]/60 hover:text-[#caae7a]'
                    : 'text-white/50 hover:text-white'
            }`}
          >
            <Award size={13} />
            <span>Milestones & Badges</span>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto flex-1 pr-1.5 custom-scrollbar pb-2">
          {activeTab === 'tracker' ? (
            <div className="space-y-6">
              {/* Dashboard Stats Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Progress Ring */}
                <div className={`p-5 rounded-3xl border flex flex-col items-center justify-center text-center ${isSepia ? 'bg-amber-900/5 border-amber-900/10' : isEmerald ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/15'}`}>
                  <div className="relative flex items-center justify-center">
                    <svg
                      height={radius * 2}
                      width={radius * 2}
                      className="transform -rotate-90 drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                    >
                      <circle
                        stroke={ringBg}
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                      />
                      <motion.circle
                        stroke={ringColor}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                      />
                    </svg>
                    {/* Embedded Progress Percent / Confetti indicator */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl font-bold tracking-see font-mono ${theme === 'sepia' ? 'text-amber-955' : theme === 'emerald' ? 'text-primary' : 'text-white'}`}>
                        {percentage}%
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isSepia ? 'text-amber-905/60' : isEmerald ? 'text-[#caae7a]/60' : 'text-white/40'}`}>
                        Completed
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={`text-sm font-bold block ${isSepia ? 'text-amber-900/80' : isEmerald ? 'text-[#caae7a]/80' : 'text-indigo-200'}`}>
                      {readCount} of {targetGoal} Ayahs read today
                    </span>
                    
                    {isGoalCompleted ? (
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-green-500 animate-pulse">
                        <Sparkles size={12} />
                        <span>Daily Goal Accomplished!</span>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-medium block mt-1 ${isSepia ? 'text-amber-905/60' : 'text-white/30'}`}>
                        Read {targetGoal - readCount} more verses to reach your goal today.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Column: Streaks and Settings */}
                <div className="flex flex-col gap-4">
                  {/* Daily Streak Card */}
                  <div className={`p-4.5 rounded-2xl border flex items-center justify-between gap-4 ${isSepia ? 'bg-amber-900/5 border-amber-900/10' : isEmerald ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/15'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${goalData.streak > 0 ? 'bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-bounce' : 'bg-neutral-500/10 text-neutral-500'}`}>
                        <Flame size={20} fill={goalData.streak > 0 ? 'currentColor' : 'none'} />
                      </div>
                      <div>
                        <h5 className={`text-[10px] font-bold tracking-widest uppercase ${isSepia ? 'text-amber-900/60' : isEmerald ? 'text-[#caae7a]/60' : 'text-white/40'}`}>
                          Active Streak
                        </h5>
                        <p className={`text-lg font-bold font-mono leading-none mt-1 ${theme === 'sepia' ? 'text-amber-955' : 'text-white'}`}>
                          {goalData.streak} {goalData.streak === 1 ? 'Day' : 'Days'}
                        </p>
                      </div>
                    </div>
                    {goalData.streak > 0 && (
                      <div className="text-[10px] font-bold text-orange-500 px-2.5 py-1 rounded-full bg-orange-500/10">
                        🔥 Level {Math.floor(goalData.streak / 7) + 1}
                      </div>
                    )}
                  </div>

                  {/* Goal Customizer Stepper Card */}
                  <div className={`p-4.5 rounded-2xl border flex flex-col justify-between ${isSepia ? 'bg-amber-900/5 border-amber-900/10' : isEmerald ? 'bg-emerald-950/20 border-emerald-850/20' : 'bg-white/5 border-white/15'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className={accentText} />
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${isSepia ? 'text-amber-900/60' : isEmerald ? 'text-[#caae7a]/60' : 'text-white/40'}`}>
                        Set Target Goal
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isSepia ? 'text-amber-900/80' : 'text-white/60'}`}>
                        Verses Daily Target
                      </span>
                      
                      <div className="flex items-center gap-3">
                        <button
                          id="daily_goal_minus_btn"
                          onClick={() => onUpdateGoal(Math.max(1, targetGoal - 5))}
                          disabled={targetGoal <= 1}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${buttonAccent}`}
                          title="Decrease by 5 verses"
                        >
                          <Minus size={11} />
                        </button>
                        
                        <span className="text-sm font-bold font-mono min-w-[2.5rem] text-center">
                          {targetGoal}
                        </span>
                        
                        <button
                          id="daily_goal_plus_btn"
                          onClick={() => onUpdateGoal(targetGoal + 5)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${buttonAccent}`}
                          title="Increase by 5 verses"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Reading Logs */}
              <div className="space-y-3.5 mt-2">
                <div className="flex items-center justify-between border-b pb-2 border-white/5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className={accentText} />
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === 'sepia' ? 'text-amber-955' : 'text-white'}`}>
                      verses read today ({readCount})
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      id="export_reading_history_csv"
                      onClick={handleExportCSV}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all active:scale-95 border cursor-pointer ${
                        isSepia 
                          ? 'bg-amber-950/5 border-amber-900/10 text-amber-950 hover:bg-amber-900/10' 
                          : isEmerald 
                            ? 'bg-emerald-950/40 border-emerald-800/30 text-[#caae7a] hover:bg-emerald-950/80' 
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                      title="Export reading logs across all dates as a downloadable CSV"
                    >
                      <Download size={11} className="stroke-[2.5]" />
                      <span>Export Stats</span>
                    </button>

                    <span className={`text-[10px] font-mono font-bold ${isSepia ? 'text-amber-900/50' : 'text-white/30'}`}>
                      {todayReadList.length > 0 ? 'Completed' : 'No reads yet today'}
                    </span>
                  </div>
                </div>

                {todayReadList.length > 0 ? (
                  <div className="max-h-[12.5rem] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {todayReadList.map((item, index) => {
                      const formatTime = (ts: number) => {
                        try {
                          return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (_) {
                          return '--:--';
                        }
                      };
                      return (
                        <div
                          key={`${item.surahNumber}_${item.ayahNumberInSurah}_${index}`}
                          onClick={() => onSelectAyah(item.surahNumber, item.ayahNumberInSurah)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all duration-300 ${
                            isSepia
                              ? 'bg-amber-805/5 border-amber-900/10 hover:bg-amber-900/10 hover:border-amber-900/25 text-amber-955'
                              : isEmerald
                                ? 'bg-[#182c27]/40 border-[#2d5048]/25 hover:border-[#caae7a]/30 text-[#ebf3f1]'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-white'
                          }`}
                          title="Navigate to this verse"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${accentBg}`}>
                              {index + 1}
                            </span>
                            <div>
                              <div className={`text-xs font-bold leading-none ${isSepia ? 'text-amber-955' : 'text-white'}`}>
                                Surah {item.surahEnglishName}
                              </div>
                              <div className={`text-[10px] mt-1 ${isSepia ? 'text-amber-900/60' : 'text-white/40'}`}>
                                Verse {item.ayahNumberInSurah} of 114
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9.5px] font-mono ${isSepia ? 'text-amber-900/50' : 'text-white/30'}`}>
                              {formatTime(item.timestamp)}
                            </span>
                            <ChevronRight size={11} className={isSepia ? 'text-amber-900/30' : 'text-white/20'} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-7 rounded-2xl border border-dashed ${isSepia ? 'bg-amber-900/[0.02] border-amber-900/20 text-amber-900/40' : 'bg-white/[0.01] border-white/5 text-white/30'} flex flex-col items-center justify-center gap-2`}>
                    <Calendar size={20} className="stroke-[1.5] opacity-60" />
                    <p className="text-xs font-medium">You haven't read or played any verses yet today.</p>
                    <p className="text-[10px] opacity-75">Start listening or toggle "Mark as Read" to track your progress!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <DailyBadges theme={theme} goalData={goalData} />
          )}
        </div>
      </motion.div>
    </>
  );
};
