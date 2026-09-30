import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity, Radio, Zap, ArrowUpRight, ArrowDownLeft, Layers, SlidersHorizontal } from 'lucide-react';

export interface TelemetryDataPoint {
  time: number;
  timeStr: string;
  txGbps: number;
  rxGbps: number;
  txMpps: number;
  rxMpps: number;
  txPps: number;
  rxPps: number;
  dropRatePercent?: number;
  cpuPercent?: number;
}

interface RealtimeMetricsChartProps {
  history: TelemetryDataPoint[];
  isRunning?: boolean;
}

export const RealtimeMetricsChart: React.FC<RealtimeMetricsChartProps> = ({
  history,
  isRunning = false,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'throughput' | 'pps'>('both');
  const [timeWindow, setTimeWindow] = useState<number>(30); // 30, 60, or 120 points

  const displayData = history.slice(-timeWindow);

  // Latest metrics
  const current = history.length > 0 ? history[history.length - 1] : null;
  const currentTxGbps = current?.txGbps || 0;
  const currentRxGbps = current?.rxGbps || 0;
  const currentTxMpps = current?.txMpps || 0;
  const currentRxMpps = current?.rxMpps || 0;

  // Peaks in current visible buffer
  const peakTxGbps = displayData.reduce((max, p) => Math.max(max, p.txGbps), 0);
  const peakRxGbps = displayData.reduce((max, p) => Math.max(max, p.rxGbps), 0);
  const peakTxMpps = displayData.reduce((max, p) => Math.max(max, p.txMpps), 0);
  const peakRxMpps = displayData.reduce((max, p) => Math.max(max, p.rxMpps), 0);

  // Custom Recharts Tooltip for Throughput
  const CustomThroughputTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-[#44475a] bg-[#191a21]/95 p-3 shadow-2xl backdrop-blur-md font-mono text-xs text-[#f8f8f2] min-w-[200px]">
          <div className="text-[10px] text-[#6272a4] border-b border-[#44475a] pb-1.5 mb-2 flex items-center justify-between">
            <span>TEMPO: {label}</span>
            <span className="flex items-center gap-1 text-[#50fa7b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#50fa7b] animate-ping" />
              LIVE
            </span>
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-[#f8f8f2]">
                  {Number(entry.value).toFixed(2)} Gbps
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for PPS
  const CustomPpsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-[#44475a] bg-[#191a21]/95 p-3 shadow-2xl backdrop-blur-md font-mono text-xs text-[#f8f8f2] min-w-[210px]">
          <div className="text-[10px] text-[#6272a4] border-b border-[#44475a] pb-1.5 mb-2 flex items-center justify-between">
            <span>TEMPO: {label}</span>
            <span className="text-[#8be9fd]">TAXA DE PACOTES</span>
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const mpps = Number(entry.value);
              const pps = Math.round(mpps * 1e6);
              return (
                <div key={`item-${index}`} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                    {entry.name}:
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-[#f8f8f2] block">
                      {mpps.toFixed(3)} Mpps
                    </span>
                    <span className="text-[9px] text-[#6272a4] block">
                      {pps.toLocaleString()} pps
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#44475a] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#bd93f9]/20 text-[#bd93f9]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#f8f8f2]">
                Telemetria em Tempo Real (DPDK Engine)
              </h3>
              {isRunning ? (
                <span className="flex items-center gap-1 rounded bg-[#50fa7b]/20 px-2 py-0.5 text-[10px] font-mono text-[#50fa7b]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#50fa7b] animate-ping" />
                  INJETANDO
                </span>
              ) : (
                <span className="rounded bg-[#6272a4]/20 px-2 py-0.5 text-[10px] font-mono text-[#6272a4]">
                  OCIOSO
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6272a4]">
              Monitoramento contínuo de Vazão (Throughput) e Taxa de Pacotes (PPS)
            </p>
          </div>
        </div>

        {/* View Mode Switches and Time Window */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[#44475a] bg-[#1e1f29] p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-[#bd93f9] text-[#1e1f29] font-bold shadow-sm'
                  : 'text-[#6272a4] hover:text-[#f8f8f2]'
              }`}
            >
              Duplo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('throughput')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'throughput'
                  ? 'bg-[#50fa7b] text-[#1e1f29] font-bold shadow-sm'
                  : 'text-[#6272a4] hover:text-[#f8f8f2]'
              }`}
            >
              Gbps
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pps')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'pps'
                  ? 'bg-[#8be9fd] text-[#1e1f29] font-bold shadow-sm'
                  : 'text-[#6272a4] hover:text-[#f8f8f2]'
              }`}
            >
              PPS
            </button>
          </div>

          {/* Time Window Selector */}
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="rounded-lg border border-[#44475a] bg-[#1e1f29] px-2 py-1 text-xs font-mono text-[#8be9fd] outline-none cursor-pointer"
            title="Janela de histórico temporal"
          >
            <option value={30}>30 seg</option>
            <option value={60}>60 seg</option>
            <option value={120}>120 seg</option>
          </select>
        </div>
      </div>

      {/* Quick KPI Stat Pill Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-2.5">
          <div className="flex items-center justify-between text-[#6272a4] text-[10px]">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-[#50fa7b]" />
              Tx Throughput
            </span>
            <span>Pico: {peakTxGbps.toFixed(2)}G</span>
          </div>
          <div className="text-base font-bold text-[#50fa7b] mt-0.5">
            {currentTxGbps.toFixed(2)} <span className="text-xs font-normal text-[#6272a4]">Gbps</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-2.5">
          <div className="flex items-center justify-between text-[#6272a4] text-[10px]">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-[#bd93f9]" />
              Rx Throughput
            </span>
            <span>Pico: {peakRxGbps.toFixed(2)}G</span>
          </div>
          <div className="text-base font-bold text-[#bd93f9] mt-0.5">
            {currentRxGbps.toFixed(2)} <span className="text-xs font-normal text-[#6272a4]">Gbps</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-2.5">
          <div className="flex items-center justify-between text-[#6272a4] text-[10px]">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-[#8be9fd]" />
              Tx Packet Rate
            </span>
            <span>Pico: {peakTxMpps.toFixed(2)}M</span>
          </div>
          <div className="text-base font-bold text-[#8be9fd] mt-0.5">
            {currentTxMpps.toFixed(2)} <span className="text-xs font-normal text-[#6272a4]">Mpps</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-2.5">
          <div className="flex items-center justify-between text-[#6272a4] text-[10px]">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-[#f1fa8c]" />
              Rx Packet Rate
            </span>
            <span>Pico: {peakRxMpps.toFixed(2)}M</span>
          </div>
          <div className="text-base font-bold text-[#f1fa8c] mt-0.5">
            {currentRxMpps.toFixed(2)} <span className="text-xs font-normal text-[#6272a4]">Mpps</span>
          </div>
        </div>
      </div>

      {/* 1. THROUGHPUT CHART (Gbps) */}
      {(viewMode === 'both' || viewMode === 'throughput') && (
        <div className="rounded-xl border border-[#44475a] bg-[#191a21] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#f8f8f2] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#50fa7b]" />
              Throughput de Rede (Tx vs Rx em Gbps)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#50fa7b] font-semibold">● Tx (Injeção)</span>
              <span className="text-[#bd93f9] font-semibold">● Rx (Retorno)</span>
            </div>
          </div>

          <div className="h-48 w-full">
            {displayData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#6272a4]">
                Aguardando pacotes da engine TRex...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTxGbps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#50fa7b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#50fa7b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRxGbps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bd93f9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#bd93f9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#343746" vertical={false} />
                  <XAxis
                    dataKey="timeStr"
                    stroke="#6272a4"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#44475a' }}
                  />
                  <YAxis
                    stroke="#6272a4"
                    fontSize={10}
                    domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.15))]}
                    tickLine={false}
                    axisLine={{ stroke: '#44475a' }}
                    tickFormatter={(val) => `${val}G`}
                  />
                  <Tooltip content={<CustomThroughputTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="txGbps"
                    name="Tx Throughput"
                    stroke="#50fa7b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTxGbps)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="rxGbps"
                    name="Rx Throughput"
                    stroke="#bd93f9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRxGbps)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* 2. PPS CHART (Packets Per Second / Mpps) */}
      {(viewMode === 'both' || viewMode === 'pps') && (
        <div className="rounded-xl border border-[#44475a] bg-[#191a21] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#f8f8f2] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8be9fd]" />
              Taxa de Pacotes por Segundo (PPS / Mpps)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#8be9fd] font-semibold">● Tx Mpps</span>
              <span className="text-[#f1fa8c] font-semibold">● Rx Mpps</span>
            </div>
          </div>

          <div className="h-48 w-full">
            {displayData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#6272a4]">
                Aguardando pacotes da engine TRex...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTxMpps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8be9fd" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8be9fd" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRxMpps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f1fa8c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f1fa8c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#343746" vertical={false} />
                  <XAxis
                    dataKey="timeStr"
                    stroke="#6272a4"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#44475a' }}
                  />
                  <YAxis
                    stroke="#6272a4"
                    fontSize={10}
                    domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.25))]}
                    tickLine={false}
                    axisLine={{ stroke: '#44475a' }}
                    tickFormatter={(val) => `${val}M`}
                  />
                  <Tooltip content={<CustomPpsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="txMpps"
                    name="Tx Packet Rate"
                    stroke="#8be9fd"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTxMpps)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="rxMpps"
                    name="Rx Packet Rate"
                    stroke="#f1fa8c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRxMpps)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
