import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export type RoutineExercise = {
  id: string;
  name: string;
  description?: string | null;
  dayNumber: number;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
  order: number;
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
  videoUrl?: string | null;
  videoType?: string;
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

export async function getClientRoutines(params?: {
  search?: string;
  category?: string;
  level?: string;
}) {
  const response = await axios.get(`${API_URL}/client/routines`, {
    ...authHeaders(),
    params,
  });

  return response.data;
}

export async function getClientRoutineById(id: string) {
  const response = await axios.get(
    `${API_URL}/client/routines/${id}`,
    authHeaders()
  );

  return response.data;
}