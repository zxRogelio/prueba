import { buildSalesPredictionFeatures } from "./salesPredictionDataService.js";

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_CACHE_MS = 600000;

let predictionCache = {
  data: null,
  expiresAt: 0,
};

export class SalesPredictionServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "SalesPredictionServiceError";
    this.statusCode = statusCode;
  }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function buildPredictUrl(baseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return null;
  return `${normalizedBaseUrl}/predict`;
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mlErrorMessage(responseStatus, body) {
  const remoteMessage = body?.error ? ` Detalle: ${body.error}` : "";

  if (responseStatus === 400) {
    return `El microservicio rechazo las variables calculadas.${remoteMessage}`;
  }

  if (responseStatus === 401 || responseStatus === 403) {
    return "La clave interna del microservicio de prediccion no es valida.";
  }

  if (responseStatus >= 500) {
    return "El microservicio de prediccion no esta disponible temporalmente.";
  }

  return `El microservicio de prediccion respondio con estado ${responseStatus}.${remoteMessage}`;
}

async function requestMlPredictions(records) {
  const predictUrl = buildPredictUrl(process.env.SALES_ML_URL);
  const apiKey = process.env.SALES_ML_API_KEY;

  if (!predictUrl || !apiKey) {
    throw new SalesPredictionServiceError(
      "Faltan SALES_ML_URL o SALES_ML_API_KEY en el backend.",
      503
    );
  }

  const timeoutMs = parsePositiveInteger(process.env.SALES_ML_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(predictUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ML-API-Key": apiKey,
      },
      body: JSON.stringify({ records }),
      signal: controller.signal,
    });

    const body = await readJsonSafely(response);
    if (!response.ok) {
      const statusCode = response.status >= 500 || response.status === 401 ? 503 : 502;
      throw new SalesPredictionServiceError(
        mlErrorMessage(response.status, body),
        statusCode
      );
    }

    if (!Array.isArray(body?.predictions)) {
      throw new SalesPredictionServiceError(
        "El microservicio devolvio una respuesta sin predicciones.",
        502
      );
    }

    return body;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new SalesPredictionServiceError(
        "El microservicio de prediccion excedio el tiempo de espera.",
        503
      );
    }

    if (error instanceof SalesPredictionServiceError) {
      throw error;
    }

    throw new SalesPredictionServiceError(
      "No fue posible conectar con el microservicio de prediccion.",
      503
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getDemandStatus(monthlyPrediction) {
  if (monthlyPrediction >= 18) return "Alta demanda";
  if (monthlyPrediction >= 10) return "Demanda media";
  return "Baja demanda";
}

function getRecommendedAction(monthlyPrediction, stock) {
  if (monthlyPrediction > stock) return "Reabastecer inventario";
  if (monthlyPrediction < stock * 0.35) return "Evaluar promocion";
  return "Mantener seguimiento";
}

function getTrendPercent(previousMonthSales, monthlyPrediction) {
  const previous = Number(previousMonthSales || 0);
  const prediction = Number(monthlyPrediction || 0);

  if (previous <= 0) {
    return prediction > 0 ? 100 : 0;
  }

  return Math.round(((prediction - previous) / previous) * 100);
}

function mapPredictionsToProducts({ data, mlResponse }) {
  const predictionsByProductId = new Map(
    mlResponse.predictions.map((prediction) => [String(prediction.productId), prediction])
  );

  return data.products.map((entry) => {
    const product = entry.product;
    const prediction = predictionsByProductId.get(String(product.productId));

    if (!prediction) {
      throw new SalesPredictionServiceError(
        `El microservicio no devolvio prediccion para producto ${product.productId}.`,
        502
      );
    }

    const monthlyPrediction = Math.max(0, Number(prediction.unidadesEstimadas || 0));
    const predictionDecimal = Math.max(0, Number(prediction.prediccionDecimal || 0));
    const ventasMesAnterior = Number(entry.modelRecord.ventas_mes_anterior || 0);

    return {
      id: product.productId,
      productPk: product.productPk,
      name: product.name,
      category: product.category,
      brand: product.brand,
      type: product.type,
      productType: product.productType,
      price: product.price,
      stock: product.stock,
      history: entry.salesHistory,
      viewsHistory: entry.viewsHistory,
      ventasMesAnterior,
      promedioVentas3Meses: entry.modelRecord.promedio_movil_ventas_3_meses,
      promedioVentas6Meses: entry.modelRecord.promedio_movil_ventas_6_meses,
      promedioVentas12Meses: entry.modelRecord.promedio_movil_ventas_12_meses,
      vistasMesAnterior: entry.modelRecord.vistas_producto_mes_anterior,
      promedioVistas3Meses: entry.modelRecord.promedio_movil_vistas_3_meses,
      monthlyPrediction,
      predictionDecimal,
      status: getDemandStatus(monthlyPrediction),
      stockRisk: monthlyPrediction > product.stock,
      action: getRecommendedAction(monthlyPrediction, product.stock),
      trendPercent: getTrendPercent(ventasMesAnterior, monthlyPrediction),
      insufficientHistory: entry.insufficientHistory,
      warnings: entry.warnings,
    };
  });
}

export function clearSalesPredictionCache() {
  predictionCache = {
    data: null,
    expiresAt: 0,
  };
}

export async function getSalesPredictions({ refresh = false, referenceDate = new Date() } = {}) {
  const now = Date.now();
  if (!refresh && predictionCache.data && predictionCache.expiresAt > now) {
    return {
      ...predictionCache.data,
      cache: {
        hit: true,
        expiresAt: new Date(predictionCache.expiresAt).toISOString(),
      },
    };
  }

  const data = await buildSalesPredictionFeatures(referenceDate);
  const modelRecords = data.products.map((entry) => entry.modelRecord);

  if (modelRecords.length === 0) {
    const emptyResponse = {
      predictionMonth: data.predictionMonth,
      cutoffMonth: data.cutoffMonth,
      generatedAt: new Date().toISOString(),
      model: null,
      modelVersion: null,
      products: [],
      cache: { hit: false, expiresAt: null },
    };
    predictionCache = { data: emptyResponse, expiresAt: now + DEFAULT_CACHE_MS };
    return emptyResponse;
  }

  const mlResponse = await requestMlPredictions(modelRecords);
  const cacheMs = parsePositiveInteger(
    process.env.SALES_PREDICTION_CACHE_MS,
    DEFAULT_CACHE_MS
  );
  const response = {
    predictionMonth: data.predictionMonth,
    cutoffMonth: data.cutoffMonth,
    generatedAt: new Date().toISOString(),
    model: mlResponse.model,
    modelVersion: mlResponse.modelVersion,
    products: mapPredictionsToProducts({ data, mlResponse }),
    cache: {
      hit: false,
      expiresAt: new Date(now + cacheMs).toISOString(),
    },
  };

  predictionCache = {
    data: response,
    expiresAt: now + cacheMs,
  };

  return response;
}
