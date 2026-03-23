import {
  listBackupSchedules,
  createBackupSchedule,
  updateBackupScheduleById,
  deleteBackupScheduleById,
  runBackupScheduleNowById,
} from "../services/backupScheduler.js";

export const getScheduleConfigs = async (_req, res) => {
  try {
    const schedules = await listBackupSchedules();
    return res.json({ schedules });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudieron cargar las programaciones.",
      detail: error.message,
    });
  }
};

export const createScheduleConfig = async (req, res) => {
  try {
    const schedule = await createBackupSchedule(req.body || {});
    return res.status(201).json({
      message: "Programación creada correctamente.",
      schedule,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo crear la programación.",
      detail: error.detail || undefined,
    });
  }
};

export const updateScheduleConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await updateBackupScheduleById(id, req.body || {});
    return res.json({
      message: "Programación actualizada correctamente.",
      schedule,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo actualizar la programación.",
      detail: error.detail || undefined,
    });
  }
};

export const deleteScheduleConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await deleteBackupScheduleById(id);

    return res.json({
      message: "Programación eliminada correctamente.",
      schedule: removed,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo eliminar la programación.",
      detail: error.detail || undefined,
    });
  }
};

export const runScheduledBackupNow = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await runBackupScheduleNowById(id);

    return res.json({
      message: "Programación ejecutada correctamente.",
      schedule,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "No se pudo ejecutar la programación.",
      detail: error.detail || undefined,
    });
  }
};