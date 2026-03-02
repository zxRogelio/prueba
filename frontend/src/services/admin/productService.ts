import { API } from "../../api/api";

export type ProductType = "Suplementación" | "Ropa";
export type ProductStatus = "Activo" | "Inactivo";

export type ProductImageDTO = {
  id: string;
  url: string;
  order: number;
};

export type ProductDTO = {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  price: number;
  stock: number;
  status: ProductStatus;

  imageUrl?: string | null;

  productType: ProductType;

  description?: string | null;
  features?: string[] | string | null;

  images?: ProductImageDTO[]; // ✅ NUEVO (galería)

  supplementFlavor?: string | null;
  supplementPresentation?: string | null;
  supplementServings?: string | null;

  apparelSize?: string | null;
  apparelColor?: string | null;
  apparelMaterial?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export async function getProducts() {
  const { data } = await API.get<ProductDTO[]>("/admin/products");
  return data;
}

// multipart/form-data (images opcionales)
export async function createProduct(form: FormData) {
  const { data } = await API.post<ProductDTO>("/admin/products", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateProduct(id: string, form: FormData) {
  const { data } = await API.put<ProductDTO>(`/admin/products/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteProduct(id: string) {
  await API.delete(`/admin/products/${id}`);
}

/** ✅ quitar una imagen existente */
export async function deleteProductImage(productId: string, imageId: string) {
  await API.delete(`/admin/products/${productId}/images/${imageId}`);
}

/** ✅ reordenar imágenes existentes */
export async function reorderProductImages(productId: string, order: string[]) {
  const { data } = await API.put<ProductImageDTO[]>(
    `/admin/products/${productId}/images/reorder`,
    { order }
  );
  return data;
}
