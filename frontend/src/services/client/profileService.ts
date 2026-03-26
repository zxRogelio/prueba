/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../../api/api";

export type GenderOption = "" | "male" | "female" | "other";
export type FitnessGoalOption = "" | "lose" | "maintain" | "gain";
export type ActivityLevelOption =
  | ""
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type UserProfileDTO = {
  id: string;
  userId: string;
  age: number | null;
  gender: GenderOption;
  height: number | null;
  initialWeight: number | null;
  targetWeight: number | null;
  startDate: string | null;
  weeklyGymDays: number | null;
  activityLevel: ActivityLevelOption;
  fitnessGoal: FitnessGoalOption;
  createdAt?: string;
  updatedAt?: string;
};

export type WeightRecordDTO = {
  id: string;
  userId: string;
  recordDate: string;
  weight: number;
  nextAllowedDate: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CalorieRecordDTO = {
  id: string;
  userId: string;
  recordDate: string;
  dailyCalories: number;
  nextAllowedDate: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileDashboardDTO = {
  ok: boolean;
  profile: UserProfileDTO | null;
  latestWeight: WeightRecordDTO | null;
  latestCalories: CalorieRecordDTO | null;
  weightHistory: WeightRecordDTO[];
  calorieHistory: CalorieRecordDTO[];
  canRegisterWeight: boolean;
  nextWeightAllowedDate: string | null;
  canRegisterCalories: boolean;
  nextCaloriesAllowedDate: string | null;
};

export type UpdateProfilePayload = {
  age?: number | null;
  gender?: GenderOption;
  height?: number | null;
  initialWeight?: number | null;
  targetWeight?: number | null;
  startDate?: string | null;
  weeklyGymDays?: number | null;
  activityLevel?: ActivityLevelOption;
  fitnessGoal?: FitnessGoalOption;
};

export type CreateWeightPayload = {
  weight: number;
};

export type CreateCaloriePayload = {
  dailyCalories: number;
};

type ProfileApi = any;

const toNumberOrNull = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const mapUserProfile = (p: ProfileApi): UserProfileDTO => ({
  id: String(p?.id ?? ""),
  userId: String(p?.userId ?? ""),
  age: toNumberOrNull(p?.age),
  gender: (p?.gender ?? "") as GenderOption,
  height: toNumberOrNull(p?.height),
  initialWeight: toNumberOrNull(p?.initialWeight),
  targetWeight: toNumberOrNull(p?.targetWeight),
  startDate: p?.startDate ?? null,
  weeklyGymDays: toNumberOrNull(p?.weeklyGymDays),
  activityLevel: (p?.activityLevel ?? "") as ActivityLevelOption,
  fitnessGoal: (p?.fitnessGoal ?? "") as FitnessGoalOption,
  createdAt: p?.createdAt,
  updatedAt: p?.updatedAt,
});

const mapWeightRecord = (p: ProfileApi): WeightRecordDTO => ({
  id: String(p?.id ?? ""),
  userId: String(p?.userId ?? ""),
  recordDate: p?.recordDate ?? "",
  weight: Number(p?.weight ?? 0),
  nextAllowedDate: p?.nextAllowedDate ?? null,
  createdAt: p?.createdAt,
  updatedAt: p?.updatedAt,
});

const mapCalorieRecord = (p: ProfileApi): CalorieRecordDTO => ({
  id: String(p?.id ?? ""),
  userId: String(p?.userId ?? ""),
  recordDate: p?.recordDate ?? "",
  dailyCalories: Number(p?.dailyCalories ?? 0),
  nextAllowedDate: p?.nextAllowedDate ?? null,
  createdAt: p?.createdAt,
  updatedAt: p?.updatedAt,
});

export async function getMyProfileDashboard(): Promise<ProfileDashboardDTO> {
  const { data } = await API.get<ProfileApi>("/profile/me");

  return {
    ok: Boolean(data?.ok),
    profile: data?.profile ? mapUserProfile(data.profile) : null,
    latestWeight: data?.latestWeight ? mapWeightRecord(data.latestWeight) : null,
    latestCalories: data?.latestCalories
      ? mapCalorieRecord(data.latestCalories)
      : null,
    weightHistory: Array.isArray(data?.weightHistory)
      ? data.weightHistory.map(mapWeightRecord)
      : [],
    calorieHistory: Array.isArray(data?.calorieHistory)
      ? data.calorieHistory.map(mapCalorieRecord)
      : [],
    canRegisterWeight: Boolean(data?.canRegisterWeight),
    nextWeightAllowedDate: data?.nextWeightAllowedDate ?? null,
    canRegisterCalories: Boolean(data?.canRegisterCalories),
    nextCaloriesAllowedDate: data?.nextCaloriesAllowedDate ?? null,
  };
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const { data } = await API.put("/profile/me", payload);
  return data;
}

export async function getMyWeightHistory() {
  const { data } = await API.get<ProfileApi>("/profile/me/weights");

  return {
    ok: Boolean(data?.ok),
    records: Array.isArray(data?.records)
      ? data.records.map(mapWeightRecord)
      : [],
    latestRecord: data?.latestRecord ? mapWeightRecord(data.latestRecord) : null,
    canRegister: Boolean(data?.canRegister),
    nextAllowedDate: data?.nextAllowedDate ?? null,
  };
}

export async function createWeeklyWeight(payload: CreateWeightPayload) {
  const { data } = await API.post("/profile/me/weights", payload);
  return data;
}

export async function deleteLatestWeight(recordId: string) {
  const { data } = await API.delete(`/profile/me/weights/${recordId}`);
  return data;
}

export async function getMyCalorieHistory() {
  const { data } = await API.get<ProfileApi>("/profile/me/calories");

  return {
    ok: Boolean(data?.ok),
    records: Array.isArray(data?.records)
      ? data.records.map(mapCalorieRecord)
      : [],
    latestRecord: data?.latestRecord
      ? mapCalorieRecord(data.latestRecord)
      : null,
    canRegister: Boolean(data?.canRegister),
    nextAllowedDate: data?.nextAllowedDate ?? null,
  };
}

export async function createWeeklyCalories(payload: CreateCaloriePayload) {
  const { data } = await API.post("/profile/me/calories", payload);
  return data;
}