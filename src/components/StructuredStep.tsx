import React, { useState } from 'react';
import { 
  FolderPlus, 
  ExternalLink,
  CheckCircle, 
  AlertTriangle, 
  User, 
  Building, 
  PlusCircle,
  FileCheck,
  FolderOpen,
  Terminal,
  Trash2,
  Copy,
  HelpCircle,
  FolderLock
} from 'lucide-react';
import { Client, IntegrationSettings, IntegrationLog } from '../types';

interface StructuredStepProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  onCreateFolderPF: (clientId: string) => Promise<void>;
  onCreateFolderPJ: (clientId: string) => Promise<void>;
  isCreatingPF: boolean;
  isCreatingPJ: boolean;
  isAuthenticated: boolean;
  onLogin: () => void;
  onAddClient: (client: Client) => void;
  onRestoreMocks: () => void;
  settings: IntegrationSettings;
  logs: IntegrationLog[];
  onClearLogs: () => void;
  onAddLog: (type: 'info' | 'success' | 'error', message: string) => void;
}

export function StructuredStep({
  clients,
  selectedClientId,
  onSelectClient,
  onCreateFolderPF,
  onCreateFolderPJ,
  isCreatingPF,
  isCreatingPJ,
  isAuthenticated,
  onLogin,
  onAddClient,
  onRestoreMocks,
  settings,
  logs,
  onClearLogs,
  onAddLog
}: StructuredStepProps) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [newType, setNewType] = useState<'PF' | 'PJ'>('PF');
  const [newNome, setNewNome] = useState('');
  const [newRazao, setNewRazao] = useState('');
  const [newFantasia, setNewFantasia] = useState('');
  const [newDoc, setNewDoc] = useState('');

  const handleSelectMockPJ = () => {
    const pjClients = (clients || []).filter(c => c && c.type === 'PJ');
    // prefer client PJ that has nomeFantasia prefilled
    const target = pjClients.find(c => c.nomeFantasia && c.nomeFantasia.trim() !== '') || pjClients[0];
    if (target) {
      onSelectClient(target.id);
      onAddLog('success', 'Mock de Pessoa Jurídica selecionado para teste com sucesso.');
    } else {
      onAddLog('error', 'Nenhum cliente Pessoa Jurídica cadastrado no sistema.');
    }
  };

  const validClients = (clients || []).filter(c => c && typeof c === 'object' && c.id);
  const activeClient = validClients.find(c => c.id === selectedClientId) || validClients[0];

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newType === 'PF' && !newNome.trim()) return;
    if (newType === 'PJ' && !newFantasia.trim() && !newRazao.trim()) return;

    const newClient: Client = {
      id: `client_${Date.now()}`,
      type: newType,
      nomeCompleto: newType === 'PF' ? newNome.trim() : '',
      razaoSocial: newType === 'PJ' ? (newRazao.trim() || newFantasia.trim()) : undefined,
      nomeFantasia: newType === 'PJ' ? newFantasia.trim() : undefined,
      documento: newDoc.trim() || (newType === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'),
    };

    onAddClient(newClient);
    onSelectClient(newClient.id);
    setShowAddClient(false);
    
    // reset form
    setNewNome('');
    setNewRazao('');
    setNewFantasia('');
    setNewDoc('');
  };

  // Human-friendly client name Resolver
  const getClientDisplayName = (client: Client) => {
    if (!client) return 'Selecione';
    if (client.type === 'PF') {
      return client.nomeCompleto || 'Sem Nome PF';
    } else {
      return client.nomeFantasia || client.razaoSocial || 'Sem Nome Fantasia PJ';
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) {
      onAddLog('error', 'Não há logs para copiar.');
      return;
    }
    const text = logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        onAddLog('success', 'Logs copiados para a área de transferência com sucesso.');
      })
      .catch((err) => {
        onAddLog('error', `Falha ao copiar logs: ${err.message || err}`);
      });
  };

  return (
    <div id="structured-step-container" className="space-y-6">
      
      {/* Top Banner & Client Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-blue-600" />
            Criar Pasta do Cliente no Google Drive
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Módulo simulador para dados do Portal BOSS. Crie pastas isoladas para PF e PJ sem conflito de gatilhos.
          </p>
        </div>

        {/* Client Selection tool rail */}
        <div id="client-selection-bar" className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex-1 lg:flex-none">
            <select
              value={selectedClientId}
              onChange={(e) => onSelectClient(e.target.value)}
              className="w-full lg:w-64 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-700 transition-all cursor-pointer"
            >
              {validClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.type === 'PF' ? `[PF] ${c.nomeCompleto}` : `[PJ] ${c.nomeFantasia || c.razaoSocial}`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSelectMockPJ}
            className="p-2 border border-emerald-200 hover:border-emerald-400 text-emerald-800 hover:bg-emerald-50 rounded-lg transition-all flex items-center justify-center cursor-pointer font-bold gap-1 text-xs"
            title="Selecionar Mock PJ para Teste"
          >
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selecionar Mock PJ</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddClient(!showAddClient)}
            className="p-2 border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer font-bold gap-1 text-xs"
            title="Adicionar Novo Cliente para Teste"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simular Cadastro</span>
          </button>
          <button
            type="button"
            onClick={onRestoreMocks}
            className="p-2 border border-amber-200 hover:border-amber-400 text-amber-800 hover:bg-amber-50 rounded-lg transition-all flex items-center justify-center cursor-pointer font-bold gap-1 text-xs"
            title="Restaurar mocks de teste originais"
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Restaurar Mocks</span>
          </button>
        </div>
      </div>

      {/* Add Client Simulator Modal / Form */}
      {showAddClient && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Simular Novo Cadastro (Do Portal BOSS)
          </h3>
          <form onSubmit={handleCreateClientSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de Cliente</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('PF')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${newType === 'PF' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('PJ')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${newType === 'PJ' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>
            </div>

            {newType === 'PF' ? (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Nome Completo (nomeCompleto)</label>
                <input
                  type="text"
                  required
                  placeholder="Roberto Giffoni"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-slate-700"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Nome Fantasia (nomeFantasia)</label>
                  <input
                    type="text"
                    required
                    placeholder="Giffoni Connect"
                    value={newFantasia}
                    onChange={(e) => setNewFantasia(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Razão Social (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Giffoni Connect Empreendimentos LTDA"
                    value={newRazao}
                    onChange={(e) => setNewRazao(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-slate-700"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Doc CPF / CNPJ</label>
              <input
                type="text"
                placeholder="Ex: 123.456.789-00"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-slate-700"
              />
            </div>

            <div className="col-span-1 md:col-span-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddClient(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Incluir Cadastro na Fila do BOSS
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Core Fields Grid: Imported and Created targets */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <span>Informações do Mapeamento de Pastas (Google Drive Connect)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Imported Client Frame */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
            <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Nome de Cadastro do Portal BOSS</div>
            <div className="text-xs font-bold text-slate-800 truncate" title={getClientDisplayName(activeClient)}>
              {getClientDisplayName(activeClient)}
            </div>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm block w-fit">
              Tipo: {activeClient?.type || 'Não selecionado'}
            </span>
          </div>

          {/* Dest folder */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
            <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Nome da Pasta Destino</div>
            <div className="text-xs font-bold text-slate-700 truncate font-mono">
              {settings.googleDriveDestinationFolderName || 'clientes "office"'}
            </div>
            <span className="text-[9px] text-slate-400 block truncate font-mono">
              ID: {settings.googleDriveDestinationFolderId || 'Pendente de Localização'}
            </span>
          </div>

          {/* Dest ID */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs col-span-1 md:col-span-1">
            <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">UID da pasta destino</div>
            <div className="text-xs font-mono font-semibold text-slate-600 truncate">
              {settings.googleDriveDestinationFolderId || 'Não Definido'}
            </div>
            {settings.googleDriveDestinationFolderUrl ? (
              <a
                href={settings.googleDriveDestinationFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[9.5px] text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
              >
                Link da pasta destino <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="text-[9px] text-slate-300">Nenhum Link Salvo</span>
            )}
          </div>

          {/* Created client folder fields */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
            <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Dados da Pasta Criada</div>
            <div className="text-xs font-bold text-slate-800 truncate font-mono">
              {activeClient?.googleDriveClientFolderName || <span className="text-slate-400 italic">Pendente</span>}
            </div>
            <div className="text-[9px] text-slate-400 font-mono truncate">
              UID: {activeClient?.googleDriveClientFolderId || 'Pasta não criada'}
            </div>
            {activeClient?.googleDriveClientFolderUrl && (
              <a
                href={activeClient.googleDriveClientFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5 mt-1"
              >
                Abrir Pasta no Drive <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Main Operational Panel Splitted into Two Separate Tracks (Rule Anti-Bug & Anti-Duplicidade) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Track 1: Pessoa Física (PF) Flow */}
        <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative">
          {activeClient?.type !== 'PF' && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs rounded-xl flex items-center justify-center p-6 text-center z-10">
              <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <User className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Selecione Cliente Pessoa Física</h4>
                <p className="text-[10px] text-slate-400 max-w-xs">Essa seção é dedicada estritamente ao processamento de PFs.</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <User className="w-4 h-4 text-blue-500" />
                1. Fluxo Pessoa Física (PF)
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">pfDadosPessoais</span>
            </div>

            <div className="space-y-3 pt-3">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nome Recebido (nomeCompleto)</div>
                <div className="text-xs font-bold text-slate-800 mt-1">{activeClient?.type === 'PF' ? activeClient.nomeCompleto : 'Nenhum'}</div>
              </div>

              {/* Anti-duplicity and validations indicator */}
              <div className="text-[11px] leading-relaxed space-y-2">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Critérios de Validação PF:</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${activeClient?.nomeCompleto ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="text-[11px] text-slate-600">Importação de Nome Ativo: <strong>{activeClient?.nomeCompleto || 'Inexistente'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="text-[11px] text-slate-600">Status Google Drive Conectado: <strong>{isAuthenticated ? 'Conectado' : 'Não autenticado'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                  {activeClient?.googleDriveClientFolderId ? (
                    <span className="text-amber-800 leading-tight block">
                      ⚠️ Rule Anti-duplicidade:<br />
                      <strong>Pasta do cliente já criada e vinculada.</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-800 leading-tight block">
                      ❇️ Pronto:<br />
                      Nenhuma pasta ativa detectada para este cadastro. Pronto para criar.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onCreateFolderPF(activeClient?.id)}
              disabled={isCreatingPF || !isAuthenticated || activeClient?.googleDriveStatus === 'linked' || activeClient?.googleDriveStatus === 'created'}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-100 disabled:hover:bg-slate-100 disabled:text-slate-400 font-bold text-xs py-2.5 rounded-lg text-white transition-all cursor-pointer select-none"
            >
              {isCreatingPF ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Mapeando pasta de Pessoa Física...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Criar Pasta — Pessoa Física</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Track 2: Pessoa Jurídica (PJ) Flow */}
        <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative">
          {activeClient?.type !== 'PJ' && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs rounded-xl flex items-center justify-center p-6 text-center z-10">
              <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Building className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Selecione Cliente Pessoa Jurídica</h4>
                <p className="text-[10px] text-slate-400 max-w-xs">Essa seção é dedicada estritamente ao processamento de PJs.</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building className="w-4 h-4 text-emerald-600" />
                2. Fluxo Pessoa Jurídica (PJ)
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-150 font-mono">pjDadosEmpresa</span>
            </div>

            <div className="space-y-3 pt-3">
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="text-[10px] font-bold text-slate-450 uppercase tracking-tight">Nome Fantasia Recebido (nomeFantasia)</div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {activeClient?.type === 'PJ' ? (
                    activeClient.nomeFantasia?.trim() ? (
                      activeClient.nomeFantasia
                    ) : activeClient.razaoSocial?.trim() ? (
                      <div>
                        <div>{activeClient.razaoSocial}</div>
                        <span className="text-[9px] font-medium text-amber-600 block mt-0.5">
                          usando razão social como fallback
                        </span>
                      </div>
                    ) : (
                      <span className="text-rose-500 font-semibold text-[11px]">Nenhum dado PJ recebido</span>
                    )
                  ) : (
                    'Nenhum'
                  )}
                </div>
              </div>

              {/* Anti-duplicity and validations indicator for PJ */}
              <div className="text-[11px] leading-relaxed space-y-2">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Critérios de Validação PJ:</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${(activeClient?.nomeFantasia?.trim() || activeClient?.razaoSocial?.trim()) ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="text-[11px] text-slate-600">
                    Importação de Nome PJ: <strong>
                      {activeClient?.nomeFantasia?.trim() 
                        ? activeClient.nomeFantasia 
                        : activeClient?.razaoSocial?.trim() 
                          ? `${activeClient.razaoSocial} (Razão Social)` 
                          : 'Inexistente'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="text-[11px] text-slate-600">Status Google Drive Conectado: <strong>{isAuthenticated ? 'Conectado' : 'Não autenticado'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                  {activeClient?.googleDriveClientFolderId ? (
                    <span className="text-amber-800 leading-tight block">
                      ⚠️ Rule Anti-duplicidade:<br />
                      <strong>Pasta do cliente já criada e vinculada.</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-800 leading-tight block">
                      ❇️ Pronto:<br />
                      Nenhuma pasta activa detectada para este cadastro. Pronto para criar.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action button for PJ */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onCreateFolderPJ(activeClient?.id)}
              disabled={
                isCreatingPJ || 
                !isAuthenticated || 
                activeClient?.googleDriveStatus === 'linked' || 
                activeClient?.googleDriveStatus === 'created' ||
                !(activeClient?.nomeFantasia?.trim() || activeClient?.razaoSocial?.trim())
              }
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-100 disabled:hover:bg-slate-100 disabled:text-slate-400 font-bold text-xs py-2.5 rounded-lg text-white transition-all cursor-pointer select-none"
            >
              {isCreatingPJ ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Mapeando pasta de Pessoa Jurídica...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5 animate-pulse" />
                  <span>Criar Pasta — Pessoa Jurídica</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Terminal / Live Feed specifically for UI feedback */}
      <div id="quick-logs" className="bg-slate-900 rounded-xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-350 font-mono">Logs de Operação</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLogs}
              className="text-[10px] text-slate-400 hover:text-blue-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3 text-slate-400" />
              Copiar Logs
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Limpar Logs
            </button>
          </div>
        </div>

        <div className="font-mono text-[10px] max-h-[140px] overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-4 select-none">
              Console livre de erros. Processos assíncronos prontos.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-500">[{log.timestamp}]</span>
                <span className={`font-semibold shrink-0 ${log.type === 'error' ? 'text-rose-450 text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
