import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDownCircle, RefreshCw, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../services/api';

export const ConsoleTab: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [customCommand, setCustomCommand] = useState<string>('');
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
    } catch (err) {
      console.error(err);
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
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#44475a] bg-[#282a36] p-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-[#bd93f9]" />
          <div>
            <h2 className="text-sm font-bold text-[#f8f8f2]">
              TRex DPDK Console & Runtime Logs
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-[#50fa7b]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Shell Seguro via child_process.spawn</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar logs..."
            className="rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-1.5 text-xs text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none w-44"
          />

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer ${
              autoScroll
                ? 'border-[#50fa7b]/40 bg-[#50fa7b]/15 text-[#50fa7b]'
                : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4]'
            }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
            <span>Auto-Scroll</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendAction('stats')}
            className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#8be9fd] hover:bg-[#44475a] transition cursor-pointer"
          >
            <span>Consultar Stats</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="flex items-center gap-1 rounded-lg border border-[#44475a] bg-[#1e1f29] px-2.5 py-1.5 text-xs text-[#ff5555] hover:bg-[#ff5555]/10 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {commandFeedback && (
        <div className="rounded-lg border border-[#8be9fd]/30 bg-[#8be9fd]/10 p-2.5 text-xs font-mono text-[#8be9fd] flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Terminal View */}
      <div className="rounded-xl border border-[#44475a] bg-[#191a21] shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#44475a] bg-[#21222c] px-4 py-2 text-xs font-mono text-[#6272a4]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5555]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f1fa8c]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#50fa7b]" />
            <span className="ml-2 text-[#f8f8f2]">root@trex-host-10-69-70-20:/opt/trex/v3.08#</span>
          </div>
          <span>{filteredLogs.length} linhas</span>
        </div>

        {/* Terminal Logs Output */}
        <div className="h-[460px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-[#6272a4] italic">Nenhuma saída de console gravada ainda.</div>
          ) : (
            filteredLogs.map((line, index) => {
              // Color highlight based on log tags
              let colorClass = 'text-[#f8f8f2]';
              if (line.includes('[ERR]') || line.includes('[ERROR]') || line.includes('Falha') || line.includes('FAIL')) {
                colorClass = 'text-[#ff5555] font-semibold';
              } else if (line.includes('[AUTH]')) {
                colorClass = 'text-[#bd93f9]';
              } else if (line.includes('[START]') || line.includes('[SUCCESS]') || line.includes('online')) {
                colorClass = 'text-[#50fa7b] font-medium';
              } else if (line.includes('[SAMPLE') || line.includes('[STATS]')) {
                colorClass = 'text-[#8be9fd]';
              } else if (line.includes('[WARN]')) {
                colorClass = 'text-[#ffb86c]';
              } else if (line.includes('[FINISH]') || line.includes('[SUMMARY]')) {
                colorClass = 'text-[#50fa7b] font-bold bg-[#50fa7b]/10 p-1 rounded';
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
