import { API } from "../../api/api";

export interface TrainerProfileDTO {
  id: string | null;
  trainerId: string;
  email: string;
  fullName: string;
  phone: string;
  specialty: string;
  certifications: string;
  experienceYears: number;
  bio: string;
  focus: string;
  photoUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TrainerProfilePayload {
  fullName: string;
  phone: string;
  specialty: string;
  certifications: string;
  experienceYears: number;
  bio: string;
  focus: string;
  photoFile?: File | null;
}

export const getTrainerProfile = async () => {
  const { data } = await API.get<{ profile: TrainerProfileDTO }>(
    "/trainer/profile",
  );

  return data.profile;
};

export const updateTrainerProfile = async (payload: TrainerProfilePayload) => {
  const formData = new FormData();

  formData.append("fullName", payload.fullName);
  formData.append("phone", payload.phone);
  formData.append("specialty", payload.specialty);
  formData.append("certifications", payload.certifications);
  formData.append("experienceYears", String(payload.experienceYears));
  formData.append("bio", payload.bio);
  formData.append("focus", payload.focus);

  if (payload.photoFile) {
    formData.append("photo", payload.photoFile);
  }

  const { data } = await API.put<{ profile: TrainerProfileDTO }>(
    "/trainer/profile",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.profile;
};