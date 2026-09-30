import React, { useState } from 'react';
import { Key, UserCheck, Lock, Activity, Server, ArrowRight, AlertCircle } from 'lucide-react';
import { ApiClient } from '../services/api';
import { User } from '../types';

interface LoginModalProps {
  onSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await ApiClient.login(username, password);
      onSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#191a21]/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#44475a] bg-[#282a36] p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#bd93f9]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#50fa7b]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#bd93f9] to-[#6272a4] shadow-lg shadow-[#bd93f9]/20 text-[#282a36]">
            <Activity className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-widest text-[#50fa7b] uppercase bg-[#50fa7b]/10 px-2 py-0.5 rounded border border-[#50fa7b]/30">
              DPDK Accelerated
            </span>
            <span className="text-xs font-mono text-[#8be9fd]">v3.08</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f8f8f2]">
            Cisco TRex Traffic Suite
          </h1>
          <p className="text-sm text-[#6272a4] mt-1 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-[#ff79c6]" />
            Host Alvo: <span className="font-mono text-[#f8f8f2]">10.69.70.20</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#ff5555]/40 bg-[#ff5555]/10 p-3 text-xs text-[#ff5555]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#8be9fd]" />
              Identificador do Operador
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3.5 py-2.5 text-sm text-[#f8f8f2] placeholder-[#6272a4] focus:border-[#bd93f9] focus:outline-none focus:ring-1 focus:ring-[#bd93f9] font-mono"
                placeholder="Digite seu usuário"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#f8f8f2] mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#ffb86c]" />
              Senha de Segurança
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3.5 py-2.5 text-sm text-[#f8f8f2] placeholder-[#6272a4] focus:border-[#bd93f9] focus:outline-none focus:ring-1 focus:ring-[#bd93f9] font-mono"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#bd93f9] to-[#ff79c6] px-4 py-2.5 text-sm font-semibold text-[#1e1f29] shadow-lg shadow-[#bd93f9]/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1e1f29] border-t-transparent" />
            ) : (
              <>
                <Key className="h-4 w-4" />
                <span>Autenticar via JWT</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#44475a] pt-4">
          <p className="text-[10px] text-[#6272a4]">
            Tokens JWT assinados com HMAC-SHA256 • Execução protegida via child_process.spawn
          </p>
        </div>
      </div>
    </div>
  );
};
