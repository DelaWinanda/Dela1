import { RelayChan } from "../types";
import { 
  Power, 
  Lightbulb, 
  Zap, 
  Play, 
  Square,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface RelayControlsProps {
  relays: RelayChan[];
  variMode: number;
  onToggle: (id: number) => void;
  onAllOn: () => void;
  onAllOff: () => void;
  onVariMode: (mode: number) => void;
  isLoading: boolean;
}

export default function RelayControls({
  relays,
  variMode,
  onToggle,
  onAllOn,
  onAllOff,
  onVariMode,
  isLoading
}: RelayControlsProps) {
  
  return (
    <div className="bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-lg h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-snug">Kontrol Relay Daya</h3>
              <p className="text-gray-500 text-xs mt-0.5">Nyalakan/matikan beban listrik anda</p>
            </div>
          </div>
          
          {variMode > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/35 animate-pulse">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
              Variasi {variMode} Aktif
            </span>
          )}
        </div>

        {/* 4-Relays Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {relays.map((relay) => {
            return (
              <div
                key={relay.id}
                className={`relative flex flex-col items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${
                  relay.state
                    ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 text-white"
                    : "border-white/5 hover:border-white/10 bg-[#1c212b]/60 text-gray-300"
                }`}
              >
                {/* Visual Bulb Indicator with Glow */}
                <div
                  className={`p-3.5 rounded-full mb-4 transition-all duration-300 ${
                    relay.state
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_#10b981]"
                      : "bg-black/20 text-gray-500 border border-white/5"
                  }`}
                >
                  <Lightbulb className={`w-6 h-6 ${relay.state ? "animate-pulse" : ""}`} />
                </div>

                <div className="text-center mb-4">
                  <span className="block font-semibold text-sm text-white">{relay.name}</span>
                  <span className="text-[10px] font-mono text-gray-500">GPIO {relay.pin}</span>
                </div>

                {/* Subtile ON/OFF toggle switch button */}
                <button
                  onClick={() => onToggle(relay.id)}
                  id={`btn-toggle-relay-${relay.id}`}
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                    relay.state
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                      : "bg-[#1c212b] hover:bg-white/5 text-gray-300 border border-white/10"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {relay.state ? "AKTIF" : "MATI"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Actions & Variations Area */}
      <div className="border-t border-white/5 pt-5 space-y-4">
        {/* Bulk triggers */}
        <div className="flex gap-2.5">
          <button
            onClick={onAllOn}
            id="btn-all-relay-on"
            disabled={isLoading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.2)]"
          >
            <Power className="w-4 h-4" />
            Nyalakan Semua
          </button>
          <button
            onClick={onAllOff}
            id="btn-all-relay-off"
            disabled={isLoading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_8px_rgba(244,63,94,0.2)]"
          >
            <Power className="w-4 h-4" />
            Matikan Semua
          </button>
        </div>

        {/* Dynamic Variation selection triggers */}
        <div className="space-y-2 bg-[#1c212b] rounded-2xl p-4 border border-white/5">
          <span className="block text-gray-400 text-[10px] font-bold uppercase font-mono tracking-wider mb-2">
            Pola Variasi (Running Light)
          </span>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => onVariMode(1)}
              id="btn-vari-forward"
              disabled={isLoading}
              className={`py-2 px-3.5 text-xs font-semibold rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                variMode === 1
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-700 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "bg-black/20 hover:bg-white/5 text-gray-400 border-white/5"
              }`}
            >
              <ArrowRight className={`w-3.5 h-3.5 ${variMode === 1 ? 'text-white' : 'text-amber-500'}`} />
              Maju (1→4)
            </button>
            <button
              onClick={() => onVariMode(2)}
              id="btn-vari-backward"
              disabled={isLoading}
              className={`py-2 px-3.5 text-xs font-semibold rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                variMode === 2
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-700 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "bg-black/20 hover:bg-white/5 text-gray-400 border-white/5"
              }`}
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${variMode === 2 ? 'text-white' : 'text-amber-500'}`} />
              Mundur (4→1)
            </button>
            <button
              onClick={() => onVariMode(0)}
              id="btn-vari-stop"
              disabled={isLoading}
              className={`py-2 px-3.5 text-xs font-semibold rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                variMode === 0
                  ? "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25 font-bold"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Stop Pola
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
