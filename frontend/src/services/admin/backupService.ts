import {API} from "../../api/api";

const triggerFileDownload = (payload: BlobPart, filename: string, type: string) => {
  const blob = payload instanceof Blob ? payload : new Blob([payload], { type });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const normalizeBackupDownloadUrl = (downloadUrl: string) => {
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;

  const baseURL = API.defaults.baseURL;
  if (!baseURL) return downloadUrl;

  try {
    const basePath = new URL(baseURL, window.location.origin).pathname.replace(/\/+$/, "");

    if (/\/api$/i.test(basePath) && downloadUrl.startsWith("/api/")) {
      return downloadUrl.replace(/^\/api/, "");
    }
  } catch {
    return downloadUrl;
  }

  return downloadUrl;
};

const downloadFromCloudinary = async (cloudinaryUrl: string) => {
  const response = await fetch(cloudinaryUrl);

  if (!response.ok) {
    throw new Error("No se pudo descargar el respaldo desde la nube.");
  }

  return response.blob();
};

export type BackupScope = "full" | "table";
export type BackupMode = "data-only" | "schema-and-data";

export type BackupExecutionLog = {
  filename: string;
  filePath: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: string;
  taskLabel: string;
  origin: "manual" | "scheduled" | string;
  targetDatabase: string | null;
  targetHost: string | null;
  targetPort: string | null;
  backupFilename: string | null;
  sizeBytes: number;
  cloudinaryStatus: string;
  schedule?: {
    id: string | null;
    label: string | null;
    cronExpression: string | null;
    timezone: string | null;
  } | null;
};

export type BackupRecord = {
  id: string;
  filename: string;
  filePath: string | null;
  createdAt: string;
  scope: BackupScope | string;
  schema: string | null;
  table: string | null;
  mode: BackupMode | string;
  source: "local" | "cloudinary" | string;
  origin?: "manual" | "scheduled" | string;
  tablesIncluded?: number | null;
  rowsIncluded?: number | null;
  sizeBytes?: number;
  sizeKB?: string;
  format?: string;
  engine?: string;
  downloadUrl?: string | null;
  executionLog?: BackupExecutionLog | null;
  cloudinary?: {
    assetId?: string;
    publicId?: string;
    url?: string;
    bytes?: number;
    format?: string;
  } | null;
};

export type BackupOptionsResponse = {
  tables: Array<{ schema: string; table: string }>;
  cloudinaryEnabled: boolean;
  backupsPath: string;
  backupFormat: string;
  engine: string;
  backupProvider: string;
  supportedScopes: Array<{ value: BackupScope; label: string }>;
  supportedModes: Array<{ value: BackupMode; label: string }>;
};

export type ListBackupsResponse = {
  backups: BackupRecord[];
};

export type CreateBackupPayload = {
  scope: BackupScope;
  schema?: string;
  table?: string;
  uploadToCloudinary?: boolean;
  mode?: BackupMode;
};

export type CreateBackupResponse = {
  message: string;
  backup: BackupRecord;
};

export type BackupSchedule = {
  id: string;
  enabled: boolean;
  cronExpression: string;
  scope: BackupScope;
  schema: string;
  table: string | null;
  mode: BackupMode;
  uploadToCloudinary: boolean;
  timezone: string;
  lastRunAt: string | null;
  lastRunStatus: "success" | "error" | null;
  lastRunMessage: string | null;
  lastRunLogFilename?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupSchedulesResponse = {
  schedules: BackupSchedule[];
};

export type BackupLogContentResponse = {
  filename: string;
  filePath: string;
  content: string;
};

export type SaveBackupSchedulePayload = {
  enabled: boolean;
  cronExpression: string;
  scope: BackupScope;
  schema: string;
  table: string | null;
  mode: BackupMode;
  uploadToCloudinary: boolean;
  timezone: string;
};

export const getBackupOptions = async (): Promise<BackupOptionsResponse> => {
  const { data } = await API.get("/admin/backups/options");
  return data;
};

export const listBackups = async (): Promise<ListBackupsResponse> => {
  const { data } = await API.get("/admin/backups");
  return data;
};

export const createBackup = async (
  payload: CreateBackupPayload,
): Promise<CreateBackupResponse> => {
  const { data } = await API.post("/admin/backups", payload);
  return data;
};

export const getBackupLogContent = async (
  filename: string,
): Promise<BackupLogContentResponse> => {
  const { data } = await API.get(
    `/admin/backups/logs/${encodeURIComponent(filename)}`,
  );
  return data;
};

export const downloadBackupFile = async (
  downloadUrl: string | null | undefined,
  filename: string,
  cloudinaryUrl?: string | null,
): Promise<void> => {
  try {
    if (downloadUrl) {
      const response = await API.get(normalizeBackupDownloadUrl(downloadUrl), {
        responseType: "blob",
      });

      triggerFileDownload(response.data, filename, "application/sql");
      return;
    }
  } catch (error) {
    if (!cloudinaryUrl) {
      throw error;
    }
  }

  if (!cloudinaryUrl) {
    throw new Error("No hay una ruta disponible para descargar este respaldo.");
  }

  const blob = await downloadFromCloudinary(cloudinaryUrl);
  triggerFileDownload(blob, filename, blob.type || "application/sql");
};

export const listBackupSchedules = async (): Promise<BackupSchedulesResponse> => {
  const { data } = await API.get("/admin/backup-schedule");
  return data;
};

export const createBackupSchedule = async (
  payload: SaveBackupSchedulePayload,
): Promise<{ message: string; schedule: BackupSchedule }> => {
  const { data } = await API.post("/admin/backup-schedule", payload);
  return data;
};

export const updateBackupSchedule = async (
  id: string,
  payload: SaveBackupSchedulePayload,
): Promise<{ message: string; schedule: BackupSchedule }> => {
  const { data } = await API.put(`/admin/backup-schedule/${id}`, payload);
  return data;
};

export const deleteBackupSchedule = async (
  id: string,
): Promise<{ message: string; schedule: BackupSchedule }> => {
  const { data } = await API.delete(`/admin/backup-schedule/${id}`);
  return data;
};

export const runBackupScheduleNow = async (
  id: string,
): Promise<{ message: string; schedule: BackupSchedule }> => {
  const { data } = await API.post(`/admin/backup-schedule/${id}/run-now`);
  return data;
};
