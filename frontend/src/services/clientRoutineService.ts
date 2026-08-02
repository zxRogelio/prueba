import { API } from "../api/api";

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

export type ClientRoutine = {
  id: string;
  trainerId?: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  category?: string;
  level?: string;
  durationWeeks?: number;
  daysPerWeek?: number;
  estimatedMinutes?: number;
  imageUrl?: string | null;
  status?: string;
  trainerEmail?: string | null;
  trainer?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  exercises?: RoutineExercise[];
  createdAt?: string;
  updatedAt?: string;
};

type ClientRoutinesResponse = {
  ok: boolean;
  routines: ClientRoutine[];
  activeSubscription?: unknown;
};

type ClientRoutineResponse = {
  ok: boolean;
  routine: ClientRoutine;
  activeSubscription?: unknown;
};

export async function getClientRoutines(params?: {
  search?: string;
  category?: string;
  level?: string;
}) {
  const response = await API.get<ClientRoutinesResponse>("/client/routines", {
    params,
  });

  return response.data;
}

export async function getClientRoutineById(id: string) {
  const response = await API.get<ClientRoutineResponse>(`/client/routines/${id}`);

  return response.data;
}
