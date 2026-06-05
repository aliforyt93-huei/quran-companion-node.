import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, BookOpen, HelpCircle, X, Globe, Mic, MicOff, Volume2, VolumeX, Headphones, Radio, Loader2, Square, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ayah, Surah, isRtlText } from '../types';
import { useGeminiLive } from './useGeminiLive';

const LANGUAGE_BCP47_MAP: Record<string, string> = {
  'english': 'en-US',
  'arabic': 'ar-SA',
  'urdu': 'ur-PK',
  'french': 'fr-FR',
  'indonesian': 'id-ID',
  'turkish': 'tr-TR',
  'spanish': 'es-ES',
  'bengali': 'bn-BD'
};

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  citations?: Array<{
    title: string;
    source: string;
    category: string;
    text: string;
    score: number;
  }>;
}

interface QuranBotProps {
  currentSurah: Surah | null;
  currentAyahIndex: number;
  theme: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isPlaying?: boolean;
  setIsPlaying?: (isPlaying: boolean) => void;
  onNextAyah?: () => void;
  onPrevAyah?: () => void;
  initialLanguage?: string;
  isInline?: boolean;
}

export const BOT_LANGUAGES = [
  { id: 'english', label: 'English', native: 'English' },
  { id: 'arabic', label: 'Arabic', native: 'العربية' },
  { id: 'urdu', label: 'Urdu', native: 'اردو' },
  { id: 'french', label: 'French', native: 'Français' },
  { id: 'indonesian', label: 'Indonesian', native: 'B. Indonesia' },
  { id: 'turkish', label: 'Turkish', native: 'Türkçe' },
  { id: 'spanish', label: 'Spanish', native: 'Español' },
  { id: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { id: 'hindi', label: 'Hindi', native: 'हिन्दी' }
];

const LOCALIZED_GREETINGS: Record<string, string> = {
  English: `### Assalamu Alaikum! 🌟\n\nI am **Al-Mualim**, your Quranic Context & Exegesis Guide.\n\n**Consult with me for:**\n* **Classical Tafseer** — deep word-by-word verse exegesis.\n* **Asbab al-Nuzul** — historical context of revelation.\n* **Contextual Answers** — answers using verified classical references.\n\n*Write a question or tap a quick starter below.*`,
  Arabic: `### السلام عليكم ورحمة الله وبركاته! 🌟\n\nأنا **المعلم**، رئيس البحوث العلمية والعلوم الإسلامية.\n\n**اسألني عن:**\n* **التفسير التفصيلي** — شرح ميسر ومبسط معتمد للآيات.\n* **أسباب النزول** — السياق التاريخي لنزول الآيات الكريمة.\n* **الفتاوى الفقهية** — إجابات دقيقة مبنية على المذاهب المعتمدة.\n\n*اطرح سؤالك أو اختر أحد الأسئلة السريعة بالأسفل.*`,
  Urdu: `### السلام علیکم ورحمۃ اللہ وبرکاتہ! 🌟\n\nمیں **المعلم** ہوں، آپ کا مستند قرآنی سکالر اور ترجمانِ علم۔\n\n**مجھ سے دریافت کریں:**\n* **مستند تفسیر** — قرآنی آیات کی گہرائی اور تفصیلی تشریح۔\n* **اسبابِ نزول** — آیاتِ مبارکہ کے نازل ہونے کا تاریخی پس منظر۔\n* **شرعی مسائل** — معتبر کلاسیکی مراجع کے مطابق مسائل کے جوابات۔\n\n*کوئی بھی سوال لکھیں یا نیچے دیے گئے کوئیک سٹارٹر پر کلک کریں۔*`,
  French: `### Assalamu Alaikum ! 🌟\n\nJe suis **Al-Mualim**, votre érudit et guide coranique virtuel.\n\n**Demandez-moi :**\n* **Tafsir Classique** — exégèse profonde mot par mot.\n* **Asbab al-Nuzul** — contexte historique de la révélation.\n* **Réponses Érudites** — fondées sur les références de consensus.\n\n*Posez votre question ou utilisez nos actions rapides ci-dessous.*`,
  Indonesian: `### Assalamu Alaikum! 🌟\n\nSaya **Al-Mualim**, asisten dan pembimbing Al-Quran digital Anda.\n\n**Tanyakan tentang:**\n* **Tafsir Klasik** — penjelasan ayat demi ayat secara mendalam.\n* **Asbabun Nuzul** — latar belakang sejarah turunnya ayat.\n* **Jawaban Fikih** — solusi hukum berdasarkan ijma' ulama.\n\n*Ajukan pertanyaan atau pilih menu cepat di bawah ini.*`,
  Turkish: `### Es-selamu aleyküm! 🌟\n\nBen Kur'an rehberiniz ve İslami ilimler mualliminiz **Al-Mualim**.\n\n**Sorabileceğiniz konular:**\n* **Klasik Tefsir** — Ayetlerin derinlikli ve kelime kelime açıklaması.\n* **Esbab-ı Nüzul** — Ayetlerin iniş sebepleri ve tarihi bağlamı.\n* **Fıkhi Cevaplar** — Sahih kaynaklar doğrultusunda İslami ilimler.\n\n*Lütfen sorunuzu yazın veya aşağıdaki hazır komutları deneyin.*`,
  Spanish: `### ¡Assalamu Alaikum! 🌟\n\nSoy **Al-Mualim**, tu asesor coránico inteligente y erudito del Islam.\n\n**Pregúntame sobre:**\n* **Tafsir Clásico** — exégesis profunda versículo por versículo.\n* **Asbab al-Nuzul** — contexto histórico de la revelación de la Sura.\n* **Jurisprudencia Clásica** — doctrina fundamentada en fuentes de consenso.\n\n*Escribe tu pregunta o selecciona un acceso directo abajo.*`,
  Bengali: `### আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ! 🌟\n\nআমি **আল-মুয়াল্লিম**, আপনার নির্ভরযোগ্য কুরআন গবেষক এবং ইসলামিক শিক্ষক।\n\n**যেকোনো বিষয়ে সাহায্য নিন:**\n* **বিশুদ্ধ তাফসীর** — আয়াতসমূহের গভীর এবং নির্ভরযোগ্য ব্যাখ্যা বিশ্লেষণ।\n* **আসবাবুন নুযুল** — আয়াত নাজিল হওয়ার মূল ঐতিহাসিক প্রেক্ষাপট।\n* **সঠিক শরীআহ সমাধান** — হাদিস ও ইজমা ভিত্তিক ইসলামিক প্রশ্নোত্তর।\n\n*নিচে সরাসরি প্রশ্ন লিখুন অথবা কুইক স্টার্টার ব্যবহার করুন।*`,
  Hindi: `### नमस्ते और अस्सलामु अलैकुम! 🌟\n\nमैं **अल-मुअल्लिम** हूँ, आपका कुरानिक संदर्भ और व्याख्या गाइड।\n\n**मुझसे परामर्श करें:**\n* **शास्त्रीय तफ़सीर** — गहरा शब्द-दर-शब्द आयत विश्लेषण।\n* **अस्बाब अल-नुज़ूल** — रहस्योद्घाटन का ऐतिहासिक संदर्भ।\n* **प्रासंगिक उत्तर** — सत्यापित शास्त्रीय संदर्भों का उपयोग करके उत्तर।\n\n*कोई प्रश्न लिखें या नीचे दिए गए त्वरित प्रारंभ बटन पर टैप करें।*`
};

export function QuranBot({ 
  currentSurah, 
  currentAyahIndex, 
  theme, 
  isOpen, 
  setIsOpen,
  isPlaying,
  setIsPlaying,
  onNextAyah,
  onPrevAyah,
  initialLanguage,
  isInline = false
}: QuranBotProps) {
  const currentAyahObj = currentSurah?.ayahs?.[currentAyahIndex] || null;
  const liveSession = useGeminiLive();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || 'English');
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const activeMessageAudioCtxRef = useRef<AudioContext | null>(null);

  const stopMessageTTS = () => {
    if (activeMessageAudioCtxRef.current) {
      try {
        activeMessageAudioCtxRef.current.close();
      } catch (e) {}
      activeMessageAudioCtxRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const playMessageTTS = async (messageId: string, text: string, langLabel: string) => {
    stopMessageTTS();
    setPlayingMessageId(messageId);

    const langCodeMap: Record<string, string> = {
      bengali: 'bn',
      hindi: 'hi',
      french: 'fr',
      turkish: 'tr'
    };

    const langCode = langCodeMap[langLabel.toLowerCase()] || 'en';

    try {
      // Clean text of markdown, italics, bold etc. for clean synthesis
      const cleanText = text
        .replace(/###?\s+/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^>\s+/gm, '') 
        .replace(/\[([^\]]*)\]/g, '$1')
        .replace(/<[^>]*>/g, '')
        .trim();

      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, language: langCode }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Gemini TTS');
      }

      const data = await response.json();
      if (data.audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        activeMessageAudioCtxRef.current = audioCtx;

        const binary = window.atob(data.audio);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
          try {
            audioCtx.close();
          } catch (e) {}
          if (activeMessageAudioCtxRef.current === audioCtx) {
            setPlayingMessageId(null);
            activeMessageAudioCtxRef.current = null;
          }
        };

        source.start(0);
      } else {
        setPlayingMessageId(null);
      }
    } catch (err) {
      console.error("Failed playing Gemini TTS for Al-Mualim:", err);
      setPlayingMessageId(null);
    }
  };

  // Maintain fresh references to avoid stale closure issues
  const handleSendMessageRef = useRef<any>(null);
  const onNextAyahRef = useRef<any>(null);
  const onPrevAyahRef = useRef<any>(null);
  const setIsPlayingRef = useRef<any>(null);
  const selectedLanguageRef = useRef<string>('English');
  const isHandsFreeModeRef = useRef<boolean>(false);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    isHandsFreeModeRef.current = isHandsFreeMode;
  }, [isHandsFreeMode]);

  // Synchronize with external selected translation language
  useEffect(() => {
    if (initialLanguage) {
      const matchedLang = BOT_LANGUAGES.find(
        lang => lang.label.toLowerCase() === initialLanguage.toLowerCase()
      );
      if (matchedLang) {
        setSelectedLanguage(matchedLang.label);
      }
    }
  }, [initialLanguage]);

  const stopSpeaking = () => {
    // No-op for safety
  };

  const getLanguageLocale = (langLabel: string) => {
    switch (langLabel.toLowerCase()) {
      case 'arabic': return 'ar-SA';
      case 'urdu': return 'ur-PK';
      case 'french': return 'fr-FR';
      case 'indonesian': return 'id-ID';
      case 'turkish': return 'tr-TR';
      case 'spanish': return 'es-ES';
      case 'bengali': return 'bn-BD';
      case 'hindi': return 'hi-IN';
      case 'english':
      default:
        return 'en-US';
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopMessageTTS();
    };
  }, []);

  // Synchronized Voice Hotline trigger drivers for opening, changing verses or switching languages
  useEffect(() => {
    if (!isOpen) {
      liveSession.stopSession();
      stopMessageTTS();
    } else {
      liveSession.stopSession();
      const timer = setTimeout(() => {
        if (currentSurah && currentAyahObj) {
          liveSession.startSession({
            surahName: currentSurah.englishName,
            ayahNumber: currentAyahObj.numberInSurah,
            arabicText: currentAyahObj.text,
            translation: currentAyahObj.translation,
            language: selectedLanguage,
            mode: 'qa'
          });
        } else {
          liveSession.startSession({
            language: selectedLanguage,
            mode: 'qa'
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentSurah?.number, currentAyahObj?.numberInSurah, selectedLanguage]);

  // Stop background recitation when Voice Hotline connects or is connecting in the AI Guide
  useEffect(() => {
    if ((liveSession.isConnected || liveSession.isConnecting) && setIsPlaying) {
      setIsPlaying(false);
    }
  }, [liveSession.isConnected, liveSession.isConnecting, setIsPlaying]);

  const prevConnectedRef = useRef(false);

  useEffect(() => {
    if (prevConnectedRef.current && !liveSession.isConnected) {
      const uText = liveSession.userTranscript.trim();
      const aText = liveSession.aiTranscript.trim();

      if (uText || aText) {
        setMessages(prev => {
          const updated = [...prev];
          if (uText) {
            updated.push({
              id: `live_user_final_${Date.now()}`,
              role: 'user',
              text: `🗣️ Live Voice Session: "${uText}"`,
              timestamp: new Date()
            });
          }
          if (aText) {
            updated.push({
              id: `live_ai_final_${Date.now()}`,
              role: 'model',
              text: aText,
              timestamp: new Date()
            });
          }
          return updated;
        });
      }
    }
    prevConnectedRef.current = liveSession.isConnected;
  }, [liveSession.isConnected, liveSession.userTranscript, liveSession.aiTranscript]);

  const startSpeechRecognition = () => {
    setSpeechError(null);
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getLanguageLocale(selectedLanguage);
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone permission denied. Open this app in a new tab for direct access.");
        } else if (event.error === 'no-speech') {
          setSpeechError("No speech detected. Please speak clearly.");
        } else {
          setSpeechError(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (!transcript) return;

        const cleaned = transcript.toLowerCase().trim();

        const matchesPlay = ['play', 'resume', 'play quran', 'start', 'shaghel', 'تشغيل', 'شغل'].some(term => cleaned.includes(term));
        const matchesPause = ['pause', 'stop', 'quiet', 'oqqof', 'توقف', 'وقف'].some(term => cleaned.includes(term));
        const matchesNext = ['next', 'next verse', 'next ayah', 'tali', 'التالي'].some(term => cleaned.includes(term));
        const matchesPrev = ['previous', 'previous verse', 'previous ayah', 'back', 'sabiq', 'السابق'].some(term => cleaned.includes(term));

        if (matchesPlay && setIsPlayingRef.current) {
          setIsPlayingRef.current(true);
          setMessages(prev => [
            ...prev,
            { id: `vc_${Date.now()}`, role: 'user', text: `🗣️ Voice Cmd: "Play"`, timestamp: new Date() },
            { id: `vcr_${Date.now()}`, role: 'model', text: `💡 Commencing recitation playback.`, timestamp: new Date() }
          ]);
          return;
        }

        if (matchesPause && setIsPlayingRef.current) {
          setIsPlayingRef.current(false);
          setMessages(prev => [
            ...prev,
            { id: `vc_${Date.now()}`, role: 'user', text: `🗣️ Voice Cmd: "Pause"`, timestamp: new Date() },
            { id: `vcr_${Date.now()}`, role: 'model', text: `💡 Recitation playback paused.`, timestamp: new Date() }
          ]);
          return;
        }

        if (matchesNext && onNextAyahRef.current) {
          onNextAyahRef.current();
          setMessages(prev => [
            ...prev,
            { id: `vc_${Date.now()}`, role: 'user', text: `🗣️ Voice Cmd: "Next"`, timestamp: new Date() },
            { id: `vcr_${Date.now()}`, role: 'model', text: `💡 Skipped to the next ayah.`, timestamp: new Date() }
          ]);
          return;
        }

        if (matchesPrev && onPrevAyahRef.current) {
          onPrevAyahRef.current();
          setMessages(prev => [
            ...prev,
            { id: `vc_${Date.now()}`, role: 'user', text: `🗣️ Voice Cmd: "Previous"`, timestamp: new Date() },
            { id: `vcr_${Date.now()}`, role: 'model', text: `💡 Returned to the previous ayah.`, timestamp: new Date() }
          ]);
          return;
        }

        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError("Audio capture could not be initialized.");
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Update welcome message dynamically when the user switches languages
  useEffect(() => {
    if (messages.length <= 1) {
      const greetingText = LOCALIZED_GREETINGS[selectedLanguage] || LOCALIZED_GREETINGS.English;
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: greetingText,
          timestamp: new Date()
        }
      ]);
    }
  }, [selectedLanguage, messages.length]);

  // Scroll to bottom when messages list changes or load states trigger
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen, isLoading, liveSession.aiTranscript, liveSession.userTranscript]);

  // Handles sending a message to our Express API
  const handleSendMessage = async (customPrompt?: string) => {
    const messageToSend = customPrompt || input.trim();
    if (!messageToSend) return;

    if (!customPrompt) {
      setInput('');
    }

    const userMsgId = Math.random().toString(36).substring(7);
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: messageToSend,
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const context = currentSurah && currentAyahObj ? {
        surahNumber: currentSurah.number,
        surahName: currentSurah.englishName,
        ayahNumberInSurah: currentAyahObj.numberInSurah,
        arabicText: currentAyahObj.text,
        englishTranslation: currentAyahObj.translation
      } : null;

      const history = newMessages.slice(1, -1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageToSend,
          history: history,
          context: context,
          language: selectedLanguage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reply from AI Scholar Server.');
      }

      const botMsgId = Math.random().toString(36).substring(7);
      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          role: 'model',
          text: data.reply,
          timestamp: new Date(),
          citations: data.citations
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keep references updated for safety inside event handlers
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  useEffect(() => {
    onNextAyahRef.current = onNextAyah;
  }, [onNextAyah]);

  useEffect(() => {
    onPrevAyahRef.current = onPrevAyah;
  }, [onPrevAyah]);

  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  }, [setIsPlaying]);

  const clearChat = () => {
    const greetingText = LOCALIZED_GREETINGS[selectedLanguage] || LOCALIZED_GREETINGS.English;
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: greetingText,
        timestamp: new Date()
      }
    ]);
    setError(null);
  };

  // Helper function to loosely and cleanly parse simple Markdown tokens
  const renderTextContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className={`text-sm font-bold mt-3 mb-1 font-sans text-left ${
            theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-300'
          }`}>
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className={`text-base font-extrabold mt-4 mb-1.5 font-sans text-left ${
            theme === 'sepia' ? 'text-amber-900' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
          }`}>
            {trimmed.replace(/^##\s*/, '')}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={idx} className={`text-lg font-black mt-4 mb-2 font-display text-left ${
            theme === 'sepia' ? 'text-amber-955' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'
          }`}>
            {trimmed.replace(/^#\s*/, '')}
          </h2>
        );
      }

      // Blockquote / Verses
      if (trimmed.startsWith('>')) {
        const content = trimmed.replace(/^>\s*/, '');
        const isRtl = isRtlText(content);
        
        if (isRtl) {
          return (
            <blockquote 
              key={idx} 
              className={`border-r-4 pl-4 pr-5 py-3.5 my-3 rounded-l-xl italic font-quran leading-loose text-right shadow-sm select-all ${
                theme === 'sepia'
                  ? 'bg-amber-900/5 border-amber-600 text-[#42220f]'
                  : theme === 'oled'
                    ? 'bg-neutral-900/40 border-emerald-600/50 text-emerald-50'
                    : 'bg-emerald-950/10 border-emerald-500/40 text-[#f0fdf4]'
              }`} 
              style={{ direction: 'rtl', fontSize: '1.25rem' }}
            >
              {content}
            </blockquote>
          );
        } else {
          return (
            <blockquote 
              key={idx} 
              className={`border-l-4 pl-4 pr-3 py-2.5 my-2.5 rounded-r-xl italic font-sans text-xs md:text-sm leading-relaxed text-left shadow-sm ${
                theme === 'sepia'
                  ? 'bg-[#faf6ee]/10 border-amber-801/40 text-amber-950/80'
                  : theme === 'oled'
                    ? 'bg-neutral-900/20 border-neutral-700 text-neutral-300'
                    : 'bg-[#6366f1]/5 border-[#6366f1]/30 text-indigo-100/90'
              }`}
            >
              {parseBoldItalic(content)}
            </blockquote>
          );
        }
      }

      // Bullets
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <div key={idx} className="flex gap-2.5 mt-1 ml-2 text-white/80 text-xs text-left">
            <span className="text-indigo-400 text-sm leading-none">•</span>
            <span>
              {parseBoldItalic(trimmed.replace(/^[\*\-]\s*/, ''))}
            </span>
          </div>
        );
      }

      // Normal text with bold parsing support
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs md:text-sm text-white/80 leading-relaxed my-1 text-left">
          {parseBoldItalic(line)}
        </p>
      );
    });
  };

  const parseBoldItalic = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong 
            key={i} 
            className={`font-extrabold ${
              theme === 'sepia' 
                ? 'text-[#2d1b0d]' 
                : theme === 'emerald'
                  ? 'text-white'
                  : 'text-white'
            }`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'emerald':
        return {
          bg: 'bg-[#13201d]/98 border-[#2d5048]/40',
          badge: 'bg-[#caae7a]/15 text-[#caae7a] border-[#caae7a]/25',
          buttonActive: 'bg-[#caae7a] hover:bg-[#b09462] text-[#0a1210]',
          userBubble: 'bg-emerald-950/40 border-[#2d5048]/40 text-[#ebf3f1] rounded-2xl rounded-tr-none shadow-sm shadow-emerald-950/20',
          modelBubble: 'bg-[#182c27]/60 border-[#2d5048]/25 text-[#ebf3f1]/95 rounded-2xl rounded-tl-none',
        };
      case 'sepia':
        return {
          bg: 'bg-[#fcf8f2] border-amber-900/15',
          badge: 'bg-amber-800/10 text-amber-850 border-amber-900/15',
          buttonActive: 'bg-amber-800 hover:bg-amber-900 text-[#fcf8f2]',
          userBubble: 'bg-amber-900/5 border-amber-900/10 text-[#4e3629] rounded-2xl rounded-tr-none shadow-sm shadow-amber-900/5',
          modelBubble: 'bg-[#faf6ee] border-amber-900/8 text-[#2d1b0d] rounded-2xl rounded-tl-none',
        };
      case 'oled':
        return {
          bg: 'bg-black border-neutral-800',
          badge: 'bg-neutral-900 text-neutral-300 border-neutral-800',
          buttonActive: 'bg-white hover:bg-neutral-200 text-black',
          userBubble: 'bg-neutral-900 border-[#262626] text-[#e5e5e5] rounded-2xl rounded-tr-none shadow-none',
          modelBubble: 'bg-neutral-950/50 border-neutral-900 text-neutral-200 rounded-2xl rounded-tl-none',
        };
      case 'cosmic':
      default:
        return {
          bg: 'bg-[#0a061d]/95 border-indigo-950/80',
          badge: 'bg-indigo-950/50 text-indigo-300 border-indigo-900/30',
          buttonActive: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          userBubble: 'bg-indigo-600/15 border-indigo-500/20 text-indigo-200 rounded-2xl rounded-tr-none shadow-sm shadow-indigo-600/5',
          modelBubble: 'bg-white/[0.025] border-white/5 text-slate-100 rounded-2xl rounded-tl-none',
        };
    }
  };

  const themeClasses = getThemeClasses();

  const chatContent = (
    <motion.div
      initial={isInline ? { opacity: 0, y: 15 } : { x: '100%' }}
      animate={isInline ? { opacity: 1, y: 0 } : { x: 0 }}
      exit={isInline ? { opacity: 0, y: 15 } : { x: '100%' }}
      transition={isInline ? { duration: 0.4 } : { type: 'spring', damping: 28, stiffness: 260 }}
      className={isInline
        ? `relative w-full ${themeClasses.bg} border ${theme === 'sepia' ? 'border-amber-900/15' : theme === 'emerald' ? 'border-[#2d5048]/30' : 'border-white/10'} rounded-[2rem] flex flex-col shadow-xl z-10 pointer-events-auto min-h-[500px] h-[650px] overflow-hidden`
        : `relative w-full max-w-md ${themeClasses.bg} border-l ${theme === 'sepia' ? 'border-amber-900/15' : theme === 'emerald' ? 'border-[#2d5048]/30' : 'border-white/10'} h-full flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.85)] z-10 pointer-events-auto`
      }
    >
              
              {/* Slate Sourcing Overlay Popup */}
              <AnimatePresence>
                {showInfoOverlay && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute inset-x-4 top-20 z-30 p-5 rounded-2xl border shadow-2xl backdrop-blur-xl space-y-3 ${
                      theme === 'sepia'
                        ? 'bg-[#faf6ee] border-amber-900/20 text-[#2d1b0d]'
                        : theme === 'emerald'
                          ? 'bg-[#0f211b] border-[#2d5048]/50 text-[#ebf3f1]'
                          : 'bg-slate-950/95 border-white/10 text-white'
                    }`}
                  >
                    <div className={`flex items-center justify-between border-b pb-2 ${theme === 'sepia' ? 'border-amber-900/10' : theme === 'emerald' ? 'border-[#2d5048]/30' : 'border-white/10'}`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'}`}>
                        <BookOpen size={13} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-400'} shrink-0`} />
                        Scholar Reference Sources
                      </h4>
                      <button
                        onClick={() => setShowInfoOverlay(false)}
                        className={`p-1 rounded-full transition-all ${theme === 'sepia' ? 'hover:bg-amber-900/10 text-[#2d1b0d]/50 hover:text-[#2d1b0d]' : theme === 'emerald' ? 'hover:bg-emerald-900/20 text-[#caae7a]/55 hover:text-[#caae7a]' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className={`text-[11px] leading-relaxed font-sans text-left ${theme === 'sepia' ? 'text-amber-950/80' : theme === 'emerald' ? 'text-[#a2b0ac]' : 'text-white/70'}`}>
                      All classical exegesis (Tafseer) and theological answers rendered by Al-Mualim strictly cite verified scholarly Islamic consensus:
                    </p>
                    <div className="space-y-2 text-[10.5px] font-sans text-left">
                      <div className={`p-2.5 rounded-xl border ${theme === 'sepia' ? 'bg-amber-900/5 border-amber-905/10' : theme === 'emerald' ? 'bg-[#182c27]/40 border-[#2d5048]/30' : 'bg-white/5 border-white/5'}`}>
                        <span className={`font-bold block mb-0.5 ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-300'}`}>📜 Exegesis (Tafsir)</span>
                        Sahih Ibn Kathir, Tafsir al-Jalalayn, and Maariful Quran.
                      </div>
                      <div className={`p-2.5 rounded-xl border ${theme === 'sepia' ? 'bg-amber-900/5 border-amber-905/10' : theme === 'emerald' ? 'bg-[#182c27]/40 border-[#2d5048]/30' : 'bg-white/5 border-white/5'}`}>
                        <span className={`font-bold block mb-0.5 ${theme === 'sepia' ? 'text-amber-900' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-300'}`}>💬 Authentic Hadith</span>
                        Sahih al-Bukhari, Sahih Muslim, Al-Muwatat, and Nawawi's Forty.
                      </div>
                    </div>
                    <p className={`text-[9.5px] italic font-sans text-left ${theme === 'sepia' ? 'text-amber-900/40' : theme === 'emerald' ? 'text-[#a2b0ac]/50' : 'text-white/40'}`}>
                      Theological guidelines strictly observe consensus (Ijma) of established traditional schools of jurisprudence.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pristine Single-Row Header */}
              <div className={`p-4 md:p-5 flex items-center justify-between shrink-0 bg-white/[0.01] border-b ${theme === 'sepia' ? 'border-amber-900/10' : theme === 'emerald' ? 'border-[#2d5048]/30' : 'border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center border shadow-inner relative ${theme === 'sepia' ? 'from-amber-100 to-amber-200 border-amber-700/20' : theme === 'emerald' ? 'from-emerald-800 to-[#13201d] border-[#caae7a]/30' : 'from-indigo-500 to-purple-600 border-indigo-400/30'}`}>
                    <Sparkles size={15} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-200'} animate-pulse`} />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${theme === 'sepia' ? 'border-[#faf6ee]' : theme === 'emerald' ? 'border-[#13201d]' : 'border-slate-950'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-sans font-black text-sm md:text-base tracking-wide ${theme === 'sepia' ? 'text-[#2d1b0d]' : theme === 'emerald' ? 'text-[#ebf3f1]' : 'text-white'}`}>
                      Al-Mualim
                    </h3>
                    <span className={`text-[9px] uppercase tracking-widest font-mono block ${theme === 'sepia' ? 'text-amber-900/60' : theme === 'emerald' ? 'text-[#a2b0ac]' : 'text-white/40'}`}>Context & Tafseer</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setShowInfoOverlay(!showInfoOverlay)}
                    className={`p-2 rounded-full transition-all ${theme === 'sepia' ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/5' : theme === 'emerald' ? 'text-[#caae7a]/70 hover:text-[#caae7a] hover:bg-emerald-950/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    title="Knowledge Sources"
                  >
                    <Info size={16} />
                  </button>
                  <button 
                    onClick={clearChat}
                    className={`p-2 rounded-full transition-all ${theme === 'sepia' ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/5' : theme === 'emerald' ? 'text-[#caae7a]/70 hover:text-[#caae7a] hover:bg-emerald-900/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    title="Reset Chat"
                  >
                    <Trash2 size={16} />
                  </button>
                  {!isInline && (
                    <button
                      onClick={() => setIsOpen(false)}
                      className={`p-2 rounded-full transition-all ${theme === 'sepia' ? 'bg-amber-900/5 hover:bg-amber-900/10 text-amber-955' : theme === 'emerald' ? 'bg-emerald-900/20 border border-[#2d5048]/30 hover:bg-[#1f3731] text-[#caae7a]' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80'}`}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Merged Audio & Language Control Dock */}
              <div className={`border-b px-4 py-3 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md ${theme === 'sepia' ? 'bg-amber-900/5 border-amber-900/10' : theme === 'emerald' ? 'bg-[#182a25] border-[#2d5048]/25' : 'bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border-white/5'}`}>
                {/* Language Select Element */}
                <div className={`flex items-center gap-2 border rounded-xl px-2.5 py-1.5 transition-all ${theme === 'sepia' ? 'bg-white border-amber-900/15' : theme === 'emerald' ? 'bg-emerald-900/10 border-[#2d5048]/30 hover:border-[#caae7a]/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <Globe size={12} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} shrink-0`} />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className={`bg-transparent text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border-none p-0 pr-1 ${theme === 'sepia' ? 'text-amber-900' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-white'}`}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  >
                    {BOT_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.label} className={`font-sans ${theme === 'sepia' ? 'bg-[#faf6ee] text-[#2d1b0d]' : theme === 'emerald' ? 'bg-[#13201d] text-[#ebf3f1]' : 'bg-slate-950 text-white'}`}>
                        {lang.native}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Micro-waveform peaks (only visible when connected and talking) */}
                {liveSession.isConnected && (
                  <div className="flex items-center gap-0.5 px-2">
                    <span className={`w-0.5 h-1.5 animate-pulse rounded-full ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-400/80'}`} />
                    <span className={`w-0.5 h-3 animate-pulse rounded-full [animation-delay:0.1s] ${theme === 'sepia' ? 'bg-amber-700' : theme === 'emerald' ? 'bg-[#caae7a]/80' : 'bg-indigo-300'}`} />
                    <span className={`w-0.5 h-4.5 animate-pulse rounded-full [animation-delay:0.2s] ${theme === 'sepia' ? 'bg-amber-900' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-purple-400'}`} />
                    <span className={`w-0.5 h-2.5 animate-pulse rounded-full [animation-delay:0.3s] ${theme === 'sepia' ? 'bg-amber-750' : theme === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-300'}`} />
                    <span className={`w-0.5 h-1 rounded-full ${theme === 'sepia' ? 'bg-amber-900/30' : theme === 'emerald' ? 'bg-emerald-900/30' : 'bg-indigo-450/40'}`} />
                  </div>
                )}

                {/* Voice Hotline Master Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    if (liveSession.isConnected) {
                      liveSession.stopSession();
                    } else {
                      stopSpeaking();
                      stopSpeechRecognition();
                      if (currentSurah && currentAyahObj) {
                        liveSession.startSession({
                          surahName: currentSurah.englishName,
                          ayahNumber: currentAyahObj.numberInSurah,
                          arabicText: currentAyahObj.text,
                          translation: currentAyahObj.translation,
                          language: selectedLanguage
                        });
                      } else {
                        liveSession.startSession({
                          language: selectedLanguage
                        });
                      }
                    }
                  }}
                  disabled={liveSession.isConnecting}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm ${
                    liveSession.isConnected
                      ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
                      : theme === 'sepia'
                        ? 'bg-amber-800/10 border-amber-950/15 text-amber-850 hover:bg-amber-800/20'
                        : theme === 'emerald'
                          ? 'bg-emerald-950/40 border-[#2d5048]/30 text-[#caae7a] hover:bg-emerald-950/70'
                          : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
                  }`}
                >
                  {liveSession.isConnecting ? (
                    <>
                      <Loader2 size={11} className={`animate-spin ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-400'}`} />
                      <span className={theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-200'}>Bridge...</span>
                    </>
                  ) : liveSession.isConnected ? (
                    <>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>Call: Connected</span>
                    </>
                  ) : (
                    <>
                      <Headphones size={11} />
                      <span>Voice Hotline</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat View Area */}
              <div className={`flex-1 overflow-y-auto p-4 md:p-5 space-y-5 flex flex-col ${isInline ? 'scrollbar-none' : 'scrollbar-thin'}`}>
                
                {/* Clean, Immersive Center Dashboard Empty State */}
                {messages.length <= 1 && (() => {
                  const starterTileClass = `px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer text-left font-sans ${
                    theme === 'sepia'
                      ? 'border-amber-900/15 bg-white hover:bg-amber-900/5 hover:border-amber-800/30 text-amber-905/90 hover:text-[#2d1b0d]'
                      : theme === 'emerald'
                        ? 'border-[#2d5048]/30 bg-[#182c27]/40 hover:bg-emerald-900/20 hover:border-[#caae7a]/50 text-[#ebf3f1]/90 hover:text-white'
                        : 'border-white/5 bg-white/[0.02] hover:bg-indigo-500/10 hover:border-indigo-500/30 text-white/80 hover:text-white'
                  }`;

                  return (
                    <div className="flex-1 w-full flex flex-col items-center justify-center py-4 px-2 space-y-5 text-center select-none animate-fade-in">
                      <div className="relative shrink-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-inner relative ${theme === 'sepia' ? 'bg-amber-100 border-amber-900/20' : theme === 'emerald' ? 'bg-[#182a25] border-[#2d5048]/30' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]'}`}>
                          <Sparkles size={22} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-200'} animate-pulse`} />
                        </div>
                      </div>

                      <div className="space-y-2 shrink-0">
                        <h3 className={`font-serif text-2xl tracking-wide font-medium ${theme === 'sepia' ? 'text-[#2d1b0d]' : theme === 'emerald' ? 'text-[#ebf3f1]' : 'text-white'}`}>
                          Al-Mualim
                        </h3>
                        <p className={`text-[10px] font-sans tracking-widest uppercase font-black ${theme === 'sepia' ? 'text-amber-900/60' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-300'}`}>
                          Tafseer & Voice Exegesis
                        </p>
                        <p className={`text-sm md:text-base font-sans animate-pulse font-bold tracking-wide mt-1.5 ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                          Say Salam to get started
                        </p>
                      </div>

                      <div className={`p-4.5 rounded-2xl text-[11px] md:text-xs max-w-sm leading-relaxed font-sans space-y-1 text-left shrink-0 border ${theme === 'sepia' ? 'bg-amber-900/[0.03] border-amber-900/10 text-[#4e3629]' : theme === 'emerald' ? 'bg-[#182c27]/40 border-[#2d5048]/30 text-[#ebf3f1]/80' : 'bg-indigo-500/[0.01] border-white/5 text-white/75'}`}>
                        {renderTextContent(LOCALIZED_GREETINGS[selectedLanguage]?.replace(/^###.+\n+/, '') || '')}
                      </div>

                      {/* Quick Suggestions integrated as elegant starter tiles */}
                      <div className="w-full max-w-sm space-y-2.5">
                        <span className={`text-[9px] font-mono tracking-widest uppercase block font-semibold text-center pb-1 ${theme === 'sepia' ? 'text-amber-900/60' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400/80'}`}>
                          — Quick Starters —
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {currentSurah && currentAyahObj ? (
                            <>
                              <button
                                onClick={() => handleSendMessage(`Provide the deep classical Tafseer (explanation) and Asbab al-Nuzul (background context of revelation) for this verse: ${currentSurah.englishName} ayat ${currentAyahObj.numberInSurah}.`)}
                                className={starterTileClass}
                              >
                                <Sparkles size={12} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-300'} shrink-0`} />
                                <span className="truncate">Explain Focused Ayat {currentAyahObj.numberInSurah} ({currentSurah.englishName})</span>
                              </button>
                              <button
                                onClick={() => handleSendMessage(`What are the core moral, practical, and spiritual lessons we can extract from ${currentSurah.englishName} ayat ${currentAyahObj.numberInSurah} in modern times?`)}
                                className={starterTileClass}
                              >
                                <BookOpen size={12} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-[#caae7a]'} shrink-0`} />
                                <span className="truncate">Spiritual Lessons of this Ayat</span>
                              </button>
                            </>
                          ) : null}
                          
                          <button
                            onClick={() => handleSendMessage("Answer briefly: What does the Quran say about Patience (Sabr) and seeking help in times of absolute hardship?")}
                            className={starterTileClass}
                          >
                            <HelpCircle size={12} className={`${theme === 'sepia' ? 'text-amber-850' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-purple-400'} shrink-0`} />
                            <span className="truncate">Quranic teachings on Patience (Sabr)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Normal Conversational Message Bubble Thread */}
                {messages.length > 1 && messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      m.role === 'user' ? 'self-end ml-auto' : 'self-start mr-auto'
                    }`}
                  >
                    {/* Compact Badge Header */}
                    <div className="flex items-center justify-between gap-3 mb-1 px-1">
                      <span className={`text-[9px] font-mono tracking-widest uppercase font-bold ${
                        m.role === 'user'
                          ? theme === 'sepia'
                            ? 'text-amber-900/60'
                            : theme === 'emerald'
                              ? 'text-emerald-400/80'
                              : 'text-indigo-300'
                          : theme === 'sepia'
                            ? 'text-amber-800'
                            : theme === 'emerald'
                              ? 'text-[#caae7a]'
                              : 'text-amber-300'
                      }`}>
                        {m.role === 'user' ? 'You' : 'Al-Mualim'}
                      </span>
                      
                      {m.role === 'model' && (
                        <button
                          type="button"
                          onClick={() => {
                            const isGeminiTTSLang = ['hindi', 'turkish', 'french', 'bengali'].includes(selectedLanguage.toLowerCase());
                            if (isGeminiTTSLang) {
                              if (playingMessageId === m.id) {
                                stopMessageTTS();
                              } else {
                                playMessageTTS(m.id, m.text, selectedLanguage);
                              }
                            } else {
                              if (liveSession.isConnected) {
                                liveSession.stopSession();
                              } else {
                                liveSession.startSession({
                                  customText: m.text,
                                  language: selectedLanguage
                                });
                              }
                            }
                          }}
                          className={`p-1 rounded-full transition-all ${
                            playingMessageId === m.id
                              ? 'text-red-400 bg-red-400/10'
                              : theme === 'sepia'
                                ? 'text-amber-900/40 hover:text-amber-850 hover:bg-amber-900/5'
                                : theme === 'emerald'
                                  ? 'text-[#caae7a]/50 hover:text-[#caae7a] hover:bg-emerald-905/10'
                                  : 'text-white/45 hover:text-indigo-300 hover:bg-white/5'
                          }`}
                          title={playingMessageId === m.id ? "Stop voice playing" : "Speak via voice connection"}
                        >
                          {playingMessageId === m.id ? <VolumeX size={11} className="animate-pulse" /> : <Volume2 size={11} />}
                        </button>
                      )}
                    </div>

                    {/* Chat Bubble Card */}
                    <div
                      className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm ${
                        m.role === 'user' ? themeClasses.userBubble : themeClasses.modelBubble
                      }`}
                    >
                      {renderTextContent(m.text)}

                      {/* Verified RAG Citations list */}
                      {m.role === 'model' && m.citations && m.citations.length > 0 && (
                        <div className={`mt-3 pt-2.5 border-t border-dashed space-y-1.5 text-[10.5px] font-sans ${theme === 'sepia' ? 'border-amber-900/10' : theme === 'emerald' ? 'border-[#2d5048]/25' : 'border-white/5'}`}>
                          <span className={`font-mono text-[9px] uppercase tracking-wider block font-black flex items-center gap-1 ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-450'}`}>
                            <BookOpen size={10} className={`${theme === 'sepia' ? 'text-amber-850' : 'text-amber-400'} shrink-0`} />
                            Verified Scholarly Citations
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {m.citations.map((cit, cIdx) => (
                              <div
                                key={cIdx}
                                className={`p-1.5 px-2 rounded-lg border text-left text-[10px] space-y-0.5 max-w-full relative group cursor-pointer ${
                                  theme === 'sepia'
                                    ? 'bg-amber-900/5 hover:bg-amber-900/10 border-amber-900/10 text-amber-950/85'
                                    : theme === 'emerald'
                                      ? 'bg-[#182c27]/40 border-[#2d5048]/30 hover:border-[#caae7a]/50 text-emerald-100'
                                      : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-slate-200'
                                }`}
                                title="Hover to inspect passage segment"
                              >
                                <div className="flex items-center justify-between gap-3 font-semibold text-[9.5px]">
                                  <span className={`truncate max-w-[80px] ${theme === 'sepia' ? 'text-amber-900' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-300'}`}>{cit.source}</span>
                                  <span className="opacity-60 font-mono text-[8.5px] shrink-0">{(cit.score * 100).toFixed(0)}% match</span>
                                </div>
                                <div className="text-[9.5px] font-medium opacity-90 truncate max-w-[130px]">{cit.title}</div>
                                
                                {/* Tooltip snippet */}
                                <div className={`absolute bottom-full left-0 mb-2 p-2.5 rounded-xl border opacity-0 pointer-events-none group-hover:opacity-100 backdrop-blur-xl transition-all z-20 w-64 text-[10px] shadow-2xl leading-relaxed ${
                                  theme === 'sepia'
                                    ? 'bg-[#faf6ee] border-amber-900/25 text-[#2d1b0d]'
                                    : theme === 'emerald'
                                      ? 'bg-[#0f211b] border-[#2d5048] text-emerald-100'
                                      : 'bg-slate-900 border-white/10 text-slate-200'
                                }`}>
                                  <div className={`font-bold border-b pb-1 mb-1 opacity-70 ${theme === 'sepia' ? 'border-amber-900/10' : theme === 'emerald' ? 'border-[#2d5048]/30' : 'border-white/10'}`}>Indexed Context:</div>
                                  <p className="whitespace-normal">"{cit.text}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <span className={`text-[8px] font-mono mt-1 ${theme === 'sepia' ? 'text-amber-900/30' : theme === 'emerald' ? 'text-[#a2b0ac]/45' : 'text-white/20'} ${
                      m.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* Live Voice Hotline Active Transcripts Bubbles (rendered seamlessly inside the list) */}
                {liveSession.isConnected && (liveSession.userTranscript || liveSession.aiTranscript) && (
                  <div className={`space-y-4 pt-2 border-t animate-fade-in shrink-0 ${theme === 'sepia' ? 'border-amber-900/10' : theme === 'emerald' ? 'border-[#2d5048]/25' : 'border-white/5'}`}>
                    {liveSession.userTranscript && (
                      <div className="flex flex-col max-w-[85%] self-end ml-auto">
                        <span className={`text-[9px] font-semibold mb-1 tracking-wider uppercase text-right flex items-center gap-1 justify-end font-sans ${theme === 'sepia' ? 'text-emerald-800' : theme === 'emerald' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'sepia' ? 'bg-emerald-850' : 'bg-emerald-400'}`} />
                          You Spoken (Hotline Voice)
                        </span>
                        <div className={`p-3.5 rounded-2xl rounded-tr-none font-sans italic text-xs leading-relaxed animate-pulse text-right border ${theme === 'sepia' ? 'bg-[#2d5048]/5 border-[#2d5048]/15 text-[#2d5048]' : theme === 'emerald' ? 'bg-[#182c27]/50 border-emerald-500/25 text-[#ebf3f1]' : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-100'}`}>
                          "{liveSession.userTranscript}"
                        </div>
                      </div>
                    )}

                    {liveSession.aiTranscript && (
                      <div className="flex flex-col max-w-[85%] self-start mr-auto">
                        <span className={`text-[9px] font-semibold mb-1 tracking-wider uppercase flex items-center gap-1 font-sans ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-purple-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-purple-400'}`} />
                          Al-Mualim (Hotline Speaking)
                        </span>
                        <div className={`p-4 rounded-2xl rounded-tl-none font-sans text-xs leading-relaxed text-left whitespace-pre-wrap border ${theme === 'sepia' ? 'bg-amber-900/5 border-amber-900/10 text-[#2d1b0d]' : theme === 'emerald' ? 'bg-[#182c27]/40 border-[#2d5048]/25 text-[#ebf3f1]' : 'bg-purple-600/10 border-purple-500/20 text-indigo-100'}`}>
                          {liveSession.aiTranscript}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* System Formulating Reciprocal Indicator */}
                {isLoading && (
                  <div className="flex flex-col py-1 mr-auto max-w-[85%]">
                    <span className={`text-[9px] font-bold tracking-widest uppercase mb-1 text-left ${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-amber-300'}`}>
                      Al-Mualim is formulating...
                    </span>
                    <div className={`flex gap-1 py-3 px-3.5 rounded-2xl rounded-tl-none items-center justify-center min-w-[70px] border ${theme === 'sepia' ? 'bg-[#faf6ee] border-amber-900/10' : theme === 'emerald' ? 'bg-[#182c27]/40 border-[#2d5048]/25' : 'bg-white/[0.02] border-white/5'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${theme === 'sepia' ? 'bg-amber-800' : theme === 'emerald' ? 'bg-[#caae7a]' : 'bg-indigo-400'}`} />
                    </div>
                  </div>
                )}

                {/* Secure Secrets and System Logs warnings */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2.5 text-red-300 text-xs items-start text-left">
                    <div className="space-y-1">
                      <p className="font-semibold">Scholar System Notice</p>
                      <p className="text-red-300/80 leading-relaxed">
                        {error.includes("GEMINI_API_KEY") 
                          ? "The AI API key is missing. Add your GEMINI_API_KEY inside Settings > Secrets."
                          : error
                        }
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Pinned Minimal Ayat Context Indicator (Saves enormous space) */}
              {currentSurah && currentAyahObj && (
                <div className={`px-4 py-2 border-t border-b flex items-center justify-between gap-2 flex-shrink-0 text-[10px] ${theme === 'sepia' ? 'bg-[#faf6ee] border-amber-900/10' : theme === 'emerald' ? 'bg-[#182a25] border-[#2d5048]/25' : 'bg-white/[0.015] border-white/5'}`}>
                  <div className={`flex items-center gap-1.5 truncate text-left ${theme === 'sepia' ? 'text-amber-950/65' : theme === 'emerald' ? 'text-[#a2b0ac]' : 'text-white/50'}`}>
                    <BookOpen size={11} className={`${theme === 'sepia' ? 'text-amber-800' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-400'} shrink-0`} />
                    <span>Focusing: <strong className={`font-sans ${theme === 'sepia' ? 'text-amber-900' : theme === 'emerald' ? 'text-[#caae7a]' : 'text-indigo-300'}`}>{currentSurah.englishName} ({currentAyahObj.numberInSurah})</strong></span>
                  </div>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-widest uppercase shrink-0 border ${theme === 'sepia' ? 'bg-amber-800/10 border-amber-900/15 text-amber-850' : theme === 'emerald' ? 'bg-[#caae7a]/15 border-[#caae7a]/35 text-[#caae7a]' : 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300'}`}>
                    Active Verse
                  </span>
                </div>
              )}

              {/* Chat Input Console */}
              <div className={`p-4 border-t flex-shrink-0 ${theme === 'sepia' ? 'border-amber-900/15 bg-amber-900/5' : theme === 'emerald' ? 'border-[#2d5048]/30 bg-[#182a25]/45' : 'border-white/10 bg-white/[0.015]'}`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2 items-center"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Al-Mualim about rulings, exegesis, wisdom..."
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2.5 border rounded-xl text-xs md:text-sm focus:outline-none transition-all font-sans ${theme === 'sepia' ? 'border-amber-900/15 bg-white text-[#2d1b0d] placeholder-amber-900/40 focus:border-amber-800' : theme === 'emerald' ? 'border-[#2d5048]/30 bg-[#13201d]/60 text-[#ebf3f1] placeholder-[#a2b0ac]/40 focus:border-[#caae7a]' : 'border-white/10 bg-white/5 text-white placeholder-white/30 focus:border-indigo-500'}`}
                  />

                  {/* Speech / Voice input handler */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`p-2.5 rounded-xl flex items-center justify-center border transition-all ${
                      isListening
                        ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                        : theme === 'sepia'
                          ? 'bg-white hover:bg-amber-900/5 text-amber-955/70 border-amber-905/15'
                          : theme === 'emerald'
                            ? 'bg-[#13201d]/60 hover:bg-[#182c27] text-[#caae7a]/70 border-[#2d5048]/30'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/5'
                    }`}
                    title={isListening ? "Stop listening" : "Click to type with your voice"}
                  >
                    {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all border ${
                      input.trim() && !isLoading
                        ? themeClasses.buttonActive + ' cursor-pointer shadow-md'
                        : theme === 'sepia'
                          ? 'bg-amber-900/5 text-amber-905/20 border-amber-900/10 cursor-not-allowed'
                          : theme === 'emerald'
                            ? 'bg-[#13201d]/30 text-emerald-950/40 border-[#2d5048]/25 cursor-not-allowed'
                            : 'bg-white/5 border border-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <Send size={15} />
                  </button>
                </form>

                {/* Speech status ticker HUD */}
                {isListening && (
                  <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15 text-[9.5px] text-red-200 animate-pulse font-sans">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                    <span>Listening ({selectedLanguage}). Speak now or try 'pause', 'next verse', 'play'...</span>
                  </div>
                )}

                {speechError && (
                  <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-[9px] text-red-300 font-sans leading-relaxed text-left">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-red-200">Voice Note</p>
                      <p>{speechError} Opening the app in a new browser tab permits permanent microphone frames access.</p>
                    </div>
                  </div>
                )}
              </div>
    </motion.div>
  );

  if (isInline) {
    return chatContent;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm"
            />
            {chatContent}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
