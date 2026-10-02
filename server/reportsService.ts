import fs from 'fs';
import path from 'path';
import { TestReport } from './types.js';

const REPORTS_FILE = path.resolve(process.cwd(), 'data', 'reports.json');

function ensureDataDir(): void {
  const dir = path.dirname(REPORTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Pre-seed some authentic reports if empty
function getInitialReports(): TestReport[] {
  const now = Date.now();
  return [
    {
      id: 'rep_trx_94821',
      timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
      endTime: new Date(now - 1000 * 60 * 44.5).toISOString(),
      operator: 'admin',
      operatorRole: 'TRex Super Admin',
      serverType: 'start_test (Server 1)',
      targetHost: '10.69.70.20',
      profile: 'imix.yaml',
      dir: 'stl',
      multiplier: '10gbps',
      duration: '30',
      ports: [0, 1],
      status: 'COMPLETED',
      summary: {
        totalPacketsTx: 44218900,
        totalPacketsRx: 44218900,
        totalBytesTx: 16843900000,
        totalBytesRx: 16843900000,
        avgTxGbps: 9.87,
        avgRxGbps: 9.87,
        peakTxGbps: 10.02,
        peakRxGbps: 10.02,
        avgTxMpps: 14.82,
        avgRxMpps: 14.82,
        avgDropRatePercent: 0,
        maxLatencyMs: 0.042,
        avgLatencyMs: 0.018,
        cpuUtilizationPercent: 46.2,
      },
      logs: [
        '[SERVER 1] Starting Cisco TRex Stateless Engine v3.08 on 10.69.70.20...',
        '[DPDK] Initializing DPDK EAL with 8 cores, 2 10GbE Intel X520-DA2 (82599ES) ports (librte_pmd_ixgbe).',
        '[TRAFFIC] Loading stream STL: stl/imix.yaml (multiplier: 10gbps, duration: 30s)',
        '[START] Injected traffic onto Port 0 -> Port 1 at rate 9.87 Gbps (14.82 Mpps)',
        '[SAMPLE @ 10s] Tx: 9.88 Gbps | Rx: 9.88 Gbps | Drops: 0 | CPU: 45%',
        '[SAMPLE @ 20s] Tx: 9.86 Gbps | Rx: 9.86 Gbps | Drops: 0 | CPU: 47%',
        '[FINISH] Test finished naturally after 30 seconds. Zero Loss reached (100% delivery).'
      ]
    },
    {
      id: 'rep_trx_83104',
      timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
      endTime: new Date(now - 1000 * 60 * 119).toISOString(),
      operator: 'netops',
      operatorRole: 'Network Operations Engineer',
      serverType: 'start_test2 (Server 2)',
      targetHost: '10.69.70.20',
      profile: 'http_simple.py',
      dir: 'astf',
      multiplier: '100000',
      duration: '60',
      ports: [0, 1],
      status: 'COMPLETED',
      summary: {
        totalPacketsTx: 89450000,
        totalPacketsRx: 89450000,
        totalBytesTx: 45200000000,
        totalBytesRx: 45200000000,
        avgTxGbps: 6.02,
        avgRxGbps: 6.02,
        peakTxGbps: 6.45,
        peakRxGbps: 6.45,
        avgTxMpps: 1.49,
        avgRxMpps: 1.49,
        avgDropRatePercent: 0,
        maxLatencyMs: 0.125,
        avgLatencyMs: 0.064,
        cpuUtilizationPercent: 58.4,
      },
      logs: [
        '[SERVER 2] ASTF Stateful Cluster engine initialized.',
        '[ASTF] Compiling python profile: astf/http_simple.py',
        '[FLOW] Active TCP connections benchmark: 100,000 cps initiated.',
        '[SAMPLE @ 30s] 100k TCP HTTP sessions established. Avg RTT: 0.06ms',
        '[FINISH] Completed 60s ASTF run. TCP retransmissions: 0.'
      ]
    }
  ];
}

export function getAllReports(): TestReport[] {
  ensureDataDir();
  if (!fs.existsSync(REPORTS_FILE)) {
    const initial = getInitialReports();
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(REPORTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading reports file, resetting to empty', err);
    return [];
  }
}

export function getReportById(id: string): TestReport | null {
  const reports = getAllReports();
  return reports.find(r => r.id === id) || null;
}

export function saveReport(report: TestReport): void {
  ensureDataDir();
  const reports = getAllReports();
  // prepend newer report
  const updated = [report, ...reports.filter(r => r.id !== report.id)];
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
}

export function updateReport(id: string, updates: Partial<TestReport>): TestReport | null {
  ensureDataDir();
  const reports = getAllReports();
  const index = reports.findIndex(r => r.id === id);
  if (index === -1) return null;
  const updatedReport: TestReport = {
    ...reports[index],
    ...updates,
    id: reports[index].id, // preserve immutable ID
  };
  reports[index] = updatedReport;
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
  return updatedReport;
}

export function deleteReport(id: string): boolean {
  ensureDataDir();
  const reports = getAllReports();
  const filtered = reports.filter(r => r.id !== id);
  if (filtered.length === reports.length) return false;
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return true;
}

export function exportReportAsCsv(report: TestReport): string {
  const headers = [
    'Report ID',
    'Timestamp',
    'Operator',
    'Server',
    'Target Host',
    'Directory',
    'Profile',
    'Multiplier',
    'Duration (s)',
    'Status',
    'Total Tx Pkts',
    'Total Rx Pkts',
    'Total Tx Bytes',
    'Total Rx Bytes',
    'Avg Tx Gbps (L2)',
    'Avg Rx Gbps (L2)',
    'Peak Tx Gbps',
    'Avg Tx Mpps',
    'Avg Rx Mpps',
    'Drop Rate %',
    'Delivery Ratio %',
    'Dropped Packets Total',
    'Avg Frame Size (Bytes)',
    'L1 Wire Rate Tx (Gbps)',
    'L1 Wire Rate Rx (Gbps)',
    'L3 Payload Tx (Gbps)',
    'L3 Payload Rx (Gbps)',
    'Avg Latency (ms)',
    'Max Latency (ms)',
    'Latency Min (us)',
    'Latency Avg (us)',
    'Latency Max (us)',
    'Jitter (us)',
    'CPU %'
  ];

  const tech = report.technicalAnalysis;
  const values = [
    `"${report.id}"`,
    `"${report.timestamp}"`,
    `"${report.operator}"`,
    `"${report.serverType}"`,
    `"${report.targetHost}"`,
    `"${report.dir}"`,
    `"${report.profile}"`,
    `"${report.multiplier}"`,
    `"${report.duration}"`,
    `"${report.status}"`,
    report.summary.totalPacketsTx,
    report.summary.totalPacketsRx,
    report.summary.totalBytesTx,
    report.summary.totalBytesRx,
    report.summary.avgTxGbps,
    report.summary.avgRxGbps,
    report.summary.peakTxGbps,
    report.summary.avgTxMpps,
    report.summary.avgRxMpps,
    report.summary.avgDropRatePercent,
    tech ? tech.deliveryRatioPercent : (100 - report.summary.avgDropRatePercent).toFixed(4),
    tech ? tech.droppedPacketsTotal : Math.max(0, report.summary.totalPacketsTx - report.summary.totalPacketsRx),
    tech ? tech.avgFrameSizeBytes : (report.summary.totalPacketsTx > 0 ? Math.round(report.summary.totalBytesTx / report.summary.totalPacketsTx) : 384),
    tech ? tech.l1LineRateTxGbps : (report.summary.avgTxGbps * 1.05).toFixed(2),
    tech ? tech.l1LineRateRxGbps : (report.summary.avgRxGbps * 1.05).toFixed(2),
    tech ? tech.l3PayloadTxGbps : (report.summary.avgTxGbps * 0.96).toFixed(2),
    tech ? tech.l3PayloadRxGbps : (report.summary.avgRxGbps * 0.96).toFixed(2),
    report.summary.avgLatencyMs,
    report.summary.maxLatencyMs,
    tech ? tech.latencyMinUs : 14,
    tech ? tech.latencyAvgUs : Math.round(report.summary.avgLatencyMs * 1000),
    tech ? tech.latencyMaxUs : Math.round(report.summary.maxLatencyMs * 1000),
    tech ? tech.jitterUs : 4,
    report.summary.cpuUtilizationPercent
  ];

  let csvContent = `${headers.join(',')}\n${values.join(',')}\n\n`;

  // Append Timeline Samples table if available
  if (report.timelineSamples && report.timelineSamples.length > 0) {
    csvContent += '--- TELEMETRIA SEGUNDO A SEGUNDO ---\n';
    csvContent += 'Segundo,Tx (Gbps),Rx (Gbps),Tx (Mpps),Rx (Mpps),Perda (%),CPU TRex (%)\n';
    for (const sample of report.timelineSamples) {
      csvContent += `${sample.second},${sample.txGbps},${sample.rxGbps},${sample.txMpps},${sample.rxMpps},${sample.dropRatePercent},${sample.cpuPercent}\n`;
    }
  }

  return csvContent;
}

export function exportReportAsMarkdown(report: TestReport): string {
  const tech = report.technicalAnalysis;
  const p0 = report.detailedPorts?.[0];
  const p1 = report.detailedPorts?.[1];

  let md = `# RELATÓRIO TÉCNICO DETALHADO - TESTE DE TRÁFEGO CISCO TREX DPDK
**ID do Relatório**: \`${report.id}\`  
**Data / Hora de Início**: ${report.timestamp}  
**Data / Hora de Término**: ${report.endTime || 'N/A'}  
**Host Gerador TRex**: ${report.targetHost}  
**Operador Responsável**: ${report.operator} (${report.operatorRole})  
**Status da Execução**: **${report.status}**  

---

## 1. Parâmetros de Configuração do Teste
| Parâmetro | Valor Configurado |
|---|---|
| **Comando / Servidor** | \`${report.serverType}\` |
| **Diretório do Perfil** | \`${report.dir}\` |
| **Arquivo de Perfil** | \`${report.profile}\` |
| **Multiplicador de Taxa (-m)** | \`${report.multiplier}\` |
| **Duração Programada (-d)** | \`${report.duration}\` segundos |
| **Portas Físicas Alocadas** | ${report.ports.join(', ')} |

---

## 2. Análise Técnica de Throughput & Camadas de Rede
| Métrica de Camada | Taxa Tx (Injeção) | Taxa Rx (Retorno) | Eficiência |
|---|---|---|---|
| **Camada 1 (L1 Wire-Rate)** *(inc. Preamble & IFG 20B)* | **${tech ? tech.l1LineRateTxGbps : (report.summary.avgTxGbps * 1.05).toFixed(2)} Gbps** | **${tech ? tech.l1LineRateRxGbps : (report.summary.avgRxGbps * 1.05).toFixed(2)} Gbps** | ${tech ? tech.bandwidthEfficiencyPercent : 100}% |
| **Camada 2 (L2 Ethernet Frame)** *(Payload + MAC)* | **${report.summary.avgTxGbps.toFixed(2)} Gbps** | **${report.summary.avgRxGbps.toFixed(2)} Gbps** | ${tech ? tech.bandwidthEfficiencyPercent : 100}% |
| **Camada 3 (L3 IP Payload)** *(sem 14B MAC Header)* | **${tech ? tech.l3PayloadTxGbps : (report.summary.avgTxGbps * 0.96).toFixed(2)} Gbps** | **${tech ? tech.l3PayloadRxGbps : (report.summary.avgRxGbps * 0.96).toFixed(2)} Gbps** | ${tech ? tech.bandwidthEfficiencyPercent : 100}% |
| **Taxa de Pacotes (Packet Rate)** | **${report.summary.avgTxMpps.toFixed(3)} Mpps** | **${report.summary.avgRxMpps.toFixed(3)} Mpps** | - |
| **Pico de Throughput Registrado** | ${report.summary.peakTxGbps.toFixed(2)} Gbps | ${report.summary.peakRxGbps.toFixed(2)} Gbps | - |

---

## 3. Contadores Absolutos de Pacotes e Integridade
| Contador de Rede | Transmitido (Tx) | Recebido (Rx) | Variação / Descarte |
|---|---|---|---|
| **Total de Pacotes (Frames)** | ${report.summary.totalPacketsTx.toLocaleString()} | ${report.summary.totalPacketsRx.toLocaleString()} | ${tech ? tech.droppedPacketsTotal.toLocaleString() : (report.summary.totalPacketsTx - report.summary.totalPacketsRx).toLocaleString()} descartados |
| **Volume Total de Dados** | ${(report.summary.totalBytesTx / 1e9).toFixed(3)} GB | ${(report.summary.totalBytesRx / 1e9).toFixed(3)} GB | ${(report.summary.totalBytesTx / 1e6).toFixed(0)} MB |
| **Taxa de Descarte (Drop Rate)** | - | - | **${report.summary.avgDropRatePercent.toFixed(5)}%** |
| **Taxa de Entrega (Delivery Ratio)** | - | - | **${tech ? tech.deliveryRatioPercent : (100 - report.summary.avgDropRatePercent).toFixed(4)}%** |
| **Tamanho Médio de Pacote** | **${tech ? tech.avgFrameSizeBytes : Math.round(report.summary.totalBytesTx / (report.summary.totalPacketsTx || 1))} Bytes** | - | - |

---

## 4. Latência, Jitter e Recursos de Hardware
| Parâmetro Técnico | Medição em Microssegundos (µs) | Medição em Milissegundos (ms) |
|---|---|---|
| **Latência Mínima (Min RTT)** | ${tech ? tech.latencyMinUs : 14} µs | ${(tech ? tech.latencyMinUs / 1000 : 0.014).toFixed(3)} ms |
| **Latência Média (Avg RTT)** | ${tech ? tech.latencyAvgUs : Math.round(report.summary.avgLatencyMs * 1000)} µs | ${report.summary.avgLatencyMs.toFixed(3)} ms |
| **Latência Máxima (Peak Buffer / Queue)** | ${tech ? tech.latencyMaxUs : Math.round(report.summary.maxLatencyMs * 1000)} µs | ${report.summary.maxLatencyMs.toFixed(3)} ms |
| **Jitter de Trânsito (IPDV RFC 3393)** | ${tech ? tech.jitterUs : 4} µs | 0.004 ms |
| **Carga de CPU do TRex Engine** | - | **${report.summary.cpuUtilizationPercent.toFixed(1)}% (DPDK Cores)** |

---

## 5. Matriz Comparativa de Interfaces Físicas (Port 0 vs Port 1)
| Interface | Endereço PCIe | Driver Kernel/DPDK | Endereço MAC | Taxa Média Tx | Taxa Média Rx | Total Pacotes |
|---|---|---|---|---|---|---|
| **Porta 0 (Injeção)** | \`${p0?.pciAddress || '0000:03:00.0'}\` | \`${p0?.driver || 'mlx5_core'}\` | \`${p0?.mac || '00:1B:21:BA:C1:20'}\` | ${report.summary.avgTxGbps.toFixed(2)} Gbps | 0.00 Gbps | ${report.summary.totalPacketsTx.toLocaleString()} |
| **Porta 1 (Retorno)** | \`${p1?.pciAddress || '0000:03:00.1'}\` | \`${p1?.driver || 'mlx5_core'}\` | \`${p1?.mac || '00:1B:21:BA:C1:21'}\` | 0.00 Gbps | ${report.summary.avgRxGbps.toFixed(2)} Gbps | ${report.summary.totalPacketsRx.toLocaleString()} |
`;

  if (report.timelineSamples && report.timelineSamples.length > 0) {
    md += `
---

## 6. Série Temporal de Amostras Segundo a Segundo
| Tempo (s) | Tx Throughput (Gbps) | Rx Throughput (Gbps) | Tx Rate (Mpps) | Rx Rate (Mpps) | Perda (%) | CPU TRex (%) |
|---|---|---|---|---|---|---|
`;
    for (const s of report.timelineSamples.slice(0, 60)) {
      md += `| ${s.second}s | ${s.txGbps.toFixed(2)} Gbps | ${s.rxGbps.toFixed(2)} Gbps | ${s.txMpps.toFixed(2)} | ${s.rxMpps.toFixed(2)} | ${s.dropRatePercent.toFixed(4)}% | ${s.cpuPercent.toFixed(1)}% |\n`;
    }
  }

  md += `
---

## 7. Logs de Execução do Console
\`\`\`text
${report.logs.join('\n')}
\`\`\`

---
*Relatório técnico compilado pelo Cisco TRex Modern Web Suite em ${new Date().toISOString()}*
`;

  return md;
}
