import React, { useState } from 'react';
import { 
  FolderPlus, 
  ExternalLink,
  CheckCircle, 
  Info, 
  AlertTriangle, 
  User, 
  Building, 
  PlusCircle,
  FileCheck,
  FolderOpen
} from 'lucide-react';
import { Client } from '../types';

interface StructuredStepProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  onCreateFolder: (clientId: string) => Promise<void>;
  isCreating: boolean;
  isAuthenticated: boolean;
  onLogin: () => void;
  onAddClient: (client: Client) => void;
}

export function StructuredStep({
  clients,
  selectedClientId,
  onSelectClient,
  onCreateFolder,
  isCreating,
  isAuthenticated,
  onLogin,
  onAddClient
}: StructuredStepProps) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [newType, setNewType] = useState<'PF' | 'PJ'>('PF');
  const [newNome, setNewNome] = useState('');
  const [newRazao, setNewRazao] = useState('');
  const [newFantasia, setNewFantasia] = useState('');
  const [newDoc, setNewDoc] = useState('');

  const validClients = (clients || []).filter(c => c && typeof c === 'object' && c.id);
  const activeClient = validClients.find(c => c.id === selectedClientId) || validClients[0];

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newType === 'PF' && !newNome.trim()) return;
    if (newType === 'PJ' && !newRazao.trim() && !newFantasia.trim()) return;

    const newClient: Client = {
      id: `client_${Date.now()}`,
      type: newType,
      nomeCompleto: newType === 'PF' ? newNome.trim() : '',
      razaoSocial: newType === 'PJ' ? newRazao.trim() : undefined,
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

  // Determine the display name used for create
  const getClientDisplayName = (client: Client) => {
    if (!client) return '';
    if (client.type === 'PF') {
      return client.nomeCompleto || 'Cliente Sem Nome';
    } else if (client.type === 'PJ') {
      return client.nomeFantasia || client.razaoSocial || 'Empresa Sem Nome';
    }
    return client.nomeCompleto || client.nomeFantasia || client.razaoSocial || 'Nome Indisponível';
  };

  return (
    <div id="structured-step-container" className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2 animate-fade-in">
            <FileCheck className="w-4 h-4 text-blue-600" />
            Painel Operacional — BOSS Clientes
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Fluxo de Produção • <strong className="text-slate-700">Automação de Criar Pasta a partir do nome do cliente no cadastro</strong>
          </p>
        </div>

        {/* Client Selection */}
        <div id="client-selection-bar" className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <select
              value={selectedClientId}
              onChange={(e) => onSelectClient(e.target.value)}
              className="w-full md:w-64 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 transition-all cursor-pointer"
            >
              {validClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.type === 'PF' ? `[PF] ${c.nomeCompleto}` : `[PJ] ${c.nomeFantasia || c.razaoSocial}`}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAddClient(!showAddClient)}
            className="p-2 border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Cadastrar Cliente de Teste"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Client Simulator Modal / Form */}
      {showAddClient && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Simulador: Cadastrar Novo Cliente</h3>
          <form onSubmit={handleCreateClientSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de Cadastro</label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Giffoni"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Razão Social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Giffoni Connect Serviços LTDA"
                    value={newRazao}
                    onChange={(e) => setNewRazao(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Fantasia (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Giffoni Connect"
                    value={newFantasia}
                    onChange={(e) => setNewFantasia(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Documento (CPF / CNPJ)</label>
              <input
                type="text"
                placeholder="Ex: 12.345.678/0001-99"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-end justify-end gap-2">
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
                Cadastrar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Client Summary */}
      {activeClient && (
        <div id="active-client-card" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                {activeClient.type === 'PF' ? (
                  <User className="w-4 h-4 text-slate-500" />
                ) : (
                  <Building className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">
                    {getClientDisplayName(activeClient)}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {activeClient.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Inscrição Ativa: {activeClient.documento}</p>
              </div>
            </div>

            {/* Simulated Data Status inside Flow */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 self-stretch md:self-auto text-center md:text-left">
              <div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Drive Status</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {activeClient.googleDriveStatus === 'created' && <span className="text-blue-600 font-bold uppercase">Criado</span>}
                  {activeClient.googleDriveStatus === 'linked' && <span className="text-emerald-600 font-bold uppercase">Vinculado</span>}
                  {!activeClient.googleDriveStatus && <span className="text-slate-500 uppercase font-semibold">Pendente</span>}
                </div>
              </div>
              <div className="col-span-1 md:col-span-3">
                <div className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Mapeador de Data</div>
                <div className="text-xs text-slate-600 mt-0.5 font-semibold truncate max-w-[180px]" title={activeClient.googleDriveCreatedAt}>
                  {activeClient.googleDriveCreatedAt ? new Date(activeClient.googleDriveCreatedAt).toLocaleString('pt-BR') : 'Sem registro prévio'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Flow Tracker with elegant dashed design wrapper */}
      <div id="flow-milestones" className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        
        {/* Left Column: Flow Milestones Step Indicator Checklist */}
        <div className="col-span-1 md:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Marcos do Fluxo 1.6</h3>

            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-750">1.6.1 — Coleta Societária</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Cadastro, Contrato Social e Balanços recolhidos prontas.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-60">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-750">1.6.2 — Perfis Operacionais</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Mapeamento de papéis estabelecidos no Portal BOSS.</p>
                </div>
              </div>

              <div className="flex items-start gap-1 pr-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 shrink-0 animate-ping"></div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">1.6.3 — Criação do Repositório</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Mecanismo automatizado ativo para o cliente selecionado.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-40">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">1.6.4 — Faturamento Integrado</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Faturamento e emissão fiscal programados pós-estruturação.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Operational Panel "Google Drive do Cliente" in high fidelity dashed wrapper */}
        <div className="col-span-1 md:col-span-7">
          {activeClient ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              
              <div className="flex items-center gap-2 pb-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                  1.6
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm tracking-tight">Operacional: Estruturação</h2>
                  <p className="text-[10px] text-slate-400">Modulo de sincronização em lote da Nuvem BOSS</p>
                </div>
              </div>

              {/* Sub-card styled like design draft */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Google Drive do Cliente</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Integração corporativa direta com o cadastro Giffoni Connect</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-1.5 rounded-lg text-blue-600">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 p-3 rounded-lg">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Cliente Selecionado</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 truncate max-w-[200px]" title={getClientDisplayName(activeClient)}>
                      {getClientDisplayName(activeClient)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-lg">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Tipo de Pessoa</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {activeClient?.type === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
                    </div>
                  </div>
                </div>

                {/* State handling with professional touch */}
                {activeClient?.googleDriveStatus ? (
                  <div className="bg-white border border-slate-100 rounded-lg p-4 text-center space-y-3 shadow-inner">
                    <div className="flex flex-col items-center justify-center">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        PASTA INTEGRADA E ATIVA
                      </span>
                      <p className="text-[11px] text-slate-500 mt-2 max-w-sm">
                        O diretório foi localizado ou criado e seu link persistente indexado ao registro do cliente no Portal BOSS.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded border border-slate-150">
                      <span className="block truncate max-w-[190px]">ID: {activeClient?.googleDriveClientFolderId}</span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span>Status: Conectado</span>
                    </div>

                    <div className="pt-1 flex justify-center">
                      <a
                        href={activeClient.googleDriveClientFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-slate-900 border border-slate-950 text-white font-bold text-xs px-5 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Pasta no Drive</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 bg-white border border-slate-100 rounded-lg shadow-inner">
                    <div className="text-center mb-4 px-4">
                      <p className="text-xs text-slate-500 max-w-sm">
                        A pasta será nomeada automaticamente como <strong>"{getClientDisplayName(activeClient)}"</strong> nos servidores integrados do Giffoni Connect.
                      </p>
                    </div>

                    {!isAuthenticated ? (
                      <div className="px-4 w-full">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-md mx-auto">
                          <span className="leading-tight flex items-center gap-1.5 font-medium">
                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                            Google Drive necessita de login active para esta ação.
                          </span>
                          <button
                            onClick={onLogin}
                            className="bg-amber-600 text-white hover:bg-amber-700 px-3 py-1 bg-gradient-to-r hover:bg-gradient-to-l font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 shrink-0"
                          >
                            Conectar Conta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onCreateFolder(activeClient.id)}
                        disabled={isCreating}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-950 text-white px-6 py-2.5 rounded-lg font-bold text-xs hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-slate-900/10"
                      >
                        {isCreating ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2055/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processando pasta...</span>
                          </>
                        ) : (
                          <>
                            <FolderPlus className="w-3.5 h-3.5 text-slate-300" />
                            <span>Criar Pasta do Cliente</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Conditional Success / Trace Representation footer block */}
                <div className={`flex items-center justify-between pt-1 select-none transition-opacity duration-300 ${activeClient?.googleDriveStatus ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeClient?.googleDriveStatus ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeClient?.googleDriveStatus 
                        ? `ID: ${activeClient?.googleDriveClientFolderId?.slice(0, 16)}...`
                        : 'ID: Pendente de geração'}
                    </span>
                  </div>
                  {activeClient?.googleDriveStatus && (
                    <a 
                      href={activeClient?.googleDriveClientFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-500 font-bold underline cursor-pointer hover:text-slate-800"
                    >
                      Ver detalhes no painel Drive
                    </a>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-center min-h-[300px]">
              <div className="text-center text-slate-400 p-8">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">Nenhum cliente selecionado</p>
                <p className="text-[10px] text-slate-400 mt-1">Insira um cadastro pelo formulário de simulação.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
