import { Op, QueryTypes, where, literal } from "sequelize";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  InventoryMovement,
  InventoryReservation,
  Order,
  OrderItem,
  Product,
  User,
} from "../models/index.js";
import { ORDER_CHANNELS } from "../models/Order.js";

const SEED_NAME = "sales-regression-monthly-v1";
const SEED_PURPOSE = "monthly-product-sales-regression";
const REGRESSION_USER_SEED_NAME = "sales-regression-users-v1";
const RANDOM_SEED = "TITANIUM_MONTHLY_SALES_REGRESSION_2026";
const ORDER_PREFIX = "RGV1-";
const REGRESSION_EMAIL_PREFIX = "regression.v1.";
const REGRESSION_EMAIL_DOMAIN = "titanium.test";
const NOTES = "Orden sintetica para regresion mensual de ventas";
const START_MONTH = "2024-07";
const END_MONTH = "2026-06";
const START_DATE = new Date("2024-07-01T00:00:00.000Z");
const END_DATE = new Date("2026-06-30T23:59:59.999Z");
const EXPECTED_USERS = 500;
const ORDER_BATCH_SIZE = 500;
const ORDER_ITEM_BATCH_SIZE = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REGRESSION_USERS_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/monthlySalesRegressionUsersV1Seed.json"
);
const CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/monthlySalesRegressionV1Seed.json"
);
const SUMMARY_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/monthlySalesRegressionV1Summary.json"
);

const FIRST_NAMES = Object.freeze([
  "Ana",
  "Carlos",
  "Maria",
  "Luis",
  "Fernanda",
  "Jorge",
  "Daniela",
  "Miguel",
  "Sofia",
  "Alejandro",
  "Valeria",
  "Diego",
  "Camila",
  "Ricardo",
  "Paola",
  "Andres",
  "Lucia",
  "Emilio",
  "Regina",
  "Mateo",
  "Gabriela",
  "Sebastian",
  "Natalia",
  "Hector",
  "Monica",
]);

const LAST_NAMES = Object.freeze([
  "Lopez",
  "Hernandez",
  "Garcia",
  "Martinez",
  "Sanchez",
  "Ramirez",
  "Cruz",
  "Torres",
  "Flores",
  "Vargas",
  "Morales",
  "Castillo",
  "Reyes",
  "Jimenez",
  "Ortega",
  "Mendoza",
  "Rojas",
  "Navarro",
  "Aguilar",
  "Campos",
]);

const EMAIL_DOMAINS = Object.freeze([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
]);

const CHANNEL_WEIGHTS = Object.freeze([
  { value: "online", weight: 45 },
  { value: "reception", weight: 35 },
  { value: "mobile", weight: 20 },
]);

function makeSeededRandom(seed) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicUuid(input) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hex.slice(18, 20),
    hex.slice(20, 32),
  ].join("-");
}

function toCents(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100);
}

function centsToDecimal(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

function roundTwo(value) {
  return Math.round(value * 100) / 100;
}

function formatPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEmailSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function dateToDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function monthStart(month) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

function monthEnd(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function buildMonths() {
  const months = [];
  let current = START_MONTH;

  while (current <= END_MONTH) {
    months.push(current);
    current = addMonths(current, 1);
  }

  return months;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function chooseWeighted(options, random) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let pick = random() * total;

  for (const option of options) {
    pick -= option.weight;
    if (pick <= 0) return option.value;
  }

  return options[options.length - 1].value;
}

function seededShuffle(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonAtomic(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(tmpPath, filePath);
}

function generateFallbackUsers() {
  const users = [];

  for (let firstIndex = 0; firstIndex < FIRST_NAMES.length; firstIndex += 1) {
    for (let lastIndex = 0; lastIndex < LAST_NAMES.length; lastIndex += 1) {
      const firstName = FIRST_NAMES[firstIndex];
      const lastName = LAST_NAMES[lastIndex];
      const domain = EMAIL_DOMAINS[(firstIndex + lastIndex) % EMAIL_DOMAINS.length];
      users.push({
        email: `${toEmailSlug(firstName)}.${toEmailSlug(lastName)}@${domain}`,
      });
    }
  }

  if (users.length !== EXPECTED_USERS) {
    throw new Error(`Fallback genero ${users.length} usuarios; se esperaban ${EXPECTED_USERS}.`);
  }

  return users;
}

async function loadSeedUserManifest() {
  const manifest = await readJsonIfExists(REGRESSION_USERS_FILE);

  if (!manifest) {
    throw new Error(
      "No existe monthlySalesRegressionUsersV1Seed.json. Ejecuta primero seed:regression:users."
    );
  }

  if (manifest.seedName !== REGRESSION_USER_SEED_NAME) {
    throw new Error(
      `El manifiesto de usuarios no pertenece a ${REGRESSION_USER_SEED_NAME}.`
    );
  }

  const emails = [...new Set((manifest.emails ?? []).map((email) => String(email).trim().toLowerCase()))];
  const userIds = [...new Set((manifest.userIds ?? []).filter(Boolean))];

  if (emails.length !== EXPECTED_USERS || userIds.length !== EXPECTED_USERS) {
    throw new Error(
      `Manifiesto de usuarios incompleto: ${emails.length} emails, ${userIds.length} ids.`
    );
  }

  const invalidEmails = emails.filter(
    (email) =>
      !email.startsWith(REGRESSION_EMAIL_PREFIX) ||
      !email.endsWith(`@${REGRESSION_EMAIL_DOMAIN}`)
  );

  if (invalidEmails.length > 0) {
    throw new Error(
      `El manifiesto contiene correos ajenos al seed de regresion: ${invalidEmails.slice(0, 5).join(", ")}`
    );
  }

  return { emails, userIds };
}

async function loadSeedUsers() {
  const manifest = await loadSeedUserManifest();
  const users = await User.findAll({
    where: {
      id: { [Op.in]: manifest.userIds },
      email: { [Op.in]: manifest.emails },
    },
    attributes: ["id", "email", "role", "createdAt"],
    raw: true,
  });
  const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const orderedUsers = manifest.emails
    .map((email, index) => {
      const user = usersByEmail.get(email);
      if (!user) return null;
      const normalizedEmail = user.email.toLowerCase();
      return {
        ...user,
        email: normalizedEmail,
        userIndex: index + 1,
        createdAtDate: new Date(user.createdAt),
        createdDateOnly: dateToDateOnly(user.createdAt),
      };
    })
    .filter(Boolean);
  const clientUsers = orderedUsers.filter((user) => user.role === "cliente");

  return {
    usersExpected: manifest.emails.length,
    usersFound: orderedUsers.length,
    clientUsers,
    validationErrors: [
      ...(orderedUsers.length !== EXPECTED_USERS
        ? [`Usuarios encontrados ${orderedUsers.length}; esperado ${EXPECTED_USERS}.`]
        : []),
      ...(clientUsers.length !== EXPECTED_USERS
        ? [`Usuarios cliente ${clientUsers.length}; esperado ${EXPECTED_USERS}.`]
        : []),
      ...orderedUsers
        .filter(
          (user) =>
            !user.email.startsWith(REGRESSION_EMAIL_PREFIX) ||
            !user.email.endsWith(`@${REGRESSION_EMAIL_DOMAIN}`)
        )
        .map((user) => `Usuario fuera del prefijo de regresion: ${user.email}.`),
    ],
    minCreatedAt:
      orderedUsers.length > 0
        ? new Date(Math.min(...orderedUsers.map((user) => user.createdAtDate))).toISOString()
        : null,
    maxCreatedAt:
      orderedUsers.length > 0
        ? new Date(Math.max(...orderedUsers.map((user) => user.createdAtDate))).toISOString()
        : null,
  };
}

async function loadProducts() {
  const products = await Product.findAll({
    include: [
      { model: Category, required: false },
      { model: Brand, required: false },
    ],
    order: [["id_producto", "ASC"]],
  });
  const excluded = [];
  const valid = [];

  for (const productModel of products) {
    const product = productModel.get({ plain: true });
    const normalizedName = normalizeText(product.name);
    const invalidName = ["prueba", "test", "producto prueba", "demo", "temporal"].some(
      (word) => normalizedName.includes(normalizeText(word))
    );

    if (
      product.status === "Activo" &&
      Number(product.price) > 0 &&
      product.id_producto != null &&
      !invalidName
    ) {
      valid.push({
        ...product,
        productKey: product.id_producto,
        priceCents: toCents(product.price),
        categoryName: product.Category?.name ?? null,
        brandName: product.Brand?.name ?? null,
        normalizedName,
      });
    } else {
      excluded.push({
        id_producto: product.id_producto,
        name: product.name,
        reason: invalidName ? "name_excluded" : "inactive_or_invalid",
      });
    }
  }

  return { productsFound: products.length, products: valid, excluded };
}

async function inventorySnapshot() {
  const [productsCount, stockSum, movementsCount, reservationsCount] = await Promise.all([
    Product.count(),
    Product.sum("stock"),
    InventoryMovement.count(),
    InventoryReservation.count(),
  ]);

  return {
    productsCount,
    stockSum: Number(stockSum ?? 0),
    inventoryMovements: movementsCount,
    inventoryReservations: reservationsCount,
  };
}

async function protectedSnapshot() {
  const [rows] = await sequelize.query(
    `
SELECT
  (SELECT COUNT(*)::int FROM core."Users") AS "users",
  (SELECT MAX("updatedAt") FROM core."Users") AS "usersMaxUpdatedAt",
  (SELECT COUNT(*)::int FROM core."Products") AS "products",
  (SELECT SUM("stock")::int FROM core."Products") AS "stockSum",
  (SELECT MAX("updatedAt") FROM core."Products") AS "productsMaxUpdatedAt",
  (SELECT COUNT(*)::int FROM core."Categories") AS "categories",
  (SELECT COUNT(*)::int FROM core."Brands") AS "brands",
  (SELECT COUNT(*)::int FROM core."Payments") AS "payments",
  (SELECT COUNT(*)::int FROM core."UserSubscriptions") AS "subscriptions",
  (SELECT COUNT(*)::int FROM core."SubscriptionHistories") AS "histories",
  (SELECT COUNT(*)::int FROM core."InventoryMovements") AS "inventoryMovements",
  (SELECT COUNT(*)::int FROM core."InventoryReservations") AS "inventoryReservations",
  (SELECT COUNT(*)::int FROM core."Orders" WHERE "metadata"->>'seedName' = 'association-rules-v1') AS "associationOrders",
  (SELECT COUNT(*)::int FROM core."OrderItems" oi JOIN core."Orders" o ON o."id" = oi."orderId" WHERE o."metadata"->>'seedName' = 'association-rules-v1') AS "associationOrderItems";
`
  );

  return rows[0];
}

function snapshotDiff(before, after) {
  return Object.keys(before).filter((key) => String(before[key]) !== String(after[key]));
}

function demandSegment(index, total) {
  const ratio = index / total;
  if (ratio < 0.15) return "high";
  if (ratio < 0.7) return "medium";
  return "low";
}

function trendSegment(index, total) {
  const ratio = index / total;
  if (ratio < 0.4) return "growth";
  if (ratio < 0.75) return "stable";
  return "decline";
}

function classifyProduct(products, product, index) {
  const random = makeSeededRandom(`${RANDOM_SEED}:product:${product.id_producto}`);
  const demand = demandSegment(index, products.length);
  const trend = trendSegment(index, products.length);
  const trendRate =
    trend === "growth"
      ? random() * 0.012
      : trend === "decline"
        ? -random() * 0.008
        : random() * 0.004 - 0.002;

  return {
    ...product,
    demandSegment: demand,
    trendSegment: trend,
    trendRate,
    productWeight: 0.85 + random() * 0.3,
  };
}

function productSeasonality(product, month) {
  const monthNumber = Number(month.slice(5, 7));
  const text = `${normalizeText(product.productType)} ${normalizeText(product.categoryName)} ${product.normalizedName}`;
  const isSupplement =
    text.includes("suplement") ||
    text.includes("whey") ||
    text.includes("creatina") ||
    text.includes("protein");
  const isApparel = text.includes("ropa") || text.includes("shirt") || text.includes("legging");
  let factor = 1;

  if (monthNumber === 1 && isSupplement) factor += 0.13;
  if ([4, 5, 6].includes(monthNumber) && isApparel) factor += 0.08;
  if ([7, 8].includes(monthNumber)) factor -= 0.05;
  if ([9, 10].includes(monthNumber)) factor += 0.03;
  if (monthNumber === 11) factor += 0.11;
  if (monthNumber === 12 && isApparel) factor += 0.12;
  if (monthNumber === 12 && isSupplement) factor += 0.04;

  const random = makeSeededRandom(`${RANDOM_SEED}:season:${product.id_producto}:${month}`);
  return clamp(factor + (random() * 0.08 - 0.04), 0.75, 1.3);
}

function priceForProductMonth(product, monthIndex, month) {
  const random = makeSeededRandom(`${RANDOM_SEED}:price:${product.id_producto}:${month}`);
  const drift = 1 + monthIndex * (0.001 + random() * 0.001);
  const noise = random() * 0.035 - 0.015;
  const factor = clamp(drift + noise, 0.95, 1.08);
  return Math.max(1, Math.round(product.priceCents * factor));
}

function initialDemand(product, month, monthIndex) {
  const random = makeSeededRandom(`${RANDOM_SEED}:demand:${product.id_producto}:${month}`);
  const ranges = {
    high: [12, 24],
    medium: [4, 10],
    low: [1, 5],
  };
  const [min, max] = ranges[product.demandSegment];
  const zeroChance =
    product.demandSegment === "high" ? 0.03 : product.demandSegment === "medium" ? 0.17 : 0.45;

  if (random() < zeroChance) return 0;

  const base = min + random() * (max - min);
  const trendFactor = 1 + product.trendRate * monthIndex + (random() * 0.14 - 0.07);
  const seasonality = productSeasonality(product, month);
  const priceFactor = clamp(1 - ((priceForProductMonth(product, monthIndex, month) / product.priceCents) - 1) * 0.45, 0.9, 1.08);
  const noise = 0.8 + random() * 0.4;

  return Math.max(0, Math.round(base * product.productWeight * trendFactor * seasonality * priceFactor * noise));
}

function monthTargetUnits(month, monthIndex) {
  const random = makeSeededRandom(`${RANDOM_SEED}:month-target:${month}`);
  const monthNumber = Number(month.slice(5, 7));
  let target = 1030 + Math.round(random() * 100 - 50);
  if (monthNumber === 1) target += 80;
  if ([4, 5, 6].includes(monthNumber)) target += 55;
  if ([7, 8].includes(monthNumber)) target -= 45;
  if (monthNumber === 11) target += 120;
  if (monthNumber === 12) target += 75;
  target += Math.round(monthIndex * 3);
  return clamp(target, 900, 1250);
}

function normalizeMonthlyDemand(entries, targetUnits) {
  const initialTotal = entries.reduce((sum, entry) => sum + entry.initialQuantity, 0);
  if (initialTotal === 0) return { factor: 1, finalTotal: 0 };
  const factor = targetUnits / initialTotal;
  const activeEntries = entries.filter((entry) => entry.initialQuantity > 0);
  let finalTotal = 0;

  for (const entry of entries) {
    entry.quantity = entry.initialQuantity > 0
      ? Math.max(1, Math.round(entry.initialQuantity * factor))
      : 0;
    finalTotal += entry.quantity;
  }

  let diff = targetUnits - finalTotal;
  const adjustRandom = makeSeededRandom(`${RANDOM_SEED}:normalize:${entries[0]?.month ?? "none"}`);
  const shuffled = seededShuffle(activeEntries, adjustRandom);
  let cursor = 0;

  while (diff !== 0 && shuffled.length > 0) {
    const entry = shuffled[cursor % shuffled.length];
    if (diff > 0) {
      entry.quantity += 1;
      diff -= 1;
    } else if (entry.quantity > 1) {
      entry.quantity -= 1;
      diff += 1;
    }
    cursor += 1;
    if (cursor > shuffled.length * 10 && diff < 0) break;
  }

  return {
    factor: roundTwo(factor),
    finalTotal: entries.reduce((sum, entry) => sum + entry.quantity, 0),
  };
}

function discountForLine(month, random) {
  const monthNumber = Number(month.slice(5, 7));
  const pick = random();
  const noDiscountLimit = monthNumber === 11 ? 0.62 : monthNumber === 1 ? 0.68 : 0.75;
  const moderateLimit = monthNumber === 11 ? 0.88 : monthNumber === 1 ? 0.9 : 0.93;

  if (pick < noDiscountLimit) return 0;
  if (pick < moderateLimit) return 0.05 + random() * 0.05;
  return 0.11 + random() * 0.09;
}

function saleDateFor(month, orderIndex, eligibleUsers) {
  const random = makeSeededRandom(`${RANDOM_SEED}:date:${month}:${orderIndex}`);
  const maxDay = daysInMonth(month);
  let day = 1 + Math.floor(random() * maxDay);
  const bias = random();
  if (bias < 0.18) day = 15 + Math.floor(random() * Math.min(2, maxDay - 15 + 1));
  else if (bias < 0.34) day = Math.max(1, maxDay - Math.floor(random() * 3));

  let hour = 9 + Math.floor(random() * 12);
  let minute = Math.floor(random() * 60);
  const [year, monthNumber] = month.split("-").map(Number);
  let date = new Date(Date.UTC(year, monthNumber - 1, day, hour, minute, Math.floor(random() * 60), 0));

  if (date < START_DATE) date = new Date(START_DATE);
  if (date > END_DATE) date = new Date(END_DATE);

  const earliestUserDate = new Date(Math.min(...eligibleUsers.map((user) => user.createdAtDate.getTime())));
  if (date < earliestUserDate) {
    date = new Date(earliestUserDate);
    date.setUTCHours(Math.max(10, date.getUTCHours()), minute, 0, 0);
  }

  if (monthKey(date) !== month) {
    date = new Date(Date.UTC(year, monthNumber - 1, maxDay, 18, 0, 0, 0));
  }

  return date;
}

function chooseChannel(monthIndex, random) {
  const validOptions = CHANNEL_WEIGHTS.filter((option) => ORDER_CHANNELS.includes(option.value));
  const adjusted = validOptions.map((option) => ({
    ...option,
    weight:
      option.value === "online" || option.value === "mobile"
        ? option.weight + monthIndex * 0.35
        : option.weight,
  }));

  return chooseWeighted(adjusted, random);
}

function generateDemandPlan(products, months) {
  const classifiedProducts = seededShuffle(
    products,
    makeSeededRandom(`${RANDOM_SEED}:product-order`)
  ).map((product, index) => classifyProduct(products, product, index));
  const demandByMonth = new Map();
  const monthStats = [];

  for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
    const month = months[monthIndex];
    const entries = classifiedProducts.map((product) => ({
      month,
      product,
      unitPriceCents: priceForProductMonth(product, monthIndex, month),
      initialQuantity: initialDemand(product, month, monthIndex),
      quantity: 0,
    }));
    const initialTotal = entries.reduce((sum, entry) => sum + entry.initialQuantity, 0);
    const targetUnits = monthTargetUnits(month, monthIndex);
    const normalization = normalizeMonthlyDemand(entries, targetUnits);

    demandByMonth.set(month, entries);
    monthStats.push({
      month,
      initialDemand: initialTotal,
      normalizationFactor: normalization.factor,
      finalDemand: normalization.finalTotal,
    });
  }

  enforceProductMinimums(demandByMonth, classifiedProducts, months);

  for (const stat of monthStats) {
    stat.finalDemand = demandByMonth
      .get(stat.month)
      .reduce((sum, entry) => sum + entry.quantity, 0);
  }

  return { classifiedProducts, demandByMonth, monthStats };
}

function enforceProductMinimums(demandByMonth, products, months) {
  for (const product of products) {
    const entries = months.map((month) =>
      demandByMonth.get(month).find((entry) => entry.product.id_producto === product.id_producto)
    );
    let activeMonths = entries.filter((entry) => entry.quantity > 0).length;
    let totalUnits = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const random = makeSeededRandom(`${RANDOM_SEED}:minimums:${product.id_producto}`);
    const zeroEntries = seededShuffle(entries.filter((entry) => entry.quantity === 0), random);

    while (activeMonths < 8 && zeroEntries.length > 0) {
      const entry = zeroEntries.pop();
      entry.quantity = product.demandSegment === "low" ? 1 : 2;
      activeMonths += 1;
      totalUnits += entry.quantity;
    }

    const sortedActive = entries
      .filter((entry) => entry.quantity > 0)
      .sort((left, right) => left.quantity - right.quantity);
    let cursor = 0;
    while (totalUnits < 15 && sortedActive.length > 0) {
      sortedActive[cursor % sortedActive.length].quantity += 1;
      totalUnits += 1;
      cursor += 1;
    }
  }
}

function pickUserForOrder(eligibleUsers, month, orderIndex, saleDate) {
  const candidates = eligibleUsers.filter((user) => user.createdAtDate <= saleDate);
  if (candidates.length === 0) return null;
  const random = makeSeededRandom(`${RANDOM_SEED}:user:${month}:${orderIndex}`);
  return candidates[Math.floor(random() * candidates.length)];
}

function productCountForOrder(random) {
  return chooseWeighted(
    [
      { value: 1, weight: 10 },
      { value: 2, weight: 25 },
      { value: 3, weight: 35 },
      { value: 4, weight: 20 },
      { value: 5, weight: 10 },
    ],
    random
  );
}

function quantityForItem(pending, random) {
  if (pending <= 1) return 1;
  const pick = random();
  const maxQuantity = Math.min(3, pending);
  if (pick < 0.8) return 1;
  if (pick < 0.95 && maxQuantity >= 2) return 2;
  return maxQuantity >= 3 ? 3 : maxQuantity;
}

function buildOrdersForMonth({ month, monthIndex, demandEntries, eligibleUsers }) {
  const pending = demandEntries
    .filter((entry) => entry.quantity > 0)
    .map((entry) => ({ ...entry, remaining: entry.quantity }));
  const orders = [];
  const items = [];
  let orderCounter = 1;

  while (pending.some((entry) => entry.remaining > 0)) {
    const random = makeSeededRandom(`${RANDOM_SEED}:order:${month}:${orderCounter}`);
    const saleDate = saleDateFor(month, orderCounter, eligibleUsers);
    const user = pickUserForOrder(eligibleUsers, month, orderCounter, saleDate);

    if (!user) {
      throw new Error(`No hay usuarios elegibles para la fecha ${saleDate.toISOString()} del mes ${month}.`);
    }

    const activePending = seededShuffle(
      pending.filter((entry) => entry.remaining > 0),
      random
    );
    const selectedCount = Math.min(productCountForOrder(random), activePending.length, 5);
    const selected = activePending.slice(0, Math.max(1, selectedCount));

    if (selected.length < 1 || selected.length > 5) {
      throw new Error("Cada orden debe contener entre 1 y 5 productos distintos.");
    }

    const selectedProductIds = selected.map((entry) => entry.product.id_producto);
    if (new Set(selectedProductIds).size !== selectedProductIds.length) {
      throw new Error("Una orden no puede contener productos repetidos.");
    }

    const orderId = deterministicUuid(`${SEED_NAME}:order:${month}:${orderCounter}`);
    const orderNumber = `${ORDER_PREFIX}${month.replace("-", "")}-${String(orderCounter).padStart(6, "0")}`;
    let orderSubtotalCents = 0;
    let orderDiscountCents = 0;
    let orderTotalCents = 0;

    for (let itemIndex = 0; itemIndex < selected.length; itemIndex += 1) {
      const entry = selected[itemIndex];
      const quantity = quantityForItem(entry.remaining, random);
      const lineBaseCents = quantity * entry.unitPriceCents;
      const discountRate = discountForLine(month, random);
      const discountCents = Math.min(
        lineBaseCents,
        Math.max(0, Math.round(lineBaseCents * discountRate))
      );
      const subtotalCents = lineBaseCents - discountCents;
      const itemId = deterministicUuid(`${SEED_NAME}:item:${month}:${orderCounter}:${itemIndex + 1}`);

      entry.remaining -= quantity;
      orderSubtotalCents += lineBaseCents;
      orderDiscountCents += discountCents;
      orderTotalCents += subtotalCents;

      items.push({
        id: itemId,
        orderId,
        itemType: "product",
        productId: entry.product.id_producto,
        membershipPlanId: null,
        quantity,
        unitPrice: centsToDecimal(entry.unitPriceCents),
        discountAmount: centsToDecimal(discountCents),
        subtotal: centsToDecimal(subtotalCents),
        itemNameSnapshot: entry.product.name,
        itemDescriptionSnapshot: entry.product.description ?? null,
        categorySnapshot: entry.product.categoryName,
        brandSnapshot: entry.product.brandName,
        productTypeSnapshot: entry.product.productType,
        durationDaysSnapshot: null,
        metadata: {
          synthetic: true,
          seedName: SEED_NAME,
          purpose: SEED_PURPOSE,
          month,
        },
        createdAt: saleDate,
        updatedAt: saleDate,
      });
    }

    orders.push({
      id: orderId,
      userId: user.id,
      orderNumber,
      status: "paid",
      channel: chooseChannel(monthIndex, random),
      subtotal: centsToDecimal(orderSubtotalCents),
      discountTotal: centsToDecimal(orderDiscountCents),
      taxTotal: "0.00",
      total: centsToDecimal(orderTotalCents),
      currency: "MXN",
      createdBy: null,
      paidAt: saleDate,
      cancelledAt: null,
      refundedAt: null,
      notes: NOTES,
      metadata: {
        synthetic: true,
        seedName: SEED_NAME,
        purpose: SEED_PURPOSE,
        month,
      },
      createdAt: saleDate,
      updatedAt: saleDate,
    });

    orderCounter += 1;
  }

  return { orders, items };
}

function buildSummaryFromPlan({ users, products, productPlan, months, monthStats, orders, items, inventoryBefore, inventoryAfter, validationErrors, warnings }) {
  const ordersByMonth = {};
  const orderItemsByMonth = {};
  const unitsByMonth = {};
  const revenueByMonth = {};
  const uniqueCustomersByMonth = {};
  const productsSoldByMonth = {};
  const ordersByChannel = {};
  const orderItemsByQuantity = {};
  const ordersByDistinctProductCount = {};
  const discountDistribution = { none: 0, moderate_5_10: 0, high_11_20: 0 };
  const itemProductIdsByOrder = new Map();
  let unitsSold = 0;
  let totalRevenueCents = 0;

  for (const order of orders) {
    const month = order.metadata.month;
    ordersByMonth[month] = (ordersByMonth[month] ?? 0) + 1;
    uniqueCustomersByMonth[month] ??= new Set();
    uniqueCustomersByMonth[month].add(order.userId);
    revenueByMonth[month] = (revenueByMonth[month] ?? 0) + Number(order.total);
    ordersByChannel[order.channel] = (ordersByChannel[order.channel] ?? 0) + 1;
  }

  for (const item of items) {
    const month = item.metadata.month;
    orderItemsByMonth[month] = (orderItemsByMonth[month] ?? 0) + 1;
    unitsByMonth[month] = (unitsByMonth[month] ?? 0) + Number(item.quantity);
    productsSoldByMonth[month] ??= new Set();
    productsSoldByMonth[month].add(item.productId);
    unitsSold += Number(item.quantity);
    totalRevenueCents += toCents(item.subtotal);
    orderItemsByQuantity[item.quantity] = (orderItemsByQuantity[item.quantity] ?? 0) + 1;
    itemProductIdsByOrder.set(item.orderId, [
      ...(itemProductIdsByOrder.get(item.orderId) ?? []),
      item.productId,
    ]);
    const baseCents = Number(item.quantity) * toCents(item.unitPrice);
    const discountPct = baseCents > 0 ? toCents(item.discountAmount) / baseCents : 0;
    if (discountPct === 0) discountDistribution.none += 1;
    else if (discountPct <= 0.1) discountDistribution.moderate_5_10 += 1;
    else discountDistribution.high_11_20 += 1;
  }

  for (const productIds of itemProductIdsByOrder.values()) {
    const count = productIds.length;
    ordersByDistinctProductCount[count] = (ordersByDistinctProductCount[count] ?? 0) + 1;
  }

  return {
    seedName: SEED_NAME,
    purpose: SEED_PURPOSE,
    randomSeed: RANDOM_SEED,
    startMonth: START_MONTH,
    endMonth: END_MONTH,
    months: months.length,
    usersExpected: users.usersExpected,
    usersFound: users.usersFound,
    usersUsed: new Set(orders.map((order) => order.userId)).size,
    productsFound: products.productsFound,
    productsUsed: new Set(items.map((item) => item.productId)).size,
    ordersCreated: orders.length,
    orderItemsCreated: items.length,
    unitsSold,
    averageItemsPerOrder: roundTwo(items.length / Math.max(1, orders.length)),
    averageUnitsPerOrder: roundTwo(unitsSold / Math.max(1, orders.length)),
    ordersByMonth,
    orderItemsByMonth,
    unitsByMonth,
    revenueByMonth: Object.fromEntries(
      Object.entries(revenueByMonth).map(([month, value]) => [month, roundTwo(value)])
    ),
    uniqueCustomersByMonth: Object.fromEntries(
      Object.entries(uniqueCustomersByMonth).map(([month, set]) => [month, set.size])
    ),
    productsSoldByMonth: Object.fromEntries(
      Object.entries(productsSoldByMonth).map(([month, set]) => [month, set.size])
    ),
    monthlyDemandPlan: monthStats,
    productDemandSegments: {
      high: productPlan.filter((product) => product.demandSegment === "high").length,
      medium: productPlan.filter((product) => product.demandSegment === "medium").length,
      low: productPlan.filter((product) => product.demandSegment === "low").length,
    },
    productTrendSegments: {
      growth: productPlan.filter((product) => product.trendSegment === "growth").length,
      stable: productPlan.filter((product) => product.trendSegment === "stable").length,
      decline: productPlan.filter((product) => product.trendSegment === "decline").length,
    },
    zeroSaleProductMonths: 0,
    zeroSaleProductMonthPercentage: 0,
    ordersByChannel,
    orderItemsByQuantity,
    ordersByDistinctProductCount,
    discountDistribution,
    inventoryBefore,
    inventoryAfter,
    validationErrors,
    warnings,
  };
}

function productMonthStats(products, months, items) {
  const grid = new Map();
  for (const product of products) {
    for (const month of months) {
      grid.set(`${product.id_producto}:${month}`, {
        product,
        month,
        units: 0,
        revenueCents: 0,
        discountCents: 0,
        baseCents: 0,
      });
    }
  }

  for (const item of items) {
    const key = `${item.productId}:${item.metadata.month}`;
    const entry = grid.get(key);
    if (!entry) continue;
    entry.units += Number(item.quantity);
    entry.revenueCents += toCents(item.subtotal);
    entry.discountCents += toCents(item.discountAmount);
    entry.baseCents += Number(item.quantity) * toCents(item.unitPrice);
  }

  return [...grid.values()];
}

function validatePlan({ users, months, products, productPlan, demandByMonth, orders, items, existingOrderNumbers, inventoryBefore, inventoryAfter }) {
  const validationErrors = [];
  const warnings = [];
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const userById = new Map(users.clientUsers.map((user) => [user.id, user]));
  const validProductIds = new Set(products.products.map((product) => product.id_producto));
  const itemsByOrder = new Map();

  for (const item of items) {
    itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
  }

  if (months.length !== 24 || months[0] !== START_MONTH || months.at(-1) !== END_MONTH) {
    validationErrors.push("El periodo no contiene exactamente los 24 meses esperados.");
  }

  for (const month of months) {
    if (!orders.some((order) => order.metadata.month === month)) {
      validationErrors.push(`Falta el mes ${month}.`);
    }
  }

  for (const order of orders) {
    const saleDate = new Date(order.paidAt ?? order.createdAt);
    const user = userById.get(order.userId);
    const orderItems = itemsByOrder.get(order.id) ?? [];
    const productIds = orderItems.map((item) => item.productId);

    if (existingOrderNumbers.has(order.orderNumber)) {
      validationErrors.push(`Numero de orden ya existente: ${order.orderNumber}.`);
    }
    if (!user || saleDate < user.createdAtDate) {
      validationErrors.push(`Orden anterior al registro del cliente: ${order.orderNumber}.`);
    }
    if (saleDate < START_DATE || saleDate > END_DATE || monthKey(saleDate) !== order.metadata.month) {
      validationErrors.push(`Fecha fuera del periodo/mes: ${order.orderNumber}.`);
    }
    if (orderItems.length < 1 || orderItems.length > 5) {
      validationErrors.push(`Orden con ${orderItems.length} productos: ${order.orderNumber}.`);
    }
    if (new Set(productIds).size !== productIds.length) {
      validationErrors.push(`Producto repetido en orden: ${order.orderNumber}.`);
    }

    const itemBaseCents = orderItems.reduce(
      (sum, item) => sum + Number(item.quantity) * toCents(item.unitPrice),
      0
    );
    const itemDiscountCents = orderItems.reduce(
      (sum, item) => sum + toCents(item.discountAmount),
      0
    );
    const itemSubtotalCents = orderItems.reduce(
      (sum, item) => sum + toCents(item.subtotal),
      0
    );
    const taxCents = toCents(order.taxTotal);
    if (
      toCents(order.subtotal) !== itemBaseCents ||
      toCents(order.discountTotal) !== itemDiscountCents ||
      toCents(order.total) !== itemSubtotalCents + taxCents
    ) {
      validationErrors.push(`Totales incorrectos en orden: ${order.orderNumber}.`);
    }
  }

  for (const item of items) {
    const lineBase = Number(item.quantity) * toCents(item.unitPrice);
    if (!validProductIds.has(item.productId)) validationErrors.push(`Producto inexistente: ${item.productId}.`);
    if (item.quantity < 1 || item.quantity > 3) validationErrors.push(`Quantity fuera de rango en ${item.id}.`);
    if (toCents(item.discountAmount) < 0 || toCents(item.discountAmount) > lineBase) {
      validationErrors.push(`Descuento invalido en ${item.id}.`);
    }
    if (toCents(item.subtotal) < 0 || toCents(item.subtotal) !== lineBase - toCents(item.discountAmount)) {
      validationErrors.push(`Subtotal invalido en ${item.id}.`);
    }
  }

  const totalOrders = orders.length;
  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const averageItemsPerOrder = totalItems / Math.max(1, totalOrders);
  const averageUnitsPerOrder = totalUnits / Math.max(1, totalOrders);

  if (totalOrders < 6000 || totalOrders > 8000) {
    validationErrors.push(`Orders fuera de rango: ${totalOrders}.`);
  }
  if (totalItems < 16000 || totalItems > 24000) {
    validationErrors.push(`OrderItems fuera de rango: ${totalItems}.`);
  }
  if (averageItemsPerOrder < 2.5 || averageItemsPerOrder > 3.3) {
    validationErrors.push(`AverageItemsPerOrder fuera de rango: ${roundTwo(averageItemsPerOrder)}.`);
  }
  if (averageUnitsPerOrder < 3 || averageUnitsPerOrder > 4.5) {
    validationErrors.push(`AverageUnitsPerOrder fuera de rango: ${roundTwo(averageUnitsPerOrder)}.`);
  }

  const productStats = productMonthStats(productPlan, months, items);
  const zeroProductMonths = productStats.filter((entry) => entry.units === 0).length;
  const zeroPercentage = formatPercent(zeroProductMonths, productStats.length);
  if (zeroProductMonths === 0 || zeroPercentage < 10 || zeroPercentage > 25) {
    validationErrors.push(`Producto-mes con cero ventas fuera de rango: ${zeroPercentage}%.`);
  }

  const statsByProduct = new Map();
  for (const entry of productStats) {
    if (!statsByProduct.has(entry.product.id_producto)) {
      statsByProduct.set(entry.product.id_producto, {
        product: entry.product,
        monthsWithSales: 0,
        totalUnits: 0,
        quantities: [],
      });
    }
    const stat = statsByProduct.get(entry.product.id_producto);
    if (entry.units > 0) stat.monthsWithSales += 1;
    stat.totalUnits += entry.units;
    stat.quantities.push(entry.units);
  }

  for (const stat of statsByProduct.values()) {
    if (stat.monthsWithSales < 8) {
      validationErrors.push(`${stat.product.name} aparece en ${stat.monthsWithSales} meses.`);
    }
    if (stat.totalUnits < 15) {
      validationErrors.push(`${stat.product.name} acumula ${stat.totalUnits} unidades.`);
    }
    if (new Set(stat.quantities).size === 1) {
      validationErrors.push(`${stat.product.name} tiene cantidad mensual constante.`);
    }
  }

  for (const month of months) {
    const plannedUnits = demandByMonth.get(month).reduce((sum, entry) => sum + entry.quantity, 0);
    const actualUnits = items
      .filter((item) => item.metadata.month === month)
      .reduce((sum, item) => sum + Number(item.quantity), 0);
    if (actualUnits !== plannedUnits) {
      validationErrors.push(`Demanda mensual no coincide en ${month}: plan ${plannedUnits}, items ${actualUnits}.`);
    }
    if (actualUnits < 880 || actualUnits > 1300) {
      validationErrors.push(`Demanda mensual fuera de rango razonable en ${month}: ${actualUnits}.`);
    }
    if (actualUnits / totalUnits > 0.15) {
      validationErrors.push(`El mes ${month} concentra mas del 15% de unidades.`);
    }
  }

  if (snapshotDiff(inventoryBefore, inventoryAfter).length > 0) {
    validationErrors.push("Se detecto cambio en productos, stock o inventario.");
  }

  return { validationErrors, warnings, zeroProductMonths, zeroPercentage };
}

function printMonthlyTable(summary) {
  console.log("Mes | Orders | OrderItems | Unidades | Productos | Clientes | Ingresos");
  for (const month of Object.keys(summary.ordersByMonth).sort()) {
    console.log(
      `${month} | ${summary.ordersByMonth[month]} | ${summary.orderItemsByMonth[month]} | ${summary.unitsByMonth[month]} | ${summary.productsSoldByMonth[month]} | ${summary.uniqueCustomersByMonth[month]} | ${summary.revenueByMonth[month]}`
    );
  }
}

async function loadExistingSeedState() {
  const existingOrders = await Order.findAll({
    where: {
      [Op.or]: [
        { orderNumber: { [Op.like]: `${ORDER_PREFIX}%` } },
        where(literal(`"Order"."metadata"->>'seedName'`), SEED_NAME),
      ],
    },
    attributes: ["id", "orderNumber", "createdAt", "paidAt", "metadata"],
    raw: true,
  });
  const orderIds = existingOrders.map((order) => order.id);
  const orderItems = orderIds.length
    ? await OrderItem.findAll({
        where: { orderId: { [Op.in]: orderIds } },
        attributes: ["id", "orderId", "quantity"],
        raw: true,
      })
    : [];

  return { existingOrders, orderItems };
}

async function loadExistingOrderNumbers() {
  const rows = await Order.findAll({
    where: { orderNumber: { [Op.like]: `${ORDER_PREFIX}%` } },
    attributes: ["orderNumber"],
    raw: true,
  });
  return new Set(rows.map((row) => row.orderNumber));
}

function validateUserEligibility(users, months) {
  const usersByMonth = {};
  const validationErrors = [];

  for (const month of months) {
    const end = monthEnd(month);
    const eligible = users.clientUsers.filter((user) => user.createdAtDate <= end);
    usersByMonth[month] = eligible.length;
    if (eligible.length === 0) {
      validationErrors.push(`El mes ${month} no tiene clientes elegibles.`);
    }
  }

  return { usersByMonth, validationErrors };
}

function buildPlan({ users, products, months, existingOrderNumbers, inventoryBefore }) {
  const eligibility = validateUserEligibility(users, months);
  const inventoryAfter = { ...inventoryBefore };
  const initialValidationErrors = [
    ...(users.validationErrors ?? []),
    ...eligibility.validationErrors,
  ];

  if (initialValidationErrors.length > 0) {
    return {
      orders: [],
      items: [],
      productPlan: [],
      demandByMonth: new Map(),
      monthStats: [],
      summary: buildSummaryFromPlan({
        users,
        products,
        productPlan: [],
        months,
        monthStats: [],
        orders: [],
        items: [],
        inventoryBefore,
        inventoryAfter,
        validationErrors: initialValidationErrors,
        warnings: [
          "No se insertaran ventas si los usuarios historicos de regresion no estan completos y elegibles.",
        ],
      }),
      usersByMonth: eligibility.usersByMonth,
    };
  }

  const { classifiedProducts, demandByMonth, monthStats } = generateDemandPlan(
    products.products,
    months
  );
  const orders = [];
  const items = [];

  for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
    const month = months[monthIndex];
    const eligibleUsers = users.clientUsers.filter((user) => user.createdAtDate <= monthEnd(month));
    const monthPlan = buildOrdersForMonth({
      month,
      monthIndex,
      demandEntries: demandByMonth.get(month),
      eligibleUsers,
    });
    orders.push(...monthPlan.orders);
    items.push(...monthPlan.items);
  }

  const validation = validatePlan({
    users,
    months,
    products,
    productPlan: classifiedProducts,
    demandByMonth,
    orders,
    items,
    existingOrderNumbers,
    inventoryBefore,
    inventoryAfter,
  });
  const summary = buildSummaryFromPlan({
    users,
    products,
    productPlan: classifiedProducts,
    months,
    monthStats,
    orders,
    items,
    inventoryBefore,
    inventoryAfter,
    validationErrors: validation.validationErrors,
    warnings: validation.warnings,
  });
  summary.zeroSaleProductMonths = validation.zeroProductMonths;
  summary.zeroSaleProductMonthPercentage = validation.zeroPercentage;

  return {
    orders,
    items,
    productPlan: classifiedProducts,
    demandByMonth,
    monthStats,
    summary,
    usersByMonth: eligibility.usersByMonth,
  };
}

function printPlanSummary({ plan, users, products }) {
  const summary = plan.summary;
  console.log("Modo de simulacion");
  console.log(`Seed: ${SEED_NAME}`);
  console.log(`Total de meses: ${summary.months}`);
  console.log(`Primer mes: ${summary.startMonth}`);
  console.log(`Ultimo mes: ${summary.endMonth}`);
  console.log(`Usuarios esperados: ${users.usersExpected}`);
  console.log(`Usuarios encontrados: ${users.usersFound}`);
  console.log(`Usuarios con rol cliente: ${users.clientUsers.length}`);
  console.log(`Fecha minima User.createdAt: ${users.minCreatedAt}`);
  console.log(`Fecha maxima User.createdAt: ${users.maxCreatedAt}`);
  console.log(`Usuarios elegibles por mes: ${JSON.stringify(plan.usersByMonth)}`);
  console.log(`Productos encontrados: ${products.productsFound}`);
  console.log(`Productos validos: ${products.products.length}`);
  console.log(`Productos excluidos: ${products.excluded.length}`);
  console.log(`Orders planeadas: ${summary.ordersCreated}`);
  console.log(`OrderItems planeados: ${summary.orderItemsCreated}`);
  console.log(`Unidades planeadas: ${summary.unitsSold}`);
  console.log(`AverageItemsPerOrder: ${summary.averageItemsPerOrder}`);
  console.log(`AverageUnitsPerOrder: ${summary.averageUnitsPerOrder}`);
  console.log(`Orders por mes: ${JSON.stringify(summary.ordersByMonth)}`);
  console.log(`OrderItems por mes: ${JSON.stringify(summary.orderItemsByMonth)}`);
  console.log(`Unidades por mes: ${JSON.stringify(summary.unitsByMonth)}`);
  console.log(`Productos vendidos por mes: ${JSON.stringify(summary.productsSoldByMonth)}`);
  console.log(`Clientes unicos por mes: ${JSON.stringify(summary.uniqueCustomersByMonth)}`);
  console.log(`Ingresos por mes: ${JSON.stringify(summary.revenueByMonth)}`);
  console.log(`Productos de demanda alta: ${summary.productDemandSegments.high}`);
  console.log(`Productos de demanda media: ${summary.productDemandSegments.medium}`);
  console.log(`Productos de demanda baja: ${summary.productDemandSegments.low}`);
  console.log(`Productos con tendencia positiva: ${summary.productTrendSegments.growth}`);
  console.log(`Productos estables: ${summary.productTrendSegments.stable}`);
  console.log(`Productos con tendencia negativa: ${summary.productTrendSegments.decline}`);
  console.log(`Producto-mes con cero ventas: ${summary.zeroSaleProductMonths}`);
  console.log(`Porcentaje producto-mes con cero ventas: ${summary.zeroSaleProductMonthPercentage}%`);
  console.log(`Distribucion de quantity: ${JSON.stringify(summary.orderItemsByQuantity)}`);
  console.log(`Distribucion de productos por orden: ${JSON.stringify(summary.ordersByDistinctProductCount)}`);
  console.log(`Distribucion por canal: ${JSON.stringify(summary.ordersByChannel)}`);
  console.log(`Distribucion de descuentos: ${JSON.stringify(summary.discountDistribution)}`);
  console.log(`Errores de validacion: ${summary.validationErrors.length}`);
  if (summary.validationErrors.length > 0) {
    console.log("ValidationErrors:");
    for (const error of summary.validationErrors) console.log(`- ${error}`);
  }
  if (summary.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of summary.warnings) console.log(`- ${warning}`);
  }
}

async function cleanupSeed({ confirm }) {
  const state = await loadExistingSeedState();
  const orderIds = state.existingOrders.map((order) => order.id);
  const minDate = state.existingOrders.length
    ? new Date(Math.min(...state.existingOrders.map((order) => new Date(order.paidAt ?? order.createdAt)))).toISOString()
    : null;
  const maxDate = state.existingOrders.length
    ? new Date(Math.max(...state.existingOrders.map((order) => new Date(order.paidAt ?? order.createdAt)))).toISOString()
    : null;

  console.log("Modo cleanup");
  console.log(`Orders encontradas: ${state.existingOrders.length}`);
  console.log(`OrderItems encontrados: ${state.orderItems.length}`);
  console.log(`Fecha minima: ${minDate}`);
  console.log(`Fecha maxima: ${maxDate}`);

  if (!confirm) {
    console.log("Falta --confirm. No se elimino nada.");
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    let deletedItems = 0;
    let deletedOrders = 0;
    if (orderIds.length > 0) {
      deletedItems = await OrderItem.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
      deletedOrders = await Order.destroy({
        where: { id: { [Op.in]: orderIds } },
        transaction,
      });
    }
    await transaction.commit();
    await rm(CONTROL_FILE, { force: true });
    await rm(SUMMARY_FILE, { force: true });
    console.log(`OrderItems eliminados: ${deletedItems}`);
    console.log(`Orders eliminadas: ${deletedOrders}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function insertPlan({ plan }) {
  const transaction = await sequelize.transaction();
  const startTime = Date.now();
  try {
    for (let offset = 0; offset < plan.orders.length; offset += ORDER_BATCH_SIZE) {
      const batch = plan.orders.slice(offset, offset + ORDER_BATCH_SIZE);
      await Order.bulkCreate(batch, { transaction, validate: true });
      console.log(
        `Orders insertadas: ${Math.min(offset + batch.length, plan.orders.length)}/${plan.orders.length}`
      );
      console.log(`Tiempo transcurrido: ${roundTwo((Date.now() - startTime) / 1000)}s`);
    }

    for (let offset = 0; offset < plan.items.length; offset += ORDER_ITEM_BATCH_SIZE) {
      const batch = plan.items.slice(offset, offset + ORDER_ITEM_BATCH_SIZE);
      await OrderItem.bulkCreate(batch, { transaction, validate: true });
      console.log(
        `OrderItems insertados: ${Math.min(offset + batch.length, plan.items.length)}/${plan.items.length}`
      );
      console.log(`Tiempo transcurrido: ${roundTwo((Date.now() - startTime) / 1000)}s`);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function verifyCommittedLoad() {
  const [rows] = await sequelize.query(
    `
WITH seed_orders AS (
  SELECT *
  FROM core."Orders"
  WHERE "metadata"->>'seedName' = :seedName
    AND "orderNumber" LIKE :prefix
),
seed_items AS (
  SELECT oi.*
  FROM core."OrderItems" oi
  JOIN seed_orders o ON o."id" = oi."orderId"
),
order_product_counts AS (
  SELECT "orderId", COUNT(*)::int AS count, COUNT(DISTINCT "productId")::int AS distinct_count
  FROM seed_items
  GROUP BY "orderId"
),
monthly AS (
  SELECT
    o."metadata"->>'month' AS month,
    COUNT(DISTINCT o."id")::int AS orders,
    COUNT(si."id")::int AS order_items,
    COALESCE(SUM(si."quantity"), 0)::int AS units,
    COUNT(DISTINCT si."productId")::int AS products,
    COUNT(DISTINCT o."userId")::int AS customers,
    COALESCE(SUM(si."subtotal"::numeric), 0)::numeric(14,2) AS revenue
  FROM seed_orders o
  LEFT JOIN seed_items si ON si."orderId" = o."id"
  GROUP BY o."metadata"->>'month'
)
SELECT
  (SELECT COUNT(*)::int FROM seed_orders) AS "ordersFound",
  (SELECT COUNT(*)::int FROM seed_items) AS "orderItemsFound",
  (SELECT COALESCE(SUM("quantity"), 0)::int FROM seed_items) AS "unitsSold",
  (SELECT COUNT(DISTINCT "metadata"->>'month')::int FROM seed_orders) AS "monthsCovered",
  (SELECT MIN("metadata"->>'month') FROM seed_orders) AS "firstMonth",
  (SELECT MAX("metadata"->>'month') FROM seed_orders) AS "lastMonth",
  (SELECT MIN(orders)::int FROM monthly) AS "minOrdersByMonth",
  (SELECT MAX(orders)::int FROM monthly) AS "maxOrdersByMonth",
  (SELECT ROUND(AVG(orders)::numeric, 2) FROM monthly) AS "avgOrdersByMonth",
  (SELECT MIN(products)::int FROM monthly) AS "minProductsByMonth",
  (SELECT MAX(products)::int FROM monthly) AS "maxProductsByMonth",
  (SELECT COUNT(DISTINCT "productId")::int FROM seed_items) AS "uniqueProductsSold",
  (SELECT COUNT(DISTINCT "userId")::int FROM seed_orders) AS "uniqueCustomersUsed",
  (SELECT COUNT(*)::int FROM order_product_counts WHERE count > 5) AS "ordersWithMoreThan5Products",
  (SELECT COUNT(*)::int FROM seed_orders o LEFT JOIN order_product_counts c ON c."orderId" = o."id" WHERE COALESCE(c.count, 0) = 0) AS "ordersWithoutProducts",
  (SELECT COUNT(*)::int FROM order_product_counts WHERE count <> distinct_count) AS "ordersWithRepeatedProducts",
  (SELECT COUNT(*)::int FROM seed_items WHERE "quantity" < 1 OR "quantity" > 3) AS "itemsQuantityOutOfRange",
  (SELECT COUNT(*)::int FROM seed_items si LEFT JOIN core."Products" p ON p."id_producto" = si."productId" WHERE p."id_producto" IS NULL) AS "itemsWithMissingProduct",
  (SELECT COUNT(*)::int FROM seed_orders o WHERE EXISTS (
    SELECT 1
    FROM seed_items si
    WHERE si."orderId" = o."id"
    GROUP BY si."orderId"
    HAVING ROUND(SUM(si."quantity" * si."unitPrice"::numeric), 2) <> o."subtotal"::numeric
      OR ROUND(SUM(si."discountAmount"::numeric), 2) <> o."discountTotal"::numeric
      OR ROUND(SUM(si."subtotal"::numeric) + o."taxTotal"::numeric, 2) <> o."total"::numeric
  )) AS "ordersWithIncorrectTotal",
  (SELECT COUNT(*)::int FROM seed_orders o JOIN core."Users" u ON u."id" = o."userId" WHERE COALESCE(o."paidAt", o."createdAt") < u."createdAt") AS "ordersBeforeUserRegistration",
  (SELECT COUNT(*)::int FROM seed_orders WHERE COALESCE("paidAt", "createdAt") < :startDate OR COALESCE("paidAt", "createdAt") > :endDate OR to_char(COALESCE("paidAt", "createdAt") AT TIME ZONE 'UTC', 'YYYY-MM') <> "metadata"->>'month') AS "datesOutOfPeriod",
  (SELECT COUNT(*)::int FROM (SELECT "orderNumber" FROM seed_orders GROUP BY "orderNumber" HAVING COUNT(*) > 1) duplicates) AS "duplicateOrderNumbers",
  (SELECT jsonb_object_agg(month, jsonb_build_object('orders', orders, 'orderItems', order_items, 'units', units, 'products', products, 'customers', customers, 'revenue', revenue)) FROM monthly) AS "monthlyTable";
`,
    {
      replacements: {
        seedName: SEED_NAME,
        prefix: `${ORDER_PREFIX}%`,
        startDate: START_DATE,
        endDate: END_DATE,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows;
}

async function writeManifestAndSummary(plan, verification, inventoryBefore, inventoryAfter) {
  await writeJsonAtomic(CONTROL_FILE, {
    seedName: SEED_NAME,
    purpose: SEED_PURPOSE,
    randomSeed: RANDOM_SEED,
    startMonth: START_MONTH,
    endMonth: END_MONTH,
    months: 24,
    orderIds: plan.orders.map((order) => order.id),
    orderNumbers: plan.orders.map((order) => order.orderNumber),
    orderItemIds: plan.items.map((item) => item.id),
  });

  await writeJsonAtomic(SUMMARY_FILE, {
    ...plan.summary,
    inventoryBefore,
    inventoryAfter,
    verification,
  });
}

async function runCheckOrApply({ apply }) {
  const months = buildMonths();
  const beforeProtected = await protectedSnapshot();
  const inventoryBefore = await inventorySnapshot();
  const [users, products, existingState, existingOrderNumbers] = await Promise.all([
    loadSeedUsers(),
    loadProducts(),
    loadExistingSeedState(),
    loadExistingOrderNumbers(),
  ]);

  if (existingState.existingOrders.length > 0) {
    console.log(`La carga ${SEED_NAME} ya existe.`);
    console.log(`Orders encontradas: ${existingState.existingOrders.length}`);
    console.log(`OrderItems encontrados: ${existingState.orderItems.length}`);
    console.log("Orders creadas en esta ejecucion: 0");
    console.log("OrderItems creados en esta ejecucion: 0");
    const verification = await verifyCommittedLoad();
    console.log(JSON.stringify(verification, null, 2));
    return;
  }

  const plan = buildPlan({
    users,
    products,
    months,
    existingOrderNumbers,
    inventoryBefore,
  });
  printPlanSummary({ plan, users, products });

  if (plan.summary.validationErrors.length > 0) {
    throw new Error(
      `La simulacion contiene errores; no se insertaron datos:\n- ${plan.summary.validationErrors.join("\n- ")}`
    );
  }

  if (!apply) {
    console.log("No se realizaron inserciones");
    return;
  }

  await insertPlan({ plan });

  const inventoryAfter = await inventorySnapshot();
  const afterProtected = await protectedSnapshot();
  const changedProtectedKeys = snapshotDiff(
    {
      ...beforeProtected,
      orders: undefined,
      orderItems: undefined,
    },
    {
      ...afterProtected,
      orders: undefined,
      orderItems: undefined,
    }
  ).filter((key) => !["orders", "orderItems"].includes(key));

  if (snapshotDiff(inventoryBefore, inventoryAfter).length > 0 || changedProtectedKeys.length > 0) {
    throw new Error(
      `Se detectaron cambios no permitidos despues del commit: ${[
        ...snapshotDiff(inventoryBefore, inventoryAfter),
        ...changedProtectedKeys,
      ].join(", ")}`
    );
  }

  const verification = await verifyCommittedLoad();
  await writeManifestAndSummary(plan, verification, inventoryBefore, inventoryAfter);
  console.log("Carga insertada y verificada");
  console.log(JSON.stringify(verification, null, 2));
  printMonthlyTable(plan.summary);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const cleanup = args.includes("--cleanup");
  const confirm = args.includes("--confirm");
  const validArgs = new Set(["--apply", "--cleanup", "--confirm"]);
  const unknownArgs = args.filter((arg) => !validArgs.has(arg));

  if (unknownArgs.length > 0) {
    throw new Error(`Argumentos no reconocidos: ${unknownArgs.join(", ")}`);
  }

  if (apply && cleanup) {
    throw new Error("Usa solamente --apply o --cleanup, no ambos.");
  }

  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    if (cleanup) {
      await cleanupSeed({ confirm });
      return;
    }

    await runCheckOrApply({ apply });
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en seedMonthlySalesRegressionData:", error);
  process.exit(1);
});
