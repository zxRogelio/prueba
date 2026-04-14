import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsDir = path.resolve(__dirname, "../storage/backups");
const backupLogsDir = path.join(backupsDir, "logs");
const BACKUP_LOG_EXTENSION = ".log";

const pad = (value) => String(value).padStart(2, "0");

const sanitizeLine = (value, fallback = "N/D") => {
  const normalized = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();

  return normalized || fallback;
};

const formatLogStamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
};

const formatDuration = (durationMs = 0) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0ms";
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
};

const formatSizeKB = (sizeBytes = 0) => {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 KB";
  }

  return `${Number(sizeBytes / 1024).toFixed(2)} KB`;
};

const formatDestinationDir = () => "/backups";

const formatOriginLabel = (origin) =>
  origin === "scheduled" ? "programado" : "manual";

const formatScopeLabel = (scope) =>
  scope === "table" ? "Respaldo por tabla" : "Respaldo completo";

const formatModeLabel = (mode) =>
  mode === "data-only" ? "Solo datos" : "Estructura + datos";

const getTaskLabel = ({ scope, schema, table }) => {
  if (scope === "table" && schema && table) {
    return `Backup de tabla ${schema}.${table}`;
  }

  return "Backup completo";
};

export const ensureBackupLogsDir = async () => {
  await fs.mkdir(backupLogsDir, { recursive: true });
};

export const buildExecutionLogFilename = (startedAt = new Date()) =>
  `log-backup-${formatLogStamp(startedAt)}${BACKUP_LOG_EXTENSION}`;

export const createExecutionLogContext = ({
  scope,
  schema,
  table,
  mode,
  origin,
  uploadToCloudinary,
  dbConfig,
  schedule = null,
  startedAt = new Date(),
}) => {
  const filename = buildExecutionLogFilename(startedAt);

  return {
    filename,
    filePath: path.join(backupLogsDir, filename),
    startedAt: new Date(startedAt).toISOString(),
    scope,
    schema: scope === "table" ? schema || null : null,
    table: scope === "table" ? table || null : null,
    mode,
    origin,
    uploadToCloudinary: Boolean(uploadToCloudinary),
    targetDatabase: dbConfig?.dbName || null,
    targetHost: dbConfig?.dbHost || null,
    targetPort: dbConfig?.dbPort || null,
    taskLabel: getTaskLabel({ scope, schema, table }),
    schedule: schedule
      ? {
          id: schedule.id || null,
          label: schedule.label || schedule.name || schedule.id || null,
          cronExpression: schedule.cronExpression || null,
          timezone: schedule.timezone || null,
        }
      : null,
  };
};

export const writeExecutionLog = async ({
  execution,
  finishedAt = new Date(),
  status = "SUCCESS",
  backupFilename = null,
  sizeBytes = 0,
  destinationDir = backupsDir,
  cloudinaryStatus = "omitida",
  errorMessage = null,
  errorDetail = null,
}) => {
  await ensureBackupLogsDir();

  const startedAt = new Date(execution.startedAt);
  const endedAt = finishedAt instanceof Date ? finishedAt : new Date(finishedAt);
  const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const upperStatus = sanitizeLine(status, "SUCCESS").toUpperCase();
  const targetDatabase = execution.targetDatabase
    ? `${execution.targetDatabase} @ ${sanitizeLine(execution.targetHost, "N/D")}:${sanitizeLine(execution.targetPort, "5432")}`
    : "N/D";
  const scheduleLine =
    execution.origin === "scheduled"
      ? sanitizeLine(
          execution.schedule?.label || execution.schedule?.id,
          "Programacion automatica",
        )
      : "Ejecucion manual";
  const targetObject =
    execution.scope === "table" && execution.schema && execution.table
      ? `${execution.schema}.${execution.table}`
      : "Base completa";

  const lines = [
    `Log de ${path.basename(execution.filename, BACKUP_LOG_EXTENSION)}`,
    "",
    `Tarea: ${sanitizeLine(execution.taskLabel)}`,
    `Origen: ${formatOriginLabel(execution.origin)}`,
    `Programacion: ${scheduleLine}`,
    `Base objetivo: ${targetDatabase}`,
    `Inicio: ${execution.startedAt}`,
    `Fin: ${endedAt.toISOString()}`,
    `Estado: ${upperStatus}`,
    "",
    "Resumen:",
    `- Tipo de backup: ${formatScopeLabel(execution.scope)}`,
    `- Modo: ${formatModeLabel(execution.mode)}`,
    `- Objeto respaldado: ${targetObject}`,
    `- Archivo generado: ${sanitizeLine(backupFilename, upperStatus === "SUCCESS" ? "N/D" : "No generado")}`,
    `- Tamano del dump: ${formatSizeKB(sizeBytes)}`,
    `- Carpeta destino: ${formatDestinationDir(destinationDir)}`,
    `- Duracion total: ${formatDuration(durationMs)}`,
    `- Subida a Cloudinary: ${sanitizeLine(cloudinaryStatus, "omitida")}`,
    `- Log generado: ${sanitizeLine(execution.filename)}`,
  ];

  if (execution.origin === "scheduled") {
    if (execution.schedule?.id) {
      lines.push(`- Programacion ID: ${sanitizeLine(execution.schedule.id)}`);
    }

    if (execution.schedule?.cronExpression) {
      lines.push(
        `- Frecuencia cron: ${sanitizeLine(execution.schedule.cronExpression)}`,
      );
    }

    if (execution.schedule?.timezone) {
      lines.push(
        `- Zona horaria: ${sanitizeLine(execution.schedule.timezone)}`,
      );
    }
  }

  if (errorMessage || errorDetail) {
    lines.push("", "Detalle:");
    lines.push(`- Mensaje: ${sanitizeLine(errorMessage)}`);

    if (errorDetail && errorDetail !== errorMessage) {
      lines.push(`- Info adicional: ${sanitizeLine(errorDetail)}`);
    }
  }

  await fs.writeFile(execution.filePath, `${lines.join("\n")}\n`, "utf8");

  return {
    filename: execution.filename,
    filePath: execution.filePath,
    startedAt: execution.startedAt,
    finishedAt: endedAt.toISOString(),
    durationMs,
    status: upperStatus,
    taskLabel: execution.taskLabel,
    origin: execution.origin,
    targetDatabase: execution.targetDatabase,
    targetHost: execution.targetHost,
    targetPort: execution.targetPort,
    backupFilename: backupFilename || null,
    sizeBytes,
    cloudinaryStatus,
    schedule: execution.schedule,
  };
};

export const readExecutionLogContent = async (filename) => {
  const safeName = path.basename(filename || "");

  if (!safeName.endsWith(BACKUP_LOG_EXTENSION)) {
    const error = new Error("El log solicitado no es valido.");
    error.statusCode = 400;
    throw error;
  }

  await ensureBackupLogsDir();

  const filePath = path.join(backupLogsDir, safeName);
  const content = await fs.readFile(filePath, "utf8");

  return {
    filename: safeName,
    filePath,
    content,
  };
};
