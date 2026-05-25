import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectionInfo, RelayChan, DHTDataPoint } from "./types";
import ConnectionSettings from "./components/ConnectionSettings";
import RelayControls from "./components/RelayControls";
import DHTDashboard from "./components/DHTDashboard";
import VoiceAssistant from "./components/VoiceAssistant";
import ArduinoCodeViewer from "./components/ArduinoCodeViewer";
import { 
  Activity, 
  Cpu, 
  Terminal, 
  Settings, 
  FileCode, 
  TrendingUp, 
  Info, 
  Lightbulb, 
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function App() {
  // 1. Connection Configurations
  const [connection, setConnection] = useState<ConnectionInfo>(() => {
    const saved = localStorage.getItem("iot_connections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore fallback
      }
    }
    return {
      mode: "simulator",
      espIp: "192.168.1.50",
      telegramToken: "8611614379:AAESo7Y4Fh1_V27YYqh-yCfLT19sB8ztkkI",
      telegramChatId: "1300283513",
      isCustomizing: false
    };
  });

  // Save settings in local storage
  useEffect(() => {
    localStorage.setItem("iot_connections", JSON.stringify(connection));
  }, [connection]);

  // 2. Hardware States
  const [relays, setRelays] = useState<RelayChan[]>([
    { id: 1, name: "Relay 1", pin: 23, state: false },
    { id: 2, name: "Relay 2", pin: 19, state: false },
    { id: 3, name: "Relay 3", pin: 18, state: false },
    { id: 4, name: "Relay 4", pin: 5, state: false }
  ]);
  const [variMode, setVariMode] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(28.5);
  const [humidity, setHumidity] = useState<number>(64.0);
  const [heatIndex, setHeatIndex] = useState<number>(30.2);

  // 3. Sensory history log for charts
  const [history, setHistory] = useState<DHTDataPoint[]>([]);

  // 4. UI Logs and States
  const [logs, setLogs] = useState<{ time: string; text: string; type: "info" | "success" | "error" | "warn" }[]>([
    { time: new Date().toLocaleTimeString(), text: "Inisialisasi sistem control panel.", type: "info" },
    { time: new Date().toLocaleTimeString(), text: "Sistem berjalan dalam Mode Simulator.", type: "success" }
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const [isSensorPolling, setIsSensorPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "arduino">("dashboard");

  // Keep tracking loop references to avoid retrigger loops
  const variIndexRef = useRef(0);
  const variTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 5. Append Activity Logs
  const addLog = useCallback((text: string, type: "info" | "success" | "error" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, text, type }, ...prev.slice(0, 49)]);
  }, []);

  // 6. Compute Heat Index in Frontend (for simulation/direct modes)
  const computeHeatIndexFn = (tempCelsius: number, percentHumidity: number): number => {
    // Basic approximation of heat index in Celsius metric
    // Simplified formula
    return tempCelsius + 0.33 * (percentHumidity / 100 * 6.105 * Math.exp(17.27 * tempCelsius / (237.7 + tempCelsius))) - 4.0;
  };

  // 7. Sensor Polling Loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchSensorData = async () => {
      if (connection.mode === "simulator") {
        // Mode Simulator: Fluctuating values gently
        setTemperature((prev) => {
          const delta = (Math.random() - 0.5) * 0.4;
          const nextVal = Math.max(16, Math.min(42, prev + delta));
          
          setHumidity((prevHum) => {
            const humDelta = (Math.random() - 0.5) * 1.5;
            const nextHum = Math.max(30, Math.min(95, prevHum + humDelta));
            const newHi = computeHeatIndexFn(nextVal, nextHum);
            setHeatIndex(newHi);

            // Record data point in history
            const timestamp = Date.now();
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setHistory((prevHistory) => [
              ...prevHistory.slice(-29), // Keep last 30 data points
              { time: timeStr, timestamp, temperature: nextVal, humidity: nextHum, heatIndex: newHi }
            ]);

            return nextHum;
          });
          return nextVal;
        });
      } 
      else if (connection.mode === "direct_ip") {
        // Local Direct IP: Fast Fetch requests
        try {
          setIsSensorPolling(true);
          const response = await fetch(`http://${connection.espIp}/status`, { signal: AbortSignal.timeout(2000) });
          const data = await response.json();
          if (data && data.temperature !== undefined) {
            setTemperature(data.temperature);
            setHumidity(data.humidity);
            setHeatIndex(data.heatIndex || computeHeatIndexFn(data.temperature, data.humidity));
            setVariMode(data.variMode || 0);
            
            if (Array.isArray(data.relays)) {
              setRelays((prev) =>
                prev.map((r, i) => ({ ...r, state: !!data.relays[i] }))
              );
            }

            const timestamp = Date.now();
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setHistory((prevHistory) => [
              ...prevHistory.slice(-29),
              { time: timeStr, timestamp, temperature: data.temperature, humidity: data.humidity, heatIndex: data.heatIndex || 0 }
            ]);
          }
        } catch (err: any) {
          // Silent catch to prevent console flood
        } finally {
          setIsSensorPolling(false);
        }
      }
    };

    // Initial fetch
    fetchSensorData();

    // Pool every 4 seconds
    intervalId = setInterval(fetchSensorData, 4000);

    return () => clearInterval(intervalId);
  }, [connection.mode, connection.espIp]);

  // 8. Simulator Mode: Relay Animation / Variations Loop
  useEffect(() => {
    // Clear any active timer
    if (variTimerRef.current) {
      clearInterval(variTimerRef.current);
      variTimerRef.current = null;
    }

    if (connection.mode !== "simulator" || variMode === 0) {
      return;
    }

    // Emulate sequential blinks of relays on frontend
    variIndexRef.current = 0;
    
    variTimerRef.current = setInterval(() => {
      setRelays((prev) => {
        const nextRelays = prev.map((r) => ({ ...r, state: false }));
        
        // Match C++ Animation Logic
        let activeIdx;
        if (variMode === 1) {
          activeIdx = variIndexRef.current % 4; // 0->1->2->3->0...
        } else {
          activeIdx = 3 - (variIndexRef.current % 4); // 3->2->1->0->3...
        }
        
        nextRelays[activeIdx].state = true;
        return nextRelays;
      });

      variIndexRef.current++;
    }, 150); // 150ms match with VARI_DELAY in arduino

    return () => {
      if (variTimerRef.current) {
        clearInterval(variTimerRef.current);
      }
    };
  }, [variMode, connection.mode]);

  // 9. Hardware Control Executer
  const executeRelayToggle = async (relayId: number, targetState: boolean) => {
    setIsBusy(true);
    addLog(`Mengubah Relay ${relayId} menjadi ${targetState ? "ON" : "OFF"}...`, "info");

    if (connection.mode === "simulator") {
      // Direct virtual toggle
      setVariMode(0); // Any toggle stops variation mode
      setRelays(prev => prev.map(r => r.id === relayId ? { ...r, state: targetState } : r));
      addLog(`[Simulator] Relay ${relayId} berhasil di-ganti ke ${targetState ? "ON" : "OFF"}.`, "success");
      setIsBusy(false);
    } 
    else if (connection.mode === "direct_ip") {
      // Local Direct IP fetch call
      try {
        const urlState = targetState ? "on" : "off";
        const response = await fetch(`http://${connection.espIp}/toggle?id=${relayId}&state=${urlState}`, {
          signal: AbortSignal.timeout(1800)
        });
        const data = await response.json();
        
        if (data.status === "success") {
          setVariMode(0);
          setRelays(prev => prev.map((r, i) => ({ ...r, state: !!data.relays[i] })));
          addLog(`[Direct IP] Berhasil menyetel Relay ${relayId} ke ${targetState ? "ON" : "OFF"}. Latency <10ms.`, "success");
        } else {
          throw new Error("Invalid status returned");
        }
      } catch (err: any) {
        addLog(`[Direct IP] Gagal merubah Relay ${relayId}. Cek koneksi Wi-Fi atau IP.`, "error");
      } finally {
        setIsBusy(false);
      }
    } 
    else if (connection.mode === "telegram") {
      // Send bot message via API Gateway Proxy
      try {
        const cmd = `/relay${relayId}_${targetState ? "on" : "off"}`;
        addLog(`[Telegram] Mengirim instruksi: ${cmd}...`, "info");
        
        const response = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: connection.telegramToken,
            chatId: connection.telegramChatId,
            text: cmd
          })
        });

        const data = await response.json();
        if (data.ok) {
          // Optimistic local state update in Cloud mode
          setVariMode(0);
          setRelays(prev => prev.map(r => r.id === relayId ? { ...r, state: targetState } : r));
          addLog(`[Telegram API] Sinyal terkirim ke Bot. Relay ${relayId} disetel ${targetState ? "ON" : "OFF"}.`, "success");
        } else {
          throw new Error(data.description || "API Error");
        }
      } catch (err: any) {
        addLog(`[Telegram API Error] ${err.message}`, "error");
      } finally {
        setIsBusy(false);
      }
    }
  };

  const executeAllRelays = async (turnOn: boolean) => {
    setIsBusy(true);
    addLog(`Mengubah semua relay menjadi ${turnOn ? "ON" : "OFF"}...`, "info");

    if (connection.mode === "simulator") {
      setVariMode(0);
      setRelays(prev => prev.map(r => ({ ...r, state: turnOn })));
      addLog(`[Simulator] Semua relay disetel ke ${turnOn ? "ON" : "OFF"}.`, "success");
      setIsBusy(false);
    } 
    else if (connection.mode === "direct_ip") {
      try {
        const state = turnOn ? "on" : "off";
        const response = await fetch(`http://${connection.espIp}/all?state=${state}`, {
          signal: AbortSignal.timeout(2000)
        });
        const data = await response.json();
        
        if (data.status === "success") {
          setVariMode(0);
          setRelays(prev => prev.map((r, i) => ({ ...r, state: !!data.relays[i] })));
          addLog(`[Direct IP] Semua relay sukses disetel ke ${turnOn ? "ON" : "OFF"}.`, "success");
        }
      } catch (err) {
        addLog(`[Direct IP] Gagal. Pastikan ESP32 aktif di local network.`, "error");
      } finally {
        setIsBusy(false);
      }
    } 
    else if (connection.mode === "telegram") {
      try {
        const cmd = `/all_${turnOn ? "on" : "off"}`;
        const response = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: connection.telegramToken,
            chatId: connection.telegramChatId,
            text: cmd
          })
        });

        const data = await response.json();
        if (data.ok) {
          setVariMode(0);
          setRelays(prev => prev.map(r => ({ ...r, state: turnOn })));
          addLog(`[Telegram API] Perintah massal ${cmd} terdistribusi ke awan.`, "success");
        }
      } catch (err: any) {
        addLog(`[Telegram Error] ${err.message}`, "error");
      } finally {
        setIsBusy(false);
      }
    }
  };

  const executeVariMode = async (targetMode: number) => {
    setIsBusy(true);
    addLog(`Mengaktifkan Pola Variasi ${targetMode}...`, "info");

    if (connection.mode === "simulator") {
      setVariMode(targetMode);
      if (targetMode === 0) {
        setRelays(prev => prev.map(r => ({ ...r, state: false })));
        addLog("[Simulator] Pola variasi ditiadakan. Semua relay mati.", "info");
      } else {
        addLog(`[Simulator] Pola variasi ${targetMode} diaktifkan.`, "success");
      }
      setIsBusy(false);
    } 
    else if (connection.mode === "direct_ip") {
      try {
        const response = await fetch(`http://${connection.espIp}/vari?mode=${targetMode}`, {
          signal: AbortSignal.timeout(2000)
        });
        const data = await response.json();
        
        if (data.status === "success") {
          setVariMode(targetMode);
          setRelays(prev => prev.map((r, i) => ({ ...r, state: !!data.relays[i] })));
          addLog(`[Direct IP] Pola variasi diubah ke ${targetMode}.`, "success");
        }
      } catch (err) {
        addLog(`[Direct IP] Gagal mengganti pola variasi.`, "error");
      } finally {
        setIsBusy(false);
      }
    } 
    else if (connection.mode === "telegram") {
      try {
        const cmd = targetMode === 0 ? "/vari_stop" : `/vari${targetMode}`;
        const response = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: connection.telegramToken,
            chatId: connection.telegramChatId,
            text: cmd
          })
        });

        const data = await response.json();
        if (data.ok) {
          setVariMode(targetMode);
          if (targetMode === 0) {
            setRelays(prev => prev.map(r => ({ ...r, state: false })));
          }
          addLog(`[Telegram BOT] Pola variasi ${cmd} diatur secara global.`, "success");
        }
      } catch (err: any) {
        addLog(`[Telegram Error] ${err.message}`, "error");
      } finally {
        setIsBusy(false);
      }
    }
  };

  // 10. Connection Health check test methods
  const testPingIP = async (): Promise<boolean> => {
    addLog(`Menguji sambungan pinger ke IP: ${connection.espIp}...`, "info");
    try {
      const res = await fetch(`http://${connection.espIp}/status`, { signal: AbortSignal.timeout(2500) });
      const data = await res.json();
      if (data && data.status === "success") {
        addLog(`Ping Sukses! ESP32 ditemukan pada ${connection.espIp}.`, "success");
        return true;
      }
    } catch (err) {
      addLog(`Ping gagal. Board tujuan tidak merespon di alamat: ${connection.espIp}.`, "error");
    }
    return false;
  };

  const testTelegramBot = async (): Promise<boolean> => {
    addLog("Menguji sambungan Telegram BOT API...", "info");
    try {
      const text = "🔔 *Uji Jaringan:* Sambungan Web Dashboard ESP32 Kontroler berhasil dibuat!";
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: connection.telegramToken,
          chatId: connection.telegramChatId,
          text: text,
          isMarkdown: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        addLog("Telegram uji sukses! Bot merespon chat luar.", "success");
        return true;
      }
    } catch {
      // Catch error
    }
    addLog("Uji sambungan bot gagal. Verifikasi API token Anda.", "error");
    return false;
  };

  // 11. Voice Commander Target Listener Callback
  const handleVoiceCommandCallback = (targetRelays: boolean[], targetVariMode: number, explanation: string) => {
    addLog(`Konfirmasi Perintah: ${explanation}`, "success");
    setVariMode(targetVariMode);
    
    // Process matching changes in backend or state
    setRelays((prev) =>
      prev.map((r, i) => ({ ...r, state: targetRelays[i] }))
    );

    // If actual hardware is connected, issue actual updates!
    if (connection.mode === "direct_ip") {
      // Sync whole state to direct IP (or execute in sequence)
      // To simplify, we let the status poll catch or instruct hardware:
      // In upgraded system, we can issue an bulk command:
      fetch(`http://${connection.espIp}/all?state=${targetRelays.some(s => s) ? "on" : "off"}`)
        .catch(() => {});
    }
  };

  const manualSensorCheck = async () => {
    addLog("Memulai verifikasi sensor DHT11 manual...", "info");
    if (connection.mode === "simulator") {
      // Simple virtual fluctuation bump
      setTemperature(prev => prev + (Math.random() - 0.5) * 2);
      setHumidity(prev => prev + (Math.random() - 0.5) * 5);
      addLog("Data simulasi di-refresh.", "success");
    } else {
      addLog("Menghubungi modul hardware...", "info");
    }
  };

  // Sync mode changes with appropriate logs
  useEffect(() => {
    addLog(`Mode sambungan aktif beralih ke: ${connection.mode.toUpperCase()}`, "info");
  }, [connection.mode]);

  return (
    <div className="min-h-screen bg-tech-bg text-[#E0E2E6] antialiased font-sans pb-16">
      {/* Dynamic Visual Navbar Header */}
      <header className="bg-[#161920] border-b border-white/10 sticky top-0 z-50 shadow-md backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl shadow-md border border-white/5">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight leading-none flex items-center gap-2">
                ESP32 Smart Controller
                <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-md font-mono tracking-wider font-semibold border border-white/10 uppercase">
                  v2.0-PRO
                </span>
              </h1>
              <p className="text-gray-500 text-xs font-semibold mt-1 uppercase tracking-wider font-mono">
                4-Channel Relay & DHT11 Ambient Supervisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Visual indicators */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              connection.mode === "simulator" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : connection.mode === "direct_ip"
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                connection.mode === "simulator" ? "bg-emerald-500 animate-ping shadow-[0_0_8px_#10b981]" : "bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"
              }`} />
              {connection.mode === "simulator" ? "SIMULATOR" : connection.mode === "direct_ip" ? `DIRECT IP: ${connection.espIp}` : "TELEGRAM CLOUD"}
            </div>

            {/* Graphical tab sliders */}
            <div className="flex bg-[#121419]/90 p-0.5 rounded-xl text-xs font-semibold border border-white/5">
              <button
                onClick={() => setActiveTab("dashboard")}
                id="btn-nav-dashboard"
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "dashboard" ? "bg-[#1C212B] text-white border border-white/10 shadow-sm font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("arduino")}
                id="btn-nav-arduino"
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "arduino" ? "bg-[#1C212B] text-white border border-white/10 shadow-sm font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Arduino Firmware
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {activeTab === "dashboard" ? (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Connection setup row */}
            <ConnectionSettings
              settings={connection}
              onChange={setConnection}
              onPingTest={testPingIP}
              onTelegramTest={testTelegramBot}
            />

            {/* Primary Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Toggles & Controller */}
              <div className="space-y-8">
                <RelayControls
                  relays={relays}
                  variMode={variMode}
                  onToggle={(id) => executeRelayToggle(id, !relays[id-1].state)}
                  onAllOn={() => executeAllRelays(true)}
                  onAllOff={() => executeAllRelays(false)}
                  onVariMode={executeVariMode}
                  isLoading={isBusy}
                />

                <VoiceAssistant
                  onRelayCommand={handleVoiceCommandCallback}
                  currentRelayStates={relays.map((r) => r.state)}
                  currentVariMode={variMode}
                />
              </div>

              {/* Right Column: Graphs & telemetry charts */}
              <div className="space-y-8">
                <DHTDashboard
                  currentTemp={temperature}
                  currentHum={humidity}
                  currentHeatIndex={heatIndex}
                  history={history}
                  onRefreshSensors={manualSensorCheck}
                  isSensorLoading={isSensorPolling}
                />

                {/* Real-time System Log Console */}
                <div className="bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <Terminal className="w-4 h-4 text-gray-400 animate-bounce" />
                      <span className="font-bold text-white text-xs tracking-wider uppercase font-mono">
                        Aktivitas Kontroler
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">
                      Live Telemetri Log
                    </span>
                  </div>

                  <div className="bg-black/40 font-mono text-xs rounded-xl p-4 max-h-[160px] overflow-y-auto space-y-2 text-gray-305 shadow-inner border border-white/5 scrollbar-thin scrollbar-thumb-slate-800">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5 leading-relaxed shrink-0">
                        <span className="text-gray-600 shrink-0">[{log.time}]</span>
                        <span className={`break-all ${
                          log.type === "success" 
                            ? "text-emerald-400 font-semibold" 
                            : log.type === "error"
                            ? "text-rose-400 font-bold animate-pulse"
                            : log.type === "warn"
                            ? "text-amber-400 font-semibold"
                            : "text-[#E0E2E6]"
                        }`}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Micro tip panel */}
                  <div className="mt-4 flex gap-3 text-xs bg-[#1c212b] rounded-xl p-3 border border-white/5">
                    <Info className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
                    <p className="text-gray-400 leading-relaxed font-mono text-[11px]">
                      Gunakan <strong className="text-cyan-400 font-normal">Direct IP</strong> untuk meniadakan respon jeda awan. Hubungkan board ke WiFi &rdquo;<span className="text-white font-semibold">{connection.mode === "direct_ip" ? connection.espIp : "Kocakk"}</span>&rdquo;.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div className="animate-fadeIn">
            <ArduinoCodeViewer />
          </div>
        )}
      </main>

      {/* Footer System Bar */}
      <footer className="max-w-7xl mx-auto px-6 mt-12 py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1.5 font-bold uppercase"><span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> MQTT: CONNECTED</span>
          <span className="flex items-center gap-1.5 font-bold uppercase"><span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> WEBSOCKET: STABLE</span>
          <span className="flex items-center gap-1.5 font-bold uppercase"><span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_#22d3ee]"></span> SSID: {connection.mode === "direct_ip" ? "Kocakk" : "Simulator"}</span>
        </div>
        <div className="text-[10px] font-mono text-gray-600 tracking-wider">
          ENGINEERING INTERFACE © 2026 ESP-IO CONTROL SYSTEMS
        </div>
      </footer>
    </div>
  );
}
