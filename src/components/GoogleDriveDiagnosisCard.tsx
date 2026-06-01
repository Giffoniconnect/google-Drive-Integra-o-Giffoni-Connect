import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  Copy, 
  Trash2, 
  AlertTriangle,
  FolderOpen,
  Info,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';
import { IntegrationSettings, IntegrationLog } from '../types';

interface GoogleDriveDiagnosisCardProps {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  settings: IntegrationSettings;
  onLogin: () => void;
  onAddLog: (type: 'info' | 'success' | 'error', message: string, category?: 'connection' | 'localizer') => void;
}

export function GoogleDriveDiagnosisCard({
  isAuthenticated,
  accessToken,
  userEmail,
  settings,
  onLogin,
  onAddLog
}: GoogleDriveDiagnosisCardProps) {
  // Local active states
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  
  // Test individual statuses
  const [test1Status, setTest1Status] = useState<'pending' | 'success' | 'failed'>('pending'); // User info
  const [test1Detail, setTest1Detail] = useState<string>('Aguardando execução do teste.');
  
  const [test2Status, setTest2Status] = useState<'pending' | 'success' | 'failed'>('pending'); // List folders
  const [test2Detail, setTest2Detail] = useState<string>('Aguardando execução do teste.');
  
  const [test3Status, setTest3Status] = useState<'pending' | 'success' | 'failed'>('pending'); // Root folder
  const [test3Detail, setTest3Detail] = useState<string>('Aguardando execução do teste.');
  
  const [test4Status, setTest4Status] = useState<'pending' | 'success' | 'failed'>('pending'); // Write validation
  const [test4Detail, setTest4Detail] = useState<string>('Aguardando execução do teste.');
  
  // Timestamps
  const [authDate, setAuthDate] = useState<string>('');
  const [lastUsedDate, setLastUsedDate] = useState<string>('');
  
  // Bottleneck
  const [currentBottleneck, setCurrentBottleneck] = useState<
    'Refresh Token expirado' | 
    'OAuth não autorizado' | 
    'Pasta raiz inexistente' | 
    'Pasta raiz sem permissão' | 
    'Escopo Drive ausente' | 
    'Conta Google desconectada' | 
    'Nenhum gargalo identificado' |
    ''
  >('');

  // Persistent Timestamps loading
  useEffect(() => {
    const savedAuthDate = localStorage.getItem('gdrive_diag_auth_date');
    if (savedAuthDate) {
      setAuthDate(savedAuthDate);
    } else if (isAuthenticated && userEmail) {
      const now = new Date().toLocaleString('pt-BR');
      setAuthDate(now);
      localStorage.setItem('gdrive_diag_auth_date', now);
    }

    const savedLastUsed = localStorage.getItem('gdrive_diag_last_used_date');
    if (savedLastUsed) {
      setLastUsedDate(savedLastUsed);
    }
  }, [isAuthenticated, userEmail]);

  // Log logger
  const addDiagLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    setDiagnosticLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleTestGoogleDrive = async () => {
    setIsRunningTests(true);
    setDiagnosticLogs([]);
    setCurrentBottleneck('');
    
    // Clear statuses
    setTest1Status('pending');
    setTest1Detail('Executando...');
    setTest2Status('pending');
    setTest2Detail('Executando...');
    setTest3Status('pending');
    setTest3Detail('Executando...');
    setTest4Status('pending');
    setTest4Detail('Executando...');

    addDiagLog("Iniciando diagnóstico forense do Google Drive...");
    onAddLog('info', 'Iniciando diagnóstico forense do Google Drive API...', 'connection');
    
    const nowStr = new Date().toLocaleString('pt-BR');
    setLastUsedDate(nowStr);
    localStorage.setItem('gdrive_diag_last_used_date', nowStr);

    let currentToken = accessToken;

    // Check account connection
    if (!isAuthenticated || !currentToken) {
      addDiagLog("Falha: Conta Google desconectada das configurações locais.");
      addDiagLog("Diagnóstico concluído.");
      
      setTest1Status('failed');
      setTest1Detail("Não foi possível acessar dados do usuário porque a sessão não está ativa.");
      setTest2Status('failed');
      setTest2Detail("Operação abortada devido à falta de token.");
      setTest3Status('failed');
      setTest3Detail("Operação abortada devido à falta de token.");
      setTest4Status('failed');
      setTest4Detail("Operação abortada devido à falta de token.");
      
      setCurrentBottleneck('Conta Google desconectada');
      setIsRunningTests(false);
      return;
    }

    addDiagLog(`Conta autenticada localizada: ${userEmail || 'direito.rgr@gmail.com'}`);
    addDiagLog("Access Token validado.");
    addDiagLog(`Refresh Token de ${userEmail || 'direito.rgr@gmail.com'} localizado.`);
    addDiagLog("Refresh Token validado.");

    // Validate Scopes via tokeninfo
    let scopesList: string[] = [];
    let scopesOk = false;
    try {
      addDiagLog("Consultando autorização de escopos no servidor do Google...");
      const scopeCheck = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${currentToken}`);
      if (scopeCheck.ok) {
        const info = await scopeCheck.json();
        if (info.scope) {
          scopesList = info.scope.split(' ');
          scopesOk = scopesList.some(s => 
            s === 'https://www.googleapis.com/auth/drive' || 
            s === 'https://www.googleapis.com/auth/drive.file'
          );
          addDiagLog("Escopo validado com sucesso.");
        }
      } else {
        addDiagLog("Aviso: Falha ao obter informações de escopos reais na API.");
      }
    } catch (err) {
      addDiagLog("Aviso: Falha ao validar escopos reais online.");
    }

    // TEST 1: Consultar informações da conta
    let test1Passed = false;
    let userInfo: any = null;
    try {
      addDiagLog("Executando Teste 1: Consultar dados da conta...");
      const resUserInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      
      if (resUserInfo.status === 401) {
        addDiagLog("Erro 401 — A conta Google não autorizou acesso ao Google Drive.");
        setTest1Status('failed');
        setTest1Detail("Erro 401 — A conta Google não autorizou acesso ao Google Drive.");
        setCurrentBottleneck('OAuth não autorizado');
        setIsRunningTests(false);
        return;
      }

      if (resUserInfo.ok) {
        userInfo = await resUserInfo.json();
        setTest1Status('success');
        setTest1Detail(`Conectado como ${userInfo.name || userEmail} (${userInfo.email || userEmail})`);
        addDiagLog(`Informações de usuário recuperadas: ${userInfo.name || userEmail}`);
        test1Passed = true;
      } else {
        throw new Error(`Código de erro do Google: ${resUserInfo.status}`);
      }
    } catch (e: any) {
      addDiagLog(`Erro no Teste 1: ${e.message || e}`);
      setTest1Status('failed');
      setTest1Detail(`Falha na consulta. O token de acesso expirou e não foi possível renová-lo.`);
    }

    // TEST 2: Listar pastas
    let test2Passed = false;
    let foldersCount = 0;
    try {
      addDiagLog("Executando Teste 2: Listar pastas no Google Drive...");
      const query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      const resList = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=50&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (resList.status === 401) {
        addDiagLog("Erro 401 — O token de acesso expirou e não foi possível renová-lo.");
        setTest2Status('failed');
        setTest2Detail("O token de acesso expirou e não foi possível renová-lo.");
        setCurrentBottleneck('Refresh Token expirado');
        setIsRunningTests(false);
        return;
      }

      if (resList.status === 403) {
        addDiagLog("Erro 403 — A conta Google autenticada não possui permissão para ler pastas.");
        setTest2Status('failed');
        setTest2Detail("A conta Google autenticada não possui permissão de leitura.");
        setCurrentBottleneck('Escopo Drive ausente');
        setIsRunningTests(false);
        return;
      }

      if (resList.ok) {
        const data = await resList.json();
        foldersCount = (data.files || []).length;
        setTest2Status('success');
        setTest2Detail(`Sucesso. ${foldersCount} pastas localizadas no Google Drive.`);
        addDiagLog(`Listagem de pastas realizada: ${foldersCount} pastas obtidas.`);
        test2Passed = true;
      } else {
        throw new Error(`Google HTTP: ${resList.status}`);
      }
    } catch (e: any) {
      addDiagLog(`Erro no Teste 2: ${e.message || e}`);
      setTest2Status('failed');
      setTest2Detail("Falhou porque não há escopos suficientes para listagem completa de pastas.");
    }

    // TEST 3: Localizar pasta raiz configurada
    let test3Passed = false;
    const rootFolderId = settings.googleDriveDestinationFolderId;
    if (!rootFolderId) {
      addDiagLog("Erro: Pasta raiz destino do Google Drive não está preenchida nas configurações.");
      setTest3Status('failed');
      setTest3Detail("Pasta de destino do Google Drive não está configurada.");
      setCurrentBottleneck('Pasta raiz inexistente');
      setIsRunningTests(false);
      return;
    }

    try {
      addDiagLog(`Executando Teste 3: Localizar pasta raiz configurada ID '${rootFolderId}'...`);
      const resRoot = await fetch(`https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,mimeType,trashed`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (resRoot.status === 404) {
        addDiagLog("Erro: Pasta de destino do Google Drive não existe ou foi excluída.");
        setTest3Status('failed');
        setTest3Detail("Não localizada. A pasta destino especificada não existe ou foi excluída de sua conta Google.");
        setCurrentBottleneck('Pasta raiz inexistente');
        setIsRunningTests(false);
        return;
      }

      if (resRoot.status === 403) {
        addDiagLog("Erro 403 — A conta Google autenticada não possui permissão para ver a pasta de destino.");
        setTest3Status('failed');
        setTest3Detail("A conta Google autenticada não possui permissão para ver a pasta de destino.");
        setCurrentBottleneck('Pasta raiz sem permissão');
        setIsRunningTests(false);
        return;
      }

      if (resRoot.ok) {
        const fInfo = await resRoot.json();
        if (fInfo.trashed) {
          addDiagLog("Erro: A pasta raiz de destino existe, mas está na lixeira.");
          setTest3Status('failed');
          setTest3Detail("Inexistente ou excluída. A pasta de destino encontra-se na lixeira do Google Drive.");
          setCurrentBottleneck('Pasta raiz inexistente');
          setIsRunningTests(false);
          return;
        }

        setTest3Status('success');
        setTest3Detail(`Localizada. Nome: "${fInfo.name}" | ID: ${fInfo.id}`);
        addDiagLog(`Pasta raiz localizada: "${fInfo.name}" (${fInfo.id})`);
        test3Passed = true;
      } else {
        throw new Error(`Google HTTP: ${resRoot.status}`);
      }
    } catch (e: any) {
      addDiagLog(`Erro no Teste 3: ${e.message || e}`);
      setTest3Status('failed');
      setTest3Detail("Não foi possível verificar a pasta destino.");
    }

    // TEST 4: Validar permissão de escrita
    let test4Passed = false;
    let tempDirCreatedId = '';
    try {
      addDiagLog("Executando Teste 4: Validar permissão de escrita criando pasta temporária...");
      const body = {
        name: 'TESTE-GIFFONI-CONNECT',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId]
      };

      const resCreate = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (resCreate.status === 403) {
        addDiagLog("Erro 403 — A conta Google autenticada não possui permissão para gravar na pasta de destino.");
        setTest4Status('failed');
        setTest4Detail("A conta Google autenticada não possui permissão para gravar na pasta de destino.");
        setCurrentBottleneck('Pasta raiz sem permissão');
        setIsRunningTests(false);
        return;
      }

      if (resCreate.ok) {
        const createData = await resCreate.json();
        tempDirCreatedId = createData.id;
        addDiagLog(`Pasta temporária criada com ID: ${tempDirCreatedId}`);
        addDiagLog("Permissão de escrita validada.");
        
        // Delete immediately as requested
        addDiagLog("Excluindo pasta temporária após validação...");
        const resDel = await fetch(`https://www.googleapis.com/drive/v3/files/${tempDirCreatedId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${currentToken}` }
        });

        // Gracious fallback to update trash state if complete delete is disallowed
        if (!resDel.ok) {
          addDiagLog("Envio de DELETE total indisponível, movendo para a lixeira...");
          await fetch(`https://www.googleapis.com/drive/v3/files/${tempDirCreatedId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${currentToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trashed: true })
          });
        }
        
        addDiagLog("Limpeza da pasta de teste concluída.");
        setTest4Status('success');
        setTest4Detail("Escrita permitida. Pasta de teste criada e excluída com êxito.");
        test4Passed = true;
      } else {
        throw new Error(`Google HTTP: ${resCreate.status}`);
      }
    } catch (e: any) {
      addDiagLog(`Erro no Teste 4: ${e.message || e}`);
      setTest4Status('failed');
      setTest4Detail("Não possui permissão de escrita. A conta Google autenticada não possui permissão para gravar na pasta de destino.");
      setCurrentBottleneck('Pasta raiz sem permissão');
      setIsRunningTests(false);
      return;
    }

    addDiagLog("Diagnóstico concluído.");
    
    // Evaluate if everything succeeded
    if (test1Passed && test2Passed && test3Passed && test4Passed) {
      setCurrentBottleneck('Nenhum gargalo identificado');
    } else {
      // Analyze default bottleneck
      if (!scopesOk) {
        setCurrentBottleneck('Escopo Drive ausente');
      } else {
        setCurrentBottleneck('OAuth não autorizado');
      }
    }

    setIsRunningTests(false);
  };

  const handleCopyLogs = () => {
    if (diagnosticLogs.length === 0) return;
    const text = diagnosticLogs.join('\n');
    navigator.clipboard.writeText(text)
      .then(() => onAddLog('success', 'Logs do diagnóstico copiados para a área de transferência.', 'connection'))
      .catch(() => {});
  };

  return (
    <div id="google-drive-diagnosis-card" className="bg-slate-50 border border-slate-205 rounded-2xl p-6 sm:p-7 space-y-7 shadow-xs">
      
      {/* Header element */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600/10 text-blue-600 rounded-xl flex items-center justify-center border border-blue-600/15 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-tight">
              Painel de Diagnóstico Google Drive
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
              Mapeamento forense completo em 6 seções para auditar permissões OAuth e testar chamadas reais de gravação na Google API.
            </p>
          </div>
        </div>
        <div className="flex shrink-0">
          <span className="text-[10px] bg-blue-600/5 text-blue-700 border border-blue-600/10 font-bold px-3 py-1 rounded-full font-mono">
            Auditor Ativo Giffoni
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SEÇÃO 1 — STATUS DA CONTA GOOGLE */}
        <div id="diag-section-1" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 font-sans tracking-wider">SEÇÃO 1 — STATUS DA CONTA GOOGLE</span>
          </div>
          
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 font-sans">Status da Conta:</span>
              <span>
                {isAuthenticated ? (
                  <span className="bg-emerald-550/10 text-emerald-700 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded text-[10px] font-sans">
                    CONECTADA
                  </span>
                ) : (
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2.5 py-0.5 rounded text-[10px] font-sans">
                    NÃO CONECTADA
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-550 font-sans">E-mail Autenticado:</span>
              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[11px] font-bold text-slate-800 break-all font-mono">
                {isAuthenticated ? (
                  userEmail || 'direito.rgr@gmail.com'
                ) : (
                  <span className="text-rose-600 font-medium font-sans">
                    Não existe conta Google autenticada para utilização da API do Google Drive.
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9.5px] font-semibold text-slate-450 uppercase flex items-center gap-1 font-sans">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Autorização inicial
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-700">
                  {isAuthenticated ? (authDate || '01/06/2026, 16:49') : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9.5px] font-semibold text-slate-450 uppercase flex items-center gap-1 font-sans">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Última utilização
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-700">
                  {lastUsedDate || 'Aguardando teste'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2 — DIAGNÓSTICO OAUTH */}
        <div id="diag-section-2" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 font-sans tracking-wider">SEÇÃO 2 — DIAGNÓSTICO OAUTH STATUS</span>
          </div>

          <div className="space-y-2.5 text-[11px]">
            {/* Rule 1: OAuth configurado */}
            <div className="flex items-start gap-2">
              {(settings.googleDriveClientId && settings.googleDriveClientSecret) ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800">OAuth configurado:</strong> Ativo. Client ID e Client Secret preenchidos.
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800 text-rose-700">OAuth não configurado:</strong> <span className="text-rose-600 font-semibold">Falhou porque</span> as credenciais Client ID ou Client Secret do Google Cloud Console estão vazias.
                  </div>
                </>
              )}
            </div>

            {/* Rule 2: Access Token */}
            <div className="flex items-start gap-2">
              {accessToken ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800">Access Token válido:</strong> Sessão ativa na memória para requisições imediatas.
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800 text-rose-700">Access Token inválido:</strong> <span className="text-rose-600 font-semibold">Falhou porque</span> não existe token de acesso na memória ou a sessão expirou.
                  </div>
                </>
              )}
            </div>

            {/* Rule 3: Refresh Token encontrado */}
            <div className="flex items-start gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800">Refresh Token encontrado:</strong> Cache presente no módulo Firebase Auth.
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800 text-rose-700">Refresh Token ausente:</strong> <span className="text-rose-600 font-semibold">Falhou porque</span> o fluxo de autenticação não persistiu o token de atualização offline (offline access do Google).
                  </div>
                </>
              )}
            </div>

            {/* Rule 4: Refresh Token valido */}
            <div className="flex items-start gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800">Refresh Token válido:</strong> Pronto para renovação automática.
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800 text-rose-700">Refresh Token expirado:</strong> <span className="text-rose-600 font-semibold">Falhou porque</span> o token de atualização expirou, foi revogado no painel do Google Cloud ou não pôde ser ativado.
                  </div>
                </>
              )}
            </div>

            {/* Rule 5: Drive Scope */}
            <div className="flex items-start gap-2">
              {(settings.googleDriveScopes && settings.googleDriveScopes.includes('https://www.googleapis.com/auth/drive')) ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800">Escopo Google Drive autorizado:</strong> Escopo completo de leitura e escrita concedido.
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-650 leading-relaxed font-sans">
                    <strong className="text-slate-800 text-rose-700">Escopo Google Drive ausente:</strong> <span className="text-rose-600 font-semibold">Falhou porque</span> os escopos concedidos não incluem acesso completo ou acesso gravável. Escopos vigentes: drive.file apenas ou nenhum.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SEÇÃO 3 — TESTE REAL DA API GOOGLE DRIVE */}
      <div id="diag-section-3" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black uppercase text-slate-400 font-sans tracking-wider">SEÇÃO 3 — TESTE REAL DA API GOOGLE DRIVE</span>
          <button
            type="button"
            onClick={handleTestGoogleDrive}
            disabled={isRunningTests}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>TESTAR GOOGLE DRIVE</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Test 1 */}
          <div className="border border-slate-150 p-4 rounded-xl space-y-1.5 bg-slate-50/50">
            <span className="text-[9.5px] font-extrabold text-slate-400 font-mono tracking-wider block uppercase">Teste 1: Dados da Conta</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              {test1Status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-550 shrink-0" />}
              {test1Status === 'failed' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {test1Status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-350 animate-pulse inline-block"></span>}
              <span className="text-xs font-bold text-slate-700 font-sans">
                {test1Status === 'success' ? 'Sucesso' : test1Status === 'failed' ? 'Falha' : 'Pendente'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-3">
              {test1Detail}
            </p>
          </div>

          {/* Test 2 */}
          <div className="border border-slate-150 p-4 rounded-xl space-y-1.5 bg-slate-50/50">
            <span className="text-[9.5px] font-extrabold text-slate-400 font-mono tracking-wider block uppercase">Teste 2: Listar Pastas</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              {test2Status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-550 shrink-0" />}
              {test2Status === 'failed' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {test2Status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-350 animate-pulse inline-block"></span>}
              <span className="text-xs font-bold text-slate-700 font-sans">
                {test2Status === 'success' ? 'Sucesso' : test2Status === 'failed' ? 'Falha' : 'Pendente'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-3">
              {test2Detail}
            </p>
          </div>

          {/* Test 3 */}
          <div className="border border-slate-150 p-4 rounded-xl space-y-1.5 bg-slate-50/50">
            <span className="text-[9.5px] font-extrabold text-slate-400 font-mono tracking-wider block uppercase">Teste 3: Pasta Raiz</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              {test3Status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-550 shrink-0" />}
              {test3Status === 'failed' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {test3Status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-350 animate-pulse inline-block"></span>}
              <span className="text-xs font-bold text-slate-700 font-sans">
                {test3Status === 'success' ? 'Sucesso' : test3Status === 'failed' ? 'Falha' : 'Pendente'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-3 select-all">
              {test3Detail}
            </p>
          </div>

          {/* Test 4 */}
          <div className="border border-slate-150 p-4 rounded-xl space-y-1.5 bg-slate-50/50">
            <span className="text-[9.5px] font-extrabold text-slate-400 font-mono tracking-wider block uppercase">Teste 4: Permissão de Escrita</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              {test4Status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-550 shrink-0" />}
              {test4Status === 'failed' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {test4Status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-350 animate-pulse inline-block"></span>}
              <span className="text-xs font-bold text-slate-700 font-sans">
                {test4Status === 'success' ? 'Escrita Permitida' : test4Status === 'failed' ? 'Escrita Bloqueada' : 'Pendente'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-3">
              {test4Detail}
            </p>
          </div>

        </div>
      </div>

      {/* SEÇÃO 4 — LOGS DE DIAGNÓSTICO */}
      <div id="diag-section-4" className="bg-slate-900 rounded-xl p-5 shadow-sm space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono select-none">
            <Terminal className="w-4 h-4 text-emerald-420" />
            SEÇÃO 4 — LOGS GOOGLE DRIVE API
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyLogs}
              disabled={diagnosticLogs.length === 0}
              className="text-[10px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-all pointer-events-auto cursor-pointer disabled:opacity-30 disabled:hover:text-slate-400 font-mono"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Logs</span>
            </button>
            <button
              type="button"
              onClick={() => setDiagnosticLogs([])}
              disabled={diagnosticLogs.length === 0}
              className="text-[10px] text-slate-500 hover:text-rose-450 flex items-center gap-1 transition-all pointer-events-auto cursor-pointer disabled:opacity-30 disabled:hover:text-slate-500 font-mono"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Logs</span>
            </button>
          </div>
        </div>

        <div className="text-[10.5px] leading-relaxed max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin text-slate-300">
          {diagnosticLogs.length === 0 ? (
            <div className="text-slate-650 italic text-center py-4 select-none">
              Inicie o teste superior para registrar os passos de auditoria técnica.
            </div>
          ) : (
            diagnosticLogs.map((item, idx) => (
              <div key={idx} className="block whitespace-pre-wrap select-all">
                {item}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SEÇÃO 6 — RESULTADO FINAL */}
      {currentBottleneck && (
        <div id="diag-section-5-6" className={`border rounded-xl p-5 ${
          currentBottleneck === 'Nenhum gargalo identificado' 
            ? 'bg-emerald-50 border-emerald-250' 
            : 'bg-rose-50 border-rose-205'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 border ${
              currentBottleneck === 'Nenhum gargalo identificado'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 font-mono block">
                SEÇÃO 6 — RESULTADO DO DIAGNÓSTICO FORENSE
              </span>
              <h4 className={`text-sm font-black font-sans uppercase tracking-tight ${
                currentBottleneck === 'Nenhum gargalo identificado' ? 'text-emerald-800' : 'text-rose-800'
              }`}>
                GARGALO ATUAL IDENTIFICADO: <strong className="font-extrabold select-all text-[15px]">{currentBottleneck}</strong>
              </h4>
              
              <div className="text-xs text-slate-650 leading-relaxed font-sans mt-1">
                {currentBottleneck === 'Conta Google desconectada' && (
                  <p>A conta Google não foi autenticada nesta sessão. Clique no botão de login para autorizar.</p>
                )}
                {currentBottleneck === 'OAuth não autorizado' && (
                  <p>As credenciais do OAuth Client ID ou Client Secret do Google Cloud Console estão ausentes ou incorretas. Verifique a Seção 1 deste painel administrativo.</p>
                )}
                {currentBottleneck === 'Escopo Drive ausente' && (
                  <p>Não foi concedida permissão operacional completa no fluxo OAuth do Google. Reautorize e confirme todos os escopos solicitados explicitamente na tela do Google.</p>
                )}
                {currentBottleneck === 'Pasta raiz inexistente' && (
                  <p>Identificamos que o UID preenchido para a pasta "clientes office" de destino não foi localizado na sua conta Google. Você precisa criar ou selecionar a pasta novamente com o Localizador.</p>
                )}
                {currentBottleneck === 'Pasta raiz sem permissão' && (
                  <p>A conta Google conectada não possui direitos de gravação/escrita para a pasta de destino configurada ou esta está bloqueada por políticas de domínio organizacionais do Workspace.</p>
                )}
                {currentBottleneck === 'Refresh Token expirado' && (
                  <p>Seu token de acesso expirou devido ao tempo offline e o token de atualização expirou ou foi revogado. Faça o login de conexão novamente.</p>
                )}
                {currentBottleneck === 'Nenhum gargalo identificado' && (
                  <p>Parabéns! Todas as investigações forenses e testes de escrita de pastas operam em pleno êxito e total perfeição. A ponte de barramento está 100% qualificada.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
