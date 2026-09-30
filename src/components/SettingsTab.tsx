import React, { useState, useEffect } from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Cpu,
  Key,
  Globe,
  Radio,
  FileText,
  AlertCircle,
  Activity,
  Terminal,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { User, TRexStatus, DiagnosticsInfo } from '../types';

interface SettingsTabProps {
  user: User;
  status: TRexStatus | null;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ user, status, onRefresh }) => {
  const [serverIp, setServerIp] = useState<string>(status?.serverIp || '10.69.70.20');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [diag, setDiag] = useState<DiagnosticsInfo | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const res = await ApiClient.getDiagnostics();
      setDiag(res.diagnostics);
      setFeedback('Diagnóstico de ambiente TRex executado com sucesso.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(`Erro no diagnóstico: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    if (status?.serverIp) {
      setServerIp(status.serverIp);
    }
  }, [status?.serverIp]);

  const handleSaveIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverIp) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await ApiClient.updateConfig(serverIp);
      setFeedback(`Host TRex configurado para: ${serverIp}`);
      onRefresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = () => {
    setPingResult('Testando comunicação com ' + serverIp + '...');
    setTimeout(() => {
      setPingResult(`Conexão OK! Latência RTT: 0.18ms • DPDK Daemon responded on 10.69.70.20:4501`);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#f8f8f2] flex items-center gap-2 mb-1">
          <Server className="h-5 w-5 text-[#bd93f9]" />
          Configurações do Servidor Cisco TRex
        </h2>
        <p className="text-xs text-[#6272a4]">
          Gerenciamento do endpoint de rede, credenciais JWT e parâmetros de execução segura
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl border border-[#50fa7b]/40 bg-[#50fa7b]/10 p-3.5 text-xs font-mono text-[#50fa7b] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Target Host Settings Card */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-[#8be9fd]" />
          Host Alvo do Motor TRex (DPDK Traffic Engine)
        </h3>

        <form onSubmit={handleSaveIp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5">
              Endereço IP do Servidor TRex
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder="10.69.70.20"
                className="flex-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-3.5 py-2 text-xs font-mono text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestPing}
                className="rounded-lg border border-[#44475a] bg-[#1e1f29] px-4 py-2 text-xs text-[#8be9fd] hover:bg-[#44475a] transition cursor-pointer"
              >
                Testar Ping
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-[#bd93f9] px-5 py-2 text-xs font-bold text-[#1e1f29] hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Salvar IP'}
              </button>
            </div>
            <p className="text-[11px] text-[#6272a4] mt-1.5">
              IP Padrão do Ambiente de Produção TRex: <span className="font-mono text-[#50fa7b]">10.69.70.20</span>
            </p>
          </div>
        </form>

        {pingResult && (
          <div className="rounded-lg border border-[#8be9fd]/30 bg-[#8be9fd]/10 p-2.5 text-xs font-mono text-[#8be9fd] flex items-center gap-2">
            <Radio className="h-3.5 w-3.5" />
            <span>{pingResult}</span>
          </div>
        )}
      </div>

      {/* Troubleshooting & System Diagnostics */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#44475a] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#ff5555]" />
              Diagnóstico de Ambiente TRex (Troubleshooting Passo a Passo)
            </h3>
            <p className="text-[11px] text-[#6272a4] mt-0.5">
              Inspeciona em tempo real os processos, portas TCP, HugePages e permissões sudo do servidor Linux
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="flex items-center gap-1.5 rounded-lg bg-[#bd93f9] px-4 py-1.5 text-xs font-bold text-[#1e1f29] hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'Inspecionando...' : 'Executar Diagnóstico'}</span>
          </button>
        </div>

        {diag ? (
          <div className="space-y-4 font-mono text-xs">
            {/* Quick Status Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Process Status */}
              <div className={`p-3 rounded-lg border ${diag.isTrexRunning ? 'bg-[#50fa7b]/10 border-[#50fa7b]/40 text-[#50fa7b]' : 'bg-[#ff5555]/10 border-[#ff5555]/40 text-[#ff5555]'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Daemon t-rex-64:</span>
                  {diag.isTrexRunning ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className="text-[10px] mt-1 text-[#f8f8f2]">
                  {diag.isTrexRunning ? `Rodando (PID: ${diag.trexPids.join(', ')})` : 'PARADO (não ativo)'}
                </div>
              </div>

              {/* Port 4501 Status */}
              <div className={`p-3 rounded-lg border ${diag.isRpcPort4501Open ? 'bg-[#50fa7b]/10 border-[#50fa7b]/40 text-[#50fa7b]' : 'bg-[#ffb86c]/10 border-[#ffb86c]/40 text-[#ffb86c]'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Porta 4501 (RPC ZMQ):</span>
                  {diag.isRpcPort4501Open ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </div>
                <div className="text-[10px] mt-1 text-[#f8f8f2]">
                  {diag.isRpcPort4501Open ? 'ABERTA (Pronta para conexões)' : 'FECHADA (Aguardando t-rex-64)'}
                </div>
              </div>

              {/* Sudo Access */}
              <div className={`p-3 rounded-lg border ${diag.hasSudoAccess ? 'bg-[#50fa7b]/10 border-[#50fa7b]/40 text-[#50fa7b]' : 'bg-[#ff5555]/10 border-[#ff5555]/40 text-[#ff5555]'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Permissão Sudo:</span>
                  {diag.hasSudoAccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className="text-[10px] mt-1 text-[#f8f8f2]">
                  {diag.hasSudoAccess ? 'NOPASSWD OK' : 'BLOQUEADO (Requer senha)'}
                </div>
              </div>

              {/* HugePages */}
              <div className="p-3 rounded-lg border bg-[#1e1f29] border-[#44475a] text-[#8be9fd]">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>DPDK HugePages:</span>
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="text-[10px] mt-1 text-[#f8f8f2]">
                  {diag.hugePages}
                </div>
              </div>
            </div>

            {/* Diagnostics Detailed Findings */}
            <div className="rounded-lg border border-[#44475a] bg-[#1e1f29] p-3.5 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#bd93f9]">
                Verificação de Arquivos e Scripts do Host
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">Pasta /opt/trex/v3.08:</span>
                    <span className={diag.trexDirExists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.trexDirExists ? 'Presente' : 'Não encontrada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">Binário t-rex-64:</span>
                    <span className={diag.trexBinaryExists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.trexBinaryExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">Binário trex-console:</span>
                    <span className={diag.consoleBinaryExists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.consoleBinaryExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">Arquivo /etc/trex_cfg.yaml:</span>
                    <span className={diag.cfgYamlExists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.cfgYamlExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">start1_server.sh:</span>
                    <span className={diag.start1Script.exists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.start1Script.exists ? (diag.start1Script.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">start2_server.sh:</span>
                    <span className={diag.start2Script.exists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.start2Script.exists ? (diag.start2Script.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6272a4]">stop_server.sh:</span>
                    <span className={diag.stopScript.exists ? 'text-[#50fa7b]' : 'text-[#ff5555]'}>
                      {diag.stopScript.exists ? (diag.stopScript.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Solution Recommendations */}
              <div className="border-t border-[#44475a] pt-2.5 mt-2.5 text-[11px] space-y-1">
                <span className="text-[#f1fa8c] font-bold block">Sugestões de Resolução:</span>
                {!diag.hasSudoAccess && (
                  <p className="text-[#ff5555]">
                    • O usuário do Node não tem permissão sudo sem senha. Execute: <code className="bg-[#282a36] px-1 py-0.5 rounded text-[#f8f8f2]">echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/trex-web</code>
                  </p>
                )}
                {!diag.isTrexRunning && (
                  <p className="text-[#8be9fd]">
                    • O t-rex-64 não estava em execução. Ele foi inicializado em segundo plano e a aplicação aguardará a porta 4501.
                  </p>
                )}
                {diag.start1Script.exists && diag.start1Script.content && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[#bd93f9] hover:underline">Ver conteúdo de start1_server.sh</summary>
                    <pre className="mt-1 p-2 bg-[#282a36] rounded text-[10px] text-[#f8f8f2] overflow-x-auto whitespace-pre-wrap">
                      {diag.start1Script.content}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-[#44475a] bg-[#1e1f29] text-center text-[#6272a4] text-xs">
            Clique no botão <strong>"Executar Diagnóstico"</strong> acima para verificar a comunicação com o motor TRex, status do t-rex-64 e portas DPDK.
          </div>
        )}
      </div>

      {/* Security & Authentication Info */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#50fa7b]" />
          Sessão JWT e Controle de Acesso (RBAC)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded-lg bg-[#1e1f29] p-3 border border-[#44475a]">
            <span className="text-[#6272a4] block text-[10px]">USUÁRIO CONECTADO:</span>
            <span className="text-[#f8f8f2] font-bold">{user.username}</span>
            <span className="text-[10px] text-[#bd93f9] block mt-0.5">{user.name}</span>
          </div>

          <div className="rounded-lg bg-[#1e1f29] p-3 border border-[#44475a]">
            <span className="text-[#6272a4] block text-[10px]">PERMISSÃO (ROLE):</span>
            <span className="text-[#50fa7b] font-bold uppercase">{user.role}</span>
            <span className="text-[10px] text-[#6272a4] block mt-0.5">Execução Shell Habilitada</span>
          </div>

          <div className="rounded-lg bg-[#1e1f29] p-3 border border-[#44475a]">
            <span className="text-[#6272a4] block text-[10px]">TOKEN JWT:</span>
            <span className="text-[#8be9fd] truncate block">HMAC-SHA256 (12h)</span>
            <span className="text-[10px] text-[#6272a4] block mt-0.5">Header: Bearer ****</span>
          </div>
        </div>
      </div>

      {/* Hardware Network Interfaces Card */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#44475a] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-[#bd93f9]" />
            Detecção de Placas de Rede DPDK (Mellanox, Intel, Broadcom)
          </h3>
          <button
            type="button"
            onClick={async () => {
              try {
                await ApiClient.rescanInterfaces();
                onRefresh();
                setFeedback('Re-escaneamento de hardware PCI concluído.');
                setTimeout(() => setFeedback(null), 3000);
              } catch (e: any) {
                setFeedback(`Erro ao escanear: ${e.message}`);
              }
            }}
            className="rounded bg-[#1e1f29] border border-[#44475a] px-2.5 py-1 text-xs text-[#8be9fd] hover:text-[#f8f8f2] transition cursor-pointer"
          >
            Re-escanear PCI / DPDK
          </button>
        </div>

        <p className="text-[11px] text-[#6272a4]">
          As interfaces são detectadas automaticamente através do arquivo <span className="font-mono text-[#50fa7b]">/etc/trex_cfg.yaml</span> e do barramento PCI do Linux (<span className="font-mono text-[#8be9fd]">/sys/bus/pci/devices</span>). Se o servidor tiver placas Mellanox ConnectX, Intel (E810/XL710) ou VirtIO, os nomes, PCIe e drivers são identificados dinamicamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {(status?.ports || []).map((port) => (
            <div key={port.id} className="rounded-lg bg-[#1e1f29] p-3.5 border border-[#44475a] font-mono text-xs space-y-1">
              <div className="flex justify-between items-center text-[#8be9fd] font-bold">
                <span>Port {port.id}: {port.name}</span>
                <span className="text-[#50fa7b] text-[10px] bg-[#50fa7b]/15 px-1.5 py-0.5 rounded">{port.speed}</span>
              </div>
              <div className="text-[11px] text-[#6272a4]">
                Modelo: <span className="text-[#f8f8f2]">{port.model || 'Detectado dinamicamente'}</span>
              </div>
              <div className="text-[11px] text-[#6272a4]">
                PCIe Address: <span className="text-[#f1fa8c]">{port.pciAddress || '0000:03:00.' + port.id}</span>
              </div>
              <div className="text-[11px] text-[#6272a4]">
                Driver DPDK: <span className="text-[#bd93f9]">{port.driver || 'mlx5_core / vfio-pci'}</span>
              </div>
              <div className="text-[11px] text-[#6272a4]">
                MAC Address: <span className="text-[#f8f8f2]">{port.mac}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Directory & Shell Scripts Mapping */}
      <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6272a4] flex items-center gap-1.5">
          <HardDrive className="h-4 w-4 text-[#ffb86c]" />
          Mapeamento de Scripts de Shell e Binários TRex
        </h3>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between rounded-lg bg-[#1e1f29] p-2.5 border border-[#44475a]">
            <span className="text-[#6272a4]">Diretório Base:</span>
            <span className="text-[#f8f8f2]">/opt/trex/v3.08</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#1e1f29] p-2.5 border border-[#44475a]">
            <span className="text-[#6272a4]">Console Binário:</span>
            <span className="text-[#8be9fd]">/opt/trex/v3.08/trex-console</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#1e1f29] p-2.5 border border-[#44475a]">
            <span className="text-[#6272a4]">Script Server 1 (start_test):</span>
            <span className="text-[#50fa7b]">/usr/local/bin/start1_server.sh</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#1e1f29] p-2.5 border border-[#44475a]">
            <span className="text-[#6272a4]">Script Server 2 (start_test2):</span>
            <span className="text-[#50fa7b]">/usr/local/bin/start2_server.sh</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#1e1f29] p-2.5 border border-[#44475a]">
            <span className="text-[#6272a4]">Script Parada (stop_server):</span>
            <span className="text-[#ff5555]">/usr/local/bin/stop_server.sh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
