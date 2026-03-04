import { API } from "../../api/api";

export type CategoryDTO = {
  id: string; // id_categoria como string
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryApi = {
  id_categoria?: number | string;
  id?: number | string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const mapCategory = (c: CategoryApi): CategoryDTO => ({
  id: String(c.id_categoria ?? c.id ?? ""),
  name: c.name,
  active: Boolean(c.active),
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export async function getCategories() {
  const { data } = await API.get<CategoryApi[]>("/admin/categories");
  return data.map(mapCategory);
}

export async function createCategory(payload: { name: string; active?: boolean }) {
  const { data } = await API.post<CategoryApi>("/admin/categories", payload);
  return mapCategory(data);
}

export async function updateCategory(id: string, payload: { name: string; active?: boolean }) {
  const { data } = await API.put<CategoryApi>(`/admin/categories/${id}`, payload);
  return mapCategory(data);
}

export async function deleteCategory(id: string) {
  await API.delete(`/admin/categories/${id}`);
}