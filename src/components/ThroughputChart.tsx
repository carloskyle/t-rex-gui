import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Maximize2, Zap, ArrowLeftRight, Layers } from 'lucide-react';
import { ChartHistoryPoint } from '../types';

export type ChartViewMode = 'aggregate' | 'port0' | 'port1' | 'both';

interface ThroughputChartProps {
  history: Array<ChartHistoryPoint>;
  unit?: string;
  defaultScale?: 'auto' | 1 | 5 | 10 | 25 | 40 | 100;
  onClearHistory?: () => void;
}

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  history,
  unit = 'Gbps',
  defaultScale = 'auto',
  onClearHistory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scaleMode, setScaleMode] = useState<'auto' | 1 | 5 | 10 | 25 | 40 | 100>(defaultScale);
  const [viewMode, setViewMode] = useState<ChartViewMode>('aggregate');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Latest real-time readings
  const latestPoint: ChartHistoryPoint = history.length > 0 ? history[history.length - 1] : {
    time: Date.now(),
    txGbps: 0,
    rxGbps: 0,
    p0TxGbps: 0,
    p0RxGbps: 0,
    p1TxGbps: 0,
    p1RxGbps: 0,
  };

  // Calculate highest peak observed in history according to active viewMode
  const peakObserved = useMemo(() => {
    if (history.length === 0) return 0;
    return history.reduce((max, pt) => {
      if (viewMode === 'port0') {
        return Math.max(max, pt.p0TxGbps || pt.txGbps / 2, pt.p0RxGbps || pt.rxGbps / 2);
      }
      if (viewMode === 'port1') {
        return Math.max(max, pt.p1TxGbps || pt.txGbps / 2, pt.p1RxGbps || pt.rxGbps / 2);
      }
      if (viewMode === 'both') {
        return Math.max(
          max,
          pt.p0TxGbps || pt.txGbps / 2,
          pt.p0RxGbps || pt.rxGbps / 2,
          pt.p1TxGbps || pt.txGbps / 2,
          pt.p1RxGbps || pt.rxGbps / 2
        );
      }
      // Aggregate mode (Total Tx vs Total Rx)
      return Math.max(max, pt.txGbps, pt.rxGbps);
    }, 0);
  }, [history, viewMode]);

  // Compute effective maximum scale
  const effectiveMaxGbps = useMemo(() => {
    if (scaleMode !== 'auto') {
      return scaleMode;
    }

    const peak = Math.max(0.2, peakObserved);
    const headroom = peak * 1.25;

    if (headroom <= 0.5) return 0.5;
    if (headroom <= 1) return 1.0;
    if (headroom <= 2) return 2.0;
    if (headroom <= 3) return 3.0;
    if (headroom <= 5) return 5.0;
    if (headroom <= 10) return 10.0;
    if (headroom <= 15) return 15.0;
    if (headroom <= 25) return 25.0;
    if (headroom <= 40) return 40.0;
    if (headroom <= 50) return 50.0;
    if (headroom <= 100) return 100.0;
    return Math.ceil(headroom / 20) * 20;
  }, [scaleMode, peakObserved]);

  // Render chart onto canvas with HiDPI crispness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays (Retina/4K)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || 700;
    const displayHeight = rect.height || 210;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Padding settings
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 12;
    const paddingBottom = 24;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;
    const maxVal = Math.max(0.1, effectiveMaxGbps);

    // 1. Draw horizontal grid lines and Y-axis scale labels
    const gridLines = 4;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)'; // slate-700 / 40%

    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (graphHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Label value
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const formattedVal = val >= 10 ? val.toFixed(0) : val >= 1 ? val.toFixed(1) : val.toFixed(2);
      ctx.fillText(`${formattedVal}`, paddingLeft - 8, y);
    }

    // 2. Draw vertical time indicators along bottom
    const timeLabels = ['-60s', '-45s', '-30s', '-15s', 'Agora'];
    const timeStep = graphWidth / (timeLabels.length - 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94a3b8'; // slate-400 for WCAG AA
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    timeLabels.forEach((label, idx) => {
      const x = paddingLeft + idx * timeStep;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + graphHeight);
      ctx.stroke();

      ctx.fillText(label, x, height - paddingBottom + 6);
    });

    // If insufficient data, show waiting prompt
    if (history.length < 2) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Aguardando injeção e recepção de tráfego DPDK Full-Duplex...', width / 2, height / 2);
      return;
    }

    // Function to calculate canvas (X, Y) coordinate for a data point
    const getX = (index: number) => {
      return paddingLeft + (index / (history.length - 1)) * graphWidth;
    };
    const getY = (val: number) => {
      const clamped = Math.min(Math.max(0, val), maxVal);
      return paddingTop + graphHeight - (clamped / maxVal) * graphHeight;
    };

    // Helper to draw a single data series with optional gradient fill
    const drawSeries = (
      getValue: (pt: ChartHistoryPoint) => number,
      strokeColor: string,
      gradientStart?: string,
      gradientEnd?: string,
      lineWidth = 2
    ) => {
      if (history.length === 0) return;

      // Area gradient fill
      if (gradientStart && gradientEnd) {
        const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + graphHeight);
        grad.addColorStop(0, gradientStart);
        grad.addColorStop(1, gradientEnd);

        ctx.beginPath();
        ctx.moveTo(getX(0), paddingTop + graphHeight);
        history.forEach((pt, i) => {
          ctx.lineTo(getX(i), getY(getValue(pt)));
        });
        ctx.lineTo(getX(history.length - 1), paddingTop + graphHeight);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Stroke line
      ctx.beginPath();
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(getValue(pt));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    // 3. Draw series based on active viewMode
    if (viewMode === 'aggregate') {
      // Full-Duplex Aggregate: Total Rx (Cyan) & Total Tx (Emerald)
      drawSeries((pt) => pt.rxGbps, '#06b6d4', 'rgba(6, 182, 212, 0.22)', 'rgba(6, 182, 212, 0.01)', 2);
      drawSeries((pt) => pt.txGbps, '#10b981', 'rgba(16, 185, 129, 0.32)', 'rgba(16, 185, 129, 0.02)', 2.5);
    } else if (viewMode === 'port0') {
      // Interface 0: Rx (Cyan) & Tx (Emerald)
      drawSeries((pt) => pt.p0RxGbps ?? pt.rxGbps / 2, '#06b6d4', 'rgba(6, 182, 212, 0.25)', 'rgba(6, 182, 212, 0.01)', 2);
      drawSeries((pt) => pt.p0TxGbps ?? pt.txGbps / 2, '#10b981', 'rgba(16, 185, 129, 0.35)', 'rgba(16, 185, 129, 0.02)', 2.5);
    } else if (viewMode === 'port1') {
      // Interface 1: Rx (Cyan) & Tx (Emerald)
      drawSeries((pt) => pt.p1RxGbps ?? pt.rxGbps / 2, '#38bdf8', 'rgba(56, 189, 248, 0.25)', 'rgba(56, 189, 248, 0.01)', 2);
      drawSeries((pt) => pt.p1TxGbps ?? pt.txGbps / 2, '#34d399', 'rgba(52, 211, 153, 0.35)', 'rgba(52, 211, 153, 0.02)', 2.5);
    } else if (viewMode === 'both') {
      // 4 Vias Simultâneas (Port 0 Tx/Rx + Port 1 Tx/Rx)
      // P1 Rx: Purple #a855f7
      drawSeries((pt) => pt.p1RxGbps ?? pt.rxGbps / 2, '#a855f7', undefined, undefined, 2);
      // P1 Tx: Amber #f59e0b
      drawSeries((pt) => pt.p1TxGbps ?? pt.txGbps / 2, '#f59e0b', undefined, undefined, 2);
      // P0 Rx: Cyan #06b6d4
      drawSeries((pt) => pt.p0RxGbps ?? pt.rxGbps / 2, '#06b6d4', undefined, undefined, 2);
      // P0 Tx: Emerald #10b981
      drawSeries((pt) => pt.p0TxGbps ?? pt.txGbps / 2, '#10b981', undefined, undefined, 2.5);
    }

    // 4. Hover Crosshair & Dot Markers
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length) {
      const pt = history[hoverIndex];
      const hX = getX(hoverIndex);

      // Vertical dashed line
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hX, paddingTop);
      ctx.lineTo(hX, paddingTop + graphHeight);
      ctx.stroke();
      ctx.restore();

      const drawDot = (val: number, color: string) => {
        const dotY = getY(val);
        ctx.beginPath();
        ctx.arc(hX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      if (viewMode === 'aggregate') {
        drawDot(pt.rxGbps, '#06b6d4');
        drawDot(pt.txGbps, '#10b981');
      } else if (viewMode === 'port0') {
        drawDot(pt.p0RxGbps ?? pt.rxGbps / 2, '#06b6d4');
        drawDot(pt.p0TxGbps ?? pt.txGbps / 2, '#10b981');
      } else if (viewMode === 'port1') {
        drawDot(pt.p1RxGbps ?? pt.rxGbps / 2, '#38bdf8');
        drawDot(pt.p1TxGbps ?? pt.txGbps / 2, '#34d399');
      } else if (viewMode === 'both') {
        drawDot(pt.p0TxGbps ?? pt.txGbps / 2, '#10b981');
        drawDot(pt.p0RxGbps ?? pt.rxGbps / 2, '#06b6d4');
        drawDot(pt.p1TxGbps ?? pt.txGbps / 2, '#f59e0b');
        drawDot(pt.p1RxGbps ?? pt.rxGbps / 2, '#a855f7');
      }
    }
  }, [history, effectiveMaxGbps, hoverIndex, viewMode]);

  // Handle canvas mouse move for interactive tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const paddingLeft = 45;
    const paddingRight = 15;
    const graphWidth = rect.width - paddingLeft - paddingRight;

    if (mouseX < paddingLeft || mouseX > rect.width - paddingRight) {
      setHoverIndex(null);
      setHoverPos(null);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (mouseX - paddingLeft) / graphWidth));
    const index = Math.round(ratio * (history.length - 1));

    setHoverIndex(index);
    setHoverPos({ x: mouseX, y: mouseY });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  // Keyboard navigation on canvas for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (history.length < 2) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoverIndex((prev) => {
        const next = prev === null ? 0 : Math.min(history.length - 1, prev + 1);
        return next;
      });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoverIndex((prev) => {
        const next = prev === null ? history.length - 1 : Math.max(0, prev - 1);
        return next;
      });
    } else if (e.key === 'Escape') {
      setHoverIndex(null);
      setHoverPos(null);
    }
  };

  const hoveredData = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length ? history[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Gráfico de Throughput de Rede em Tempo Real"
      className="relative w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-sm"
    >
      {/* Top Bar: View Mode Switcher and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
        {/* View Mode Tabs (Accessible Tablist) */}
        <div
          className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs"
          role="tablist"
          aria-label="Modo de visualização do gráfico"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'aggregate'}
            onClick={() => setViewMode('aggregate')}
            className={`min-h-[36px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === 'aggregate'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Full-Duplex Agregado</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'port0'}
            onClick={() => setViewMode('port0')}
            className={`min-h-[36px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === 'port0'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Porta 0 (Tx/Rx)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'port1'}
            onClick={() => setViewMode('port1')}
            className={`min-h-[36px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === 'port1'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Porta 1 (Tx/Rx)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'both'}
            onClick={() => setViewMode('both')}
            className={`min-h-[36px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              viewMode === 'both'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Visualizar as 4 curvas simultâneas (Port 0 Tx/Rx e Port 1 Tx/Rx)"
          >
            <Activity className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span>4 Vias (Simultâneo)</span>
          </button>
        </div>

        {/* Dynamic Scale Switcher */}
        <div
          className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-mono"
          role="group"
          aria-label="Escala do gráfico em gigabits por segundo"
        >
          <span className="text-[10px] text-slate-400 px-1 font-sans flex items-center gap-1">
            <Maximize2 className="h-3 w-3 text-sky-400" aria-hidden="true" />
            Escala:
          </span>

          {(['auto', 1, 5, 10, 25, 40, 100] as const).map((sc) => (
            <button
              key={String(sc)}
              type="button"
              aria-pressed={scaleMode === sc}
              onClick={() => setScaleMode(sc)}
              className={`min-h-[32px] px-2 py-0.5 text-[11px] rounded transition cursor-pointer font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                scaleMode === sc
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {sc === 'auto' ? 'Auto' : `${sc}G`}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Telemetry Badges according to active viewMode */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs font-mono"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'aggregate' && (
            <>
              {/* Total Tx */}
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Tx Total (P0+P1):</span>
                  <span className="font-bold text-emerald-400 text-sm">{latestPoint.txGbps.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>

              {/* Total Rx */}
              <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Rx Total (P0+P1):</span>
                  <span className="font-bold text-cyan-400 text-sm">{latestPoint.rxGbps.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>

              {/* Aggregate Full-Duplex Throughput */}
              <div className="hidden md:flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 text-[11px]">
                <ArrowLeftRight className="h-3 w-3 text-sky-400" aria-hidden="true" />
                <span>Full-Duplex Total:</span>
                <span className="font-bold text-sky-300">{(latestPoint.txGbps + latestPoint.rxGbps).toFixed(2)} {unit}</span>
              </div>
            </>
          )}

          {viewMode === 'port0' && (
            <>
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Porta 0 Tx:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {(latestPoint.p0TxGbps ?? latestPoint.txGbps / 2).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Porta 0 Rx:</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {(latestPoint.p0RxGbps ?? latestPoint.rxGbps / 2).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>
            </>
          )}

          {viewMode === 'port1' && (
            <>
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Porta 1 Tx:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {(latestPoint.p1TxGbps ?? latestPoint.txGbps / 2).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-300 text-[11px] font-sans">Porta 1 Rx:</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {(latestPoint.p1RxGbps ?? latestPoint.rxGbps / 2).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>
            </>
          )}

          {viewMode === 'both' && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> P0 Tx: {(latestPoint.p0TxGbps ?? latestPoint.txGbps / 2).toFixed(2)}
              </span>
              <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" /> P0 Rx: {(latestPoint.p0RxGbps ?? latestPoint.rxGbps / 2).toFixed(2)}
              </span>
              <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" /> P1 Tx: {(latestPoint.p1TxGbps ?? latestPoint.txGbps / 2).toFixed(2)}
              </span>
              <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" /> P1 Rx: {(latestPoint.p1RxGbps ?? latestPoint.rxGbps / 2).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Peak Observed */}
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
          <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Pico na Vista:</span>
          <span className="font-bold text-amber-300">{peakObserved.toFixed(2)} {unit}</span>
        </div>
      </div>

      {/* Chart Canvas with accessible keyboard navigation */}
      <div className="relative rounded-xl border border-slate-700/80 bg-slate-950 p-1 shadow-inner">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Gráfico de Throughput em tempo real (${viewMode}). Tx: ${latestPoint.txGbps.toFixed(2)} Gbps, Rx: ${latestPoint.rxGbps.toFixed(2)} Gbps.`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          className="w-full h-52 rounded-lg bg-slate-950 cursor-crosshair block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        />

        {/* Hover hint badge */}
        {!hoveredData && history.length > 0 && (
          <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-slate-900/80 border border-slate-700/50 px-2 py-0.5 text-[10px] text-slate-400 font-sans backdrop-blur-sm">
            Passe o mouse ou use ← → para inspecionar pontos
          </div>
        )}

        {/* Floating Tooltip during Hover */}
        {hoveredData && hoverPos && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-mono text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.min(hoverPos.x + 12, (containerRef.current?.clientWidth || 700) - 170)}px`,
              top: `${Math.max(10, hoverPos.y - 85)}px`,
            }}
          >
            <div className="text-[10px] text-slate-300 pb-1 border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Instante da Amostra</span>
              <span className="text-slate-400">{new Date(hoveredData.time).toLocaleTimeString()}</span>
            </div>

            {viewMode === 'aggregate' && (
              <>
                <div className="flex items-center justify-between gap-3 text-emerald-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Tx Total:
                  </span>
                  <span className="font-bold">{hoveredData.txGbps.toFixed(3)} Gbps</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-cyan-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" /> Rx Total:
                  </span>
                  <span className="font-bold">{hoveredData.rxGbps.toFixed(3)} Gbps</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sky-300 pt-1 border-t border-slate-800/60 text-[10px]">
                  <span>Full-Duplex:</span>
                  <span className="font-bold">{(hoveredData.txGbps + hoveredData.rxGbps).toFixed(3)} Gbps</span>
                </div>
              </>
            )}

            {viewMode === 'port0' && (
              <>
                <div className="flex items-center justify-between gap-3 text-emerald-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> P0 Tx:
                  </span>
                  <span className="font-bold">{(hoveredData.p0TxGbps ?? hoveredData.txGbps / 2).toFixed(3)} Gbps</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-cyan-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" /> P0 Rx:
                  </span>
                  <span className="font-bold">{(hoveredData.p0RxGbps ?? hoveredData.rxGbps / 2).toFixed(3)} Gbps</span>
                </div>
              </>
            )}

            {viewMode === 'port1' && (
              <>
                <div className="flex items-center justify-between gap-3 text-emerald-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> P1 Tx:
                  </span>
                  <span className="font-bold">{(hoveredData.p1TxGbps ?? hoveredData.txGbps / 2).toFixed(3)} Gbps</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-cyan-400">
                  <span className="text-[11px] font-sans flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" /> P1 Rx:
                  </span>
                  <span className="font-bold">{(hoveredData.p1RxGbps ?? hoveredData.rxGbps / 2).toFixed(3)} Gbps</span>
                </div>
              </>
            )}

            {viewMode === 'both' && (
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between gap-2 text-emerald-400">
                  <span>P0 Tx:</span>
                  <span className="font-bold">{(hoveredData.p0TxGbps ?? hoveredData.txGbps / 2).toFixed(3)} Gbps</span>
                </div>
                <div className="flex justify-between gap-2 text-cyan-400">
                  <span>P0 Rx:</span>
                  <span className="font-bold">{(hoveredData.p0RxGbps ?? hoveredData.rxGbps / 2).toFixed(3)} Gbps</span>
                </div>
                <div className="flex justify-between gap-2 text-amber-300">
                  <span>P1 Tx:</span>
                  <span className="font-bold">{(hoveredData.p1TxGbps ?? hoveredData.txGbps / 2).toFixed(3)} Gbps</span>
                </div>
                <div className="flex justify-between gap-2 text-purple-300">
                  <span>P1 Rx:</span>
                  <span className="font-bold">{(hoveredData.p1RxGbps ?? hoveredData.rxGbps / 2).toFixed(3)} Gbps</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer bar: Details & Active scale label */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 font-sans">
            <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span className="text-slate-200">Tráfego Bidirecional Simétrico:</span>
            <span className="text-slate-300">Porta 0 (Tx ⇄ Rx) e Porta 1 (Tx ⇄ Rx)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Escala do Eixo Y:</span>
          <span className="font-bold text-sky-400">
            {effectiveMaxGbps.toFixed(effectiveMaxGbps < 10 ? 1 : 0)} Gbps
            {scaleMode === 'auto' && ' (Auto-dinâmica)'}
          </span>
        </div>
      </div>
    </div>
  );
};
