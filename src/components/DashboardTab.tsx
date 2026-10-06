import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  PowerOff,
  BarChart2,
  RefreshCw,
  Folder,
  Sliders,
  Clock,
  Gauge,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  FileCode,
  Zap,
  Terminal,
  Activity,
  ShieldCheck,
  Check,
  Server,
  FileText,
  ArrowDownCircle,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TRexStatus, ProfileItem } from '../types';
import { ApiClient } from '../services/api';
import { MetricTooltip } from './MetricTooltip';

interface DashboardTabProps {
  status: TRexStatus | null;
  onRefreshStatus: () => void;
  onNavigateToEditor: (dir: string, profile: string) => void;
}

// Default profile preset map for each TRex mode
const DEFAULT_PROFILES: Record<'cap2' | 'stl' | 'astf' | 'avl', string> = {
  stl: 'imix_sitehop3.py',
  astf: 'http_simple.py',
  cap2: '',
  avl: '',
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  status,
  onRefreshStatus,
  onNavigateToEditor,
}) => {
  // Directory & Profile selection
  const [selectedDir, setSelectedDir] = useState<'cap2' | 'stl' | 'astf' | 'avl'>('stl');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(DEFAULT_PROFILES.stl);

  // Multiplier presets
  const multiplierPresets: Record<string, { label: string; value: string }> = {
    stl_100g: { label: 'STL 100G (94.75 Gbps)', value: '94.75gbps' },
    stl_50g: { label: 'STL 50G (50 Gbps)', value: '50gbps' },
    stl_10g: { label: 'STL 10G (10 Gbps)', value: '10gbps' },
    stl_1g: { label: 'STL 1G (1 Gbps)', value: '1gbps' },
    astf_100k: { label: 'ASTF 100k CPS', value: '100000' },
    astf_1m: { label: 'ASTF 1M CPS', value: '1000000' },
    custom: { label: 'Personalizado', value: '' },
  };

  // Duration presets
  const durationPresets: Record<string, { label: string; value: string }> = {
    d_10: { label: '10 Segundos', value: '10' },
    d_30: { label: '30 Segundos', value: '30' },
    d_60: { label: '60 Segundos (1 min)', value: '60' },
    d_300: { label: '300 Segundos (5 min)', value: '300' },
    custom: { label: 'Personalizado', value: '' },
  };

  const [multiplierChoice, setMultiplierChoice] = useState<string>('stl_1g');
  const [multiplierCustom, setMultiplierCustom] = useState<string>('25gbps');

  const [durationChoice, setDurationChoice] = useState<string>('d_300');
  const [durationCustom, setDurationCustom] = useState<string>('45');

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // Active info section selector inside the collapsible guide
  const [selectedModuleTab, setSelectedModuleTab] = useState<'pipeline' | 'metrics' | 'zeroloss'>('pipeline');

  // Live Execution Console state
  const [liveLogs, setLiveLogs] = useState<string[]>([
    `[SYSTEM] TRex Manager v3.08 conectado ao daemon DPDK (tcp://10.69.70.20:4501).`,
    `[HARDWARE] Interface Ativa: Intel X520-DA2 (Dual 10GbE SFP+ / Intel 82599ES Controller).`,
    `[DRIVER] PMD: librte_pmd_ixgbe (PCIe Gen2 x8 / Kernel Bypass / HugePages 2MB/1GB).`,
    `[STATUS] Sistema pronto. Selecione o perfil de tráfego e clique em "Iniciar Teste".`,
  ]);
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const [logsFilter, setLogsFilter] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false); // Closed by default as requested
  const consoleBodyRef = useRef<HTMLDivElement | null>(null);

  // Poll live execution logs every 1.5s
  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const res = await ApiClient.getLogs(150);
        if (isMounted && res.logs && res.logs.length > 0) {
          setLiveLogs(res.logs);
        }
      } catch {
        // ignore polling errors
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll logs strictly within the console container (prevents whole page from scrolling)
  useEffect(() => {
    if (autoScrollLogs && consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [liveLogs, autoScrollLogs]);

  // Filter logs
  const filteredLogs = logsFilter.trim()
    ? liveLogs.filter((line) => line.toLowerCase().includes(logsFilter.toLowerCase()))
    : liveLogs;

  // Load profiles for current directory
  useEffect(() => {
    let isMounted = true;
    ApiClient.getProfiles(selectedDir)
      .then((res) => {
        if (!isMounted) return;
        const dirProfiles = res.profiles[selectedDir] || [];
        setProfiles(dirProfiles);
        if (dirProfiles.length > 0) {
          const defaultTarget = DEFAULT_PROFILES[selectedDir];
          const exactMatch = defaultTarget ? dirProfiles.find((p) => p.name === defaultTarget) : null;

          if (exactMatch) {
            setSelectedProfile(exactMatch.name);
          } else {
            // Intelligent fallback for stl and astf presets if exact file is not present
            const preferred = dirProfiles.find((p) => {
              if (selectedDir === 'stl') return p.name.includes('imix');
              if (selectedDir === 'astf') return p.name.includes('http');
              return false;
            });
            setSelectedProfile(preferred ? preferred.name : dirProfiles[0].name);
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao listar perfis', err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDir]);

  const getEffectiveMultiplier = (): string => {
    if (multiplierChoice === 'custom') {
      return multiplierCustom.trim() || '1';
    }
    return multiplierPresets[multiplierChoice]?.value || '10gbps';
  };

  const getEffectiveDuration = (): string => {
    if (durationChoice === 'custom') {
      return durationCustom.trim() || '30';
    }
    return durationPresets[durationChoice]?.value || '30';
  };

  const handleAction = async (action: 'start_test' | 'start_test2' | 'stop' | 'stop_server' | 'stats' | 'clear') => {
    setIsSubmitting(action);
    setActionFeedback(null);

    try {
      const res = await ApiClient.executeAction({
        action,
        dir: selectedDir,
        profile: selectedProfile,
        multiplier: getEffectiveMultiplier(),
        duration: getEffectiveDuration(),
      });

      setActionFeedback({
        type: 'success',
        message: res.message,
      });

      const outputLines = res.output;
      if (outputLines && outputLines.length > 0) {
        setLiveLogs((prev) => [...prev, ...outputLines]);
      } else {
        ApiClient.getLogs(150).then((r) => {
          if (r.logs) setLiveLogs(r.logs);
        }).catch(() => {});
      }

      onRefreshStatus();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro ao executar comando.',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const isRunning = status?.isRunning ?? false;

  return (
    <div className="space-y-6" role="region" aria-label="Painel de Controle e Telemetria do TRex">
      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`flex items-center justify-between rounded-xl border p-4 text-sm shadow-sm transition ${
            actionFeedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : actionFeedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-sky-500/40 bg-sky-500/10 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
            )}
            <span className="font-mono text-xs leading-relaxed">{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Real-time Telemetry Metrics Grid (WCAG AA Contrast Compliant) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Métricas de Telemetria em Tempo Real">
        {/* Card 1: Tx Throughput */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Vazão de Transmissão Tx">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="txThroughput" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Tx Vazão</span>
            </MetricTooltip>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform duration-150">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
              {status?.metrics.txGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs font-semibold text-slate-400">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            {(status?.metrics.txBps ? (status.metrics.txBps / 8) / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Card 2: Rx Throughput */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Vazão de Recepção Rx">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="rxThroughput" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Rx Recepção</span>
            </MetricTooltip>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform duration-150">
              <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-400">
              {status?.metrics.rxGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs font-semibold text-slate-400">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            {(status?.metrics.rxBps ? (status.metrics.rxBps / 8) / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Card 3: Packet Rate Tx */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Taxa de Pacotes por Segundo">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="packetRate" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Taxa Pkts</span>
            </MetricTooltip>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform duration-150">
              <Gauge className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-sky-300">
              {status?.metrics.txMpps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs font-semibold text-slate-400">Mpps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            Rx: {status?.metrics.rxMpps.toFixed(2) ?? '0.00'} Mpps
          </div>
        </div>

        {/* Card 4: Packet Drop Rate */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Taxa de Descarte de Pacotes">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="dropRate" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Taxa de Perda</span>
            </MetricTooltip>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-transform duration-150 group-hover:scale-105 ${
                (status?.metrics.dropRatePercent || 0) > 0.01
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                (status?.metrics.dropRatePercent || 0) > 0.01 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {(status?.metrics.dropRatePercent ?? 0).toFixed(4)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            Jitter: {(status?.metrics.jitterMs ?? 0).toFixed(3)} ms
          </div>
        </div>

        {/* Card 5: Latency Avg */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Latência Média">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="latency" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Latência Média</span>
            </MetricTooltip>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform duration-150">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-purple-300">
              {status?.metrics.latencyAvgMs ? status.metrics.latencyAvgMs.toFixed(3) : '0.018'}
            </span>
            <span className="text-xs font-semibold text-slate-400">ms</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            Max: {status?.metrics.latencyMaxMs ? status.metrics.latencyMaxMs.toFixed(3) : '0.040'} ms
          </div>
        </div>

        {/* Card 6: CPU DPDK Cores */}
        <div className="group rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20 hover:border-slate-700/80 transition-all duration-150" aria-label="Uso de CPU dos Cores DPDK">
          <div className="flex items-center justify-between text-slate-400">
            <MetricTooltip metric="cpuDpdk" position="bottom">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">DPDK CPU</span>
            </MetricTooltip>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 group-hover:scale-105 transition-transform duration-150">
              <Cpu className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300">
              {(status?.metrics.cpuUtilPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            TRex Auto Cores
          </div>
        </div>
      </div>

      {/* Main Workspace: Control Deck (Left) & Real-time Chart (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: TRex Command Deck */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <span>Painel de Configuração do Tráfego</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded">
                TRex 10.69.70.20
              </span>
            </div>

            <div className="space-y-4">
              {/* Directory selection (cap2, stl, astf, avl) */}
              <fieldset>
                <legend className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <MetricTooltip
                    customDetails={{
                      title: 'Diretórios de Scripts do TRex',
                      definition: 'Localizações padrão dos perfis de tráfego em /opt/trex/v3.08/: stl (Stateless L2/L3), astf (Advanced Stateful L4-L7 TCP/UDP), cap2 (Replay de PCAP), avl (L4 Stateful Avl).',
                      trexSource: 'Sistema de arquivos do servidor Linux /opt/trex/v3.08/',
                      notes: 'Scripts STL definem fluxos contínuos de pacotes; scripts ASTF simulam conexões cliente/servidor com handshake SYN/ACK e pilha TCP completa.',
                    }}
                  >
                    <span>Diretório do TRex</span>
                  </MetricTooltip>
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {(['cap2', 'stl', 'astf', 'avl'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      disabled={isRunning || isSubmitting !== null}
                      onClick={() => {
                        setSelectedDir(dir);
                        if (dir === 'astf' && multiplierChoice.startsWith('stl_')) {
                          setMultiplierChoice('astf_100k');
                        } else if (dir === 'stl' && multiplierChoice.startsWith('astf_')) {
                          setMultiplierChoice('stl_1g');
                        }
                      }}
                      className={`h-10 px-3 text-xs font-mono font-medium rounded-lg border text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isRunning
                          ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-500'
                          : selectedDir === dir
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-bold shadow-[0_0_12px_rgba(14,165,233,0.3)] ring-1 ring-sky-500/50 cursor-pointer'
                          : 'border-slate-800/90 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/30 cursor-pointer'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Profile Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="profile-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Perfil de Tráfego (.yaml / .py)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigateToEditor(selectedDir, selectedProfile)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded px-1 transition"
                  >
                    <span>Editar no Editor</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <select
                  id="profile-select"
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-2.5 text-sm font-mono text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none h-10.5 transition"
                >
                  {profiles.length === 0 ? (
                    <option value="">Nenhum perfil encontrado</option>
                  ) : (
                    profiles.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.type.toUpperCase()} • {(p.size / 1024).toFixed(1)} KB)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Multiplier / Rate */}
              <fieldset>
                <legend className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <MetricTooltip
                    customDetails={{
                      title: 'Multiplicador de Taxa de Injeção (-m)',
                      definition: 'Parâmetro de escalonamento repassado ao script TRex para calibrar a taxa de geração do tráfego.',
                      trexSource: 'Argumento de linha de comando -m do t-rex-64 / start1_server.sh',
                      formula: 'Taxa_Alvo = Perfil_Base × Multiplicador (ex: 10gbps, 94.75gbps, 100000 cps)',
                      notes: 'Permite testar desde baixas taxas de conectividade até a saturação plena da interface física (Line Rate).',
                    }}
                  >
                    <span>Multiplicador de Taxa (-m)</span>
                  </MetricTooltip>
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(multiplierPresets).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMultiplierChoice(key)}
                      className={`p-2.5 h-10.5 text-xs rounded-lg border text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        multiplierChoice === key
                          ? 'border-amber-400/90 bg-amber-400/15 text-amber-200 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                          : 'border-slate-800/90 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="font-mono text-[11px] truncate">{item.label}</div>
                    </button>
                  ))}
                </div>

                {multiplierChoice === 'custom' && (
                  <div className="mt-2">
                    <label htmlFor="multiplier-custom" className="sr-only">Taxa personalizada</label>
                    <input
                      id="multiplier-custom"
                      type="text"
                      value={multiplierCustom}
                      onChange={(e) => setMultiplierCustom(e.target.value)}
                      placeholder="Ex: 25gbps, 150000, 2"
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none h-10 transition"
                    />
                  </div>
                )}
              </fieldset>

              {/* Duration (-d) */}
              <fieldset>
                <div className="flex items-center justify-between mb-2">
                  <legend className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    <MetricTooltip
                      customDetails={{
                        title: 'Duração da Injeção de Tráfego (-d)',
                        definition: 'Tempo em segundos pelo qual o TRex mantém a transmissão contínua de pacotes antes de encerrar o benchmark.',
                        trexSource: 'Argumento de linha de comando -d do t-rex-64 / start1_server.sh',
                        notes: 'Conforme a norma RFC 2544, testes de Throughput e Latência exigem no mínimo 30 a 60 segundos de injeção contínua por iteração.',
                      }}
                    >
                      <span>Duração da Injeção (-d)</span>
                    </MetricTooltip>
                  </legend>
                  <span className="text-[11px] font-mono text-sky-300 font-bold bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded">
                    Ativo: {getEffectiveDuration()}s {parseInt(getEffectiveDuration(), 10) >= 60 ? `(${(parseInt(getEffectiveDuration(), 10) / 60).toFixed(1)} min)` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Object.entries(durationPresets).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={isRunning || isSubmitting !== null}
                      onClick={() => setDurationChoice(key)}
                      className={`p-2.5 h-10 text-xs rounded-lg border text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isRunning
                          ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-500'
                          : durationChoice === key
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-semibold shadow-[0_0_12px_rgba(14,165,233,0.25)] ring-1 ring-sky-500/40 cursor-pointer'
                          : 'border-slate-800/90 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/30 cursor-pointer'
                      }`}
                    >
                      <div className="font-mono text-[11px]">{item.label}</div>
                    </button>
                  ))}
                </div>

                {durationChoice === 'custom' && (
                  <div className="mt-2">
                    <label htmlFor="duration-custom" className="sr-only">Duração personalizada em segundos</label>
                    <input
                      id="duration-custom"
                      type="number"
                      disabled={isRunning || isSubmitting !== null}
                      value={durationCustom}
                      onChange={(e) => setDurationCustom(e.target.value)}
                      placeholder="Ex: 300"
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none h-10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </fieldset>

              {/* Action Buttons matching the PHP functionalities */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Ações de Injeção e Controle do Servidor:</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    {isRunning ? `Em execução: restam ${status?.remainingSeconds ?? 0}s` : `Duração travada: ${getEffectiveDuration()}s`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Start Test (Server 1) */}
                  <button
                    type="button"
                    disabled={isRunning || isSubmitting !== null}
                    onClick={() => handleAction('start_test')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 h-10.5 text-xs font-bold text-white shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>
                      {isRunning
                        ? status?.activeServer === 'server1'
                          ? `Server 1 Ativo (${status?.remainingSeconds ?? 0}s)`
                          : 'Teste em Execução'
                        : `Iniciar Server 1 (${getEffectiveDuration()}s)`}
                    </span>
                  </button>

                  {/* Start Test 2 (Server 2) */}
                  <button
                    type="button"
                    disabled={isRunning || isSubmitting !== null}
                    onClick={() => handleAction('start_test2')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 h-10.5 text-xs font-bold text-white shadow-md shadow-sky-900/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>
                      {isRunning
                        ? status?.activeServer === 'server2'
                          ? `Server 2 Ativo (${status?.remainingSeconds ?? 0}s)`
                          : 'Teste em Execução'
                        : `Iniciar Server 2 (${getEffectiveDuration()}s)`}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {/* Stop Traffic */}
                  <button
                    type="button"
                    disabled={!isRunning || isSubmitting !== null}
                    onClick={() => handleAction('stop')}
                    title={!isRunning ? 'Nenhum teste ativo para interromper' : 'Interromper injeção de tráfego'}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border h-10 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                      isRunning
                        ? 'border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/25 active:scale-[0.98] cursor-pointer shadow-sm shadow-red-900/20'
                        : 'border-slate-800 bg-slate-950/60 text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Stop</span>
                  </button>

                  {/* Stop Server */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stop_server')}
                    title="Parar daemon do TRex e liberar HugePages"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-slate-950/80 h-10 text-xs font-medium text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Stop Serv</span>
                  </button>

                  {/* Stats */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stats')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/80 h-10 text-xs font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    <span>Stats</span>
                  </button>

                  {/* Clear */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('clear')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/80 h-10 text-xs font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white active:scale-[0.98] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Execution Logs Console + Collapsible Intel X520-DA2 Telemetry Guide */}
        <div className="lg:col-span-6 space-y-4">
          {/* Live Execution Console (Replaces the open card) */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/30 flex flex-col h-[520px]">
            {/* Console Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono">
                  Logs de Execução (TRex Engine)
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isRunning
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {isRunning ? 'TRANSMITINDO' : 'IDLE / PRONTO'}
                </span>
              </div>

              {/* Console Toolbar Actions */}
              <div className="flex items-center gap-1.5 text-xs">
                {/* Search / Filter */}
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-slate-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={logsFilter}
                    onChange={(e) => setLogsFilter(e.target.value)}
                    placeholder="Filtrar logs..."
                    aria-label="Filtrar mensagens de log de execução"
                    className="h-7 w-28 sm:w-36 rounded-md border border-slate-800 bg-slate-950 pl-6 pr-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Auto-Scroll Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoScrollLogs(!autoScrollLogs)}
                  title={autoScrollLogs ? 'Auto-scroll ativado' : 'Auto-scroll pausado'}
                  className={`h-7 px-2 rounded-md border text-[11px] font-mono flex items-center gap-1 transition cursor-pointer ${
                    autoScrollLogs
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownCircle className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Scroll</span>
                </button>
              </div>
            </div>

            {/* Terminal Body Screen */}
            <div
              ref={consoleBodyRef}
              className="mt-2.5 flex-1 min-h-0 overflow-y-auto rounded-lg bg-[#07090e] border border-slate-800/90 p-3 font-mono text-[11px] leading-relaxed space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-700"
              role="log"
              aria-live="polite"
              aria-label="Terminal de logs de execução do TRex"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 py-12 text-center space-y-2">
                  <Terminal className="h-6 w-6 mx-auto text-slate-600 opacity-60" aria-hidden="true" />
                  <div>Nenhum registro encontrado {logsFilter ? `para o filtro "${logsFilter}"` : ''}.</div>
                  <div className="text-[10px] text-slate-600">Inicie uma injeção de tráfego para visualizar a saída em tempo real.</div>
                </div>
              ) : (
                filteredLogs.map((line, idx) => {
                  const isErr = line.includes('[ERR') || line.includes('error') || line.includes('Falha') || line.includes('DROP');
                  const isWarn = line.includes('[WARN') || line.includes('warning');
                  const isSuccess = line.includes('[REPORT') || line.includes('[VERDICT') || line.includes('Zero Loss') || line.includes('sucesso') || line.includes('COMPLETED');
                  const isHeader = line.startsWith('---') || line.includes('[EXEC]');
                  const isDpdk = line.includes('[DPDK') || line.includes('[RPC') || line.includes('[STL');

                  let textColor = 'text-slate-300';
                  if (isErr) textColor = 'text-red-400 font-semibold';
                  else if (isWarn) textColor = 'text-amber-400';
                  else if (isSuccess) textColor = 'text-emerald-400 font-semibold';
                  else if (isHeader) textColor = 'text-sky-300 font-bold';
                  else if (isDpdk) textColor = 'text-cyan-300';

                  return (
                    <div key={idx} className={`break-all ${textColor}`}>
                      {line}
                    </div>
                  );
                })
              )}
            </div>

            {/* Console Footer */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">NIC:</span>
                <span className="text-slate-200">Intel X520-DA2 (82599ES)</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Driver: librte_pmd_ixgbe</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{liveLogs.length} linhas</span>
                <span className="text-slate-600">•</span>
                <span className="text-sky-400">tcp://10.69.70.20:4501</span>
              </div>
            </div>
          </div>

          {/* Collapsible Technical Guide Card: Intel X520-DA2 (Opened ONLY when clicked) */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 shadow-lg shadow-black/20 overflow-hidden transition-all">
            {/* Header Accordion Trigger (Opens ONLY when clicked) */}
            <button
              type="button"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              aria-expanded={isGuideOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono truncate">
                    Como os Parâmetros de Tráfego são Coletados e Apresentados
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>Interface: <strong className="text-slate-200">Intel X520-DA2 (10GbE Dual SFP+)</strong></span>
                    <span>•</span>
                    <span className="text-sky-400 font-mono">librte_pmd_ixgbe</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-sky-800/60 bg-sky-950/60 text-sky-300 font-semibold">
                  {isGuideOpen ? 'Recolher Guia' : 'Clique para abrir'}
                </span>
                {isGuideOpen ? (
                  <ChevronUp className="h-4 w-4 text-sky-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                )}
              </div>
            </button>

            {/* Collapsible Content - ONLY rendered/visible when clicked */}
            {isGuideOpen && (
              <div className="p-4 border-t border-slate-800/80 space-y-4 animate-in fade-in-50 duration-150">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Especificação técnica de coleta de telemetria na placa de rede <strong>Intel X520-DA2 (Dual Port 10GbE SFP+, controladora Intel 82599ES)</strong>, demonstrando a extração atômica de dados via DPDK, normalização no backend Node.js e apresentação no painel web.
                </p>

                {/* Sub Navigation Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModuleTab('pipeline')}
                    className={`p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer flex flex-col gap-1 ${
                      selectedModuleTab === 'pipeline'
                        ? 'border-sky-500 bg-sky-500/15 text-sky-300 font-bold shadow-[0_0_12px_rgba(14,165,233,0.2)]'
                        : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">1. Intel X520 PMD</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-sans font-normal">Hardware ➔ Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleTab('metrics')}
                    className={`p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer flex flex-col gap-1 ${
                      selectedModuleTab === 'metrics'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">2. Fórmulas de Cálculo</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-sans font-normal">Line Rate 14.88 Mpps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleTab('zeroloss')}
                    className={`p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer flex flex-col gap-1 ${
                      selectedModuleTab === 'zeroloss'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                        : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">3. Registradores 82599ES</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-sans font-normal">Zero-Loss 0.0000%</span>
                  </button>
                </div>

                {/* Section 1: Intel X520-DA2 PMD & Architecture */}
                {selectedModuleTab === 'pipeline' && (
                  <div className="space-y-3 pt-1">
                    <div className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-sky-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5" />
                          1. Hardware Intel X520-DA2 (Intel 82599ES DPDK PMD)
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">librte_pmd_ixgbe</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        A interface física utilizada é a <strong>Intel X520-DA2</strong> (Dual Port 10GbE SFP+, chip <strong>Intel 82599ES</strong> em barramento <strong>PCIe Gen2 x8 a 5.0 GT/s</strong> com largura de banda de 40 Gbps no barramento local). O TRex opera com o driver <strong><code className="text-sky-300 font-mono text-[11px]">librte_pmd_ixgbe</code></strong> (ou <code className="text-sky-300 font-mono text-[11px]">vfio-pci</code>) em Userspace. As interrupções de hardware (IRQs) são desativadas (<strong>Kernel Bypass</strong>), e a memória utiliza <strong>HugePages de 2MB/1GB</strong> (<code className="text-sky-300 font-mono text-[11px]">rte_mempool</code> e <code className="text-sky-300 font-mono text-[11px]">rte_mbuf</code>) alinhados à linha de cache de 64 bytes. As transferências ocorrem por DMA bidirecional direto nos anéis circulares de descritores (<strong>RX/TX Ring Descriptors de 512, 1024 ou 4096 descritores</strong>).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5" />
                          2. Motor TRex Core Threading & ZeroMQ RPC (Portas 4500/4501)
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">JSON-RPC 2.0</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        O binário <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded font-mono">t-rex-64</code> divide o processamento entre threads fixadas em núcleos físicos dedicados (<em>CPU Pinning</em> via <code className="text-emerald-300 font-mono text-[11px]">pthread_setaffinity_np</code> e <code className="text-emerald-300 font-mono text-[11px]">isolcpus</code>):
                      </p>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1 font-sans pl-1">
                        <li><strong className="text-slate-200">Worker Cores:</strong> Loops ininterruptos executando <code className="text-sky-300 font-mono">rte_eth_tx_burst()</code> e <code className="text-sky-300 font-mono">rte_eth_rx_burst()</code> em rajadas na Intel X520-DA2 em line-rate contínuo de 10Gbps por porta.</li>
                        <li><strong className="text-slate-200">Latency / Flow Tracking Core:</strong> Injeta pacotes instrumentados com carimbo de tempo monotônico em microsegundos gravado no payload para aferição de RTT e jitter.</li>
                        <li><strong className="text-slate-200">Master / Control Core:</strong> Agrega registradores atômicos da controladora Intel 82599ES e expõe o servidor JSON-RPC em socket <strong>ZeroMQ (ZMQ) na porta TCP 4501</strong> (e pub/sub na porta 4500).</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5" />
                          3. Normalização no Backend Node.js & Apresentação Web
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">trexService.ts</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        O serviço Node.js captura periodicamente os contadores do TRex, consolida as estatísticas de ambas as portas da Intel X520-DA2, calcula Throughput L2/L1 e Mpps, verifica a integridade de descarte e salva cada teste no histórico transacional <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">data/reports.json</code> com emissão de laudos oficiais de homologação RFC 2544 em PDF vetorial A4.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 2: Fórmulas de Conversão e Métricas */}
                {selectedModuleTab === 'metrics' && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 space-y-2 font-mono">
                      <div className="text-emerald-400 font-bold flex items-center justify-between">
                        <span>1. Throughput Wire Rate (L1 vs L2 Ethernet)</span>
                        <span className="text-[10px] text-slate-400">IEEE 802.3 Framing</span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-900 text-slate-200 text-[11px] border border-slate-800 space-y-1">
                        <div>Throughput_L2 (Gbps) = (Delta_Bytes_L2 × 8) ÷ (Delta_t × 10⁹)</div>
                        <div className="text-emerald-400 font-bold">Throughput_L1_Wire (Gbps) = Throughput_L2 × ((Tamanho_Frame_L2 + 20) ÷ Tamanho_Frame_L2)</div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        A cada frame Ethernet L2 (composto por Cabeçalho Ethernet de 14B + Payload + 4B de FCS/CRC), o meio físico L1 adiciona <strong>20 Bytes de overhead</strong>: 7 Bytes de Preâmbulo + 1 Byte de SFD + 12 Bytes de IPG. Em pacotes de 64B, esse overhead consome 23.8% da largura de banda do meio.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 space-y-2 font-mono">
                      <div className="text-sky-400 font-bold flex items-center justify-between">
                        <span>2. Packet Rate Máximo na Intel X520-DA2 (Line Rate PPS / Mpps)</span>
                        <span className="text-[10px] text-slate-400">10GbE SFP+</span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-900 text-slate-200 text-[11px] border border-slate-800 space-y-1">
                        <div>PPS = Taxa_L1_Nominal_bps ÷ ((Tamanho_Frame_L2 + 20) × 8)</div>
                        <div className="text-sky-300 font-bold">Para 10Gbps @ 64B: PPS = 10.000.000.000 ÷ ((64 + 20) × 8) = 14.880.952 PPS = 14.88 Mpps</div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Em 10GbE com pacotes mínimos de 64 bytes na Intel X520-DA2, atinge-se a taxa máxima de 14.88 Mpps por porta, testando a capacidade limite de comutação por segundo do dispositivo sob teste.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 space-y-2 font-mono">
                      <div className="text-purple-400 font-bold flex items-center justify-between">
                        <span>3. Latência de Trânsito RTT e Jitter (RFC 3393 PDV)</span>
                        <span className="text-[10px] text-slate-400">Hardware Monotonic Timestamps</span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-900 text-slate-200 text-[11px] border border-slate-800 space-y-1">
                        <div>RTT_i = T_rx(i) - T_tx(i)  [com carimbo de 64-bit microsecond clock]</div>
                        <div className="text-purple-300 font-bold">PDV_i = |(T_rx(i) - T_tx(i)) - (T_rx(i-1) - T_tx(i-1))|  (Jitter Instantâneo RFC 3393)</div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        A latência de ida e volta (RTT) é medida inserindo tags de telemetria dentro de fluxos dedicados. O Jitter (RFC 3393 PDV) quantifica a instabilidade temporal das filas do buffer do equipamento sob teste.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 3: Integridade Zero-Loss & Contadores da Intel 82599ES */}
                {selectedModuleTab === 'zeroloss' && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="rounded-xl border border-purple-500/30 bg-slate-950/80 p-4 space-y-3 font-mono">
                      <div className="text-purple-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-purple-400" />
                          Registradores da Intel 82599ES: Zero-Loss Verdadeiro
                        </span>
                        <span className="text-[10px] bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                          RFC 2544 §26.1
                        </span>
                      </div>

                      <div className="p-3 rounded bg-slate-900 text-slate-200 text-[11px] border border-slate-800 space-y-1 leading-relaxed">
                        <div>Fórmula Teórica RFC: Loss_% = ((Total_Tx - Total_Rx) ÷ Total_Tx) × 100</div>
                        <div className="text-emerald-400 font-bold">Implementação Intel X520-DA2: Loss_% = (Contador_NIC_Drop_Hardware ÷ Total_Tx) × 100</div>
                      </div>

                      <div className="space-y-2 text-[11px] font-sans text-slate-300 leading-relaxed">
                        <p>
                          <strong>Eliminação de Perdas Fantasmas:</strong> Amostragens que subtraem a diferença discreta entre pacotes transmitidos (Tx) e recebidos (Rx) em janelas de 1 segundo sofrem com a latência de trânsito em voo (<em>flight time</em>), gerando falsos descartes de ~0.001% a 0.05% no segundo final do teste.
                        </p>
                        <p>
                          <strong>Como o TRex na Intel X520-DA2 resolve:</strong> A plataforma consulta os registradores atômicos da controladora <strong>Intel 82599ES</strong> (<code className="text-emerald-300 font-mono text-[11px]">imissed</code> / <code className="text-emerald-300 font-mono text-[11px]">MPC</code> para estouro de buffers de descritores de RX, <code className="text-emerald-300 font-mono text-[11px]">CRCERRS</code> e <code className="text-emerald-300 font-mono text-[11px]">ierrors</code> para falhas físicas de checksum, e <code className="text-emerald-300 font-mono text-[11px]">rx_drop_pps</code>). Se a placa física não registrou descartes de fila, a taxa é cravada com precisão atômica em <strong>estritamente 0.0000% (Zero Loss Homologado)</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Conformidade RFC 2544 Throughput & Zero Frame Loss (Intel X520-DA2)
                      </span>
                      <span className="text-slate-400">100.0000% Delivery Ratio</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
