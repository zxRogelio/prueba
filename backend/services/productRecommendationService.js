import { Op } from "sequelize";
import { Brand, Category, Product, ProductImage } from "../models/index.js";

const ML_API_URL = (process.env.ML_RECOMMENDATION_API_URL || "http://localhost:5050")
  .replace(/\/+$/, "");

const productIncludes = [
  { model: Brand, attributes: ["id_marca", "name"] },
  { model: Category, attributes: ["id_categoria", "name"] },
  {
    model: ProductImage,
    as: "images",
    attributes: ["id", "url", "order"],
    where: { active: true },
    required: false,
  },
];

const parseJsonArray = (raw) => {
  if (Array.isArray(raw)) {
    return raw.filter((item) => typeof item === "string");
  }

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const serializeProduct = (product, score) => {
  const json = product?.toJSON ? product.toJSON() : product;
  const images = Array.isArray(json.images) ? [...json.images] : [];

  images.sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0));

  return {
    ...json,
    features: parseJsonArray(json.features),
    images,
    imageUrl: json.imageUrl || (images[0]?.url ?? null),
    brandName: json.Brand?.name ?? null,
    categoryName: json.Category?.name ?? null,
    score_similitud: Number(score ?? 0),
  };
};

const parseLimit = (value, fallback = 4) => {
  const limit = Number(value ?? fallback);
  if (!Number.isInteger(limit) || limit < 1) return fallback;
  return Math.min(limit, 12);
};

const statusFromMlResponse = (response) => {
  if (response.status === 404) return 404;
  if (response.status >= 400 && response.status < 500) return 400;
  return 502;
};

const callMlApi = async (path, options = {}) => {
  const response = await fetch(`${ML_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      payload?.error || "Error consultando API Flask de recomendaciones"
    );
    error.statusCode = statusFromMlResponse(response);
    throw error;
  }

  return payload;
};

const hydrateRecommendations = async (mlRecommendations) => {
  const ids = mlRecommendations
    .map((recommendation) => Number(recommendation.id_producto))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!ids.length) return [];

  const products = await Product.findAll({
    where: {
      id_producto: { [Op.in]: ids },
      status: "Activo",
    },
    include: productIncludes,
  });

  const productsById = new Map(
    products.map((product) => [Number(product.id_producto), product])
  );

  return mlRecommendations
    .map((recommendation) => {
      const product = productsById.get(Number(recommendation.id_producto));
      if (!product) return null;
      return serializeProduct(product, Number(recommendation.score_similitud ?? 0));
    })
    .filter(Boolean);
};

export const getProductRecommendations = async ({
  productId,
  limit,
  sameType = true,
} = {}) => {
  const id_producto = Number(productId);

  if (!Number.isInteger(id_producto) || id_producto <= 0) {
    const error = new Error("Id de producto invalido");
    error.statusCode = 400;
    throw error;
  }

  const requestedLimit = parseLimit(limit, 4);
  const searchParams = new URLSearchParams({
    limit: String(requestedLimit),
    sameType: String(Boolean(sameType)),
  });
  const payload = await callMlApi(
    `/recommendations/product/${id_producto}?${searchParams.toString()}`
  );

  return hydrateRecommendations(payload.recommendations || []);
};

export const getCartProductRecommendations = async ({
  productIds,
  limit,
  sameType = true,
} = {}) => {
  const ids = Array.from(
    new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((productId) => Number(productId))
        .filter((productId) => Number.isInteger(productId) && productId > 0)
    )
  );

  if (!ids.length) return [];

  const payload = await callMlApi("/recommendations/cart", {
    method: "POST",
    body: JSON.stringify({
      productIds: ids,
      limit: parseLimit(limit, 2),
      sameType: Boolean(sameType),
    }),
  });

  return hydrateRecommendations(payload.recommendations || []);
};
