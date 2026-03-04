/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../../api/api";

export type ProductType = "Suplementación" | "Ropa";
export type ProductStatus = "Activo" | "Inactivo";

export type ProductImageDTO = {
  id: string;
  url: string;
  order: number;
};

export type ProductDTO = {
  id: string; // id_producto como string
  name: string;
  brandId: string;     // id_marca
  categoryId: string;  // id_categoria
  price: number;
  stock: number;
  status: ProductStatus;

  imageUrl?: string | null;
  productType: ProductType;

  description?: string | null;
  features?: string[] | string | null;

  images?: ProductImageDTO[];

  supplementFlavor?: string | null;
  supplementPresentation?: string | null;
  supplementServings?: string | null;

  apparelSize?: string | null;
  apparelColor?: string | null;
  apparelMaterial?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type ProductApi = any;

const mapProduct = (p: ProductApi): ProductDTO => ({
  id: String(p.id_producto ?? p.id ?? ""),
  name: p.name,
  brandId: String(p.brandId ?? ""),
  categoryId: String(p.categoryId ?? ""),
  price: Number(p.price ?? 0),
  stock: Number(p.stock ?? 0),
  status: p.status,
  imageUrl: p.imageUrl ?? null,
  productType: p.productType,
  description: p.description ?? null,
  features: p.features ?? [],
  images: Array.isArray(p.images)
    ? p.images.map((img: any) => ({
        id: String(img.id),
        url: img.url,
        order: Number(img.order ?? 0),
      }))
    : [],
  supplementFlavor: p.supplementFlavor ?? null,
  supplementPresentation: p.supplementPresentation ?? null,
  supplementServings: p.supplementServings ?? null,
  apparelSize: p.apparelSize ?? null,
  apparelColor: p.apparelColor ?? null,
  apparelMaterial: p.apparelMaterial ?? null,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export async function getProducts() {
  const { data } = await API.get<ProductApi[]>("/admin/products");
  return data.map(mapProduct);
}

export async function createProduct(form: FormData) {
  const { data } = await API.post<ProductApi>("/admin/products", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapProduct(data);
}

export async function updateProduct(id: string, form: FormData) {
  const { data } = await API.put<ProductApi>(`/admin/products/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapProduct(data);
}

export async function deleteProduct(id: string) {
  await API.delete(`/admin/products/${id}`);
}

export async function deleteProductImage(productId: string, imageId: string) {
  await API.delete(`/admin/products/${productId}/images/${imageId}`);
}

export async function reorderProductImages(productId: string, order: string[]) {
  const { data } = await API.put<ProductImageDTO[]>(
    `/admin/products/${productId}/images/reorder`,
    { order }
  );
  return data;
}