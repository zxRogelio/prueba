/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../api/api";

export type ProductType = "Suplementación" | "Accesorios" | "Ropa";
export type ProductStatus = "Activo" | "Inactivo";

export type ProductImageDTO = {
  id: string;
  url: string;
  order: number;
};

export type CatalogProductDTO = {
  id: string; // id_producto como string
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

  images?: ProductImageDTO[];

  supplementFlavor?: string | null;
  supplementPresentation?: string | null;
  supplementServings?: string | null;

  apparelSize?: string | null;
  apparelColor?: string | null;
  apparelMaterial?: string | null;

  brandName?: string | null;
  categoryName?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type ProductApi = any;

const parseFeatures = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const mapCatalogProduct = (p: ProductApi): CatalogProductDTO => ({
  id: String(p.id_producto ?? p.id ?? ""),
  name: p.name ?? "",
  brandId: String(p.brandId ?? ""),
  categoryId: String(p.categoryId ?? ""),
  price: Number(p.price ?? 0),
  stock: Number(p.stock ?? 0),
  status: p.status ?? "Activo",

  imageUrl:
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length > 0 ? p.images[0]?.url : null) ??
    null,

  productType: p.productType ?? "Ropa",
  description: p.description ?? null,
  features: parseFeatures(p.features),

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

  brandName: p.Brand?.name ?? p.brandName ?? null,
  categoryName: p.Category?.name ?? p.categoryName ?? null,

  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export async function getCatalogProducts() {
  const { data } = await API.get<ProductApi[]>("/catalog/products");
  return data.map(mapCatalogProduct);
}

export async function getCatalogProductById(id: string) {
  const { data } = await API.get<ProductApi>(`/catalog/products/${id}`);
  return mapCatalogProduct(data);
}
