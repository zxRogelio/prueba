import { TrainerProfile } from "../models/index.js";
import {
  uploadMediaBufferToCloudinary,
  destroyCloudinaryImage,
} from "../utils/cloudinaryUpload.js";

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

const serializeProfile = (profile, user) => ({
  id: profile?.id ?? null,
  trainerId: user.id,
  email: user.email,
  fullName: profile?.fullName ?? "",
  phone: profile?.phone ?? "",
  specialty: profile?.specialty ?? "",
  certifications: profile?.certifications ?? "",
  experienceYears: profile?.experienceYears ?? 0,
  bio: profile?.bio ?? "",
  focus: profile?.focus ?? "",
  photoUrl: profile?.photoUrl ?? "",
  createdAt: profile?.createdAt ?? null,
  updatedAt: profile?.updatedAt ?? null,
});

export const getTrainerProfile = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const profile = await TrainerProfile.findOne({
      where: {
        trainerId: req.user.id,
      },
    });

    return res.json({
      profile: serializeProfile(profile, req.user),
    });
  } catch (error) {
    console.error("getTrainerProfile error:", error);
    return res.status(500).json({ error: "No se pudo cargar el perfil" });
  }
};

export const updateTrainerProfile = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    let profile = await TrainerProfile.findOne({
      where: {
        trainerId: req.user.id,
      },
    });

    const file = req.file;
    let photoUrl = profile?.photoUrl ?? null;
    let photoPublicId = profile?.photoPublicId ?? null;

    if (file?.buffer) {
      const uploaded = await uploadMediaBufferToCloudinary(file.buffer, {
        folder: "titanium/trainers/profile",
        resourceType: "image",
      });

      if (photoPublicId) {
        await destroyCloudinaryImage(photoPublicId);
      }

      photoUrl = uploaded.secure_url;
      photoPublicId = uploaded.public_id;
    }

    const payload = {
      trainerId: req.user.id,
      fullName: cleanText(req.body.fullName),
      phone: cleanText(req.body.phone),
      specialty: cleanText(req.body.specialty),
      certifications: cleanText(req.body.certifications),
      experienceYears: Number(req.body.experienceYears || 0),
      bio: cleanText(req.body.bio),
      focus: cleanText(req.body.focus),
      photoUrl,
      photoPublicId,
    };

    if (profile) {
      await profile.update(payload);
    } else {
      profile = await TrainerProfile.create(payload);
    }

    return res.json({
      message: "Perfil actualizado correctamente",
      profile: serializeProfile(profile, req.user),
    });
  } catch (error) {
    console.error("updateTrainerProfile error:", error);
    return res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
};