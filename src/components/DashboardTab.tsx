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
import { TRexStatus, ProfileItem } from '../types';
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
  // Legacy PHP matching parameters
  const [selectedDir, setSelectedDir] = useState<'cap2' | 'stl' | 'astf' | 'avl'>('stl');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('imix.yaml');

  // Multiplier presets matching PHP
  const multiplierPresets: Record<string, { label: string; value: string }> = {
    stl_100g: { label: 'STL 100G (94.75 Gbps)', value: '94.75gbps' },
    stl_50g: { label: 'STL 50G (50 Gbps)', value: '50gbps' },
    stl_10g: { label: 'STL 10G (10 Gbps)', value: '10gbps' },
    stl_1g: { label: 'STL 1G (1 Gbps)', value: '1gbps' },
    astf_100k: { label: 'ASTF 100k CPS', value: '100000' },
    astf_1m: { label: 'ASTF 1M CPS', value: '1000000' },
    custom: { label: 'Personalizado', value: '' },
  };

  // Duration presets matching PHP
  const durationPresets: Record<string, { label: string; value: string }> = {
    d_10: { label: '10 Segundos', value: '10' },
    d_30: { label: '30 Segundos', value: '30' },
    d_60: { label: '60 Segundos (1 min)', value: '60' },
    d_300: { label: '300 Segundos (5 min)', value: '300' },
    custom: { label: 'Personalizado', value: '' },
  };

  const [multiplierChoice, setMultiplierChoice] = useState<string>('stl_10g');
  const [multiplierCustom, setMultiplierCustom] = useState<string>('25gbps');

  const [durationChoice, setDurationChoice] = useState<string>('d_30');
  const [durationCustom, setDurationCustom] = useState<string>('45');

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // History for charts
  const [chartHistory, setChartHistory] = useState<Array<{ time: number; txGbps: number; rxGbps: number }>>([]);

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
    const newPoint = {
      time: now,
      txGbps: status.metrics?.txGbps || 0,
      rxGbps: status.metrics?.rxGbps || 0,
    };

    setChartHistory((prev) => {
      const updated = [...prev, newPoint];
      if (updated.length > 30) {
        return updated.slice(-30);
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
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            actionFeedback.type === 'success'
              ? 'border-[#50fa7b]/40 bg-[#50fa7b]/10 text-[#50fa7b]'
              : actionFeedback.type === 'error'
              ? 'border-[#ff5555]/40 bg-[#ff5555]/10 text-[#ff5555]'
              : 'border-[#8be9fd]/40 bg-[#8be9fd]/10 text-[#8be9fd]'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-mono text-xs">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Real-time Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Tx Gbps */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">Tx Throughput</span>
            <ArrowUpRight className="h-4 w-4 text-[#50fa7b]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#50fa7b]">
              {status?.metrics.txGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-[#6272a4]">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            {(status?.metrics.txBps ? status.metrics.txBps / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Rx Gbps */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">Rx Throughput</span>
            <ArrowDownLeft className="h-4 w-4 text-[#bd93f9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#bd93f9]">
              {status?.metrics.rxGbps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-[#6272a4]">Gbps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            {(status?.metrics.rxBps ? status.metrics.rxBps / 1e6 : 0).toFixed(0)} MB/s
          </div>
        </div>

        {/* Packet Rate Tx */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">Tx Packet Rate</span>
            <Gauge className="h-4 w-4 text-[#8be9fd]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#8be9fd]">
              {status?.metrics.txMpps.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-[#6272a4]">Mpps</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            Rx: {status?.metrics.rxMpps.toFixed(2) ?? '0.00'} Mpps
          </div>
        </div>

        {/* Packet Drop Rate */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">Taxa de Perda</span>
            <AlertTriangle className="h-4 w-4 text-[#ffb86c]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold font-mono ${
                (status?.metrics.dropRatePercent || 0) > 0.01 ? 'text-[#ff5555]' : 'text-[#50fa7b]'
              }`}
            >
              {(status?.metrics.dropRatePercent ?? 0).toFixed(4)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            Jitter: {(status?.metrics.jitterMs ?? 0).toFixed(3)} ms
          </div>
        </div>

        {/* Latency Avg */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">Latência Média</span>
            <Clock className="h-4 w-4 text-[#ff79c6]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#ff79c6]">
              {status?.metrics.latencyAvgMs ? status.metrics.latencyAvgMs.toFixed(3) : '0.018'}
            </span>
            <span className="text-xs text-[#6272a4]">ms</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            Max: {status?.metrics.latencyMaxMs ? status.metrics.latencyMaxMs.toFixed(3) : '0.040'} ms
          </div>
        </div>

        {/* CPU DPDK Cores */}
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#6272a4]">
            <span className="text-xs font-medium">DPDK CPU</span>
            <Cpu className="h-4 w-4 text-[#f1fa8c]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#f1fa8c]">
              {(status?.metrics.cpuUtilPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#6272a4]">
            TRex Auto Cores
          </div>
        </div>
      </div>

      {/* Main Workspace: Control Deck (Left) & Real-time Chart (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: TRex Command Deck */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#44475a] pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#f8f8f2] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#bd93f9]" />
                Painel de Configuração do Tráfego
              </h2>
              <span className="text-[11px] font-mono text-[#6272a4]">
                TRex 10.69.70.20
              </span>
            </div>

            <div className="space-y-4">
              {/* Directory selection (cap2, stl, astf, avl) */}
              <div>
                <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5 flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-[#ffb86c]" />
                  Diretório do TRex (/opt/trex/v3.08/)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cap2', 'stl', 'astf', 'avl'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setSelectedDir(dir)}
                      className={`py-2 px-3 text-xs font-mono font-medium rounded-lg border text-center transition cursor-pointer ${
                        selectedDir === dir
                          ? 'border-[#bd93f9] bg-[#bd93f9]/20 text-[#bd93f9] shadow-sm font-bold'
                          : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4] hover:text-[#f8f8f2]'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#f8f8f2] flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-[#50fa7b]" />
                    Perfil de Tráfego (.yaml / .py)
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigateToEditor(selectedDir, selectedProfile)}
                    className="text-[11px] text-[#8be9fd] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Editar no Editor</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-2 text-sm font-mono text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none"
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
              <div>
                <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#f1fa8c]" />
                  Multiplicador de Taxa (-m)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(multiplierPresets).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMultiplierChoice(key)}
                      className={`p-2 text-xs rounded-lg border text-left transition cursor-pointer ${
                        multiplierChoice === key
                          ? 'border-[#f1fa8c] bg-[#f1fa8c]/15 text-[#f1fa8c] font-semibold'
                          : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4] hover:text-[#f8f8f2]'
                      }`}
                    >
                      <div className="font-mono text-[11px]">{item.label}</div>
                    </button>
                  ))}
                </div>

                {multiplierChoice === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={multiplierCustom}
                      onChange={(e) => setMultiplierCustom(e.target.value)}
                      placeholder="Ex: 25gbps, 150000, 2"
                      className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-2 text-xs font-mono text-[#f8f8f2] focus:border-[#f1fa8c] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Duration (-d) */}
              <div>
                <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#ff79c6]" />
                  Duração do Teste em Segundos (-d)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Object.entries(durationPresets).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDurationChoice(key)}
                      className={`p-2 text-xs rounded-lg border text-center transition cursor-pointer ${
                        durationChoice === key
                          ? 'border-[#ff79c6] bg-[#ff79c6]/15 text-[#ff79c6] font-semibold'
                          : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4] hover:text-[#f8f8f2]'
                      }`}
                    >
                      <div className="font-mono text-[11px]">{item.label}</div>
                    </button>
                  ))}
                </div>

                {durationChoice === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={durationCustom}
                      onChange={(e) => setDurationCustom(e.target.value)}
                      placeholder="Ex: 120"
                      className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-2 text-xs font-mono text-[#f8f8f2] focus:border-[#ff79c6] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons matching the PHP functionalities */}
              <div className="pt-2 border-t border-[#44475a] space-y-2">
                <div className="text-[11px] font-medium text-[#6272a4]">
                  Ações de Injeção e Controle do Servidor:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Start Test (Server 1) */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('start_test')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#50fa7b] px-4 py-2.5 text-xs font-bold text-[#1e1f29] shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Iniciar Server 1</span>
                  </button>

                  {/* Start Test 2 (Server 2) */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('start_test2')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#8be9fd] px-4 py-2.5 text-xs font-bold text-[#1e1f29] shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Iniciar Server 2</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {/* Stop Traffic */}
                  <button
                    type="button"
                    disabled={!isRunning || isSubmitting !== null}
                    onClick={() => handleAction('stop')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#ff5555]/50 bg-[#ff5555]/15 p-2 text-xs font-semibold text-[#ff5555] hover:bg-[#ff5555]/25 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </button>

                  {/* Stop Server */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stop_server')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#ff5555]/30 bg-[#1e1f29] p-2 text-xs font-medium text-[#ff5555] hover:bg-[#ff5555]/10 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                    <span>Stop Serv</span>
                  </button>

                  {/* Stats */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('stats')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#44475a] bg-[#1e1f29] p-2 text-xs font-medium text-[#f8f8f2] hover:bg-[#44475a] active:scale-95 transition cursor-pointer"
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-[#bd93f9]" />
                    <span>Stats</span>
                  </button>

                  {/* Clear */}
                  <button
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => handleAction('clear')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#44475a] bg-[#1e1f29] p-2 text-xs font-medium text-[#f8f8f2] hover:bg-[#44475a] active:scale-95 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[#8be9fd]" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic DPDK Charts & Physical Ports */}
        <div className="lg:col-span-6 space-y-6">
          {/* Real-time Throughput Chart */}
          <ThroughputChart
            history={chartHistory}
            unit="Gbps"
            peakGbps={getEffectiveMultiplier().includes('100g') ? 100 : 25}
          />

          {/* Port Status Cards */}
          <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#44475a] pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#50fa7b]" />
                Interfaces de Rede DPDK ({status?.ports[0]?.model ? status.ports[0].model.split(' ')[0] : 'Hardware Detectado'})
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
                  className="rounded bg-[#1e1f29] border border-[#44475a] px-2 py-0.5 text-[10px] text-[#8be9fd] hover:text-[#f8f8f2] transition cursor-pointer"
                >
                  Re-escanear Hardware
                </button>
                <span className="text-[11px] font-mono text-[#50fa7b]">DPDK Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(status?.ports || []).map((port) => (
                <div
                  key={port.id}
                  className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-3 text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#8be9fd] truncate max-w-[190px]" title={port.name}>
                      {port.name}
                    </span>
                    <span className="rounded bg-[#50fa7b]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#50fa7b]">
                      {port.status} • {port.speed}
                    </span>
                  </div>

                  {port.model && (
                    <div className="flex justify-between text-[#6272a4] text-[11px]">
                      <span>Modelo:</span>
                      <span className="text-[#f8f8f2] truncate max-w-[180px]">{port.model}</span>
                    </div>
                  )}

                  {port.pciAddress && (
                    <div className="flex justify-between text-[#6272a4] text-[11px]">
                      <span>PCIe / Driver:</span>
                      <span className="text-[#f1fa8c] truncate">{port.pciAddress} ({port.driver || 'DPDK'})</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#6272a4]">
                    <span>MAC / IP:</span>
                    <span className="text-[#f8f8f2]">{port.mac || port.ip}</span>
                  </div>

                  <div className="flex justify-between text-[#6272a4]">
                    <span>Tx Rate:</span>
                    <span className="text-[#50fa7b] font-semibold">
                      {(port.txBps ? (port.txBps * 8) / 1e9 : 0).toFixed(2)} Gbps
                    </span>
                  </div>

                  <div className="flex justify-between text-[#6272a4]">
                    <span>Rx Rate:</span>
                    <span className="text-[#bd93f9] font-semibold">
                      {(port.rxBps ? (port.rxBps * 8) / 1e9 : 0).toFixed(2)} Gbps
                    </span>
                  </div>

                  <div className="flex justify-between text-[#6272a4] border-t border-[#44475a]/50 pt-1">
                    <span>Total Pacotes:</span>
                    <span className="text-[#f8f8f2]">
                      {(port.opackets + port.ipackets).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
