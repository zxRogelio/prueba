import { API } from "../../api/api";

export type BrandDTO = {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getBrands() {
  const { data } = await API.get<BrandDTO[]>("/admin/brands");
  return data;
}

export async function createBrand(payload: { name: string; active?: boolean }) {
  const { data } = await API.post<BrandDTO>("/admin/brands", payload);
  return data;
}

export async function updateBrand(id: string, payload: { name: string; active?: boolean }) {
  const { data } = await API.put<BrandDTO>(`/admin/brands/${id}`, payload);
  return data;
}

export async function deleteBrand(id: string) {
  await API.delete(`/admin/brands/${id}`);
}
