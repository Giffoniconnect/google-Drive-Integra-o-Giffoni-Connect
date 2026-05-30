export interface DriveFolderResult {
  exists: boolean;
  id?: string;
  webViewLink?: string;
}

export async function checkFolderExists(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFolderResult> {
  // Escape single quotes for Google Drive search query safety
  const safeName = folderName.replace(/'/g, "\\'");
  let query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  if (parentFolderId && parentFolderId.trim() !== '') {
    query += ` and '${parentFolderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Erro desconhecido ao obter pasta.' } }));
    throw new Error(err.error?.message || `Erro do Google Drive (${response.status})`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return {
      exists: true,
      id: data.files[0].id,
      webViewLink: data.files[0].webViewLink || `https://drive.google.com/drive/folders/${data.files[0].id}`,
    };
  }

  return { exists: false };
}

export async function createFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink: string }> {
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId && parentFolderId.trim() !== '') {
    body.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Erro desconhecido ao criar pasta.' } }));
    throw new Error(err.error?.message || `Erro do Google Drive (${response.status})`);
  }

  const data = await response.json();
  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
  };
}

// Simple test function to try and list files to confirm access token is valid
export async function testConnection(accessToken: string): Promise<boolean> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.ok;
}

export async function verifyFolderById(
  accessToken: string,
  folderId: string
): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return !!(data && data.mimeType === 'application/vnd.google-apps.folder' && !data.trashed);
}

