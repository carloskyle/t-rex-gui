import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TRexStatus, ProfileItem, ChartHistoryPoint } from '../types';
import { ApiClient } from '../services/api';
import { ThroughputChart } from './ThroughputChart';

interface DashboardTabProps {
  status: TRexStatus | null;
  onRefreshStatus: () => void;
  onNavigateToEditor: (dir: string, profile: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  status,
  onRefreshStatus,
  onNavigateToEditor,
}) => {
  // Directory & Profile selection
  const [selectedDir, setSelectedDir] = useState<'cap2' | 'stl' | 'astf' | 'avl'>('stl');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('imixsitehop.yaml');

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

  // History for charts
  const [chartHistory, setChartHistory] = useState<ChartHistoryPoint[]>([]);

  // Load profiles for current directory
  useEffect(() => {
    let isMounted = true;
    ApiClient.getProfiles(selectedDir)
      .then((res) => {
        if (!isMounted) return;
        const dirProfiles = res.profiles[selectedDir] || [];
        setProfiles(dirProfiles);
        if (dirProfiles.length > 0 && !dirProfiles.some((p) => p.name === selectedProfile)) {
          setSelectedProfile(dirProfiles[0].name);
        }
      })
      .catch((err) => {
        console.error('Erro ao listar perfis', err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDir]);

  // Update chart data whenever status changes
  useEffect(() => {
    if (!status) return;
    const now = Date.now();
    const p0 = status.ports?.[0];
    const p1 = status.ports?.[1];

    const totalTxGbps = status.metrics?.txGbps || 0;
    const totalRxGbps = status.metrics?.rxGbps || 0;

    const p0TxGbps = p0?.txBps ? p0.txBps / 1e9 : totalTxGbps / 2;
    const p0RxGbps = p0?.rxBps ? p0.rxBps / 1e9 : totalRxGbps / 2;
    const p1TxGbps = p1?.txBps ? p1.txBps / 1e9 : totalTxGbps / 2;
    const p1RxGbps = p1?.rxBps ? p1.rxBps / 1e9 : totalRxGbps / 2;

    const newPoint: ChartHistoryPoint = {
      time: now,
      txGbps: totalTxGbps,
      rxGbps: totalRxGbps,
      p0TxGbps,
      p0RxGbps,
      p1TxGbps,
      p1RxGbps,
    };

    setChartHistory((prev) => {
      const updated = [...prev, newPoint];
      if (updated.length > 300) {
        return updated.slice(-300);
      }
      return updated;
    });
  }, [status]);

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
      if (action === 'clear' || action === 'start_test' || action === 'start_test2') {
        setChartHistory([]);
      }
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
        {/* Tx Gbps */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Vazão de Transmissão Tx">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Tx Throughput</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {status?.metrics.txGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            {(status?.metrics.txBps ? (status.metrics.txBps / 8) / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Rx Gbps */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Vazão de Recepção Rx">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Rx Throughput</span>
            <ArrowDownLeft className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {status?.metrics.rxGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            {(status?.metrics.rxBps ? (status.metrics.rxBps / 8) / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Packet Rate Tx */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Taxa de Pacotes por Segundo">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Tx Packet Rate</span>
            <Gauge className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-sky-300">
              {status?.metrics.txMpps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400">Mpps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            Rx: {status?.metrics.rxMpps.toFixed(2) ?? '0.00'} Mpps
          </div>
        </div>

        {/* Packet Drop Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Taxa de Descarte de Pacotes">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Taxa de Perda</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold font-mono ${
                (status?.metrics.dropRatePercent || 0) > 0.01 ? 'text-red-400 font-bold' : 'text-emerald-400'
              }`}
            >
              {(status?.metrics.dropRatePercent ?? 0).toFixed(4)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            Jitter: {(status?.metrics.jitterMs ?? 0).toFixed(3)} ms
          </div>
        </div>

        {/* Latency Avg */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Latência Média">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Latência Média</span>
            <Clock className="h-4 w-4 text-purple-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {status?.metrics.latencyAvgMs ? status.metrics.latencyAvgMs.toFixed(3) : '0.018'}
            </span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            Max: {status?.metrics.latencyMaxMs ? status.metrics.latencyMaxMs.toFixed(3) : '0.040'} ms
          </div>
        </div>

        {/* CPU DPDK Cores */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm" aria-label="Uso de CPU dos Cores DPDK">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">DPDK CPU</span>
            <Cpu className="h-4 w-4 text-amber-300" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {(status?.metrics.cpuUtilPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400">
            TRex Auto Cores
          </div>
        </div>
      </div>

      {/* Main Workspace: Control Deck (Left) & Real-time Chart (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: TRex Command Deck */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <span>Painel de Configuração do Tráfego</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                TRex 10.69.70.20
              </span>
            </div>

            <div className="space-y-4">
              {/* Directory selection (cap2, stl, astf, avl) */}
              <fieldset>
                <legend className="block text-xs font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span>Diretório do TRex (/opt/trex/v3.08/)</span>
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {(['cap2', 'stl', 'astf', 'avl'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setSelectedDir(dir)}
                      className={`min-h-[40px] py-2 px-3 text-xs font-mono font-medium rounded-lg border text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        selectedDir === dir
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 shadow-sm font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:border-slate-700'
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
                  <label htmlFor="profile-select" className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Perfil de Tráfego (.yaml / .py)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigateToEditor(selectedDir, selectedProfile)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded px-1"
                  >
                    <span>Editar no Editor</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <select
                  id="profile-select"
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono text-slate-100 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none min-h-[42px]"
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
                <legend className="block text-xs font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  <span>Multiplicador de Taxa (-m)</span>
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(multiplierPresets).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMultiplierChoice(key)}
                      className={`p-2.5 min-h-[40px] text-xs rounded-lg border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        multiplierChoice === key
                          ? 'border-amber-400 bg-amber-400/15 text-amber-200 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono text-[11px]">{item.label}</div>
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
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none min-h-[38px]"
                    />
                  </div>
                )}
              </fieldset>

              {/* Duration (-d) */}
              <fieldset>
                <div className="flex items-center justify-between mb-1.5">
                  <legend className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    <span>Duração da Injeção (-d)</span>
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
                      onClick={() => setDurationChoice(key)}
                      className={`p-2.5 min-h-[40px] text-xs rounded-lg border text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        durationChoice === key
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-semibold shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:border-slate-700'
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
                      value={durationCustom}
                      onChange={(e) => setDurationCustom(e.target.value)}
                      placeholder="Ex: 300"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none min-h-[38px]"
                    />
                  </div>
                )}
              </fieldset>

              {/* Action Buttons matching the PHP functionalities */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                  <span>Ações de Injeção e Controle do Servidor:</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    Duração travada: {getEffectiveDuration()}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Start Test (Server 1) */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('start_test')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 py-2.5 min-h-[42px] text-xs font-bold text-white shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>Iniciar Server 1 ({getEffectiveDuration()}s)</span>
                  </button>

                  {/* Start Test 2 (Server 2) */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('start_test2')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 py-2.5 min-h-[42px] text-xs font-bold text-white shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>Iniciar Server 2 ({getEffectiveDuration()}s)</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {/* Stop Traffic */}
                  <button
                    type="button"
                    disabled={!isRunning || isSubmitting !== null}
                    onClick={() => handleAction('stop')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/15 p-2 min-h-[40px] text-xs font-semibold text-red-300 hover:bg-red-500/25 active:scale-95 transition disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Stop</span>
                  </button>

                  {/* Stop Server */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stop_server')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-slate-950 p-2 min-h-[40px] text-xs font-medium text-red-400 hover:bg-red-500/10 active:scale-95 transition disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Stop Serv</span>
                  </button>

                  {/* Stats */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stats')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 min-h-[40px] text-xs font-medium text-slate-100 hover:bg-slate-800 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    <span>Stats</span>
                  </button>

                  {/* Clear */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('clear')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 min-h-[40px] text-xs font-medium text-slate-100 hover:bg-slate-800 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Throughput Chart & Port Status Cards */}
        <div className="lg:col-span-6 space-y-6">
          <ThroughputChart
            history={chartHistory}
            unit="Gbps"
            defaultScale="auto"
            onClearHistory={() => setChartHistory([])}
          />

          {/* Port Status Cards */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>Interfaces de Rede DPDK ({status?.ports[0]?.model ? status.ports[0].model.split(' ')[0] : 'Hardware Detectado'})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await ApiClient.rescanInterfaces();
                      onRefreshStatus();
                    } catch (err) {
                      console.error('Failed to rescan', err);
                    }
                  }}
                  title="Detectar placas instaladas no servidor (/etc/trex_cfg.yaml e PCI)"
                  className="rounded bg-slate-950 border border-slate-700 px-2.5 py-1 text-[11px] text-sky-300 hover:text-white hover:border-slate-600 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  Re-escanear Hardware
                </button>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">DPDK Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(status?.ports || []).map((port) => {
                const txGbps = port.txBps ? port.txBps / 1e9 : 0;
                const rxGbps = port.rxBps ? port.rxBps / 1e9 : 0;
                const portMaxSpeed = port.speed.includes('100') ? 100 : port.speed.includes('40') ? 40 : port.speed.includes('25') ? 25 : 10;
                const txPercent = Math.min(100, Math.max(0, (txGbps / portMaxSpeed) * 100));
                const rxPercent = Math.min(100, Math.max(0, (rxGbps / portMaxSpeed) * 100));

                return (
                  <div
                    key={port.id}
                    className="rounded-lg border border-slate-700/80 bg-slate-950 p-3.5 text-xs font-mono space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                        <span className="font-bold text-sky-400" title={port.name}>
                          {port.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
                          Full-Duplex
                        </span>
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                          {port.status} • {port.speed}
                        </span>
                      </div>
                    </div>

                    {port.model && (
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Modelo:</span>
                        <span className="text-slate-200 truncate max-w-[180px]">{port.model}</span>
                      </div>
                    )}

                    {port.pciAddress && (
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>PCIe / Driver:</span>
                        <span className="text-amber-300 truncate">{port.pciAddress} ({port.driver || 'DPDK'})</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>MAC / IP:</span>
                      <span className="text-slate-200">{port.mac || port.ip}</span>
                    </div>

                    {/* Full-Duplex Rate Meters */}
                    <div className="pt-1 space-y-1.5 border-t border-slate-800/80">
                      <div>
                        <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                          <span className="flex items-center gap-1 text-emerald-400 font-sans">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                            Tx (Injeção):
                          </span>
                          <span className="text-emerald-400 font-bold">{txGbps.toFixed(2)} Gbps</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(txPercent, txGbps > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                          <span className="flex items-center gap-1 text-cyan-400 font-sans">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
                            Rx (Recepção):
                          </span>
                          <span className="text-cyan-400 font-bold">{rxGbps.toFixed(2)} Gbps</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(rxPercent, rxGbps > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[10px] border-t border-slate-800/80 pt-1.5">
                      <span>Tx: <strong className="text-slate-200 font-normal">{port.opackets.toLocaleString()} pkts</strong></span>
                      <span>Rx: <strong className="text-slate-200 font-normal">{port.ipackets.toLocaleString()} pkts</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
