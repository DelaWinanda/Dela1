import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, MessageSquareCode, Sparkles, Check, Play, AlertCircle, HelpCircle } from "lucide-react";

interface VoiceAssistantProps {
  onRelayCommand: (relayStates: boolean[], variMode: number, explanation: string) => void;
  currentRelayStates: boolean[];
  currentVariMode: number;
}

// Browser Web Speech recognition interface
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export default function VoiceAssistant({
  onRelayCommand,
  currentRelayStates,
  currentVariMode
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [language, setLanguage] = useState("id-ID"); // Indonesia default
  const [supportSpeech, setSupportSpeech] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech Recognition support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSupportSpeech(false);
      return;
    }

    const rec = new SpeechRecognitionClass() as SpeechRecognition;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = language;

    rec.onstart = () => {
      setIsListening(true);
      setStatusMsg("Mendengarkan suara...");
      setTranscript("");
      setInterimTranscript("");
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interTranscript = "";

      for (let i = event.resultIndex; i < (event.results as any).length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interTranscript += event.results[i][0].transcript;
        }
      }

      setTranscript(finalTranscript || interTranscript);
      setInterimTranscript(interTranscript);
    };

    rec.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e);
      if (e.error === "no-speech") {
        setStatusMsg("Tidak terdengar suara. Silakan coba lagi.");
      } else if (e.error === "not-allowed") {
        setStatusMsg("Izin mikrofon ditolak. Aktifkan mikrofon di browser.");
      } else {
        setStatusMsg(`Error: ${e.error}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      // Trigger execution when listening ends
    };

    recognitionRef.current = rec;
  }, [language]);

  // Handle execution of the current transcript
  useEffect(() => {
    if (!isListening && transcript.trim().length > 0) {
      processCommand(transcript);
    }
  }, [isListening]);

  const toggleListen = () => {
    if (!supportSpeech) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start speech:", err);
      }
    }
  };

  // 1. Direct local parser (Instant - 0ms delay)
  const localParse = (lower: string): { matched: boolean; relays?: boolean[]; variMode?: number; explanation?: string } | null => {
    // Helper state copy
    const target = [...currentRelayStates];

    // ALL OFF / ON Commands
    if (lower.includes("matikan semua") || lower.includes("all off") || lower.includes("mati semua") || lower.includes("off semua")) {
      return { matched: true, relays: [false, false, false, false], variMode: 0, explanation: "Semua relay dimatikan." };
    }
    if (lower.includes("nyalakan semua") || lower.includes("all on") || lower.includes("hidupkan semua") || lower.includes("on semua")) {
      return { matched: true, relays: [true, true, true, true], variMode: 0, explanation: "Semua relay dinyalakan." };
    }

    // Individual Relay ON
    if (lower.includes("relay 1 on") || lower.includes("nyalakan relay 1") || lower.includes("nyalakan lampu 1") || lower.includes("hidupkan relay 1")) {
      target[0] = true;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 1 dinyalakan." };
    }
    if (lower.includes("relay 2 on") || lower.includes("nyalakan relay 2") || lower.includes("nyalakan lampu 2") || lower.includes("hidupkan relay 2")) {
      target[1] = true;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 2 dinyalakan." };
    }
    if (lower.includes("relay 3 on") || lower.includes("nyalakan relay 3") || lower.includes("nyalakan lampu 3") || lower.includes("hidupkan relay 3")) {
      target[2] = true;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 3 dinyalakan." };
    }
    if (lower.includes("relay 4 on") || lower.includes("nyalakan relay 4") || lower.includes("nyalakan lampu 4") || lower.includes("hidupkan relay 4")) {
      target[3] = true;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 4 dinyalakan." };
    }

    // Individual Relay OFF
    if (lower.includes("relay 1 off") || lower.includes("matikan relay 1") || lower.includes("matikan lampu 1") || lower.includes("padamkan relay 1")) {
      target[0] = false;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 1 dimatikan." };
    }
    if (lower.includes("relay 2 off") || lower.includes("matikan relay 2") || lower.includes("matikan lampu 2") || lower.includes("padamkan relay 2")) {
      target[1] = false;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 2 dimatikan." };
    }
    if (lower.includes("relay 3 off") || lower.includes("matikan relay 3") || lower.includes("matikan lampu 3") || lower.includes("padamkan relay 3")) {
      target[2] = false;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 3 dimatikan." };
    }
    if (lower.includes("relay 4 off") || lower.includes("matikan relay 4") || lower.includes("matikan lampu 4") || lower.includes("padamkan relay 4")) {
      target[3] = false;
      return { matched: true, relays: target, variMode: 0, explanation: "Relay 4 dimatikan." };
    }

    // Variations Selection local triggers
    if (lower.includes("variasi 1") || lower.includes("variasi satu") || lower.includes("pola 1")) {
      return { matched: true, relays: [false, false, false, false], variMode: 1, explanation: "Mode Variasi 1 (Maju) diaktifkan." };
    }
    if (lower.includes("variasi 2") || lower.includes("variasi dua") || lower.includes("pola 2")) {
      return { matched: true, relays: [false, false, false, false], variMode: 2, explanation: "Mode Variasi 2 (Mundur) diaktifkan." };
    }
    if (lower.includes("stop variasi") || lower.includes("hentikan variasi") || lower.includes("variasi stop") || lower.includes("pola stop")) {
      return { matched: true, relays: [false, false, false, false], variMode: 0, explanation: "Animasi pola variasi dihentikan." };
    }

    return null;
  };

  // Match command
  const processCommand = async (text: string) => {
    const textLower = text.toLowerCase().trim();
    setStatusMsg(`Memproses: "${text}"`);

    // 1. Check local quick matching
    const localMatch = localParse(textLower);
    if (localMatch && localMatch.relays) {
      setStatusMsg(`[Offline Match] ${localMatch.explanation}`);
      onRelayCommand(localMatch.relays, localMatch.variMode ?? 0, localMatch.explanation ?? "Berhasil diproses secara lokal.");
      return;
    }

    // 2. Fallback to Gemini AI Server for Smart contextual parsing
    setAiLoading(true);
    setStatusMsg("Menerjemahkan dengan Gemini AI...");
    try {
      const response = await fetch("/api/gemini/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          currentRelays: currentRelayStates,
          currentVariMode: currentVariMode
        })
      });

      const data = await response.json();
      if (data.success) {
        setStatusMsg(`[Gemini Smart Match] ${data.explanation}`);
        onRelayCommand(data.relayStates, data.variMode, data.explanation);
      } else {
        setStatusMsg("Maaf, perintah kurang jelas atau Gemini gagal memproses.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg("Menghubungi AI gagal. Gunakan kata kunci langsung (contoh: 'Nyalakan relay 1').");
    } finally {
      setAiLoading(false);
    }
  };

  const sampleCommands = [
    { title: "Nyalakan Relay 1", sub: "Lokal (0ms)" },
    { title: "Matikan semua", sub: "Lokal (0ms)" },
    { title: "Mulai pola variasi satu", sub: "Lokal (0ms)" },
    { title: "Suhu terasa rada gerah nih, tolong nyalain relay 1 & 3", sub: "AI Gemini" }
  ];

  return (
    <div className="bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-lg h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-all border ${isListening ? "bg-red-500/10 text-red-400 border-red-500/25 animate-pulse" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}`}>
              {isListening ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-snug">Asisten Suara Pintar</h3>
              <p className="text-gray-500 text-xs mt-0.5">Kontrol IoT terintegrasi pengenar suara</p>
            </div>
          </div>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            id="select-voice-language"
            className="text-xs bg-black/20 border border-white/10 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 text-gray-300 font-semibold font-mono"
          >
            <option value="id-ID">Bahasa Indonesia</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        {!supportSpeech ? (
          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex gap-3 text-xs text-amber-400 leading-relaxed mb-6 font-mono">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold mb-0.5">Perekam Suara Tidak Didukung</p>
              Browser Anda tidak mendukung Web Speech API. Gunakan peramban Google Chrome atau Safari di HP untuk akses mic langsung.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-black/10 rounded-2xl border border-white/5 mb-5 relative group">
            
            {/* Waveform Animation */}
            {isListening ? (
              <div className="flex items-center gap-1.5 h-10 mb-6 font-mono text-xs text-indigo-400">
                <span className="w-1 bg-red-400 h-8 rounded animate-bounce [animation-delay:0.1s]" />
                <span className="w-1 bg-red-500 h-10 rounded animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 bg-red-400 h-6 rounded animate-bounce [animation-delay:0.3s]" />
                <span className="w-1 bg-red-500 h-9 rounded animate-bounce [animation-delay:0.4s]" />
                <span className="w-1 bg-rose-400 h-5 rounded animate-bounce [animation-delay:0.5s]" />
              </div>
            ) : (
              <div className="h-10 mb-6 flex items-center justify-center text-gray-500 text-xs font-medium">
                Klik tombol mikrofon untuk berbicara
              </div>
            )}

            {/* Floating mic button */}
            <button
              onClick={toggleListen}
              id="btn-voice-recorder"
              className={`p-6 rounded-full transition-all duration-300 relative cursor-pointer ${
                isListening
                  ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] scale-105"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-[0_0_15px_rgba(99,102,241,0.35)] active:scale-95"
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>

            {/* Transcript Area */}
            {(transcript || interimTranscript) && (
              <div className="w-full text-center mt-6">
                <p className="text-white font-medium text-sm leading-relaxed px-2">
                  &ldquo;{transcript || interimTranscript}&rdquo;
                </p>
              </div>
            )}
            
            {/* Action status message */}
            {statusMsg && (
              <div className="mt-4 flex items-center gap-2 text-xs bg-black/40 border border-white/10 text-gray-300 px-3.5 py-1.5 rounded-full shadow-sm max-w-full truncate">
                {aiLoading ? (
                  <div className="w-2 h-2 rounded-full border border-sky-400 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested prompts list */}
      <div>
        <div className="space-y-2 bg-[#1c212b] rounded-2xl p-4.5 border border-white/5">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            Ide Perintah Suara
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
            {sampleCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => processCommand(cmd.title)}
                id={`btn-voice-suggest-${idx}`}
                disabled={aiLoading}
                className="p-3 bg-black/20 hover:bg-white/5 border border-white/10 rounded-xl leading-snug text-left flex flex-col transition-all cursor-pointer hover:border-indigo-500 font-medium text-gray-200 group active:scale-95"
              >
                <span className="text-gray-200 group-hover:text-white transition-colors">{cmd.title}</span>
                <span className="text-[9px] text-gray-500 tracking-wide font-normal mt-1 block font-mono">
                  {cmd.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
