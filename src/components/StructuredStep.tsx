import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  FolderLock,
  ArrowRightLeft,
  XCircle,
  Loader2,
  Play,
  RotateCcw
} from 'lucide-react';
import { BossPayload, BossResponse, IntegrationSettings, IntegrationLog } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface StructuredStepProps {
  activePayload: BossPayload | null;
  activeResponse: BossResponse | null;
  onInjectPayload: (payload: BossPayload) => void;
  onCreateFolderPF: () => Promise<void>;
  onCreateFolderPJ: () => Promise<void>;
  isCreatingPF: boolean;
  isCreatingPJ: boolean;
  isAuthenticated: boolean;
  onLogin: () => void;
  settings: IntegrationSettings;
  logs: IntegrationLog[];
  onClearLogs: () => void;
  onAddLog: (type: 'info' | 'success' | 'error', message: string) => void;
  receiverStatus?: string;
  onClearReceiver?: () => void;
}

export function StructuredStep({
  activePayload,
  activeResponse,
  onInjectPayload,
  onCreateFolderPF,
  onCreateFolderPJ,
  isCreatingPF,
  isCreatingPJ,
  isAuthenticated,
  onLogin,
  settings,
  logs,
  onClearLogs,
  onAddLog,
  receiverStatus = 'Aguardando payload',
  onClearReceiver
}: StructuredStepProps) {
  const [queueRequests, setQueueRequests] = useState<any[]>([]);
  const [queueStatus, setQueueStatus] = useState<'Aguardando' | 'Ativo' | 'Erro'>('Ativo');

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'googleDriveRequests'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setQueueRequests(items);
        setQueueStatus('Ativo');
      }, (err) => {
        console.error("Erro ao assinar fila Firestore:", err);
        setQueueStatus('Erro');
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Erro ao setup da fila Firestore:", e);
      setQueueStatus('Erro');
    }
  }, []);

  const latestReq = queueRequests[0] || null;

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

  const handleCopyResponse = () => {
    if (!activeResponse) return;
    const text = JSON.stringify(activeResponse, null, 2);
    navigator.clipboard.writeText(text)
      .then(() => {
        onAddLog('success', 'Último retorno copiado com sucesso.');
      })
      .catch(() => {
        onAddLog('error', 'Falha ao copiar retorno.');
      });
  };

  const handleCopyPayload = () => {
    if (!activePayload) {
      onAddLog('error', 'Nenhum payload ativo para copiar.');
      return;
    }
    const text = JSON.stringify(activePayload, null, 2);
    navigator.clipboard.writeText(text)
      .then(() => {
        onAddLog('success', 'Último payload do Portal BOSS copiado com sucesso.');
      })
      .catch(() => {
        onAddLog('error', 'Falha ao copiar payload.');
      });
  };

  return (
    <div id="structured-step-container" className="space-y-6">
      
      {/* Top Banner and Description */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-250 pb-5 gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-blue-600" />
            Integração Operacional Google Drive — Portal BOSS
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ponte operacional para criação de pastas e retorno automatizado de contratos para o Portal BOSS.
          </p>
        </div>
      </div>

      {/* SEÇÃO: FILA FIRESTORE — SOLICITAÇÕES DO PORTAL BOSS */}
      <div id="firestore-queue-section" className="bg-white border border-slate-205 rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
              <ArrowRightLeft className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase font-sans">
                Fila Firestore — Requests do Portal BOSS
              </h2>
              <p className="text-[10px] text-slate-450 mt-0.5">
                Escuta de fila automatizada de solicitações provenientes das ações do Portal BOSS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Status da Fila:</span>
            {queueStatus === 'Ativo' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black shadow-3xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                DURÁVEL & ATIVO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-250 rounded-full text-xs font-black shadow-3xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                ERRO DE FILA
              </span>
            )}
          </div>
        </div>

        {/* ÚLTIMO PAYLOAD RECEBIDO / PROCESSADO */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
            ÚLTIMA SOLICITAÇÃO RECEBIDA
          </h3>

          {latestReq ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Tipo de Cliente</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {latestReq.clientType === 'PJ' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Building className="w-3.5 h-3.5 mr-0.5" /> PJ (Jurídico)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <User className="w-3.5 h-3.5 mr-0.5" /> PF (Físico)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs col-span-1 lg:col-span-2">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Nome Recebido</div>
                  <div className="text-xs font-extrabold text-slate-800 truncate mt-1" title={latestReq.clientFolderName}>
                    {latestReq.clientFolderName || 'Não informado'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Status da Solicitação</div>
                  <div className="mt-1">
                    {latestReq.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-705 border border-slate-350 shadow-3xs">
                        AGUARDANDO
                      </span>
                    )}
                    {latestReq.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-3xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 mr-0.5" /> PROCESSANDO
                      </span>
                    )}
                    {latestReq.status === 'success' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-3xs">
                        SUCESSO
                      </span>
                    )}
                    {latestReq.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-3xs">
                        FALHA
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs font-mono">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">portalClientId</div>
                  <div className="text-xs font-semibold text-slate-700 truncate mt-1" title={latestReq.portalClientId}>
                    {latestReq.portalClientId || 'N/A'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs font-mono">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">caseId</div>
                  <div className="text-xs font-semibold text-slate-700 truncate mt-1" title={latestReq.caseId}>
                    {latestReq.caseId || 'N/A'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs font-mono col-span-1 lg:col-span-2">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Criação / Processamento</div>
                  <div className="text-[10px] text-slate-600 mt-1 whitespace-pre-wrap leading-tight">
                    Criação: <span className="font-semibold text-slate-800">{latestReq.createdAt ? new Date(latestReq.createdAt).toLocaleString('pt-BR') : 'N/A'}</span>
                    {latestReq.processedAt && (
                      <>
                        <br />
                        Processamento: <span className="font-semibold text-slate-800">{new Date(latestReq.processedAt).toLocaleString('pt-BR')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Erro exibido visualmente, se houver */}
              {(latestReq.status === 'failed' || latestReq.googleDriveClientFolderLogFalha) && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2 animate-fade-in font-sans">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Log de falha:</span> {latestReq.googleDriveClientFolderLogFalha || latestReq.error || 'Erro genérico durante a operação automática no Google Drive.'}
                  </div>
                </div>
              )}
            </div>
          ) : queueStatus === 'Erro' ? (
            <div className="py-6 text-center text-slate-450 rounded-lg bg-rose-50/20 border border-rose-200 border-dashed p-4">
              <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto mb-1 animate-bounce" />
              <span className="text-xs font-black text-rose-800 block uppercase">Fila Firestore Indisponível</span>
              <span className="text-[10px] text-slate-500 block max-w-sm mx-auto mt-1 leading-relaxed">
                Não foi possível subscrever a fila Firestore. Isso geralmente ocorre se o Banco de Dados Firestore ainda não foi totalmente provisionado pelo console do Firebase do applet. 
              </span>
              <span className="text-[9.5px] text-indigo-600 block max-w-sm mx-auto mt-2 leading-relaxed font-semibold">
                Dica: Vá até a aba "Laudo & Vistoria Técnica" no menu lateral esquerdo para auditar todos os canais de integração em profundidade de forma instantânea!
              </span>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-450 rounded-lg bg-white border border-slate-200 border-dashed">
              <AlertTriangle className="w-5 h-5 text-slate-350 mx-auto mb-1" />
              <span className="text-xs font-bold text-slate-600 block">Fila vazia...</span>
              <span className="text-[10px] text-slate-400 block max-w-sm mx-auto mt-0.5">
                Nenhuma solicitação pendente ou processada na coleção Firestore `googleDriveRequests`.
              </span>
            </div>
          )}
        </div>

        {/* LISTA COMPLETA DOS DOCUMENTOS DA FILA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lista Geral (Últimos itens)</h4>
            <span className="text-[10px] text-slate-400 font-bold font-mono">Contagem: {queueRequests.length}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-3xs max-h-[220px] overflow-y-auto">
            {queueRequests.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic bg-white">Sem transações rastreadas.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase font-sans">
                    <th className="p-3">portalClientId</th>
                    <th className="p-3">Pasta Solicitada</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-700">{req.portalClientId || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-800 truncate max-w-[200px]" title={req.clientFolderName}>
                        {req.clientFolderName || 'Sem nome'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${req.clientType === 'PJ' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                          {req.clientType}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {req.status === 'pending' && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[9px]">PENDENTE</span>}
                        {req.status === 'processing' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold text-[9px]">PROCESSANDO</span>}
                        {req.status === 'success' && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">SUCESSO</span>}
                        {req.status === 'failed' && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[9px]">FALHA</span>}
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono text-[10px]">
                        {req.createdAt ? new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Main Operational tracks (PF/PJ) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Track 1: Pessoa Física (PF) Flow */}
        <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative">
          {activePayload?.clientType !== 'PF' && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs rounded-xl flex items-center justify-center p-6 text-center z-10 select-none">
              <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <User className="w-5 h-5 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-600">Fluxo Pessoa Física Bloqueado</h4>
                <p className="text-[10px] text-slate-400 max-w-xs">Ativo somente quando o payload do Portal BOSS for do tipo PF.</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                <User className="w-4 h-4 text-blue-500" />
                1. Fluxo Pessoa Física (PF)
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">pfDadosPessoais</span>
            </div>

            <div className="space-y-3 pt-3">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="text-[10px] font-bold text-slate-450 uppercase tracking-tight">Nome Recebido (nomeCompleto)</div>
                <div className="text-xs font-bold text-slate-800 mt-1">{activePayload?.clientType === 'PF' ? activePayload.clientFolderName : 'Nenhum'}</div>
              </div>

              {/* Validation */}
              <div className="text-[11px] leading-relaxed space-y-2">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Critérios de Validação PF:</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${activePayload?.clientType === 'PF' && activePayload.clientFolderName ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className="text-[11px] text-slate-600">Nome completo importado: <strong>{activePayload?.clientType === 'PF' ? activePayload.clientFolderName : 'Aguardando PF'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="text-[11px] text-slate-600">Status Google Drive Conectado: <strong>{isAuthenticated ? 'Conectado' : 'Não autenticado'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-emerald-800 leading-tight block">
                    ❇️ Regra Anti-duplicidade Ativa:<br />
                    O sistema buscará pastas existentes antes de criar nova pasta.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onCreateFolderPF}
              disabled={isCreatingPF || !isAuthenticated || activePayload?.clientType !== 'PF'}
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
          {activePayload?.clientType !== 'PJ' && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs rounded-xl flex items-center justify-center p-6 text-center z-10 select-none">
              <div className="space-y-1.5 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Building className="w-5 h-5 text-slate-450 mx-auto" />
                <h4 className="text-xs font-bold text-slate-600">Fluxo Pessoa Jurídica Bloqueado</h4>
                <p className="text-[10px] text-slate-400 max-w-xs">Ativo somente quando o payload do Portal BOSS for do tipo PJ.</p>
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
                <div className="text-[10px] font-bold text-slate-450 uppercase tracking-tight">Nome Fantasia Recebido (clientFolderName)</div>
                <div className="text-xs font-bold text-slate-800 mt-1">{activePayload?.clientType === 'PJ' ? activePayload.clientFolderName : 'Nenhum'}</div>
              </div>

              {/* Validation indicators */}
              <div className="text-[11px] leading-relaxed space-y-2">
                <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Critérios de Validação PJ:</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${activePayload?.clientType === 'PJ' && activePayload.clientFolderName ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className="text-[11px] text-slate-600">Nome fantasia / Razão social: <strong>{activePayload?.clientType === 'PJ' ? activePayload.clientFolderName : 'Aguardando PJ'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="text-[11px] text-slate-600">Status Google Drive Conectado: <strong>{isAuthenticated ? 'Conectado' : 'Não autenticado'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-emerald-800 leading-tight block">
                    ❇️ Regra Anti-duplicidade Ativa:<br />
                    O sistema buscará pastas existentes antes de criar nova pasta.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onCreateFolderPJ}
              disabled={isCreatingPJ || !isAuthenticated || activePayload?.clientType !== 'PJ'}
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
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Criar Pasta — Pessoa Jurídica</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* SEÇÃO 7: RETORNO VISUAL — ÚLTIMO RETORNO GERADO */}
      {activeResponse && (
        <div id="visual-return-section" className="bg-slate-900 rounded-xl p-5 border border-slate-955 shadow-md space-y-4 animate-fade-in text-white/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-2 font-sans">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>ÚLTIMO RETORNO GERADO</span>
            </h3>
            <button
              onClick={handleCopyResponse}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar retorno gerado
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status do processamento */}
            <div className="bg-slate-950/45 p-3.5 rounded-lg border border-slate-800 font-sans space-y-1 shadow-2xs">
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Status do Processamento</div>
              <div className="mt-1">
                {activeResponse.googleDriveStatus === 'success' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-955/60 border border-emerald-800 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    SUCESSO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-955/60 border border-rose-800 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    FALHA
                  </span>
                )}
              </div>
            </div>

            {/* Tipo de Operação */}
            <div className="bg-slate-950/45 p-3.5 rounded-lg border border-slate-800 font-sans space-y-1 shadow-2xs">
              <div className="text-[9px] text-slate-505 uppercase font-black tracking-wider">Tipo de Operação</div>
              <div className="mt-1">
                {activeResponse.googleDriveOperation === 'created' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-950/50 border border-blue-900 text-blue-400">
                    Criado (Nova Pasta)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-955/50 border border-amber-900 text-amber-400">
                    Localizado (Regra anti-duplicidade)
                  </span>
                )}
              </div>
            </div>

            {/* Nome da pasta criada/localizada */}
            <div className="bg-slate-950/45 p-3.5 rounded-lg border border-slate-800 font-sans space-y-1 shadow-2xs">
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Nome da pasta criada/localizada</div>
              <div className="text-xs font-bold text-slate-200 truncate mt-1" title={activeResponse.googleDriveClientFolderName}>
                {activeResponse.googleDriveClientFolderName || 'N/A'}
              </div>
            </div>

            {/* ID da pasta no Google Drive */}
            <div className="bg-slate-950/45 p-3.5 rounded-lg border border-slate-800 font-mono col-span-1 lg:col-span-2 space-y-1 shadow-2xs">
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider">ID ( UID ) da pasta no Google Drive</div>
              <div className="text-[11px] font-bold text-emerald-400 truncate mt-1" title={activeResponse.googleDriveClientFolderId}>
                {activeResponse.googleDriveClientFolderId || 'N/A'}
              </div>
            </div>

            {/* recebidoEm */}
            <div className="bg-slate-950/45 p-3.5 rounded-lg border border-slate-800 font-sans space-y-1 shadow-2xs">
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider">recebidoEm (Data/Hora do Retorno)</div>
              <div className="text-xs font-bold text-slate-300 font-mono truncate mt-1">
                {activeResponse.recebidoEm ? new Date(activeResponse.recebidoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          {/* URL do Google Drive & Log da Operação */}
          <div className="bg-slate-955 p-4 rounded border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
              <div className="text-[9.5px] text-slate-450 uppercase font-black font-mono">
                Log da operação
              </div>
              {activeResponse.googleDriveClientFolderUrl && (
                <a
                  href={activeResponse.googleDriveClientFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-350 hover:underline flex items-center gap-1 font-sans font-bold"
                >
                  Abrir URL do Google Drive <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            
            <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded text-xs text-slate-200 leading-relaxed font-sans font-medium">
              ❇️ <strong className="text-emerald-400">{activeResponse.googleDriveClientFolderResultLog || 'Ação concluída com sucesso com o Portal BOSS.'}</strong>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <div className="text-[9px] text-slate-505 uppercase font-bold tracking-wider mb-2">
              CONTEÚDO JSON DE RETORNO INTEGRAL
            </div>
            <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto overflow-y-auto max-h-[120px] whitespace-pre-wrap leading-tight">{JSON.stringify(activeResponse, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Terminal / Live Feed for UI feedback */}
      <div id="quick-logs" className="bg-slate-900 rounded-xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-350 font-mono">LOGS DE COMUNICAÇÃO PORTAL BOSS ↔ GOOGLE DRIVE</h2>
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
              className="text-[10px] text-slate-505 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
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
                <span className={`font-semibold shrink-0 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
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
