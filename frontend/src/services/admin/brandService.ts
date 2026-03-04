import { API } from "../../api/api";

export type BrandDTO = {
  id: string; // id_marca como string para UI
  name: string;
  active: boolean;
  categoryId: string; // id_categoria como string
  createdAt?: string;
  updatedAt?: string;
};

// respuesta posible del backend
type BrandApi = {
  id_marca?: number | string;
  id?: number | string;
  name: string;
  active: boolean;
  categoryId: number | string | null;
  createdAt?: string;
  updatedAt?: string;
};

const mapBrand = (b: BrandApi): BrandDTO => ({
  id: String(b.id_marca ?? b.id ?? ""),
  name: b.name,
  active: Boolean(b.active),
  categoryId: b.categoryId == null ? "" : String(b.categoryId),
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

export async function getBrands(categoryId?: string) {
  const { data } = await API.get<BrandApi[]>("/admin/brands", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data.map(mapBrand);
}

export async function createBrand(payload: { name: string; active?: boolean; categoryId: string }) {
  const { data } = await API.post<BrandApi>("/admin/brands", payload);
  return mapBrand(data);
}

export async function updateBrand(
  id: string,
  payload: { name?: string; active?: boolean; categoryId?: string }
) {
  const { data } = await API.put<BrandApi>(`/admin/brands/${id}`, payload);
  return mapBrand(data);
}

export async function deleteBrand(id: string) {
  await API.delete(`/admin/brands/${id}`);
}