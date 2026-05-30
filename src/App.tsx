import { useState, useEffect } from 'react';
import { 
  Settings, 
  FileText, 
  FolderLock
} from 'lucide-react';
import { IntegrationSettings, IntegrationLog } from './types';
import { initAuth, googleSignIn, logout, setAccessToken } from './lib/firebase';
import { checkFolderExists, createFolder, testConnection } from './lib/drive';
import { ConfigurationPage } from './components/ConfigurationPage';
import { StructuredStep } from './components/StructuredStep';
import { BossPayload, BossResponse } from './types';

const INITIAL_SETTINGS: IntegrationSettings = {
  googleDriveConnectedEmail: 'direito.rgr@gmail.com',
  googleDriveConnectionStatus: 'disconnected',
  googleDriveApiKey: '',
  googleDriveClientId: '',
  googleDriveClientSecret: '',
  googleDriveRedirectUri: 'https://planar-granite-495814-r8.firebaseapp.com/__/auth/handler',
  googleDriveScopes: 'https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/drive',
  googleDriveDestinationFolderName: 'clientes office',
  googleDriveDestinationFolderId: '',
  googleDriveDestinationFolderUrl: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'flow' | 'settings'>('flow');
  const [activePayload, setActivePayload] = useState<BossPayload | null>(null);
  const [activeResponse, setActiveResponse] = useState<BossResponse | null>(null);
  const [settings, setSettings] = useState<IntegrationSettings>(INITIAL_SETTINGS);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Isolated track loaders (Anti-Bug / Separated tracks)
  const [isCreatingPF, setIsCreatingPF] = useState(false);
  const [isCreatingPJ, setIsCreatingPJ] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  
  // Helper to push systemic logs
  const addLog = (type: 'info' | 'success' | 'error', message: string, category?: 'connection' | 'localizer') => {
    const newLog: IntegrationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message,
      category,
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Sincronização de estado bidirecional com o servidor
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        await fetch('/api/sync-active-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            userEmail,
            settings,
            activePayload,
            activeResponse
          })
        });
      } catch (err) {
        // Ignora falhas de rede no boot ou quando o servidor ainda não subiu
      }
    };
    if (accessToken) {
      syncWithServer();
    }
  }, [accessToken, userEmail, settings, activePayload, activeResponse]);

  // Polling para detectar requisições automáticas externas vindas do Portal BOSS ao servidor backend
  useEffect(() => {
    const pollServerState = async () => {
      try {
        const response = await fetch('/api/get-active-state');
        if (response.ok) {
          const data = await response.json();
          
          if (data.activePayload && JSON.stringify(data.activePayload) !== localStorage.getItem('boss_active_payload')) {
            setActivePayload(data.activePayload);
            localStorage.setItem('boss_active_payload', JSON.stringify(data.activePayload));
            addLog('success', 'Nova carga útil recebida via webhook do Portal BOSS.');
          }

          if (data.activeResponse && JSON.stringify(data.activeResponse) !== localStorage.getItem('boss_active_response')) {
            setActiveResponse(data.activeResponse);
            localStorage.setItem('boss_active_response', JSON.stringify(data.activeResponse));
            addLog('success', 'Retorno operacional do webhook gerado com sucesso.');
          }

          if (data.logs && data.logs.length > 0) {
            setLogs(prev => {
              const prevMap = new Map<string, IntegrationLog>(prev.map(l => [l.message + l.timestamp, l]));
              let hasNew = false;
              data.logs.forEach((srvLog: any) => {
                const clientLogFormat: IntegrationLog = {
                  id: srvLog.id,
                  timestamp: srvLog.timestamp,
                  type: srvLog.type,
                  message: `[Servidor] ${srvLog.message}`
                };
                if (!prevMap.has(clientLogFormat.message + clientLogFormat.timestamp)) {
                  prevMap.set(clientLogFormat.message + clientLogFormat.timestamp, clientLogFormat);
                  hasNew = true;
                }
              });
              if (!hasNew) return prev;
              return Array.from(prevMap.values()).sort((a, b) => b.id.localeCompare(a.id));
            });
          }
        }
      } catch (e) {
        // Silencioso em caso de inicialização ou rede temporariamente indisponível
      }
    };

    const interval = setInterval(pollServerState, 2500);
    return () => clearInterval(interval);
  }, []);

  // Process receiving raw payload from Portal BOSS
  const receivePayload = (payload: BossPayload) => {
    if (!payload) {
      addLog('error', 'Nenhum payload recebido do Portal BOSS.');
      return;
    }
    if (payload.sourceBuild !== 'Portal BOSS Clientes') {
      addLog('error', 'Nenhum payload recebido do Portal BOSS.');
      return;
    }
    if (!payload.clientType || (payload.clientType !== 'PF' && payload.clientType !== 'PJ')) {
      addLog('error', 'Tipo de cliente ausente ou inválido.');
      return;
    }
    if (!payload.portalClientId) {
      addLog('error', 'portalClientId ausente.');
      return;
    }
    const folderName = payload.clientFolderName?.trim() || payload.razaoSocial?.trim() || payload.documento?.trim() || '';
    if (!folderName) {
      addLog('error', 'Nome da pasta não recebido.');
      return;
    }

    setActivePayload(payload);
    localStorage.setItem('boss_active_payload', JSON.stringify(payload));
    // Clear old response on incoming payload
    setActiveResponse(null);
    localStorage.removeItem('boss_active_response');

    addLog('success', 'Payload recebido do Portal BOSS com sucesso.');
    if (payload.clientType === 'PF') {
      addLog('info', 'Tipo de cliente identificado: PF.');
      addLog('info', `Nome da pasta recebido: ${folderName}.`);
    } else {
      addLog('info', 'Tipo de cliente identificado: PJ.');
      addLog('info', `Nome fantasia recebido: ${folderName}.`);
    }
  };

  // Load state from localStorage on init
  useEffect(() => {
    // 1. Initial State for Payload & Response
    const storedPayload = localStorage.getItem('boss_active_payload');
    if (storedPayload) {
      try {
        setActivePayload(JSON.parse(storedPayload));
      } catch (e) {}
    }

    const storedResponse = localStorage.getItem('boss_active_response');
    if (storedResponse) {
      try {
        setActiveResponse(JSON.parse(storedResponse));
      } catch (e) {}
    }

    // 2. Settings
    const storedSettings = localStorage.getItem('boss_drive_settings');
    if (storedSettings) {
      try {
        const parsedSetting = JSON.parse(storedSettings);
        setSettings(prev => ({ ...prev, ...parsedSetting }));
        
        // Restore custom credentials session if a valid access token was saved
        if (parsedSetting.googleDriveAccessToken) {
          setAccessTokenState(parsedSetting.googleDriveAccessToken);
          setAccessToken(parsedSetting.googleDriveAccessToken); // restore in-memory cached token inside firebase.ts
          setIsAuthenticated(true);
          if (parsedSetting.googleDriveConnectedEmail) {
            setUserEmail(parsedSetting.googleDriveConnectedEmail);
          }
        }
      } catch (e) {
        setSettings(INITIAL_SETTINGS);
      }
    } else {
      setSettings(INITIAL_SETTINGS);
      localStorage.setItem('boss_drive_settings', JSON.stringify(INITIAL_SETTINGS));
    }

    // 3. Welcome log
    addLog('info', 'Integração Google Drive Giffoni Connect — Ponte Real Ativa.');
  }, []);

  // Web postMessage & URL Listener for real Boss Payload
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.sourceBuild === 'Portal BOSS Clientes') {
        receivePayload(event.data);
      }
    };

    window.addEventListener('message', handleMessage);

    // Read URL Search params if direct redirect from Portal BOSS
    const urlParams = new URLSearchParams(window.location.search);
    const rawPayload = urlParams.get('payload');
    if (rawPayload) {
      try {
        const decoded = decodeURIComponent(rawPayload);
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.sourceBuild === 'Portal BOSS Clientes') {
          receivePayload(parsed);
        }
      } catch (e) {
        console.error('Falha ao decodificar payload da URL:', e);
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Sync settings to localStorage when edited
  const handleSaveSettings = (newSettingsFields: Partial<IntegrationSettings>) => {
    setSettings(prev => {
      const val = { ...prev, ...newSettingsFields };
      localStorage.setItem('boss_drive_settings', JSON.stringify(val));
      return val;
    });
  };

  const handleClearLogs = (category?: 'connection' | 'localizer' | 'all') => {
    if (!category || category === 'all') {
      setLogs([]);
    } else if (category === 'localizer') {
      setLogs(prev => prev.filter(log => log.category !== 'localizer'));
    } else if (category === 'connection') {
      setLogs(prev => prev.filter(log => log.category === 'localizer'));
    }
  };

  // Auth setup hook (handles Firebase popups)
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setAccessTokenState(token);
        setAccessToken(token); // set in memory inside firebase module
        handleSaveSettings({ 
          googleDriveConnectionStatus: 'connected',
          googleDriveConnectedEmail: user.email || '',
          googleDriveAccessToken: token
        });
        addLog('success', `Autenticação Google ativa para: ${user.email}`);
      },
      () => {
        // If there's a cached token in settings restored on init, we can keep it, so we don't clear authentications prematurely
        const stored = localStorage.getItem('boss_drive_settings');
        let hasSavedToken = false;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.googleDriveAccessToken) {
              hasSavedToken = true;
            }
          } catch (e) {}
        }
        if (!hasSavedToken) {
          setIsAuthenticated(false);
          setUserEmail(null);
          setAccessTokenState(null);
          setAccessToken(null);
          handleSaveSettings({ googleDriveConnectionStatus: 'disconnected' });
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    addLog('info', 'Iniciando autorização Google Drive...', 'connection');
    addLog('info', 'Solicitando permissão para ler/listar pastas.', 'connection');
    addLog('info', 'Solicitando permissão para criar pastas.', 'connection');
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        let scopes: string[] = [];
        let tokenInfoVerified = false;
        try {
          const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${res.accessToken}`);
          if (tokenInfoRes.ok) {
            const info = await tokenInfoRes.json();
            if (info.scope) {
              scopes = info.scope.split(' ');
              tokenInfoVerified = true;
            }
          }
        } catch (e: any) {
          console.warn('Erro ao obter tokeninfo:', e);
        }

        if (tokenInfoVerified) {
          const hasMetadata = scopes.some(s => 
            s === 'https://www.googleapis.com/auth/drive' || 
            s === 'https://www.googleapis.com/auth/drive.metadata.readonly' || 
            s === 'https://www.googleapis.com/auth/drive.metadata'
          );

          const hasFile = scopes.some(s => 
            s === 'https://www.googleapis.com/auth/drive' || 
            s === 'https://www.googleapis.com/auth/drive.file'
          );

          if (!hasMetadata && !hasFile) {
            addLog('error', 'Login realizado, mas permissões do Drive não foram concedidas.', 'connection');
            setIsAuthenticated(false);
            setUserEmail(null);
            setAccessTokenState(null);
            setAccessToken(null);
            handleSaveSettings({ googleDriveConnectionStatus: 'disconnected' });
            return;
          }

          if (!hasMetadata) {
            addLog('error', 'Token recebido sem escopos suficientes para listar pastas.', 'connection');
            setIsAuthenticated(false);
            setUserEmail(null);
            setAccessTokenState(null);
            setAccessToken(null);
            handleSaveSettings({ googleDriveConnectionStatus: 'disconnected' });
            return;
          }

          if (!hasFile) {
            addLog('error', 'Token recebido sem escopos suficientes para criar pastas.', 'connection');
            setIsAuthenticated(false);
            setUserEmail(null);
            setAccessTokenState(null);
            setAccessToken(null);
            handleSaveSettings({ googleDriveConnectionStatus: 'disconnected' });
            return;
          }
        }

        setIsAuthenticated(true);
        setUserEmail(res.user.email);
        setAccessTokenState(res.accessToken);
        setAccessToken(res.accessToken);
        handleSaveSettings({ 
          googleDriveConnectionStatus: 'connected',
          googleDriveConnectedEmail: res.user.email || '',
          googleDriveAccessToken: res.accessToken
        });
        addLog('success', 'Permissões Google Drive autorizadas com sucesso.', 'connection');
        addLog('success', 'Token de acesso recebido com escopos válidos.', 'connection');
        addLog('success', 'Google Drive conectado e autorizado com sucesso.', 'connection');
      } else {
        addLog('error', 'Não foi possível conectar ao Google Drive.', 'connection');
        addLog('error', 'Token de acesso não recebido.', 'connection');
        addLog('error', 'Verifique se o OAuth Client está corretamente configurado.', 'connection');
      }
    } catch (err: any) {
      addLog('error', 'Não foi possível conectar ao Google Drive.', 'connection');
      
      const errorCode = err?.code || '';
      
      if (errorCode === 'auth/popup-blocked') {
        addLog('error', 'Popup bloqueado pelo navegador.', 'connection');
      } else if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
        addLog('error', 'Autenticação cancelada pelo usuário.', 'connection');
      } else {
        addLog('error', 'Token de acesso não recebido.', 'connection');
        addLog('error', 'Verifique se o OAuth Client está corretamente configurado.', 'connection');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    addLog('info', 'Revogando token de acesso do Google Drive...');
    try {
      await logout();
    } catch (e) {}
    setIsAuthenticated(false);
    setUserEmail(null);
    setAccessTokenState(null);
    handleSaveSettings({ 
      googleDriveConnectionStatus: 'disconnected',
      googleDriveAccessToken: ''
    });
    addLog('info', 'Desconectado. Credenciais e tokens limpos.');
  };

  const handleTestConnection = async () => {
    addLog('info', 'Iniciando teste de conexão Google Drive...', 'connection');
    addLog('info', 'Verificando token de acesso...', 'connection');
    if (!accessToken) {
      addLog('error', 'Token de acesso indisponível. Conecte ao Google Drive primeiro.', 'connection');
      return;
    }
    addLog('success', 'Token de acesso encontrado.', 'connection');
    setIsTestLoading(true);
    addLog('info', 'Testando comunicação com Drive API...', 'connection');
    try {
      const ok = await testConnection(accessToken);
      if (ok) {
        addLog('success', 'Conexão real com Google Drive validada com sucesso.', 'connection');
        handleSaveSettings({ googleDriveConnectionStatus: 'connected' });
      } else {
        addLog('error', 'Falha na conexão de teste. Re-autorização necessária.', 'connection');
        handleSaveSettings({ googleDriveConnectionStatus: 'error' });
      }
    } catch (err: any) {
      addLog('error', `Falha ao testar conexão: ${err.message || err}`, 'connection');
      handleSaveSettings({ googleDriveConnectionStatus: 'error' });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleTestFolder = async (folderId: string) => {
    if (!accessToken) {
      addLog('error', 'Token de acesso indisponível. Conecte ao Google Drive primeiro.');
      return;
    }
    addLog('info', `Consultando o Google Drive para verificar a pasta de UID: ${folderId}...`);
    try {
      const { verifyFolderById } = await import('./lib/drive');
      const exists = await verifyFolderById(accessToken, folderId);
      if (exists) {
        addLog('success', 'Pasta destino localizada com sucesso.');
      } else {
        addLog('error', 'Não foi possível localizar a pasta destino.');
      }
    } catch (err: any) {
      addLog('error', 'Não foi possível localizar a pasta destino.');
    }
  };

  /**
   * SEPARATED OPERATIONAL FLOW: PESSOA FÍSICA (PF)
   */
  const handleCreateFolderPF = async () => {
    if (!activePayload) {
      addLog('error', 'Nenhum payload recebido do Portal BOSS.');
      return;
    }
    if (activePayload.clientType !== 'PF') {
      addLog('error', 'Tipo de cliente ausente ou inválido.');
      return;
    }

    const folderName = activePayload.clientFolderName?.trim() || '';
    if (!folderName) {
      addLog('error', 'Nome da pasta não recebido.');
      return;
    }

    if (!activePayload.portalClientId) {
      addLog('error', 'portalClientId ausente.');
      return;
    }

    if (!accessToken) {
      addLog('error', 'Verifique se o Google Drive está conectado corretamente.');
      return;
    }

    setIsCreatingPF(true);

    try {
      addLog('info', 'Processando criação de pasta PF via servidor...');
      const body = {
        clientType: 'PF',
        portalClientId: activePayload.portalClientId,
        caseId: activePayload.caseId || 'case_default_pf',
        clientFolderName: folderName,
        originBlock: activePayload.originBlock || 'pfDadosPessoais',
        originField: activePayload.originField || 'nomeCompleto'
      };

      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status})`);
      }

      const resData = await response.json() as BossResponse;
      if (resData.googleDriveStatus === 'success') {
        setActiveResponse(resData);
        localStorage.setItem('boss_active_response', JSON.stringify(resData));
        addLog('success', `Retorno para o Portal BOSS gerado com sucesso.`);

        if (resData.googleDriveOperation === 'linked') {
          addLog('info', 'Regra anti-duplicidade verificada: pasta de cliente já existente vinculada.');
        } else {
          addLog('success', 'Nova pasta de Pessoa Física mapeada e criada com sucesso.');
        }

        // Dispatch to parent in iframe environment if any
        if (window.parent) {
          window.parent.postMessage({
            type: 'PORTAL_BOSS_DRIVE_RESPONSE',
            payload: resData
          }, '*');
        }
      } else {
        addLog('error', `Falha ao processar: ${resData.googleDriveClientFolderLogFalha || 'Erro indeterminado'}`);
      }
    } catch (err: any) {
      console.error(err);
      addLog('error', `Não foi possível criar a pasta do cliente: ${err.message || err}`);
    } finally {
      setIsCreatingPF(false);
    }
  };

  /**
   * SEPARATED OPERATIONAL FLOW: PESSOA JURÍDICA (PJ)
   */
  const handleCreateFolderPJ = async () => {
    if (!activePayload) {
      addLog('error', 'Nenhum payload recebido do Portal BOSS.');
      return;
    }
    if (activePayload.clientType !== 'PJ') {
      addLog('error', 'Tipo de cliente ausente ou inválido.');
      return;
    }

    const resolvedPJFolderName =
      activePayload.clientFolderName?.trim()
      || activePayload.razaoSocial?.trim()
      || activePayload.documento?.trim()
      || '';

    if (!resolvedPJFolderName) {
      addLog('error', 'Não foi possível importar o nome fantasia ou razão social da Pessoa Jurídica.');
      addLog('error', 'Nome da pasta não recebido.');
      return;
    }

    if (!activePayload.portalClientId) {
      addLog('error', 'portalClientId ausente.');
      return;
    }

    if (activePayload.clientFolderName?.trim()) {
      addLog('success', `Nome fantasia recebido: ${activePayload.clientFolderName.trim()}.`);
    } else if (activePayload.razaoSocial?.trim()) {
      addLog('success', 'Nome fantasia ausente; usando razão social da Pessoa Jurídica como fallback.');
    } else {
      addLog('success', 'Nome fantasia e razão social ausentes; usando o documento da Pessoa Jurídica como fallback.');
    }

    if (!accessToken) {
      addLog('error', 'Verifique se o Google Drive está conectado corretamente.');
      return;
    }

    setIsCreatingPJ(true);

    try {
      addLog('info', 'Processando criação de pasta PJ via servidor...');
      const body = {
        clientType: 'PJ',
        portalClientId: activePayload.portalClientId,
        caseId: activePayload.caseId || 'case_default_pj',
        clientFolderName: resolvedPJFolderName,
        originBlock: activePayload.originBlock || 'pjDadosEmpresa',
        originField: activePayload.originField || 'nomeFantasia'
      };

      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status})`);
      }

      const resData = await response.json() as BossResponse;
      if (resData.googleDriveStatus === 'success') {
        setActiveResponse(resData);
        localStorage.setItem('boss_active_response', JSON.stringify(resData));
        addLog('success', `Retorno para o Portal BOSS gerado com sucesso.`);

        if (resData.googleDriveOperation === 'linked') {
          addLog('info', 'Regra anti-duplicidade verificada: pasta de cliente já existente vinculada.');
        } else {
          addLog('success', 'Nova pasta de Pessoa Jurídica criada com sucesso.');
        }

        // Dispatch to parent in iframe environment if any
        if (window.parent) {
          window.parent.postMessage({
            type: 'PORTAL_BOSS_DRIVE_RESPONSE',
            payload: resData
          }, '*');
        }
      } else {
        addLog('error', `Falha ao processar: ${resData.googleDriveClientFolderLogFalha || 'Erro indeterminado'}`);
      }
    } catch (err: any) {
      console.error(err);
      addLog('error', `Não foi possível criar a pasta do cliente: ${err.message || err}`);
    } finally {
      setIsCreatingPJ(false);
    }
  };

  return (
    <div id="main-app" className="min-h-screen bg-slate-50 flex font-sans text-slate-900 select-none antialiased">
      
      {/* Sidebar Navigation */}
      <aside className="w-68 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-950">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/25">
            G
          </div>
          <div>
            <span className="font-semibold text-white tracking-tight block text-sm">Giffoni Connect</span>
            <span className="text-[10px] text-slate-500 block -mt-0.5 font-mono">Integração Drive</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 select-none">
            Módulos Operacionais
          </div>
          <button
            onClick={() => setActiveTab('flow')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'flow' 
                ? 'bg-slate-800 text-white shadow-sm border border-slate-750' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <FolderLock className={`w-4 h-4 ${activeTab === 'flow' ? 'text-blue-500' : 'text-slate-500'}`} />
            <span>Criar Pasta do Cliente</span>
          </button>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-6 mb-2 px-2 select-none">
            Ajustes de API
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-slate-800 text-white shadow-sm border border-slate-750' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-blue-500' : 'text-slate-500'}`} />
            <span>Configurações Drive</span>
          </button>
        </nav>

        {/* Info box at sidebar bottom */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/20 text-[11px] text-slate-550 space-y-1">
          <div className="font-semibold text-slate-450 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {isAuthenticated ? 'Status: Conectado' : 'Status: Off-line'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Build v1.2.0 Stable</div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>Integração Google Drive</span>
            <span className="text-slate-300">/</span>
            {activeTab === 'flow' ? (
              <span className="text-slate-900 font-semibold text-xs bg-slate-100 px-2.5 py-0.5 rounded-md">
                Criar Pasta do Cliente no Google Drive
              </span>
            ) : (
              <span className="text-slate-900 font-semibold text-xs bg-slate-100 px-2.5 py-0.5 rounded-md">
                Configurações Drive
              </span>
            )}
          </div>

          {/* Quick Active Operator Widget */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">{userEmail || 'direito.rgr@gmail.com'}</div>
              <div className="text-[9.5px] text-slate-400 font-medium -mt-0.5 uppercase tracking-wide">Conta Destino</div>
            </div>
            
            {isAuthenticated ? (
              <div 
                className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs uppercase cursor-pointer"
                title={userEmail || "Conectado"}
              >
                {userEmail ? userEmail.charAt(0) : 'U'}
              </div>
            ) : (
              <div 
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-250 text-slate-400 flex items-center justify-center font-bold text-xs uppercase"
                title="Desconectado"
              >
                ?
              </div>
            )}
          </div>
        </header>

        {/* Workspace content wrapper */}
        <div className="p-8 flex-1 flex flex-col justify-between min-h-[500px]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            {activeTab === 'flow' ? (
              <StructuredStep
                activePayload={activePayload}
                activeResponse={activeResponse}
                onInjectPayload={receivePayload}
                onCreateFolderPF={handleCreateFolderPF}
                onCreateFolderPJ={handleCreateFolderPJ}
                isCreatingPF={isCreatingPF}
                isCreatingPJ={isCreatingPJ}
                isAuthenticated={isAuthenticated}
                onLogin={handleLogin}
                settings={settings}
                logs={logs}
                onClearLogs={handleClearLogs}
                onAddLog={addLog}
              />
            ) : (
              <ConfigurationPage
                isAuthenticated={isAuthenticated}
                accessToken={accessToken}
                userEmail={userEmail}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                logs={logs}
                onClearLogs={handleClearLogs}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onTestConnection={handleTestConnection}
                isTesting={isTestLoading}
                onAddLog={addLog}
                onTestFolder={handleTestFolder}
              />
            )}
          </div>

          {/* Footer Bar */}
          <footer className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-xs"></div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Criação Isolada PF/PJ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Regra Anti-Duplicidade</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Giffoni Connect • Conexão com <strong className="text-slate-600">clientes office</strong>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
