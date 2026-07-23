import { Brand, Category, Product, ProductImage } from "../models/index.js";

const STOP_WORDS = new Set([
  "a",
  "al",
  "algo",
  "ante",
  "con",
  "como",
  "de",
  "del",
  "desde",
  "durante",
  "e",
  "el",
  "ella",
  "en",
  "entre",
  "es",
  "esta",
  "este",
  "esto",
  "ideal",
  "la",
  "las",
  "lo",
  "los",
  "mas",
  "mejor",
  "para",
  "por",
  "que",
  "se",
  "sin",
  "su",
  "sus",
  "un",
  "una",
  "unas",
  "unos",
  "y",
]);

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

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const cleanToken = (token) => token.trim();

const tokenize = (text) => {
  const baseTokens = normalizeText(text)
    .match(/[a-z0-9]+(?:\.[0-9]+)?/g);

  const tokens = (baseTokens || [])
    .map(cleanToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  const bigrams = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return [...tokens, ...bigrams];
};

const termCounts = (text) => {
  const counts = new Map();

  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return counts;
};

const repeat = (value, times) => Array.from({ length: times }, () => value);

const joinText = (...values) =>
  values
    .flat()
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

const buildRecommendationText = (product) => {
  const json = product?.toJSON ? product.toJSON() : product;
  const features = parseJsonArray(json.features).join(" ");

  return joinText(
    repeat(json.name, 3),
    repeat(json.productType, 3),
    repeat(json.Category?.name, 3),
    repeat(json.Brand?.name, 2),
    json.price,
    json.description,
    features,
    json.supplementFlavor,
    json.supplementPresentation,
    json.supplementServings,
    json.apparelSize,
    json.apparelColor,
    json.apparelMaterial
  );
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
    score_similitud: Number(score.toFixed(6)),
  };
};

const buildTfIdf = (documents) => {
  const countsByDocument = documents.map(termCounts);
  const documentFrequency = new Map();

  for (const counts of countsByDocument) {
    for (const term of counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  const totalDocuments = documents.length;

  return countsByDocument.map((counts) => {
    const vector = new Map();
    let norm = 0;

    for (const [term, count] of counts.entries()) {
      const idf = Math.log((totalDocuments + 1) / ((documentFrequency.get(term) || 0) + 1)) + 1;
      const weight = count * idf;
      vector.set(term, weight);
      norm += weight * weight;
    }

    return {
      vector,
      norm: Math.sqrt(norm),
    };
  });
};

const cosineScore = (left, right) => {
  if (!left.norm || !right.norm) return 0;

  let dot = 0;
  const [smaller, larger] =
    left.vector.size <= right.vector.size
      ? [left.vector, right.vector]
      : [right.vector, left.vector];

  for (const [term, weight] of smaller.entries()) {
    const otherWeight = larger.get(term);
    if (otherWeight) dot += weight * otherWeight;
  }

  return dot / (left.norm * right.norm);
};

const parseLimit = (value) => {
  const limit = Number(value ?? 4);
  if (!Number.isInteger(limit) || limit < 1) return 4;
  return Math.min(limit, 12);
};

const fetchActiveProducts = () =>
  Product.findAll({
    where: { status: "Activo" },
    include: productIncludes,
    order: [["id_producto", "ASC"]],
  });

const buildRecommendationModel = (products) => {
  const documents = products.map(buildRecommendationText);
  const vectors = buildTfIdf(documents);

  return { vectors };
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

  const products = await fetchActiveProducts();

  const baseIndex = products.findIndex(
    (product) => Number(product.id_producto) === id_producto
  );

  if (baseIndex === -1) {
    const error = new Error("Producto no encontrado");
    error.statusCode = 404;
    throw error;
  }

  const requestedLimit = parseLimit(limit);
  const baseProduct = products[baseIndex];
  const { vectors } = buildRecommendationModel(products);

  const candidates = products
    .map((product, index) => ({
      product,
      score: index === baseIndex ? -1 : cosineScore(vectors[baseIndex], vectors[index]),
    }))
    .filter(({ product, score }) => {
      if (score < 0) return false;
      if (!sameType) return true;
      return product.productType === baseProduct.productType;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, requestedLimit);

  const fallbackCandidates =
    candidates.length >= requestedLimit || !sameType
      ? []
      : products
          .map((product, index) => ({
            product,
            score:
              index === baseIndex ? -1 : cosineScore(vectors[baseIndex], vectors[index]),
          }))
          .filter(
            ({ product, score }) =>
              score >= 0 &&
              product.productType !== baseProduct.productType &&
              !candidates.some(
                (candidate) =>
                  candidate.product.id_producto === product.id_producto
              )
          )
          .sort((left, right) => right.score - left.score)
          .slice(0, requestedLimit - candidates.length);

  return [...candidates, ...fallbackCandidates].map(({ product, score }) =>
    serializeProduct(product, score)
  );
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

  const requestedLimit = parseLimit(limit);
  const products = await fetchActiveProducts();
  const baseIndexes = products
    .map((product, index) =>
      ids.includes(Number(product.id_producto)) ? index : -1
    )
    .filter((index) => index >= 0);

  if (!baseIndexes.length) return [];

  const baseProductIds = new Set(
    baseIndexes.map((index) => Number(products[index].id_producto))
  );
  const baseProductTypes = new Set(
    baseIndexes.map((index) => products[index].productType).filter(Boolean)
  );
  const { vectors } = buildRecommendationModel(products);

  return products
    .map((product, index) => {
      if (baseProductIds.has(Number(product.id_producto))) {
        return { product, score: -1 };
      }

      const scores = baseIndexes.map((baseIndex) =>
        cosineScore(vectors[baseIndex], vectors[index])
      );
      const score =
        scores.reduce((total, current) => total + current, 0) / scores.length;

      return { product, score };
    })
    .filter(({ product, score }) => {
      if (score <= 0) return false;
      if (!sameType) return true;
      return baseProductTypes.has(product.productType);
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, requestedLimit)
    .map(({ product, score }) => serializeProduct(product, score));
};
