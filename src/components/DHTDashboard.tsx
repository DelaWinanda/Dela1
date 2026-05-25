import React, { useState } from "react";
import { DHTDataPoint } from "../types";
import { Thermometer, Droplets, Flame, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";

interface DHTDashboardProps {
  currentTemp: number;
  currentHum: number;
  currentHeatIndex: number;
  history: DHTDataPoint[];
  onRefreshSensors: () => Promise<void>;
  isSensorLoading: boolean;
}

export default function DHTDashboard({
  currentTemp,
  currentHum,
  currentHeatIndex,
  history,
  onRefreshSensors,
  isSensorLoading
}: DHTDashboardProps) {
  const [activeTab, setActiveTab] = useState<"both" | "temp" | "hum">("both");
  const [hoveredPoint, setHoveredPoint] = useState<DHTDataPoint | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Statistics calculation
  const temps = history.map(h => h.temperature);
  const hums = history.map(h => h.humidity);

  const maxTemp = temps.length > 0 ? Math.max(...temps) : currentTemp;
  const minTemp = temps.length > 0 ? Math.min(...temps) : currentTemp;
  const maxHum = hums.length > 0 ? Math.max(...hums) : currentHum;
  const minHum = hums.length > 0 ? Math.min(...hums) : currentHum;

  // Render Premium SVG Chart
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Scaling helpers
  const maxValY = 100; // max scale 100
  const minValY = 0;   // min scale 0
  const rangeY = maxValY - minValY;

  const getX = (index: number, total: number) => {
    if (total <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (total - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const norm = (val - minValY) / rangeY;
    return paddingTop + chartHeight - norm * chartHeight;
  };

  // Generate SVG paths with points
  const pointsCount = history.length;
  let tempPath = "";
  let humPath = "";
  let tempArea = "";
  let humArea = "";

  if (pointsCount > 0) {
    // Temperature Points Path
    const tempCoords = history.map((pt, idx) => ({ x: getX(idx, pointsCount), y: getY(pt.temperature) }));
    tempPath = tempCoords.reduce((acc, coord, idx) => {
      return idx === 0 ? `M ${coord.x} ${coord.y}` : `${acc} L ${coord.x} ${coord.y}`;
    }, "");

    if (tempCoords.length > 0) {
      tempArea = `${tempPath} L ${tempCoords[tempCoords.length - 1].x} ${paddingTop + chartHeight} L ${tempCoords[0].x} ${paddingTop + chartHeight} Z`;
    }

    // Humidity Points Path
    const humCoords = history.map((pt, idx) => ({ x: getX(idx, pointsCount), y: getY(pt.humidity) }));
    humPath = humCoords.reduce((acc, coord, idx) => {
      return idx === 0 ? `M ${coord.x} ${coord.y}` : `${acc} L ${coord.x} ${coord.y}`;
    }, "");

    if (humCoords.length > 0) {
      humArea = `${humPath} L ${humCoords[humCoords.length - 1].x} ${paddingTop + chartHeight} L ${humCoords[0].x} ${paddingTop + chartHeight} Z`;
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (pointsCount === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // relative coordinates
    
    // Convert x to index
    const relativeX = x - paddingLeft;
    if (relativeX < 0 || relativeX > chartWidth) {
      setHoveredPoint(null);
      setHoverIndex(null);
      return;
    }

    const ratio = relativeX / chartWidth;
    const approxIndex = Math.round(ratio * (pointsCount - 1));
    const safeIndex = Math.max(0, Math.min(pointsCount - 1, approxIndex));
    
    setHoveredPoint(history[safeIndex]);
    setHoverIndex(safeIndex);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverIndex(null);
  };

  return (
    <div className="bg-[#161920] border border-white/10 rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-lg h-full flex flex-col justify-between">
      <div>
        {/* Header section with manual Refresh trigger */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/15">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base leading-snug">Metriks Udara DHT11</h3>
              <p className="text-gray-500 text-xs mt-0.5">Pantauan sensor lingkungan secara langsung</p>
            </div>
          </div>

          <button
            onClick={onRefreshSensors}
            disabled={isSensorLoading}
            id="btn-refresh-sensors"
            className="p-2 bg-[#1c212b] rounded-xl text-gray-500 hover:text-indigo-400 hover:bg-white/5 border border-white/10 transition-all flex items-center justify-center disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSensorLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 3 Metrics Cards (Gauges) */}
        <div className="grid grid-cols-3 gap-3.5 mb-6">
          {/* Temperature widget */}
          <div className="bg-[#1C212B] border border-white/5 rounded-2xl p-4 text-center flex flex-col items-center">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-full mb-2 border border-rose-500/20">
              <Thermometer className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white font-mono">
              {currentTemp.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1 font-mono">Suhu</span>
          </div>

          {/* Humidity widget */}
          <div className="bg-[#1C212B] border border-white/5 rounded-2xl p-4 text-center flex flex-col items-center">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-full mb-2 border border-sky-500/20">
              <Droplets className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white font-mono">
              {currentHum.toFixed(1)}%
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1 font-mono">Lembap</span>
          </div>

          {/* Heat index widget */}
          <div className="bg-[#1C212B] border border-white/5 rounded-2xl p-4 text-center flex flex-col items-center">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-full mb-2 border border-amber-500/20">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-2xl font-bold text-white font-mono">
              {currentHeatIndex.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1 font-mono">Index</span>
          </div>
        </div>

        {/* Chart View with Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider font-mono">
              Grafik Real-Time
            </span>

            {/* Graphical Tabs */}
            <div className="flex bg-black/40 border border-white/5 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab("both")}
                id="btn-chart-tab-both"
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "both" ? "bg-[#1C212B] text-white border border-white/10 shadow-sm font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveTab("temp")}
                id="btn-chart-tab-temp"
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "temp" ? "bg-[#1C212B] text-rose-400 border border-rose-500/20 shadow-sm font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Suhu
              </button>
              <button
                onClick={() => setActiveTab("hum")}
                id="btn-chart-tab-hum"
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "hum" ? "bg-[#1C212B] text-sky-400 border border-sky-500/20 shadow-sm font-bold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Lembap
              </button>
            </div>
          </div>

          {/* Graphical Plot container */}
          <div className="border border-white/5 bg-black/20 relative rounded-2xl overflow-hidden p-2.5">
            {history.length < 2 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-gray-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs font-medium font-mono">Mengumpulkan data sensor awal...</p>
              </div>
            ) : (
              <svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="overflow-visible select-none"
              >
                {/* Definitions for gradients */}
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines along Y Axis (0, 25, 50, 75, 100) */}
                {[0, 25, 50, 75, 100].map((v) => {
                  const y = getY(v);
                  return (
                    <g key={v} className="opacity-40">
                      <line
                         x1={paddingLeft}
                         y1={y}
                         x2={svgWidth - paddingRight}
                         y2={y}
                         stroke="#1e293b"
                         strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="monospace"
                        className="fill-gray-600"
                      >
                        {v}
                      </text>
                    </g>
                  );
                })}

                {/* Render Humidity Area */}
                {(activeTab === "both" || activeTab === "hum") && humArea && (
                  <path d={humArea} fill="url(#humGrad)" />
                )}

                {/* Render Temperature Area */}
                {(activeTab === "both" || activeTab === "temp") && tempArea && (
                  <path d={tempArea} fill="url(#tempGrad)" />
                )}

                {/* Render Humidity Line */}
                {(activeTab === "both" || activeTab === "hum") && humPath && (
                  <path
                    d={humPath}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Render Temperature Line */}
                {(activeTab === "both" || activeTab === "temp") && tempPath && (
                  <path
                    d={tempPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Cursor Vertical Indicator */}
                {hoverIndex !== null && (
                  <line
                    x1={getX(hoverIndex, pointsCount)}
                    y1={paddingTop}
                    x2={getX(hoverIndex, pointsCount)}
                    y2={paddingTop + chartHeight}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="transition-all"
                  />
                )}

                {/* Render interactive hover dots */}
                {hoverIndex !== null && hoveredPoint && (
                  <>
                    {(activeTab === "both" || activeTab === "temp") && (
                      <circle
                        cx={getX(hoverIndex, pointsCount)}
                        cy={getY(hoveredPoint.temperature)}
                        r="5.5"
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="shadow transition-all"
                      />
                    )}
                    {(activeTab === "both" || activeTab === "hum") && (
                      <circle
                        cx={getX(hoverIndex, pointsCount)}
                        cy={getY(hoveredPoint.humidity)}
                        r="5.5"
                        fill="#0ea5e9"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="shadow transition-all"
                      />
                    )}
                  </>
                )}

                {/* X Axis Time Labels (staggered limits) */}
                {history.map((pt, idx) => {
                  // Only display every 4th label to save space
                  if (idx % Math.max(1, Math.floor(pointsCount / 5)) !== 0) return null;
                  return (
                    <text
                      key={idx}
                      x={getX(idx, pointsCount)}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="500"
                      className="fill-gray-600"
                    >
                      {pt.time}
                    </text>
                  );
                })}
              </svg>
            )}

            {/* Custom Tooltip Float */}
            {hoveredPoint && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#161920]/95 text-white p-3 rounded-xl shadow-xl text-xs font-semibold backdrop-blur border border-white/10 flex flex-col gap-1 z-10 animate-scaleIn">
                <span className="font-mono text-[10px] text-gray-500 border-b border-white/5 pb-1 flex items-center justify-between gap-6">
                  Waktu: <span>{hoveredPoint.time}</span>
                </span>
                <span className="flex items-center gap-2 text-rose-400 mt-1">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  Suhu: <strong className="font-mono">{hoveredPoint.temperature.toFixed(1)}°C</strong>
                </span>
                <span className="flex items-center gap-2 text-sky-400">
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  Lembap: <strong className="font-mono">{hoveredPoint.humidity.toFixed(1)}%</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Statistics Footer */}
      <div className="border-t border-white/5 pt-5 mt-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#1C212B] border border-white/5 p-3 flex justify-between items-center font-mono">
            <span className="text-xs text-gray-400 font-semibold">Suhu Min / Max</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-black/20 text-gray-400 border border-white/5 px-1.5 py-0.5 rounded font-mono font-bold flex items-center justify-center gap-0.5">
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                {minTemp.toFixed(1)}°
              </span>
              <span className="text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold flex items-center justify-center gap-0.5">
                <ChevronUp className="w-3.5 h-3.5 text-rose-400" />
                {maxTemp.toFixed(1)}°
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1C212B] border border-white/5 p-3 flex justify-between items-center font-mono">
            <span className="text-xs text-gray-400 font-semibold">Lembap Min / Max</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-black/20 text-gray-400 border border-white/5 px-1.5 py-0.5 rounded font-mono font-bold flex items-center justify-center gap-0.5">
                <ChevronDown className="w-3.5 h-3.5 text-sky-500" />
                {minHum.toFixed(1)}%
              </span>
              <span className="text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono font-bold flex items-center justify-center gap-0.5">
                <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                {maxHum.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
