import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Routine, RoutineExercise, User } from "../models/index.js";
import {
  uploadMediaBufferToCloudinary,
  destroyCloudinaryImage,
  destroyCloudinaryVideo,
} from "../utils/cloudinaryUpload.js";

const allowedStatuses = ["draft", "published", "archived"];
const allowedLevels = ["principiante", "intermedio", "avanzado"];
const allowedCategories = [
  "fuerza",
  "hipertrofia",
  "perdida_peso",
  "resistencia",
  "movilidad",
  "general",
];

const routineInclude = [
  {
    model: RoutineExercise,
    as: "exercises",
    required: false,
    order: [["dayNumber", "ASC"], ["order", "ASC"]],
  },
  {
    model: User,
    as: "trainer",
    attributes: ["id", "email", "role"],
  },
];

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const clean = String(value).trim();
  return clean.length ? clean : null;
};

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
};

const detectVideoType = (url) => {
  if (!url) return "none";

  const value = String(url).toLowerCase();

  if (value.includes("youtube.com") || value.includes("youtu.be")) {
    return "youtube";
  }

  if (value.includes("drive.google.com")) {
    return "drive";
  }

  return "external";
};

const parseExercises = (raw) => {
  if (!raw) return [];

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((exercise, index) => ({
        name: normalizeText(exercise.name),
        description: normalizeText(exercise.description),
        dayNumber: toPositiveInteger(exercise.dayNumber, 1),
        sets:
          exercise.sets === "" || exercise.sets === null || exercise.sets === undefined
            ? null
            : toPositiveInteger(exercise.sets, 0),
        reps: normalizeText(exercise.reps),
        restSeconds:
          exercise.restSeconds === "" ||
          exercise.restSeconds === null ||
          exercise.restSeconds === undefined
            ? null
            : toPositiveInteger(exercise.restSeconds, 0),
        notes: normalizeText(exercise.notes),
        order: toPositiveInteger(exercise.order, index),
      }))
      .filter((exercise) => exercise.name);
  } catch {
    return [];
  }
};

const serializeRoutine = (routine) => {
  const json = routine?.toJSON ? routine.toJSON() : routine;

  const exercises = Array.isArray(json.exercises)
    ? [...json.exercises].sort((a, b) => {
        const dayDiff = Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0);
        if (dayDiff !== 0) return dayDiff;
        return Number(a.order ?? 0) - Number(b.order ?? 0);
      })
    : [];

  return {
    ...json,
    exercises,
    trainerEmail: json.trainer?.email ?? null,
  };
};

const getTrainerId = (req) => {
  return req.user?.id;
};

const ensureTrainer = (req, res) => {
  if (!req.user || req.user.role !== "entrenador") {
    res.status(403).json({ error: "Acceso solo para entrenadores" });
    return false;
  }

  return true;
};

const findTrainerRoutine = async (req) => {
  return Routine.findOne({
    where: {
      id: req.params.id,
      trainerId: getTrainerId(req),
    },
    include: routineInclude,
  });
};

const handleRoutineMedia = async (req, currentRoutine = null) => {
  const files = req.files || {};
  const imageFile = Array.isArray(files.image) ? files.image[0] : null;
  const videoFile = Array.isArray(files.video) ? files.video[0] : null;

  const output = {};

  if (imageFile?.buffer) {
    const uploadedImage = await uploadMediaBufferToCloudinary(imageFile.buffer, {
      folder: "titanium/routines/images",
      resourceType: "image",
    });

    output.imageUrl = uploadedImage.secure_url;
    output.imagePublicId = uploadedImage.public_id;

    if (currentRoutine?.imagePublicId) {
      await destroyCloudinaryImage(currentRoutine.imagePublicId);
    }
  }

  if (videoFile?.buffer) {
    const uploadedVideo = await uploadMediaBufferToCloudinary(videoFile.buffer, {
      folder: "titanium/routines/videos",
      resourceType: "video",
    });

    output.videoUrl = uploadedVideo.secure_url;
    output.videoPublicId = uploadedVideo.public_id;
    output.videoType = "upload";

    if (currentRoutine?.videoPublicId) {
      await destroyCloudinaryVideo(currentRoutine.videoPublicId);
    }
  }

  return output;
};

export const listTrainerRoutines = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const trainerId = getTrainerId(req);
    const search = normalizeText(req.query.search);
    const status = normalizeText(req.query.status);
    const category = normalizeText(req.query.category);
    const level = normalizeText(req.query.level);

    const where = {
      trainerId,
    };

    if (status && allowedStatuses.includes(status)) {
      where.status = status;
    }

    if (category && allowedCategories.includes(category)) {
      where.category = category;
    }

    if (level && allowedLevels.includes(level)) {
      where.level = level;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { objective: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const routines = await Routine.findAll({
      where,
      include: routineInclude,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      routines: routines.map(serializeRoutine),
    });
  } catch (error) {
    console.error("listTrainerRoutines error:", error);
    return res.status(500).json({ error: "No se pudieron cargar las rutinas" });
  }
};

export const getTrainerRoutineById = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const routine = await findTrainerRoutine(req);

    if (!routine) {
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    return res.json({
      routine: serializeRoutine(routine),
    });
  } catch (error) {
    console.error("getTrainerRoutineById error:", error);
    return res.status(500).json({ error: "No se pudo cargar la rutina" });
  }
};

export const createTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();

  try {
    const title = normalizeText(req.body.title);

    if (!title) {
      await transaction.rollback();
      return res.status(400).json({ error: "El nombre de la rutina es obligatorio" });
    }

    const level = allowedLevels.includes(req.body.level)
      ? req.body.level
      : "principiante";

    const category = allowedCategories.includes(req.body.category)
      ? req.body.category
      : "general";

    const status = allowedStatuses.includes(req.body.status)
      ? req.body.status
      : "draft";

    const media = await handleRoutineMedia(req);

    const externalVideoUrl = normalizeText(req.body.videoUrl);

    const routine = await Routine.create(
      {
        trainerId: getTrainerId(req),
        title,
        objective: normalizeText(req.body.objective),
        description: normalizeText(req.body.description),
        level,
        category,
        durationWeeks: toPositiveInteger(req.body.durationWeeks, 4),
        daysPerWeek: toPositiveInteger(req.body.daysPerWeek, 3),
        estimatedMinutes: toPositiveInteger(req.body.estimatedMinutes, 45),

        imageUrl: media.imageUrl || null,
        imagePublicId: media.imagePublicId || null,

        videoUrl: media.videoUrl || externalVideoUrl || null,
        videoPublicId: media.videoPublicId || null,
        videoType: media.videoType || detectVideoType(externalVideoUrl),

        status,
      },
      { transaction }
    );

    const exercises = parseExercises(req.body.exercises);

    if (exercises.length) {
      await RoutineExercise.bulkCreate(
        exercises.map((exercise) => ({
          ...exercise,
          routineId: routine.id,
        })),
        { transaction }
      );
    }

    await transaction.commit();

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.status(201).json({
      message: "Rutina creada correctamente",
      routine: serializeRoutine(fullRoutine),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("createTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo crear la rutina" });
  }
};

export const updateTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();

  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        trainerId: getTrainerId(req),
      },
      transaction,
    });

    if (!routine) {
      await transaction.rollback();
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    const title = normalizeText(req.body.title);

    if (!title) {
      await transaction.rollback();
      return res.status(400).json({ error: "El nombre de la rutina es obligatorio" });
    }

    const media = await handleRoutineMedia(req, routine);

    const externalVideoUrl = normalizeText(req.body.videoUrl);

    let nextVideoUrl = routine.videoUrl;
    let nextVideoPublicId = routine.videoPublicId;
    let nextVideoType = routine.videoType;

    if (media.videoUrl) {
      nextVideoUrl = media.videoUrl;
      nextVideoPublicId = media.videoPublicId;
      nextVideoType = "upload";
    } else if (externalVideoUrl) {
      if (routine.videoPublicId) {
        await destroyCloudinaryVideo(routine.videoPublicId);
      }

      nextVideoUrl = externalVideoUrl;
      nextVideoPublicId = null;
      nextVideoType = detectVideoType(externalVideoUrl);
    } else if (req.body.removeVideo === "true") {
      if (routine.videoPublicId) {
        await destroyCloudinaryVideo(routine.videoPublicId);
      }

      nextVideoUrl = null;
      nextVideoPublicId = null;
      nextVideoType = "none";
    }

    await routine.update(
      {
        title,
        objective: normalizeText(req.body.objective),
        description: normalizeText(req.body.description),
        level: allowedLevels.includes(req.body.level)
          ? req.body.level
          : routine.level,
        category: allowedCategories.includes(req.body.category)
          ? req.body.category
          : routine.category,
        durationWeeks: toPositiveInteger(req.body.durationWeeks, routine.durationWeeks),
        daysPerWeek: toPositiveInteger(req.body.daysPerWeek, routine.daysPerWeek),
        estimatedMinutes: toPositiveInteger(
          req.body.estimatedMinutes,
          routine.estimatedMinutes
        ),

        imageUrl: media.imageUrl || routine.imageUrl,
        imagePublicId: media.imagePublicId || routine.imagePublicId,

        videoUrl: nextVideoUrl,
        videoPublicId: nextVideoPublicId,
        videoType: nextVideoType,

        status: allowedStatuses.includes(req.body.status)
          ? req.body.status
          : routine.status,
      },
      { transaction }
    );

    await RoutineExercise.destroy({
      where: { routineId: routine.id },
      transaction,
    });

    const exercises = parseExercises(req.body.exercises);

    if (exercises.length) {
      await RoutineExercise.bulkCreate(
        exercises.map((exercise) => ({
          ...exercise,
          routineId: routine.id,
        })),
        { transaction }
      );
    }

    await transaction.commit();

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Rutina actualizada correctamente",
      routine: serializeRoutine(fullRoutine),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("updateTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo actualizar la rutina" });
  }
};

export const deleteTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();

  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        trainerId: getTrainerId(req),
      },
      transaction,
    });

    if (!routine) {
      await transaction.rollback();
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    if (routine.imagePublicId) {
      await destroyCloudinaryImage(routine.imagePublicId);
    }

    if (routine.videoPublicId) {
      await destroyCloudinaryVideo(routine.videoPublicId);
    }

    await RoutineExercise.destroy({
      where: { routineId: routine.id },
      transaction,
    });

    await routine.destroy({ transaction });

    await transaction.commit();

    return res.json({
      message: "Rutina eliminada correctamente",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo eliminar la rutina" });
  }
};

export const publishTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        trainerId: getTrainerId(req),
      },
    });

    if (!routine) {
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    await routine.update({ status: "published" });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Rutina publicada correctamente",
      routine: serializeRoutine(fullRoutine),
    });
  } catch (error) {
    console.error("publishTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo publicar la rutina" });
  }
};

export const archiveTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        trainerId: getTrainerId(req),
      },
    });

    if (!routine) {
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    await routine.update({ status: "archived" });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Rutina archivada correctamente",
      routine: serializeRoutine(fullRoutine),
    });
  } catch (error) {
    console.error("archiveTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo archivar la rutina" });
  }
};