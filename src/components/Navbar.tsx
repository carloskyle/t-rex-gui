import React from 'react';
import { Server, Radio, Square, FileCode, Terminal, FileText, Settings, LogOut, Shield, CheckCircle2 } from 'lucide-react';
import { TRexStatus, User } from '../types';
import { NctLogo } from './NctLogo';

interface NavbarProps {
  user: User;
  status: TRexStatus | null;
  activeTab: 'dashboard' | 'profiles' | 'console' | 'reports' | 'settings';
  onTabChange: (tab: 'dashboard' | 'profiles' | 'console' | 'reports' | 'settings') => void;
  onEmergencyStop: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  status,
  activeTab,
  onTabChange,
  onEmergencyStop,
  onLogout,
}) => {
  const isRunning = status?.isRunning ?? false;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        {/* NCT Informática Brand & Target Host */}
        <div className="flex items-center gap-3">
          <div className="flex items-center py-1 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <NctLogo className="h-7 text-white" />
          </div>

          <div className="border-l border-slate-800 pl-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-100 tracking-wide font-sans">
                TRex DPDK Platform
              </span>
              <span className="rounded bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 text-[9px] font-mono font-medium text-sky-400">
                v3.08
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
                <Server className="h-3 w-3 text-sky-400" />
                {status?.serverIp || '10.69.70.20'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono text-[10px]">{status?.mode || 'IDLE'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Solid Enterprise Dark Theme) */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            Controle & Injeção
          </button>

          <button
            onClick={() => onTabChange('profiles')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'profiles'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            Editor de Perfis
          </button>

          <button
            onClick={() => onTabChange('console')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'console'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Console TRex
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer relative ${
              activeTab === 'reports'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Relatórios & Histórico
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Configurações
          </button>
        </nav>

        {/* Right side: Active Status Pill, Emergency Stop, User profile, Logout */}
        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-semibold">TESTE ATIVO:</span>
                <span className="font-mono text-slate-100 font-bold">
                  {status?.metrics.txGbps.toFixed(2)} Gbps
                </span>
                <span className="font-mono text-amber-300">
                  ({status?.remainingSeconds}s)
                </span>
              </div>

              <button
                onClick={onEmergencyStop}
                title="Parar teste imediatamente"
                className="flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>PARAR</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>TRex DPDK Pronto</span>
            </div>
          )}

          {/* User profile badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200 flex items-center justify-end gap-1">
                <Shield className="h-3 w-3 text-sky-400" />
                {user.username}
              </div>
              <div className="text-[10px] text-slate-500 capitalize font-mono">{user.role.replace('_', ' ')}</div>
            </div>

            <button
              onClick={onLogout}
              title="Encerrar sessão"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden border-t border-slate-800 px-2 py-1.5 overflow-x-auto gap-1 bg-slate-950">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-300'}`}
        >
          Controle
        </button>
        <button
          onClick={() => onTabChange('profiles')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'profiles' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-300'}`}
        >
          Editor Perfis
        </button>
        <button
          onClick={() => onTabChange('console')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'console' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-300'}`}
        >
          Console
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'reports' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-300'}`}
        >
          Relatórios
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'settings' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-300'}`}
        >
          Config
        </button>
      </div>
    </header>
  );
};
