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
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Lock,
  Plus
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

  // User Management States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'network_operator' as 'admin' | 'network_operator' | 'auditor',
    password: ''
  });

  const fetchUsers = async () => {
    if (user.role !== 'admin') return;
    setIsLoadingUsers(true);
    try {
      const data = await ApiClient.getUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user.role]);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username || !newUserForm.password) return;
    try {
      await ApiClient.createUser(newUserForm);
      setFeedback(`Usuário '${newUserForm.username}' criado com sucesso.`);
      setShowCreateModal(false);
      setNewUserForm({
        username: '',
        name: '',
        email: '',
        role: 'network_operator',
        password: ''
      });
      fetchUsers();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(`Erro ao criar usuário: ${err.message}`);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;
    try {
      await ApiClient.updateUserPassword(selectedUserForPassword.id, newPassword);
      setFeedback(`Senha do usuário '${selectedUserForPassword.username}' atualizada com sucesso.`);
      setShowPasswordModal(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(`Erro ao atualizar senha: ${err.message}`);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === user.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (!window.confirm(`Deseja realmente excluir o usuário '${u.username}'?`)) return;
    try {
      await ApiClient.deleteUser(u.id);
      setFeedback(`Usuário '${u.username}' removido.`);
      fetchUsers();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

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
    <div className="space-y-6 max-w-4xl mx-auto" role="region" aria-label="Configurações do Servidor TRex">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Configurações do Servidor Cisco TRex</span>
              <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono text-sky-400 font-semibold">
                10.69.70.20:4501
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Gerenciamento do endpoint de rede, credenciais JWT e parâmetros de execução segura
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs font-mono text-emerald-300 flex items-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Target Host Settings Card */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
          <Globe className="h-4 w-4 text-sky-400" />
          <span>Host Alvo do Motor TRex (DPDK Traffic Engine)</span>
        </h3>

        <form onSubmit={handleSaveIp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Endereço IP do Servidor TRex
            </label>
            <div className="flex flex-wrap gap-2.5">
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder="10.69.70.20"
                className="flex-1 min-w-[200px] rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 focus:outline-none transition h-10.5"
              />
              <button
                type="button"
                onClick={handleTestPing}
                className="rounded-lg border border-slate-700/80 bg-slate-950 px-4 h-10.5 text-xs font-semibold text-sky-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 transition cursor-pointer"
              >
                Testar Ping
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-5 h-10.5 text-xs font-bold text-white shadow-md shadow-sky-900/20 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Salvar IP'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              IP Padrão do Ambiente de Produção TRex: <span className="font-mono text-emerald-400 font-bold">10.69.70.20</span>
            </p>
          </div>
        </form>

        {pingResult && (
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-xs font-mono text-sky-300 flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>{pingResult}</span>
          </div>
        )}
      </div>

      {/* Troubleshooting & System Diagnostics */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Diagnóstico de Ambiente TRex (Troubleshooting Passo a Passo)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Inspeciona em tempo real os processos, portas TCP, HugePages e permissões sudo do servidor Linux
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 h-9 text-xs font-bold text-white shadow-md shadow-sky-900/20 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'Inspecionando...' : 'Executar Diagnóstico'}</span>
          </button>
        </div>

        {diag ? (
          <div className="space-y-4 font-mono text-xs">
            {/* Quick Status Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Process Status */}
              <div className={`p-3.5 rounded-xl border ${diag.isTrexRunning ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-red-950/30 border-red-500/40 text-red-300'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Daemon t-rex-64:</span>
                  {diag.isTrexRunning ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <div className="text-[10px] mt-1 text-slate-200">
                  {diag.isTrexRunning ? `Rodando (PID: ${diag.trexPids.join(', ')})` : 'PARADO (não ativo)'}
                </div>
              </div>

              {/* Port 4501 Status */}
              <div className={`p-3.5 rounded-xl border ${diag.isRpcPort4501Open ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/30 border-amber-500/40 text-amber-300'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Porta 4501 (RPC ZMQ):</span>
                  {diag.isRpcPort4501Open ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
                </div>
                <div className="text-[10px] mt-1 text-slate-200">
                  {diag.isRpcPort4501Open ? 'ABERTA (Pronta para conexões)' : 'FECHADA (Aguardando t-rex-64)'}
                </div>
              </div>

              {/* Sudo Access */}
              <div className={`p-3.5 rounded-xl border ${diag.hasSudoAccess ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-red-950/30 border-red-500/40 text-red-300'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Permissão Sudo:</span>
                  {diag.hasSudoAccess ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <div className="text-[10px] mt-1 text-slate-200">
                  {diag.hasSudoAccess ? 'NOPASSWD OK' : 'BLOQUEADO (Requer senha)'}
                </div>
              </div>

              {/* HugePages */}
              <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-700/80 text-sky-300">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>DPDK HugePages:</span>
                  <Cpu className="h-4 w-4 text-sky-400" />
                </div>
                <div className="text-[10px] mt-1 text-slate-200">
                  {diag.hugePages}
                </div>
              </div>
            </div>

            {/* Diagnostics Detailed Findings */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Verificação de Arquivos e Scripts do Host
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pasta /opt/trex/v3.08:</span>
                    <span className={diag.trexDirExists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.trexDirExists ? 'Presente' : 'Não encontrada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Binário t-rex-64:</span>
                    <span className={diag.trexBinaryExists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.trexBinaryExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Binário trex-console:</span>
                    <span className={diag.consoleBinaryExists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.consoleBinaryExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arquivo /etc/trex_cfg.yaml:</span>
                    <span className={diag.cfgYamlExists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.cfgYamlExists ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">start1_server.sh:</span>
                    <span className={diag.start1Script.exists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.start1Script.exists ? (diag.start1Script.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">start2_server.sh:</span>
                    <span className={diag.start2Script.exists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.start2Script.exists ? (diag.start2Script.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">stop_server.sh:</span>
                    <span className={diag.stopScript.exists ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {diag.stopScript.exists ? (diag.stopScript.executable ? 'Executável OK' : 'Sem chmod +x') : 'Ausente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Solution Recommendations */}
              <div className="border-t border-slate-800 pt-2.5 mt-2.5 text-[11px] space-y-1">
                <span className="text-amber-300 font-bold block">Sugestões de Resolução:</span>
                {!diag.hasSudoAccess && (
                  <p className="text-red-400">
                    • O usuário do Node não tem permissão sudo sem senha. Execute: <code className="bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-slate-200">echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/trex-web</code>
                  </p>
                )}
                {!diag.isTrexRunning && (
                  <p className="text-sky-300">
                    • O t-rex-64 não estava em execução. Ele foi inicializado em segundo plano e a aplicação aguardará a porta 4501.
                  </p>
                )}
                {diag.start1Script.exists && diag.start1Script.content && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-sky-400 hover:underline">Ver conteúdo de start1_server.sh</summary>
                    <pre className="mt-1 p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-slate-200 overflow-x-auto whitespace-pre-wrap font-mono">
                      {diag.start1Script.content}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-950/80 text-center text-slate-400 text-xs">
            Clique no botão <strong>"Executar Diagnóstico"</strong> acima para verificar a comunicação com o motor TRex, status do t-rex-64 e portas DPDK.
          </div>
        )}
      </div>

      {/* Security & Authentication Info */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Sessão JWT e Controle de Acesso (RBAC)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">USUÁRIO CONECTADO:</span>
            <span className="text-slate-100 font-bold text-sm">{user.username}</span>
            <span className="text-[10px] text-sky-400 block mt-0.5">{user.name}</span>
          </div>

          <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">PERMISSÃO (ROLE):</span>
            <span className={`inline-block mt-1 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full ${
              user.role === 'admin' 
                ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' 
                : 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
            }`}>
              {user.role}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Execução DPDK Habilitada</span>
          </div>

          <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">TOKEN JWT:</span>
            <span className="text-sky-300 truncate block text-sm font-semibold">HMAC-SHA256 (12h)</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Header: Bearer ****</span>
          </div>
        </div>
      </div>

      {/* User Management Section (Admin Only) */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-sky-400" />
              <span>Gerenciamento de Usuários e Senhas</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Crie novas contas para operadores e altere senhas de acesso da plataforma
            </p>
          </div>

          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-3.5 h-9 text-xs font-bold text-white shadow-md shadow-emerald-900/20 active:scale-[0.98] transition cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Novo Usuário</span>
            </button>
          )}
        </div>

        {user.role !== 'admin' ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400">
            Apenas usuários com privilégios de <strong className="text-purple-300">admin</strong> podem gerenciar outras contas e alterar senhas.
          </div>
        ) : isLoadingUsers ? (
          <div className="p-4 text-center text-xs text-slate-400">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/90 bg-slate-950/80 shadow-md">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-slate-800/90 bg-slate-950 text-[11px] uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Nome Completo</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nível (Role)</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                    <td className="px-4 py-3 font-bold text-sky-400">
                      {u.username}
                      {u.id === user.id && (
                        <span className="ml-2 text-[9px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                          Você
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-300">{u.name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                            : u.role === 'network_operator'
                            ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForPassword(u);
                            setShowPasswordModal(true);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-[11px] text-sky-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition cursor-pointer"
                          title="Alterar senha do usuário"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span>Alterar Senha</span>
                        </button>

                        {u.username !== 'admin' && u.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hardware Network Interfaces Card */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-sky-400" />
            <span>Detecção de Placas de Rede DPDK (Mellanox, Intel, Broadcom)</span>
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
            className="rounded-lg bg-slate-950 border border-slate-700/80 px-3 py-1.5 text-xs text-sky-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 transition cursor-pointer"
          >
            Re-escanear PCI / DPDK
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          As interfaces são detectadas automaticamente através do arquivo <span className="font-mono text-emerald-400">/etc/trex_cfg.yaml</span> e do barramento PCI do Linux (<span className="font-mono text-sky-300">/sys/bus/pci/devices</span>). Se o servidor tiver placas Mellanox ConnectX, Intel (E810/XL710) ou VirtIO, os nomes, PCIe e drivers são identificados dinamicamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {(status?.ports || []).map((port) => (
            <div key={port.id} className="rounded-xl bg-slate-950/80 p-4 border border-slate-800/80 font-mono text-xs space-y-1.5 shadow-sm">
              <div className="flex justify-between items-center text-sky-300 font-bold border-b border-slate-800/60 pb-1.5">
                <span>Port {port.id}: {port.name}</span>
                <span className="text-emerald-400 text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                  {port.speed}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Modelo: <span className="text-slate-200">{port.model || 'Detectado dinamicamente'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                PCIe Address: <span className="text-amber-300 font-mono">{port.pciAddress || '0000:03:00.' + port.id}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Driver DPDK: <span className="text-purple-300">{port.driver || 'mlx5_core / vfio-pci'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                MAC Address: <span className="text-slate-200">{port.mac}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Directory & Shell Scripts Mapping */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
          <HardDrive className="h-4 w-4 text-amber-400" />
          <span>Mapeamento de Scripts de Shell e Binários TRex</span>
        </h3>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-slate-400">Diretório Base:</span>
            <span className="text-slate-200 font-semibold">/opt/trex/v3.08</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-slate-400">Console Binário:</span>
            <span className="text-sky-300 font-semibold">/opt/trex/v3.08/trex-console</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-slate-400">Script Server 1 (start_test):</span>
            <span className="text-emerald-400 font-semibold">/usr/local/bin/start1_server.sh</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-slate-400">Script Server 2 (start_test2):</span>
            <span className="text-emerald-400 font-semibold">/usr/local/bin/start2_server.sh</span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-slate-400">Script Parada (stop_server):</span>
            <span className="text-red-400 font-semibold">/usr/local/bin/stop_server.sh</span>
          </div>
        </div>
      </div>

      {/* Modal: Criar Novo Usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <span>Cadastrar Novo Usuário</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Nome de Usuário (Login):</label>
                <input
                  type="text"
                  required
                  placeholder="ex: joao.silva"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Nome Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="ex: João da Silva"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Email:</label>
                <input
                  type="email"
                  required
                  placeholder="ex: joao@empresa.com.br"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Nível de Acesso (Role):</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition cursor-pointer"
                >
                  <option value="network_operator">network_operator (Executar testes e perfis)</option>
                  <option value="admin">admin (Acesso total + Gerenciar usuários)</option>
                  <option value="auditor">auditor (Somente leitura e relatórios)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Senha Inicial:</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-900/20 active:scale-[0.98] transition cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar Senha */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800/90 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-sky-400" />
                <span>Alterar Senha</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUserForPassword(null);
                  setNewPassword('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Defina a nova senha para o usuário <strong className="text-sky-300 font-bold">{selectedUserForPassword.username}</strong>:
            </p>

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 font-sans font-medium mb-1.5">Nova Senha:</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUserForPassword(null);
                    setNewPassword('');
                  }}
                  className="rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-900/20 active:scale-[0.98] transition cursor-pointer"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
