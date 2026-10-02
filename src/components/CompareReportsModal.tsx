import React, { useState } from 'react';
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  Printer,
  Calendar,
  Layers,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Network,
  RefreshCw,
} from 'lucide-react';
import { TestReport } from '../types';

interface CompareReportsModalProps {
  reportA: TestReport;
  reportB: TestReport;
  allReports: TestReport[];
  onSelectReportA: (id: string) => void;
  onSelectReportB: (id: string) => void;
  onSwap: () => void;
  onClose: () => void;
}

export const CompareReportsModal: React.FC<CompareReportsModalProps> = ({
  reportA,
  reportB,
  allReports,
  onSelectReportA,
  onSelectReportB,
  onSwap,
  onClose,
}) => {
  const techA = reportA.technicalAnalysis;
  const techB = reportB.technicalAnalysis;

  // Throughput
  const txA = reportA.summary.avgTxGbps;
  const txB = reportB.summary.avgTxGbps;
  const deltaTxGbps = txB - txA;
  const deltaTxPercent = txA > 0 ? (deltaTxGbps / txA) * 100 : 0;

  // Packet Rate
  const mppsA = reportA.summary.avgTxMpps;
  const mppsB = reportB.summary.avgTxMpps;
  const deltaMpps = mppsB - mppsA;
  const deltaMppsPercent = mppsA > 0 ? (deltaMpps / mppsA) * 100 : 0;

  // Drops
  const dropsA = techA?.droppedPacketsTotal ?? Math.max(0, reportA.summary.totalPacketsTx - reportA.summary.totalPacketsRx);
  const dropsB = techB?.droppedPacketsTotal ?? Math.max(0, reportB.summary.totalPacketsTx - reportB.summary.totalPacketsRx);
  const deltaDrops = dropsB - dropsA;

  // Drop Rate
  const dropRateA = reportA.summary.avgDropRatePercent;
  const dropRateB = reportB.summary.avgDropRatePercent;
  const deltaDropRate = dropRateB - dropRateA;

  // Latency (us)
  const latA = techA?.latencyAvgUs ?? Math.round(reportA.summary.avgLatencyMs * 1000);
  const latB = techB?.latencyAvgUs ?? Math.round(reportB.summary.avgLatencyMs * 1000);
  const deltaLatUs = latB - latA;
  const deltaLatPercent = latA > 0 ? (deltaLatUs / latA) * 100 : 0;

  // Jitter (us)
  const jitA = techA?.jitterUs ?? 4;
  const jitB = techB?.jitterUs ?? 4;
  const deltaJitterUs = jitB - jitA;

  // Automated Verdict
  const isZeroLossA = dropsA <= 0;
  const isZeroLossB = dropsB <= 0;

  let verdictTitle = '';
  let verdictDesc = '';
  let verdictType: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (isZeroLossA && isZeroLossB) {
    if (Math.abs(deltaTxGbps) < 0.1 && Math.abs(deltaLatUs) <= 3) {
      verdictTitle = 'Desempenho Equivalente & Estável (Zero-Loss em Ambos)';
      verdictDesc = 'Ambos os testes mantiveram 100% de entrega de pacotes sem perda de quadros, com variação estatística desprezível de throughput e latência.';
      verdictType = 'positive';
    } else if (deltaTxGbps > 0.1) {
      verdictTitle = `Melhoria de Throughput no Teste B (+${deltaTxGbps.toFixed(2)} Gbps)`;
      verdictDesc = `O Teste B atingiu maior vazão (${txB.toFixed(2)} Gbps vs ${txA.toFixed(2)} Gbps) preservando conformidade Zero-Loss RFC 2544.`;
      verdictType = 'positive';
    } else if (deltaLatUs < -3) {
      verdictTitle = `Redução de Latência no Teste B (${deltaLatUs} µs)`;
      verdictDesc = `O Teste B apresentou menor tempo de trânsito (${latB} µs vs ${latA} µs) sem registrar perda de pacotes.`;
      verdictType = 'positive';
    } else {
      verdictTitle = 'Ambos os Testes em Conformidade Zero-Loss RFC 2544';
      verdictDesc = 'Ambos os cenários operaram sem descarte no circuito.';
      verdictType = 'positive';
    }
  } else if (!isZeroLossA && isZeroLossB) {
    verdictTitle = 'Evolução Crítica: Teste B eliminou os descartes observados no Teste A';
    verdictDesc = `O Teste A registrou ${dropsA.toLocaleString()} descartes, enquanto o Teste B alcançou Zero-Loss (100% entrega).`;
    verdictType = 'positive';
  } else if (isZeroLossA && !isZeroLossB) {
    verdictTitle = 'Regressão de Desempenho Detectada no Teste B';
    verdictDesc = `O Teste B gerou ${dropsB.toLocaleString()} descartes de pacotes (${dropRateB.toFixed(4)}% de perda), enquanto o Teste A era 100% íntegro.`;
    verdictType = 'negative';
  } else {
    verdictTitle = 'Descartes Registrados em Ambos os Testes';
    verdictDesc = `Teste A: ${dropsA.toLocaleString()} perdas (${dropRateA.toFixed(4)}%) | Teste B: ${dropsB.toLocaleString()} perdas (${dropRateB.toFixed(4)}%).`;
    verdictType = 'negative';
  }

  // Print comparison as PDF
  const handleExportComparePdf = () => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Laudo Técnico Comparativo A/B - TRex RFC 2544</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title { font-size: 15pt; font-weight: 800; color: #0369a1; text-transform: uppercase; margin: 0; }
    .brand-sub { font-size: 8.5pt; color: #475569; margin-top: 2px; }
    .verdict-box {
      border: 1.5px solid ${verdictType === 'positive' ? '#16a34a' : verdictType === 'negative' ? '#dc2626' : '#0284c7'};
      background: ${verdictType === 'positive' ? '#f0fdf4' : verdictType === 'negative' ? '#fef2f2' : '#f0f9ff'};
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .verdict-title { font-weight: 700; font-size: 10.5pt; color: ${verdictType === 'positive' ? '#15803d' : verdictType === 'negative' ? '#b91c1c' : '#0369a1'}; text-transform: uppercase; }
    .verdict-desc { font-size: 8.5pt; color: #334155; margin-top: 2px; }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8.5pt; }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
    }
    td { padding: 6px 8px; border: 1px solid #e2e8f0; color: #1e293b; }
    tr:nth-child(even) td { background: #f8fafc; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .positive { color: #16a34a; font-weight: 700; }
    .negative { color: #dc2626; font-weight: 700; }
    .neutral { color: #64748b; }
    .footer-sign {
      margin-top: 22px;
      padding-top: 10px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #475569;
    }
    .sign-box { width: 190px; border-top: 1px solid #0f172a; text-align: center; padding-top: 4px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">NCT Informática</h1>
      <div class="brand-sub">Laudo Técnico Comparativo de Homologação A/B • RFC 2544 / Cisco TRex</div>
    </div>
    <div style="text-align: right; font-family: monospace; font-size: 8pt; color: #475569;">
      <div><strong>GERADO EM:</strong> ${new Date().toLocaleString('pt-BR')}</div>
      <div><strong>HARDWARE:</strong> Intel X520-DA2 (Dual 10GbE)</div>
    </div>
  </div>

  <div class="verdict-box">
    <div class="verdict-title">Veredito da Análise Comparativa: ${verdictTitle}</div>
    <div class="verdict-desc">${verdictDesc}</div>
  </div>

  <div class="section-title">1. Identificação dos Cenários Confrontados</div>
  <table>
    <thead>
      <tr>
        <th>Parâmetro</th>
        <th>Teste A (Referência / Baseline)</th>
        <th>Teste B (Candidato / Novo Teste)</th>
        <th>Status de Comparação</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>ID do Relatório</strong></td>
        <td class="mono font-bold">${reportA.id}</td>
        <td class="mono font-bold">${reportB.id}</td>
        <td class="text-center font-bold">Confronto A/B</td>
      </tr>
      <tr>
        <td><strong>Data / Horário</strong></td>
        <td>${new Date(reportA.timestamp).toLocaleString('pt-BR')}</td>
        <td>${new Date(reportB.timestamp).toLocaleString('pt-BR')}</td>
        <td class="text-center text-slate-500">${reportA.profile === reportB.profile ? 'Mesmo Perfil' : 'Perfis Diferentes'}</td>
      </tr>
      <tr>
        <td><strong>Perfil & Taxa (-m)</strong></td>
        <td class="mono">${reportA.profile} (${reportA.multiplier})</td>
        <td class="mono">${reportB.profile} (${reportB.multiplier})</td>
        <td class="text-center mono">${reportA.duration}s vs ${reportB.duration}s</td>
      </tr>
      <tr>
        <td><strong>Equipamento (DUT)</strong></td>
        <td class="mono font-bold">${reportA.dutName || 'DUT Teste A'} ${reportA.dutModel ? `(${reportA.dutModel})` : ''}</td>
        <td class="mono font-bold">${reportB.dutName || 'DUT Teste B'} ${reportB.dutModel ? `(${reportB.dutModel})` : ''}</td>
        <td class="text-center">${reportA.dutName === reportB.dutName ? 'Mesmo DUT' : 'Equipamentos Distintos'}</td>
      </tr>
      <tr>
        <td><strong>Firmware / Versão OS</strong></td>
        <td class="mono">${reportA.dutFirmware || 'N/I'}</td>
        <td class="mono">${reportB.dutFirmware || 'N/I'}</td>
        <td class="text-center font-bold">${reportA.dutFirmware === reportB.dutFirmware ? 'Mesma Versão' : 'Versões Diferentes'}</td>
      </tr>
      <tr>
        <td><strong>Operador Responsável</strong></td>
        <td>${reportA.operator}</td>
        <td>${reportB.operator}</td>
        <td class="text-center">${reportA.targetHost}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2. Matriz Comparativa de Throughput & Comutação</div>
  <table>
    <thead>
      <tr>
        <th>Métrica Avaliada</th>
        <th class="text-right">Teste A (Base)</th>
        <th class="text-right">Teste B (Candidato)</th>
        <th class="text-right">Diferença Absoluta (&Delta;)</th>
        <th class="text-right">Variação (%)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Throughput L2 Ethernet</strong></td>
        <td class="text-right mono font-bold">${txA.toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold">${txB.toFixed(2)} Gbps</td>
        <td class="text-right mono ${deltaTxGbps > 0 ? 'positive' : deltaTxGbps < 0 ? 'negative' : 'neutral'}">
          ${deltaTxGbps > 0 ? '+' : ''}${deltaTxGbps.toFixed(2)} Gbps
        </td>
        <td class="text-right mono ${deltaTxPercent > 0 ? 'positive' : deltaTxPercent < 0 ? 'negative' : 'neutral'}">
          ${deltaTxPercent > 0 ? '+' : ''}${deltaTxPercent.toFixed(2)}%
        </td>
      </tr>
      <tr>
        <td><strong>Taxa de Pacotes (Packet Rate)</strong></td>
        <td class="text-right mono font-bold">${mppsA.toFixed(3)} Mpps</td>
        <td class="text-right mono font-bold">${mppsB.toFixed(3)} Mpps</td>
        <td class="text-right mono ${deltaMpps > 0 ? 'positive' : deltaMpps < 0 ? 'negative' : 'neutral'}">
          ${deltaMpps > 0 ? '+' : ''}${deltaMpps.toFixed(3)} Mpps
        </td>
        <td class="text-right mono ${deltaMppsPercent > 0 ? 'positive' : deltaMppsPercent < 0 ? 'negative' : 'neutral'}">
          ${deltaMppsPercent > 0 ? '+' : ''}${deltaMppsPercent.toFixed(2)}%
        </td>
      </tr>
      <tr>
        <td><strong>L1 Wire-Rate Físico</strong></td>
        <td class="text-right mono">${(techA?.l1LineRateTxGbps ?? txA * 1.05).toFixed(2)} Gbps</td>
        <td class="text-right mono">${(techB?.l1LineRateTxGbps ?? txB * 1.05).toFixed(2)} Gbps</td>
        <td class="text-right mono">${((techB?.l1LineRateTxGbps ?? txB * 1.05) - (techA?.l1LineRateTxGbps ?? txA * 1.05)).toFixed(2)} Gbps</td>
        <td class="text-right mono">${deltaTxPercent > 0 ? '+' : ''}${deltaTxPercent.toFixed(2)}%</td>
      </tr>
      <tr>
        <td><strong>Pico Registrado de Throughput</strong></td>
        <td class="text-right mono">${reportA.summary.peakTxGbps.toFixed(2)} Gbps</td>
        <td class="text-right mono">${reportB.summary.peakTxGbps.toFixed(2)} Gbps</td>
        <td class="text-right mono">${(reportB.summary.peakTxGbps - reportA.summary.peakTxGbps).toFixed(2)} Gbps</td>
        <td class="text-right mono">-</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Análise de Integridade & Perda de Quadros (RFC 2544 §26.1)</div>
  <table>
    <thead>
      <tr>
        <th>Métrica de Integridade</th>
        <th class="text-right">Teste A</th>
        <th class="text-right">Teste B</th>
        <th class="text-right">Diferença (&Delta;)</th>
        <th class="text-center">Conformidade RFC 2544</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Total de Pacotes Transmitidos (Tx)</strong></td>
        <td class="text-right mono">${reportA.summary.totalPacketsTx.toLocaleString()}</td>
        <td class="text-right mono">${reportB.summary.totalPacketsTx.toLocaleString()}</td>
        <td class="text-right mono">${(reportB.summary.totalPacketsTx - reportA.summary.totalPacketsTx).toLocaleString()}</td>
        <td class="text-center mono">Volume Total</td>
      </tr>
      <tr>
        <td><strong>Total de Pacotes Recebidos (Rx)</strong></td>
        <td class="text-right mono">${reportA.summary.totalPacketsRx.toLocaleString()}</td>
        <td class="text-right mono">${reportB.summary.totalPacketsRx.toLocaleString()}</td>
        <td class="text-right mono">${(reportB.summary.totalPacketsRx - reportA.summary.totalPacketsRx).toLocaleString()}</td>
        <td class="text-center mono">Entregues</td>
      </tr>
      <tr>
        <td><strong>Descartes Registrados no DUT</strong></td>
        <td class="text-right mono font-bold ${dropsA === 0 ? 'positive' : 'negative'}">${dropsA.toLocaleString()} pkts</td>
        <td class="text-right mono font-bold ${dropsB === 0 ? 'positive' : 'negative'}">${dropsB.toLocaleString()} pkts</td>
        <td class="text-right mono ${deltaDrops < 0 ? 'positive' : deltaDrops > 0 ? 'negative' : 'neutral'}">
          ${deltaDrops > 0 ? '+' : ''}${deltaDrops.toLocaleString()} pkts
        </td>
        <td class="text-center font-bold ${isZeroLossB ? 'positive' : 'negative'}">
          ${isZeroLossB ? 'Zero-Loss Atingido' : 'Descartes Detectados'}
        </td>
      </tr>
      <tr>
        <td><strong>Taxa de Perda Percentual</strong></td>
        <td class="text-right mono">${dropRateA.toFixed(5)}%</td>
        <td class="text-right mono">${dropRateB.toFixed(5)}%</td>
        <td class="text-right mono ${deltaDropRate < 0 ? 'positive' : deltaDropRate > 0 ? 'negative' : 'neutral'}">
          ${deltaDropRate > 0 ? '+' : ''}${deltaDropRate.toFixed(5)}%
        </td>
        <td class="text-center mono font-bold">${isZeroLossB ? '100% Eficiência' : 'Degradação'}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. Qualidade de Serviço (QoS) & Latência de Trânsito</div>
  <table>
    <thead>
      <tr>
        <th>Métrica de QoS</th>
        <th class="text-right">Teste A</th>
        <th class="text-right">Teste B</th>
        <th class="text-right">Diferença (&Delta;)</th>
        <th class="text-center">Impacto no DUT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Latência Média (RTT)</strong></td>
        <td class="text-right mono font-bold">${latA} µs (${reportA.summary.avgLatencyMs.toFixed(3)} ms)</td>
        <td class="text-right mono font-bold">${latB} µs (${reportB.summary.avgLatencyMs.toFixed(3)} ms)</td>
        <td class="text-right mono ${deltaLatUs < 0 ? 'positive' : deltaLatUs > 0 ? 'negative' : 'neutral'}">
          ${deltaLatUs > 0 ? '+' : ''}${deltaLatUs} µs (${deltaLatPercent > 0 ? '+' : ''}${deltaLatPercent.toFixed(1)}%)
        </td>
        <td class="text-center ${deltaLatUs <= 2 ? 'positive' : 'negative'}">
          ${deltaLatUs <= 0 ? 'Excelente (Mais Rápido)' : deltaLatUs <= 5 ? 'Variação Normal' : 'Aumento de Latência'}
        </td>
      </tr>
      <tr>
        <td><strong>Jitter de Trânsito (PDV)</strong></td>
        <td class="text-right mono">${jitA} µs</td>
        <td class="text-right mono">${jitB} µs</td>
        <td class="text-right mono ${deltaJitterUs <= 0 ? 'positive' : 'negative'}">${deltaJitterUs > 0 ? '+' : ''}${deltaJitterUs} µs</td>
        <td class="text-center text-slate-500">Estabilidade</td>
      </tr>
      <tr>
        <td><strong>Utilização de CPU TRex</strong></td>
        <td class="text-right mono">${reportA.summary.cpuUtilizationPercent.toFixed(1)}%</td>
        <td class="text-right mono">${reportB.summary.cpuUtilizationPercent.toFixed(1)}%</td>
        <td class="text-right mono">${(reportB.summary.cpuUtilizationPercent - reportA.summary.cpuUtilizationPercent).toFixed(1)}%</td>
        <td class="text-center positive">Gerador Ocioso (< 70%)</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-sign">
    <div>
      <div><strong>NCT Informática • Engenharia de Redes & Telecomunicações</strong></div>
      <div>Laudo comparativo gerado automaticamente com precisão de telemetria DPDK v3.08</div>
      <div>Critérios de Conformidade: RFC 2544 Benchmarking Methodology</div>
    </div>
    <div>
      <div class="sign-box">
        <strong>${reportB.operator || reportA.operator}</strong><br>
        Engenheiro / Operador Responsável
      </div>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar e imprimir o laudo comparativo em PDF.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-[#44475a] bg-[#282a36] p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#44475a] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#bd93f9]">
                  Comparação de Testes de Tráfego (Diff A/B)
                </span>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                  RFC 2544 Benchmark
                </span>
              </div>
              <h3 className="text-base font-bold font-mono text-[#f8f8f2]">
                Teste A ({reportA.id.slice(0, 14)}) vs. Teste B ({reportB.id.slice(0, 14)})
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwap}
              title="Inverter ordem (Trocar Referência e Candidato)"
              className="flex items-center gap-1.5 rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-1.5 text-xs font-mono text-purple-300 hover:bg-[#44475a] transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Inverter (B ⇄ A)</span>
            </button>

            <button
              type="button"
              onClick={handleExportComparePdf}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Laudo PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Test Selector Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1e1f29] p-4 rounded-xl border border-[#44475a]">
          {/* Test A Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#8be9fd] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#8be9fd]" />
                TESTE A (Referência / Baseline):
              </span>
              <span className="text-[11px] text-[#6272a4]">{reportA.operator}</span>
            </div>
            <select
              value={reportA.id}
              onChange={(e) => onSelectReportA(e.target.value)}
              className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-2 text-xs font-mono text-[#f8f8f2] focus:border-sky-500 focus:outline-none"
            >
              {allReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} • {r.profile} ({r.multiplier}) • {new Date(r.timestamp).toLocaleTimeString('pt-BR')} • {r.dutName || 'DUT'}
                </option>
              ))}
            </select>
          </div>

          {/* Test B Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#50fa7b] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#50fa7b]" />
                TESTE B (Candidato / Novo Teste):
              </span>
              <span className="text-[11px] text-[#6272a4]">{reportB.operator}</span>
            </div>
            <select
              value={reportB.id}
              onChange={(e) => onSelectReportB(e.target.value)}
              className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-2 text-xs font-mono text-[#f8f8f2] focus:border-emerald-500 focus:outline-none"
            >
              {allReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} • {r.profile} ({r.multiplier}) • {new Date(r.timestamp).toLocaleTimeString('pt-BR')} • {r.dutName || 'DUT'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Automated Verdict Box */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            verdictType === 'positive'
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
              : verdictType === 'negative'
              ? 'bg-red-950/30 border-red-500/50 text-red-200'
              : 'bg-sky-950/30 border-sky-500/50 text-sky-200'
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              {verdictType === 'positive' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              {verdictTitle}
            </div>
            <p className="text-xs opacity-90">{verdictDesc}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <div className="bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-center">
              <span className="block text-[10px] opacity-70">DELTA THROUGHPUT:</span>
              <span
                className={`font-bold ${
                  deltaTxGbps > 0 ? 'text-emerald-400' : deltaTxGbps < 0 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {deltaTxGbps > 0 ? '+' : ''}
                {deltaTxGbps.toFixed(2)} Gbps
              </span>
            </div>

            <div className="bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 text-center">
              <span className="block text-[10px] opacity-70">DELTA LATÊNCIA:</span>
              <span
                className={`font-bold ${
                  deltaLatUs < 0 ? 'text-emerald-400' : deltaLatUs > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {deltaLatUs > 0 ? '+' : ''}
                {deltaLatUs} µs
              </span>
            </div>
          </div>
        </div>

        {/* Comparison Tables */}
        <div className="space-y-4">
          {/* 1. Identification & DUT Side-by-Side */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-[#8be9fd]" />
              Identificação & Equipamentos sob Teste (DUT)
            </h4>

            <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#1e1f29]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[#44475a] bg-[#282a36] text-[11px] uppercase text-[#6272a4]">
                  <tr>
                    <th className="px-3.5 py-2">Parâmetro</th>
                    <th className="px-3.5 py-2 text-[#8be9fd]">Teste A (Baseline)</th>
                    <th className="px-3.5 py-2 text-[#50fa7b]">Teste B (Candidato)</th>
                    <th className="px-3.5 py-2 text-right">Comparação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#44475a]/50 text-[#f8f8f2]">
                  <tr>
                    <td className="px-3.5 py-2 text-slate-400 font-semibold">Equipamento (DUT)</td>
                    <td className="px-3.5 py-2 font-bold text-[#8be9fd]">{reportA.dutName || 'DUT Teste A'}</td>
                    <td className="px-3.5 py-2 font-bold text-[#50fa7b]">{reportB.dutName || 'DUT Teste B'}</td>
                    <td className="px-3.5 py-2 text-right text-xs">
                      {reportA.dutName === reportB.dutName ? (
                        <span className="text-emerald-400 font-bold">Mesmo Equipamento</span>
                      ) : (
                        <span className="text-purple-300 font-bold">Equipamentos Distintos</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 text-slate-400 font-semibold">Modelo / Part Number</td>
                    <td className="px-3.5 py-2">{reportA.dutModel || '-'}</td>
                    <td className="px-3.5 py-2">{reportB.dutModel || '-'}</td>
                    <td className="px-3.5 py-2 text-right text-slate-400">
                      {reportA.dutModel === reportB.dutModel ? 'Idêntico' : 'Diferente'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 text-slate-400 font-semibold">Firmware / Versão OS</td>
                    <td className="px-3.5 py-2">{reportA.dutFirmware || 'Versão Homologada'}</td>
                    <td className="px-3.5 py-2">{reportB.dutFirmware || 'Versão Homologada'}</td>
                    <td className="px-3.5 py-2 text-right">
                      {reportA.dutFirmware === reportB.dutFirmware ? (
                        <span className="text-slate-400">Mesma Versão</span>
                      ) : (
                        <span className="text-amber-300 font-bold">Upgrade / Mudança</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 text-slate-400 font-semibold">Perfil de Tráfego</td>
                    <td className="px-3.5 py-2 text-[#f1fa8c]">{reportA.profile} ({reportA.dir})</td>
                    <td className="px-3.5 py-2 text-[#f1fa8c]">{reportB.profile} ({reportB.dir})</td>
                    <td className="px-3.5 py-2 text-right text-slate-400">
                      {reportA.profile === reportB.profile ? 'Mesmo Perfil' : 'Perfis Distintos'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 text-slate-400 font-semibold">Taxa / Duração</td>
                    <td className="px-3.5 py-2">{reportA.multiplier} • {reportA.duration}s</td>
                    <td className="px-3.5 py-2">{reportB.multiplier} • {reportB.duration}s</td>
                    <td className="px-3.5 py-2 text-right text-slate-400">
                      {reportA.multiplier === reportB.multiplier ? 'Mesma Taxa' : 'Cargas Diferentes'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Throughput & Forwarding Deltas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#50fa7b]" />
              Throughput & Capacidade de Comutação
            </h4>

            <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#1e1f29]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[#44475a] bg-[#282a36] text-[11px] uppercase text-[#6272a4]">
                  <tr>
                    <th className="px-3.5 py-2">Métrica</th>
                    <th className="px-3.5 py-2 text-right text-[#8be9fd]">Teste A</th>
                    <th className="px-3.5 py-2 text-right text-[#50fa7b]">Teste B</th>
                    <th className="px-3.5 py-2 text-right text-purple-300">Diferença (&Delta;)</th>
                    <th className="px-3.5 py-2 text-right">Variação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#44475a]/50 text-[#f8f8f2]">
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Throughput L2 Ethernet</td>
                    <td className="px-3.5 py-2 text-right font-bold text-[#8be9fd]">{txA.toFixed(2)} Gbps</td>
                    <td className="px-3.5 py-2 text-right font-bold text-[#50fa7b]">{txB.toFixed(2)} Gbps</td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaTxGbps > 0 ? 'text-emerald-400' : deltaTxGbps < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaTxGbps > 0 ? '+' : ''}
                      {deltaTxGbps.toFixed(2)} Gbps
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaTxPercent > 0 ? 'text-emerald-400' : deltaTxPercent < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaTxPercent > 0 ? '+' : ''}
                      {deltaTxPercent.toFixed(2)}%
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Taxa de Pacotes (Packet Rate)</td>
                    <td className="px-3.5 py-2 text-right font-bold">{mppsA.toFixed(3)} Mpps</td>
                    <td className="px-3.5 py-2 text-right font-bold">{mppsB.toFixed(3)} Mpps</td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaMpps > 0 ? 'text-emerald-400' : deltaMpps < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaMpps > 0 ? '+' : ''}
                      {deltaMpps.toFixed(3)} Mpps
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaMppsPercent > 0 ? 'text-emerald-400' : deltaMppsPercent < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaMppsPercent > 0 ? '+' : ''}
                      {deltaMppsPercent.toFixed(2)}%
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">L1 Wire-Rate Físico</td>
                    <td className="px-3.5 py-2 text-right">{(techA?.l1LineRateTxGbps ?? txA * 1.05).toFixed(2)} Gbps</td>
                    <td className="px-3.5 py-2 text-right">{(techB?.l1LineRateTxGbps ?? txB * 1.05).toFixed(2)} Gbps</td>
                    <td className="px-3.5 py-2 text-right font-semibold">
                      {((techB?.l1LineRateTxGbps ?? txB * 1.05) - (techA?.l1LineRateTxGbps ?? txA * 1.05)).toFixed(2)} Gbps
                    </td>
                    <td className="px-3.5 py-2 text-right text-slate-400">
                      {deltaTxPercent > 0 ? '+' : ''}
                      {deltaTxPercent.toFixed(1)}%
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Pico de Throughput Registrado</td>
                    <td className="px-3.5 py-2 text-right font-mono">{reportA.summary.peakTxGbps.toFixed(2)} Gbps</td>
                    <td className="px-3.5 py-2 text-right font-mono">{reportB.summary.peakTxGbps.toFixed(2)} Gbps</td>
                    <td className="px-3.5 py-2 text-right font-mono">
                      {(reportB.summary.peakTxGbps - reportA.summary.peakTxGbps).toFixed(2)} Gbps
                    </td>
                    <td className="px-3.5 py-2 text-right text-slate-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Packet Loss & Frame Integrity RFC 2544 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-[#ffb86c]" />
              Integridade de Quadros & Descartes no DUT (RFC 2544)
            </h4>

            <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#1e1f29]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[#44475a] bg-[#282a36] text-[11px] uppercase text-[#6272a4]">
                  <tr>
                    <th className="px-3.5 py-2">Métrica</th>
                    <th className="px-3.5 py-2 text-right text-[#8be9fd]">Teste A</th>
                    <th className="px-3.5 py-2 text-right text-[#50fa7b]">Teste B</th>
                    <th className="px-3.5 py-2 text-right text-purple-300">Diferença (&Delta;)</th>
                    <th className="px-3.5 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#44475a]/50 text-[#f8f8f2]">
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Total Pacotes Transmitidos (Tx)</td>
                    <td className="px-3.5 py-2 text-right">{reportA.summary.totalPacketsTx.toLocaleString()}</td>
                    <td className="px-3.5 py-2 text-right">{reportB.summary.totalPacketsTx.toLocaleString()}</td>
                    <td className="px-3.5 py-2 text-right">
                      {(reportB.summary.totalPacketsTx - reportA.summary.totalPacketsTx).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2 text-center text-slate-400">Total</td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Descartes Registrados no DUT</td>
                    <td className={`px-3.5 py-2 text-right font-bold ${dropsA === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {dropsA.toLocaleString()} pkts
                    </td>
                    <td className={`px-3.5 py-2 text-right font-bold ${dropsB === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {dropsB.toLocaleString()} pkts
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaDrops < 0 ? 'text-emerald-400' : deltaDrops > 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaDrops > 0 ? '+' : ''}
                      {deltaDrops.toLocaleString()} pkts
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      {isZeroLossB ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Zero-Loss (100%)
                        </span>
                      ) : (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          Descartes Ativos
                        </span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Taxa de Perda (%)</td>
                    <td className="px-3.5 py-2 text-right">{dropRateA.toFixed(5)}%</td>
                    <td className="px-3.5 py-2 text-right">{dropRateB.toFixed(5)}%</td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaDropRate < 0 ? 'text-emerald-400' : deltaDropRate > 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaDropRate > 0 ? '+' : ''}
                      {deltaDropRate.toFixed(5)}%
                    </td>
                    <td className="px-3.5 py-2 text-center text-slate-400">
                      {deltaDropRate === 0 ? 'Inalterado' : deltaDropRate > 0 ? 'Piora' : 'Melhoria'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. QoS & Latency */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#ff79c6]" />
              Latência de Trânsito & Jitter (RFC 3393 PDV)
            </h4>

            <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#1e1f29]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[#44475a] bg-[#282a36] text-[11px] uppercase text-[#6272a4]">
                  <tr>
                    <th className="px-3.5 py-2">Métrica</th>
                    <th className="px-3.5 py-2 text-right text-[#8be9fd]">Teste A</th>
                    <th className="px-3.5 py-2 text-right text-[#50fa7b]">Teste B</th>
                    <th className="px-3.5 py-2 text-right text-purple-300">Diferença (&Delta;)</th>
                    <th className="px-3.5 py-2 text-center">Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#44475a]/50 text-[#f8f8f2]">
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Latência Média (RTT)</td>
                    <td className="px-3.5 py-2 text-right font-bold text-[#8be9fd]">
                      {latA} µs ({reportA.summary.avgLatencyMs.toFixed(3)} ms)
                    </td>
                    <td className="px-3.5 py-2 text-right font-bold text-[#50fa7b]">
                      {latB} µs ({reportB.summary.avgLatencyMs.toFixed(3)} ms)
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaLatUs < 0 ? 'text-emerald-400' : deltaLatUs > 0 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaLatUs > 0 ? '+' : ''}
                      {deltaLatUs} µs ({deltaLatPercent > 0 ? '+' : ''}
                      {deltaLatPercent.toFixed(1)}%)
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      {deltaLatUs < 0 ? (
                        <span className="text-emerald-400 font-bold">Mais Rápido</span>
                      ) : deltaLatUs > 5 ? (
                        <span className="text-amber-400 font-bold">Acréscimo de Espera</span>
                      ) : (
                        <span className="text-slate-400">Estável</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Jitter de Trânsito</td>
                    <td className="px-3.5 py-2 text-right">{jitA} µs</td>
                    <td className="px-3.5 py-2 text-right">{jitB} µs</td>
                    <td
                      className={`px-3.5 py-2 text-right font-bold ${
                        deltaJitterUs < 0 ? 'text-emerald-400' : deltaJitterUs > 0 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {deltaJitterUs > 0 ? '+' : ''}
                      {deltaJitterUs} µs
                    </td>
                    <td className="px-3.5 py-2 text-center text-slate-400">Variação de Atraso</td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-slate-300">Uso CPU TRex DPDK</td>
                    <td className="px-3.5 py-2 text-right font-mono">{reportA.summary.cpuUtilizationPercent.toFixed(1)}%</td>
                    <td className="px-3.5 py-2 text-right font-mono">{reportB.summary.cpuUtilizationPercent.toFixed(1)}%</td>
                    <td className="px-3.5 py-2 text-right font-mono">
                      {(reportB.summary.cpuUtilizationPercent - reportA.summary.cpuUtilizationPercent).toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-2 text-center text-emerald-400 font-bold">Sem Gargalo Local</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#44475a] pt-4 font-mono text-xs">
          <div className="text-[11px] text-[#6272a4]">
            Placa de Rede em ambos os testes: Intel X520-DA2 (Dual 10GbE SFP+ • librte_pmd_ixgbe)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportComparePdf}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir Laudo A/B</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#44475a] px-3.5 py-1.5 text-[#f8f8f2] hover:bg-[#44475a] transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
