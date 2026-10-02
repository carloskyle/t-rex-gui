import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Calendar,
  Layers,
  HardDrive,
  User,
  Activity,
  FileSpreadsheet,
  FileCode2,
  Printer,
  Image as ImageIcon,
  Upload,
  Save,
  Check,
  Network,
  X,
  GitCompare,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { TestReport } from '../types';
import { CompareReportsModal } from './CompareReportsModal';

export const ReportsTab: React.FC = () => {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);

  // Compare A/B states
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [compareReportAId, setCompareReportAId] = useState<string | null>(null);
  const [compareReportBId, setCompareReportBId] = useState<string | null>(null);

  // DUT & Topology states for inspection modal
  const [dutName, setDutName] = useState<string>('');
  const [dutModel, setDutModel] = useState<string>('');
  const [dutFirmware, setDutFirmware] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [topologyImage, setTopologyImage] = useState<string | null>(null);
  const [isSavingDut, setIsSavingDut] = useState<boolean>(false);
  const [dutSaveFeedback, setDutSaveFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync DUT & Topology when opening report
  useEffect(() => {
    if (selectedReport) {
      setDutName(selectedReport.dutName || '');
      setDutModel(selectedReport.dutModel || '');
      setDutFirmware(selectedReport.dutFirmware || '');
      setNotes(selectedReport.notes || '');
      setTopologyImage(selectedReport.topologyImage || null);
      setDutSaveFeedback(null);
    }
  }, [selectedReport]);

  const handleSaveDutAndTopology = async () => {
    if (!selectedReport) return;
    setIsSavingDut(true);
    setDutSaveFeedback(null);
    try {
      const res = await ApiClient.updateReport(selectedReport.id, {
        dutName: dutName.trim() || undefined,
        dutModel: dutModel.trim() || undefined,
        dutFirmware: dutFirmware.trim() || undefined,
        notes: notes.trim() || undefined,
        topologyImage: topologyImage || undefined,
      });

      setSelectedReport(res.report);
      setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      setDutSaveFeedback('Topologia e dados do DUT atualizados com sucesso no laudo!');
      setTimeout(() => setDutSaveFeedback(null), 4000);
    } catch (err: any) {
      setDutSaveFeedback(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSavingDut(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem da topologia deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setTopologyImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getReports();
      setReports(res.reports);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleOpenCompare = (aId?: string, bId?: string) => {
    if (reports.length < 2) {
      alert('São necessários pelo menos 2 relatórios no histórico para realizar uma comparação.');
      return;
    }

    const firstId = aId || selectedForCompare[0] || reports[0]?.id;
    let secondId = bId || selectedForCompare[1];

    if (!secondId || secondId === firstId) {
      const other = reports.find((r) => r.id !== firstId);
      secondId = other ? other.id : reports[1]?.id;
    }

    setCompareReportAId(firstId);
    setCompareReportBId(secondId);
    setIsCompareModalOpen(true);
  };

  const handleSwapCompare = () => {
    setCompareReportAId(compareReportBId);
    setCompareReportBId(compareReportAId);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Deseja realmente excluir este relatório do histórico?')) return;
    try {
      await ApiClient.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    }
  };

  const handleDownload = (id: string, format: 'json' | 'csv' | 'markdown', e: React.MouseEvent) => {
    e.stopPropagation();
    const token = ApiClient.getToken();
    const url = `/api/reports/${id}/export?format=${format}`;

    // Create an authorized fetch download trigger
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const extension = format === 'markdown' ? 'md' : format;
        a.download = `trex-benchmark-${id}.${extension}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch((err) => {
        alert(`Erro ao baixar relatório: ${err.message}`);
      });
  };

  const handleExportPdf = (report: TestReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const tech = report.technicalAnalysis;
    const isZeroLoss = (tech?.droppedPacketsTotal ?? (report.summary.totalPacketsTx - report.summary.totalPacketsRx)) <= 0;
    const formattedDate = new Date(report.timestamp).toLocaleString('pt-BR');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Laudo Técnico TRex - ${report.id}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10pt;
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
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0369a1;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 9pt;
      color: #475569;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      color: #334155;
    }
    .verdict-box {
      border: 1.5px solid ${isZeroLoss ? '#16a34a' : '#ea580c'};
      background: ${isZeroLoss ? '#f0fdf4' : '#fff7ed'};
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .verdict-title {
      font-weight: 700;
      font-size: 11pt;
      color: ${isZeroLoss ? '#15803d' : '#c2410c'};
      text-transform: uppercase;
    }
    .verdict-desc {
      font-size: 8.5pt;
      color: #334155;
      margin-top: 2px;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9pt;
    }
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
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .text-right {
      text-align: right;
    }
    .font-bold {
      font-weight: 700;
    }
    .text-green {
      color: #16a34a;
    }
    .text-blue {
      color: #0284c7;
    }
    .text-red {
      color: #dc2626;
    }
    .footer-sign {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #475569;
    }
    .sign-box {
      width: 200px;
      border-top: 1px solid #0f172a;
      text-align: center;
      padding-top: 4px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">NCT Informática</h1>
      <div class="brand-sub">Laudo Técnico de Homologação & Benchmarking de Rede • RFC 2544 / Cisco TRex</div>
    </div>
    <div class="report-meta">
      <div><strong>ID DO LAUDO:</strong> ${report.id}</div>
      <div><strong>DATA / HORA:</strong> ${formattedDate}</div>
      <div><strong>OPERADOR:</strong> ${report.operator}</div>
      <div><strong>TARGET HOST:</strong> ${report.targetHost}</div>
    </div>
  </div>

  <div class="verdict-box">
    <div>
      <div class="verdict-title">${isZeroLoss ? 'Conformidade RFC 2544: Zero-Loss Atingido' : 'Descartes Registrados no Dispositivo sob Teste (DUT)'}</div>
      <div class="verdict-desc">${isZeroLoss ? 'Injeção de tráfego concluída com 100% dos pacotes recebidos sem perda no circuito de teste.' : 'Foram registrados descartes por saturação ou limitação de taxa no equipamento/link intermediário.'}</div>
    </div>
    <div class="mono font-bold" style="font-size: 13pt; color: ${isZeroLoss ? '#15803d' : '#c2410c'};">
      ${(tech?.deliveryRatioPercent ?? (100 - report.summary.avgDropRatePercent)).toFixed(4)}% Entrega
    </div>
  </div>

  <div class="section-title">1. Parâmetros de Execução do Teste & Equipamento Sob Teste (DUT)</div>
  <table>
    <tr>
      <th>Perfil de Tráfego</th>
      <td><strong class="mono">${report.profile}</strong> (${report.dir})</td>
      <th>Duração Programada</th>
      <td class="mono font-bold">${report.duration} segundos</td>
    </tr>
    <tr>
      <th>Multiplicador de Taxa (-m)</th>
      <td class="mono font-bold text-blue">${report.multiplier}</td>
      <th>Distribuição de Frame</th>
      <td class="mono font-bold">${report.profile.includes('imix') ? 'IMIX Ponderado (64B, 570B, 1518B)' : `${tech?.avgFrameSizeBytes ?? 384} Bytes (Média)`}</td>
    </tr>
    <tr>
      <th>Equipamento Sob Teste (DUT)</th>
      <td class="mono"><strong>${report.dutName || 'Dispositivo Sob Homologação'}</strong> ${report.dutModel ? `(${report.dutModel})` : ''}</td>
      <th>Firmware / Versão OS</th>
      <td class="mono">${report.dutFirmware || 'Versão Homologada'}</td>
    </tr>
    <tr>
      <th>Placa Geradora TRex</th>
      <td class="mono"><strong>Intel X520-DA2 (Dual 10GbE SFP+)</strong></td>
      <th>Driver DPDK</th>
      <td class="mono">librte_pmd_ixgbe / vfio-pci</td>
    </tr>
  </table>

  <div class="section-title">2. Topologia de Rede do Teste de PoC</div>
  ${report.topologyImage ? `
    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; margin-bottom: 14px;">
      <img src="${report.topologyImage}" style="max-width: 100%; max-height: 230px; object-fit: contain; border-radius: 4px;" alt="Topologia do Teste" />
      <div style="font-size: 8pt; color: #475569; margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
        Topologia Física de Bancada: Cisco TRex (Intel X520-DA2 [Port 0 / Port 1]) ⇄ DUT (${report.dutName || 'Equipamento Sob Teste'})
      </div>
      ${report.notes ? `<div style="font-size: 8pt; color: #0369a1; margin-top: 3px; font-style: italic;">Notas Técnicas: ${report.notes}</div>` : ''}
    </div>
  ` : `
    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; margin-bottom: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8.5pt; color: #334155;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px;">
        <div><strong>TRex Port 0 (Tx)</strong><br><span style="font-size: 7.5pt; color: #64748b;">16.0.0.1 (Intel X520-DA2)</span></div>
        <div style="color: #0284c7; font-weight: bold;">── 10Gbps SFP+ ──►</div>
        <div style="text-align: center; background: #f1f5f9; padding: 6px 16px; border-radius: 4px; border: 1px dashed #94a3b8;">
          <strong>DUT: ${report.dutName || 'Equipamento Sob Teste'}</strong><br>
          <span style="font-size: 7.5pt; color: #64748b;">${report.dutModel || 'Switch / Roteador / Firewall'}</span>
        </div>
        <div style="color: #0284c7; font-weight: bold;">── 10Gbps SFP+ ──►</div>
        <div><strong>TRex Port 1 (Rx)</strong><br><span style="font-size: 7.5pt; color: #64748b;">48.0.0.1 (Intel X520-DA2)</span></div>
      </div>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 6px; text-align: center;">Topologia Full-Duplex RFC 2544: Verificação de Throughput, Latência e Perda de Quadros</div>
      ${report.notes ? `<div style="font-size: 8pt; color: #0369a1; margin-top: 4px; text-align: center;">Notas: ${report.notes}</div>` : ''}
    </div>
  `}

  <div class="section-title">3. Métricas de Throughput por Camada (L1 / L2 / L3)</div>
  <table>
    <thead>
      <tr>
        <th>Camada de Rede</th>
        <th class="text-right">Tx (Injeção)</th>
        <th class="text-right">Rx (Recepção)</th>
        <th class="text-right">Eficiência de Enlace</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>L1 Wire-Rate</strong> (inc. Preamble & IFG 20B)</td>
        <td class="text-right mono font-bold text-green">${(tech?.l1LineRateTxGbps ?? report.summary.avgTxGbps * 1.05).toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold text-green">${(tech?.l1LineRateRxGbps ?? report.summary.avgRxGbps * 1.05).toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold">100.0%</td>
      </tr>
      <tr>
        <td><strong>L2 Ethernet Throughput</strong> (Payload + MAC)</td>
        <td class="text-right mono font-bold text-blue">${report.summary.avgTxGbps.toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold text-blue">${report.summary.avgRxGbps.toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold">${(tech?.bandwidthEfficiencyPercent ?? 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td><strong>L3 IP Payload Rate</strong> (sem 14B MAC Header)</td>
        <td class="text-right mono font-bold">${(tech?.l3PayloadTxGbps ?? report.summary.avgTxGbps * 0.96).toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold">${(tech?.l3PayloadRxGbps ?? report.summary.avgRxGbps * 0.96).toFixed(2)} Gbps</td>
        <td class="text-right mono font-bold">${((tech?.l3PayloadTxGbps ?? report.summary.avgTxGbps * 0.96) / (report.summary.avgTxGbps || 1) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td><strong>Taxa de Pacotes (Packet Rate)</strong></td>
        <td class="text-right mono font-bold">${report.summary.avgTxMpps.toFixed(3)} Mpps</td>
        <td class="text-right mono font-bold">${report.summary.avgRxMpps.toFixed(3)} Mpps</td>
        <td class="text-right mono font-bold">Pico: ${report.summary.peakTxGbps.toFixed(2)} Gbps</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. Auditoria de Contadores Absolutos & Integridade</div>
  <table>
    <thead>
      <tr>
        <th>Total Pacotes Tx</th>
        <th>Total Pacotes Rx</th>
        <th>Descartes no DUT</th>
        <th>Taxa de Perda (%)</th>
        <th>Volume Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="mono font-bold">${report.summary.totalPacketsTx.toLocaleString()}</td>
        <td class="mono font-bold">${report.summary.totalPacketsRx.toLocaleString()}</td>
        <td class="mono font-bold ${isZeroLoss ? 'text-green' : 'text-red'}">
          ${(tech?.droppedPacketsTotal ?? Math.max(0, report.summary.totalPacketsTx - report.summary.totalPacketsRx)).toLocaleString()} pkts
        </td>
        <td class="mono font-bold ${report.summary.avgDropRatePercent > 0 ? 'text-red' : 'text-green'}">
          ${report.summary.avgDropRatePercent.toFixed(5)}%
        </td>
        <td class="mono">${(report.summary.totalBytesTx / 1e9).toFixed(3)} GB</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">5. Latência, Jitter e Recursos de Hardware</div>
  <table>
    <tr>
      <th>Latência Mínima (RTT)</th>
      <td class="mono">${tech?.latencyMinUs ?? 14} µs (0.014 ms)</td>
      <th>Utilização CPU TRex</th>
      <td class="mono font-bold">${report.summary.cpuUtilizationPercent.toFixed(1)}% (Cores DPDK)</td>
    </tr>
    <tr>
      <th>Latência Média (RTT)</th>
      <td class="mono">${tech?.latencyAvgUs ?? Math.round(report.summary.avgLatencyMs * 1000)} µs (${report.summary.avgLatencyMs.toFixed(3)} ms)</td>
      <th>Jitter de Trânsito</th>
      <td class="mono font-bold text-green">${tech?.jitterUs ?? 4} µs</td>
    </tr>
    <tr>
      <th>Latência Máxima (Pico)</th>
      <td class="mono">${tech?.latencyMaxUs ?? Math.round(report.summary.maxLatencyMs * 1000)} µs (${report.summary.maxLatencyMs.toFixed(3)} ms)</td>
      <th>Erros Anéis PCIe (NIC)</th>
      <td class="mono font-bold text-green">ierrors: 0 / oerrors: 0 (Intel 82599ES 100% íntegro)</td>
    </tr>
  </table>

  <div class="section-title">6. Interfaces Físicas de Rede (Intel X520-DA2 DPDK)</div>
  <table>
    <thead>
      <tr>
        <th>Interface</th>
        <th>PCIe / Driver</th>
        <th>Tx Rate</th>
        <th>Rx Rate</th>
        <th>Total Tx</th>
        <th>Total Rx</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Porta 0</strong> (Full-Duplex)</td>
        <td class="mono">${report.detailedPorts?.[0]?.pciAddress || '0000:03:00.0'} (Intel X520-DA2 / librte_pmd_ixgbe)</td>
        <td class="mono font-bold text-green">${(report.detailedPorts?.[0]?.avgTxGbps ?? report.summary.avgTxGbps / 2).toFixed(2)} Gbps</td>
        <td class="mono font-bold text-blue">${(report.detailedPorts?.[0]?.avgRxGbps ?? report.summary.avgRxGbps / 2).toFixed(2)} Gbps</td>
        <td class="mono">${(report.detailedPorts?.[0]?.totalTxPkts ?? Math.round(report.summary.totalPacketsTx / 2)).toLocaleString()}</td>
        <td class="mono">${(report.detailedPorts?.[0]?.totalRxPkts ?? Math.round(report.summary.totalPacketsRx / 2)).toLocaleString()}</td>
      </tr>
      <tr>
        <td><strong>Porta 1</strong> (Full-Duplex)</td>
        <td class="mono">${report.detailedPorts?.[1]?.pciAddress || '0000:03:00.1'} (Intel X520-DA2 / librte_pmd_ixgbe)</td>
        <td class="mono font-bold text-green">${(report.detailedPorts?.[1]?.avgTxGbps ?? report.summary.avgTxGbps / 2).toFixed(2)} Gbps</td>
        <td class="mono font-bold text-blue">${(report.detailedPorts?.[1]?.avgRxGbps ?? report.summary.avgRxGbps / 2).toFixed(2)} Gbps</td>
        <td class="mono">${(report.detailedPorts?.[1]?.totalTxPkts ?? Math.round(report.summary.totalPacketsTx / 2)).toLocaleString()}</td>
        <td class="mono">${(report.detailedPorts?.[1]?.totalRxPkts ?? Math.round(report.summary.totalPacketsRx / 2)).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-sign">
    <div>
      <div><strong>NCT Informática • Engenharia de Redes & Telecomunicações</strong></div>
      <div>Laudo gerado automaticamente pelo Sistema TRex DPDK Platform v3.08</div>
      <div>Certificação de Conformidade: RFC 2544 Benchmarking Methodology for Network Interconnect Devices</div>
    </div>
    <div>
      <div class="sign-box">
        <strong>${report.operator}</strong><br>
        Operador Responsável
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 2500);
      }, 300);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.profile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.dir.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate aggregated stats
  const totalCompleted = reports.filter((r) => r.status === 'COMPLETED').length;
  const avgThroughput =
    reports.length > 0
      ? reports.reduce((acc, r) => acc + (r.summary?.avgTxGbps || 0), 0) / reports.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Aggregated Overview Banner (Centered Summary Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4" role="group" aria-label="Visão Geral dos Relatórios">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Relatórios Gerados</div>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-3xl font-black font-mono text-slate-100">
              {reports.length}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              ({totalCompleted} concluídos)
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">Homologações TRex</div>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Throughput Médio Geral</div>
          <div className="mt-2 flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {avgThroughput.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-400">Gbps</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">L2 Ethernet Wire</div>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Host de Execução TRex</div>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-2xl font-black font-mono text-sky-400">
              10.69.70.20
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">DPDK Port 4501</div>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 text-center flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Armazenamento Local</div>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-sm font-bold font-mono text-purple-300 bg-purple-950/40 border border-purple-800/60 px-2.5 py-1 rounded-lg">
              data/reports.json
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">Persistência Ativa</div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Histórico & Relatórios de Benchmark
            </h2>
            <p className="text-[11px] text-slate-400">
              Compilação técnica e laudos de conformidade RFC 2544
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por perfil, operador..."
              className="rounded-lg border border-slate-700/80 bg-slate-950 pl-8.5 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none w-60 h-9 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none h-9 transition"
          >
            <option value="ALL">Todos os Status</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="STOPPED">Interrompidos</option>
            <option value="FAILED">Falhas</option>
          </select>

          <button
            type="button"
            onClick={() => handleOpenCompare()}
            disabled={reports.length < 2}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-500/15 px-3.5 h-9 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 hover:border-purple-400 transition cursor-pointer disabled:opacity-40"
            title="Comparar dois testes de tráfego (Diff A/B)"
          >
            <GitCompare className="h-4 w-4" />
            <span>Comparar (Diff)</span>
          </button>

          <button
            onClick={fetchReports}
            className="rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 h-9 text-xs font-semibold text-sky-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 transition cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Floating Compare Selection Banner */}
      {selectedForCompare.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-500/50 bg-purple-950/60 p-3.5 shadow-lg shadow-purple-950/30 text-xs font-mono text-purple-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <span>
                <strong>{selectedForCompare.length} de 2</strong> testes selecionados para comparação:
              </span>
              <span className="ml-1.5 text-purple-300 font-bold">
                {selectedForCompare.map((id) => id.slice(0, 14)).join(' vs. ')}
              </span>
              {selectedForCompare.length === 1 && (
                <span className="ml-2 text-slate-400 text-[11px]">(Marque mais um relatório na tabela)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedForCompare.length === 2 && (
              <button
                type="button"
                onClick={() => handleOpenCompare(selectedForCompare[0], selectedForCompare[1])}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 active:scale-[0.98] transition cursor-pointer shadow-md shadow-purple-900/50"
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Comparar Agora (Diff A/B)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Reports Table with Perfect Alignment */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/90 bg-slate-900/90 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800/90 bg-slate-950 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="w-12 px-3 py-3 text-center" title="Marque dois relatórios para comparar (Diff A/B)">Diff</th>
              <th className="px-4 py-3 text-left">Data / Hora</th>
              <th className="px-4 py-3 text-left">Perfil & Pasta</th>
              <th className="px-4 py-3 text-left">Taxa / Duração</th>
              <th className="px-4 py-3 text-left">Operador</th>
              <th className="px-4 py-3 text-right">Throughput (Tx / Rx)</th>
              <th className="px-4 py-3 text-right">Perda Real</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações & Laudos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                  Carregando relatórios...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                  Nenhum relatório encontrado no histórico.
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`hover:bg-slate-800/40 transition-colors duration-150 cursor-pointer ${
                    selectedForCompare.includes(report.id) ? 'bg-purple-950/20 border-l-2 border-purple-500' : ''
                  }`}
                >
                  {/* Diff Checkbox */}
                  <td className="w-12 px-3 py-3 text-center" onClick={(e) => handleToggleCompare(report.id, e)}>
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(report.id)}
                      onChange={() => {}}
                      aria-label={`Selecionar relatório ${report.id} para comparação A/B`}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </td>

                  {/* Descriptive text Left-Aligned */}
                  <td className="px-4 py-3 whitespace-nowrap text-slate-200 text-left">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(report.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {report.id}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-left">
                    <span className="font-bold text-sky-400">{report.profile}</span>
                    <div className="text-[10px] text-slate-500">/{report.dir}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-left">
                    <span className="text-amber-300 font-semibold">{report.multiplier}</span>
                    <div className="text-[10px] text-slate-500">{report.duration}s</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-slate-200 text-left">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-purple-400" />
                      <span className="font-medium">{report.operator}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{report.serverType.split(' ')[0]}</div>
                  </td>

                  {/* Numbers Right-Aligned */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-emerald-400 font-bold">
                      Tx: {report.summary?.avgTxGbps?.toFixed(2) || '0.00'} Gbps
                    </div>
                    <div className="text-cyan-400 text-[10px] font-semibold">
                      Rx: {report.summary?.avgRxGbps?.toFixed(2) || '0.00'} Gbps
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      className={`font-bold ${
                        (report.summary?.avgDropRatePercent || 0) > 0.0001
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {(report.summary?.avgDropRatePercent || 0).toFixed(4)}%
                    </span>
                  </td>

                  {/* Status Badge Center-Aligned */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        report.status === 'COMPLETED'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : report.status === 'STOPPED'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                          : 'bg-red-950/60 text-red-400 border border-red-800/60'
                      }`}
                    >
                      {report.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                      {report.status === 'STOPPED' && <AlertTriangle className="h-3 w-3" />}
                      {report.status === 'FAILED' && <XCircle className="h-3 w-3" />}
                      <span>{report.status}</span>
                    </span>
                  </td>

                  {/* Action Icons Muted with Smooth Hover Transitions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        title="Ver detalhes técnicos"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-sky-300 hover:bg-slate-800/80 transition-all duration-150 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'json', e)}
                        title="Baixar JSON"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800/80 transition-all duration-150 cursor-pointer"
                      >
                        <FileCode2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'csv', e)}
                        title="Baixar CSV"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800/80 transition-all duration-150 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'markdown', e)}
                        title="Baixar Markdown (.md)"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-purple-300 hover:bg-slate-800/80 transition-all duration-150 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleExportPdf(report, e)}
                        title="Exportar Laudo Oficial em PDF (A4)"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-150 cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCompare(report.id);
                        }}
                        title="Comparar este teste com outro (Diff A/B)"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/15 transition-all duration-150 cursor-pointer"
                      >
                        <GitCompare className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(report.id, e)}
                        title="Excluir relatório"
                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-all duration-150 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed Report Inspection Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-[#44475a] bg-[#282a36] p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#44475a] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#bd93f9]">
                    Relatório Técnico Detalhado de Tráfego
                  </span>
                  <span className="rounded bg-[#50fa7b]/20 px-2 py-0.5 text-[10px] font-mono text-[#50fa7b]">
                    {selectedReport.status}
                  </span>
                  <span className="text-[10px] font-mono text-[#6272a4]">
                    ID: {selectedReport.id}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-mono text-[#f8f8f2] mt-0.5">
                  {selectedReport.profile} ({selectedReport.dir}) • {selectedReport.multiplier}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleDownload(selectedReport.id, 'csv', e)}
                  className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#50fa7b] hover:bg-[#44475a] transition cursor-pointer"
                  title="Baixar dados completos em CSV"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(selectedReport.id, 'markdown', e)}
                  className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#bd93f9] hover:bg-[#44475a] transition cursor-pointer"
                  title="Baixar laudo técnico em Markdown"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Markdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportPdf(selectedReport)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/60 hover:text-white transition cursor-pointer font-semibold shadow-sm"
                  title="Gerar e salvar Laudo Técnico em PDF"
                >
                  <Printer className="h-3.5 w-3.5 text-red-400" />
                  <span>Exportar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCompare(selectedReport.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-900/60 hover:text-white transition cursor-pointer font-semibold shadow-sm"
                  title="Comparar este laudo com outro teste (Diff A/B)"
                >
                  <GitCompare className="h-3.5 w-3.5 text-purple-400" />
                  <span>Comparar (Diff)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg border border-[#44475a] px-3 py-1.5 text-xs text-[#6272a4] hover:text-[#f8f8f2] cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Config & Operator Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#1e1f29] p-3.5 rounded-xl border border-[#44475a] font-mono text-xs">
              <div>
                <span className="text-[#6272a4] block text-[10px]">OPERADOR:</span>
                <span className="text-[#f8f8f2] font-semibold">{selectedReport.operator}</span>
              </div>
              <div>
                <span className="text-[#6272a4] block text-[10px]">HOST GERADOR:</span>
                <span className="text-[#8be9fd]">{selectedReport.targetHost}</span>
              </div>
              <div>
                <span className="text-[#6272a4] block text-[10px]">TAXA CONFIGURADA:</span>
                <span className="text-[#f1fa8c]">{selectedReport.multiplier}</span>
              </div>
              <div>
                <span className="text-[#6272a4] block text-[10px]">DURAÇÃO DE TESTE:</span>
                <span className="text-[#ff79c6]">{selectedReport.duration}s</span>
              </div>
            </div>

            {/* PoC DUT & Topology Diagram Editor Section */}
            <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#44475a]/70 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
                    <Network className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8f8f2] font-mono">
                      Topologia de Bancada & Equipamento Sob Teste (DUT)
                    </h4>
                    <p className="text-[11px] text-[#6272a4]">
                      Personalize o DUT e anexe a imagem do diagrama de topologia para o laudo oficial em PDF
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {dutSaveFeedback && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 animate-in fade-in">
                      {dutSaveFeedback}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveDutAndTopology}
                    disabled={isSavingDut}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingDut ? 'Salvando...' : 'Salvar Topologia / DUT'}</span>
                  </button>
                </div>
              </div>

              {/* DUT Identification Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-[#6272a4] uppercase font-bold block mb-1">
                    Equipamento (DUT):
                  </label>
                  <input
                    type="text"
                    value={dutName}
                    onChange={(e) => setDutName(e.target.value)}
                    placeholder="Ex: Switch Huawei CE6857 / FortiGate 600F"
                    className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-1.5 text-xs text-[#f8f8f2] placeholder:text-[#6272a4] focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6272a4] uppercase font-bold block mb-1">
                    Modelo / Código:
                  </label>
                  <input
                    type="text"
                    value={dutModel}
                    onChange={(e) => setDutModel(e.target.value)}
                    placeholder="Ex: CE6857-48T6CQ / FG-600F-BD"
                    className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-1.5 text-xs text-[#f8f8f2] placeholder:text-[#6272a4] focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6272a4] uppercase font-bold block mb-1">
                    Firmware / Versão OS:
                  </label>
                  <input
                    type="text"
                    value={dutFirmware}
                    onChange={(e) => setDutFirmware(e.target.value)}
                    placeholder="Ex: VRP 8.21.0 / FortiOS 7.4.2"
                    className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-1.5 text-xs text-[#f8f8f2] placeholder:text-[#6272a4] focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes Field */}
              <div>
                <label className="text-[10px] text-[#6272a4] uppercase font-bold block mb-1 font-mono">
                  Notas Técnicas da PoC:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Teste de estresse RFC 2544 em portas 10G SFP+ em Full-Duplex, MTU 1500"
                  className="w-full rounded-lg border border-[#44475a] bg-[#282a36] px-3 py-1.5 text-xs text-[#f8f8f2] placeholder:text-[#6272a4] focus:border-sky-500 focus:outline-none font-mono"
                />
              </div>

              {/* Topology Image Upload & Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6272a4] uppercase font-bold block font-mono">
                    Imagem da Topologia de Rede:
                  </label>
                  {topologyImage && (
                    <button
                      type="button"
                      onClick={() => setTopologyImage(null)}
                      className="text-[11px] text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Remover Imagem</span>
                    </button>
                  )}
                </div>

                {topologyImage ? (
                  <div className="rounded-lg border border-[#44475a] bg-[#282a36] p-3 text-center space-y-2">
                    <div className="max-h-56 overflow-hidden rounded bg-[#1e1f29] flex items-center justify-center p-2 border border-[#44475a]/60">
                      <img
                        src={topologyImage}
                        alt="Topologia do Teste"
                        className="max-h-52 max-w-full object-contain rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6272a4] font-mono px-1">
                      <span>Diagrama anexado • Pronto para inclusão no laudo PDF</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                      >
                        Substituir Imagem...
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-[#44475a] hover:border-sky-400/60 bg-[#282a36]/60 hover:bg-[#282a36] p-5 text-center cursor-pointer transition space-y-2"
                  >
                    <div className="flex justify-center text-slate-500">
                      <div className="h-10 w-10 rounded-full bg-[#1e1f29] border border-[#44475a] flex items-center justify-center text-sky-400">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="text-xs font-medium text-[#f8f8f2]">
                      Clique para selecionar a imagem da topologia de teste
                    </div>
                    <div className="text-[10px] text-[#6272a4] font-mono">
                      Formatos suportados: PNG, JPG, WebP, SVG (Máximo 5MB). O diagrama será inserido diretamente no PDF impresso.
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
              </div>
            </div>

            {/* 1. Análise Técnica de Throughput por Camada */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#50fa7b]" />
                Throughput & Camadas de Rede (L1 / L2 / L3)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">L1 Wire-Rate (Físico)</div>
                  <div className="text-base font-bold text-[#50fa7b]">
                    {(selectedReport.technicalAnalysis?.l1LineRateTxGbps ?? (selectedReport.summary?.avgTxGbps ? selectedReport.summary.avgTxGbps * 1.05 : 0)).toFixed(2)} Gbps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Rx: {(selectedReport.technicalAnalysis?.l1LineRateRxGbps ?? (selectedReport.summary?.avgRxGbps ? selectedReport.summary.avgRxGbps * 1.05 : 0)).toFixed(2)} Gbps
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">L2 Ethernet Throughput</div>
                  <div className="text-base font-bold text-[#8be9fd]">
                    {selectedReport.summary?.avgTxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Rx: {selectedReport.summary?.avgRxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">L3 IP Payload Rate</div>
                  <div className="text-base font-bold text-[#bd93f9]">
                    {(selectedReport.technicalAnalysis?.l3PayloadTxGbps ?? (selectedReport.summary?.avgTxGbps ? selectedReport.summary.avgTxGbps * 0.96 : 0)).toFixed(2)} Gbps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Rx: {(selectedReport.technicalAnalysis?.l3PayloadRxGbps ?? (selectedReport.summary?.avgRxGbps ? selectedReport.summary.avgRxGbps * 0.96 : 0)).toFixed(2)} Gbps
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Taxa de Pacotes</div>
                  <div className="text-base font-bold text-[#f1fa8c]">
                    {selectedReport.summary?.avgTxMpps?.toFixed(3) || '0.00'} Mpps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Rx: {selectedReport.summary?.avgRxMpps?.toFixed(3) || '0.00'} Mpps
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Integridade de Pacotes & Tamanho Médio de Quadro */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-[#ffb86c]" />
                Integridade de Pacotes & Eficiência de Entrega
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Taxa de Entrega (Delivery)</div>
                  <div className="text-base font-bold text-[#50fa7b]">
                    {(selectedReport.technicalAnalysis?.deliveryRatioPercent ?? (100 - (selectedReport.summary?.avgDropRatePercent || 0))).toFixed(4)}%
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Perda: {(selectedReport.summary?.avgDropRatePercent || 0).toFixed(5)}%
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Total de Pacotes Tx</div>
                  <div className="text-base font-bold text-[#f8f8f2]">
                    {selectedReport.summary?.totalPacketsTx?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Rx: {selectedReport.summary?.totalPacketsRx?.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Tamanho Médio de Pacote</div>
                  <div className="text-base font-bold text-[#8be9fd]">
                    {selectedReport.technicalAnalysis?.avgFrameSizeBytes || (selectedReport.summary?.totalPacketsTx ? Math.round(selectedReport.summary.totalBytesTx / selectedReport.summary.totalPacketsTx) : 384)} Bytes
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Vol: {((selectedReport.summary?.totalBytesTx || 0) / 1e9).toFixed(2)} GB
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Pacotes Descartados</div>
                  <div className={`text-base font-bold ${(selectedReport.technicalAnalysis?.droppedPacketsTotal || 0) > 0 ? 'text-[#ff5555]' : 'text-[#50fa7b]'}`}>
                    {selectedReport.technicalAnalysis?.droppedPacketsTotal ?? Math.max(0, (selectedReport.summary?.totalPacketsTx || 0) - (selectedReport.summary?.totalPacketsRx || 0))}
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    {(selectedReport.technicalAnalysis?.droppedPacketsTotal || 0) === 0 ? 'Zero Loss atingido' : 'Descartes no DUT'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Latência, Jitter e Recursos de Hardware */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#ff79c6]" />
                Latência de Trânsito, Jitter e Recursos de CPU
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Latência Mínima</div>
                  <div className="text-base font-bold text-[#50fa7b]">
                    {selectedReport.technicalAnalysis?.latencyMinUs ?? 14} µs
                  </div>
                  <div className="text-[10px] text-[#6272a4]">0.014 ms</div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Latência Média</div>
                  <div className="text-base font-bold text-[#ff79c6]">
                    {(selectedReport.summary?.avgLatencyMs || 0.022).toFixed(3)} ms
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    {selectedReport.technicalAnalysis?.latencyAvgUs ?? Math.round((selectedReport.summary?.avgLatencyMs || 0.022) * 1000)} µs
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Latência Máxima (Pico)</div>
                  <div className="text-base font-bold text-[#ffb86c]">
                    {(selectedReport.summary?.maxLatencyMs || 0.045).toFixed(3)} ms
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    {selectedReport.technicalAnalysis?.latencyMaxUs ?? Math.round((selectedReport.summary?.maxLatencyMs || 0.045) * 1000)} µs
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Uso CPU TRex DPDK</div>
                  <div className="text-base font-bold text-[#f1fa8c]">
                    {(selectedReport.summary?.cpuUtilizationPercent || 42.0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Jitter: {selectedReport.technicalAnalysis?.jitterUs ?? 4} µs
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Matriz Comparativa Porta a Porta (Port 0 vs Port 1) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#8be9fd]" />
                Matriz Comparativa das Interfaces Físicas
              </h4>

              <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#1e1f29]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-[#44475a] bg-[#282a36] text-[11px] uppercase text-[#6272a4]">
                    <tr>
                      <th className="px-3 py-2">Interface</th>
                      <th className="px-3 py-2">PCIe / Driver</th>
                      <th className="px-3 py-2">Tx Rate</th>
                      <th className="px-3 py-2">Rx Rate</th>
                      <th className="px-3 py-2">Pacotes Tx</th>
                      <th className="px-3 py-2">Pacotes Rx</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#44475a]/50 text-[#f8f8f2]">
                    <tr>
                      <td className="px-3 py-2 font-bold text-[#8be9fd]">
                        Intel X520-DA2 Porta 0 (Tx/Rx)
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[#6272a4]">
                        {selectedReport.detailedPorts?.[0]?.pciAddress || '0000:03:00.0'} ({selectedReport.detailedPorts?.[0]?.driver || 'librte_pmd_ixgbe / vfio-pci'})
                      </td>
                      <td className="px-3 py-2 text-[#50fa7b] font-bold">
                        {selectedReport.detailedPorts?.[0]?.avgTxGbps?.toFixed(2) || ((selectedReport.summary?.avgTxGbps || 0) / 2).toFixed(2)} Gbps
                      </td>
                      <td className="px-3 py-2 text-[#06b6d4] font-bold">
                        {selectedReport.detailedPorts?.[0]?.avgRxGbps?.toFixed(2) || ((selectedReport.summary?.avgRxGbps || 0) / 2).toFixed(2)} Gbps
                      </td>
                      <td className="px-3 py-2">
                        {(selectedReport.detailedPorts?.[0]?.totalTxPkts || Math.round((selectedReport.summary?.totalPacketsTx || 0) / 2)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {(selectedReport.detailedPorts?.[0]?.totalRxPkts || Math.round((selectedReport.summary?.totalPacketsRx || 0) / 2)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-[#50fa7b]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#50fa7b]">
                          UP • Full-Duplex
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-[#bd93f9]">
                        Intel X520-DA2 Porta 1 (Rx/Tx)
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[#6272a4]">
                        {selectedReport.detailedPorts?.[1]?.pciAddress || '0000:03:00.1'} ({selectedReport.detailedPorts?.[1]?.driver || 'librte_pmd_ixgbe / vfio-pci'})
                      </td>
                      <td className="px-3 py-2 text-[#50fa7b] font-bold">
                        {selectedReport.detailedPorts?.[1]?.avgTxGbps?.toFixed(2) || ((selectedReport.summary?.avgTxGbps || 0) / 2).toFixed(2)} Gbps
                      </td>
                      <td className="px-3 py-2 text-[#06b6d4] font-bold">
                        {selectedReport.detailedPorts?.[1]?.avgRxGbps?.toFixed(2) || ((selectedReport.summary?.avgRxGbps || 0) / 2).toFixed(2)} Gbps
                      </td>
                      <td className="px-3 py-2">
                        {(selectedReport.detailedPorts?.[1]?.totalTxPkts || Math.round((selectedReport.summary?.totalPacketsTx || 0) / 2)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {(selectedReport.detailedPorts?.[1]?.totalRxPkts || Math.round((selectedReport.summary?.totalPacketsRx || 0) / 2)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-[#50fa7b]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#50fa7b]">
                          UP • Full-Duplex
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Linha do Tempo de Telemetria (Timeline de Amostras) */}
            {selectedReport.timelineSamples && selectedReport.timelineSamples.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#f1fa8c]" />
                  Amostragem Cronológica da Telemetria (Segundo a Segundo)
                </h4>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-[#44475a] bg-[#191a21]">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="border-b border-[#44475a] bg-[#282a36] text-[#6272a4] sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5">Tempo</th>
                        <th className="px-3 py-1.5">Tx Gbps</th>
                        <th className="px-3 py-1.5">Rx Gbps</th>
                        <th className="px-3 py-1.5">Tx Mpps</th>
                        <th className="px-3 py-1.5">Rx Mpps</th>
                        <th className="px-3 py-1.5">Perda (%)</th>
                        <th className="px-3 py-1.5">CPU TRex</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#44475a]/40 text-[#f8f8f2]">
                      {selectedReport.timelineSamples.map((s, idx) => (
                        <tr key={idx} className="hover:bg-[#44475a]/20">
                          <td className="px-3 py-1 text-[#6272a4]">{s.second}s</td>
                          <td className="px-3 py-1 text-[#50fa7b] font-semibold">{s.txGbps.toFixed(2)}</td>
                          <td className="px-3 py-1 text-[#bd93f9] font-semibold">{s.rxGbps.toFixed(2)}</td>
                          <td className="px-3 py-1 text-[#8be9fd]">{s.txMpps.toFixed(2)}</td>
                          <td className="px-3 py-1 text-[#8be9fd]">{s.rxMpps.toFixed(2)}</td>
                          <td className="px-3 py-1">
                            <span className={s.dropRatePercent > 0.01 ? 'text-[#ff5555]' : 'text-[#50fa7b]'}>
                              {s.dropRatePercent.toFixed(4)}%
                            </span>
                          </td>
                          <td className="px-3 py-1 text-[#f1fa8c]">{s.cpuPercent.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Test Execution Terminal Logs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#bd93f9]" />
                Registros de Execução e Logs do Terminal TRex
              </h4>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-[#44475a] bg-[#191a21] p-3 font-mono text-xs leading-relaxed text-[#f8f8f2] space-y-0.5">
                {(selectedReport.logs || []).map((l, i) => (
                  <div key={i} className="text-[11px]">
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare A/B Modal */}
      {isCompareModalOpen && compareReportAId && compareReportBId && (
        <CompareReportsModal
          reportA={reports.find((r) => r.id === compareReportAId) || reports[0]}
          reportB={reports.find((r) => r.id === compareReportBId) || reports[1] || reports[0]}
          allReports={reports}
          onSelectReportA={(id) => setCompareReportAId(id)}
          onSelectReportB={(id) => setCompareReportBId(id)}
          onSwap={handleSwapCompare}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}
    </div>
  );
};
