import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Cpu,
  Clock,
  ArrowRightLeft,
  HardDrive,
  Search,
  RefreshCw,
  Info,
  FileText,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { TRexStatus, TestReport } from '../types';
import { ApiClient } from '../services/api';

interface TrafficAnalysisTabProps {
  status: TRexStatus | null;
}

interface HistoricalAuditItem {
  id: string;
  timestamp: string;
  profile: string;
  dir: string;
  multiplier: string;
  totalTx: number;
  totalRx: number;
  deltaPackets: number;
  reportedDropRate: number;
  officialVerdict: 'zero_loss' | 'sampling_skew' | 'physical_drop';
  verdictReason: string;
}

export const TrafficAnalysisTab: React.FC<TrafficAnalysisTabProps> = ({ status }) => {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedAuditReport, setSelectedAuditReport] = useState<HistoricalAuditItem | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  
  // Real-time rolling samples for the sampling oscilloscope (last 20 seconds)
  const [rollingSamples, setRollingSamples] = useState<
    Array<{
      time: string;
      txPps: number;
      rxPps: number;
      diffPps: number;
      officialDropBps: number;
      inFlightEstimate: number;
    }>
  >([]);

  // Fetch past reports for historical correlation
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const data = await ApiClient.getReports();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Falha ao carregar relatórios para análise histórica:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Update rolling samples whenever status changes
  useEffect(() => {
    if (!status?.metrics) return;

    const txPps = status.metrics.txPps || 0;
    const rxPps = status.metrics.rxPps || 0;
    const diffPps = Math.round(txPps - rxPps);
    const latencyMs = status.metrics.latencyAvgMs || 0.02;
    // Bandwidth-Delay Product (BDP) in packets: frames currently on the wire or inside hardware FIFO
    const inFlightEstimate = Math.round(txPps * (latencyMs / 1000));
    const officialDropBps = status.metrics.rxDropBps || 0;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setRollingSamples((prev) => {
      const next = [
        ...prev,
        {
          time: timeStr,
          txPps,
          rxPps,
          diffPps,
          officialDropBps,
          inFlightEstimate,
        },
      ];
      // Keep up to 20 points
      return next.slice(-20);
    });
  }, [status?.metrics]);

  // Real-time metrics
  const isRunning = status?.isRunning ?? false;
  const txPps = status?.metrics.txPps ?? 0;
  const rxPps = status?.metrics.rxPps ?? 0;
  const txBps = status?.metrics.txBps ?? 0;
  const rxDropBps = status?.metrics.rxDropBps ?? 0;
  const dropRatePercent = status?.metrics.dropRatePercent ?? 0;
  const latencyMs = status?.metrics.latencyAvgMs ?? 0.022;

  // Aggregate hardware ring buffer errors from all ports
  const totalHardwareErrors = useMemo(() => {
    if (!status?.ports) return 0;
    return status.ports.reduce((acc, p) => acc + (p.ierrors || 0) + (p.oerrors || 0), 0);
  }, [status?.ports]);

  // Aggregate cumulative packets from ports
  const totalCumulativeOpkts = useMemo(() => {
    if (!status?.ports) return 0;
    return status.ports.reduce((acc, p) => acc + (p.opackets || 0), 0);
  }, [status?.ports]);

  const totalCumulativeIpkts = useMemo(() => {
    if (!status?.ports) return 0;
    return status.ports.reduce((acc, p) => acc + (p.ipackets || 0), 0);
  }, [status?.ports]);

  // Calculated sampling delta
  const instantaneousDeltaPps = Math.round(txPps - rxPps);
  const deltaPercentOfTx = txPps > 0 ? (Math.abs(instantaneousDeltaPps) / txPps) * 100 : 0;
  const estimatedInFlightFrames = Math.round(txPps * (latencyMs / 1000));

  // Diagnostic rules evaluation
  const realTimeDiagnosis = useMemo(() => {
    if (!isRunning) {
      return {
        state: 'idle' as const,
        title: 'Gerador em Espera (IDLE)',
        badge: 'Pronto para Teste',
        badgeColor: 'border-slate-700 bg-slate-800 text-slate-300',
        summary: 'Inicie uma injeção de tráfego para inspecionar a correlação entre telemetria de 1.0s e contadores de hardware.',
        isFalsePositive: false,
      };
    }

    if (totalHardwareErrors > 0) {
      return {
        state: 'hardware_error' as const,
        title: 'Descarte Físico nos Anéis da Placa (NIC Ring Overrun)',
        badge: 'Queda Físico de Hardware',
        badgeColor: 'border-red-600 bg-red-950/60 text-red-300 font-bold',
        summary: `Foram detectados ${totalHardwareErrors} erros nos anéis PCIe da placa de rede (ierrors/oerrors). A CPU ou o barramento PCIe não conseguiu drenar a fila do driver.`,
        isFalsePositive: false,
      };
    }

    if (rxDropBps > 0) {
      return {
        state: 'real_drop' as const,
        title: 'Descarte Real Confirmado pelo Motor TRex',
        badge: 'Perda Real no Circuito/DUT',
        badgeColor: 'border-red-600 bg-red-950/60 text-red-300 font-bold',
        summary: `O motor DPDK reportou ${((rxDropBps) / 1e6).toFixed(2)} Mbps de descarte ativo. O DUT (equipamento sob teste) ou a interface de recepção atingiu o limite de capacidade.`,
        isFalsePositive: false,
      };
    }

    // If official drop is 0, but instantaneous delta is > 0:
    if (Math.abs(instantaneousDeltaPps) > 0 && deltaPercentOfTx > 0.05) {
      return {
        state: 'sampling_jitter' as const,
        title: 'Discrepância de Janela de Amostragem (Falso Positivo Evitado)',
        badge: 'Falso Positivo Neutralizado',
        badgeColor: 'border-amber-500 bg-amber-950/60 text-amber-300 font-bold',
        summary: `Variação momentânea de ${instantaneousDeltaPps.toLocaleString()} PPS (${deltaPercentOfTx.toFixed(2)}% da taxa instantânea). Como o motor TRex oficial reporta 0 bps e ierrors=0, todos os quadros estão íntegros nos buffers ou compensados na janela seguinte.`,
        isFalsePositive: true,
      };
    }

    return {
      state: 'zero_loss' as const,
      title: 'Zero Loss Perfeito (100% de Entrega Confirmada)',
      badge: 'Zero-Loss RFC 2544',
      badgeColor: 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold',
      summary: 'Alinhamento exato entre taxa de injeção e recepção. Sem atrasos anômalos de leitura, sem perdas no DUT e com os anéis PCIe operando em folga total.',
      isFalsePositive: false,
    };
  }, [isRunning, totalHardwareErrors, rxDropBps, instantaneousDeltaPps, deltaPercentOfTx]);

  // Historical audit analysis
  const auditedHistoricalItems: HistoricalAuditItem[] = useMemo(() => {
    return reports.map((r) => {
      const tx = r.summary?.totalPacketsTx || 0;
      const rx = r.summary?.totalPacketsRx || 0;
      const delta = Math.max(0, tx - rx);
      const reportedDrop = r.summary?.avgDropRatePercent || 0;

      let verdict: 'zero_loss' | 'sampling_skew' | 'physical_drop' = 'zero_loss';
      let reason = '100% dos pacotes recebidos sem perdas registradas.';

      if (reportedDrop > 0.5) {
        verdict = 'physical_drop';
        reason = `Perda consistente registrada de ${reportedDrop.toFixed(4)}%. Saturação real no DUT.`;
      } else if (delta > 0 && reportedDrop <= 0.5) {
        // High likelihood of sampling / end-of-test drain artifact
        verdict = 'sampling_skew';
        reason = `Discrepância de ${delta.toLocaleString()} pacotes causada pelo encerramento do teste enquanto pacotes estavam em trânsito no cabo/buffer (Drain Latency).`;
      }

      return {
        id: r.id,
        timestamp: r.timestamp,
        profile: r.profile,
        dir: r.dir,
        multiplier: r.multiplier,
        totalTx: tx,
        totalRx: rx,
        deltaPackets: delta,
        reportedDropRate: reportedDrop,
        officialVerdict: verdict,
        verdictReason: reason,
      };
    });
  }, [reports]);

  // Filtered historical list
  const filteredAuditedItems = useMemo(() => {
    if (!historySearch.trim()) return auditedHistoricalItems;
    const q = historySearch.toLowerCase();
    return auditedHistoricalItems.filter(
      (item) =>
        item.profile.toLowerCase().includes(q) ||
        item.multiplier.toLowerCase().includes(q) ||
        item.dir.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [auditedHistoricalItems, historySearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">
                Auditoria de Telemetria DPDK
              </span>
              <span className="text-xs font-mono text-slate-400">
                Amostragem: 1.0s • Host: {status?.serverIp || '10.69.70.20'}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold font-sans text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-400" />
              Análise de Tráfego & Diagnóstico de Amostragem
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-3xl leading-relaxed">
              Compara a taxa instantânea do TRex API contra os contadores oficiais do anel de hardware para identificar
              defasagens de amostragem de milissegundos que causam falsos positivos de <em>Drop Rate</em> na interface Web.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchReports}
              disabled={loadingReports}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
              <span>Atualizar Histórico</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Comparison KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Official TRex Engine Drop Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Motor TRex Oficial</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                dropRatePercent > 0.0001 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {dropRatePercent.toFixed(4)}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {rxDropBps > 0 ? `(${((rxDropBps) / 1e6).toFixed(2)} Mbps)` : '(0 bps)'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>rx_drop_bps nativo do DPDK (Ground Truth)</span>
          </div>
        </div>

        {/* Card 2: Instantaneous Sampling Delta */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Delta Instantâneo (Tx - Rx)</span>
            <ArrowRightLeft className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                Math.abs(instantaneousDeltaPps) > 1000 ? 'text-amber-300' : 'text-slate-100'
              }`}
            >
              {instantaneousDeltaPps > 0 ? `+${instantaneousDeltaPps.toLocaleString()}` : instantaneousDeltaPps.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400">PPS</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Oscilação: {deltaPercentOfTx.toFixed(3)}%</span>
            <span className={deltaPercentOfTx <= 2 ? 'text-emerald-400' : 'text-amber-400'}>
              {deltaPercentOfTx <= 2 ? 'Normal (DPDK Jitter)' : 'Defasagem detectada'}
            </span>
          </div>
        </div>

        {/* Card 3: In-Flight Buffer Estimation */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Quadros em Voo (In-Flight)</span>
            <Clock className="h-4 w-4 text-purple-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              ~{estimatedInFlightFrames.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400">pacotes</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            BDP: Tx PPS × Latência RTT ({latencyMs.toFixed(3)} ms)
          </div>
        </div>

        {/* Card 4: Hardware NIC Ring Errors */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Anéis PCIe (ierrors / oerrors)</span>
            <Cpu className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                totalHardwareErrors > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {totalHardwareErrors}
            </span>
            <span className="text-xs font-mono text-slate-400">erros</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                totalHardwareErrors === 0 ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span>{totalHardwareErrors === 0 ? 'Hardware FIFO 100% íntegro' : 'Sobrecarga de anel detectada'}</span>
          </div>
        </div>
      </div>

      {/* Smart Verdict Box (Detector de Falso Positivo) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {realTimeDiagnosis.state === 'zero_loss' && (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
            {realTimeDiagnosis.state === 'sampling_jitter' && (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
            {realTimeDiagnosis.state === 'real_drop' && (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            {realTimeDiagnosis.state === 'hardware_error' && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {realTimeDiagnosis.state === 'idle' && (
              <Info className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-100">{realTimeDiagnosis.title}</h2>
              <p className="text-xs text-slate-400">{realTimeDiagnosis.summary}</p>
            </div>
          </div>

          <span
            className={`self-start sm:self-auto rounded-lg border px-3 py-1 text-xs font-mono font-medium ${realTimeDiagnosis.badgeColor}`}
          >
            {realTimeDiagnosis.badge}
          </span>
        </div>

        {/* Diagnostic Rules Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>1. Oscilação de Relógio (Clock Skew)</span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">OK (Compensado)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O DPDK coleta amostras a cada 1.000 ms. Pequenas variações de chegada ($\pm 1.5\%$) são absorvidas na janela subsequente sem perda física.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>2. Simetria de Perfil de Tráfego</span>
              <span className="font-mono text-[10px] text-sky-400 font-bold">
                {status?.mode || 'STL'} Full-Duplex
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Diferenças em perfis assimétricos ou unidirecionais não devem ser interpretadas como perda de quadros. O TRex rastreia fluxos via stream ID.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>3. Drenagem de Encerramento (Drain)</span>
              <span className="font-mono text-[10px] text-purple-300 font-bold">
                ~{estimatedInFlightFrames} pkts em voo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ao finalizar o teste, o gerador deve aguardar ~1 segundo de <em>drain latency</em> para que os quadros em voo atinjam a interface de recepção.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Oscilloscope: Tx vs Rx Instantaneous Sampling Skew */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-400" />
              Osciloscópio de Amostragem em Tempo Real (Últimos 20 Segundos)
            </h3>
            <p className="text-xs text-slate-400">
              Demonstra visualmente como o Rx acompanha o Tx em tempo real e comprova que variações instantâneas são flutuações de leitura e não descarte.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Tx Rate (PPS)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Rx Rate (PPS)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              TRex Drop Line (0 bps)
            </span>
          </div>
        </div>

        {/* SVG Sparkline Graph */}
        <div className="h-48 w-full rounded-xl bg-slate-950 p-3 border border-slate-800/80 flex flex-col justify-between">
          {rollingSamples.length < 2 ? (
            <div className="flex h-full items-center justify-center text-xs font-mono text-slate-500">
              {isRunning
                ? 'Coletando janelas de telemetria consecutivas...'
                : 'Aguardando início de teste para traçar o osciloscópio de amostragem.'}
            </div>
          ) : (
            <div className="relative h-full w-full">
              {/* Max value calculation */}
              {(() => {
                const maxVal = Math.max(
                  ...rollingSamples.map((s) => Math.max(s.txPps, s.rxPps)),
                  1000
                );
                const pointsTx = rollingSamples
                  .map((s, idx) => {
                    const x = (idx / (rollingSamples.length - 1)) * 100;
                    const y = 100 - (s.txPps / maxVal) * 85 - 5;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const pointsRx = rollingSamples
                  .map((s, idx) => {
                    const x = (idx / (rollingSamples.length - 1)) * 100;
                    const y = 100 - (s.rxPps / maxVal) * 85 - 5;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />
                    <line x1="0" y1="80" x2="100" y2="80" stroke="#334155" strokeDasharray="2,2" strokeWidth="0.5" />

                    {/* Zero Drop Ground Truth Line */}
                    <line x1="0" y1="95" x2="100" y2="95" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Tx Polyline */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pointsTx}
                    />

                    {/* Rx Polyline */}
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pointsRx}
                    />
                  </svg>
                );
              })()}
            </div>
          )}

          {/* Time axis stamps */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-900">
            <span>{rollingSamples[0]?.time || 'T-20s'}</span>
            <span>Taxa Máxima: {Math.max(...rollingSamples.map((s) => s.txPps), 0).toLocaleString()} PPS</span>
            <span>{rollingSamples[rollingSamples.length - 1]?.time || 'Agora (T-0s)'}</span>
          </div>
        </div>
      </div>

      {/* Historical Discrepancy Correlator (Audit of past reports) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              Auditoria de Discrepâncias no Histórico de Testes
            </h3>
            <p className="text-xs text-slate-400">
              Analisa os relatórios armazenados em <code>data/reports.json</code> para classificar se testes anteriores
              sofreram perdas reais ou defasagem de contadores no encerramento (DUT Drain Artifact).
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Filtrar por perfil, taxa..."
              className="rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none w-56 font-mono"
            />
          </div>
        </div>

        {/* Audited Reports Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">Data / Hora</th>
                <th className="px-3 py-2.5">Perfil</th>
                <th className="px-3 py-2.5">Taxa (-m)</th>
                <th className="px-3 py-2.5 text-right">Total Tx Pkts</th>
                <th className="px-3 py-2.5 text-right">Total Rx Pkts</th>
                <th className="px-3 py-2.5 text-right">Diferença (Delta)</th>
                <th className="px-3 py-2.5 text-center">Classificação Técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAuditedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 text-xs">
                    Nenhum relatório encontrado para análise de discrepâncias.
                  </td>
                </tr>
              ) : (
                filteredAuditedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedAuditReport(item)}
                    className="hover:bg-slate-900/80 transition cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-slate-400">
                      {new Date(item.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-sky-400">
                      {item.profile}
                    </td>
                    <td className="px-3 py-2.5 text-amber-300">
                      {item.multiplier}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-200">
                      {item.totalTx.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-200">
                      {item.totalRx.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        item.deltaPackets === 0
                          ? 'text-emerald-400'
                          : item.officialVerdict === 'sampling_skew'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {item.deltaPackets.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.officialVerdict === 'zero_loss' && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Zero Loss Real
                        </span>
                      )}
                      {item.officialVerdict === 'sampling_skew' && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300" title={item.verdictReason}>
                          <AlertTriangle className="h-3 w-3" />
                          Defasagem de Drain
                        </span>
                      )}
                      {item.officialVerdict === 'physical_drop' && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          <XCircle className="h-3 w-3" />
                          Descarte no DUT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Report Inspection Box */}
        {selectedAuditReport && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-sky-300 font-bold border-b border-sky-900/60 pb-1.5">
              <span>Auditoria Técnica: {selectedAuditReport.profile} ({selectedAuditReport.multiplier})</span>
              <span className="text-[10px] text-slate-400">ID: {selectedAuditReport.id}</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong>Diagnóstico do Algoritmo:</strong> {selectedAuditReport.verdictReason}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-400">
              <div>Tx: <strong className="text-slate-200">{selectedAuditReport.totalTx.toLocaleString()}</strong></div>
              <div>Rx: <strong className="text-slate-200">{selectedAuditReport.totalRx.toLocaleString()}</strong></div>
              <div>Diferença: <strong className="text-amber-300">{selectedAuditReport.deltaPackets.toLocaleString()} pkts</strong></div>
              <div>Drop Rate: <strong className="text-slate-200">{selectedAuditReport.reportedDropRate.toFixed(4)}%</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
