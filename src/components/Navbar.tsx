import React from 'react';
import { Server, Radio, Square, FileCode, Terminal, FileText, Settings, LogOut, Shield, Activity } from 'lucide-react';
import { TRexStatus, User } from '../types';
import { NctLogo } from './NctLogo';

interface NavbarProps {
  user: User;
  status: TRexStatus | null;
  activeTab: 'dashboard' | 'profiles' | 'console' | 'traffic-analysis' | 'reports' | 'settings';
  onTabChange: (tab: 'dashboard' | 'profiles' | 'console' | 'traffic-analysis' | 'reports' | 'settings') => void;
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

  const navItems = [
    { id: 'dashboard' as const, label: 'Controle & Injeção', icon: Radio },
    { id: 'traffic-analysis' as const, label: 'Análise de Tráfego', icon: Activity },
    { id: 'profiles' as const, label: 'Editor de Perfis', icon: FileCode },
    { id: 'console' as const, label: 'Console TRex', icon: Terminal },
    { id: 'reports' as const, label: 'Relatórios & Histórico', icon: FileText },
    { id: 'settings' as const, label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        {/* NCT Informática Brand & Target Host */}
        <div className="flex items-center gap-3">
          <div className="flex items-center py-1 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800" aria-label="Logo NCT Informática">
            <NctLogo className="h-7 text-white" />
          </div>

          <div className="border-l border-slate-800 pl-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-100 tracking-wide font-sans">
                TRex DPDK Platform
              </span>
              <span className="rounded bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 text-[9px] font-mono font-medium text-sky-400">
                v3.08
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
                <Server className="h-3 w-3 text-sky-400" aria-hidden="true" />
                {status?.serverIp || '10.69.70.20'}
              </span>
              <span className="text-slate-600" aria-hidden="true">•</span>
              <span className="text-slate-300 font-mono text-[10px]">{status?.mode || 'IDLE'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Accessible Tablist) */}
        <nav
          className="hidden md:flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800"
          role="tablist"
          aria-label="Navegação principal da plataforma"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={isCurrent}
                aria-controls={`panel-${item.id}`}
                tabIndex={isCurrent ? 0 : -1}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium transition cursor-pointer min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  isCurrent
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side: Active Status Badge, Emergency Stop, User profile, Logout */}
        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" aria-hidden="true" />
                <span className="font-semibold text-red-200">TESTE ATIVO:</span>
                <span className="font-mono text-white font-bold">
                  {status?.metrics.txGbps.toFixed(2)} Gbps
                </span>
                <span className="font-mono text-amber-300">
                  ({status?.remainingSeconds}s)
                </span>
              </div>

              <button
                onClick={onEmergencyStop}
                type="button"
                aria-label="Parar teste de tráfego imediatamente"
                title="Parar teste de tráfego imediatamente (Emergência)"
                className="flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 px-3 py-1.5 min-h-[38px] text-xs font-bold text-white shadow-sm transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>PARAR</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 font-mono" role="status">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>TRex DPDK Pronto</span>
            </div>
          )}

          {/* User profile badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-100 flex items-center justify-end gap-1">
                <Shield className="h-3 w-3 text-sky-400" aria-hidden="true" />
                <span>{user.username}</span>
              </div>
              <div className="text-[10px] text-slate-400 capitalize font-mono">{user.role.replace('_', ' ')}</div>
            </div>

            <button
              onClick={onLogout}
              type="button"
              aria-label="Encerrar sessão do operador"
              title="Encerrar sessão"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-red-400 hover:border-red-500/40 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div
        className="flex md:hidden border-t border-slate-800 px-2 py-1.5 overflow-x-auto gap-1 bg-slate-950"
        role="tablist"
        aria-label="Navegação móvel"
      >
        {navItems.map((item) => {
          const isCurrent = activeTab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isCurrent}
              onClick={() => onTabChange(item.id)}
              className={`px-3 py-2 text-xs rounded-md whitespace-nowrap min-h-[40px] font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isCurrent ? 'bg-sky-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
