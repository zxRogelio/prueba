import { API } from "../../api/api";

export type ExerciseVideoType = "none" | "upload" | "youtube" | "external";

export type RoutineExercise = {
  id: string;
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
  videoType: ExerciseVideoType;
  hasVideo: boolean;
};

export type AdminRoutine = {
  id: string;
  trainerId: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  level: string;
  category: string;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  imageUrl?: string | null;
  status: string;
  trainerEmail?: string | null;
  trainer?: {
    id: string;
    email: string;
    role: string;
  };
  exercises?: RoutineExercise[];
  createdAt?: string;
  updatedAt?: string;
};

type AdminRoutinesResponse = {
  ok: boolean;
  routines: AdminRoutine[];
};

type AdminRoutineActionResponse = {
  ok: boolean;
  message?: string;
  routine?: AdminRoutine;
};

export async function getAdminRoutines(params?: {
  status?: string;
  search?: string;
  category?: string;
  level?: string;
}) {
  const response = await API.get<AdminRoutinesResponse>("/admin/routines", {
    params,
  });

  return response.data;
}

export async function approveAdminRoutine(id: string) {
  const response = await API.patch<AdminRoutineActionResponse>(
    `/admin/routines/${id}/approve`,
    {},
  );

  return response.data;
}

export async function rejectAdminRoutine(id: string) {
  const response = await API.patch<AdminRoutineActionResponse>(
    `/admin/routines/${id}/reject`,
    {},
  );

  return response.data;
}

export async function archiveAdminRoutine(id: string) {
  const response = await API.patch<AdminRoutineActionResponse>(
    `/admin/routines/${id}/archive`,
    {},
  );

  return response.data;
}
