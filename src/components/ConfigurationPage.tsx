import { useState, useEffect } from 'react';
import { 
  Settings, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Info, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  FolderOpen,
  Copy,
  Key,
  Shield,
  Briefcase,
  Mail,
  ToggleLeft,
  Search,
  ExternalLink,
  Folder
} from 'lucide-react';
import { IntegrationSettings, IntegrationLog } from '../types';
import { GSIButton } from './GSIButton';
import { GoogleDriveDiagnosisCard } from './GoogleDriveDiagnosisCard';

interface ConfigurationPageProps {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  settings: IntegrationSettings;
  onSaveSettings: (settings: Partial<IntegrationSettings>) => void;
  logs: IntegrationLog[];
  onClearLogs: (category?: 'connection' | 'localizer' | 'all') => void;
  onLogin: () => void;
  onLogout: () => void;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  onAddLog: (type: 'info' | 'success' | 'error', message: string, category?: 'connection' | 'localizer') => void;
  onTestFolder: (folderId: string) => Promise<void>;
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
  onAddLog,
  onTestFolder
}: ConfigurationPageProps) {
  // Configured states
  const [email, setEmail] = useState(settings.googleDriveConnectedEmail || 'direito.rgr@gmail.com');
  const [statusVal, setStatusVal] = useState(settings.googleDriveConnectionStatus || 'disconnected');
  const [apiKey, setApiKey] = useState(settings.googleDriveApiKey || '');
  const [clientId, setClientId] = useState(settings.googleDriveClientId || '');
  const [clientSecret, setClientSecret] = useState(settings.googleDriveClientSecret || '');
  const [redirectUri, setRedirectUri] = useState(settings.googleDriveRedirectUri || '');
  const [scopesVal, setScopesVal] = useState(settings.googleDriveScopes || 'https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/drive');

  // Destination Folder config
  const [destName, setDestName] = useState(settings.googleDriveDestinationFolderName || 'clientes office');
  const [destId, setDestId] = useState(settings.googleDriveDestinationFolderId || '');
  const [destUrl, setDestUrl] = useState(settings.googleDriveDestinationFolderUrl || '');
  const [bossKey, setBossKey] = useState(settings.bossDriveIntegrationKey || '');

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  useEffect(() => {
    setStatusVal(isAuthenticated ? 'connected' : 'disconnected');
  }, [isAuthenticated]);

  useEffect(() => {
    if (settings.bossDriveIntegrationKey) {
      setBossKey(settings.bossDriveIntegrationKey);
    }
  }, [settings.bossDriveIntegrationKey]);

  const [saving, setSaving] = useState(false);
  const [isTestingFolder, setIsTestingFolder] = useState(false);

  // Folder Search States
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [searchedFolders, setSearchedFolders] = useState<any[]>([]);
  const [isSearchingFolders, setIsSearchingFolders] = useState(false);
  const [isTestingLocalizer, setIsTestingLocalizer] = useState(false);

  const handleTestLocalizerConnection = async () => {
    onAddLog('info', 'Iniciando teste do localizador de pastas...', 'localizer');
    onAddLog('info', 'Verificando token de acesso...', 'localizer');

    if (!isAuthenticated || !accessToken) {
      onAddLog('error', 'Token de acesso indisponível. Conecte ao Google Drive primeiro.', 'localizer');
      onAddLog('error', 'Não foi possível listar pastas no Google Drive.', 'localizer');
      onAddLog('error', 'Verifique se os escopos autorizados permitem leitura/listagem de pastas.', 'localizer');
      return;
    }

    onAddLog('success', 'Token de acesso encontrado.', 'localizer');
    onAddLog('info', 'Testando permissão para listar pastas...', 'localizer');
    setIsTestingLocalizer(true);

    try {
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=1&q=mimeType='application/vnd.google-apps.folder'`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        onAddLog('success', 'Consulta de listagem executada com sucesso.', 'localizer');
        onAddLog('success', 'Localizador apto para buscar pastas no Google Drive.', 'localizer');
      } else {
        onAddLog('error', 'Não foi possível listar pastas no Google Drive.', 'localizer');
        onAddLog('error', 'Verifique se os escopos autorizados permitem leitura/listagem de pastas.', 'localizer');
        onAddLog('error', 'Verifique se a Google Drive API está ativada.', 'localizer');
      }
    } catch (e: any) {
      onAddLog('error', 'Não foi possível listar pastas no Google Drive.', 'localizer');
      onAddLog('error', 'Verifique se os escopos autorizados permitem leitura/listagem de pastas.', 'localizer');
      onAddLog('error', 'Verifique se a Google Drive API está ativada.', 'localizer');
      onAddLog('error', `A consulta à Drive API falhou. Erro descritivo: ${e.message || e}`, 'localizer');
    } finally {
      setIsTestingLocalizer(false);
    }
  };

  const handleSearchFolders = async () => {
    onAddLog('info', 'Buscando pastas no Google Drive...', 'localizer');
    onAddLog('info', 'Verificando token de acesso...', 'localizer');

    if (!isAuthenticated || !accessToken) {
      onAddLog('error', 'Não foi possível iniciar o localizador de pastas.', 'localizer');
      onAddLog('error', 'Token de acesso indisponível. Conecte ao Google Drive primeiro.', 'localizer');
      return;
    }

    onAddLog('success', 'Token de acesso encontrado.', 'localizer');
    onAddLog('info', `Termo pesquisado: ${folderSearchQuery}`, 'localizer');
    setIsSearchingFolders(true);
    setSearchedFolders([]);

    try {
      const { searchFolders } = await import('../lib/drive');
      const folders = await searchFolders(accessToken, folderSearchQuery);
      setSearchedFolders(folders);
      onAddLog('success', `Quantidade de pastas encontradas: ${folders.length}`, 'localizer');
      if (folders.length === 0) {
        onAddLog('error', 'Nenhuma pasta encontrada para o termo informado.', 'localizer');
        onAddLog('error', 'A busca retornou vazia. Confira o nome digitado ou tente termo parcial.', 'localizer');
        onAddLog('error', 'Verifique se os escopos autorizados permitem leitura/listagem de pastas.', 'localizer');
        onAddLog('error', 'Verifique se a Google Drive API está ativada.', 'localizer');
      }
    } catch (e: any) {
      onAddLog('error', 'A consulta à Drive API falhou.', 'localizer');
      onAddLog('error', `Erro descritivo: ${e.message || e}`, 'localizer');
      onAddLog('error', 'Verifique se a Google Drive API está ativada.', 'localizer');
      onAddLog('error', 'Verifique se os escopos autorizados permitem leitura/listagem de pastas.', 'localizer');
    } finally {
      setIsSearchingFolders(false);
    }
  };

  const handleSelectFolder = (folder: { id: string; name: string; webViewLink: string }) => {
    try {
      setDestName(folder.name);
      setDestId(folder.id);
      setDestUrl(folder.webViewLink);
      onAddLog('success', `Pasta selecionada: ${folder.name}`, 'localizer');
      onAddLog('success', `UID da pasta selecionada: ${folder.id}`, 'localizer');
      onAddLog('success', 'Link da pasta destino preenchido com sucesso.', 'localizer');
    } catch (err: any) {
      onAddLog('error', `Não foi possível preencher os dados da pasta destino: ${err.message || err}`, 'localizer');
    }
  };

  const handleCopyConnectionLogs = () => {
    const connectionLogs = logs.filter(log => log.category !== 'localizer');
    if (connectionLogs.length === 0) {
      onAddLog('error', 'Não há logs de conexão para copiar.', 'connection');
      return;
    }
    const text = connectionLogs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        onAddLog('success', 'Logs da conexão copiados para a área de transferência com sucesso.', 'connection');
      })
      .catch((err) => {
        onAddLog('error', `Falha ao copiar logs: ${err.message || err}`, 'connection');
      });
  };

  const handleCopyLocalizerLogs = () => {
    const localizerLogs = logs.filter(log => log.category === 'localizer');
    if (localizerLogs.length === 0) {
      onAddLog('error', 'Não há logs do localizador para copiar.', 'localizer');
      return;
    }
    const text = localizerLogs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        onAddLog('success', 'Logs do localizador copiados para a área de transferência com sucesso.', 'localizer');
      })
      .catch((err) => {
        onAddLog('error', `Falha ao copiar logs: ${err.message || err}`, 'localizer');
      });
  };

  const handleSaveConfigs = () => {
    setSaving(true);
    
    onSaveSettings({
      googleDriveConnectedEmail: email,
      googleDriveConnectionStatus: isAuthenticated ? 'connected' : 'disconnected',
      googleDriveApiKey: apiKey,
      googleDriveClientId: clientId,
      googleDriveClientSecret: clientSecret,
      googleDriveRedirectUri: redirectUri,
      googleDriveScopes: scopesVal,
      googleDriveDestinationFolderName: destName,
      googleDriveDestinationFolderId: destId,
      googleDriveDestinationFolderUrl: destUrl,
      bossDriveIntegrationKey: bossKey,
    });

    onAddLog('success', 'Credenciais Google Drive salvas com sucesso.');
    onAddLog('success', 'Pasta destino salva com sucesso.');
    onAddLog('success', 'Chave de integração Portal BOSS salva com sucesso.');
    
    setTimeout(() => {
      setSaving(false);
    }, 600);
  };

  const handleConnectClick = () => {
    onLogin();
  };

  const handleTestFolderClick = async () => {
    if (!destId || destId.trim() === '') {
      onAddLog('error', 'Erro de Validação: O UID da pasta destino é obrigatório para realizar o teste.');
      return;
    }

    if (!destUrl || destUrl.trim() === '') {
      onAddLog('info', 'Aviso: O link da pasta de destino está vazio. O teste prosseguirá usando apenas o UID.');
    }

    setIsTestingFolder(true);
    try {
      await onTestFolder(destId);
    } catch (e: any) {
      onAddLog('error', `Falha ao testar pasta destino: ${e.message || e}`);
    } finally {
      setIsTestingFolder(false);
    }
  };

  return (
    <div id="config-page-container" className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2 font-sans">
            <Settings className="w-5 h-5 text-blue-600" />
            Configurações da Integração Google Drive
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Gerencie credenciais corporativas, chaves de acesso e a pasta destino "clientes office".
          </p>
        </div>
        <div className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Infraestrutura Giffoni Connect • v1.2.0
        </div>
      </div>

      {/* DIAGNÓSTICO GOOGLE DRIVE */}
      <GoogleDriveDiagnosisCard
        isAuthenticated={isAuthenticated}
        accessToken={accessToken}
        userEmail={userEmail}
        settings={settings}
        onLogin={onLogin}
        onAddLog={onAddLog}
      />

      {/* 1. Credenciais & Segurança */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Key className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">1. Credenciais & Segurança</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">E-mail conectado ao Google Drive</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="Ex: direito.rgr@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Status da conexão</label>
            <div className="flex items-center h-8 bg-slate-100 border border-slate-250 px-3 rounded-lg text-xs font-bold font-mono">
              {isAuthenticated ? (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  CONECTADO
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  DESCONECTADO
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Chave de API / Credenciais</label>
            <input
              type="password"
              placeholder="Cole sua API Key do Google Cloud Console"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Client ID</label>
              <input
                type="text"
                placeholder="E.g. XXXX-XXXX.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Client Secret</label>
              <input
                type="password"
                placeholder="GOCSPX-XXXXXXXXXXXXXXX"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Redirect URI</label>
            <input
              type="text"
              placeholder="https://planar-granite-495814-r8.firebaseapp.com/__/auth/handler"
              value={redirectUri || 'https://planar-granite-495814-r8.firebaseapp.com/__/auth/handler'}
              readOnly
              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none transition-all"
            />
            <p className="text-[11px] text-blue-600 mt-1.5 font-semibold font-sans">
              Autenticação gerenciada pelo Firebase Auth. Não altere este campo.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Escopos autorizados</label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="E.g. https://www.googleapis.com/auth/drive"
                value={scopesVal}
                onChange={(e) => setScopesVal(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Botão Conectar Google Drive & 3. Botão Testar conexão */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 font-sans">Ações de Conexão</h4>
            <p className="text-[10px] text-slate-450 leading-relaxed font-sans">Autorize ou valide a conexão com a conta Google Drive.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {!isAuthenticated ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={handleConnectClick}
                  className="flex items-center gap-2 bg-blue-600 border border-blue-700 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm font-sans hover:shadow-md"
                >
                  <Key className="w-4 h-4 text-white animate-pulse" />
                  <span>Autorizar e Conectar Google Drive</span>
                </button>
                <span className="text-[9px] text-blue-600 font-medium font-sans max-w-[280px] text-right">
                  Solicita permissão operacional para criar pastas e gerenciar metadados de trabalho (Modo Leitura e Escrita Seguro).
                </span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 font-sans"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
                  <span>Testar conexão</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                  title="Desvincular conta Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CARD: CHAVE DE INTEGRAÇÃO PORTAL BOSS ↔ GOOGLE DRIVE */}
      <div id="card-boss-drive-key" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">
            CHAVE DE INTEGRAÇÃO PORTAL BOSS ↔ GOOGLE DRIVE
          </h2>
        </div>
        
        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
          Uma chave exclusiva para comunicação segura entre o Portal BOSS e este receptor do Google Drive. Recomenda-se começar com o prefixo <code className="bg-slate-105 px-1 py-0.5 rounded text-blue-600 font-mono text-[10px]">boss_drive_live_</code>.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">
              API Key da Integração (X-BOSS-Google-Drive-Integration-Key)
            </label>
            <input
              type="text"
              placeholder="Ex: boss_drive_live_giffoni_key_default"
              value={bossKey}
              onChange={(e) => setBossKey(e.target.value)}
              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 font-semibold"
            />
          </div>

          {settings.bossDriveIntegrationKey && (
            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-medium font-sans">
                Chave Ativa Salva na Configuração:
              </div>
              <div className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded shadow-3xs">
                {(() => {
                  const val = settings.bossDriveIntegrationKey || '';
                  if (val.length <= 16) {
                    return 'boss_drive_live_********';
                  }
                  return `${val.substring(0, 16)}********${val.substring(val.length - 4)}`;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Painel: Logs do Teste de Conexão Google Drive */}
      <div id="card-integration-logs" className="bg-slate-900 rounded-xl p-5 shadow-md space-y-3 font-mono">
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-350 font-mono">
                Logs do Teste de Conexão Google Drive
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyConnectionLogs}
                className="text-[10px] text-slate-400 hover:text-blue-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copiar logs da conexão
              </button>
              <button
                type="button"
                onClick={() => onClearLogs('connection')}
                disabled={logs.filter(log => log.category !== 'localizer').length === 0}
                className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30"
              >
                <Trash2 className="w-3 h-3" />
                Limpar logs da conexão
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            Exibe o resultado da autenticação, validação da API e comunicação com o Google Drive.
          </p>
        </div>

        <div className="font-mono text-[10px] max-h-[150px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {logs.filter(log => log.category !== 'localizer').length === 0 ? (
            <div className="text-slate-500 italic text-center py-4 select-none">
              Nenhuma entrada no console operacional.
            </div>
          ) : (
            logs.filter(log => log.category !== 'localizer').map((log) => (
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

      {/* 5. Configuração da Pasta Destino */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Briefcase className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">5. Configuração da Pasta Destino</h2>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
          Define o repositório central que o Portal BOSS consultará para agrupar as novas pastas criadas por cliente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Nome da pasta destino</label>
            <input
              type="text"
              placeholder="clientes office"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">UID da pasta destino [Editável]</label>
            <input
              type="text"
              placeholder=" UID da Pasta Pai no Drive"
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">Link da pasta destino [Editável]</label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/XXXXXX"
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {destUrl && (
            <a
              href={destUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 rounded-lg transition-all font-sans"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Abrir pasta destino no Google Drive</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleTestFolderClick}
            disabled={isTestingFolder}
            className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-xs font-sans"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingFolder ? 'animate-spin text-blue-500' : 'text-slate-500'}`} />
            <span>{isTestingFolder ? 'Verificando pasta...' : 'Testar pasta destino'}</span>
          </button>
        </div>
      </div>

      {/* 6. Localizador de Pastas */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Search className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">6. Localizador de Pastas</h2>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
          Digite uma palavra-chave para buscar e selecionar pastas reais em sua conta.
        </p>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans">Buscar pasta pelo nome</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Digite o nome da pasta e pressione Enter ou clique em Localizar Pastas..."
              value={folderSearchQuery}
              onChange={(e) => setFolderSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchFolders()}
            />
          </div>
        </div>

        {/* Botões do Localizador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleTestLocalizerConnection}
            disabled={isTestingLocalizer || !isAuthenticated}
            className="flex items-center justify-center gap-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 text-blue-700 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed text-center select-none font-sans"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingLocalizer ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
            <span>{isTestingLocalizer ? 'Testando...' : 'Testar Conexão do Localizador'}</span>
          </button>

          <button
            type="button"
            onClick={handleSearchFolders}
            disabled={isSearchingFolders || !isAuthenticated}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 disabled:border-slate-350 text-white font-bold text-xs py-2 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed text-center select-none shadow-xs font-sans"
          >
            <Search className="w-3.5 h-3.5 text-white" />
            <span>{isSearchingFolders ? 'Buscando...' : 'Localizar Pastas'}</span>
          </button>
        </div>

        {/* Lista de Resultados Encontrados */}
        {searchedFolders && searchedFolders.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans">Resultados Encontrados</label>
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-150 bg-white">
              {searchedFolders.map((folder) => (
                <div key={folder.id} className="p-2 sm:p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-all gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-700 truncate flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-450 truncate mt-0.5" title={folder.id}>
                      UID: {folder.id}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                    <a
                      href={folder.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded text-[10px] text-slate-600 font-medium transition-colors font-sans"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span>Abrir no Google Drive</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSelectFolder(folder)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-700 text-blue-700 hover:text-white font-bold text-[10px] rounded transition-all cursor-pointer font-sans"
                    >
                      Selecionar esta pasta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchedFolders && searchedFolders.length === 0 && folderSearchQuery && !isSearchingFolders && (
          <p className="text-[10px] text-slate-450 text-center py-2.5 italic bg-white rounded-lg border border-dashed border-slate-200 select-none font-medium font-sans">
            Nenhuma pasta encontrada para a busca "{folderSearchQuery}".
          </p>
        )}

        {/* 7. Logs do Localizador de Pastas */}
        <div className="bg-slate-900 rounded-lg p-4 space-y-1.5 font-mono text-[10px] max-h-[160px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 select-none">
            <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 font-mono">
              <Terminal className="w-3.5 h-3.5 text-blue-500" />
              Logs do Localizador de Pastas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLocalizerLogs}
                className="text-[9px] text-slate-400 hover:text-blue-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                Copiar logs do localizador
              </button>
              <button
                type="button"
                onClick={() => onClearLogs('localizer')}
                disabled={logs.filter(log => log.category === 'localizer').length === 0}
                className="text-[9px] text-slate-500 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Limpar logs do localizador
              </button>
            </div>
          </div>
          {logs.filter(log => log.category === 'localizer').length === 0 ? (
            <div className="text-slate-600 italic text-center py-2 select-none">
              Nenhum evento registrado.
            </div>
          ) : (
            logs.filter(log => log.category === 'localizer').map((log) => (
              <div key={log.id} className="flex items-start gap-1.5 leading-relaxed text-slate-300 pointer-events-auto">
                <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                {log.type === 'success' && <span className="text-emerald-400 font-semibold shrink-0">[SUCCESS]</span>}
                {log.type === 'error' && <span className="text-rose-400 font-semibold shrink-0">[ERROR]</span>}
                {log.type === 'info' && <span className="text-slate-400 font-semibold shrink-0">[INFO]</span>}
                <span className="text-slate-200 block text-left break-all select-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 8. Botão Salvar Configurações */}
      <div>
        <button
          type="button"
          onClick={handleSaveConfigs}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer select-none font-sans"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Salvando Configurações...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Salvar Configurações</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
