import { API } from "../../api/api";

export type BackupScope = "full" | "table";
export type BackupMode = "data-only" | "schema-and-data";
export type BackupSource = "local" | "cloudinary";

export type BackupTableOption = {
  schema: string;
  table: string;
};

export type BackupRecord = {
  id: string;
  filename: string;
  filePath: string | null;
  createdAt: string;
  scope: BackupScope | string;
  schema: string | null;
  table: string | null;
  mode?: BackupMode | "unknown" | string | null;
  source?: BackupSource | string | null;
  tablesIncluded: number | null;
  rowsIncluded: number | null;
  sizeBytes: number;
  sizeKB: string;
  format?: string;
  downloadUrl: string | null;
  engine?: string;
  backupProvider?: string;
  cloudinary: null | {
    assetId: string;
    publicId: string;
    url: string;
    bytes: number;
    format: string;
  };
};

export type BackupOptionsResponse = {
  tables: BackupTableOption[];
  cloudinaryEnabled: boolean;
  backupsPath: string;
  backupFormat: string;
  engine?: string;
  backupProvider?: string;
  supportedScopes?: Array<{ value: string; label: string }>;
  supportedModes?: Array<{ value: string; label: string }>;
};

export type BackupListResponse = {
  backups: BackupRecord[];
};

export async function getBackupOptions() {
  const { data } = await API.get<BackupOptionsResponse>(
    "/admin/backups/options",
  );
  return data;
}

export async function listBackups() {
  const { data } = await API.get<BackupListResponse>("/admin/backups");
  return data;
}

export async function createBackup(payload: {
  scope: BackupScope;
  mode?: BackupMode;
  schema?: string;
  table?: string;
  uploadToCloudinary?: boolean;
}) {
  const { data } = await API.post<{ message: string; backup: BackupRecord }>(
    "/admin/backups",
    payload,
  );
  return data;
}

const normalizeBackupDownloadPath = (downloadUrl: string | null | undefined) => {
  if (!downloadUrl) return null;

  const baseURL = String(API.defaults.baseURL || "").replace(/\/$/, "");

  if (/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl;
  }

  const normalizedDownloadUrl = downloadUrl.startsWith("/")
    ? downloadUrl
    : `/${downloadUrl}`;

  if (!baseURL) {
    return normalizedDownloadUrl;
  }

  const apiPrefixMatch = baseURL.match(/(\/api)\/?$/i);
  if (
    apiPrefixMatch &&
    normalizedDownloadUrl
      .toLowerCase()
      .startsWith(apiPrefixMatch[1].toLowerCase())
  ) {
    return normalizedDownloadUrl.slice(apiPrefixMatch[1].length) || "/";
  }

  return normalizedDownloadUrl;
};

export const getBackupDownloadUrl = (downloadUrl: string | null | undefined) => {
  const normalizedPath = normalizeBackupDownloadPath(downloadUrl);
  const baseURL = String(API.defaults.baseURL || "").replace(/\/$/, "");

  if (!normalizedPath) return null;

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `${baseURL}${normalizedPath}`;
};

export async function downloadBackupFile(
  downloadUrl: string | null | undefined,
  filename: string,
) {
  const normalizedPath = normalizeBackupDownloadPath(downloadUrl);

  if (!normalizedPath) {
    throw new Error("Este respaldo no tiene una ruta de descarga disponible.");
  }

  const response = await API.get(normalizedPath, {
    responseType: "blob",
  });

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}