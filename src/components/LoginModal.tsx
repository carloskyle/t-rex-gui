import React, { useState } from 'react';
import { UserCheck, Lock, Server, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-7 relative">
        {/* Top Header with NCT Informática Official Branding */}
        <div className="flex flex-col items-center text-center pb-5 mb-5 border-b border-slate-800">
          <div className="mb-3 flex items-center justify-center py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80" aria-label="Logo NCT Informática">
            <NctLogo className="h-10 text-white" />
          </div>

          <div className="space-y-1">
            <h1 id="login-title" className="text-base font-semibold tracking-tight text-slate-100 flex items-center justify-center gap-2">
              <span>NCT Informática</span>
              <span className="text-xs font-normal text-slate-400 font-mono" aria-hidden="true">|</span>
              <span className="text-xs font-mono text-sky-400 font-medium">TRex DPDK Platform</span>
            </h1>
            <p className="text-xs text-slate-300">
              Gerador de Tráfego de Alta Vazão & Análise de Redes
            </p>
          </div>

          {/* Technical Target Server Badge */}
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-md bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-slate-800">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-slate-200">
              <Server className="h-3 w-3 text-sky-400" aria-hidden="true" />
              10.69.70.20
            </span>
            <span className="text-slate-600" aria-hidden="true">/</span>
            <span className="text-slate-400">Porta 4501</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 flex items-center gap-2.5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="login-username" className="block text-xs font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Identificador do Operador</span>
            </label>
            <div className="relative">
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-500 font-mono transition min-h-[42px]"
                placeholder="Digite seu usuário"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Senha de Segurança</span>
            </label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-500 font-mono transition min-h-[42px]"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {isLoading ? (
              <span>Autenticando na controladora...</span>
            ) : (
              <>
                <span>Acessar Plataforma TRex</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="mt-5 text-center border-t border-slate-800/80 pt-4 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span>Acesso restrito ao Laboratório e Homologação de Rede NCT</span>
        </div>
      </div>
    </div>
  );
};
