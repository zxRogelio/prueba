import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Brand, Category, Product } from "../../models/index.js";

export const SEED_NAME = "product_regression_48_months";
export const SEED_PURPOSE = "monthly-product-sales-regression";
export const SEED_SOURCE = "historical_regression_seed";
export const ORDER_PREFIX = "REG48-";
export const RANDOM_SEED = "20260722";
export const START_MONTH = "2022-07";
export const END_MONTH = "2026-06";
export const EXPECTED_MONTHS = 48;
export const HISTORICAL_USER_COUNT = 120;
export const HISTORICAL_USER_EMAIL_PREFIX = "historical.regression.";
export const HISTORICAL_USER_EMAIL_DOMAIN = "titanium-seed.local";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const OUTPUT_DIR = path.resolve(SCRIPT_DIR, "output");
export const PRODUCTS_EXPORT_FILE = path.join(OUTPUT_DIR, "productos_export.csv");
export const SALES_MONTHLY_FILE = path.join(
  OUTPUT_DIR,
  "ventas_mensuales_48_meses.csv"
);
export const VIEWS_MONTHLY_FILE = path.join(
  OUTPUT_DIR,
  "vistas_mensuales_48_meses.csv"
);
export const DATASET_FILE = path.join(
  OUTPUT_DIR,
  "product_regression_dataset.csv"
);

export const PRODUCT_EXPORT_HEADERS = Object.freeze([
  "product_pk",
  "id_producto",
  "producto",
  "category_id",
  "category_name",
  "brand_id",
  "brand_name",
  "product_type",
  "price",
  "status",
]);

export const MONTHLY_SALES_HEADERS = Object.freeze([
  "product_pk",
  "id_producto",
  "producto",
  "mes",
  "unidades_vendidas",
]);

export const MONTHLY_VIEWS_HEADERS = Object.freeze([
  "product_pk",
  "id_producto",
  "producto",
  "mes",
  "vistas_producto",
]);

export const DATASET_HEADERS = Object.freeze([
  "producto",
  "mes_corte",
  "ventas_mes_anterior",
  "promedio_movil_ventas_3_meses",
  "promedio_movil_ventas_6_meses",
  "promedio_movil_ventas_12_meses",
  "vistas_producto_mes_anterior",
  "promedio_movil_vistas_3_meses",
  "ventas_mes_siguiente",
]);

export function makeSeededRandom(seed) {
  let state = 2166136261;
  const text = String(seed);

  for (let index = 0; index < text.length; index += 1) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toCents(value, fieldName = "monto") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

export function fromCents(value) {
  return (Math.round(value) / 100).toFixed(2);
}

export function monthStart(month) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function buildMonths() {
  const months = [];
  let current = START_MONTH;

  while (current <= END_MONTH) {
    months.push(current);
    current = addMonths(current, 1);
  }

  if (months.length !== EXPECTED_MONTHS) {
    throw new Error(`Periodo invalido: se generaron ${months.length} meses.`);
  }

  return months;
}

export function daysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function assertValidMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) {
    throw new Error(`Mes invalido: ${month}`);
  }

  if (!buildMonths().includes(month)) {
    throw new Error(`Mes fuera del periodo esperado: ${month}`);
  }
}

export function parseNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${fieldName} debe ser un entero no negativo.`);
  }

  return normalized;
}

export function parsePositiveInteger(value, fieldName) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} debe ser un entero positivo.`);
  }

  return normalized;
}

export function shuffle(items, random) {
  const output = [...items];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }

  return output;
}

export function chooseWeighted(items, weightFor, random) {
  if (items.length === 0) return null;

  const weighted = items.map((item) => ({
    item,
    weight: Math.max(0.0001, Number(weightFor(item)) || 0),
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * total;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.item;
  }

  return weighted[weighted.length - 1].item;
}

export function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function ensureOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(headers, rows) {
  return `${[
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n")}\n`;
}

export async function writeCsv(filePath, headers, rows) {
  await ensureOutputDir();
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, toCsv(headers, rows), "utf8");
  await rename(temporaryPath, filePath);
}

export function parseCsv(content) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (insideQuotes && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  if (insideQuotes) {
    throw new Error("CSV invalido: comillas sin cerrar.");
  }

  row.push(value);
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  return rows;
}

export async function readCsvRecords(filePath, expectedHeaders = null) {
  const content = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
  const rows = parseCsv(content);

  if (rows.length === 0) {
    throw new Error(`CSV vacio: ${filePath}`);
  }

  const headers = rows[0];

  if (expectedHeaders) {
    const expected = expectedHeaders.join(",");
    const actual = headers.join(",");
    if (expected !== actual) {
      throw new Error(
        `Headers invalidos en ${filePath}. Esperado ${expected}; recibido ${actual}.`
      );
    }
  }

  const seenHeaders = new Set();
  for (const header of headers) {
    if (seenHeaders.has(header)) {
      throw new Error(`Header duplicado en ${filePath}: ${header}`);
    }
    seenHeaders.add(header);
  }

  return rows.slice(1).map((row, rowIndex) => {
    const record = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = row[index] ?? "";
    }
    record.__rowNumber = rowIndex + 2;
    return record;
  });
}

export async function loadActiveProductsFromDatabase() {
  const products = await Product.findAll({
    attributes: [
      "id",
      "id_producto",
      "name",
      "brandId",
      "categoryId",
      "price",
      "status",
      "productType",
      "createdAt",
      "updatedAt",
    ],
    include: [
      { model: Category, attributes: ["id", "id_categoria", "name"], required: false },
      { model: Brand, attributes: ["id", "id_marca", "name"], required: false },
    ],
    where: { status: "Activo" },
    order: [["id_producto", "ASC"]],
  });

  return products.map((model) => {
    const product = model.get({ plain: true });
    return normalizeProductRecord({
      product_pk: product.id,
      id_producto: product.id_producto,
      producto: product.name,
      category_id: product.categoryId,
      category_name: product.Category?.name ?? "",
      brand_id: product.brandId,
      brand_name: product.Brand?.name ?? "",
      product_type: product.productType,
      price: product.price,
      status: product.status,
    });
  });
}

export function normalizeProductRecord(record) {
  const productPk = parsePositiveInteger(record.product_pk, "product_pk");
  const idProducto = parsePositiveInteger(record.id_producto, "id_producto");
  const productName = String(record.producto ?? "").trim();
  const categoryId = parsePositiveInteger(record.category_id, "category_id");
  const brandId = parsePositiveInteger(record.brand_id, "brand_id");
  const priceCents = toCents(record.price, "price");
  const status = String(record.status ?? "").trim();

  if (!productName) {
    throw new Error(`Producto sin nombre para id_producto=${idProducto}.`);
  }

  if (priceCents <= 0) {
    throw new Error(`Producto con precio no positivo: ${idProducto}.`);
  }

  if (status !== "Activo") {
    throw new Error(`Producto no activo en entrada: ${idProducto}.`);
  }

  return {
    product_pk: productPk,
    id_producto: idProducto,
    producto: productName,
    category_id: categoryId,
    category_name: String(record.category_name ?? "").trim(),
    brand_id: brandId,
    brand_name: String(record.brand_name ?? "").trim(),
    product_type: String(record.product_type ?? "").trim(),
    price: fromCents(priceCents),
    priceCents,
    status,
  };
}

export async function loadExportedProducts() {
  const records = await readCsvRecords(PRODUCTS_EXPORT_FILE, PRODUCT_EXPORT_HEADERS);
  return records.map(normalizeProductRecord);
}

export function classifyCommercialGroup(product) {
  const text = normalizeText(
    [
      product.producto,
      product.category_name,
      product.brand_name,
      product.product_type,
    ].join(" ")
  );

  if (
    text.includes("accesorio") ||
    text.includes("accessor") ||
    text.includes("guante") ||
    text.includes("shaker") ||
    text.includes("cinturon") ||
    text.includes("strap") ||
    text.includes("toalla") ||
    text.includes("mat") ||
    text.includes("band") ||
    text.includes("botella")
  ) {
    return "accesorios";
  }

  if (normalizeText(product.product_type).includes("ropa") || text.includes("ropa")) {
    return "ropa";
  }

  return "suplementos";
}

export function productMapByBusinessId(products) {
  return new Map(products.map((product) => [product.id_producto, product]));
}

export function displayPath(filePath) {
  return path.relative(process.cwd(), filePath);
}
