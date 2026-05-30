export interface Client {
  id: string;
  type: 'PF' | 'PJ';
  nomeCompleto: string; // for PF
  razaoSocial?: string; // for PJ
  nomeFantasia?: string; // for PJ
  documento: string; // CPF or CNPJ
  
  // Client Folder fields to persist & return to Portal BOSS
  googleDriveClientFolderName?: string;
  googleDriveClientFolderId?: string;
  googleDriveClientFolderUrl?: string;
  googleDriveCreatedAt?: string;
  googleDriveStatus?: 'created' | 'linked' | 'pending' | 'error';
}

export interface BossPayload {
  sourceBuild: string; // "Portal BOSS Clientes"
  clientType: 'PF' | 'PJ';
  portalClientId: string;
  caseId?: string;
  clientFolderName: string;
  originBlock: string; // "pfDadosPessoais" | "pjDadosEmpresa"
  originField: string; // "nomeCompleto" | "nomeFantasia"
  razaoSocial?: string; // fallback
  documento?: string; // fallback
  recebidoEm?: string; // timestamp when payload arrived at receiver
}

export interface BossResponse {
  portalClientId: string;
  caseId?: string;
  clientType: 'PF' | 'PJ';
  googleDriveClientFolderName: string;
  googleDriveClientFolderId: string;
  googleDriveClientFolderUrl: string;
  googleDriveCreatedAt: string;
  googleDriveStatus: 'success' | 'failed';
  googleDriveClientFolderStatus: 'criada' | 'falha';
  googleDriveOperation?: 'created' | 'linked';
  googleDriveClientFolderLogFalha?: string;
}


export interface IntegrationSettings {
  // Authentication states
  googleDriveConnectedEmail: string;
  googleDriveConnectionStatus: 'connected' | 'disconnected' | 'error';
  googleDriveApiKey: string;
  googleDriveClientId: string;
  googleDriveClientSecret: string;
  googleDriveRedirectUri: string;
  googleDriveScopes: string;

  // Target Destination Folder "clientes office"
  googleDriveDestinationFolderName: string;
  googleDriveDestinationFolderId: string;
  googleDriveDestinationFolderUrl: string;
  googleDriveAccessToken?: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
  category?: 'connection' | 'localizer';
}

