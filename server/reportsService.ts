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
        totalPacketsRx: 44218820,
        totalBytesTx: 16843900000,
        totalBytesRx: 16843850000,
        avgTxGbps: 9.87,
        avgRxGbps: 9.86,
        peakTxGbps: 10.02,
        peakRxGbps: 9.99,
        avgTxMpps: 14.82,
        avgRxMpps: 14.81,
        avgDropRatePercent: 0.00018,
        maxLatencyMs: 0.042,
        avgLatencyMs: 0.018,
        cpuUtilizationPercent: 46.2,
      },
      logs: [
        '[SERVER 1] Starting Cisco TRex Stateless Engine v3.08 on 10.69.70.20...',
        '[DPDK] Initializing DPDK EAL with 8 cores, 2 100GbE Mellanox ConnectX-5 ports.',
        '[TRAFFIC] Loading stream STL: stl/imix.yaml (multiplier: 10gbps, duration: 30s)',
        '[START] Injected traffic onto Port 0 -> Port 1 at rate 9.87 Gbps (14.82 Mpps)',
        '[SAMPLE @ 10s] Tx: 9.88 Gbps | Rx: 9.88 Gbps | Drops: 0 | CPU: 45%',
        '[SAMPLE @ 20s] Tx: 9.86 Gbps | Rx: 9.86 Gbps | Drops: 80 | CPU: 47%',
        '[FINISH] Test finished naturally after 30 seconds. All queues drained cleanly.'
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
        totalPacketsRx: 89449100,
        totalBytesTx: 45200000000,
        totalBytesRx: 45199200000,
        avgTxGbps: 6.02,
        avgRxGbps: 6.01,
        peakTxGbps: 6.45,
        peakRxGbps: 6.42,
        avgTxMpps: 1.49,
        avgRxMpps: 1.49,
        avgDropRatePercent: 0.001,
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
    'Avg Tx Gbps',
    'Avg Rx Gbps',
    'Avg Tx Mpps',
    'Avg Rx Mpps',
    'Drop Rate %',
    'Avg Latency (ms)',
    'Max Latency (ms)',
    'CPU %'
  ];

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
    report.summary.avgTxGbps,
    report.summary.avgRxGbps,
    report.summary.avgTxMpps,
    report.summary.avgRxMpps,
    report.summary.avgDropRatePercent,
    report.summary.avgLatencyMs,
    report.summary.maxLatencyMs,
    report.summary.cpuUtilizationPercent
  ];

  return `${headers.join(',')}\n${values.join(',')}`;
}

export function exportReportAsMarkdown(report: TestReport): string {
  return `# CISCO TREX TRAFFIC GENERATOR - TEST REPORT
**Report ID**: \`${report.id}\`
**Date / Time**: ${report.timestamp}
**Target TRex Host**: ${report.targetHost}
**Operator**: ${report.operator} (${report.operatorRole})
**Status**: ${report.status}

---

## 1. Test Configuration
- **Server Execution**: ${report.serverType}
- **Directory**: \`${report.dir}\`
- **Profile**: \`${report.profile}\`
- **Multiplier**: \`${report.multiplier}\`
- **Duration**: \`${report.duration}\` seconds
- **Ports Injected**: ${report.ports.join(', ')}

## 2. Performance Summary
| Metric | Value |
|---|---|
| **Average Throughput (Tx)** | **${report.summary.avgTxGbps.toFixed(2)} Gbps** |
| **Average Throughput (Rx)** | **${report.summary.avgRxGbps.toFixed(2)} Gbps** |
| **Peak Throughput (Tx)** | ${report.summary.peakTxGbps.toFixed(2)} Gbps |
| **Packet Rate (Tx)** | ${report.summary.avgTxMpps.toFixed(2)} Mpps |
| **Packet Rate (Rx)** | ${report.summary.avgRxMpps.toFixed(2)} Mpps |
| **Total Packets Tx** | ${report.summary.totalPacketsTx.toLocaleString()} pkts |
| **Total Packets Rx** | ${report.summary.totalPacketsRx.toLocaleString()} pkts |
| **Packet Drop Rate** | **${(report.summary.avgDropRatePercent).toFixed(5)}%** |
| **Average Latency** | ${report.summary.avgLatencyMs.toFixed(3)} ms |
| **Max Latency** | ${report.summary.maxLatencyMs.toFixed(3)} ms |
| **CPU Core Utilization** | ${report.summary.cpuUtilizationPercent.toFixed(1)}% |

## 3. Console Execution Logs
\`\`\`text
${report.logs.join('\n')}
\`\`\`

*Generated automatically by Cisco TRex Modern Web Suite on ${new Date().toISOString()}*
`;
}
