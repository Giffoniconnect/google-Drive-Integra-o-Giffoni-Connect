export interface Client {
  id: string;
  type: 'PF' | 'PJ';
  nomeCompleto: string; // for PF
  razaoSocial?: string; // for PJ
  nomeFantasia?: string; // for PJ
  documento: string; // CPF or CNPJ
  googleDriveClientFolderUrl?: string;
  googleDriveClientFolderId?: string;
  googleDriveCreatedAt?: string;
  googleDriveStatus?: 'created' | 'linked' | 'pending' | 'error';
}

export interface IntegrationSettings {
  rootFolderId: string;
  rootFolderName: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}
