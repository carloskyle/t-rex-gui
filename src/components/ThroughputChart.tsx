import React, { useEffect, useRef } from 'react';

interface ThroughputChartProps {
  history: Array<{ time: number; txGbps: number; rxGbps: number }>;
  unit?: string;
  peakGbps?: number;
}

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  history,
  unit = 'Gbps',
  peakGbps = 100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = '#343746';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = (height / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Label
      const val = peakGbps - (peakGbps / gridLines) * i;
      ctx.fillStyle = '#6272a4';
      ctx.font = '9px Fira Code, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${val.toFixed(0)}`, 35, y + 3);
    }

    if (history.length < 2) {
      ctx.fillStyle = '#6272a4';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando injeção de tráfego DPDK...', width / 2, height / 2);
      return;
    }

    const paddingLeft = 45;
    const graphWidth = width - paddingLeft;
    const maxVal = Math.max(1, peakGbps);

    // Draw TX area and line (Green #50fa7b)
    const drawLine = (
      dataKey: 'txGbps' | 'rxGbps',
      strokeColor: string,
      fillColor: string
    ) => {
      ctx.beginPath();
      history.forEach((pt, index) => {
        const x = paddingLeft + (index / (history.length - 1)) * graphWidth;
        const y = height - (Math.min(pt[dataKey], maxVal) / maxVal) * (height - 10) - 5;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Area fill
      ctx.lineTo(width, height);
      ctx.lineTo(paddingLeft, height);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    // Draw RX (Purple #bd93f9)
    drawLine('rxGbps', '#bd93f9', 'rgba(189, 147, 249, 0.12)');
    // Draw TX (Green #50fa7b)
    drawLine('txGbps', '#50fa7b', 'rgba(80, 250, 123, 0.20)');

  }, [history, peakGbps]);

  return (
    <div className="relative w-full rounded-xl border border-[#44475a] bg-[#282a36] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#50fa7b]" />
            <span className="text-[#f8f8f2]">Tx Throughput</span>
            <span className="text-[10px] text-[#6272a4]">({unit})</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#bd93f9]" />
            <span className="text-[#f8f8f2]">Rx Throughput</span>
            <span className="text-[10px] text-[#6272a4]">({unit})</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#6272a4]">
          Escala Max: <span className="text-[#8be9fd]">{peakGbps} Gbps</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={700}
        height={180}
        className="w-full h-44 rounded-lg bg-[#1e1f29]/70"
      />
    </div>
  );
};
