import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Award, Check, Sparkles, Flame, Zap, Trophy, Sunrise, Moon, Milestone, Star } from 'lucide-react';

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

interface Badge {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'volume' | 'timing';
  icon: React.ReactNode;
  iconBg: string;
  unlockedColor: string;
  isUnlocked: boolean;
  progressText: string;
  progressPercent: number;
}

interface DailyBadgesProps {
  theme: string;
  goalData: DailyGoalData;
}

export const DailyBadges: React.FC<DailyBadgesProps> = ({ theme, goalData }) => {
  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';

  const badges: Badge[] = useMemo(() => {
    // 1. Calculate stats from history
    const historyKeys = Object.keys(goalData.history);
    
    // Total raw ayahs read of all times
    let totalAyahsRead = 0;
    let timingEarlyBird = false;
    let timingNightOwl = false;

    historyKeys.forEach((key) => {
      const items = goalData.history[key] || [];
      totalAyahsRead += items.length;
      
      items.forEach((item) => {
        const date = new Date(item.timestamp);
        const hours = date.getHours();
        if (hours >= 4 && hours < 8) {
          timingEarlyBird = true;
        }
        if (hours >= 20 || hours < 4) {
          timingNightOwl = true;
        }
      });
    });

    // Check if goal was completed today
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayReadCount = goalData.history[todayStr]?.length || 0;
    const isGoalCompletedToday = todayReadCount >= goalData.dailyGoal;

    const streak = goalData.streak;

    const list: Badge[] = [
      {
        id: 'journey_begins',
        title: 'The Journey Begins',
        description: 'Read your first Quranic verse of the spiritual habit tracking program.',
        category: 'volume',
        icon: <Milestone size={18} />,
        iconBg: 'bg-teal-500/15 text-teal-500',
        unlockedColor: 'border-teal-500/30 ring-teal-500/10 bg-teal-500/[0.02]',
        isUnlocked: totalAyahsRead >= 1,
        progressText: `${Math.min(totalAyahsRead, 1)}/1 Verse`,
        progressPercent: totalAyahsRead >= 1 ? 100 : 0,
      },
      {
        id: 'daily_devotee',
        title: 'Daily Devotee',
        description: "Achieve today's fully customized daily Ayah recitation target.",
        category: 'volume',
        icon: <Check size={18} />,
        iconBg: 'bg-green-500/15 text-green-500',
        unlockedColor: 'border-green-500/30 ring-green-500/10 bg-green-500/[0.02]',
        isUnlocked: isGoalCompletedToday,
        progressText: `${todayReadCount}/${goalData.dailyGoal} AyahsToday`,
        progressPercent: Math.min(Math.round((todayReadCount / goalData.dailyGoal) * 100), 100),
      },
      {
        id: 'habit_builder',
        title: 'Consistency Spark',
        description: 'Achieve a 3-day streak of completing your daily recitation target.',
        category: 'streak',
        icon: <Zap size={18} />,
        iconBg: 'bg-amber-500/15 text-amber-500',
        unlockedColor: 'border-amber-500/30 ring-amber-500/10 bg-amber-500/[0.02]',
        isUnlocked: streak >= 3,
        progressText: `${streak}/3 Days Streak`,
        progressPercent: Math.min(Math.round((streak / 3) * 100), 100),
      },
      {
        id: 'weekly_hero',
        title: 'Weekly Streak Hero',
        description: 'Establish a solid foundation of 7 consecutive days of Quranic reading.',
        category: 'streak',
        icon: <Flame size={18} />,
        iconBg: 'bg-orange-500/15 text-orange-500',
        unlockedColor: 'border-orange-500/30 ring-orange-500/10 bg-orange-500/[0.02]',
        isUnlocked: streak >= 7,
        progressText: `${streak}/7 Days Streak`,
        progressPercent: Math.min(Math.round((streak / 7) * 100), 100),
      },
      {
        id: 'monthly_reader',
        title: 'Monthly Consistent Reader',
        description: 'Forge deep spiritual resilience with a magnificent 30-day consistent streak.',
        category: 'streak',
        icon: <Trophy size={18} />,
        iconBg: 'bg-indigo-500/15 text-indigo-500',
        unlockedColor: 'border-indigo-500/30 ring-indigo-500/10 bg-indigo-500/[0.02]',
        isUnlocked: streak >= 30,
        progressText: `${streak}/30 Days Streak`,
        progressPercent: Math.min(Math.round((streak / 30) * 100), 100),
      },
      {
        id: 'century_mark',
        title: 'The Century Mark',
        description: 'Reach a milestones collection of 100 total Quranic verses read dynamically.',
        category: 'volume',
        icon: <Star size={18} />,
        iconBg: 'bg-pink-500/15 text-pink-500',
        unlockedColor: 'border-pink-500/30 ring-pink-500/10 bg-pink-500/[0.02]',
        isUnlocked: totalAyahsRead >= 100,
        progressText: `${totalAyahsRead}/100 total Ayahs`,
        progressPercent: Math.min(Math.round((totalAyahsRead / 100) * 100), 100),
      },
      {
        id: 'early_bird',
        title: 'Early Dawn Serenity',
        description: 'Recite at least one verse during the serene dawn atmosphere (4:00 AM - 8:00 AM).',
        category: 'timing',
        icon: <Sunrise size={18} />,
        iconBg: 'bg-yellow-500/15 text-yellow-500',
        unlockedColor: 'border-yellow-500/30 ring-yellow-500/10 bg-yellow-500/[0.02]',
        isUnlocked: timingEarlyBird,
        progressText: timingEarlyBird ? 'Unlocked' : '0/1 Morning Read',
        progressPercent: timingEarlyBird ? 100 : 0,
      },
      {
        id: 'night_owl',
        title: 'Midnight Reflection',
        description: 'Meditate and read at least one verse during the tranquil late night hours (8:00 PM - 4:00 AM).',
        category: 'timing',
        icon: <Moon size={18} />,
        iconBg: 'bg-purple-500/15 text-purple-500',
        unlockedColor: 'border-purple-500/30 ring-purple-500/10 bg-purple-500/[0.02]',
        isUnlocked: timingNightOwl,
        progressText: timingNightOwl ? 'Unlocked' : '0/1 Night Read',
        progressPercent: timingNightOwl ? 100 : 0,
      },
    ];

    return list;
  }, [goalData]);

  // Count total unlocked
  const unlockedCount = useMemo(() => {
    return badges.filter((b) => b.isUnlocked).length;
  }, [badges]);

  return (
    <div className="space-y-5">
      {/* Title & Stats Summary */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        isSepia 
          ? 'bg-amber-900/5 border-amber-900/10 text-amber-955' 
          : isEmerald 
            ? 'bg-[#2d5048]/10 border-[#2d5048]/25 text-[#ebf3f1]' 
            : 'bg-white/[0.02] border-white/5 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
            <Award size={22} className="stroke-[1.75]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Milestones Collection</h4>
            <p className={`text-[11px] mt-0.5 ${isSepia ? 'text-amber-900/60' : 'text-white/40'}`}>
              Collect and unlock spiritual badges as you build your reading habits.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-black font-mono tracking-tight text-yellow-500">
            {unlockedCount} / {badges.length}
          </span>
          <span className={`block text-[8px] font-extrabold uppercase tracking-widest ${isSepia ? 'text-amber-900/45' : 'text-white/35'}`}>
            Unlocked
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[18rem] md:max-h-[22rem] overflow-y-auto pr-1 custom-scrollbar">
        {badges.map((badge, idx) => {
          return (
            <motion.div
              layoutId={`badge-${badge.id}`}
              key={badge.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, ease: 'easeOut' }}
              className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                badge.isUnlocked
                  ? `${badge.unlockedColor} ring-1`
                  : isSepia
                    ? 'bg-neutral-100/50 border-neutral-200 text-neutral-400 opacity-60'
                    : isEmerald
                      ? 'bg-[#121e1a]/40 border-[#2d5048]/15 text-[#ebf3f1]/40 opacity-55'
                      : 'bg-[#101010] border-white/[0.03] text-white/35 opacity-55'
              }`}
            >
              {/* Badge Icon, Title & Requirements */}
              <div className="flex gap-3">
                <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 self-start ${
                  badge.isUnlocked ? badge.iconBg : isSepia ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 text-neutral-600'
                }`}>
                  {badge.icon}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h5 className={`text-xs font-bold truncate ${
                      badge.isUnlocked 
                        ? isSepia 
                          ? 'text-amber-955' 
                          : isEmerald 
                            ? 'text-[#ebf3f1]' 
                            : 'text-white'
                        : ''
                    }`}>
                      {badge.title}
                    </h5>
                    {badge.isUnlocked && (
                      <span className="inline-flex text-[8px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 origin-left">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] leading-relaxed line-clamp-2 ${
                    badge.isUnlocked 
                      ? isSepia 
                        ? 'text-amber-900/70' 
                        : 'text-white/60' 
                      : isSepia 
                        ? 'text-neutral-500/60' 
                        : 'text-white/20'
                  }`}>
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Status Text */}
              <div className="mt-4 pt-3 border-t border-dashed border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold tracking-tight">
                  <span className={`${badge.isUnlocked ? (isSepia ? 'text-amber-850' : 'text-white/70') : 'opacity-60'}`}>
                    Progress Requirement
                  </span>
                  <span className={`font-mono ${badge.isUnlocked ? 'text-green-500 font-bold' : ''}`}>
                    {badge.progressText}
                  </span>
                </div>
                {/* Horizontal Progress bar */}
                <div className={`w-full h-1 rounded-full overflow-hidden ${
                  isSepia ? 'bg-amber-900/10' : isEmerald ? 'bg-emerald-950/40' : 'bg-white/5'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked 
                        ? 'bg-green-500' 
                        : isSepia
                          ? 'bg-neutral-300'
                          : isEmerald
                            ? 'bg-emerald-800/40'
                            : 'bg-white/10'
                    }`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
