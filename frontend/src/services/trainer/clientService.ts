import { API } from "../../api/api";

export interface TrainerClientDTO {
  id: string;
  clientId: string;
  trainerId: string;
  email: string;
  status: "active" | "inactive";
  notes?: string | null;
  assignedAt: string;
  isVerified: boolean;
  subscriptionStatus: string;
  activeRoutine: string;
}

export const getTrainerClients = async () => {
  const { data } = await API.get<{ clients: TrainerClientDTO[] }>(
    "/trainer/clients",
  );

  return data.clients;
};