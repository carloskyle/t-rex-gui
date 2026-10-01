import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  Save,
  RotateCcw,
  Plus,
  Check,
  AlertCircle,
  Code2,
  HardDrive,
  Copy,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { ProfileItem } from '../types';

interface ProfileEditorTabProps {
  initialDir?: string;
  initialProfile?: string;
}

export const ProfileEditorTab: React.FC<ProfileEditorTabProps> = ({
  initialDir = 'stl',
  initialProfile = 'imix.yaml',
}) => {
  const [selectedDir, setSelectedDir] = useState<'cap2' | 'stl' | 'astf' | 'avl'>(
    (initialDir as any) || 'stl'
  );
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(initialProfile || '');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New profile creation modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileType, setNewProfileType] = useState<'yaml' | 'py'>('yaml');
  const [copied, setCopied] = useState(false);
  const [editorMode, setEditorMode] = useState<'highlight' | 'edit'>('highlight');

  // Dracula Theme Syntax Highlighting Tokenizer for Python & YAML
  const renderHighlightedLine = (line: string, isYaml: boolean) => {
    if (!line) return <span>&nbsp;</span>;

    // Check for comment
    const commentIdx = line.indexOf('#');
    let codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : null;

    if (isYaml) {
      // Simple YAML parsing
      const colonIdx = codePart.indexOf(':');
      if (colonIdx > 0 && !codePart.trim().startsWith('-')) {
        const key = codePart.slice(0, colonIdx);
        const rest = codePart.slice(colonIdx + 1);
        return (
          <span>
            <span className="text-[#8be9fd] font-bold">{key}</span>
            <span className="text-[#ff79c6]">:</span>
            <span className="text-[#f1fa8c]">{rest}</span>
            {commentPart && <span className="text-[#6272a4] italic">{commentPart}</span>}
          </span>
        );
      }
    }

    // Python tokenization
    // Match strings ('...' or "..."), words, numbers, operators
    const tokenRegex = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[a-zA-Z_]\w*|\b(?:import|from|def|class|return|if|elif|else|for|while|try|except|finally|with|as|lambda|yield|pass|break|continue|in|is|not|and|or|True|False|None)\b|\b(?:self|cls|len|range|print|int|str|float|list|dict|set|tuple|super)\b|[a-zA-Z_]\w*(?=\()|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|0x[0-9a-fA-F]+|[+\-*/%=<>!&|^~]+|[(),.:[\]{}])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(codePart)) !== null) {
      if (match.index > lastIndex) {
        parts.push(codePart.slice(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('"') || token.startsWith("'")) {
        // String literal -> Dracula Yellow
        parts.push(<span key={match.index} className="text-[#f1fa8c]">{token}</span>);
      } else if (token.startsWith('@')) {
        // Decorator -> Dracula Orange
        parts.push(<span key={match.index} className="text-[#ffb86c] font-semibold">{token}</span>);
      } else if (/^(import|from|def|class|return|if|elif|else|for|while|try|except|finally|with|as|lambda|yield|pass|break|continue|in|is|not|and|or|True|False|None)$/.test(token)) {
        // Python Keywords -> Dracula Pink / Magenta
        parts.push(<span key={match.index} className="text-[#ff79c6] font-bold">{token}</span>);
      } else if (/^(self|cls|len|range|print|int|str|float|list|dict|set|tuple|super)$/.test(token)) {
        // Builtin functions / constants -> Dracula Cyan
        parts.push(<span key={match.index} className="text-[#8be9fd] italic">{token}</span>);
      } else if (/^(\d+(\.\d+)?(e[+-]?\d+)?|0x[0-9a-fA-F]+)$/.test(token)) {
        // Numbers / Hex constants -> Dracula Purple
        parts.push(<span key={match.index} className="text-[#bd93f9] font-mono">{token}</span>);
      } else if (/^[a-zA-Z_]\w*$/.test(token)) {
        // Function invocation -> Dracula Green
        parts.push(<span key={match.index} className="text-[#50fa7b] font-medium">{token}</span>);
      } else if (/^[+\-*/%=<>!&|^~]+$/.test(token)) {
        // Operators -> Dracula Pink
        parts.push(<span key={match.index} className="text-[#ff79c6]">{token}</span>);
      } else {
        parts.push(token);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < codePart.length) {
      parts.push(codePart.slice(lastIndex));
    }

    return (
      <span>
        {parts}
        {commentPart && <span className="text-[#6272a4] italic">{commentPart}</span>}
      </span>
    );
  };

  // Load profiles in current directory
  const fetchProfiles = async () => {
    try {
      const res = await ApiClient.getProfiles(selectedDir);
      const list = res.profiles[selectedDir] || [];
      setProfiles(list);

      // If current profile is in this directory, keep it; otherwise select first
      if (list.length > 0) {
        const found = list.find((p) => p.name === selectedProfile);
        if (!found) {
          handleLoadProfile(selectedDir, list[0].name);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao listar perfis' });
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [selectedDir]);

  useEffect(() => {
    if (initialProfile) {
      handleLoadProfile(selectedDir, initialProfile);
    }
  }, []);

  const handleLoadProfile = async (dir: string, filename: string) => {
    if (!filename) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await ApiClient.getProfileContent(dir, filename);
      setSelectedProfile(filename);
      setContent(res.content);
      setOriginalContent(res.content);
      setFilePath(res.path);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao carregar conteúdo do perfil.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await ApiClient.saveProfileContent(selectedDir, selectedProfile, content);
      setOriginalContent(content);
      setStatusMessage({
        type: 'success',
        text: `Perfil '${selectedDir}/${selectedProfile}' salvo com sucesso no servidor!`,
      });
      fetchProfiles();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao salvar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName) return;

    let finalName = newProfileName.trim();
    if (!finalName.endsWith('.yaml') && !finalName.endsWith('.py')) {
      finalName += `.${newProfileType}`;
    }

    try {
      await ApiClient.createProfile(selectedDir, finalName);
      setShowNewModal(false);
      setNewProfileName('');
      await fetchProfiles();
      handleLoadProfile(selectedDir, finalName);
      setStatusMessage({
        type: 'success',
        text: `Novo perfil '${finalName}' criado em '${selectedDir}/'.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao criar perfil' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDirty = content !== originalContent;
  const lineCount = content.split('\n').length;

  return (
    <div className="space-y-6" role="region" aria-label="Editor de Perfis TRex">
      {/* Top Banner / Notifications */}
      {statusMessage && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-mono shadow-sm transition ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Editor Grid: Sidebar for directory/files & Main Editor Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar: Directories & Files */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-amber-400" />
                Diretórios TRex
              </span>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1 rounded-lg bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 text-[11px] font-bold text-sky-400 hover:bg-sky-500/25 transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Novo
              </button>
            </div>

            {/* Dir Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['cap2', 'stl', 'astf', 'avl'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setSelectedDir(dir)}
                  className={`h-11 px-3 text-xs font-mono font-medium rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    selectedDir === dir
                      ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-bold shadow-[0_0_12px_rgba(14,165,233,0.25)] ring-1 ring-sky-500/50'
                      : 'border-slate-800/90 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/30'
                  }`}
                >
                  <span className="font-bold">/{dir}</span>
                  <span className="text-[10px] opacity-75 font-sans">
                    {dir === 'stl'
                      ? 'Stateless'
                      : dir === 'astf'
                      ? 'Stateful'
                      : dir === 'cap2'
                      ? 'Capturas'
                      : 'AVL'}
                  </span>
                </button>
              ))}
            </div>

            {/* Profile File List */}
            <div className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Arquivos em /{selectedDir}:</span>
              <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                {profiles.length} itens
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {profiles.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-4 text-center rounded-lg border border-dashed border-slate-800">
                  Nenhum arquivo encontrado em /{selectedDir}
                </div>
              ) : (
                profiles.map((p) => {
                  const isCurrent = p.name === selectedProfile;
                  const isPython = p.name.endsWith('.py');
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleLoadProfile(selectedDir, p.name)}
                      className={`w-full text-left p-2.5 text-xs font-mono transition-all duration-150 flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border-l-4 border-l-sky-500 border-y border-r border-sky-500/30 bg-sky-500/15 text-sky-200 font-bold rounded-r-lg shadow-sm'
                          : 'border-l-4 border-l-transparent border-y border-r border-transparent bg-slate-950/70 text-slate-300 hover:bg-slate-800/60 hover:text-white rounded-r-lg'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode
                          className={`h-4 w-4 shrink-0 ${
                            isPython ? 'text-amber-400' : 'text-cyan-400'
                          }`}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-sans ml-2">
                        {(p.size / 1024).toFixed(1)} KB
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main Code Editor View */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800/90 bg-slate-950 px-4 py-3 gap-2">
              <div className="flex items-center gap-3">
                <Code2 className="h-4 w-4 text-sky-400" />
                <span className="font-mono text-xs font-bold text-slate-100">
                  {selectedDir}/{selectedProfile || 'Nenhum perfil selecionado'}
                </span>
                {isDirty && (
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono text-amber-300 font-semibold animate-pulse">
                    Modificado
                  </span>
                )}
              </div>

              {/* Action Buttons Right-Aligned */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar código para a área de transferência"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-3 h-9 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Copy className="h-3.5 w-3.5 text-sky-400" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isDirty || isLoading}
                  onClick={() => setContent(originalContent)}
                  title="Reverter alterações não salvas"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-3 h-9 text-xs font-medium text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reverter</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || !selectedProfile}
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 h-9 text-xs font-bold text-white shadow-md shadow-emerald-900/20 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {isSaving ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Salvar Original</span>
                </button>
              </div>
            </div>

            {/* Target Path info & View Mode Toggle */}
            <div className="flex items-center justify-between bg-[#191a24] px-4 py-2 text-[11px] font-mono text-slate-400 border-b border-[#282a36]">
              <span className="flex items-center gap-1.5 truncate">
                <HardDrive className="h-3.5 w-3.5 text-[#50fa7b]" />
                <span className="text-slate-200 font-semibold">{filePath || `/opt/trex/v3.08/${selectedDir}/${selectedProfile}`}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 bg-[#282a36] border border-slate-700/60 px-2 py-0.5 rounded font-mono">
                  {lineCount} linhas
                </span>
                <div className="flex items-center bg-[#21222c] rounded-lg p-0.5 border border-slate-700/60 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setEditorMode('highlight')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition font-medium ${
                      editorMode === 'highlight'
                        ? 'bg-[#bd93f9] text-[#282a36] font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dracula Syntax
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    className={`px-2 py-0.5 rounded cursor-pointer transition font-medium ${
                      editorMode === 'edit'
                        ? 'bg-[#50fa7b] text-[#282a36] font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Editor Direto
                  </button>
                </div>
              </div>
            </div>

            {/* Dracula Theme Code Canvas (Different background from page) */}
            <div className="relative bg-[#21222c] border-t border-[#282a36] overflow-x-auto min-h-[460px]">
              {editorMode === 'highlight' ? (
                <div
                  onClick={() => setEditorMode('edit')}
                  title="Clique para editar este arquivo"
                  className="p-4 font-mono text-xs leading-relaxed text-[#f8f8f2] select-text cursor-text font-normal"
                >
                  {content.split('\n').map((line, idx) => {
                    const isYaml = (selectedProfile || '').endsWith('.yaml') || (selectedProfile || '').endsWith('.yml');
                    return (
                      <div key={idx} className="flex hover:bg-[#282a36]/60 transition-colors">
                        <span className="w-10 text-right pr-4 text-[#6272a4] select-none font-mono text-[11px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="whitespace-pre flex-1">
                          {renderHighlightedLine(line, isYaml)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex">
                  <div className="w-10 bg-[#1e1f29] border-r border-[#282a36] py-4 text-right pr-3 select-none font-mono text-[11px] text-[#6272a4] space-y-[4.5px] shrink-0">
                    {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={Math.max(lineCount + 2, 24)}
                    disabled={isLoading}
                    spellCheck={false}
                    className="w-full resize-none bg-[#21222c] p-4 font-mono text-xs leading-relaxed text-[#f8f8f2] focus:outline-none selection:bg-[#44475a] border-none block"
                    placeholder="# Conteúdo do perfil YAML ou Python..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Profile Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800/90 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Criar Novo Perfil TRex
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              O novo arquivo será criado no diretório: <span className="text-sky-400 font-mono font-bold">/{selectedDir}</span>
            </p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Arquivo
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex: custom_latency_test.yaml"
                  required
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Script
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProfileType('yaml')}
                    className={`p-2.5 text-xs rounded-lg border text-center font-mono cursor-pointer transition ${
                      newProfileType === 'yaml'
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 font-bold ring-1 ring-cyan-500/40'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    YAML (.yaml)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProfileType('py')}
                    className={`p-2.5 text-xs rounded-lg border text-center font-mono cursor-pointer transition ${
                      newProfileType === 'py'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    Python (.py)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-900/20 active:scale-[0.98] transition cursor-pointer"
                >
                  Criar Arquivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
