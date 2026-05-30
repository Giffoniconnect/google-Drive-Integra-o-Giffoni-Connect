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
  const [showSimulator, setShowSimulator] = useState(false);
  const [showManualPayload, setShowManualPayload] = useState(true);
  
  // Local simulator custom fields
  const [simType, setSimType] = useState<'PF' | 'PJ'>('PF');
  const [simName, setSimName] = useState('Roberto Giffoni');
  const [simDoc, setSimDoc] = useState('123.456.789-00');
  const [simId, setSimId] = useState('pb_client_pf_9012');

  const [manualPayloadStr, setManualPayloadStr] = useState<string>(
    JSON.stringify({
      clientType: "PF",
      portalClientId: "client_manual_9988",
      caseId: "case_manual_5566",
      clientFolderName: "Empreendimento Giffoni de Teste",
      originBlock: "pfDadosPessoais",
      originField: "nomeCompleto"
    }, null, 2)
  );
  const [isProcessingManual, setIsProcessingManual] = useState(false);

  const handleProcessManualPayload = async () => {
    try {
      setIsProcessingManual(true);
      onAddLog('info', 'Iniciando processamento manual do payload...');
      
      let parsed;
      try {
        parsed = JSON.parse(manualPayloadStr);
      } catch (err: any) {
        onAddLog('error', `JSON inválido no payload manual: ${err.message}`);
        setIsProcessingManual(false);
        return;
      }

      onAddLog('info', 'Enviando chamada POST em lote para o receiver real `/api/create-folder`...');
      
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsed)
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status})`);
      }

      const data = await response.json();
      onAddLog('success', 'Payload manual recebido e processado via /api/create-folder!');
    } catch (e: any) {
      onAddLog('error', `Falha ao processar payload manual: ${e.message || e}`);
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handleSimulateInjection = (typeOverride?: 'PF' | 'PJ') => {
    const currentType = typeOverride || simType;
    let payload: BossPayload;

    if (currentType === 'PF') {
      payload = {
        sourceBuild: 'Portal BOSS Clientes',
        clientType: 'PF',
        portalClientId: simId.trim() || 'pb_client_pf_9012',
        clientFolderName: simName.trim() || 'Roberto Giffoni',
        originBlock: 'pfDadosPessoais',
        originField: 'nomeCompleto'
      };
    } else {
      payload = {
        sourceBuild: 'Portal BOSS Clientes',
        clientType: 'PJ',
        portalClientId: simId.trim() === 'pb_client_pf_9012' ? 'pb_client_pj_5678' : (simId.trim() || 'pb_client_pj_5678'),
        clientFolderName: simName.trim() === 'Roberto Giffoni' ? 'Giffoni Connect' : (simName.trim() || 'Giffoni Connect'),
        razaoSocial: 'Giffoni Connect Empreendimentos LTDA',
        documento: simDoc.trim() === '123.456.789-00' ? '12.345.678/0001-99' : (simDoc.trim() || '12.345.678/0001-99'),
        originBlock: 'pjDadosEmpresa',
        originField: 'nomeFantasia'
      };
    }

    onInjectPayload(payload);
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
        
        {/* Toggleable Integration Helper for Sandbox tests */}
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 transition-all select-none cursor-pointer"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
          <span>{showSimulator ? 'Ocultar Injetor de Carga' : 'Abrir Injetor de Carga'}</span>
          {showSimulator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Simulator Payload Injector Section */}
      {showSimulator && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Injetor do Portal BOSS (Apenas Desenvolvimento e Depuração)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Insira dados para testar a ponte operacional</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de Cliente</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimType('PF');
                    setSimName('Roberto Giffoni');
                    setSimDoc('123.456.789-00');
                    setSimId('pb_client_pf_9012');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${simType === 'PF' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimType('PJ');
                    setSimName('Giffoni Connect');
                    setSimDoc('12.345.678/0001-99');
                    setSimId('pb_client_pj_5678');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${simType === 'PJ' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">ID do Cliente BOSS</label>
              <input
                type="text"
                value={simId}
                onChange={(e) => setSimId(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-slate-700 focus:outline-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {simType === 'PF' ? 'Nome Completo (nomeCompleto)' : 'Nome Fantasia (nomeFantasia)'}
              </label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => {
                setSimType('PF');
                setSimName('Roberto Giffoni');
                setSimDoc('123.456.789-00');
                setSimId('pb_client_pf_9012');
                handleSimulateInjection('PF');
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              Injetar Carga Útil PF (Pessoa Física)
            </button>
            <button
              onClick={() => {
                setSimType('PJ');
                setSimName('Giffoni Connect');
                setSimDoc('12.345.678/0001-99');
                setSimId('pb_client_pj_5678');
                handleSimulateInjection('PJ');
              }}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-850 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              Injetar Carga Útil PJ (Pessoa Jurídica)
            </button>
          </div>
        </div>
      )}

      {/* SEÇÃO: Receptor Portal BOSS */}
      <div id="receiver-portal-boss-section" className="bg-white border border-slate-205 rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FolderLock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">Receptor Portal BOSS</h2>
              <p className="text-[10px] text-slate-450 mt-0.5">Escuta operacional de webhook para criação automatizada de pastas de clientes</p>
            </div>
          </div>

          {/* 1. Status do Receptor */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
            {receiverStatus === 'Aguardando payload' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Aguardando payload
              </span>
            )}
            {receiverStatus === 'Payload recebido' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-750 border border-blue-250">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Payload recebido
              </span>
            )}
            {receiverStatus === 'Processando' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-705 border border-amber-250">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Processando
              </span>
            )}
            {receiverStatus === 'Retorno gerado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-750 border border-emerald-250">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Retorno gerado
              </span>
            )}
            {receiverStatus === 'Erro de recepção' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-750 border border-rose-250">
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                Erro de recepção
              </span>
            )}
          </div>
        </div>

        {/* 2. Último Payload Recebido Grid */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Último Payload Recebido</h3>
            <span id="endpoint-status-badge" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-150">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
              POST /api/create-folder: Operando
            </span>
          </div>

          {activePayload ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">clientFolderName</div>
                <div className="text-xs font-extrabold text-slate-800 truncate" title={activePayload.clientFolderName}>
                  {activePayload.clientFolderName}
                </div>
                <span className="inline-block text-[9px] font-bold bg-slate-105 text-slate-600 px-2 py-0.5 rounded-sm">
                  clientType: {activePayload.clientType}
                </span>
              </div>

              <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">ID do Cliente (Portal)</div>
                <div className="text-xs font-extrabold text-slate-700 font-mono truncate" title={activePayload.portalClientId}>
                  {activePayload.portalClientId}
                </div>
                <span className="text-[9px] text-slate-450 block truncate">
                  caseId: <strong className="font-mono text-slate-600">{activePayload.caseId || 'Não recebido'}</strong>
                </span>
              </div>

              <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Mapeamento de Origem</div>
                <div className="text-[10px] font-semibold text-slate-650 leading-tight truncate">
                  Bloco: <strong className="font-mono text-slate-800">{activePayload.originBlock || 'N/A'}</strong>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight truncate">
                  Campo: <strong className="font-mono text-slate-800">{activePayload.originField || 'N/A'}</strong>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 shadow-2xs">
                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">recebidoEm</div>
                <div className="text-xs font-bold text-slate-800 font-mono leading-tight truncate">
                  {activePayload.recebidoEm ? new Date(activePayload.recebidoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                </div>
                <span className="text-[9px] text-slate-400 block font-sans">Canal nativo de alto desempenho</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-450 rounded-lg bg-white border border-slate-150 border-dashed">
              <AlertTriangle className="w-5 h-5 text-slate-350 mx-auto mb-1" />
              <span className="text-xs font-bold text-slate-600 block">Aguardando payload do Portal BOSS...</span>
              <span className="text-[10px] text-slate-400 block max-w-sm mx-auto mt-0.5">Envie uma carga útil pelo injetor de desenvolvimento ou envie uma requisição real para o receptor.</span>
            </div>
          )}
        </div>

        {/* 3. Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopyPayload}
            disabled={!activePayload}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar payload recebido
          </button>

          <button
            type="button"
            onClick={handleCopyResponse}
            disabled={!activeResponse}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-45 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            Copiar retorno gerado
          </button>

          {onClearReceiver && (
            <button
              type="button"
              onClick={onClearReceiver}
              disabled={!activePayload && !activeResponse}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 disabled:opacity-45 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar visualização do receptor
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowManualPayload(!showManualPayload)}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-blue-500" />
            {showManualPayload ? 'Ocultar payload manual' : 'Testar receptor com payload manual'}
          </button>
        </div>

        {/* 4. Campo opcional: Payload manual para teste */}
        {showManualPayload && (
          <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 space-y-3 text-white animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Payload manual para teste</label>
              <span className="text-[10px] text-slate-500">Cole seu JSON de teste para execução em tempo real</span>
            </div>

            <textarea
              id="manual-payload-textarea"
              rows={5}
              value={manualPayloadStr}
              onChange={(e) => setManualPayloadStr(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:outline-none focus:border-slate-700 rounded-lg font-mono text-emerald-400 resize-y"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setManualPayloadStr(
                    JSON.stringify({
                      clientType: "PF",
                      portalClientId: "pb_manual_client_" + Math.floor(1000 + Math.random() * 9000),
                      caseId: "case_manual_pf_" + Math.floor(10000 + Math.random() * 90000),
                      clientFolderName: "Guilherme Giffoni Teste " + Math.floor(10 + Math.random() * 90),
                      originBlock: "pfDadosPessoais",
                      originField: "nomeCompleto"
                    }, null, 2)
                  );
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Gerar Exemplo PF
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualPayloadStr(
                    JSON.stringify({
                      clientType: "PJ",
                      portalClientId: "pb_manual_client_pj_" + Math.floor(1000 + Math.random() * 9000),
                      caseId: "case_manual_pj_" + Math.floor(10000 + Math.random() * 90000),
                      clientFolderName: "Giffoni Holding S/A " + Math.floor(10 + Math.random() * 90),
                      originBlock: "pjDadosEmpresa",
                      originField: "nomeFantasia"
                    }, null, 2)
                  );
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Gerar Exemplo PJ
              </button>
              <button
                type="button"
                onClick={handleProcessManualPayload}
                disabled={isProcessingManual}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-555 disabled:bg-slate-750 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isProcessingManual ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Em processamento...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-white fill-current" />
                    <span>Processar payload manualmente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nome Recebido (nomeCompleto)</div>
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
                <Building className="w-5 h-5 text-slate-400 mx-auto" />
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

      {/* Section 5: Retorno para o Portal BOSS */}
      {activeResponse && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-950 shadow-md space-y-4 animate-fade-in text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Último retorno gerado para o Portal BOSS</span>
            </h3>
            <button
              onClick={handleCopyResponse}
              className="text-[10px] text-emerald-450 hover:text-emerald-350 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar último retorno
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/45 p-3 rounded border border-slate-800 font-mono">
              <div className="text-[9px] text-slate-500 uppercase font-black">Pasta do Cliente Criada</div>
              <div className="text-xs font-bold text-slate-200 truncate mt-0.5">{activeResponse.googleDriveClientFolderName}</div>
            </div>
            <div className="bg-slate-950/45 p-3 rounded border border-slate-800 font-mono col-span-1 lg:col-span-2">
              <div className="text-[9px] text-slate-500 uppercase font-black">Identificador Google Drive (UID)</div>
              <div className="text-xs font-bold text-emerald-300 truncate mt-0.5">{activeResponse.googleDriveClientFolderId}</div>
            </div>
            <div className="bg-slate-950/45 p-3 rounded border border-slate-800 font-mono">
              <div className="text-[9px] text-slate-500 uppercase font-black">Status de Registro Giffoni</div>
              <div className="mt-1">
                {activeResponse.googleDriveOperation === 'created' ? (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">CRIADO</span>
                ) : (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800">VINCULADO</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <div className="text-[10px] text-slate-450 uppercase font-black mb-1.5 flex items-center justify-between">
              <span>Conteúdo JSON de Retorno</span>
              {activeResponse.googleDriveClientFolderUrl && (
                <a
                  href={activeResponse.googleDriveClientFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-sans font-bold"
                >
                  Abrir pasta criada no Google Drive <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <pre className="text-[10px] font-mono text-emerald-300 overflow-x-auto overflow-y-auto max-h-[140px] whitespace-pre-wrap">{JSON.stringify(activeResponse, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Terminal / Live Feed for UI feedback */}
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
