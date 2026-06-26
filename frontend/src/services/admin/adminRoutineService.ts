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
  videoUrl?: string | null;
  videoType?: string;
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

export async function getAdminRoutines(params?: {
  status?: string;
  search?: string;
  category?: string;
  level?: string;
}) {
  const response = await axios.get(`${API_URL}/admin/routines`, {
    ...authHeaders(),
    params,
  });

  return response.data;
}

export async function approveAdminRoutine(id: string) {
  const response = await axios.patch(
    `${API_URL}/admin/routines/${id}/approve`,
    {},
    authHeaders()
  );

  return response.data;
}

export async function rejectAdminRoutine(id: string) {
  const response = await axios.patch(
    `${API_URL}/admin/routines/${id}/reject`,
    {},
    authHeaders()
  );

  return response.data;
}

export async function archiveAdminRoutine(id: string) {
  const response = await axios.patch(
    `${API_URL}/admin/routines/${id}/archive`,
    {},
    authHeaders()
  );

  return response.data;
}