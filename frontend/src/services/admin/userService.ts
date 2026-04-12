import { API } from "../../api/api";

export type AdminUserDTO = {
  id: string;
  email: string;
  role: "cliente" | "entrenador";
  isVerified: boolean;
  mustChangePassword: boolean;
  lastIpAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type AdminUserApi = {
  id?: string;
  email?: string;
  role?: "cliente" | "entrenador";
  isVerified?: boolean;
  mustChangePassword?: boolean;
  lastIpAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type AdminUsersResponse = {
  users?: AdminUserApi[];
};

const mapAdminUser = (user: AdminUserApi): AdminUserDTO => ({
  id: String(user.id ?? ""),
  email: String(user.email ?? ""),
  role: user.role === "entrenador" ? "entrenador" : "cliente",
  isVerified: Boolean(user.isVerified),
  mustChangePassword: Boolean(user.mustChangePassword),
  lastIpAddress: user.lastIpAddress ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export async function getAdminUsers() {
  const { data } = await API.get<AdminUsersResponse>("/admin/users");
  return (data.users ?? []).map(mapAdminUser);
}
