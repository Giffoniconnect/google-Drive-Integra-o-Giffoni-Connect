import { useState } from 'react';
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
  Key,
  Shield,
  Briefcase,
  Mail,
  ToggleLeft
} from 'lucide-react';
import { IntegrationSettings, IntegrationLog } from '../types';
import { GSIButton } from './GSIButton';

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

  const [saving, setSaving] = useState(false);

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
    });

    onAddLog('success', 'Configurações do Google Drive atualizadas e salvas no Portal BOSS localmente com sucesso.');
    
    setTimeout(() => {
      setSaving(false);
    }, 600);
  };

  return (
    <div id="config-page-container" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            Configurações da Integração Google Drive
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Gerencie credenciais corporativas, chaves de acesso e a pasta destino "clientes office".
          </p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Infraestrutura Giffoni Connect • v1.2.0
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left main form block */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          {/* Card: Auth credentials and core API details */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Key className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credenciais & Segurança</h2>
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
                  placeholder="https://giffoniconnect.com/oauth-callback"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
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

            {/* Google Authentication Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Autenticação Google</h4>
                <p className="text-[10px] text-slate-450">Authorize writing folders with standard consent screen.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!isAuthenticated ? (
                  <button
                    onClick={onLogin}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                    <span>Conectar Google Drive</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onTestConnection}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
                      <span>Testar conexão</span>
                    </button>
                    <button
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
        </div>

        {/* Right side block is Destination Folder Configuration and Logs */}
        <div className="col-span-1 lg:col-span-5 space-y-6">

          {/* Card: Configuração da pasta destino */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuração da Pasta Destino</h2>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define o repositório central que o Portal BOSS consultará para agrupar as novas pastas criadas por cliente.
            </p>

            <div className="space-y-3">
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
                  className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Centered Button to trigger general Save settings */}
          <div>
            <button
              onClick={handleSaveConfigs}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer select-none"
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
      </div>

      {/* Terminal de Logs */}
      <div id="card-integration-logs" className="bg-slate-900 rounded-xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-350 font-mono">Painel de Logs em Linguagem Simples</h2>
          </div>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30"
          >
            <Trash2 className="w-3 h-3" />
            Limpar Logs
          </button>
        </div>

        <div className="font-mono text-[10px] max-h-[150px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-4 select-none">
              Nenhuma entrada no console operacional.
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
