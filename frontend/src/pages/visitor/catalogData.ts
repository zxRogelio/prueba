import { API } from "../../api/api";
import type { CartProduct } from "../../context/CartContext";

export type ProductSpecificationValue = string | number | string[];

export type Product = CartProduct & {
  brand?: string;
  category: string;
  featured: boolean;
  description: string;
  features: string[];
  specifications: Record<string, ProductSpecificationValue>;
  stock: number;
  status: string;
};

export type CatalogProductView = Product & {
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
  usage: string;
  badge?: string;
  gallery?: string[];
  createdAt?: string;
  similarityScore?: number;
};

type CatalogProductImageApi = {
  id?: number | string;
  url?: string | null;
  order?: number | string | null;
};

type CatalogProductApi = {
  id?: number | string;
  id_producto?: number | string;
  name?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  status?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  features?: string[] | string | null;
  images?: CatalogProductImageApi[];
  productType?: string | null;
  supplementFlavor?: string | null;
  supplementPresentation?: string | null;
  supplementServings?: string | null;
  apparelSize?: string | null;
  apparelColor?: string | null;
  apparelMaterial?: string | null;
  createdAt?: string;
  categoryName?: string | null;
  brandName?: string | null;
  score_similitud?: number | string | null;
  Category?: { name?: string | null } | null;
  Brand?: { name?: string | null } | null;
};

const FALLBACK_IMAGE =
  "https://via.placeholder.com/1200x1200/f4f4f5/18181b?text=Titanium";
const NEW_PRODUCT_WINDOW_DAYS = 45;
const VISITOR_ID_STORAGE_KEY = "titaniumVisitorId";
const PRODUCT_VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;
const PRODUCT_VIEW_VISITOR_ID_MAX_LENGTH = 160;

export const catalogSortOptions = [
  "RECOMENDADO",
  "PRECIO: MENOR A MAYOR",
  "PRECIO: MAYOR A MENOR",
  "MAS POPULARES",
  "MAS NUEVOS",
];

function normalizeStringArray(raw: string[] | string | null | undefined) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeCategoryLabel(value?: string | null) {
  return String(value || "PRODUCTOS").trim().toUpperCase();
}

function getSortedGallery(product: CatalogProductApi) {
  const images = Array.isArray(product.images) ? [...product.images] : [];

  images.sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0));

  const uniqueUrls = new Set<string>();
  const gallery = [product.imageUrl, ...images.map((image) => image.url)]
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .filter((url) => {
      if (uniqueUrls.has(url)) return false;
      uniqueUrls.add(url);
      return true;
    });

  return gallery.length ? gallery : [FALLBACK_IMAGE];
}

function isNewProduct(createdAt?: string) {
  if (!createdAt) return false;

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;

  const diffInDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
  return diffInDays <= NEW_PRODUCT_WINDOW_DAYS;
}

function getProductRating(productId: string | number, inStock: boolean) {
  const numericId = Number(productId) || 0;
  if (!inStock) return 4;
  return Math.max(4, 5 - (numericId % 2));
}

function getProductReviewCount(productId: string | number) {
  const numericId = Number(productId) || 1;
  return 12 + numericId * 3;
}

function getProductSku(category: string, productId: string | number) {
  const prefix =
    category.replace(/[^A-Z0-9]/g, "").slice(0, 3) || "PRD";

  return `TH-${prefix}-${String(productId).padStart(4, "0")}`;
}

function getProductUsage(product: CatalogProductApi, category: string) {
  const productType = String(product.productType || "").toLowerCase();

  if (productType.includes("ropa") || category === "ROPA") {
    return "Usalo en entrenamiento, cardio o como parte de tu look Titanium antes y despues de cada sesion.";
  }

  return "Consulta la etiqueta del fabricante y ajusta el consumo segun tu rutina, objetivos y tolerancia personal.";
}

function buildFallbackFeatures(product: CatalogProductApi) {
  return [
    product.supplementPresentation
      ? `Presentacion: ${product.supplementPresentation}`
      : null,
    product.supplementFlavor ? `Sabor: ${product.supplementFlavor}` : null,
    product.supplementServings
      ? `Porciones: ${product.supplementServings}`
      : null,
    product.apparelSize ? `Talla: ${product.apparelSize}` : null,
    product.apparelColor ? `Color: ${product.apparelColor}` : null,
    product.apparelMaterial ? `Material: ${product.apparelMaterial}` : null,
  ].filter((item): item is string => Boolean(item));
}

function buildSpecifications(product: CatalogProductApi, inStock: boolean) {
  const specifications: Record<string, ProductSpecificationValue> = {};
  const brandName = product.brandName || product.Brand?.name || "";

  if (brandName) specifications.marca = brandName;
  if (product.productType) specifications.tipo = product.productType;
  if (product.supplementPresentation) {
    specifications.presentacion = product.supplementPresentation;
  }
  if (product.supplementFlavor) specifications.sabor = product.supplementFlavor;
  if (product.supplementServings) {
    specifications.porciones = product.supplementServings;
  }
  if (product.apparelSize) specifications.talla = product.apparelSize;
  if (product.apparelColor) specifications.color = product.apparelColor;
  if (product.apparelMaterial) specifications.material = product.apparelMaterial;

  specifications.disponibilidad = inStock ? "En stock" : "Agotado";

  return specifications;
}

export function mapCatalogProduct(product: CatalogProductApi): CatalogProductView {
  const id = String(product.id_producto ?? product.id ?? "");
  const price = Number(product.price ?? 0);
  const stock = Number(product.stock ?? 0);
  const inStock = stock > 0 && String(product.status || "Activo") !== "Inactivo";
  const category = normalizeCategoryLabel(
    product.categoryName || product.Category?.name || product.productType
  );
  const gallery = getSortedGallery(product);
  const features =
    normalizeStringArray(product.features).length > 0
      ? normalizeStringArray(product.features)
      : buildFallbackFeatures(product);
  const isRecentlyAdded = isNewProduct(product.createdAt);

  return {
    id,
    name: String(product.name || "Producto"),
    brand: product.brandName || product.Brand?.name || undefined,
    category,
    price,
    image: gallery[0],
    featured: inStock,
    description:
      String(product.description || "").trim() ||
      "Producto disponible en Titanium Shop.",
    features,
    specifications: buildSpecifications(product, inStock),
    stock,
    status: String(product.status || "Activo"),
    rating: getProductRating(id, inStock),
    reviewCount: getProductReviewCount(id),
    inStock,
    sku: getProductSku(category, id),
    usage: getProductUsage(product, category),
    badge: !inStock ? "Agotado" : isRecentlyAdded ? "Nuevo" : undefined,
    gallery,
    createdAt: product.createdAt,
    similarityScore:
      product.score_similitud != null
        ? Number(product.score_similitud)
        : undefined,
  };
}

export async function fetchCatalogProducts() {
  const { data } = await API.get<CatalogProductApi[]>("/products");
  return Array.isArray(data) ? data.map(mapCatalogProduct) : [];
}

export async function fetchCatalogProductById(productId: string | number) {
  const { data } = await API.get<CatalogProductApi>(`/products/${productId}`);
  return mapCatalogProduct(data);
}

export async function fetchCatalogProductRecommendations(
  productId: string | number,
  limit = 4,
) {
  const { data } = await API.get<CatalogProductApi[]>(
    `/products/${productId}/recommendations`,
    { params: { limit } },
  );

  return Array.isArray(data) ? data.map(mapCatalogProduct) : [];
}

export async function fetchCartProductRecommendations(
  productIds: Array<string | number>,
  limit = 2,
) {
  const { data } = await API.post<CatalogProductApi[]>("/products/recommendations", {
    productIds,
    limit,
  });

  return Array.isArray(data) ? data.map(mapCatalogProduct) : [];
}

function makeVisitorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `visitor_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function getOrCreateVisitorId() {
  const fallbackId = makeVisitorId();

  if (typeof window === "undefined") {
    return fallbackId;
  }

  try {
    const existing = window.localStorage
      .getItem(VISITOR_ID_STORAGE_KEY)
      ?.trim();

    if (existing && existing.length <= PRODUCT_VIEW_VISITOR_ID_MAX_LENGTH) {
      return existing;
    }

    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, fallbackId);
    return fallbackId;
  } catch {
    return fallbackId;
  }
}

function getLastProductViewAt(productId: string) {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(`productView:${productId}`);
    const timestamp = Number(rawValue);

    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function setLastProductViewAt(productId: string, timestamp: number) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`productView:${productId}`, String(timestamp));
  } catch {
    // No registrar en sessionStorage no debe romper el detalle publico.
  }
}

function clearLastProductViewAt(productId: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(`productView:${productId}`);
  } catch {
    // No hay nada que recuperar si el navegador bloquea sessionStorage.
  }
}

export async function registerProductView(productId: string | number) {
  const normalizedProductId = String(productId).trim();
  const numericProductId = Number(normalizedProductId);

  if (
    !normalizedProductId ||
    !Number.isSafeInteger(numericProductId) ||
    numericProductId <= 0
  ) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  const lastViewAt = getLastProductViewAt(normalizedProductId);

  if (
    lastViewAt != null &&
    now - lastViewAt < PRODUCT_VIEW_DEDUP_WINDOW_MS
  ) {
    return;
  }

  setLastProductViewAt(normalizedProductId, now);

  try {
    await API.post("/behavior-events/product-view", {
      productId: numericProductId,
      visitorId: getOrCreateVisitorId(),
      path: window.location.pathname,
    });
  } catch (error) {
    clearLastProductViewAt(normalizedProductId);
    console.warn("registerProductView error:", error);
  }
}

export function buildCatalogCategories(products: CatalogProductView[]) {
  const uniqueCategories = Array.from(
    new Set(products.map((product) => product.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "es"));

  return ["TODOS", ...uniqueCategories];
}

export function getCatalogProductPath(productId: string | number) {
  return `/catalogue/${productId}`;
}
