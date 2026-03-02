import { API } from "../../api/api";

export type CategoryDTO = {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getCategories() {
  const { data } = await API.get<CategoryDTO[]>("/admin/categories");
  return data;
}

export async function createCategory(payload: { name: string; active?: boolean }) {
  const { data } = await API.post<CategoryDTO>("/admin/categories", payload);
  return data;
}

export async function updateCategory(id: string, payload: { name: string; active?: boolean }) {
  const { data } = await API.put<CategoryDTO>(`/admin/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: string) {
  await API.delete(`/admin/categories/${id}`);
}
