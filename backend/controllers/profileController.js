import {
  UserProfile,
  UserWeightHistory,
  UserCalorieHistory,
} from "../models/index.js";
import {
  getTodayDateOnly,
  addDaysToDateOnly,
} from "../utils/profileDateUtils.js";

export const getMyProfileDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDateOnly();

    const profile = await UserProfile.findOne({
      where: { userId },
    });

    const weightHistory = await UserWeightHistory.findAll({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    const calorieHistory = await UserCalorieHistory.findAll({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    const latestWeight = weightHistory.length ? weightHistory[0] : null;
    const latestCalories = calorieHistory.length ? calorieHistory[0] : null;

    return res.status(200).json({
      ok: true,
      profile,
      latestWeight,
      latestCalories,
      weightHistory,
      calorieHistory,
      canRegisterWeight:
        !latestWeight || today >= latestWeight.nextAllowedDate,
      nextWeightAllowedDate: latestWeight?.nextAllowedDate ?? null,
      canRegisterCalories:
        !latestCalories || today >= latestCalories.nextAllowedDate,
      nextCaloriesAllowedDate: latestCalories?.nextAllowedDate ?? null,
    });
  } catch (error) {
    console.error("getMyProfileDashboard error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener el perfil del usuario.",
    });
  }
};

export const upsertMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      age,
      gender,
      height,
      initialWeight,
      targetWeight,
      startDate,
      weeklyGymDays,
      activityLevel,
      fitnessGoal,
    } = req.body;

    let profile = await UserProfile.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = await UserProfile.create({
        userId,
        age: age ?? null,
        gender: gender ?? null,
        height: height ?? null,
        initialWeight: initialWeight ?? null,
        targetWeight: targetWeight ?? null,
        startDate: startDate ?? null,
        weeklyGymDays: weeklyGymDays ?? null,
        activityLevel: activityLevel ?? null,
        fitnessGoal: fitnessGoal ?? null,
      });
    } else {
      await profile.update({
        age: age ?? profile.age,
        gender: gender ?? profile.gender,
        height: height ?? profile.height,
        initialWeight: initialWeight ?? profile.initialWeight,
        targetWeight: targetWeight ?? profile.targetWeight,
        startDate: startDate ?? profile.startDate,
        weeklyGymDays: weeklyGymDays ?? profile.weeklyGymDays,
        activityLevel: activityLevel ?? profile.activityLevel,
        fitnessGoal: fitnessGoal ?? profile.fitnessGoal,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Perfil actualizado correctamente.",
      profile,
    });
  } catch (error) {
    console.error("upsertMyProfile error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al guardar el perfil.",
    });
  }
};

export const getMyWeightHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDateOnly();

    const records = await UserWeightHistory.findAll({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    const latestRecord = records.length ? records[0] : null;

    return res.status(200).json({
      ok: true,
      records,
      latestRecord,
      canRegister: !latestRecord || today >= latestRecord.nextAllowedDate,
      nextAllowedDate: latestRecord?.nextAllowedDate ?? null,
    });
  } catch (error) {
    console.error("getMyWeightHistory error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener historial de peso.",
    });
  }
};

export const createWeeklyWeightRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight } = req.body;

    if (!weight) {
      return res.status(400).json({
        ok: false,
        message: "El peso es requerido.",
      });
    }

    const today = getTodayDateOnly();

    const lastRecord = await UserWeightHistory.findOne({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    if (lastRecord && today < lastRecord.nextAllowedDate) {
      return res.status(403).json({
        ok: false,
        message: `Ya registraste tu peso. Podrás volver a registrarlo a partir del ${lastRecord.nextAllowedDate}.`,
      });
    }

    const nextAllowedDate = addDaysToDateOnly(today, 7);

    const newRecord = await UserWeightHistory.create({
      userId,
      recordDate: today,
      weight,
      nextAllowedDate,
    });

    return res.status(201).json({
      ok: true,
      message: "Peso registrado correctamente.",
      record: newRecord,
    });
  } catch (error) {
    console.error("createWeeklyWeightRecord error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar el peso.",
    });
  }
};

export const deleteLatestWeightRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await UserWeightHistory.findOne({
      where: { id, userId },
    });

    if (!record) {
      return res.status(404).json({
        ok: false,
        message: "Registro de peso no encontrado.",
      });
    }

    const latestRecord = await UserWeightHistory.findOne({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    if (!latestRecord || latestRecord.id !== record.id) {
      return res.status(403).json({
        ok: false,
        message: "Solo puedes eliminar el último registro de peso.",
      });
    }

    await record.destroy();

    return res.status(200).json({
      ok: true,
      message: "Último registro de peso eliminado correctamente.",
    });
  } catch (error) {
    console.error("deleteLatestWeightRecord error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al eliminar el registro de peso.",
    });
  }
};

export const getMyCalorieHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDateOnly();

    const records = await UserCalorieHistory.findAll({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    const latestRecord = records.length ? records[0] : null;

    return res.status(200).json({
      ok: true,
      records,
      latestRecord,
      canRegister: !latestRecord || today >= latestRecord.nextAllowedDate,
      nextAllowedDate: latestRecord?.nextAllowedDate ?? null,
    });
  } catch (error) {
    console.error("getMyCalorieHistory error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener historial de calorías.",
    });
  }
};

export const createWeeklyCalorieRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dailyCalories } = req.body;

    if (!dailyCalories) {
      return res.status(400).json({
        ok: false,
        message: "La ingesta calórica diaria es requerida.",
      });
    }

    const today = getTodayDateOnly();

    const lastRecord = await UserCalorieHistory.findOne({
      where: { userId },
      order: [["recordDate", "DESC"]],
    });

    if (lastRecord && today < lastRecord.nextAllowedDate) {
      return res.status(403).json({
        ok: false,
        message: `Ya registraste tus calorías. Podrás volver a registrarlas a partir del ${lastRecord.nextAllowedDate}.`,
      });
    }

    const nextAllowedDate = addDaysToDateOnly(today, 7);

    const record = await UserCalorieHistory.create({
      userId,
      recordDate: today,
      dailyCalories,
      nextAllowedDate,
    });

    return res.status(201).json({
      ok: true,
      message: "Calorías registradas correctamente.",
      record,
    });
  } catch (error) {
    console.error("createWeeklyCalorieRecord error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar calorías.",
    });
  }
};