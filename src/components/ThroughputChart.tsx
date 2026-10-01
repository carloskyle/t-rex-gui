import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Maximize2, Zap, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface ThroughputChartProps {
  history: Array<{ time: number; txGbps: number; rxGbps: number }>;
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Latest real-time readings
  const latestPoint = history.length > 0 ? history[history.length - 1] : { txGbps: 0, rxGbps: 0, time: Date.now() };

  // Calculate highest peak observed in history
  const peakObserved = useMemo(() => {
    if (history.length === 0) return 0;
    return history.reduce((max, pt) => Math.max(max, pt.txGbps, pt.rxGbps), 0);
  }, [history]);

  // Compute effective maximum scale
  const effectiveMaxGbps = useMemo(() => {
    if (scaleMode !== 'auto') {
      return scaleMode;
    }

    // Auto-scaling: compute ideal ceiling based on current peak + 25% headroom
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
    const displayHeight = rect.height || 200;

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
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    timeLabels.forEach((label, idx) => {
      const x = paddingLeft + idx * timeStep;
      // Small vertical tick
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + graphHeight);
      ctx.stroke();

      ctx.fillText(label, x, height - paddingBottom + 6);
    });

    // If insufficient data, show waiting prompt
    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Aguardando fluxo de telemetria DPDK...', width / 2, height / 2);
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

    // 3. Draw Area Fill and Lines
    const drawSeries = (
      dataKey: 'txGbps' | 'rxGbps',
      strokeColor: string,
      gradientColorStart: string,
      gradientColorEnd: string,
      lineWidth = 2
    ) => {
      if (history.length === 0) return;

      // Create gradient fill
      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + graphHeight);
      grad.addColorStop(0, gradientColorStart);
      grad.addColorStop(1, gradientColorEnd);

      // Path for fill
      ctx.beginPath();
      ctx.moveTo(getX(0), paddingTop + graphHeight);
      history.forEach((pt, i) => {
        ctx.lineTo(getX(i), getY(pt[dataKey]));
      });
      ctx.lineTo(getX(history.length - 1), paddingTop + graphHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Path for stroke line
      ctx.beginPath();
      history.forEach((pt, i) => {
        const x = getX(i);
        const y = getY(pt[dataKey]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    // Draw RX (Cyan / Sky: #06b6d4)
    drawSeries('rxGbps', '#06b6d4', 'rgba(6, 182, 212, 0.25)', 'rgba(6, 182, 212, 0.01)', 2);

    // Draw TX (Emerald / Bright Green: #10b981)
    drawSeries('txGbps', '#10b981', 'rgba(16, 185, 129, 0.35)', 'rgba(16, 185, 129, 0.02)', 2.5);

    // 4. Hover Crosshair & Dot Markers
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length) {
      const pt = history[hoverIndex];
      const hX = getX(hoverIndex);
      const hTxY = getY(pt.txGbps);
      const hRxY = getY(pt.rxGbps);

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

      // RX Marker circle
      ctx.beginPath();
      ctx.arc(hX, hRxY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // TX Marker circle
      ctx.beginPath();
      ctx.arc(hX, hTxY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [history, effectiveMaxGbps, hoverIndex]);

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

  const hoveredData = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length ? history[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-sm">
      {/* Header bar: Live telemetries, peak & scale selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
        {/* Real-time Readings */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* TX Live */}
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400 text-[11px] font-sans">Tx:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {latestPoint.txGbps.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">{unit}</span>
            </div>
          </div>

          {/* RX Live */}
          <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400 text-[11px] font-sans">Rx:</span>
              <span className="font-bold text-cyan-400 text-sm">
                {latestPoint.rxGbps.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">{unit}</span>
            </div>
          </div>

          {/* Peak Observed */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Pico:</span>
            <span className="font-bold text-amber-300">{peakObserved.toFixed(2)} {unit}</span>
          </div>
        </div>

        {/* Dynamic Scale Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-mono">
          <span className="text-[10px] text-slate-500 px-1 font-sans flex items-center gap-1">
            <Maximize2 className="h-3 w-3 text-sky-400" />
            Escala:
          </span>

          {(['auto', 1, 5, 10, 25, 100] as const).map((sc) => (
            <button
              key={String(sc)}
              type="button"
              onClick={() => setScaleMode(sc)}
              className={`px-2 py-0.5 text-[11px] rounded transition cursor-pointer font-bold ${
                scaleMode === sc
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {sc === 'auto' ? 'Auto' : `${sc}G`}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas with absolute Tooltip Overlay */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-48 rounded-lg bg-slate-950/80 cursor-crosshair border border-slate-800/60 block"
        />

        {/* Floating Tooltip during Hover */}
        {hoveredData && hoverPos && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-mono text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.min(hoverPos.x + 12, (containerRef.current?.clientWidth || 700) - 150)}px`,
              top: `${Math.max(10, hoverPos.y - 70)}px`,
            }}
          >
            <div className="text-[10px] text-slate-400 pb-1 border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Ponto no Tempo</span>
              <span className="text-slate-500">{new Date(hoveredData.time).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-emerald-400">
              <span className="text-[11px] font-sans flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Tx:
              </span>
              <span className="font-bold">{hoveredData.txGbps.toFixed(3)} Gbps</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-cyan-400">
              <span className="text-[11px] font-sans flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Rx:
              </span>
              <span className="font-bold">{hoveredData.rxGbps.toFixed(3)} Gbps</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer bar: Details & Active scale label */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Injeção Tx (Mellanox 0)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Retorno Rx (Mellanox 1)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Escala no Canvas:</span>
          <span className="font-bold text-sky-400">
            {effectiveMaxGbps.toFixed(effectiveMaxGbps < 10 ? 1 : 0)} Gbps
            {scaleMode === 'auto' && ' (Auto-ajustada)'}
          </span>
        </div>
      </div>
    </div>
  );
};
