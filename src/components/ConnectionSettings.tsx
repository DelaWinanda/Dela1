import { useState } from "react";
import { ConnectionInfo } from "../types";
import { 
  Wifi, 
  Send, 
  Settings2, 
  Play, 
  Check, 
  X, 
  Globe, 
  Link2, 
  HelpCircle,
  RefreshCw
} from "lucide-react";

interface ConnectionSettingsProps {
  settings: ConnectionInfo;
  onChange: (settings: ConnectionInfo) => void;
  onPingTest: () => Promise<boolean>;
  onTelegramTest: () => Promise<boolean>;
}

export default function ConnectionSettings({
  settings,
  onChange,
  onPingTest,
  onTelegramTest
}: ConnectionSettingsProps) {
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<"idle" | "success" | "failed">("idle");
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<"idle" | "success" | "failed">("idle");
  const [showConfig, setShowConfig] = useState(false);

  const updateSetting = <K extends keyof ConnectionInfo>(key: K, value: ConnectionInfo[K]) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  const handlePing = async () => {
    setTestingPing(true);
    setPingResult("idle");
    try {
      const ok = await onPingTest();
      setPingResult(ok ? "success" : "failed");
    } catch {
      setPingResult("failed");
    } finally {
      setTestingPing(false);
    }
  };

  const handleTelegramTest = async () => {
    setTestingTelegram(true);
    setTelegramResult("idle");
    try {
      const ok = await onTelegramTest();
      setTelegramResult(ok ? "success" : "failed");
    } catch {
      setTelegramResult("failed");
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-md transition-all duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1c212b] text-indigo-400 rounded-xl border border-white/5">
            <Settings2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base leading-snug">Metode Sambungan ESP32</h3>
            <p className="text-gray-500 text-xs mt-0.5">Pilih jalur komunikasi kontroler</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          id="btn-toggle-config-panel"
          className="p-2 bg-[#1c212b] hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all border border-white/5"
          title="Detail Setelan"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        {/* Simulator mode card */}
        <button
          onClick={() => updateSetting("mode", "simulator")}
          id="btn-mode-simulator"
          className={`flex flex-col items-start p-4 rounded-xl text-left border-2 transition-all active:scale-95 duration-200 cursor-pointer ${
            settings.mode === "simulator"
              ? "border-emerald-500 bg-emerald-500/5 text-white shadow-[0_0_12px_rgba(16,185,129,0.06)]"
              : "border-white/5 hover:border-white/10 bg-[#1c212b]/60 hover:bg-[#1c212b] text-gray-400"
          }`}
        >
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mb-3 ${
            settings.mode === "simulator"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-white/5 text-gray-500"
          }`}>
            Simulator
          </span>
          <span className="font-semibold text-sm">Mode Simulasi</span>
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            Mencoba dashboard dan sensor tiruan secara instan.
          </p>
        </button>

        {/* Direct IP mode card */}
        <button
          onClick={() => updateSetting("mode", "direct_ip")}
          id="btn-mode-direct-ip"
          className={`flex flex-col items-start p-4 rounded-xl text-left border-2 transition-all active:scale-95 duration-200 cursor-pointer ${
            settings.mode === "direct_ip"
              ? "border-cyan-500/40 bg-cyan-500/5 text-white shadow-[0_0_12px_rgba(6,182,212,0.06)]"
              : "border-white/5 hover:border-white/10 bg-[#1c212b]/60 hover:bg-[#1c212b] text-gray-400"
          }`}
        >
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mb-3 ${
            settings.mode === "direct_ip"
              ? "bg-cyan-500/15 text-cyan-400"
              : "bg-white/5 text-gray-500"
          }`}>
            Sangat Cepat
          </span>
          <span className="font-semibold text-sm flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            Direct IP Lokal
          </span>
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            Menghubungkan langsung via LAN/WiFi (0ms latency).
          </p>
        </button>

        {/* Telegram Cloud mode card */}
        <button
          onClick={() => updateSetting("mode", "telegram")}
          id="btn-mode-telegram"
          className={`flex flex-col items-start p-4 rounded-xl text-left border-2 transition-all active:scale-95 duration-200 cursor-pointer ${
            settings.mode === "telegram"
              ? "border-blue-500/40 bg-blue-500/5 text-white shadow-[0_0_12px_rgba(59,130,246,0.06)]"
              : "border-white/5 hover:border-white/10 bg-[#1c212b]/60 hover:bg-[#1c212b] text-gray-400"
          }`}
        >
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mb-3 ${
            settings.mode === "telegram"
              ? "bg-blue-500/15 text-blue-400"
              : "bg-white/5 text-gray-500"
          }`}>
            Akses Awan
          </span>
          <span className="font-semibold text-sm flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            Telegram Cloud
          </span>
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            Kontrol global jarak jauh via bot resmi Telegram.
          </p>
        </button>
      </div>

      {/* Connection Mode Fields (Conditionally visible based on selection or showConfig) */}
      {(settings.mode !== "simulator" || showConfig) && (
        <div className="bg-[#1c212b] rounded-xl p-5 border border-white/5 animate-fadeIn space-y-4">
          
          {/* Direct IP Fields */}
          {(settings.mode === "direct_ip" || showConfig) && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                Alamat IP Lokal ESP32
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={settings.espIp}
                    id="input-esp-ip"
                    onChange={(e) => updateSetting("espIp", e.target.value)}
                    placeholder="Contoh: 192.168.1.50"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-white placeholder:text-gray-600 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
                <button
                  onClick={handlePing}
                  disabled={testingPing || !settings.espIp}
                  id="btn-test-ping-esp"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 active:scale-95 disabled:bg-white/5 disabled:border-white/5 disabled:text-gray-600 border border-transparent text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                >
                  {testingPing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Ping"
                  )}
                </button>
              </div>

              {pingResult === "success" && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium ml-1 font-mono">
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  ESP32 terdeteksi online! Respon sangat cepat.
                </p>
              )}
              {pingResult === "failed" && (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-2.5 mt-2 text-rose-300 text-[11px] leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-rose-400">
                    <X className="w-3.5 h-3.5" />
                    Koneksi Direct IP Gagal
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1 text-rose-400/80 font-mono">
                    <li>Pastikan laptop/HP berada di Wi-Fi yang sama (<strong>"Kocakk"</strong>).</li>
                    <li>Sematkan IP Address ESP32 yang benar (Ditemukan di Arduino Serial Monitor).</li>
                    <li>Gunakan firmware upgrade yang kami sediakan untuk menyalakan Web Server lokal.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Telegram Credentials Fields */}
          {(settings.mode === "telegram" || showConfig) && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                    Telegram BOT Token
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={settings.telegramToken}
                      id="input-telegram-token"
                      onChange={(e) => updateSetting("telegramToken", e.target.value)}
                      placeholder="Contoh: 86116143..."
                      className="block w-full pl-9 pr-3 py-2 text-sm bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 font-mono text-white placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                    Telegram Chat ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={settings.telegramChatId}
                      id="input-telegram-chatid"
                      onChange={(e) => updateSetting("telegramChatId", e.target.value)}
                      placeholder="Contoh: 130028..."
                      className="block w-full pl-9 pr-3 py-2 text-sm bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 font-mono text-white placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTelegramTest}
                  disabled={testingTelegram || !settings.telegramToken || !settings.telegramChatId}
                  id="btn-test-telegram-config"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-white/5 disabled:text-gray-600 disabled:border-white/5 border border-transparent text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(99,102,241,0.2)] cursor-pointer"
                >
                  {testingTelegram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Uji Kirim Pesan Bot"
                  )}
                </button>
              </div>

              {telegramResult === "success" && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium ml-1 font-mono">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  Pesan uji coba terkirim! Periksa Telegram Chat Anda.
                </p>
              )}
              {telegramResult === "failed" && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium ml-1 font-mono">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  Gagal menghubungi Telegram API. Periksa Token/ChatID Anda.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
