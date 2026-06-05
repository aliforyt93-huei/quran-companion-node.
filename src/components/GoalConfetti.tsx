import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Award, Flame } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: 'circle' | 'rect' | 'triangle' | 'star';
  rotation: number;
  delay: number;
  duration: number;
  horizontalForce: number;
}

const CONFETTI_COLORS = [
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#caae7a', // Gold
];

export const GoalConfetti: React.FC<{
  active: boolean;
  onComplete: () => void;
  theme: string;
}> = ({ active, onComplete, theme }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const isSepia = theme === 'sepia';
  const isEmerald = theme === 'emerald';

  // Seed standard burst pieces
  const createBurst = useCallback((count: number, startX?: number, startY?: number) => {
    const isClickBurst = startX !== undefined && startY !== undefined;
    
    const newPieces: ConfettiPiece[] = Array.from({ length: count }).map((_, i) => {
      const id = Date.now() + i + Math.random();
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const size = Math.random() * 12 + 6; // size between 6px and 18px
      const shapes: ('circle' | 'rect' | 'triangle' | 'star')[] = ['circle', 'rect', 'triangle', 'star'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      // If click burst, spawn at click coord; else spawn across top or left/right sides
      const x = isClickBurst ? startX : Math.random() * 100; // percent width
      const y = isClickBurst ? startY : -10; // percent height
      
      const rotation = Math.random() * 360;
      const delay = isClickBurst ? 0 : Math.random() * 0.4;
      const duration = Math.random() * 2.5 + 2.5; // duration of fall (2.5 to 5s)
      const horizontalForce = (Math.random() - 0.5) * (isClickBurst ? 300 : 80); // fly horizontal direction

      return {
        id,
        x,
        y,
        color,
        size,
        shape,
        rotation,
        delay,
        duration,
        horizontalForce,
      };
    });

    setPieces((prev) => [...prev, ...newPieces].slice(-150)); // limit active pieces to 150 for super performance
  }, []);

  useEffect(() => {
    if (active) {
      // Create initial side-bursts (left and right corners pointing up)
      createBurst(60);
      
      // Secondary cascades for premium layered feeling
      const timer1 = setTimeout(() => createBurst(30), 800);
      const timer2 = setTimeout(() => createBurst(20), 1600);

      // Automatically stop display after 6 seconds
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 6500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(finishTimer);
      };
    } else {
      setPieces([]);
    }
  }, [active, createBurst, onComplete]);

  // Click on screen adds more interactive bursts where the user clicked!
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Spawn 15 sparkling celebratory pieces
    createBurst(18, x, y);
  };

  if (!active) return null;

  return (
    <div
      onClick={handleScreenClick}
      className="fixed inset-0 z-[99999] overflow-hidden pointer-events-auto cursor-pointer"
      title="Click to pop more celebratory confetti!"
    >
      {/* Dimmed backdrop to draw attention to milestone victory */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-[1px]"
      />

      {/* Center Congratulations Card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -30 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
          className={`max-w-md w-full p-6 text-center rounded-3xl border shadow-2xl relative overflow-hidden pointer-events-auto select-none ${
            isSepia
              ? 'bg-[#faf6ef] border-amber-900/25 text-amber-955'
              : isEmerald
                ? 'bg-[#0b1714] border-emerald-800/35 text-[#ebf3f1]'
                : 'bg-[#0f1115] border-white/10 text-white'
          }`}
        >
          {/* Decorative ambient gradients */}
          <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-yellow-500/15 blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/15 blur-2xl" />

          {/* Centered trophy badge with spark loops */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 1 }}
              className="p-4 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
            >
              <Trophy size={48} className="stroke-[1.5]" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-1.5 -right-1.5 text-yellow-400"
            >
              <Sparkles size={18} />
            </motion.div>
          </div>

          <h3 className="text-xl font-extrabold tracking-tight mb-2">
            Target Accomplished! 🎉
          </h3>
          <p className={`text-xs leading-relaxed max-w-sm mx-auto mb-5 ${
            isSepia ? 'text-amber-900/70' : isEmerald ? 'text-[#caae7a]/85' : 'text-zinc-400'
          }`}>
            Subhan’Allah! You completed your daily Quranic recitation milestone for today. May your consistency be blessed & highly rewarded.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-orange-500 mb-3 select-none">
            <Flame size={14} fill="currentColor" className="animate-pulse" />
            <span>Habit Streak Maintained</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className={`w-full py-3 rounded-xl text-xs font-bold tracking-wider transition-all shadow-lg ${
              isSepia
                ? 'bg-amber-900 text-[#fcf8f2] hover:bg-amber-950'
                : isEmerald
                  ? 'bg-[#caae7a] text-[#07130e] hover:brightness-110'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/15'
            }`}
          >
            Carry On Guided Reflection
          </motion.button>
          
          <div className={`text-[9px] mt-2.5 opacity-60 ${isSepia ? 'text-amber-900/60' : 'text-white/40'}`}>
            Tip: Click anywhere to pop more confetti!
          </div>
        </motion.div>
      </div>

      {/* Interactive, cascading Confetti Pieces */}
      <AnimatePresence>
        {pieces.map((piece) => {
          const isAtClick = piece.y !== -10;
          
          // Motion config parameters for realistic physics falling path with wind forces
          return (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: isAtClick ? `${piece.y}vh` : `${piece.y}%`,
                scale: 0.1,
                rotate: piece.rotation,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                x: isAtClick 
                  ? [`${piece.x}vw`, `${piece.x + (piece.horizontalForce / 12)}vw`, `${piece.x + (piece.horizontalForce / 6)}vw`] 
                  : [`${piece.x}vw`, `${piece.x + (piece.horizontalForce / 10)}vw`, `${piece.x - (piece.horizontalForce / 15)}vw`],
                scale: [1, 1.1, 0.7],
                rotate: [piece.rotation, piece.rotation + 360, piece.rotation + 720],
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                width: piece.size,
                height: piece.size * (piece.shape === 'rect' ? 1.4 : 1),
                backgroundColor: piece.shape === 'triangle' || piece.shape === 'star' ? 'transparent' : piece.color,
                borderRadius: piece.shape === 'circle' ? '50%' : '0%',
                zIndex: 99999,
              }}
            >
              {piece.shape === 'triangle' && (
                <svg
                  viewBox="0 0 10 10"
                  style={{ width: '100%', height: '100%', fill: piece.color }}
                >
                  <polygon points="5,0 10,10 0,10" />
                </svg>
              )}
              {piece.shape === 'star' && (
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: '100%', height: '100%', fill: piece.color }}
                >
                  <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                </svg>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
