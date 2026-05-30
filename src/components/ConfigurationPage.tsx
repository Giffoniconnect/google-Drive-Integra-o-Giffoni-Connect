import { useState } from 'react';
import { 
  Settings, 
  Folder, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Info, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  FileCheck,
  FolderOpen
} from 'lucide-react';
import { IntegrationSettings, IntegrationLog } from '../types';
import { GSIButton } from './GSIButton';
import { createFolder } from '../lib/drive';

interface ConfigurationPageProps {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  settings: IntegrationSettings;
  onSaveSettings: (settings: Partial<IntegrationSettings>) => void;
  logs: IntegrationLog[];
  onClearLogs: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  onAddLog: (type: 'info' | 'success' | 'error', message: string) => void;
}

export function ConfigurationPage({
  isAuthenticated,
  accessToken,
  userEmail,
  settings,
  onSaveSettings,
  logs,
  onClearLogs,
  onLogin,
  onLogout,
  onTestConnection,
  isTesting,
  onAddLog
}: ConfigurationPageProps) {
  const [manualFolderId, setManualFolderId] = useState(settings.rootFolderId);
  const [manualFolderName, setManualFolderName] = useState(settings.rootFolderName);
  const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false);

  const handleSaveManualRoot = () => {
    onSaveSettings({
      rootFolderId: manualFolderId.trim(),
      rootFolderName: manualFolderName.trim() || 'Raiz do Google Drive',
    });
    onAddLog('info', `Pasta raiz alterada manualmente para ID: "${manualFolderId}" (${manualFolderName || 'Sem Nome'})`);
  };

  const handleCreateDefaultRoot = async () => {
    if (!accessToken) {
      onAddLog('error', 'Token de acesso inválido. Por favor, conecte a sua conta.');
      return;
    }
    setIsCreatingRootFolder(true);
    onAddLog('info', "Iniciando criação automática da pasta raiz 'Portal BOSS Clientes'...");
    try {
      const response = await createFolder(accessToken, 'Portal BOSS Clientes');
      onSaveSettings({
        rootFolderId: response.id,
        rootFolderName: 'Portal BOSS Clientes',
      });
      setManualFolderId(response.id);
      setManualFolderName('Portal BOSS Clientes');
      onAddLog('success', `Pasta raiz 'Portal BOSS Clientes' criada com sucesso! ID: ${response.id}`);
    } catch (error: any) {
      console.error(error);
      onAddLog('error', `Falha ao criar pasta raiz: ${error.message || error}`);
    } finally {
      setIsCreatingRootFolder(false);
    }
  };

  return (
    <div id="config-page-container" className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            Configuração da Integração Google Drive
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Módulo Operacional Ativo: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-blue-600">/boss-giffoni-clientes/configuracoes/integracoes-google-drive</code>
          </p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono italic">
          Modular Build v1.0.4
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Status da Integração */}
        <div id="card-integration-status" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Status da Integração</h2>
              {isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ATIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  DESCONECTADO
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              O Portal BOSS automatiza a criação de diretórios de forma isolada na nuvem. A autenticação garante conformidade e segurança em lote.
            </p>

            {isAuthenticated && userEmail && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conta Google Ativa</div>
                  <div className="text-xs text-slate-700 font-mono mt-0.5 font-medium">{userEmail}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Desconectar conta Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div>
            {!isAuthenticated ? (
              <div className="flex justify-center py-1">
                <GSIButton onClick={onLogin} id="gsi-drive-login-button" text="Conectar Google Drive" />
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onTestConnection}
                  disabled={isTesting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-blue-500/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Testar Conexão</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Pasta Raiz Configurada */}
        <div id="card-root-folder" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-slate-500" />
              Pasta Raiz de Trabalho
            </h2>
            {settings.rootFolderId ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-105 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">
                Pai Customizado
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-550 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Raiz Geral
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Diretório pai principal onde serão estruturadas as pastas dos clientes do fluxo. Caso em branco, os diretórios nascerão na raiz geral.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">ID da Pasta Raiz (Drive)</label>
              <input
                type="text"
                placeholder="Ex ID: 1aBcDeFg_hI_jKlMnOpQrStUvWxYz"
                value={manualFolderId}
                onChange={(e) => setManualFolderId(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Amigável da Pasta</label>
              <input
                type="text"
                placeholder="Ex: Portal BOSS - Clientes"
                value={manualFolderName}
                onChange={(e) => setManualFolderName(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <button
                onClick={handleSaveManualRoot}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Salvar Diretório Raiz
              </button>
              
              {isAuthenticated && (
                <button
                  onClick={handleCreateDefaultRoot}
                  disabled={isCreatingRootFolder}
                  className="px-3 py-2 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                  title="Criar diretório 'Portal BOSS Clientes' de maneira automatizada"
                >
                  {isCreatingRootFolder ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="font-semibold text-xs">Criar Raiz Automática</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Terminal de Logs da Integração */}
      <div id="card-integration-logs" className="bg-slate-900 rounded-xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-350">Logs de Sistema</h2>
          </div>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30"
          >
            <Trash2 className="w-3 h-3" />
            Limpar Console
          </button>
        </div>

        <div className="font-mono text-[10px] max-h-[220px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-8 select-none">
              [IDLE] Aguardando eventos de infraestrutura ou fluxos de trabalho...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed text-slate-300">
                <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                {log.type === 'success' && (
                  <span className="text-emerald-400 font-semibold shrink-0">[SUCCESS]</span>
                )}
                {log.type === 'error' && (
                  <span className="text-rose-400 font-semibold shrink-0">[ERROR]</span>
                )}
                {log.type === 'info' && (
                  <span className="text-slate-400 font-semibold shrink-0">[INFO]</span>
                )}
                <span className="text-slate-200 block select-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
