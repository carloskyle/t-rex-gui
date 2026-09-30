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
          <div className="w-full max-w-3xl rounded-2xl border border-[#44475a] bg-[#282a36] p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#44475a] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#bd93f9]">
                    Relatório Detalhado de Teste
                  </span>
                  <span className="rounded bg-[#50fa7b]/20 px-2 py-0.5 text-[10px] font-mono text-[#50fa7b]">
                    {selectedReport.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-mono text-[#f8f8f2] mt-0.5">
                  {selectedReport.profile} ({selectedReport.dir})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleDownload(selectedReport.id, 'csv', e)}
                  className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#50fa7b] hover:bg-[#44475a] transition cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(selectedReport.id, 'markdown', e)}
                  className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#bd93f9] hover:bg-[#44475a] transition cursor-pointer"
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
                <span className="text-[#6272a4] block text-[10px]">HOST ALVO:</span>
                <span className="text-[#8be9fd]">{selectedReport.targetHost}</span>
              </div>
              <div>
                <span className="text-[#6272a4] block text-[10px]">TAXA (-m):</span>
                <span className="text-[#f1fa8c]">{selectedReport.multiplier}</span>
              </div>
              <div>
                <span className="text-[#6272a4] block text-[10px]">DURAÇÃO (-d):</span>
                <span className="text-[#ff79c6]">{selectedReport.duration}s</span>
              </div>
            </div>

            {/* Performance Summary Metrics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#50fa7b]" />
                Métricas de Performance Atingidas
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Throughput Médio Tx</div>
                  <div className="text-lg font-bold text-[#50fa7b]">
                    {selectedReport.summary?.avgTxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Pico: {selectedReport.summary?.peakTxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Throughput Médio Rx</div>
                  <div className="text-lg font-bold text-[#bd93f9]">
                    {selectedReport.summary?.avgRxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Pico: {selectedReport.summary?.peakRxGbps?.toFixed(2) || '0.00'} Gbps
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Taxa de Pacotes</div>
                  <div className="text-lg font-bold text-[#8be9fd]">
                    {selectedReport.summary?.avgTxMpps?.toFixed(2) || '0.00'} Mpps
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Total: {selectedReport.summary?.totalPacketsTx?.toLocaleString()} pkts
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Perda de Pacotes</div>
                  <div
                    className={`text-lg font-bold ${
                      (selectedReport.summary?.avgDropRatePercent || 0) > 0.01
                        ? 'text-[#ff5555]'
                        : 'text-[#50fa7b]'
                    }`}
                  >
                    {(selectedReport.summary?.avgDropRatePercent || 0).toFixed(5)}%
                  </div>
                  <div className="text-[10px] text-[#6272a4]">Drop rate medido</div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Latência Média</div>
                  <div className="text-lg font-bold text-[#ff79c6]">
                    {(selectedReport.summary?.avgLatencyMs || 0.018).toFixed(3)} ms
                  </div>
                  <div className="text-[10px] text-[#6272a4]">
                    Max: {(selectedReport.summary?.maxLatencyMs || 0.042).toFixed(3)} ms
                  </div>
                </div>

                <div className="rounded-xl border border-[#44475a] bg-[#1e1f29] p-3 font-mono">
                  <div className="text-[11px] text-[#6272a4]">Uso de CPU DPDK</div>
                  <div className="text-lg font-bold text-[#f1fa8c]">
                    {(selectedReport.summary?.cpuUtilizationPercent || 45.0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-[#6272a4]">DPDK Cores</div>
                </div>
              </div>
            </div>

            {/* Test Execution Terminal Logs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#bd93f9]" />
                Registros de Execução Capturados
              </h4>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-[#44475a] bg-[#191a21] p-3.5 font-mono text-xs leading-relaxed text-[#f8f8f2] space-y-1">
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
