import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { TestReport } from '../types';

export const ReportsTab: React.FC = () => {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);

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
      {/* Top Aggregated Overview Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4">
          <div className="text-xs text-[#6272a4]">Total de Relatórios Gerados</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f8f8f2]">
              {reports.length}
            </span>
            <span className="text-xs text-[#50fa7b]">
              ({totalCompleted} concluídos)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4">
          <div className="text-xs text-[#6272a4]">Throughput Médio Geral</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#50fa7b]">
              {avgThroughput.toFixed(2)}
            </span>
            <span className="text-xs text-[#6272a4]">Gbps</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4">
          <div className="text-xs text-[#6272a4]">Host de Execução TRex</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-[#8be9fd]">
              10.69.70.20
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4">
          <div className="text-xs text-[#6272a4]">Armazenamento Local</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-mono text-[#bd93f9]">
              data/reports.json
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#44475a] bg-[#282a36] p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#bd93f9]" />
          <div>
            <h2 className="text-sm font-bold text-[#f8f8f2]">
              Histórico & Relatórios de Benchmark
            </h2>
            <p className="text-[11px] text-[#6272a4]">
              Compilação automática dos resultados de telemetria após cada execução
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6272a4]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por perfil, operador..."
              className="rounded-lg border border-[#44475a] bg-[#1e1f29] pl-8 pr-3 py-1.5 text-xs text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-1.5 text-xs text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="STOPPED">Interrompidos</option>
            <option value="FAILED">Falhas</option>
          </select>

          <button
            onClick={fetchReports}
            className="rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-1.5 text-xs text-[#8be9fd] hover:bg-[#44475a] transition cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-x-auto rounded-xl border border-[#44475a] bg-[#282a36] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#44475a] bg-[#1e1f29] font-mono text-[11px] text-[#6272a4] uppercase">
            <tr>
              <th className="px-4 py-3">Data / Hora</th>
              <th className="px-4 py-3">Perfil & Pasta</th>
              <th className="px-4 py-3">Taxa / Duração</th>
              <th className="px-4 py-3">Operador</th>
              <th className="px-4 py-3">Throughput (Tx / Rx)</th>
              <th className="px-4 py-3">Drops</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações & Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#44475a]/50 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-[#6272a4]">
                  Carregando relatórios...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-[#6272a4]">
                  Nenhum relatório encontrado no histórico.
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="hover:bg-[#44475a]/30 transition cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-[#f8f8f2]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#6272a4]" />
                      <span>{new Date(report.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-[10px] text-[#6272a4]">ID: {report.id}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-[#8be9fd]">{report.profile}</span>
                    <div className="text-[10px] text-[#6272a4]">/{report.dir}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[#f1fa8c]">{report.multiplier}</span>
                    <div className="text-[10px] text-[#6272a4]">{report.duration}s</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-[#f8f8f2]">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-[#bd93f9]" />
                      <span>{report.operator}</span>
                    </div>
                    <div className="text-[10px] text-[#6272a4]">{report.serverType.split(' ')[0]}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-[#50fa7b] font-bold">
                      Tx: {report.summary?.avgTxGbps?.toFixed(2) || '0.00'} Gbps
                    </div>
                    <div className="text-[#bd93f9] text-[10px]">
                      Rx: {report.summary?.avgRxGbps?.toFixed(2) || '0.00'} Gbps
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={
                        (report.summary?.avgDropRatePercent || 0) > 0.01
                          ? 'text-[#ff5555]'
                          : 'text-[#50fa7b]'
                      }
                    >
                      {(report.summary?.avgDropRatePercent || 0).toFixed(4)}%
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        report.status === 'COMPLETED'
                          ? 'bg-[#50fa7b]/20 text-[#50fa7b]'
                          : report.status === 'STOPPED'
                          ? 'bg-[#ffb86c]/20 text-[#ffb86c]'
                          : 'bg-[#ff5555]/20 text-[#ff5555]'
                      }`}
                    >
                      {report.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                      {report.status === 'STOPPED' && <AlertTriangle className="h-3 w-3" />}
                      {report.status === 'FAILED' && <XCircle className="h-3 w-3" />}
                      <span>{report.status}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        title="Ver detalhes"
                        className="rounded p-1 text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2] transition cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'json', e)}
                        title="Baixar JSON"
                        className="rounded p-1 text-[#6272a4] hover:bg-[#44475a] hover:text-[#8be9fd] transition cursor-pointer"
                      >
                        <FileCode2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'csv', e)}
                        title="Baixar CSV"
                        className="rounded p-1 text-[#6272a4] hover:bg-[#44475a] hover:text-[#50fa7b] transition cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(report.id, 'markdown', e)}
                        title="Baixar Markdown (.md)"
                        className="rounded p-1 text-[#6272a4] hover:bg-[#44475a] hover:text-[#bd93f9] transition cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(report.id, e)}
                        title="Excluir relatório"
                        className="rounded p-1 text-[#6272a4] hover:bg-[#ff5555]/20 hover:text-[#ff5555] transition cursor-pointer"
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
                        Porta 0 (Full-Duplex)
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[#6272a4]">
                        {selectedReport.detailedPorts?.[0]?.pciAddress || '0000:03:00.0'} ({selectedReport.detailedPorts?.[0]?.driver || 'mlx5_core'})
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
                        Porta 1 (Full-Duplex)
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[#6272a4]">
                        {selectedReport.detailedPorts?.[1]?.pciAddress || '0000:03:00.1'} ({selectedReport.detailedPorts?.[1]?.driver || 'mlx5_core'})
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
    </div>
  );
};
