import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Brand, Category, Product } from "../models/index.js";

const MONTHS_IN_SALES_WINDOW = 12;
const MONTHS_IN_VIEWS_WINDOW = 3;

function monthStart(month) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

function formatMonth(date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  return formatMonth(new Date(Date.UTC(year, monthNumber - 1 + offset, 1)));
}

function roundTwo(value) {
  return Number(Number(value || 0).toFixed(2));
}

function average(values) {
  if (values.length === 0) return 0;
  return roundTwo(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCommercialGroup(product) {
  const text = normalizeText(
    [product.name, product.productType, product.Category?.name].join(" ")
  );

  if (
    text.includes("accesorio") ||
    text.includes("shaker") ||
    text.includes("guante") ||
    text.includes("cinturon") ||
    text.includes("toalla") ||
    text.includes("botella") ||
    text.includes("strap")
  ) {
    return "Accesorios";
  }

  if (text.includes("ropa") || text.includes("playera") || text.includes("short")) {
    return "Ropa";
  }

  return "Suplementos";
}

function buildMonthSeries(cutoffMonth) {
  const months = [];
  const startMonth = addMonths(cutoffMonth, -(MONTHS_IN_SALES_WINDOW - 1));

  for (let index = 0; index < MONTHS_IN_SALES_WINDOW; index += 1) {
    months.push(addMonths(startMonth, index));
  }

  return months;
}

export function getPredictionMonths(referenceDate = new Date()) {
  const currentMonthStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const cutoffDate = new Date(
    Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1)
  );
  const cutoffMonth = formatMonth(cutoffDate);
  const predictionMonth = addMonths(cutoffMonth, 1);
  const months = buildMonthSeries(cutoffMonth);

  return {
    cutoffMonth,
    predictionMonth,
    months,
    startDate: monthStart(months[0]),
    endDate: monthStart(predictionMonth),
  };
}

async function loadActiveProducts() {
  const products = await Product.findAll({
    attributes: [
      "id",
      "id_producto",
      "name",
      "categoryId",
      "brandId",
      "price",
      "stock",
      "status",
      "productType",
      "createdAt",
    ],
    include: [
      { model: Category, attributes: ["id", "id_categoria", "name"], required: false },
      { model: Brand, attributes: ["id", "id_marca", "name"], required: false },
    ],
    where: {
      status: "Activo",
      id_producto: {
        [Op.ne]: null,
      },
    },
    order: [["id_producto", "ASC"]],
  });

  return products.map((model) => {
    const product = model.get({ plain: true });

    return {
      productPk: Number(product.id),
      productId: Number(product.id_producto),
      name: product.name,
      category: product.Category?.name ?? "Sin categoria",
      brand: product.Brand?.name ?? "Sin marca",
      type: deriveCommercialGroup(product),
      productType: product.productType ?? null,
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      createdAt: product.createdAt ? new Date(product.createdAt) : null,
    };
  });
}

async function loadMonthlySales({ productIds, startDate, endDate }) {
  if (productIds.length === 0) return [];

  return sequelize.query(
    `
    SELECT
      oi."productId"::int AS "productId",
      to_char(date_trunc('month', o."paidAt"), 'YYYY-MM') AS "month",
      COALESCE(SUM(oi."quantity"), 0)::int AS "units"
    FROM core."OrderItems" oi
    JOIN core."Orders" o ON o."id" = oi."orderId"
    WHERE o."status" = 'paid'
      AND o."paidAt" IS NOT NULL
      AND o."paidAt" >= :startDate
      AND o."paidAt" < :endDate
      AND oi."itemType" = 'product'
      AND oi."productId" IN (:productIds)
    GROUP BY oi."productId", date_trunc('month', o."paidAt")
    ORDER BY oi."productId", "month";
    `,
    {
      replacements: { productIds, startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
}

async function loadMonthlyViews({ productIds, startDate, endDate }) {
  if (productIds.length === 0) return [];

  return sequelize.query(
    `
    SELECT
      be."entityId"::int AS "productId",
      to_char(date_trunc('month', be."createdAt"), 'YYYY-MM') AS "month",
      COUNT(*)::int AS "views"
    FROM core."BehaviorEvents" be
    WHERE be."eventType" = 'product_view'
      AND be."entityType" = 'product'
      AND be."entityId" ~ '^[0-9]+$'
      AND be."entityId"::int IN (:productIds)
      AND be."createdAt" >= :startDate
      AND be."createdAt" < :endDate
    GROUP BY be."entityId"::int, date_trunc('month', be."createdAt")
    ORDER BY be."entityId"::int, "month";
    `,
    {
      replacements: { productIds, startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
}

function initializeMonthlyMap(products, months) {
  return new Map(
    products.map((product) => [
      product.productId,
      new Map(months.map((month) => [month, 0])),
    ])
  );
}

function fillMonthlyMap(monthlyMap, rows, valueField) {
  for (const row of rows) {
    const productId = Number(row.productId);
    const month = row.month;
    const productMonths = monthlyMap.get(productId);

    if (productMonths?.has(month)) {
      productMonths.set(month, Number(row[valueField] || 0));
    }
  }
}

function hasInsufficientHistory(product, seriesStartDate) {
  if (!product.createdAt) return true;
  return product.createdAt > seriesStartDate;
}

export async function buildSalesPredictionFeatures(referenceDate = new Date()) {
  const temporal = getPredictionMonths(referenceDate);
  const products = await loadActiveProducts();
  const productIds = products.map((product) => product.productId);
  const [salesRows, viewRows] = await Promise.all([
    loadMonthlySales({
      productIds,
      startDate: temporal.startDate,
      endDate: temporal.endDate,
    }),
    loadMonthlyViews({
      productIds,
      startDate: temporal.startDate,
      endDate: temporal.endDate,
    }),
  ]);

  const salesByProduct = initializeMonthlyMap(products, temporal.months);
  const viewsByProduct = initializeMonthlyMap(products, temporal.months);

  fillMonthlyMap(salesByProduct, salesRows, "units");
  fillMonthlyMap(viewsByProduct, viewRows, "views");

  const records = products.map((product) => {
    const salesHistory = temporal.months.map(
      (month) => salesByProduct.get(product.productId)?.get(month) ?? 0
    );
    const fullViewsHistory = temporal.months.map(
      (month) => viewsByProduct.get(product.productId)?.get(month) ?? 0
    );
    const viewsHistory = fullViewsHistory.slice(-MONTHS_IN_VIEWS_WINDOW);
    const insufficientHistory = hasInsufficientHistory(product, temporal.startDate);

    return {
      product,
      modelRecord: {
        productId: product.productId,
        producto: product.name,
        ventas_mes_anterior: salesHistory.at(-1) ?? 0,
        promedio_movil_ventas_3_meses: average(salesHistory.slice(-3)),
        promedio_movil_ventas_6_meses: average(salesHistory.slice(-6)),
        promedio_movil_ventas_12_meses: average(salesHistory),
        vistas_producto_mes_anterior: fullViewsHistory.at(-1) ?? 0,
        promedio_movil_vistas_3_meses: average(viewsHistory),
      },
      salesHistory,
      viewsHistory,
      insufficientHistory,
      warnings: insufficientHistory
        ? [
            "El producto no tiene 12 meses desde su createdAt; la prediccion usa los registros disponibles y meses sin actividad como cero.",
          ]
        : [],
    };
  });

  return {
    cutoffMonth: temporal.cutoffMonth,
    predictionMonth: temporal.predictionMonth,
    months: temporal.months,
    products: records,
  };
}
