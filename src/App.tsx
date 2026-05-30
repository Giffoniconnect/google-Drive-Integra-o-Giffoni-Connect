/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  FolderLock, 
  Settings, 
  FileText, 
  ExternalLink, 
  Compass, 
  Info,
  CheckCircle,
  HelpCircle,
  LogIn
} from 'lucide-react';
import { Client, IntegrationSettings, IntegrationLog } from './types';
import { initAuth, googleSignIn, logout, getAccessToken, setAccessToken } from './lib/firebase';
import { checkFolderExists, createFolder, testConnection } from './lib/drive';
import { ConfigurationPage } from './components/ConfigurationPage';
import { StructuredStep } from './components/StructuredStep';

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client_1',
    type: 'PF',
    nomeCompleto: 'Roberto Giffoni',
    documento: '123.456.789-00',
  },
  {
    id: 'client_2',
    type: 'PJ',
    nomeCompleto: '',
    razaoSocial: 'Giffoni Connect Empreendimentos LTDA',
    nomeFantasia: 'Giffoni Connect',
    documento: '12.345.678/0001-99',
  },
  {
    id: 'client_3',
    type: 'PF',
    nomeCompleto: 'Ana Souza',
    documento: '987.654.321-11',
  },
  {
    id: 'client_4',
    type: 'PJ',
    nomeCompleto: '',
    razaoSocial: 'Boss Hub Consultoria LTDA',
    documento: '88.888.888/0001-88',
  }
];

const INITIAL_SETTINGS: IntegrationSettings = {
  rootFolderId: '',
  rootFolderName: 'Raiz Geral do Drive',
  status: 'disconnected',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'flow' | 'settings'>('flow');
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('client_1');
  const [settings, setSettings] = useState<IntegrationSettings>(INITIAL_SETTINGS);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);

  // Helper to push systemic logs
  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const newLog: IntegrationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message,
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Load state from localStorage on init
  useEffect(() => {
    // 1. Clients
    const storedClients = localStorage.getItem('boss_drive_clients');
    if (storedClients) {
      try {
        const parsed = JSON.parse(storedClients);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(c => c && typeof c === 'object' && c.id);
          setClients(filtered.length > 0 ? filtered : INITIAL_CLIENTS);
        } else {
          setClients(INITIAL_CLIENTS);
        }
      } catch (e) {
        setClients(INITIAL_CLIENTS);
      }
    } else {
      setClients(INITIAL_CLIENTS);
      localStorage.setItem('boss_drive_clients', JSON.stringify(INITIAL_CLIENTS));
    }

    // 2. Settings
    const storedSettings = localStorage.getItem('boss_drive_settings');
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        setSettings(INITIAL_SETTINGS);
      }
    }

    // 3. Welcome log
    addLog('info', 'Portal BOSS Clientes — Console de Integração Carregado.');
  }, []);

  // Sync clients to localStorage when edited
  const saveClients = (updatedClients: Client[]) => {
    setClients(updatedClients);
    localStorage.setItem('boss_drive_clients', JSON.stringify(updatedClients));
  };

  // Sync settings to localStorage when edited
  const handleSaveSettings = (newSettingsFields: Partial<IntegrationSettings>) => {
    const val = { ...settings, ...newSettingsFields };
    setSettings(val);
    localStorage.setItem('boss_drive_settings', JSON.stringify(val));
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Auth setup hook
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setAccessTokenState(token);
        setAccessToken(token); // set in memory inside firebase module
        handleSaveSettings({ status: 'connected' });
        addLog('success', `Autenticação restaurada com sucesso para: ${user.email}`);
      },
      () => {
        setIsAuthenticated(false);
        setUserEmail(null);
        setAccessTokenState(null);
        setAccessToken(null);
        handleSaveSettings({ status: 'disconnected' });
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    addLog('info', 'Solicitando login via Google Autenticação...');
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setUserEmail(res.user.email);
        setAccessTokenState(res.accessToken);
        handleSaveSettings({ status: 'connected' });
        addLog('success', `Conectado com sucesso ao Google Drive! Conta: ${res.user.email}`);
      }
    } catch (err: any) {
      addLog('error', `Falha no Login: ${err.message || err}`);
      handleSaveSettings({ status: 'error' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    addLog('info', 'Fazer logout da conta Google...');
    try {
      await logout();
      setIsAuthenticated(false);
      setUserEmail(null);
      setAccessTokenState(null);
      handleSaveSettings({ status: 'disconnected' });
      addLog('warning' as any, 'Conta desconectada. Credenciais revogadas.');
    } catch (err: any) {
      addLog('error', `Falha no logout: ${err.message || err}`);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken) {
      addLog('error', 'Token de acesso inválido ou expirado. Re-autentique.');
      return;
    }
    setIsTestLoading(true);
    addLog('info', 'Testando conexão ativa com a Google Drive REST API...');
    try {
      const ok = await testConnection(accessToken);
      if (ok) {
        addLog('success', 'Conexão e token válidos! Google Drive respondeu com status 200 OK.');
        handleSaveSettings({ status: 'connected' });
      } else {
        addLog('error', 'Falha no teste: A API respondeu com erro de autenticação.');
        handleSaveSettings({ status: 'error' });
      }
    } catch (err: any) {
      addLog('error', `Falha ao testar conexão: ${err.message || err}`);
      handleSaveSettings({ status: 'error' });
    } finally {
      setIsTestLoading(false);
    }
  };

  // MAIN TASK logic: CREATE FOLDER
  const handleCreateFolder = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      addLog('error', 'Erro interno: Cliente selecionado não existente.');
      return;
    }

    if (!accessToken) {
      addLog('error', 'Operação bloqueada: Autenticação Google Drive requerida.');
      return;
    }

    setIsActionLoading(true);

    // Resolve name according to rules
    let resolvedFolderName = '';
    if (client.type === 'PF') {
      resolvedFolderName = client.nomeCompleto.trim();
    } else {
      resolvedFolderName = (client.nomeFantasia || client.razaoSocial || '').trim();
    }

    if (!resolvedFolderName) {
      resolvedFolderName = `Cliente ID ${client.id}`;
    }

    addLog('info', `Iniciando verificação de existência para pasta do cliente: "${resolvedFolderName}"...`);

    try {
      // 1. Duplication Check
      const checkResult = await checkFolderExists(accessToken, resolvedFolderName, settings.rootFolderId);
      
      if (checkResult.exists && checkResult.id) {
        // Recover existing link without duplication
        addLog('success', `Pasta do cliente encontrada! Vinculando ao registro existente ID: ${checkResult.id}`);
        
        const updatedClients = clients.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              googleDriveClientFolderId: checkResult.id,
              googleDriveClientFolderUrl: checkResult.webViewLink,
              googleDriveCreatedAt: c.googleDriveCreatedAt || new Date().toISOString(),
              googleDriveStatus: 'linked' as const,
            };
          }
          return c;
        });

        saveClients(updatedClients);
        addLog('info', `Pasta do cliente "${resolvedFolderName}" vinculada com sucesso conforme regra de não duplicidade.`);
        setIsActionLoading(false);
        return;
      }

      // 2. Create New Folder If Not Found
      addLog('info', `Pasta inexistente. Criando nova pasta "${resolvedFolderName}" no Google Drive...`);
      const createResult = await createFolder(accessToken, resolvedFolderName, settings.rootFolderId);

      const timestamp = new Date().toISOString();
      const updatedClients = clients.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            googleDriveClientFolderId: createResult.id,
            googleDriveClientFolderUrl: createResult.webViewLink,
            googleDriveCreatedAt: timestamp,
            googleDriveStatus: 'created' as const,
          };
        }
        return c;
      });

      saveClients(updatedClients);
      addLog('success', `Pasta do cliente "${resolvedFolderName}" criada com sucesso! Link: ${createResult.webViewLink}`);

    } catch (error: any) {
      console.error(error);
      addLog('error', `Falha na operação: ${error.message || error}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    saveClients(updated);
    addLog('info', `Simulador: Novo cliente "${newClient.nomeCompleto || newClient.nomeFantasia || newClient.razaoSocial}" adicionado.`);
  };

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];

  return (
    <div id="main-app" className="min-h-screen bg-slate-50 flex font-sans text-slate-900 select-none antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-68 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-950">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/25">
            B
          </div>
          <div>
            <span className="font-semibold text-white tracking-tight block text-sm">Portal BOSS</span>
            <span className="text-[10px] text-slate-500 block -mt-0.5 font-mono">Giffoni Connect</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-2 select-none">
            Fluxo de Produção
          </div>
          <button
            onClick={() => setActiveTab('flow')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'flow' 
                ? 'bg-slate-800 text-white shadow-sm border border-slate-750' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'flow' ? 'text-blue-500' : 'text-slate-500'}`} />
            <span>Automação de Criar Pasta a partir do nome do cliente no cadastro</span>
          </button>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-6 mb-2 px-2 select-none">
            Geral
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
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Drive API Ativa
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Build v1.0.4 Stable</div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>Portal BOSS</span>
            <span className="text-slate-300">/</span>
            {activeTab === 'flow' ? (
              <>
                <span>Fluxo de Produção</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-semibold text-xs bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Automação de Criar Pasta a partir do nome do cliente no cadastro
                </span>
              </>
            ) : (
              <>
                <span>Configurações</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-semibold text-xs bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Integrações Google Drive
                </span>
              </>
            )}
          </div>

          {/* Quick Active Operator Widget */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">Admin Giffoni</div>
              <div className="text-[9.5px] text-slate-400 font-medium -mt-0.5 uppercase tracking-wide">Operador BOSS</div>
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

        {/* Real-world Interactive Workspace */}
        <div className="p-8 flex-1 flex flex-col justify-between min-h-[500px]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            {activeTab === 'flow' ? (
              <StructuredStep
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
                onCreateFolder={handleCreateFolder}
                isCreating={isActionLoading}
                isAuthenticated={isAuthenticated}
                onLogin={handleLogin}
                onAddClient={handleAddClient}
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
              />
            )}
          </div>

          {/* Quick Legend / Info Bar precisely matching "Professional Polish" Design */}
          <footer className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-xs"></div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Criação Automática</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-300"></div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Prevenção de Duplicidade</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Garantindo integridade entre o <strong className="text-slate-600">Fluxo 1.6</strong> e a <strong className="text-slate-600">API Google Drive</strong>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

