import React from 'react';
import { Activity, Server, Radio, Square, FileCode, Terminal, FileText, Settings, LogOut, Shield } from 'lucide-react';
import { TRexStatus, User } from '../types';

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
    <header className="sticky top-0 z-40 w-full border-b border-[#44475a] bg-[#1e1f29]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand & Target Host */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#bd93f9] to-[#6272a4] text-[#1e1f29] shadow-md shadow-[#bd93f9]/20 font-bold">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#f8f8f2] tracking-wide">
                CISCO TRex
              </span>
              <span className="rounded bg-[#bd93f9]/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#bd93f9]">
                DPDK v3.08
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#6272a4]">
              <span className="flex items-center gap-1 font-mono">
                <Server className="h-3 w-3 text-[#50fa7b]" />
                {status?.serverIp || '10.69.70.20'}
              </span>
              <span>•</span>
              <span className="text-[#8be9fd]">{status?.mode || 'IDLE'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-[#282a36] p-1 border border-[#44475a]">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#bd93f9] text-[#1e1f29] shadow-sm font-semibold'
                : 'text-[#f8f8f2] hover:bg-[#44475a]/40'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            Controle & Injeção
          </button>

          <button
            onClick={() => onTabChange('profiles')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'profiles'
                ? 'bg-[#bd93f9] text-[#1e1f29] shadow-sm font-semibold'
                : 'text-[#f8f8f2] hover:bg-[#44475a]/40'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            Editor de Perfis
          </button>

          <button
            onClick={() => onTabChange('console')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'console'
                ? 'bg-[#bd93f9] text-[#1e1f29] shadow-sm font-semibold'
                : 'text-[#f8f8f2] hover:bg-[#44475a]/40'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Console TRex
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer relative ${
              activeTab === 'reports'
                ? 'bg-[#bd93f9] text-[#1e1f29] shadow-sm font-semibold'
                : 'text-[#f8f8f2] hover:bg-[#44475a]/40'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Relatórios & Histórico
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#bd93f9] text-[#1e1f29] shadow-sm font-semibold'
                : 'text-[#f8f8f2] hover:bg-[#44475a]/40'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Configurações
          </button>
        </nav>

        {/* Right side: Active Status Pill, Emergency Stop, User profile, Logout */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[#ff5555]/50 bg-[#ff5555]/10 px-3 py-1 text-xs text-[#ff5555] animate-pulse">
                <span className="h-2 w-2 rounded-full bg-[#ff5555]" />
                <span className="font-semibold">TESTE ATIVO:</span>
                <span className="font-mono text-[#f8f8f2]">
                  {status?.metrics.txGbps.toFixed(2)} Gbps
                </span>
                <span className="font-mono text-[#ffb86c]">
                  ({status?.remainingSeconds}s)
                </span>
              </div>

              <button
                onClick={onEmergencyStop}
                title="Parar teste imediatamente"
                className="flex items-center gap-1.5 rounded-lg bg-[#ff5555] px-3 py-1.5 text-xs font-bold text-[#1e1f29] shadow-md shadow-[#ff5555]/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>PARAR</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#50fa7b]/30 bg-[#50fa7b]/10 px-2.5 py-0.5 text-[11px] text-[#50fa7b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#50fa7b]" />
              <span>TRex Pronto</span>
            </div>
          )}

          {/* User profile badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#44475a]">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-[#f8f8f2] flex items-center justify-end gap-1">
                <Shield className="h-3 w-3 text-[#bd93f9]" />
                {user.username}
              </div>
              <div className="text-[10px] text-[#6272a4] capitalize">{user.role.replace('_', ' ')}</div>
            </div>

            <button
              onClick={onLogout}
              title="Encerrar sessão JWT"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#44475a] bg-[#282a36] text-[#6272a4] hover:text-[#ff5555] hover:border-[#ff5555]/50 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden border-t border-[#44475a] px-2 py-1.5 overflow-x-auto gap-1">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#bd93f9] text-[#1e1f29] font-bold' : 'text-[#f8f8f2]'}`}
        >
          Controle
        </button>
        <button
          onClick={() => onTabChange('profiles')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'profiles' ? 'bg-[#bd93f9] text-[#1e1f29] font-bold' : 'text-[#f8f8f2]'}`}
        >
          Editor Perfis
        </button>
        <button
          onClick={() => onTabChange('console')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'console' ? 'bg-[#bd93f9] text-[#1e1f29] font-bold' : 'text-[#f8f8f2]'}`}
        >
          Console
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'reports' ? 'bg-[#bd93f9] text-[#1e1f29] font-bold' : 'text-[#f8f8f2]'}`}
        >
          Relatórios
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'settings' ? 'bg-[#bd93f9] text-[#1e1f29] font-bold' : 'text-[#f8f8f2]'}`}
        >
          Config
        </button>
      </div>
    </header>
  );
};
