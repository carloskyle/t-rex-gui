import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDownCircle, ShieldCheck, CheckCircle2, Search } from 'lucide-react';
import { ApiClient } from '../services/api';

export const ConsoleTab: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await ApiClient.getLogs(200);
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to get logs', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    try {
      await ApiClient.executeAction({ action: 'clear' });
      setLogs([]);
      setCommandFeedback('Buffer de logs limpo com sucesso.');
      setTimeout(() => setCommandFeedback(null), 3000);
    } catch (err: any) {
      setCommandFeedback(`Erro ao limpar: ${err.message}`);
    }
  };

  const handleSendAction = async (action: 'stats' | 'clear') => {
    try {
      const res = await ApiClient.executeAction({ action });
      setCommandFeedback(res.message);
      fetchLogs();
      setTimeout(() => setCommandFeedback(null), 3000);
    } catch (err: any) {
      setCommandFeedback(`Erro: ${err.message}`);
    }
  };

  const filteredLogs = filterText
    ? logs.filter((l) => l.toLowerCase().includes(filterText.toLowerCase()))
    : logs;

  return (
    <div className="space-y-4" role="region" aria-label="Console do TRex">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-sky-400" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              TRex DPDK Console & Runtime Logs
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Shell Seguro via child_process.spawn</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar logs..."
              aria-label="Filtrar mensagens de log"
              className="rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-sky-500 w-48"
            />
          </div>

          {/* Auto-Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            aria-pressed={autoScroll}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 min-h-[36px] text-xs font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              autoScroll
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Auto-Scroll</span>
          </button>

          {/* Query Stats */}
          <button
            type="button"
            onClick={() => handleSendAction('stats')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 min-h-[36px] text-xs font-medium text-sky-300 hover:bg-slate-800 hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span>Consultar Stats</span>
          </button>

          {/* Clear Buffer */}
          <button
            type="button"
            onClick={handleClearLogs}
            aria-label="Limpar histórico de logs do console"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 min-h-[36px] text-xs font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {commandFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs font-mono text-sky-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Terminal View */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="ml-2 text-slate-200">root@trex-host-10-69-70-20:/opt/trex/v3.08#</span>
          </div>
          <span className="text-slate-300">{filteredLogs.length} linhas</span>
        </div>

        {/* Terminal Logs Output */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Linhas de log do console TRex"
          tabIndex={0}
          className="h-[460px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-400 italic">Nenhuma saída de console gravada ainda.</div>
          ) : (
            filteredLogs.map((line, index) => {
              // Color highlight based on log tags
              let colorClass = 'text-slate-200';
              if (line.includes('[ERR]') || line.includes('[ERROR]') || line.includes('Falha') || line.includes('FAIL')) {
                colorClass = 'text-red-400 font-semibold';
              } else if (line.includes('[AUTH]')) {
                colorClass = 'text-purple-300';
              } else if (line.includes('[START]') || line.includes('[SUCCESS]') || line.includes('online')) {
                colorClass = 'text-emerald-400 font-medium';
              } else if (line.includes('[SAMPLE') || line.includes('[STATS]')) {
                colorClass = 'text-sky-300';
              } else if (line.includes('[WARN]')) {
                colorClass = 'text-amber-300';
              } else if (line.includes('[FINISH]') || line.includes('[SUMMARY]')) {
                colorClass = 'text-emerald-300 font-bold bg-emerald-950/40 border-l-2 border-emerald-400 pl-2 py-1';
              }

              return (
                <div key={index} className={`break-all ${colorClass}`}>
                  {line}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
