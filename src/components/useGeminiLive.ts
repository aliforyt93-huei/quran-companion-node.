import { useState, useEffect, useRef } from 'react';

export interface UseGeminiLiveOptions {
  onTranscriptChange?: (user: string, ai: string) => void;
}

export function useGeminiLive(options?: UseGeminiLiveOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'listening' | 'speaking' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const [userTranscript, setUserTranscriptState] = useState('');
  const [aiTranscript, setAiTranscriptState] = useState('');
  const [isMuted, setIsMutedState] = useState(false);

  const userTranscriptRef = useRef('');
  const aiTranscriptRef = useRef('');
  const isMutedRef = useRef(false);

  const setUserTranscript = (val: string) => {
    userTranscriptRef.current = val;
    setUserTranscriptState(val);
  };

  const setAiTranscript = (val: string) => {
    aiTranscriptRef.current = val;
    setAiTranscriptState(val);
  };

  const setIsMuted = (val: boolean) => {
    isMutedRef.current = val;
    setIsMutedState(val);
  };

  const sendTextMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMicStreamingAllowedRef = useRef<boolean>(false);
  const micTimeoutRef = useRef<any>(null);

  // Real-time jitter buffer playout queue to absorb packet transport variations
  const playQueueRef = useRef<{ floatArray: Float32Array; duration: number }[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const flushTimeoutRef = useRef<any>(null);

  // Cleanup helper
  const forceCleanup = () => {
    // Stop WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    // Stop microphone streaming
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      micStreamRef.current = null;
    }

    // Stop mic audio context/processor
    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch (e) {}
      micProcessorRef.current = null;
    }
    if (micAudioCtxRef.current) {
      try {
        micAudioCtxRef.current.close();
      } catch (e) {}
      micAudioCtxRef.current = null;
    }

    // Stop any scheduled playback sources
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    if (micTimeoutRef.current) {
      clearTimeout(micTimeoutRef.current);
      micTimeoutRef.current = null;
    }
    isMicStreamingAllowedRef.current = false;
    playQueueRef.current = [];
    isPlayingRef.current = false;

    // Reset contexts
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }

    setIsMuted(false);
    setIsConnected(false);
    setIsConnecting(false);
  };

  const startSession = async (context?: {
    surahName?: string;
    ayahNumber?: number | string;
    translation?: string;
    arabicText?: string;
    customText?: string;
    language?: string;
    mode?: 'recitation' | 'qa';
    userName?: string;
  }) => {
    forceCleanup();
    setIsConnecting(true);
    setLiveStatus('connecting');
    setError(null);
    setUserTranscript('');
    setAiTranscript('');

    // Pre-initialize and warm up the playback AudioContext early!
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(err => {
          console.warn("[early audio context resume failed]:", err);
        });
      }
    } catch (e) {
      console.warn("Could not pre-warm playback AudioContext, will retry on play:", e);
    }

    // Pre-initialize and warm up the microphone AudioContext early!
    try {
      if (!micAudioCtxRef.current) {
        micAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (micAudioCtxRef.current.state === 'suspended') {
        micAudioCtxRef.current.resume().catch(err => {
          console.warn("[early mic audio context resume failed]:", err);
        });
      }
    } catch (e) {
      console.warn("Could not pre-warm mic AudioContext:", e);
    }

    try {
      // 1. Establish custom WebSocket protocol and connect to port 3000 bridged live-ws endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = `${protocol}//${window.location.host}/api/live-ws`;

      if (context) {
        const params = new URLSearchParams();
        if (context.surahName) params.set("surah", context.surahName);
        if (context.ayahNumber) params.set("ayah", String(context.ayahNumber));
        if (context.translation) params.set("text", context.translation);
        if (context.arabicText) params.set("arabicText", context.arabicText);
        if (context.customText) params.set("customText", context.customText);
        if (context.language) params.set("language", context.language);
        if (context.mode) params.set("mode", context.mode);

        const savedUserName = context.userName || 
                              localStorage.getItem('al_mualim_user_name') || 
                              localStorage.getItem('quran_user_name') || 
                              localStorage.getItem('user_name') || 
                              localStorage.getItem('userName') || 
                              localStorage.getItem('name');
        if (savedUserName) {
          params.set("userName", savedUserName);
        }

        wsUrl += `?${params.toString()}`;
      } else {
        const params = new URLSearchParams();
        const savedUserName = localStorage.getItem('al_mualim_user_name') || 
                              localStorage.getItem('quran_user_name') || 
                              localStorage.getItem('user_name') || 
                              localStorage.getItem('userName') || 
                              localStorage.getItem('name');
        if (savedUserName) {
          params.set("userName", savedUserName);
          wsUrl += `?${params.toString()}`;
        }
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setError("Connection timed out. Gemini Live server might be under heavy load.");
          setLiveStatus('error');
          setIsConnecting(false);
        }
      }, 7000);

      ws.onopen = async () => {
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        setIsConnected(true);
        setLiveStatus('listening');
        isMicStreamingAllowedRef.current = false;

        // Start capturing the user's mic at 16000Hz PCM
        await startMicRecording();

        // Safety timeout to allow mic stream even if server audio is delayed
        if (micTimeoutRef.current) clearTimeout(micTimeoutRef.current);
        micTimeoutRef.current = setTimeout(() => {
          isMicStreamingAllowedRef.current = true;
        }, 4000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.error) {
            setError(message.error);
            setLiveStatus('error');
            forceCleanup();
            return;
          }

          const serverContent = message.serverContent || message;

          // A. Handle potential session interruption immediately
          if (serverContent?.interrupted) {
            handleInterruption();
            return;
          }

          // B. Decode and play model voice output (24000Hz Raw PCM)
          // Look for inlineData inside the model turn parts
          const modelParts = serverContent?.modelTurn?.parts;
          if (modelParts && Array.isArray(modelParts)) {
            for (const part of modelParts) {
              if (part.inlineData && part.inlineData.data) {
                playAudioPCM(part.inlineData.data);
              }
              if (part.text) {
                const nextAi = aiTranscriptRef.current + part.text;
                setAiTranscript(nextAi);
                if (options?.onTranscriptChange) {
                  options.onTranscriptChange(userTranscriptRef.current, nextAi);
                }
              }
            }
          }

          // C. Handle real-time audio output transcription if enabled
          const outputAudioTranscription = serverContent?.outputTranscription || serverContent?.outputAudioTranscription || serverContent?.output_audio_transcription || message?.outputTranscription || message?.outputAudioTranscription || message?.output_audio_transcription;
          if (outputAudioTranscription) {
            const outTrans = outputAudioTranscription;
            const textPart = outTrans.text || (outTrans.parts && Array.isArray(outTrans.parts) ? outTrans.parts.map((p: any) => p.text || "").join("") : "");
            if (textPart) {
              const nextAi = aiTranscriptRef.current + textPart;
              setAiTranscript(nextAi);
              if (options?.onTranscriptChange) {
                options.onTranscriptChange(userTranscriptRef.current, nextAi);
              }
            }
          }

          // D. Handle real-time user speech input transcription
          const inputAudioTranscription = serverContent?.inputTranscription || serverContent?.inputAudioTranscription || serverContent?.input_audio_transcription || message?.inputTranscription || message?.inputAudioTranscription || message?.input_audio_transcription;
          if (inputAudioTranscription) {
            const inTrans = inputAudioTranscription;
            const textPart = inTrans.text || (inTrans.parts && Array.isArray(inTrans.parts) ? inTrans.parts.map((p: any) => p.text || "").join("") : "");
            if (textPart) {
              const nextUser = userTranscriptRef.current + textPart;
              setUserTranscript(nextUser);
              if (options?.onTranscriptChange) {
                options.onTranscriptChange(nextUser, aiTranscriptRef.current);
              }
            }
          }

        } catch (err) {
          console.error("Failed to process Live session frame:", err);
        }
      };

      ws.onerror = (e) => {
        console.error("Live WebSocket connection error:", e);
        setError(prev => prev || "WebSocket link interrupted. Offline mode triggered.");
        setLiveStatus('error');
        forceCleanup();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setLiveStatus('disconnected');
        forceCleanup();
      };

    } catch (err: any) {
      console.error("Failsafe failed initiating Live Speech:", err);
      setError(err?.message || "Speech service is temporarily constrained.");
      setLiveStatus('error');
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    forceCleanup();
    setLiveStatus('disconnected');
  };

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      if (!micAudioCtxRef.current) {
        micAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      const micAudioCtx = micAudioCtxRef.current;
      if (micAudioCtx.state === 'suspended') {
        await micAudioCtx.resume().catch(e => console.warn("Failed to resume mic context on start:", e));
      }
      
      const source = micAudioCtx.createMediaStreamSource(stream);
      const processor = micAudioCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(micAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;
        if (!isMicStreamingAllowedRef.current) return; // Block mic packets during initial AI greeting

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        if (pcmBuffer.byteLength > 0) {
          const base64PCM = arrayBufferToBase64(pcmBuffer);
          wsRef.current.send(JSON.stringify({ audio: base64PCM }));
        }
      };
    } catch (err) {
      console.error("[Live Mic Recording Access Error]", err);
      setError("Active microphone access is required for Al-Mualim Voice conversations.");
      setLiveStatus('error');
      forceCleanup();
    }
  };

  const triggerQueuePlayoutFlush = () => {
    if (playQueueRef.current.length > 0 && !isPlayingRef.current) {
      isPlayingRef.current = true;
      if (audioCtxRef.current) {
        nextStartTimeRef.current = audioCtxRef.current.currentTime + 0.05;
        processPlayQueue();
      }
    }
  };

  const processPlayQueue = () => {
    if (!audioCtxRef.current) return;
    const audioCtx = audioCtxRef.current;

    // Wait until we accumulate a small jitter cushion (at least 3 chunks or 150ms of audio)
    // before we start triggering playout back-to-back.
    if (!isPlayingRef.current) {
      const totalBufferedDuration = playQueueRef.current.reduce((acc, c) => acc + c.duration, 0);
      if (totalBufferedDuration < 0.15 && playQueueRef.current.length < 3) {
        return;
      }
      isPlayingRef.current = true;
      nextStartTimeRef.current = audioCtx.currentTime + 0.06;
      setLiveStatus('speaking');
    }

    // Dequeue and continuously schedule playout frames
    while (playQueueRef.current.length > 0) {
      const currentTime = audioCtx.currentTime;

      // Stream underflow protection: if scheduler pointer is in the past, reset it to current time
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.05;
      }

      const nextChunk = playQueueRef.current.shift();
      if (!nextChunk) break;

      const audioBuffer = audioCtx.createBuffer(1, nextChunk.floatArray.length, 24000);
      audioBuffer.getChannelData(0).set(nextChunk.floatArray);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      scheduledSourcesRef.current.push(source);

      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
        if (scheduledSourcesRef.current.length === 0 && playQueueRef.current.length === 0) {
          isPlayingRef.current = false;
          setLiveStatus('listening');
        }
      };

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      setLiveStatus('speaking');
    }
  };

  const playAudioPCM = (base64PCM: string) => {
    // Enable microphone stream now that Al-Mualim has started sending the initial greeting
    isMicStreamingAllowedRef.current = true;
    if (micTimeoutRef.current) {
      clearTimeout(micTimeoutRef.current);
      micTimeoutRef.current = null;
    }

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioCtx = audioCtxRef.current;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const binary = window.atob(base64PCM);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Ensure the byte length is a multiple of 2 to prevent RangeError when constructing Int16Array
      const alignedLength = Math.floor(bytes.length / 2) * 2;
      const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, alignedLength / 2);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const duration = float32Array.length / 24000;
      playQueueRef.current.push({ floatArray: float32Array, duration });

      // Process playout queue with jitter buffering
      processPlayQueue();

      // Clear any pending flush timeout and set a new one to flush trailing sentence buffers
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushTimeoutRef.current = setTimeout(triggerQueuePlayoutFlush, 80);
    } catch (err) {
      console.error("[Speech Synthesis Playout Error]:", err);
    }
  };

  const handleInterruption = () => {
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    playQueueRef.current = [];
    isPlayingRef.current = false;
    setLiveStatus('listening');
  };

  // Convert browser Float32 to standard Int16 Linear PCM
  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  // Safe base64 converter compatible with large buffers
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    liveStatus,
    error,
    userTranscript,
    aiTranscript,
    isMuted,
    setIsMuted,
    sendTextMessage,
    startSession,
    stopSession,
  };
}
