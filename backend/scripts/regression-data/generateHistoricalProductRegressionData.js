import { access } from "node:fs/promises";
import { sequelize } from "../../config/sequelize.js";
import {
  buildMonths,
  classifyCommercialGroup,
  displayPath,
  fromCents,
  loadActiveProductsFromDatabase,
  loadExportedProducts,
  makeSeededRandom,
  MONTHLY_SALES_HEADERS,
  MONTHLY_VIEWS_HEADERS,
  PRODUCTS_EXPORT_FILE,
  RANDOM_SEED,
  SALES_MONTHLY_FILE,
  VIEWS_MONTHLY_FILE,
  writeCsv,
} from "./common.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit-products="));
  const limitProducts = limitArg
    ? Number(limitArg.split("=")[1])
    : null;

  if (limitArg && (!Number.isInteger(limitProducts) || limitProducts <= 0)) {
    throw new Error("--limit-products debe ser un entero positivo.");
  }

  return { limitProducts };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadProducts() {
  if (await fileExists(PRODUCTS_EXPORT_FILE)) {
    return loadExportedProducts();
  }

  await sequelize.authenticate();
  const products = await loadActiveProductsFromDatabase();
  await sequelize.close();
  return products;
}

function chooseProfileOption(options, random) {
  const pick = random();
  let cursor = 0;

  for (const option of options) {
    cursor += option.weight;
    if (pick <= cursor) return option.value;
  }

  return options[options.length - 1].value;
}

function buildProductProfile(product, index, totalProducts) {
  const random = makeSeededRandom(`${RANDOM_SEED}:profile:${product.id_producto}`);
  const group = classifyCommercialGroup(product);
  const rotationPick = random();
  const trend = chooseProfileOption(
    [
      { value: "growth", weight: 0.28 },
      { value: "decline", weight: 0.2 },
      { value: "stable", weight: 0.25 },
      { value: "seasonal", weight: 0.17 },
      { value: "mixed", weight: 0.1 },
    ],
    random
  );
  const attentionProfile = chooseProfileOption(
    [
      { value: "normal", weight: 0.68 },
      { value: "high_interest_low_conversion", weight: 0.16 },
      { value: "low_interest_stable_sales", weight: 0.16 },
    ],
    random
  );

  let rotation = "medium";
  if (group === "suplementos") {
    rotation = rotationPick < 0.42 ? "high" : rotationPick < 0.86 ? "medium" : "low";
  } else if (group === "ropa") {
    rotation = rotationPick < 0.18 ? "high" : rotationPick < 0.7 ? "medium" : "low";
  } else {
    rotation = rotationPick < 0.12 ? "high" : rotationPick < 0.58 ? "medium" : "low";
  }

  const baseByGroup = {
    suplementos: { high: 14, medium: 7, low: 3 },
    ropa: { high: 8, medium: 4, low: 2 },
    accesorios: { high: 7, medium: 3, low: 1.5 },
  };
  const capByGroup = {
    suplementos: 38,
    ropa: 20,
    accesorios: 16,
  };
  const positionFactor = 0.9 + (1 - index / Math.max(1, totalProducts)) * 0.25;
  const salesModifier =
    attentionProfile === "high_interest_low_conversion"
      ? 0.68
      : attentionProfile === "low_interest_stable_sales"
        ? 1.08
        : 1;

  return {
    group,
    rotation,
    trend,
    attentionProfile,
    baseUnits:
      baseByGroup[group][rotation] *
      (0.72 + random() * 0.55) *
      positionFactor *
      salesModifier,
    capUnits: capByGroup[group],
    volatility: 0.16 + random() * 0.28,
    trendStrength: 0.004 + random() * 0.012,
    viewBase:
      (group === "suplementos" ? 26 : group === "ropa" ? 19 : 14) *
      (0.75 + random() * 0.85),
    viewMultiplier:
      attentionProfile === "high_interest_low_conversion"
        ? 2.25
        : attentionProfile === "low_interest_stable_sales"
          ? 0.58
          : 1,
    viewTrendStrength: 0.003 + random() * 0.01,
  };
}

function seasonalityForSales(group, monthNumber) {
  if (group === "suplementos") {
    if (monthNumber === 1) return 1.16;
    if (monthNumber === 11) return 1.12;
    if (monthNumber === 12) return 1.08;
    if ([7, 8].includes(monthNumber)) return 0.94;
    return 1;
  }

  if (group === "ropa") {
    if ([3, 4, 5, 6].includes(monthNumber)) return 1.13;
    if ([11, 12].includes(monthNumber)) return 1.16;
    if ([7, 8].includes(monthNumber)) return 0.88;
    return 1;
  }

  if ([1, 11].includes(monthNumber)) return 1.1;
  if ([6, 7, 8].includes(monthNumber)) return 0.95;
  return 1;
}

function trendFactor(profile, monthIndex) {
  if (profile.trend === "growth") {
    return 1 + monthIndex * profile.trendStrength;
  }

  if (profile.trend === "decline") {
    return Math.max(0.58, 1 - monthIndex * profile.trendStrength * 0.75);
  }

  if (profile.trend === "seasonal") {
    return 1 + Math.sin((monthIndex / 12) * Math.PI * 2) * 0.08;
  }

  if (profile.trend === "mixed") {
    const firstHalf = monthIndex < 24 ? monthIndex : 48 - monthIndex;
    return 0.9 + firstHalf * profile.trendStrength;
  }

  return 0.96 + Math.sin(monthIndex * 0.7) * 0.035;
}

function zeroChanceFor(profile, unitsBeforeZero) {
  if (profile.rotation === "high") return 0.015;
  if (profile.rotation === "medium") return unitsBeforeZero < 3 ? 0.08 : 0.03;
  if (profile.group === "accesorios") return 0.28;
  if (profile.group === "ropa") return 0.2;
  return 0.12;
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function salesForProductMonth(product, profile, month, monthIndex) {
  const random = makeSeededRandom(
    `${RANDOM_SEED}:sales:${product.id_producto}:${month}`
  );
  const monthNumber = Number(month.slice(5, 7));
  const seasonal = seasonalityForSales(profile.group, monthNumber);
  const trend = trendFactor(profile, monthIndex);
  const noise = 1 + (random() * 2 - 1) * profile.volatility;
  const campaign =
    random() < 0.07 ? 1 + random() * 0.35 : random() < 0.05 ? 0.55 + random() * 0.25 : 1;
  const rawUnits = profile.baseUnits * seasonal * trend * noise * campaign;
  const initialUnits = clampInteger(rawUnits, 0, profile.capUnits);

  if (random() < zeroChanceFor(profile, initialUnits)) {
    return 0;
  }

  return initialUnits;
}

function viewTrendFactor(profile, monthIndex) {
  if (profile.trend === "growth") {
    return 1 + monthIndex * profile.viewTrendStrength;
  }

  if (profile.trend === "decline") {
    return Math.max(0.62, 1 - monthIndex * profile.viewTrendStrength * 0.65);
  }

  if (profile.trend === "mixed") {
    return 0.94 + Math.sin(monthIndex / 5) * 0.08;
  }

  return 0.97 + Math.sin(monthIndex / 4) * 0.05;
}

function viewsForProductMonth(product, profile, month, monthIndex, units) {
  const random = makeSeededRandom(
    `${RANDOM_SEED}:views:${product.id_producto}:${month}`
  );
  const monthNumber = Number(month.slice(5, 7));
  const seasonal = 0.92 + (seasonalityForSales(profile.group, monthNumber) - 1) * 0.7;
  const trend = viewTrendFactor(profile, monthIndex);
  const noise = 0.65 + random() * 0.85;
  const salesSignal = units * (1.4 + random() * 3.4);
  const browsingOnlyBoost =
    profile.attentionProfile === "high_interest_low_conversion"
      ? 12 + random() * 28
      : 0;
  const stableBuyerPenalty =
    profile.attentionProfile === "low_interest_stable_sales" ? 0.72 : 1;
  const rawViews =
    (profile.viewBase * profile.viewMultiplier * seasonal * trend * noise +
      salesSignal +
      browsingOnlyBoost) *
    stableBuyerPenalty;

  if (units === 0 && profile.rotation === "low" && random() < 0.1) {
    return 0;
  }

  return clampInteger(rawViews, 0, 135);
}

function buildMonthlyRows(products, months) {
  const salesRows = [];
  const viewRows = [];

  products.forEach((product, productIndex) => {
    const profile = buildProductProfile(product, productIndex, products.length);

    months.forEach((month, monthIndex) => {
      const unidadesVendidas = salesForProductMonth(
        product,
        profile,
        month,
        monthIndex
      );
      const vistasProducto = viewsForProductMonth(
        product,
        profile,
        month,
        monthIndex,
        unidadesVendidas
      );

      salesRows.push({
        product_pk: product.product_pk,
        id_producto: product.id_producto,
        producto: product.producto,
        mes: month,
        unidades_vendidas: unidadesVendidas,
      });

      viewRows.push({
        product_pk: product.product_pk,
        id_producto: product.id_producto,
        producto: product.producto,
        mes: month,
        vistas_producto: vistasProducto,
      });
    });
  });

  return { salesRows, viewRows };
}

function summarize(rows, valueField) {
  const total = rows.reduce((sum, row) => sum + Number(row[valueField]), 0);
  const zeroRows = rows.filter((row) => Number(row[valueField]) === 0).length;

  return {
    total,
    zeroRows,
    max: Math.max(...rows.map((row) => Number(row[valueField]))),
  };
}

async function main() {
  const { limitProducts } = parseArgs();
  const months = buildMonths();
  const loadedProducts = await loadProducts();
  const products = limitProducts ? loadedProducts.slice(0, limitProducts) : loadedProducts;

  if (products.length === 0) {
    throw new Error("No se encontraron productos activos para generar datos.");
  }

  const { salesRows, viewRows } = buildMonthlyRows(products, months);
  const expectedRows = products.length * months.length;

  if (salesRows.length !== expectedRows || viewRows.length !== expectedRows) {
    throw new Error("La generacion no produjo una fila por producto y mes.");
  }

  await writeCsv(SALES_MONTHLY_FILE, MONTHLY_SALES_HEADERS, salesRows);
  await writeCsv(VIEWS_MONTHLY_FILE, MONTHLY_VIEWS_HEADERS, viewRows);

  const sales = summarize(salesRows, "unidades_vendidas");
  const views = summarize(viewRows, "vistas_producto");

  console.log("Generacion historica completada");
  console.log(`Semilla: ${RANDOM_SEED}`);
  console.log(`Productos usados: ${products.length}`);
  console.log(`Meses generados: ${months.length}`);
  console.log(`Filas de ventas: ${salesRows.length}`);
  console.log(`Filas de vistas: ${viewRows.length}`);
  console.log(`Unidades simuladas: ${sales.total}`);
  console.log(`Vistas simuladas: ${views.total}`);
  console.log(`Meses-producto con cero ventas: ${sales.zeroRows}`);
  console.log(`Meses-producto con cero vistas: ${views.zeroRows}`);
  console.log(`Max unidades producto-mes: ${sales.max}`);
  console.log(`Max vistas producto-mes: ${views.max}`);
  console.log(`Archivo ventas: ${displayPath(SALES_MONTHLY_FILE)}`);
  console.log(`Archivo vistas: ${displayPath(VIEWS_MONTHLY_FILE)}`);

  if (limitProducts) {
    console.log(
      `Advertencia: se uso --limit-products=${limitProducts}; rerun sin limite para el dataset completo.`
    );
  }

  console.log(`Ejemplo precio preservado: ${fromCents(products[0].priceCents)}`);
}

main().catch(async (error) => {
  await sequelize.close().catch(() => {});
  console.error("Error en generateHistoricalProductRegressionData:", error);
  process.exit(1);
});
