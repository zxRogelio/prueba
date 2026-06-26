import { API } from "../../api/api";

export type AgendaMode = "presencial" | "online" | "seguimiento" | "evaluacion";
export type AgendaStatus = "scheduled" | "completed" | "cancelled";

export interface TrainerAgendaItemDTO {
  id: string;
  trainerId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  mode: AgendaMode;
  location?: string | null;
  status: AgendaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaPayload {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  mode: AgendaMode;
  location: string;
  status: AgendaStatus;
}

export const getTrainerAgenda = async () => {
  const { data } = await API.get<{ items: TrainerAgendaItemDTO[] }>(
    "/trainer/agenda",
  );

  return data.items;
};

export const createTrainerAgendaItem = async (payload: AgendaPayload) => {
  const { data } = await API.post<{ item: TrainerAgendaItemDTO }>(
    "/trainer/agenda",
    payload,
  );

  return data.item;
};

export const updateTrainerAgendaItem = async (
  id: string,
  payload: AgendaPayload,
) => {
  const { data } = await API.put<{ item: TrainerAgendaItemDTO }>(
    `/trainer/agenda/${id}`,
    payload,
  );

  return data.item;
};

export const deleteTrainerAgendaItem = async (id: string) => {
  await API.delete(`/trainer/agenda/${id}`);
};