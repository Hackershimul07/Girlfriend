import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Volume2, VolumeX, AlertCircle, Sparkles } from 'lucide-react';
import { AudioStreamer } from './lib/audio-streamer';
import { LiveSession, SessionState } from './lib/live-session';

export default function App() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API Key is missing. Please check your environment variables.");
      return;
    }
    
    audioStreamerRef.current = new AudioStreamer(16000);
    liveSessionRef.current = new LiveSession(apiKey);

    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    if (!liveSessionRef.current || !audioStreamerRef.current) return;

    setError(null);
    try {
      await liveSessionRef.current.connect({
        onStateChange: (newState) => setState(newState),
        onAudioChunk: (base64) => {
          if (!isMuted) {
            audioStreamerRef.current?.addAudioChunk(base64);
          }
        },
        onInterrupted: () => {
          // Handle interruption if needed (e.g., clear playback queue)
        },
        onError: (err) => {
          console.error("Live Session Error:", err);
          setError("Connection failed. Zoya is having some trouble right now.");
        }
      });

      await audioStreamerRef.current.startRecording((base64) => {
        liveSessionRef.current?.sendAudio(base64);
      });
    } catch (err) {
      console.error("Start Session Error:", err);
      setError("Could not access microphone or connect to Zoya.");
      setState("disconnected");
    }
  };

  const stopSession = () => {
    audioStreamerRef.current?.stopRecording();
    liveSessionRef.current?.disconnect();
    setState("disconnected");
  };

  const toggleSession = () => {
    if (state === "disconnected") {
      startSession();
    } else {
      stopSession();
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "connecting": return "Waking up Zoya...";
      case "connected": return "Zoya is listening...";
      case "listening": return "Zoya is listening...";
      case "speaking": return "Zoya is speaking...";
      default: return "Zoya is sleeping";
    }
  };

  const getOrbColor = () => {
    switch (state) {
      case "connecting": return "bg-zoya-purple";
      case "speaking": return "bg-zoya-cyan";
      case "listening": return "bg-zoya-purple";
      case "connected": return "bg-zoya-pink";
      default: return "bg-gray-800";
    }
  };

  const getOrbGlow = () => {
    switch (state) {
      case "speaking": return "glow-orb-speaking";
      case "listening": return "glow-orb-listening";
      case "connected": return "glow-orb";
      default: return "";
    }
  };

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center bg-black overflow-hidden font-sans">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-zoya-pink/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zoya-purple/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-zoya-cyan/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center gap-12 max-w-md w-full px-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-display font-bold tracking-tight text-white flex items-center justify-center gap-2"
          >
            Zoya <Sparkles className="w-6 h-6 text-zoya-pink" />
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zoya-pink/60 text-sm font-medium uppercase tracking-[0.2em]"
          >
            Your Sassy AI Bestie
          </motion.p>
        </header>

        {/* Central Orb */}
        <div className="relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: state === "speaking" ? [1, 1.1, 1] : 1,
                opacity: 1 
              }}
              transition={{ 
                scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                opacity: { duration: 0.5 }
              }}
              className={`w-48 h-48 rounded-full ${getOrbColor()} ${getOrbGlow()} transition-all duration-700 relative z-20 flex items-center justify-center`}
            >
              {state === "disconnected" ? (
                <MicOff className="w-12 h-12 text-white/20" />
              ) : (
                <div className="flex gap-1 items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: state === "speaking" || state === "listening" ? [10, 30, 10] : 4 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.5, 
                        delay: i * 0.1,
                        ease: "easeInOut"
                      }}
                      className="w-1 bg-white rounded-full"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Decorative Rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute w-64 h-64 border border-white/5 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className="absolute w-72 h-72 border border-white/5 rounded-full border-dashed"
          />
        </div>

        {/* Status & Controls */}
        <div className="w-full flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-white/80 font-display text-lg tracking-wide">
              {getStatusText()}
            </p>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full border transition-all ${
                isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleSession}
              disabled={state === "connecting"}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                state === "disconnected" 
                  ? 'bg-zoya-pink hover:bg-zoya-pink/90 text-white' 
                  : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
              }`}
            >
              {state === "disconnected" ? (
                <Power className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <div className="w-14" /> {/* Spacer for symmetry */}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-8 z-10 opacity-30">
        <p className="text-[10px] uppercase tracking-[0.4em] font-mono">
          Powered by Gemini 3.1 Live
        </p>
      </footer>
    </div>
  );
}

