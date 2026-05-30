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

