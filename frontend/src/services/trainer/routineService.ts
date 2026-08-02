import { API } from "../../api/api";

export type RoutineStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived"
  | "rejected";
export type RoutineLevel = "principiante" | "intermedio" | "avanzado";
export type ExerciseVideoType = "none" | "upload" | "youtube" | "external";
export type RoutineCategory =
  | "fuerza"
  | "hipertrofia"
  | "perdida_peso"
  | "resistencia"
  | "movilidad"
  | "general";

export interface RoutineExerciseDTO {
  id?: string;
  routineId?: string;
  name: string;
  description?: string | null;
  dayNumber: number;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  order: number;
  videoUrl?: string | null;
  videoPublicId?: string | null;
  videoType: ExerciseVideoType;
  hasVideo: boolean;
}

export interface TrainerRoutineDTO {
  id: string;
  trainerId: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  level: RoutineLevel;
  category: RoutineCategory;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  status: RoutineStatus;
  createdAt: string;
  updatedAt: string;
  exercises: RoutineExerciseDTO[];
  trainerEmail?: string | null;
}

export interface RoutinePayload {
  title: string;
  objective: string;
  description: string;
  level: RoutineLevel;
  category: RoutineCategory;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  status: RoutineStatus;
  exercises: RoutineExerciseDTO[];
  imageFile?: File | null;
}

const buildRoutineFormData = (payload: RoutinePayload) => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("objective", payload.objective);
  formData.append("description", payload.description);
  formData.append("level", payload.level);
  formData.append("category", payload.category);
  formData.append("durationWeeks", String(payload.durationWeeks));
  formData.append("daysPerWeek", String(payload.daysPerWeek));
  formData.append("estimatedMinutes", String(payload.estimatedMinutes));
  formData.append("status", payload.status);
  formData.append("exercises", JSON.stringify(payload.exercises || []));

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  return formData;
};

export const getTrainerRoutines = async () => {
  const { data } = await API.get<{ routines: TrainerRoutineDTO[] }>(
    "/trainer/routines",
  );

  return data.routines;
};

export const getTrainerRoutineById = async (id: string) => {
  const { data } = await API.get<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${id}`,
  );

  return data.routine;
};

export const createTrainerRoutine = async (payload: RoutinePayload) => {
  const formData = buildRoutineFormData(payload);

  const { data } = await API.post<{ routine: TrainerRoutineDTO }>(
    "/trainer/routines",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.routine;
};

export const updateTrainerRoutine = async (
  id: string,
  payload: RoutinePayload,
) => {
  const formData = buildRoutineFormData(payload);

  const { data } = await API.put<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.routine;
};

export const deleteTrainerRoutine = async (id: string) => {
  await API.delete(`/trainer/routines/${id}`);
};

export const publishTrainerRoutine = async (id: string) => {
  const { data } = await API.patch<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${id}/publish`,
  );

  return data.routine;
};

export const archiveTrainerRoutine = async (id: string) => {
  const { data } = await API.patch<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${id}/archive`,
  );

  return data.routine;
};

export const uploadExerciseVideo = async (
  routineId: string,
  exerciseId: string,
  videoFile: File,
) => {
  const formData = new FormData();
  formData.append("video", videoFile);

  const { data } = await API.post<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${routineId}/exercises/${exerciseId}/video`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data.routine;
};

export const setExerciseVideoUrl = async (
  routineId: string,
  exerciseId: string,
  videoUrl: string,
) => {
  const { data } = await API.patch<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${routineId}/exercises/${exerciseId}/video-url`,
    { videoUrl },
  );

  return data.routine;
};

export const deleteExerciseVideo = async (
  routineId: string,
  exerciseId: string,
) => {
  const { data } = await API.delete<{ routine: TrainerRoutineDTO }>(
    `/trainer/routines/${routineId}/exercises/${exerciseId}/video`,
  );

  return data.routine;
};
