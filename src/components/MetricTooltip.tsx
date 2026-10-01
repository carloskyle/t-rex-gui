import React, { useState, useRef, useEffect } from 'react';
import { Info, Terminal, Cpu, Activity, ShieldCheck, Database, Layers } from 'lucide-react';

export interface MetricTechnicalDetails {
  title: string;
  metricKey?: string;
  definition: string;
  trexSource: string;
  formula?: string;
  unit?: string;
  notes?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricTechnicalDetails> = {
  txThroughput: {
    title: 'Throughput Tx (Vazão de Injeção)',
    metricKey: 'txGbps',
    definition: 'Volume total de tráfego Ethernet transmitido pelos núcleos DPDK para o enlace sob teste a cada segundo.',
    trexSource: 'JSON-RPC 2.0 (Porta 4501) get_traffic_stats -> [port].tx_bps',
    formula: 'Throughput_Tx (Gbps) = (tx_bytes_delta × 8) ÷ (dt × 10⁹)',
    unit: 'Gbps (Layer 2 Ethernet Wire Rate)',
    notes: 'Calculado sobre o frame L2 (Cabeçalho MAC 14B + Payload IP/UDP + FCS 4B), desconsiderando os 20B de overhead de camada física L1 (Preamble + IPG).',
  },
  rxThroughput: {
    title: 'Throughput Rx (Vazão de Recepção)',
    metricKey: 'rxGbps',
    definition: 'Volume de dados recebidos e comutados pelas portas de loopback ou pelo elemento de rede (DUT).',
    trexSource: 'JSON-RPC 2.0 (Porta 4501) get_traffic_stats -> [port].rx_bps',
    formula: 'Throughput_Rx (Gbps) = (rx_bytes_delta × 8) ÷ (dt × 10⁹)',
    unit: 'Gbps (Gigabits por segundo)',
    notes: 'A paridade exata entre Tx e Rx atesta que a capacidade do canal comutado suportou a taxa programada sem saturação de buffers.',
  },
  packetRate: {
    title: 'Packet Rate (Taxa de Comutação PPS / Mpps)',
    metricKey: 'txMpps / rxMpps',
    definition: 'Frequência instantânea de frames processados por segundo pelos anéis de descritores de hardware da NIC.',
    trexSource: 'JSON-RPC 2.0 get_traffic_stats -> [port].tx_pps / rx_pps',
    formula: 'Mpps = PPS ÷ 1.000.000 = (Delta_Pacotes ÷ dt) ÷ 10⁶',
    unit: 'Mpps (Milhões de pacotes por segundo)',
    notes: 'Em enlaces de 10GbE com pacotes mínimos de 64B, a taxa de saturação teórica de line rate é de 14.88 Mpps (10^10 / ((64 + 20) * 8)).',
  },
  dropRate: {
    title: 'Taxa de Perda / Descarte (RFC 2544 Packet Loss)',
    metricKey: 'dropRatePercent',
    definition: 'Percentual atômico de frames descartados por estouro de fila ou saturação física de comutação.',
    trexSource: 'Registrador ASIC da NIC rx_drop_pps + imissed / ierrors',
    formula: 'Taxa_Descarte_% = (rx_drop_pps ÷ tx_pps) × 100  (Zero-Loss: 0.0000%)',
    unit: '% (Precisão estrita de 4 casas decimais)',
    notes: 'Utiliza os contadores atômicos da placa de rede física para evitar perdas fantasmas decorrentes do tempo de voo (flight time) na amostragem.',
  },
  latency: {
    title: 'Latência RTT Média e Máxima (Delay)',
    metricKey: 'latencyAvgMs / latencyMaxMs',
    definition: 'Atraso de ida e volta (Round-Trip Time) medido por injeção de tags com carimbo de tempo monotônico.',
    trexSource: 'JSON-RPC get_flow_stats -> lat -> hist / avg / max',
    formula: 'RTT = T_rx_arrival - T_tx_departure (Clock Monotônico de 64 bits)',
    unit: 'ms / µs (Milissegundos / Microsegundos)',
    notes: 'O Latency Core do TRex insere etiquetas de tempo de precisão em microsegundos dentro de pacotes de controle dedicados em loopback.',
  },
  jitter: {
    title: 'Jitter de Trânsito (RFC 3393 PDV)',
    metricKey: 'jitterMs',
    definition: 'Variação estatística de atraso entre a chegada de pacotes consecutivos do mesmo fluxo (Packet Delay Variation).',
    trexSource: 'JSON-RPC get_flow_stats -> jitter',
    formula: 'PDV_i = |(T_rx,i - T_tx,i) - (T_rx,i-1 - T_tx,i-1)| (RFC 3393)',
    unit: 'ms / µs (Milissegundos)',
    notes: 'Mede a instabilidade temporal das filas de buffer do comutador/roteador sob teste de estresse.',
  },
  cpuDpdk: {
    title: 'Carga de CPU dos Cores DPDK (Polling Mode)',
    metricKey: 'cpuDpdkPercent',
    definition: 'Percentual de ocupação dos ciclos de instrução dos núcleos dedicados ao loop ininterrupto de transmissão e recepção.',
    trexSource: 'JSON-RPC get_utilization -> cpu_util / core_util',
    formula: 'Polling contínuo via rte_eth_tx/rx_burst em núcleos isolados com isolcpus',
    unit: '% de utilização dos Worker Cores',
    notes: 'Como o DPDK utiliza PMD (Poll Mode Driver), medições de sistema operacional convencionais marcam 100%. O TRex relata o tempo real útil de processamento.',
  },
  activePorts: {
    title: 'Portas de Rede Físicas DPDK (Interfaces)',
    metricKey: 'status.ports',
    definition: 'Interfaces de alta velocidade (10G/25G/40G/100G) operando em modo promíscuo Full-Duplex com PMD.',
    trexSource: 'JSON-RPC get_port_status -> status / speed / driver',
    formula: 'Identificado via /etc/trex_cfg.yaml e barramento PCI (/sys/bus/pci/devices)',
    unit: 'Portas ativas (Full-Duplex)',
    notes: 'Drivers: mlx5_core (Mellanox ConnectX) ou vfio-pci / uio_pci_generic (Intel).',
  },
};

interface MetricTooltipProps {
  metric?: keyof typeof METRIC_DEFINITIONS;
  customDetails?: MetricTechnicalDetails;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  metric,
  customDetails,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const details = customDetails || (metric ? METRIC_DEFINITIONS[metric] : null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!details) {
    return <>{children}</>;
  }

  // Positioning classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2.5';
    }
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center group/tooltip ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-expanded={isVisible}
    >
      {children}

      {/* Subtle indicator dot / badge on the child to denote technical tooltip availability */}
      <span
        className="ml-1 inline-flex text-slate-500 hover:text-sky-400 group-hover/tooltip:text-sky-400 transition-colors"
        aria-hidden="true"
      >
        <Info className="h-3 w-3" />
      </span>

      {/* Tooltip Popup Panel */}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 w-72 sm:w-84 rounded-xl border border-slate-700/90 bg-slate-950 p-3.5 shadow-2xl shadow-black/80 text-left pointer-events-none transition-all duration-150 animate-in fade-in-0 zoom-in-95 ${getPositionClasses()}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100 font-mono tracking-tight">
                {details.title}
              </span>
            </div>
            {details.unit && (
              <span className="rounded bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-sky-300">
                {details.unit.split(' ')[0]}
              </span>
            )}
          </div>

          {/* Definition */}
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mb-2.5">
            {details.definition}
          </p>

          {/* Technical Derivation Details from TRex API */}
          <div className="space-y-1.5 font-mono text-[10px] bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/90">
            {/* TRex API Source */}
            <div className="flex items-start gap-1 text-slate-400">
              <span className="text-emerald-400 font-bold shrink-0">API TRex:</span>
              <span className="text-slate-200 break-all">{details.trexSource}</span>
            </div>

            {/* Formula */}
            {details.formula && (
              <div className="flex items-start gap-1 text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="text-purple-400 font-bold shrink-0">Cálculo:</span>
                <span className="text-slate-200 break-all">{details.formula}</span>
              </div>
            )}
          </div>

          {/* Technical Notes / RFC Reference */}
          {details.notes && (
            <div className="mt-2 text-[10px] text-slate-400 leading-snug border-t border-slate-800/80 pt-1.5 font-sans">
              <span className="text-amber-400 font-semibold font-mono">Nota Técnica: </span>
              {details.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
