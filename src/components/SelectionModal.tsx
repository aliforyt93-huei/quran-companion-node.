import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  renderItem: (item: any) => React.ReactNode;
  children?: React.ReactNode;
  subtitle?: string;
  theme?: string;
  gridColsClassName?: string;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  renderItem,
  children,
  subtitle,
  theme,
  gridColsClassName,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ambient Blurred Glass Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-[12px] transition-all"
          />
          
          {/* Centered Premium Floating Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 30, stiffness: 250, restDelta: 0.01 }}
            className={`fixed bottom-0 md:bottom-12 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[160] w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] backdrop-blur-3xl rounded-t-[2.2rem] md:rounded-[2.2rem] px-5 py-6 md:px-8 md:py-7 overflow-hidden flex flex-col border-t md:border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9)] transition-all duration-300 ${
              theme === 'sepia'
                ? 'bg-[#fcf8f2] md:bg-[#fcf8f2] border-amber-900/15 text-amber-955 font-sans'
                : theme === 'emerald'
                  ? 'bg-[#182824]/95 md:bg-[#13201d]/95 border-[#2d5048]/30 text-[#ebf3f1] font-sans'
                  : 'bg-neutral-950/85 md:bg-neutral-900/90 border-white/10 text-white font-sans'
            }`}
          >
            {/* Minimalist Slide Indicator (Touch Cue) */}
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 shrink-0 block md:hidden ${
              theme === 'sepia' ? 'bg-amber-900/20' : theme === 'emerald' ? 'bg-[#caae7a]/20' : 'bg-white/15'
            }`} />

            {/* Header Content */}
            <div className="flex items-start justify-between mb-5 shrink-0">
              <div className="flex flex-col">
                <span className={`text-[10px] uppercase font-bold tracking-[0.25em] mb-0.5 font-sans ${
                  theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400/80'
                }`}>
                  {subtitle || 'Preferences'}
                </span>
                <h3 className={`text-lg md:text-xl font-serif tracking-wide font-medium ${
                  theme === 'sepia' ? 'text-amber-955' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-white'
                }`}>{title}</h3>
              </div>
              
              <button 
                onClick={onClose}
                className={`p-1.5 md:p-2 rounded-full border transition-all cursor-pointer active:scale-95 ${
                  theme === 'sepia'
                    ? 'bg-amber-900/5 hover:bg-amber-900/10 text-amber-900/60 hover:text-amber-900 border-amber-900/10'
                    : theme === 'emerald'
                      ? 'bg-emerald-900/20 hover:bg-[#1f3731] text-[#caae7a]/70 hover:text-[#caae7a] border-[#2d5048]/25 hover:border-[#caae7a]/30'
                      : 'bg-white/5 hover:bg-neutral-800 text-white/50 hover:text-white border border-white/5 hover:border-white/10'
                }`}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Scrollable Content Container */}
            <div className="overflow-y-auto flex-1 pr-1.5 custom-scrollbar space-y-4">
              {children}
              
              {items && items.length > 0 && (
                <div className={`grid gap-2.5 pb-2 ${gridColsClassName || "grid-cols-1 sm:grid-cols-2"}`}>
                  {items.map((item, idx) => (
                    <div key={idx} className="transition-all duration-350">
                      {renderItem(item)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
