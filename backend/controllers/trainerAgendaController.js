import { TrainerAgendaItem } from "../models/index.js";

const allowedModes = ["presencial", "online", "seguimiento", "evaluacion"];
const allowedStatuses = ["scheduled", "completed", "cancelled"];

const ensureTrainer = (req, res) => {
  if (!req.user || req.user.role !== "entrenador") {
    res.status(403).json({ error: "Acceso solo para entrenadores" });
    return false;
  }

  return true;
};

const cleanText = (value) => {
  const clean = String(value ?? "").trim();
  return clean.length ? clean : null;
};

export const listTrainerAgenda = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const items = await TrainerAgendaItem.findAll({
      where: {
        trainerId: req.user.id,
      },
      order: [["startAt", "ASC"]],
    });

    return res.json({ items });
  } catch (error) {
    console.error("listTrainerAgenda error:", error);
    return res.status(500).json({ error: "No se pudo cargar la agenda" });
  }
};

export const createTrainerAgendaItem = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const title = cleanText(req.body.title);

    if (!title) {
      return res.status(400).json({ error: "El título es obligatorio" });
    }

    if (!req.body.startAt) {
      return res.status(400).json({ error: "La fecha de inicio es obligatoria" });
    }

    const item = await TrainerAgendaItem.create({
      trainerId: req.user.id,
      title,
      description: cleanText(req.body.description),
      startAt: new Date(req.body.startAt),
      endAt: req.body.endAt ? new Date(req.body.endAt) : null,
      mode: allowedModes.includes(req.body.mode) ? req.body.mode : "presencial",
      location: cleanText(req.body.location),
      status: allowedStatuses.includes(req.body.status)
        ? req.body.status
        : "scheduled",
    });

    return res.status(201).json({
      message: "Actividad creada correctamente",
      item,
    });
  } catch (error) {
    console.error("createTrainerAgendaItem error:", error);
    return res.status(500).json({ error: "No se pudo crear la actividad" });
  }
};

export const updateTrainerAgendaItem = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const item = await TrainerAgendaItem.findOne({
      where: {
        id: req.params.id,
        trainerId: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    const title = cleanText(req.body.title);

    if (!title) {
      return res.status(400).json({ error: "El título es obligatorio" });
    }

    await item.update({
      title,
      description: cleanText(req.body.description),
      startAt: req.body.startAt ? new Date(req.body.startAt) : item.startAt,
      endAt: req.body.endAt ? new Date(req.body.endAt) : null,
      mode: allowedModes.includes(req.body.mode) ? req.body.mode : item.mode,
      location: cleanText(req.body.location),
      status: allowedStatuses.includes(req.body.status)
        ? req.body.status
        : item.status,
    });

    return res.json({
      message: "Actividad actualizada correctamente",
      item,
    });
  } catch (error) {
    console.error("updateTrainerAgendaItem error:", error);
    return res.status(500).json({ error: "No se pudo actualizar la actividad" });
  }
};

export const deleteTrainerAgendaItem = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const item = await TrainerAgendaItem.findOne({
      where: {
        id: req.params.id,
        trainerId: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    await item.destroy();

    return res.json({ message: "Actividad eliminada correctamente" });
  } catch (error) {
    console.error("deleteTrainerAgendaItem error:", error);
    return res.status(500).json({ error: "No se pudo eliminar la actividad" });
  }
};