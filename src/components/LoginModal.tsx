import React, { useState } from 'react';
import { Key, UserCheck, Lock, Server, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../services/api';
import { User } from '../types';
import { NctLogo } from './NctLogo';

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
      setErrorMessage(err.message || 'Credenciais inválidas. Verifique usuário e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-7 relative">
        {/* Top Header with NCT Informática Official Branding */}
        <div className="flex flex-col items-center text-center pb-5 mb-5 border-b border-slate-800">
          <div className="mb-3 flex items-center justify-center py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <NctLogo className="h-10 text-white" />
          </div>

          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight text-slate-100 flex items-center justify-center gap-2">
              <span>NCT Informática</span>
              <span className="text-xs font-normal text-slate-400 font-mono">|</span>
              <span className="text-xs font-mono text-sky-400 font-medium">TRex DPDK Platform</span>
            </h1>
            <p className="text-xs text-slate-400">
              Gerador de Tráfego de Alta Vazão & Análise de Redes
            </p>
          </div>

          {/* Technical Target Server Badge */}
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-md bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-slate-400 border border-slate-800">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="flex items-center gap-1.5 text-slate-300">
              <Server className="h-3 w-3 text-sky-400" />
              10.69.70.20
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Porta 4501</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-sky-400" />
              Identificador do Operador
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 font-mono transition"
                placeholder="Digite seu usuário"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              Senha de Segurança
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 font-mono transition"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-950/50 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Key className="h-4 w-4" />
                <span>Autenticar Operador</span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Security & Corporate Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sessão Criptografada (JWT)</span>
          </div>
          <span>NCT Informática</span>
        </div>
      </div>
    </div>
  );
};
