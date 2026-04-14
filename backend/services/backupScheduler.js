import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { performBackup } from "../controllers/adminBackupController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsDir = path.resolve(__dirname, "../storage/backups");
const schedulesFilePath = path.resolve(backupsDir, "backup-schedules.json");

const tasks = new Map();

const defaultScheduleValues = {
  enabled: true,
  cronExpression: "0 3 * * *",
  scope: "full",
  schema: "public",
  table: null,
  mode: "schema-and-data",
  uploadToCloudinary: false,
  timezone: "America/Mexico_City",
  lastRunAt: null,
  lastRunStatus: null,
  lastRunMessage: null,
  lastRunLogFilename: null,
  createdAt: null,
  updatedAt: null,
};

const ensureBackupsDir = async () => {
  await fs.mkdir(backupsDir, { recursive: true });
};

const buildScheduleId = () =>
  `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeSchedule = (schedule = {}) => {
  const now = new Date().toISOString();

  return {
    ...defaultScheduleValues,
    ...schedule,
    id: schedule.id || buildScheduleId(),
    enabled:
      typeof schedule.enabled === "boolean"
        ? schedule.enabled
        : defaultScheduleValues.enabled,
    scope: schedule.scope || "full",
    schema: schedule.schema || "public",
    table: schedule.scope === "table" ? schedule.table || null : null,
    mode: schedule.mode || "schema-and-data",
    uploadToCloudinary: Boolean(schedule.uploadToCloudinary),
    timezone: schedule.timezone || "America/Mexico_City",
    createdAt: schedule.createdAt || now,
    updatedAt: now,
  };
};

const validateSchedule = (schedule) => {
  if (!["full", "table"].includes(schedule.scope)) {
    const error = new Error("El scope debe ser 'full' o 'table'.");
    error.statusCode = 400;
    throw error;
  }

  if (!["data-only", "schema-and-data"].includes(schedule.mode)) {
    const error = new Error(
      "El modo debe ser 'data-only' o 'schema-and-data'.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!cron.validate(schedule.cronExpression)) {
    const error = new Error("La expresión cron no es válida.");
    error.statusCode = 400;
    throw error;
  }

  if (schedule.scope === "table" && !schedule.table) {
    const error = new Error(
      "Cuando el scope es 'table', debes indicar una tabla.",
    );
    error.statusCode = 400;
    throw error;
  }
};

const readSchedulesFile = async () => {
  await ensureBackupsDir();

  try {
    const raw = await fs.readFile(schedulesFilePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSchedule(item));
  } catch {
    return [];
  }
};

const writeSchedulesFile = async (schedules) => {
  await ensureBackupsDir();
  await fs.writeFile(
    schedulesFilePath,
    JSON.stringify(schedules, null, 2),
    "utf8",
  );
};

const stopTask = (scheduleId) => {
  const existingTask = tasks.get(scheduleId);

  if (existingTask) {
    existingTask.stop();
    existingTask.destroy();
    tasks.delete(scheduleId);
  }
};

const getScheduleLabel = (schedule) => {
  if (schedule.scope === "table" && schedule.schema && schedule.table) {
    return `${schedule.schema}.${schedule.table}`;
  }

  return "Base completa";
};

const executeScheduledBackup = async (scheduleId) => {
  const schedules = await readSchedulesFile();
  const index = schedules.findIndex((item) => item.id === scheduleId);

  if (index === -1) {
    throw new Error("La programación ya no existe.");
  }

  const schedule = schedules[index];

  if (!schedule.enabled) {
    return schedule;
  }

  try {
    const backup = await performBackup({
      scope: schedule.scope,
      schema: schedule.schema,
      table: schedule.table,
      mode: schedule.mode,
      uploadToCloudinary: schedule.uploadToCloudinary,
      origin: "scheduled",
      schedule: {
        id: schedule.id,
        label: getScheduleLabel(schedule),
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
      },
    });

    schedules[index] = {
      ...schedule,
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "success",
      lastRunMessage: backup.executionLog?.filename
        ? `Backup generado: ${backup.filename}. Log: ${backup.executionLog.filename}`
        : `Backup generado: ${backup.filename}`,
      lastRunLogFilename: backup.executionLog?.filename || null,
      updatedAt: new Date().toISOString(),
    };

    await writeSchedulesFile(schedules);

    console.log(
      `✅ Backup programado ejecutado [${schedule.id}]: ${backup.filename}`,
    );

    return schedules[index];
  } catch (error) {
    schedules[index] = {
      ...schedule,
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "error",
      lastRunMessage: error?.executionLog?.filename
        ? `${error?.message || "Error al ejecutar backup programado"}. Log: ${error.executionLog.filename}`
        : error?.message || "Error al ejecutar backup programado",
      lastRunLogFilename: error?.executionLog?.filename || null,
      updatedAt: new Date().toISOString(),
    };

    await writeSchedulesFile(schedules);

    console.error(
      `❌ Error en backup programado [${schedule.id}]:`,
      error?.message || error,
    );

    return schedules[index];
  }
};

const startTask = (schedule) => {
  stopTask(schedule.id);

  if (!schedule.enabled) return;

  if (!cron.validate(schedule.cronExpression)) {
    throw new Error(
      `La expresión cron no es válida para la programación ${schedule.id}.`,
    );
  }

  const task = cron.schedule(
    schedule.cronExpression,
    async () => {
      await executeScheduledBackup(schedule.id);
    },
    {
      timezone: schedule.timezone || "America/Mexico_City",
    },
  );

  tasks.set(schedule.id, task);
};

const restartAllTasks = async () => {
  for (const [id, task] of tasks.entries()) {
    task.stop();
    task.destroy();
    tasks.delete(id);
  }

  const schedules = await readSchedulesFile();

  for (const schedule of schedules) {
    if (schedule.enabled) {
      startTask(schedule);
    }
  }
};

export const initializeBackupScheduler = async () => {
  await restartAllTasks();
  console.log("✅ Scheduler de backups inicializado");
};

export const listBackupSchedules = async () => {
  return await readSchedulesFile();
};

export const createBackupSchedule = async (payload = {}) => {
  const schedules = await readSchedulesFile();
  const next = normalizeSchedule(payload);

  validateSchedule(next);

  schedules.push(next);
  await writeSchedulesFile(schedules);
  startTask(next);

  return next;
};

export const updateBackupScheduleById = async (scheduleId, payload = {}) => {
  const schedules = await readSchedulesFile();
  const index = schedules.findIndex((item) => item.id === scheduleId);

  if (index === -1) {
    const error = new Error("La programación no existe.");
    error.statusCode = 404;
    throw error;
  }

  const next = normalizeSchedule({
    ...schedules[index],
    ...payload,
    id: schedules[index].id,
    createdAt: schedules[index].createdAt,
  });

  validateSchedule(next);

  schedules[index] = next;
  await writeSchedulesFile(schedules);
  startTask(next);

  return next;
};

export const deleteBackupScheduleById = async (scheduleId) => {
  const schedules = await readSchedulesFile();
  const index = schedules.findIndex((item) => item.id === scheduleId);

  if (index === -1) {
    const error = new Error("La programación no existe.");
    error.statusCode = 404;
    throw error;
  }

  const removed = schedules[index];
  const next = schedules.filter((item) => item.id !== scheduleId);

  await writeSchedulesFile(next);
  stopTask(scheduleId);

  return removed;
};

export const runBackupScheduleNowById = async (scheduleId) => {
  return await executeScheduledBackup(scheduleId);
};
