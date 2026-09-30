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
    <div className="space-y-6">
      {/* Top Banner / Notifications */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-mono ${
            statusMessage.type === 'success'
              ? 'border-[#50fa7b]/40 bg-[#50fa7b]/10 text-[#50fa7b]'
              : 'border-[#ff5555]/40 bg-[#ff5555]/10 text-[#ff5555]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Editor Grid: Sidebar for directory/files & Main Editor Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar: Directories & Files */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#44475a] pb-3 mb-3">
              <span className="text-xs font-bold text-[#f8f8f2] flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-[#ffb86c]" />
                Diretórios TRex
              </span>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1 rounded bg-[#bd93f9]/20 px-2 py-1 text-[11px] font-medium text-[#bd93f9] hover:bg-[#bd93f9]/30 transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Novo
              </button>
            </div>

            {/* Dir Buttons */}
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {(['cap2', 'stl', 'astf', 'avl'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setSelectedDir(dir)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedDir === dir
                      ? 'border-[#bd93f9] bg-[#bd93f9]/20 text-[#bd93f9] font-bold'
                      : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4] hover:text-[#f8f8f2]'
                  }`}
                >
                  <span>/{dir}</span>
                  <span className="text-[10px] opacity-70">
                    {dir === 'stl'
                      ? 'Stateless'
                      : dir === 'astf'
                      ? 'Stateful'
                      : dir === 'cap2'
                      ? 'Captures'
                      : 'AVL'}
                  </span>
                </button>
              ))}
            </div>

            {/* Profile File List */}
            <div className="text-[11px] font-medium text-[#6272a4] mb-2 flex items-center justify-between">
              <span>Arquivos em /{selectedDir}:</span>
              <span>{profiles.length} itens</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {profiles.length === 0 ? (
                <div className="text-xs text-[#6272a4] italic p-3 text-center">
                  Nenhum arquivo encontrado em /{selectedDir}
                </div>
              ) : (
                profiles.map((p) => {
                  const isCurrent = p.name === selectedProfile;
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleLoadProfile(selectedDir, p.name)}
                      className={`w-full text-left rounded-lg p-2.5 text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border border-[#50fa7b]/50 bg-[#50fa7b]/10 text-[#50fa7b]'
                          : 'border border-transparent bg-[#1e1f29] text-[#f8f8f2] hover:bg-[#44475a]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode
                          className={`h-4 w-4 shrink-0 ${
                            p.type === 'python' ? 'text-[#ffb86c]' : 'text-[#8be9fd]'
                          }`}
                        />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] text-[#6272a4] shrink-0 font-sans">
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
          <div className="rounded-xl border border-[#44475a] bg-[#282a36] shadow-sm overflow-hidden flex flex-col">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#44475a] bg-[#1e1f29] px-4 py-2.5 gap-2">
              <div className="flex items-center gap-3">
                <Code2 className="h-4 w-4 text-[#bd93f9]" />
                <span className="font-mono text-xs font-bold text-[#f8f8f2]">
                  {selectedDir}/{selectedProfile || 'Nenhum perfil selecionado'}
                </span>
                {isDirty && (
                  <span className="rounded bg-[#ffb86c]/20 px-1.5 py-0.5 text-[10px] font-mono text-[#ffb86c]">
                    Modificado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar código"
                  className="flex items-center gap-1 rounded bg-[#282a36] border border-[#44475a] px-2.5 py-1 text-xs text-[#6272a4] hover:text-[#f8f8f2] transition cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isDirty || isLoading}
                  onClick={() => setContent(originalContent)}
                  title="Reverter alterações"
                  className="flex items-center gap-1 rounded bg-[#282a36] border border-[#44475a] px-2.5 py-1 text-xs text-[#6272a4] hover:text-[#ff5555] transition disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reverter</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || !selectedProfile}
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1.5 rounded bg-[#50fa7b] px-3.5 py-1 text-xs font-bold text-[#1e1f29] shadow-sm hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1e1f29] border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Salvar Original</span>
                </button>
              </div>
            </div>

            {/* Target Path info */}
            <div className="flex items-center justify-between bg-[#191a21] px-4 py-1.5 text-[11px] font-mono text-[#6272a4] border-b border-[#44475a]/50">
              <span className="flex items-center gap-1 truncate">
                <HardDrive className="h-3 w-3 text-[#50fa7b]" />
                {filePath || `/opt/trex/v3.08/${selectedDir}/${selectedProfile}`}
              </span>
              <span>{lineCount} linhas</span>
            </div>

            {/* Textarea Code Editor */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={22}
                disabled={isLoading}
                spellCheck={false}
                className="w-full resize-y bg-[#1e1f29]/95 p-4 font-mono text-xs leading-relaxed text-[#f8f8f2] focus:outline-none selection:bg-[#bd93f9]/30 border-none"
                placeholder="# Conteúdo do perfil YAML ou Python..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* New Profile Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#44475a] bg-[#282a36] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f8f8f2] mb-1">
              Criar Novo Perfil TRex
            </h3>
            <p className="text-xs text-[#6272a4] mb-4">
              O novo arquivo será criado no diretório: <span className="text-[#8be9fd] font-mono">/{selectedDir}</span>
            </p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#f8f8f2] mb-1">
                  Nome do Arquivo
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex: custom_latency_test.yaml"
                  required
                  className="w-full rounded-lg border border-[#44475a] bg-[#1e1f29] px-3 py-2 text-xs font-mono text-[#f8f8f2] focus:border-[#bd93f9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#f8f8f2] mb-1">
                  Tipo de Script
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProfileType('yaml')}
                    className={`p-2 text-xs rounded-lg border text-center font-mono cursor-pointer ${
                      newProfileType === 'yaml'
                        ? 'border-[#8be9fd] bg-[#8be9fd]/20 text-[#8be9fd] font-bold'
                        : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4]'
                    }`}
                  >
                    YAML (.yaml)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProfileType('py')}
                    className={`p-2 text-xs rounded-lg border text-center font-mono cursor-pointer ${
                      newProfileType === 'py'
                        ? 'border-[#ffb86c] bg-[#ffb86c]/20 text-[#ffb86c] font-bold'
                        : 'border-[#44475a] bg-[#1e1f29] text-[#6272a4]'
                    }`}
                  >
                    Python (.py)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#44475a]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-[#44475a] px-3 py-1.5 text-xs text-[#6272a4] hover:text-[#f8f8f2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#bd93f9] px-4 py-1.5 text-xs font-bold text-[#1e1f29] hover:brightness-110 cursor-pointer"
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
