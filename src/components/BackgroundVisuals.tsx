import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BackgroundVisualsProps {
  videoUrl: string;
  mimeType?: string;
  theme?: string;
}

export const BackgroundVisuals: React.FC<BackgroundVisualsProps> = ({ videoUrl, mimeType, theme }) => {
  const isImage = mimeType?.startsWith('image/');

  let baseLayerBg = "bg-[#05020a]";
  if (theme === 'sepia') {
    baseLayerBg = "bg-[#f4ecd8]";
  } else if (theme === 'oled') {
    baseLayerBg = "bg-black";
  } else if (theme === 'emerald') {
    baseLayerBg = "bg-[#11241f]";
  }

  return (
    <div className={`fixed inset-0 -z-50 overflow-hidden ${baseLayerBg}`}>
      {/* Base Layer Gradient */}
      <div className="absolute inset-0 atmosphere-gradient opacity-60" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={videoUrl}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ 
            opacity: { duration: 2 },
            scale: { duration: 30, ease: "linear" } 
          }}
          className="absolute inset-0"
        >
          {videoUrl && (
            isImage ? (
              <img
                src={videoUrl}
                alt="background"
                className="h-full w-full object-cover grayscale-[10%] brightness-[0.7] contrast-[1.1]"
              />
            ) : (
              <video
                autoPlay
                loop
                muted
                playsInline
                key={videoUrl}
                className="h-full w-full object-cover grayscale-[10%] brightness-[0.7] contrast-[1.1]"
              >
                <source src={videoUrl} type={mimeType || "video/mp4"} />
              </video>
            )
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Atmospheric Overlays for Text Readability */}
      <div className={`absolute inset-0 ${theme === 'sepia' ? 'bg-[#f4ecd8]/45' : theme === 'oled' ? 'bg-black/60' : theme === 'emerald' ? 'bg-[#0f211b]/60 md:bg-[#0f211b]/55' : 'bg-black/40'} backdrop-blur-[1px]`} />
      <div className={`absolute inset-0 ${
        theme === 'sepia' 
          ? 'bg-radial-gradient from-transparent via-transparent to-[#ecdcb9]/40' 
          : theme === 'emerald'
            ? 'bg-radial-gradient from-transparent via-transparent to-[#0a1512]/90'
            : 'bg-radial-gradient from-transparent via-transparent to-[#0a0514]/80'
      } pointer-events-none`} />
    </div>
  );
};
