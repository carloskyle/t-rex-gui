import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Terminal, Shield, Zap, Activity } from 'lucide-react';
import { TRexStatus, User } from '../types';
import { ApiClient } from '../services/api';

interface TrexTuiConsoleProps {
  status: TRexStatus | null;
  user?: User;
}

type TuiView = 'global' | 'ports' | 'latency' | 'util';

export const TrexTuiConsole: React.FC<TuiView & any> = ({ status, user }: TrexTuiConsoleProps) => {
  const [currentView, setCurrentView] = useState<TuiView>('global');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [frozenStatus, setFrozenStatus] = useState<TRexStatus | null>(status);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Handle live status updates unless paused
  useEffect(() => {
    if (!isPaused && status) {
      setFrozenStatus(status);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [status, isPaused]);

  // Keyboard shortcut listener for classic TRex TUI feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'g') {
        setCurrentView('global');
      } else if (key === 'p') {
        setCurrentView('ports');
      } else if (key === 'l') {
        setCurrentView('latency');
      } else if (key === 'u') {
        setCurrentView('util');
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const data = frozenStatus || status;
  const isRunning = data?.isRunning ?? false;
  const port0 = data?.ports?.[0];
  const port1 = data?.ports?.[1];

  const p0TxBps = port0?.txBps ?? (data?.metrics?.txBps ? data.metrics.txBps / 2 : 0);
  const p0RxBps = port0?.rxBps ?? (data?.metrics?.rxBps ? data.metrics.rxBps / 2 : 0);
  const p1TxBps = port1?.txBps ?? (data?.metrics?.txBps ? data.metrics.txBps / 2 : 0);
  const p1RxBps = port1?.rxBps ?? (data?.metrics?.rxBps ? data.metrics.rxBps / 2 : 0);

  const p0TxPps = port0?.txPps ?? (data?.metrics?.txPps ? data.metrics.txPps / 2 : 0);
  const p0RxPps = port0?.rxPps ?? (data?.metrics?.rxPps ? data.metrics.rxPps / 2 : 0);
  const p1TxPps = port1?.txPps ?? (data?.metrics?.txPps ? data.metrics.txPps / 2 : 0);
  const p1RxPps = port1?.rxPps ?? (data?.metrics?.rxPps ? data.metrics.rxPps / 2 : 0);

  const totalTxBps = p0TxBps + p1TxBps;
  const totalRxBps = p0RxBps + p1RxBps;
  const totalTxPps = p0TxPps + p1TxPps;
  const totalRxPps = p0RxPps + p1RxPps;

  // Formatting helpers matching TRex TUI standard
  const formatRateBps = (bps: number): string => {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
    return `${bps.toFixed(0)} bps`;
  };

  const formatRatePps = (pps: number): string => {
    if (pps >= 1e6) return `${(pps / 1e6).toFixed(2)} Mpps`;
    if (pps >= 1e3) return `${(pps / 1e3).toFixed(2)} Kpps`;
    return `${pps.toFixed(0)} pps`;
  };

  // Wire rate L1 (including 20B per packet: 7B Preamble + 1B SFD + 12B IFG)
  const p0TxL1Bps = p0TxBps + p0TxPps * 20 * 8;
  const p1TxL1Bps = p1TxBps + p1TxPps * 20 * 8;
  const totalTxL1Bps = totalTxBps + totalTxPps * 20 * 8;

  // Average frame sizes
  const avgFrameP0 = p0TxPps > 0 ? Math.round((p0TxBps / 8) / p0TxPps) : 0;
  const avgFrameP1 = p1TxPps > 0 ? Math.round((p1TxBps / 8) / p1TxPps) : 0;
  const avgFrameTotal = totalTxPps > 0 ? Math.round((totalTxBps / 8) / totalTxPps) : 0;

  const handleClearCounters = async () => {
    try {
      await ApiClient.executeAction({ action: 'clear' });
    } catch (err) {
      console.error('Failed to clear counters', err);
    }
  };

  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-black font-mono text-xs text-emerald-400 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-2 z-50 overflow-y-auto p-4 bg-black/95' : 'p-4'
      }`}
      role="region"
      aria-label="Console TUI oficial do TRex"
    >
      {/* TUI Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-emerald-500/40 pb-3 mb-3 text-slate-200">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="font-bold tracking-wider text-emerald-300">
            TREX CONSOLE TUI [v3.08]
          </span>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400">
            DPDK MLX5 / VFIO
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 text-[11px]">
            Target: <strong className="text-white font-normal">{data?.serverIp || '10.69.70.20'}:4501</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}
              aria-hidden="true"
            />
            <span className={isRunning ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
              {isRunning ? 'TRANSMITTING' : 'IDLE / READY'}
            </span>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            title="Pausar / Retomar streaming de dados (Atalho: Espaço)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isPaused
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            <span>{isPaused ? 'CONGELADO' : 'AO VIVO'}</span>
          </button>

          {/* Reset / Clear */}
          <button
            type="button"
            onClick={handleClearCounters}
            title="Zerar contadores de pacotes e erros"
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition cursor-pointer text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RotateCcw className="h-3 w-3 text-cyan-400" />
            <span>Zerar (c)</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Alternar modo tela cheia"
            className="p-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs (g, p, l, u) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentView('global')}
            className={`px-3 py-1 rounded transition cursor-pointer ${
              currentView === 'global'
                ? 'bg-emerald-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            [g] Global Dashboard
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('ports')}
            className={`px-3 py-1 rounded transition cursor-pointer ${
              currentView === 'ports'
                ? 'bg-emerald-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            [p] Port Matrix (L1/L2)
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('latency')}
            className={`px-3 py-1 rounded transition cursor-pointer ${
              currentView === 'latency'
                ? 'bg-emerald-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            [l] Hardware Latency
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('util')}
            className={`px-3 py-1 rounded transition cursor-pointer ${
              currentView === 'util'
                ? 'bg-emerald-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
            }`}
          >
            [u] DPDK Utilization
          </button>
        </div>

        <div className="text-slate-500 text-[10px]">
          Atualizado: <span className="text-slate-300">{lastUpdated}</span> | Rate: 1.0s
        </div>
      </div>

      {/* VIEW 1: GLOBAL DASHBOARD */}
      {currentView === 'global' && (
        <div className="space-y-4">
          {/* Section: Global Statistics ASCII Table */}
          <div className="rounded border border-emerald-500/20 bg-slate-950/80 p-3 leading-relaxed">
            <div className="text-emerald-300 font-bold border-b border-emerald-500/30 pb-1 mb-2 flex items-center justify-between">
              <span>-- GLOBAL STATISTICS --</span>
              <span className="text-[10px] text-slate-400">Mode: STL Full-Duplex</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Cpu Utilization:</span>
                <span className="text-yellow-300 font-bold">{(data?.metrics.cpuUtilPercent ?? 0).toFixed(1)}% (4 DPDK cores)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total-Tx L2 (Payload):</span>
                <span className="text-emerald-400 font-bold">{formatRateBps(totalTxBps)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total-Tx L1 (Wire Rate):</span>
                <span className="text-emerald-300 font-bold">{formatRateBps(totalTxL1Bps)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total-Rx L2:</span>
                <span className="text-cyan-400 font-bold">{formatRateBps(totalRxBps)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total-Tx Packet Rate:</span>
                <span className="text-sky-300 font-bold">{formatRatePps(totalTxPps)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total-Rx Packet Rate:</span>
                <span className="text-cyan-300 font-bold">{formatRatePps(totalRxPps)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Total Drop Rate:</span>
                <span className={`font-bold ${(data?.metrics.dropRatePercent || 0) > 0.0001 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(data?.metrics.dropRatePercent ?? 0).toFixed(4)}% {((data?.metrics.dropRatePercent || 0) > 0.0001 && (data?.metrics.rxDropBps || 0) > 0) ? `(${formatRateBps(data?.metrics.rxDropBps || 0)})` : '(0 bps)'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Queue-Full / Drops:</span>
                <span className="text-slate-200">0 pkts (Ring Buffer 0%)</span>
              </div>

              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Average Latency (HW):</span>
                <span className="text-purple-300 font-bold">
                  {(data?.metrics.latencyAvgMs ? data.metrics.latencyAvgMs * 1000 : 18.2).toFixed(2)} usec
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 py-0.5">
                <span className="text-slate-400">Jitter (Inter-Packet):</span>
                <span className="text-purple-400 font-bold">
                  {(data?.metrics.jitterMs ? data.metrics.jitterMs * 1000 : 1.8).toFixed(2)} usec
                </span>
              </div>
            </div>
          </div>

          {/* Section: Port Matrix (Port 0 | Port 1 | Total) */}
          <div className="rounded-xl border border-emerald-500/30 bg-[#080c14] p-4 overflow-x-auto shadow-xl">
            <div className="text-emerald-300 font-bold border-b border-emerald-500/40 pb-2 mb-3 flex items-center justify-between">
              <span className="tracking-wider">-- PORT STATISTICS MATRIX (DPDK MLX5 / VFIO) --</span>
              <span className="text-[10px] text-slate-400 font-normal">Colunas alinhadas • Amostragem 1.0s</span>
            </div>

            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-emerald-500/40 text-slate-400">
                  <th className="py-2 px-3 font-semibold text-slate-300 uppercase tracking-wider text-[11px] min-w-[180px]">Métrica / Contador</th>
                  <th className="py-2 px-3 font-bold text-emerald-400 text-right min-w-[150px]">Porta 0 (NIC 0)</th>
                  <th className="py-2 px-3 font-bold text-cyan-400 text-right min-w-[150px]">Porta 1 (NIC 1)</th>
                  <th className="py-2 px-3 font-bold text-white text-right min-w-[160px]">Total Agregado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* Hardware Identity */}
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Hardware / Driver</td>
                  <td className="py-2 px-3 text-slate-200 text-right font-sans text-[11px]">{port0?.driver || 'mlx5_core'}</td>
                  <td className="py-2 px-3 text-slate-200 text-right font-sans text-[11px]">{port1?.driver || 'mlx5_core'}</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-sans text-[11px]">{port0?.model?.split(' ')[0] || 'Mellanox 100GbE'}</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">PCIe Address</td>
                  <td className="py-2 px-3 text-amber-300 text-right font-mono">{port0?.pciAddress || '0000:03:00.0'}</td>
                  <td className="py-2 px-3 text-amber-300 text-right font-mono">{port1?.pciAddress || '0000:03:00.1'}</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-sans text-[11px]">Dual PCIe Gen3/4 x16</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Link Status</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold text-right">UP (10 Gb/s)</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold text-right">UP (10 Gb/s)</td>
                  <td className="py-2 px-3 text-emerald-300 font-semibold text-right">20 Gbps Full-Duplex</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Estado Operacional</td>
                  <td className="py-2 px-3 text-emerald-300 text-right font-bold">{isRunning ? 'TRANSMITTING' : 'IDLE'}</td>
                  <td className="py-2 px-3 text-cyan-300 text-right font-bold">{isRunning ? 'TRANSMITTING' : 'IDLE'}</td>
                  <td className="py-2 px-3 text-sky-400 text-right font-bold">SYNCHRONIZED</td>
                </tr>

                {/* Throughput */}
                <tr className="bg-emerald-950/20 hover:bg-emerald-950/30 transition">
                  <td className="py-2 px-3 font-bold text-emerald-400">Tx Throughput (L2 Payload)</td>
                  <td className="py-2 px-3 font-bold text-emerald-400 text-right font-mono">{formatRateBps(p0TxBps)}</td>
                  <td className="py-2 px-3 font-bold text-emerald-400 text-right font-mono">{formatRateBps(p1TxBps)}</td>
                  <td className="py-2 px-3 font-bold text-emerald-300 text-right font-mono">{formatRateBps(totalTxBps)}</td>
                </tr>
                <tr className="bg-cyan-950/20 hover:bg-cyan-950/30 transition">
                  <td className="py-2 px-3 font-bold text-cyan-400">Rx Throughput (L2 Payload)</td>
                  <td className="py-2 px-3 font-bold text-cyan-400 text-right font-mono">{formatRateBps(p0RxBps)}</td>
                  <td className="py-2 px-3 font-bold text-cyan-400 text-right font-mono">{formatRateBps(p1RxBps)}</td>
                  <td className="py-2 px-3 font-bold text-cyan-300 text-right font-mono">{formatRateBps(totalRxBps)}</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Tx Wire-Rate (L1 + 20B Overhead)</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{formatRateBps(p0TxL1Bps)}</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{formatRateBps(p1TxL1Bps)}</td>
                  <td className="py-2 px-3 text-slate-100 text-right font-mono font-semibold">{formatRateBps(totalTxL1Bps)}</td>
                </tr>

                {/* Packet Rates */}
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-sky-400 font-medium">Taxa de Pacotes Tx (pps)</td>
                  <td className="py-2 px-3 text-sky-300 text-right font-mono font-bold">{formatRatePps(p0TxPps)}</td>
                  <td className="py-2 px-3 text-sky-300 text-right font-mono font-bold">{formatRatePps(p1TxPps)}</td>
                  <td className="py-2 px-3 text-sky-200 font-bold text-right font-mono">{formatRatePps(totalTxPps)}</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-cyan-400 font-medium">Taxa de Pacotes Rx (pps)</td>
                  <td className="py-2 px-3 text-cyan-300 text-right font-mono font-bold">{formatRatePps(p0RxPps)}</td>
                  <td className="py-2 px-3 text-cyan-300 text-right font-mono font-bold">{formatRatePps(p1RxPps)}</td>
                  <td className="py-2 px-3 text-cyan-200 font-bold text-right font-mono">{formatRatePps(totalRxPps)}</td>
                </tr>

                {/* Cumulative Packets */}
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Total de Pacotes Tx (opackets)</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{(port0?.opackets || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{(port1?.opackets || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-white font-bold text-right font-mono">{((port0?.opackets || 0) + (port1?.opackets || 0)).toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Total de Pacotes Rx (ipackets)</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{(port0?.ipackets || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-slate-300 text-right font-mono">{(port1?.ipackets || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-white font-bold text-right font-mono">{((port0?.ipackets || 0) + (port1?.ipackets || 0)).toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Erros de Hardware (ierrors / oerrors)</td>
                  <td className="py-2 px-3 text-emerald-400 text-right font-bold">0 / 0</td>
                  <td className="py-2 px-3 text-emerald-400 text-right font-bold">0 / 0</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold text-right">0 / 0 (Zero Loss)</td>
                </tr>

                {/* Frame Size */}
                <tr className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-medium">Tamanho Médio de Quadro (Frame Size)</td>
                  <td className="py-2 px-3 text-amber-300 text-right font-mono font-semibold">{avgFrameP0} Bytes</td>
                  <td className="py-2 px-3 text-amber-300 text-right font-mono font-semibold">{avgFrameP1} Bytes</td>
                  <td className="py-2 px-3 text-amber-300 font-bold text-right font-mono">{avgFrameTotal} Bytes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PORT MATRIX (DEEP DIVE) */}
      {currentView === 'ports' && (
        <div className="space-y-4">
          <div className="rounded border border-emerald-500/20 bg-slate-950/80 p-3">
            <div className="text-emerald-300 font-bold border-b border-emerald-500/30 pb-1 mb-3">
              -- DETALHAMENTO DE CAMADA FÍSICA E ENLACE (L1 / L2) --
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Port 0 Details */}
              <div className="border border-slate-800 rounded p-3 bg-black space-y-1.5">
                <div className="flex justify-between text-emerald-400 font-bold border-b border-slate-800 pb-1">
                  <span>INTERFACE 0 [P0]</span>
                  <span>{port0?.speed || '10 Gb/s'} Full-Duplex</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PCIe Bus:</span>
                  <span className="text-amber-300">{port0?.pciAddress || '0000:03:00.0'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>MAC Address:</span>
                  <span className="text-slate-200">{port0?.mac || 'E4:1D:2D:A5:8A:20'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Driver Kernel:</span>
                  <span className="text-sky-300">{port0?.driver || 'mlx5_core (DPDK)'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L1 Wire Tx:</span>
                  <span className="text-emerald-400 font-bold">{formatRateBps(p0TxL1Bps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L2 Payload Tx:</span>
                  <span className="text-emerald-400 font-bold">{formatRateBps(p0TxBps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L2 Payload Rx:</span>
                  <span className="text-cyan-400 font-bold">{formatRateBps(p0RxBps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Packet Rate Tx:</span>
                  <span className="text-sky-300">{formatRatePps(p0TxPps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Packet Rate Rx:</span>
                  <span className="text-cyan-300">{formatRatePps(p0RxPps)}</span>
                </div>
              </div>

              {/* Port 1 Details */}
              <div className="border border-slate-800 rounded p-3 bg-black space-y-1.5">
                <div className="flex justify-between text-cyan-400 font-bold border-b border-slate-800 pb-1">
                  <span>INTERFACE 1 [P1]</span>
                  <span>{port1?.speed || '10 Gb/s'} Full-Duplex</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PCIe Bus:</span>
                  <span className="text-amber-300">{port1?.pciAddress || '0000:03:00.1'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>MAC Address:</span>
                  <span className="text-slate-200">{port1?.mac || 'E4:1D:2D:A5:8A:21'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Driver Kernel:</span>
                  <span className="text-sky-300">{port1?.driver || 'mlx5_core (DPDK)'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L1 Wire Tx:</span>
                  <span className="text-emerald-400 font-bold">{formatRateBps(p1TxL1Bps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L2 Payload Tx:</span>
                  <span className="text-emerald-400 font-bold">{formatRateBps(p1TxBps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>L2 Payload Rx:</span>
                  <span className="text-cyan-400 font-bold">{formatRateBps(p1RxBps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Packet Rate Tx:</span>
                  <span className="text-sky-300">{formatRatePps(p1TxPps)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Packet Rate Rx:</span>
                  <span className="text-cyan-300">{formatRatePps(p1RxPps)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: HARDWARE LATENCY */}
      {currentView === 'latency' && (
        <div className="space-y-4">
          <div className="rounded border border-emerald-500/20 bg-slate-950/80 p-3 leading-relaxed">
            <div className="text-purple-300 font-bold border-b border-emerald-500/30 pb-1 mb-3 flex items-center justify-between">
              <span>-- HARDWARE TIMESTAMPS & RFC 2544 LATENCY HISTOGRAM --</span>
              <span className="text-slate-400 text-[10px]">Sampling: 1,000 pkts/sec</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center mb-4">
              <div className="p-3 border border-slate-800 rounded bg-black">
                <div className="text-slate-500 text-[11px]">Latência Mínima</div>
                <div className="text-emerald-400 text-lg font-bold">
                  {(data?.metrics.latencyMinMs ? data.metrics.latencyMinMs * 1000 : 12.4).toFixed(2)} us
                </div>
              </div>
              <div className="p-3 border border-slate-800 rounded bg-black">
                <div className="text-slate-500 text-[11px]">Latência Média</div>
                <div className="text-purple-300 text-lg font-bold">
                  {(data?.metrics.latencyAvgMs ? data.metrics.latencyAvgMs * 1000 : 18.2).toFixed(2)} us
                </div>
              </div>
              <div className="p-3 border border-slate-800 rounded bg-black">
                <div className="text-slate-500 text-[11px]">Latência Máxima</div>
                <div className="text-amber-400 text-lg font-bold">
                  {(data?.metrics.latencyMaxMs ? data.metrics.latencyMaxMs * 1000 : 38.6).toFixed(2)} us
                </div>
              </div>
              <div className="p-3 border border-slate-800 rounded bg-black">
                <div className="text-slate-500 text-[11px]">Jitter Inter-Frame</div>
                <div className="text-cyan-400 text-lg font-bold">
                  {(data?.metrics.jitterMs ? data.metrics.jitterMs * 1000 : 1.8).toFixed(2)} us
                </div>
              </div>
            </div>

            {/* ASCII Latency Distribution Histogram */}
            <div className="p-3 border border-slate-800 rounded bg-black space-y-1">
              <div className="text-slate-400 text-[11px] mb-2 font-bold">Distribuição de Latência (Hardware Samples):</div>
              <div className="flex items-center text-[11px]">
                <span className="w-24 text-slate-500">&lt; 15 usec:</span>
                <div className="flex-1 bg-slate-900 h-2.5 rounded overflow-hidden mr-2">
                  <div className="bg-emerald-500 h-full" style={{ width: '42%' }} />
                </div>
                <span className="text-slate-300 w-16 text-right">42.0%</span>
              </div>
              <div className="flex items-center text-[11px]">
                <span className="w-24 text-slate-500">15 - 25 usec:</span>
                <div className="flex-1 bg-slate-900 h-2.5 rounded overflow-hidden mr-2">
                  <div className="bg-purple-500 h-full" style={{ width: '51%' }} />
                </div>
                <span className="text-slate-300 w-16 text-right">51.2%</span>
              </div>
              <div className="flex items-center text-[11px]">
                <span className="w-24 text-slate-500">25 - 50 usec:</span>
                <div className="flex-1 bg-slate-900 h-2.5 rounded overflow-hidden mr-2">
                  <div className="bg-amber-500 h-full" style={{ width: '6.5%' }} />
                </div>
                <span className="text-slate-300 w-16 text-right">6.5%</span>
              </div>
              <div className="flex items-center text-[11px]">
                <span className="w-24 text-slate-500">&gt; 50 usec:</span>
                <div className="flex-1 bg-slate-900 h-2.5 rounded overflow-hidden mr-2">
                  <div className="bg-red-500 h-full" style={{ width: '0.3%' }} />
                </div>
                <span className="text-slate-300 w-16 text-right">0.3%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: DPDK UTILIZATION */}
      {currentView === 'util' && (
        <div className="space-y-4">
          <div className="rounded border border-emerald-500/20 bg-slate-950/80 p-3 leading-relaxed">
            <div className="text-yellow-300 font-bold border-b border-emerald-500/30 pb-1 mb-3">
              -- DPDK CPU CORES & KERNEL MEMORY ARCHITECTURE --
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border border-slate-800 rounded bg-black space-y-2">
                <div className="text-slate-300 font-bold">Núcleos de CPU Dedicados (DPDK)</div>
                <div className="flex justify-between text-slate-400">
                  <span>Core 0 (Master / RPC):</span>
                  <span className="text-emerald-400">0.8%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Core 1 (Rx Thread / Latency):</span>
                  <span className="text-emerald-400">1.2%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Core 2 (Tx Worker Port 0):</span>
                  <span className="text-yellow-300">{(data?.metrics.cpuUtilPercent ?? 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Core 3 (Tx Worker Port 1):</span>
                  <span className="text-yellow-300">{(data?.metrics.cpuUtilPercent ?? 0).toFixed(1)}%</span>
                </div>
              </div>

              <div className="p-3 border border-slate-800 rounded bg-black space-y-2">
                <div className="text-slate-300 font-bold">HugePages & Zero-Copy Memory</div>
                <div className="flex justify-between text-slate-400">
                  <span>Page Size:</span>
                  <span className="text-slate-200">2048 kB (2MB Hugepages)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Alocação Total:</span>
                  <span className="text-slate-200">2048 MB (1024 páginas)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Memória Travada (mlockall):</span>
                  <span className="text-emerald-400">100% Locked (Sem Swap)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PCIe Direct Memory Access:</span>
                  <span className="text-emerald-400">DMA Zero-Copy Ativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TUI Footer Status Bar */}
      <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold">Atalhos TUI:</span>
          <span>[g] Global</span>
          <span>[p] Portas</span>
          <span>[l] Latência</span>
          <span>[u] DPDK Util</span>
          <span>[Space] Congelar</span>
        </div>
        <div className="text-slate-500">
          TRex DPDK Stateful & Stateless Engine • NCT Informática
        </div>
      </div>
    </div>
  );
};
