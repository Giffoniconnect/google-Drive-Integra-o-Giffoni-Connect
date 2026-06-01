import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  doc 
} from 'firebase/firestore';

const app = express();
const PORT = 3000;
const SESSION_FILE = path.join(process.cwd(), 'active_session.json');

app.use(express.json());

// Enable CORS for external API integrations like Portal BOSS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// App State
let serverState = {
  accessToken: '',
  userEmail: '',
  settings: {
    googleDriveConnectedEmail: 'direito.rgr@gmail.com',
    googleDriveConnectionStatus: 'disconnected',
    googleDriveApiKey: '',
    googleDriveClientId: '',
    googleDriveClientSecret: '',
    googleDriveRedirectUri: '',
    googleDriveScopes: 'https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/drive',
    googleDriveDestinationFolderName: 'clientes office',
    googleDriveDestinationFolderId: '',
    googleDriveDestinationFolderUrl: '',
    bossDriveIntegrationKey: 'boss_drive_live_giffoni_key_default'
  },
  activePayload: null as any,
  activeResponse: null as any,
  logs: [] as any[],
  receiverStatus: 'Aguardando payload'
};

// Log helper
function addServerLog(type: 'info' | 'success' | 'error', message: string) {
  const newLog = {
    id: 'server_log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    type,
    message
  };
  serverState.logs = [newLog, ...serverState.logs].slice(0, 100);
  saveSession();
}

// Load session at startup
if (fs.existsSync(SESSION_FILE)) {
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    serverState = { ...serverState, ...parsed };
    console.log('Sessão restaurada com sucesso do arquivo active_session.json');
  } catch (e) {
    console.error('Falha ao restaurar sessão anterior:', e);
  }
}

// Ensure receiver status and boot logs are configured
if (!serverState.receiverStatus) {
  serverState.receiverStatus = 'Aguardando payload';
}
const hasInitLogs = serverState.logs.some(l => l.message === 'Receptor iniciado.');
if (!hasInitLogs) {
  addServerLog('info', 'Receptor iniciado.');
  addServerLog('info', 'Aguardando payload.');
}

function saveSession() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(serverState, null, 2), 'utf-8');
  } catch (e) {
    console.error('Falha ao salvar sessão:', e);
  }
}

// Google Drive API Helpers (Server-side)
async function verifyFolderByIdOnDrive(token: string, folderId: string): Promise<boolean> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json() as any;
    return !!(data && data.mimeType === 'application/vnd.google-apps.folder' && !data.trashed);
  } catch (e) {
    return false;
  }
}

async function checkFolderExistsOnDrive(token: string, folderName: string, parentId?: string): Promise<{ exists: boolean; id?: string; webViewLink?: string }> {
  try {
    const safeName = folderName.replace(/'/g, "\\'");
    let query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId && parentId.trim() !== '') {
      query += ` and '${parentId}' in parents`;
    }
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API check foldex exists failed: ${res.status} - ${errText}`);
    }
    const data = await res.json() as any;
    if (data.files && data.files.length > 0) {
      return {
        exists: true,
        id: data.files[0].id,
        webViewLink: data.files[0].webViewLink || `https://drive.google.com/drive/folders/${data.files[0].id}`
      };
    }
    return { exists: false };
  } catch (e: any) {
    console.error('Error in checkFolderExistsOnDrive:', e);
    throw e;
  }
}

async function createFolderOnDrive(token: string, folderName: string, parentId?: string): Promise<{ id: string; webViewLink: string }> {
  try {
    const body: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId && parentId.trim() !== '') {
      body.parents = [parentId];
    }
    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API list failed: ${res.status} - ${errText}`);
    }
    const data = await res.json() as any;
    return {
      id: data.id,
      webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`
    };
  } catch (e: any) {
    console.error('Error in createFolderOnDrive:', e);
    throw e;
  }
}

// Initialize Firebase & Firestore Queue
let firestoreDb: any = null;

try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
  const firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId);
  console.log('Firebase e Firestore inicializados com sucesso no backend.');
} catch (error) {
  console.error('Falha ao inicializar o Firebase no backend:', error);
}

// Map of processed request IDs to avoid processing the same pending request in rapid succession
const processedRequests = new Set<string>();

async function processFirestoreRequest(requestId: string, data: any) {
  if (!firestoreDb) return;
  if (processedRequests.has(requestId)) return;
  processedRequests.add(requestId);

  const reqDocRef = doc(firestoreDb, 'googleDriveRequests', requestId);

  // Mark status as processing first to avoid double-invocation
  try {
    await updateDoc(reqDocRef, { status: 'processing' });
  } catch (err: any) {
    console.error('Falha ao marcar status como processando no Firestore:', err);
  }

  const handleRequestFailure = async (message: string) => {
    addServerLog('error', message);
    serverState.receiverStatus = 'Erro de comunicação';

    const resultPayload = {
      status: 'failed' as const,
      processedAt: new Date().toISOString(),
      googleDriveStatus: 'failed' as const,
      googleDriveClientFolderStatus: 'falha' as const,
      googleDriveClientFolderLogFalha: message
    };

    serverState.activePayload = {
      requestId,
      ...data,
      recebidoEm: new Date().toISOString()
    };
    
    serverState.activeResponse = {
      ...resultPayload,
      portalClientId: data.portalClientId || '',
      caseId: data.caseId || '',
      clientType: data.clientType || 'PF',
      googleDriveClientFolderName: data.clientFolderName || '',
      googleDriveClientFolderId: '',
      googleDriveClientFolderUrl: '',
      googleDriveCreatedAt: new Date().toISOString(),
      recebidoEm: new Date().toISOString(),
      googleDriveClientFolderResultLog: `Falha na operação: ${message}`
    };
    saveSession();

    try {
      await updateDoc(reqDocRef, resultPayload);
      addServerLog('success', 'Solicitação atualizada com sucesso no Firestore.');
      addServerLog('success', 'Retorno disponível para o Portal BOSS.');
    } catch (e: any) {
      addServerLog('error', `Falha ao atualizar status da solicitação no Firestore: ${e.message || e}`);
    }
  };

  try {
    const { clientType, portalClientId, caseId, clientFolderName, originBlock, originField } = data;

    addServerLog('info', 'Solicitação pendente localizada.');

    // 1. Validar dados obrigatórios
    if (!clientType || (clientType !== 'PF' && clientType !== 'PJ')) {
      return await handleRequestFailure('Tipo de cliente ausente ou inválido.');
    }
    if (!portalClientId) {
      return await handleRequestFailure('portalClientId ausente.');
    }
    if (!caseId) {
      return await handleRequestFailure('caseId é obrigatório.');
    }
    if (!clientFolderName || !clientFolderName.trim()) {
      return await handleRequestFailure('Nome da pasta não recebido.');
    }

    addServerLog('info', 'Dados da solicitação validados.');
    addServerLog('info', `Nome recebido: ${clientFolderName}`);
    addServerLog('info', `Tipo de cliente identificado: ${clientType}`);

    // Update local state is real and visual
    const activePayloadObj = {
      requestId,
      sourceBuild: 'Portal BOSS Clientes',
      clientType,
      portalClientId,
      caseId,
      clientFolderName,
      originBlock: originBlock || (clientType === 'PF' ? 'pfDadosPessoais' : 'pjDadosEmpresa'),
      originField: originField || (clientType === 'PF' ? 'nomeCompleto' : 'nomeFantasia'),
      recebidoEm: new Date().toISOString()
    };
    serverState.activePayload = activePayloadObj;
    serverState.receiverStatus = 'Processando';
    saveSession();

    // 2. Validar token Google Drive (Active token validation)
    const token = serverState.accessToken;
    if (!token) {
      return await handleRequestFailure('Verifique se o Google Drive está conectado corretamente.');
    }

    // 3. Validar pasta destino
    const destFolderId = serverState.settings.googleDriveDestinationFolderId;
    if (!destFolderId) {
      return await handleRequestFailure('Pasta de destino do Google Drive não está configurada.');
    }

    const isDestValid = await verifyFolderByIdOnDrive(token, destFolderId);
    if (!isDestValid) {
      return await handleRequestFailure('Pasta de destino do Google Drive não existe ou foi excluída.');
    }
    addServerLog('success', 'Pasta destino validada.');

    // 4. Verificar anti-duplicidade
    addServerLog('info', 'Anti-duplicidade executada.');
    const searchResult = await checkFolderExistsOnDrive(token, clientFolderName, destFolderId);

    let folderId = '';
    let webViewLink = '';
    let operation: 'created' | 'linked' = 'created';

    if (searchResult.exists && searchResult.id) {
      folderId = searchResult.id;
      webViewLink = searchResult.webViewLink || `https://drive.google.com/drive/folders/${searchResult.id}`;
      operation = 'linked';
    } else {
      const createResult = await createFolderOnDrive(token, clientFolderName, destFolderId);
      folderId = createResult.id;
      webViewLink = createResult.webViewLink;
      operation = 'created';
    }

    addServerLog('success', 'Pasta criada/localizada.');

    // 5. Salvar retorno e atualizar o documento da solicitação com status "success"
    const resultPayload = {
      status: 'success' as const,
      processedAt: new Date().toISOString(),
      googleDriveClientFolderName: clientFolderName,
      googleDriveClientFolderId: folderId,
      googleDriveClientFolderUrl: webViewLink,
      googleDriveOperation: operation,
      googleDriveClientFolderStatus: 'criada' as const,
      googleDriveStatus: 'success' as const
    };

    const responsePayload = {
      portalClientId,
      caseId,
      clientType,
      googleDriveClientFolderName: clientFolderName,
      googleDriveClientFolderId: folderId,
      googleDriveClientFolderUrl: webViewLink,
      googleDriveCreatedAt: new Date().toISOString(),
      googleDriveStatus: 'success' as const,
      googleDriveClientFolderStatus: 'criada' as const,
      googleDriveOperation: operation,
      recebidoEm: new Date().toISOString(),
      googleDriveClientFolderResultLog: operation === 'created'
        ? 'Ação de criação concluída com êxito'
        : 'Ação de localização de pasta concluída com êxito'
    };

    serverState.activeResponse = responsePayload;
    serverState.receiverStatus = 'Retorno enviado';
    saveSession();

    try {
      await updateDoc(reqDocRef, resultPayload);
      addServerLog('success', 'Solicitação atualizada com sucesso no Firestore.');
      addServerLog('success', 'Retorno disponível para o Portal BOSS.');
    } catch (e: any) {
      addServerLog('error', `Falha ao atualizar resultado no Firestore: ${e.message || e}`);
    }

  } catch (err: any) {
    console.error('Erro ao processar requisição do Firestore:', err);
    return await handleRequestFailure(`Falha ao operar criação de pasta no Google Drive: ${err.message || err}`);
  }
}

function setupFirestoreQueue() {
  if (!firestoreDb) {
    console.error('Firestore não inicializado. Não foi possível iniciar a fila.');
    return;
  }
  addServerLog('info', 'Aguardando solicitações do Portal BOSS no Firestore.');

  const requestsCollection = collection(firestoreDb, 'googleDriveRequests');
  const q = query(requestsCollection, where('status', '==', 'pending'));

  onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const docSnap = change.doc;
        const requestData = docSnap.data();
        const requestId = docSnap.id;
        await processFirestoreRequest(requestId, requestData);
      }
    }
  }, (error) => {
    console.error('Erro na escuta do Firestore:', error);
    addServerLog('error', `Erro na escuta do Firestore: ${error.message || error}`);
  });
}

// REST Endpoints
app.get('/api/get-active-state', (req, res) => {
  res.json({
    accessToken: serverState.accessToken,
    userEmail: serverState.userEmail,
    settings: serverState.settings,
    activePayload: serverState.activePayload,
    activeResponse: serverState.activeResponse,
    logs: serverState.logs,
    receiverStatus: serverState.receiverStatus || 'Aguardando payload'
  });
});

app.get('/api/receiver-status', (req, res) => {
  res.json({
    status: serverState.receiverStatus || 'Aguardando payload',
    lastPayload: serverState.activePayload,
    lastResponse: serverState.activeResponse,
    logs: serverState.logs
  });
});

app.post('/api/sync-active-state', (req, res) => {
  const { accessToken, userEmail, settings, logs, activePayload, activeResponse, receiverStatus } = req.body;
  if (accessToken !== undefined) serverState.accessToken = accessToken;
  if (userEmail !== undefined) serverState.userEmail = userEmail;
  if (settings !== undefined) serverState.settings = { ...serverState.settings, ...settings };
  if (logs !== undefined) serverState.logs = logs;
  if (activePayload !== undefined) serverState.activePayload = activePayload;
  if (activeResponse !== undefined) serverState.activeResponse = activeResponse;
  if (receiverStatus !== undefined) serverState.receiverStatus = receiverStatus;
  
  saveSession();
  res.json({ status: 'ok' });
});

// Endpoint to clear communication logs of the Portal BOSS interface
app.post('/api/clear-receiver-logs', (req, res) => {
  serverState.logs = [];
  addServerLog('info', 'Receptor iniciado.');
  addServerLog('info', 'Aguardando payload.');
  saveSession();
  res.json({ status: 'ok', logs: serverState.logs });
});

// Endpoint to clear receiver visual states
app.post('/api/clear-receiver-state', (req, res) => {
  serverState.activePayload = null;
  serverState.activeResponse = null;
  serverState.receiverStatus = 'Aguardando payload';
  saveSession();
  res.json({ status: 'ok' });
});

// Real endpoint POST /api/create-folder
app.post('/api/create-folder', async (req, res) => {
  addServerLog('info', 'Endpoint acionado.');
  addServerLog('info', 'Header recebido.');
  serverState.receiverStatus = 'Processando';
  saveSession();

  // Validate API Key from header
  const authKey = req.headers['x-boss-google-drive-integration-key'] || req.headers['X-BOSS-Google-Drive-Integration-Key'];
  const configuredKey = serverState.settings.bossDriveIntegrationKey || 'boss_drive_live_giffoni_key_default';

  if (!authKey) {
    addServerLog('error', 'API Key de integração ausente.');
    serverState.receiverStatus = 'Erro de comunicação';
    const errorResponse = {
      googleDriveStatus: 'failed',
      googleDriveClientFolderStatus: 'falha',
      googleDriveClientFolderLogFalha: 'API Key de integração ausente.'
    };
    serverState.activeResponse = errorResponse;
    saveSession();
    return res.status(401).json(errorResponse);
  }

  if (authKey !== configuredKey) {
    addServerLog('error', 'API Key de integração inválida.');
    serverState.receiverStatus = 'Erro de comunicação';
    const errorResponse = {
      googleDriveStatus: 'failed',
      googleDriveClientFolderStatus: 'falha',
      googleDriveClientFolderLogFalha: 'API Key de integração inválida.'
    };
    serverState.activeResponse = errorResponse;
    saveSession();
    return res.status(403).json(errorResponse);
  }

  addServerLog('success', 'API Key validada.');
  addServerLog('success', 'API Key recebida e validada.');
  
  const { clientType, portalClientId, caseId, clientFolderName, originBlock, originField } = req.body;
  addServerLog('info', 'Payload recebido.');

  // Format failure output helper
  const sendFailure = (message: string) => {
    addServerLog('error', message);
    serverState.receiverStatus = 'Erro de comunicação';
    const errorResponse = {
      portalClientId: portalClientId || '',
      caseId: caseId || '',
      clientType: clientType || 'PF',
      googleDriveClientFolderName: clientFolderName || '',
      googleDriveClientFolderId: '',
      googleDriveClientFolderUrl: '',
      googleDriveCreatedAt: new Date().toISOString(),
      googleDriveStatus: 'failed' as const,
      googleDriveClientFolderStatus: 'falha' as const,
      googleDriveClientFolderLogFalha: message,
      recebidoEm: new Date().toISOString(),
      googleDriveClientFolderResultLog: `Falha na operação: ${message}`
    };
    serverState.activeResponse = errorResponse;
    saveSession();
    return res.status(200).json(errorResponse); // Compatible response according to specs
  };

  // Validations:
  if (!clientType || (clientType !== 'PF' && clientType !== 'PJ')) {
    return sendFailure('Tipo de cliente ausente ou inválido.');
  }

  if (!portalClientId) {
    return sendFailure('portalClientId ausente.');
  }

  if (!caseId) {
    return sendFailure('caseId é obrigatório.');
  }

  if (!clientFolderName || !clientFolderName.trim()) {
    return sendFailure('Nome da pasta não recebido.');
  }

  addServerLog('info', 'Tipo de cliente identificado.');
  addServerLog('info', 'Nome recebido.');

  // Active token verification
  const token = serverState.accessToken;
  if (!token) {
    return sendFailure('Verifique se o Google Drive está conectado corretamente.');
  }

  // Active Destination Folder verification
  const destFolderId = serverState.settings.googleDriveDestinationFolderId;
  if (!destFolderId) {
    return sendFailure('Pasta de destino do Google Drive não está configurada.');
  }

  // Set received payload in State
  const activePayloadObj = {
    sourceBuild: 'Portal BOSS Clientes',
    clientType,
    portalClientId,
    caseId,
    clientFolderName,
    originBlock: originBlock || (clientType === 'PF' ? 'pfDadosPessoais' : 'pjDadosEmpresa'),
    originField: originField || (clientType === 'PF' ? 'nomeCompleto' : 'nomeFantasia'),
    recebidoEm: new Date().toISOString()
  };
  serverState.activePayload = activePayloadObj;
  serverState.receiverStatus = 'Processando';
  saveSession();

  try {
    const isDestValid = await verifyFolderByIdOnDrive(token, destFolderId);
    if (!isDestValid) {
      return sendFailure('Pasta de destino do Google Drive não existe ou foi excluída.');
    }
    
    addServerLog('success', 'Pasta destino localizada.');
    addServerLog('info', 'Regra anti-duplicidade executada.');

    // Check anti-duplicity on google drive
    const searchResult = await checkFolderExistsOnDrive(token, clientFolderName, destFolderId);
    
    let folderId = '';
    let webViewLink = '';
    let operation: 'created' | 'linked' = 'created';

    if (searchResult.exists && searchResult.id) {
      folderId = searchResult.id;
      webViewLink = searchResult.webViewLink || `https://drive.google.com/drive/folders/${searchResult.id}`;
      operation = 'linked';
    } else {
      const createResult = await createFolderOnDrive(token, clientFolderName, destFolderId);
      folderId = createResult.id;
      webViewLink = createResult.webViewLink;
      operation = 'created';
    }

    addServerLog('success', 'Pasta criada/localizada.');

    const responsePayload = {
      portalClientId,
      caseId,
      clientType,
      googleDriveClientFolderName: clientFolderName,
      googleDriveClientFolderId: folderId,
      googleDriveClientFolderUrl: webViewLink,
      googleDriveCreatedAt: new Date().toISOString(),
      googleDriveStatus: 'success' as const,
      googleDriveClientFolderStatus: 'criada' as const,
      googleDriveOperation: operation,
      recebidoEm: new Date().toISOString(),
      googleDriveClientFolderResultLog: operation === 'created' 
        ? 'Ação de criação concluída com êxito' 
        : 'Ação de localização de pasta concluída com êxito'
    };

    serverState.activeResponse = responsePayload;
    serverState.receiverStatus = 'Retorno enviado';
    saveSession();
    addServerLog('success', 'Retorno enviado ao Portal BOSS.');

    return res.status(200).json(responsePayload);

  } catch (err: any) {
    console.error('Failed to process /api/create-folder:', err);
    return sendFailure(`Falha ao operar criação de pasta no Google Drive: ${err.message || err}`);
  }
});

// Setup dev server or static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start listening to the Firestore queue automatically
    setupFirestoreQueue();
  });
}

startServer();
