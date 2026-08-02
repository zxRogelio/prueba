import path from "node:path";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Routine, RoutineExercise, User } from "../models/index.js";
import {
  uploadMediaBufferToCloudinary,
  destroyCloudinaryImage,
  destroyCloudinaryVideo,
} from "../utils/cloudinaryUpload.js";

const allowedStatuses = [
  "draft",
  "pending_review",
  "published",
  "archived",
  "rejected",
];
const allowedLevels = ["principiante", "intermedio", "avanzado"];
const allowedCategories = [
  "fuerza",
  "hipertrofia",
  "perdida_peso",
  "resistencia",
  "movilidad",
  "general",
];
const allowedExerciseVideoTypes = ["none", "upload", "youtube", "external"];
const allowedExerciseVideoMimes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const allowedExerciseVideoExtensions = new Set([".mp4", ".webm", ".mov"]);
const reviewStatuses = new Set(["pending_review", "published"]);

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

class HttpError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

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

const toMinimumInteger = (value, fallback, minimum) =>
  Math.max(minimum, toPositiveInteger(value, fallback));

const isYouTubeHost = (host) => {
  const cleanHost = host.toLowerCase().replace(/^www\./, "");
  return cleanHost === "youtube.com" || cleanHost.endsWith(".youtube.com") || cleanHost === "youtu.be";
};

const detectVideoType = (url) => {
  if (!url) return "none";

  try {
    const parsed = new URL(url);
    return isYouTubeHost(parsed.hostname) ? "youtube" : "external";
  } catch {
    return "external";
  }
};

const normalizeExerciseVideoType = (videoType, videoUrl) => {
  if (allowedExerciseVideoTypes.includes(videoType)) return videoType;
  return videoUrl ? detectVideoType(videoUrl) : "none";
};

const normalizeExerciseVideoUrl = (value) => {
  const rawUrl = normalizeText(value);

  if (!rawUrl) {
    throw new HttpError(400, "La URL del video es obligatoria");
  }

  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "La URL del video no es valida");
  }

  if (parsed.protocol !== "https:") {
    throw new HttpError(400, "La URL del video debe usar HTTPS");
  }

  const videoUrl = parsed.toString();

  return {
    videoUrl,
    videoType: detectVideoType(videoUrl),
  };
};

const parseExercises = (raw) => {
  if (!raw) return [];

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((exercise, index) => ({
        id: normalizeText(exercise.id),
        name: normalizeText(exercise.name),
        description: normalizeText(exercise.description),
        dayNumber: toMinimumInteger(exercise.dayNumber, 1, 1),
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

const serializeExercise = (exercise, { includeVideoPublicId = false } = {}) => {
  const json = exercise?.toJSON ? exercise.toJSON() : exercise;
  const videoType = normalizeExerciseVideoType(json.videoType, json.videoUrl);
  const hasVideo = Boolean(json.videoUrl && videoType !== "none");

  return {
    id: json.id,
    routineId: json.routineId,
    name: json.name,
    description: json.description ?? null,
    dayNumber: json.dayNumber,
    sets: json.sets ?? null,
    reps: json.reps ?? null,
    restSeconds: json.restSeconds ?? null,
    notes: json.notes ?? null,
    order: json.order,
    videoUrl: json.videoUrl ?? null,
    videoType,
    hasVideo,
    ...(includeVideoPublicId
      ? {
          videoPublicId: json.videoPublicId ?? null,
        }
      : {}),
  };
};

const serializeRoutine = (
  routine,
  { includeExercisePublicId = false, includeLegacyRoutineVideo = false } = {}
) => {
  const json = routine?.toJSON ? routine.toJSON() : routine;

  const exercises = Array.isArray(json.exercises)
    ? [...json.exercises]
        .sort((a, b) => {
          const dayDiff = Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0);
          if (dayDiff !== 0) return dayDiff;
          return Number(a.order ?? 0) - Number(b.order ?? 0);
        })
        .map((exercise) =>
          serializeExercise(exercise, {
            includeVideoPublicId: includeExercisePublicId,
          })
        )
    : [];

  const {
    exercises: _exercises,
    videoUrl,
    videoPublicId,
    videoType,
    ...routineData
  } = json;

  return {
    ...routineData,
    ...(includeLegacyRoutineVideo
      ? {
          legacyVideoUrl: videoUrl ?? null,
          legacyVideoPublicId: videoPublicId ?? null,
          legacyVideoType: videoType ?? "none",
        }
      : {}),
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

const sendHttpError = (res, error, fallbackMessage) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...error.details,
    });
  }

  return res.status(500).json({ error: fallbackMessage });
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

const findTrainerExerciseTarget = async (req, transaction = null) => {
  const routine = await Routine.findOne({
    where: {
      id: req.params.routineId,
      trainerId: getTrainerId(req),
    },
    transaction,
  });

  if (!routine) {
    throw new HttpError(404, "Rutina no encontrada");
  }

  const exercise = await RoutineExercise.findOne({
    where: {
      id: req.params.exerciseId,
      routineId: routine.id,
    },
    transaction,
  });

  if (!exercise) {
    throw new HttpError(
      404,
      "Ejercicio no encontrado para esta rutina"
    );
  }

  return { routine, exercise };
};

const handleRoutineMedia = async (req) => {
  const files = req.files || {};
  const imageFile = Array.isArray(files.image) ? files.image[0] : null;
  const output = {};

  if (imageFile?.buffer) {
    const uploadedImage = await uploadMediaBufferToCloudinary(imageFile.buffer, {
      folder: "titanium/routines/images",
      resourceType: "image",
    });

    output.imageUrl = uploadedImage.secure_url;
    output.imagePublicId = uploadedImage.public_id;
  }

  return output;
};

const cleanupCloudinaryImages = async (publicIds) => {
  const ids = [...new Set(publicIds.filter(Boolean))];

  const results = await Promise.allSettled(
    ids.map((publicId) => destroyCloudinaryImage(publicId))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("cleanupCloudinaryImages error:", ids[index], result.reason);
    }
  });
};

const cleanupCloudinaryVideos = async (publicIds) => {
  const ids = [...new Set(publicIds.filter(Boolean))];

  const results = await Promise.allSettled(
    ids.map((publicId) => destroyCloudinaryVideo(publicId))
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("cleanupCloudinaryVideos error:", ids[index], result.reason);
    }
  });
};

const getExerciseReviewIssue = (exercise) => {
  const json = exercise?.toJSON ? exercise.toJSON() : exercise;
  const videoType = json.videoType;

  if (!normalizeText(json.name)) {
    return "Ejercicio sin nombre";
  }

  if (!Number.isInteger(Number(json.dayNumber)) || Number(json.dayNumber) < 1) {
    return "Dia invalido";
  }

  if (!json.videoUrl || videoType === "none") {
    return "Sin video";
  }

  if (!allowedExerciseVideoTypes.includes(videoType)) {
    return "Tipo de video invalido";
  }

  if (videoType === "upload" && !json.videoPublicId) {
    return "Video subido sin publicId";
  }

  if (videoType !== "upload" && json.videoPublicId) {
    return "URL externa con publicId";
  }

  return null;
};

const getRoutineReadiness = async (routineId, transaction = null) => {
  const exercises = await RoutineExercise.findAll({
    where: { routineId },
    order: [["dayNumber", "ASC"], ["order", "ASC"]],
    transaction,
  });

  const exercisesWithoutVideo = exercises
    .map((exercise) => {
      const reason = getExerciseReviewIssue(exercise);

      if (!reason) return null;

      return {
        id: exercise.id,
        exerciseId: exercise.id,
        name: exercise.name,
        dayNumber: exercise.dayNumber,
        motivo: reason,
      };
    })
    .filter(Boolean);

  return {
    hasExercises: exercises.length > 0,
    exercisesWithoutVideo,
    isReady: exercises.length > 0 && exercisesWithoutVideo.length === 0,
  };
};

const buildReviewErrorPayload = (readiness) => {
  if (!readiness.hasExercises) {
    return {
      error: "La rutina debe tener al menos un ejercicio antes de enviarse a revision",
      exercisesWithoutVideo: [],
    };
  }

  return {
    error: "Todos los ejercicios deben tener un video antes de enviar la rutina a revision",
    exercisesWithoutVideo: readiness.exercisesWithoutVideo,
  };
};

const validateRoutineReadyForReview = async (routineId, transaction = null) => {
  const readiness = await getRoutineReadiness(routineId, transaction);

  if (!readiness.isReady) {
    throw new HttpError(400, buildReviewErrorPayload(readiness).error, {
      exercisesWithoutVideo: readiness.exercisesWithoutVideo,
    });
  }

  return readiness;
};

const demoteRoutineIfIncomplete = async (routine, transaction) => {
  if (!reviewStatuses.has(routine.status)) return false;

  const readiness = await getRoutineReadiness(routine.id, transaction);

  if (readiness.isReady) return false;

  await routine.update({ status: "draft" }, { transaction });
  return true;
};

const syncRoutineExercises = async (routineId, exercises, transaction) => {
  const exerciseIds = exercises
    .map((exercise) => exercise.id)
    .filter(Boolean);
  const uniqueExerciseIds = new Set(exerciseIds);

  if (uniqueExerciseIds.size !== exerciseIds.length) {
    throw new HttpError(400, "No se pueden enviar IDs de ejercicio duplicados");
  }

  const existingExercises = await RoutineExercise.findAll({
    where: { routineId },
    transaction,
  });
  const existingById = new Map(
    existingExercises.map((exercise) => [exercise.id, exercise])
  );
  const invalidIds = exerciseIds.filter((id) => !existingById.has(id));

  if (invalidIds.length) {
    throw new HttpError(
      400,
      "Uno o mas ejercicios no pertenecen a esta rutina",
      { invalidExerciseIds: invalidIds }
    );
  }

  const retainedIds = new Set();
  const removedVideoPublicIds = [];

  for (const exercise of exercises) {
    const exerciseFields = {
      name: exercise.name,
      description: exercise.description,
      dayNumber: exercise.dayNumber,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      order: exercise.order,
    };

    if (exercise.id) {
      const existingExercise = existingById.get(exercise.id);
      retainedIds.add(exercise.id);
      await existingExercise.update(exerciseFields, { transaction });
      continue;
    }

    await RoutineExercise.create(
      {
        ...exerciseFields,
        routineId,
        videoUrl: null,
        videoPublicId: null,
        videoType: "none",
      },
      { transaction }
    );
  }

  const exercisesToRemove = existingExercises.filter(
    (exercise) => !retainedIds.has(exercise.id)
  );

  if (exercisesToRemove.length) {
    removedVideoPublicIds.push(
      ...exercisesToRemove
        .map((exercise) => exercise.videoPublicId)
        .filter(Boolean)
    );

    await RoutineExercise.destroy({
      where: {
        id: {
          [Op.in]: exercisesToRemove.map((exercise) => exercise.id),
        },
      },
      transaction,
    });
  }

  return { removedVideoPublicIds };
};

const validateExerciseVideoFile = (file) => {
  if (!file?.buffer) {
    throw new HttpError(400, "Debes adjuntar un archivo de video");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExerciseVideoMimes.has(file.mimetype)) {
    throw new HttpError(400, "Tipo MIME de video no permitido");
  }

  if (!allowedExerciseVideoExtensions.has(extension)) {
    throw new HttpError(400, "Extension de video no permitida");
  }
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
      routines: routines.map((routine) =>
        serializeRoutine(routine, { includeExercisePublicId: true })
      ),
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
      routine: serializeRoutine(routine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("getTrainerRoutineById error:", error);
    return res.status(500).json({ error: "No se pudo cargar la rutina" });
  }
};

export const createTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();
  let newImagePublicId = null;

  try {
    const title = normalizeText(req.body.title);

    if (!title) {
      await transaction.rollback();

      return res.status(400).json({
        error: "El nombre de la rutina es obligatorio",
      });
    }

    const level = allowedLevels.includes(req.body.level)
      ? req.body.level
      : "principiante";

    const category = allowedCategories.includes(req.body.category)
      ? req.body.category
      : "general";

    const media = await handleRoutineMedia(req);
    newImagePublicId = media.imagePublicId || null;

    const routine = await Routine.create(
      {
        trainerId: getTrainerId(req),
        title,
        objective: normalizeText(req.body.objective),
        description: normalizeText(req.body.description),
        level,
        category,
        durationWeeks: toMinimumInteger(
          req.body.durationWeeks,
          4,
          1
        ),
        daysPerWeek: toMinimumInteger(
          req.body.daysPerWeek,
          3,
          1
        ),
        estimatedMinutes: toMinimumInteger(
          req.body.estimatedMinutes,
          45,
          1
        ),

        imageUrl: media.imageUrl || null,
        imagePublicId: media.imagePublicId || null,

        // Campos heredados del video general.
        videoUrl: null,
        videoPublicId: null,
        videoType: "none",

        status: "draft",
      },
      { transaction }
    );

    const exercises = parseExercises(req.body.exercises);

    for (const exercise of exercises) {
      // No enviar id en ejercicios nuevos.
      // Sequelize generará automáticamente el UUID.
      const exerciseFields = { ...exercise };
      delete exerciseFields.id;

      await RoutineExercise.create(
        {
          ...exerciseFields,
          routineId: routine.id,
          videoUrl: null,
          videoPublicId: null,
          videoType: "none",
        },
        { transaction }
      );
    }

    await transaction.commit();
    newImagePublicId = null;

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.status(201).json({
      message: "Rutina creada correctamente",
      routine: serializeRoutine(fullRoutine, {
        includeExercisePublicId: true,
      }),
    });
  } catch (error) {
    await transaction.rollback();
    await cleanupCloudinaryImages([newImagePublicId]);

    console.error("createTrainerRoutine error:", error);

    return sendHttpError(
      res,
      error,
      "No se pudo crear la rutina"
    );
  }
};

export const updateTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();
  let newImagePublicId = null;
  let previousImagePublicId = null;
  let removedExerciseVideoPublicIds = [];

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

    const media = await handleRoutineMedia(req);
    newImagePublicId = media.imagePublicId || null;
    previousImagePublicId = newImagePublicId ? routine.imagePublicId : null;

    const requestedStatus = normalizeText(req.body.status);
    const nextStatus =
      requestedStatus === "draft" || requestedStatus === "archived"
        ? requestedStatus
        : routine.status;

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
        durationWeeks: toMinimumInteger(req.body.durationWeeks, routine.durationWeeks, 1),
        daysPerWeek: toMinimumInteger(req.body.daysPerWeek, routine.daysPerWeek, 1),
        estimatedMinutes: toMinimumInteger(
          req.body.estimatedMinutes,
          routine.estimatedMinutes,
          1
        ),

        imageUrl: media.imageUrl || routine.imageUrl,
        imagePublicId: media.imagePublicId || routine.imagePublicId,

        // Do not accept routine-level video updates. These columns remain legacy.
        status: nextStatus,
      },
      { transaction }
    );

    const exercises = parseExercises(req.body.exercises);
    const syncResult = await syncRoutineExercises(routine.id, exercises, transaction);
    removedExerciseVideoPublicIds = syncResult.removedVideoPublicIds;

    await demoteRoutineIfIncomplete(routine, transaction);

    await transaction.commit();
    newImagePublicId = null;

    await cleanupCloudinaryImages([previousImagePublicId]);
    await cleanupCloudinaryVideos(removedExerciseVideoPublicIds);

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Rutina actualizada correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    await transaction.rollback();
    await cleanupCloudinaryImages([newImagePublicId]);
    console.error("updateTrainerRoutine error:", error);
    return sendHttpError(res, error, "No se pudo actualizar la rutina");
  }
};

export const deleteTrainerRoutine = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  const transaction = await sequelize.transaction();
  let imagePublicId = null;
  let legacyVideoPublicId = null;
  let exerciseVideoPublicIds = [];

  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        trainerId: getTrainerId(req),
      },
      include: [
        {
          model: RoutineExercise,
          as: "exercises",
          required: false,
        },
      ],
      transaction,
    });

    if (!routine) {
      await transaction.rollback();
      return res.status(404).json({ error: "Rutina no encontrada" });
    }

    imagePublicId = routine.imagePublicId;
    legacyVideoPublicId = routine.videoPublicId;
    exerciseVideoPublicIds = (routine.exercises || [])
      .map((exercise) => exercise.videoPublicId)
      .filter(Boolean);

    await RoutineExercise.destroy({
      where: { routineId: routine.id },
      transaction,
    });

    await routine.destroy({ transaction });

    await transaction.commit();

    await cleanupCloudinaryImages([imagePublicId]);
    await cleanupCloudinaryVideos([legacyVideoPublicId, ...exerciseVideoPublicIds]);

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
      return res.status(404).json({
        error: "Rutina no encontrada",
      });
    }

    await validateRoutineReadyForReview(routine.id);

    await routine.update({
      status: "pending_review",
    });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Rutina enviada a revision del administrador",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("publishTrainerRoutine error:", error);
    return sendHttpError(res, error, "No se pudo enviar la rutina a revision");
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
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("archiveTrainerRoutine error:", error);
    return res.status(500).json({ error: "No se pudo archivar la rutina" });
  }
};

export const uploadTrainerExerciseVideo = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  let uploadedVideoPublicId = null;
  let previousVideoPublicId = null;

  try {
    validateExerciseVideoFile(req.file);

    const { routine, exercise } = await findTrainerExerciseTarget(req);
    const uploadedVideo = await uploadMediaBufferToCloudinary(req.file.buffer, {
      folder: `titanium/routines/${routine.id}/exercises/${exercise.id}`,
      resourceType: "video",
    });

    uploadedVideoPublicId = uploadedVideo.public_id;
    previousVideoPublicId =
      exercise.videoType === "upload" ? exercise.videoPublicId : null;

    await sequelize.transaction(async (transaction) => {
      const targetExercise = await RoutineExercise.findOne({
        where: {
          id: exercise.id,
          routineId: routine.id,
        },
        transaction,
      });

      if (!targetExercise) {
        throw new HttpError(404, "Ejercicio no encontrado para esta rutina");
      }

      await targetExercise.update(
        {
          videoUrl: uploadedVideo.secure_url,
          videoPublicId: uploadedVideo.public_id,
          videoType: "upload",
        },
        { transaction }
      );
    });

    uploadedVideoPublicId = null;
    await cleanupCloudinaryVideos([previousVideoPublicId]);

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Video del ejercicio actualizado correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
      exercise: serializeExercise(
        fullRoutine.exercises.find((item) => item.id === exercise.id),
        { includeVideoPublicId: true }
      ),
    });
  } catch (error) {
    await cleanupCloudinaryVideos([uploadedVideoPublicId]);
    console.error("uploadTrainerExerciseVideo error:", error);
    return sendHttpError(res, error, "No se pudo subir el video del ejercicio");
  }
};

export const setTrainerExerciseVideoUrl = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  let previousVideoPublicId = null;

  try {
    const normalizedVideo = normalizeExerciseVideoUrl(
      req.body.videoUrl ?? req.body.url
    );
    const { routine, exercise } = await findTrainerExerciseTarget(req);
    previousVideoPublicId =
      exercise.videoType === "upload" ? exercise.videoPublicId : null;

    await sequelize.transaction(async (transaction) => {
      const targetExercise = await RoutineExercise.findOne({
        where: {
          id: exercise.id,
          routineId: routine.id,
        },
        transaction,
      });

      if (!targetExercise) {
        throw new HttpError(404, "Ejercicio no encontrado para esta rutina");
      }

      await targetExercise.update(
        {
          videoUrl: normalizedVideo.videoUrl,
          videoPublicId: null,
          videoType: normalizedVideo.videoType,
        },
        { transaction }
      );
    });

    await cleanupCloudinaryVideos([previousVideoPublicId]);

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "URL del video del ejercicio actualizada correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
      exercise: serializeExercise(
        fullRoutine.exercises.find((item) => item.id === exercise.id),
        { includeVideoPublicId: true }
      ),
    });
  } catch (error) {
    console.error("setTrainerExerciseVideoUrl error:", error);
    return sendHttpError(res, error, "No se pudo guardar la URL del video");
  }
};

export const deleteTrainerExerciseVideo = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  let previousVideoPublicId = null;

  try {
    const { routine, exercise } = await findTrainerExerciseTarget(req);
    previousVideoPublicId =
      exercise.videoType === "upload" ? exercise.videoPublicId : null;

    await sequelize.transaction(async (transaction) => {
      const targetRoutine = await Routine.findOne({
        where: {
          id: routine.id,
          trainerId: getTrainerId(req),
        },
        transaction,
      });
      const targetExercise = await RoutineExercise.findOne({
        where: {
          id: exercise.id,
          routineId: routine.id,
        },
        transaction,
      });

      if (!targetRoutine || !targetExercise) {
        throw new HttpError(404, "Ejercicio no encontrado para esta rutina");
      }

      await targetExercise.update(
        {
          videoUrl: null,
          videoPublicId: null,
          videoType: "none",
        },
        { transaction }
      );

      if (reviewStatuses.has(targetRoutine.status)) {
        await targetRoutine.update({ status: "draft" }, { transaction });
      }
    });

    await cleanupCloudinaryVideos([previousVideoPublicId]);

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      message: "Video del ejercicio eliminado correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
      exercise: serializeExercise(
        fullRoutine.exercises.find((item) => item.id === exercise.id),
        { includeVideoPublicId: true }
      ),
    });
  } catch (error) {
    console.error("deleteTrainerExerciseVideo error:", error);
    return sendHttpError(res, error, "No se pudo eliminar el video del ejercicio");
  }
};

export const publicTrainerRoutine = async (req, res) => {
  try {
    const search = normalizeText(req.query.search);
    const category = normalizeText(req.query.category);
    const level = normalizeText(req.query.level);

    const where = {
      status: "published",
    };

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
      ok: true,
      routines: routines.map((routine) => serializeRoutine(routine)),
      activeSubscription: req.activeSubscription ?? null,
    });
  } catch (error) {
    console.error("publicTrainerRoutine error:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudieron cargar las rutinas disponibles",
    });
  }
};

export const getPublicTrainerRoutineById = async (req, res) => {
  try {
    const routine = await Routine.findOne({
      where: {
        id: req.params.id,
        status: "published",
      },
      include: routineInclude,
    });

    if (!routine) {
      return res.status(404).json({
        ok: false,
        error: "Rutina no encontrada o no disponible",
      });
    }

    return res.json({
      ok: true,
      routine: serializeRoutine(routine),
      activeSubscription: req.activeSubscription ?? null,
    });
  } catch (error) {
    console.error("getPublicTrainerRoutineById error:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudo cargar la rutina",
    });
  }
};

export const listAdminRoutinesForReview = async (req, res) => {
  try {
    const search = normalizeText(req.query.search);
    const status = normalizeText(req.query.status) || "pending_review";
    const category = normalizeText(req.query.category);
    const level = normalizeText(req.query.level);

    const where = {};

    if (status !== "all") {
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
      ok: true,
      routines: routines.map((routine) =>
        serializeRoutine(routine, { includeExercisePublicId: true })
      ),
    });
  } catch (error) {
    console.error("listAdminRoutinesForReview error:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudieron cargar las rutinas para revision",
    });
  }
};

export const approveAdminRoutine = async (req, res) => {
  try {
    const routine = await Routine.findByPk(req.params.id);

    if (!routine) {
      return res.status(404).json({
        ok: false,
        error: "Rutina no encontrada",
      });
    }

    await validateRoutineReadyForReview(routine.id);

    await routine.update({
      status: "published",
    });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      ok: true,
      message: "Rutina aprobada y publicada correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("approveAdminRoutine error:", error);
    return sendHttpError(res, error, "No se pudo aprobar la rutina");
  }
};

export const rejectAdminRoutine = async (req, res) => {
  try {
    const routine = await Routine.findByPk(req.params.id);

    if (!routine) {
      return res.status(404).json({
        ok: false,
        error: "Rutina no encontrada",
      });
    }

    await routine.update({
      status: "rejected",
    });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      ok: true,
      message: "Rutina rechazada correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("rejectAdminRoutine error:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudo rechazar la rutina",
    });
  }
};

export const archiveAdminRoutine = async (req, res) => {
  try {
    const routine = await Routine.findByPk(req.params.id);

    if (!routine) {
      return res.status(404).json({
        ok: false,
        error: "Rutina no encontrada",
      });
    }

    await routine.update({
      status: "archived",
    });

    const fullRoutine = await Routine.findByPk(routine.id, {
      include: routineInclude,
    });

    return res.json({
      ok: true,
      message: "Rutina archivada correctamente",
      routine: serializeRoutine(fullRoutine, { includeExercisePublicId: true }),
    });
  } catch (error) {
    console.error("archiveAdminRoutine error:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudo archivar la rutina",
    });
  }
};
