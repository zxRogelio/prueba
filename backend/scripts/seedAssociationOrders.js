import { Op, QueryTypes } from "sequelize";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  Order,
  OrderItem,
  Product,
  User,
} from "../models/index.js";
import { ORDER_CHANNELS } from "../models/Order.js";

const TOTAL_ORDERS = 2000;
const TEST_USER_COUNT = 500;
const SEED_NAME = "association-rules-v1";
const SEED_PURPOSE = "apriori-fpgrowth";
const RANDOM_SEED = "TITANIUM_ASSOCIATION_SEED_2026";
const ORDER_PREFIX = "AR-2026-";
const SYNTHETIC_NOTES = "Orden sintetica para reglas de asociacion";
const START_DATE = Date.UTC(2026, 0, 8, 0, 0, 0, 0);
const END_DATE = Date.UTC(2026, 6, 20, 23, 59, 59, 999);
const MAX_PRODUCTS_PER_ORDER = 5;
const MAX_PRODUCT_OCCURRENCES = Math.floor(TOTAL_ORDERS * 0.45);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/seed500TestUsers.json"
);

const ORDER_SIZE_COUNTS = Object.freeze({
  1: 100,
  2: 500,
  3: 700,
  4: 500,
  5: 200,
});

const USER_ORDER_COUNTS = Object.freeze([
  { users: 50, orders: 2 },
  { users: 100, orders: 3 },
  { users: 200, orders: 4 },
  { users: 100, orders: 5 },
  { users: 50, orders: 6 },
]);

const DESIRED_CHANNEL_WEIGHTS = Object.freeze({
  online: 0.5,
  reception: 0.3,
  mobile: 0.2,
});

const POOL_KEYWORDS = Object.freeze({
  whey: [
    "whey",
    "proteina",
    "protein",
    "isolate protein",
    "hydrowhey",
    "nitro tech",
  ],
  creatine: ["creatina", "creatine"],
  shaker: ["shaker bottle", "stainless shaker", "shaker"],
  preWorkout: [
    "pre entreno",
    "pre workout",
    "c4 original",
    "c4 ripped",
    "c4 ultimate",
    "gold standard pre",
  ],
  bcaa: ["bcaa", "amino energy"],
  eaa: ["eaa", "essential amino"],
  hydration: ["hydration", "electrolyte"],
  glutamine: ["glutamine", "glutamina"],
  multivitamin: ["multivitamin", "multi vitamin"],
  massGainer: ["mass gainer", "gainer", "serious mass"],
  tee: [
    "playera",
    "training tee",
    "oversized tee",
    "graphic tee",
    "yoga studio tee",
    "shirt",
    "tank",
    "long sleeve",
    "sweatshirt",
    "hoodie",
  ],
  short: ["short", "shorts"],
  jogger: ["jogger", "joggers", "training pants", "track pants"],
  leggings: ["leggings"],
  sportsBra: ["sports bra"],
  top: ["seamless top", "training tank", "aeroready tank", "core cotton tank"],
  gloves: ["guantes", "gloves", "wristwrap gloves", "grip gloves"],
  belt: ["belt", "cinturon"],
  straps: ["lifting straps", "figure 8 lifting straps", "ab straps"],
  wraps: ["wrist wraps", "knee wraps", "wristwrap"],
  kneeWraps: ["knee wraps"],
  towel: ["towel", "toalla"],
  mat: ["yoga mat", "durafoam mat"],
  block: ["yoga block"],
  rope: ["jump rope", "speed rope", "weighted jump rope"],
  roller: ["massage roller", "foam roller", "forearm roller", "wrist roller"],
  band: ["resistance band", "mini band", "hip band"],
  bag: ["duffel bag", "drawstring bag"],
  bottle: ["bottle", "shaker"],
});

const PATTERN_TEMPLATES = Object.freeze([
  {
    name: "whey-creatine-shaker",
    groups: ["whey", "creatine", "shaker"],
    fill: ["whey", "creatine", "shaker", "supplement"],
  },
  {
    name: "creatine-shaker",
    groups: ["creatine", "shaker"],
    fill: ["creatine", "shaker", "supplement"],
  },
  {
    name: "pre-bcaa",
    groups: ["preWorkout", "bcaa"],
    fill: ["preWorkout", "bcaa", "eaa", "hydration"],
  },
  {
    name: "pre-creatine",
    groups: ["preWorkout", "creatine"],
    fill: ["preWorkout", "creatine", "supplement"],
  },
  {
    name: "whey-shaker",
    groups: ["whey", "shaker"],
    fill: ["whey", "shaker", "supplement"],
  },
  {
    name: "whey-creatine",
    groups: ["whey", "creatine"],
    fill: ["whey", "creatine", "supplement"],
  },
  {
    name: "amino-hydration",
    groups: ["bcaa", "hydration"],
    fill: ["bcaa", "eaa", "hydration"],
  },
  {
    name: "eaa-hydration",
    groups: ["eaa", "hydration"],
    fill: ["bcaa", "eaa", "hydration"],
  },
  {
    name: "protein-multivitamin",
    groups: ["whey", "multivitamin"],
    fill: ["whey", "multivitamin", "supplement"],
  },
  {
    name: "protein-glutamine",
    groups: ["whey", "glutamine"],
    fill: ["whey", "glutamine", "supplement"],
  },
  {
    name: "mass-creatine-shaker",
    groups: ["massGainer", "creatine", "shaker"],
    fill: ["massGainer", "creatine", "shaker", "supplement"],
  },
  {
    name: "tee-short",
    groups: ["tee", "short"],
    fill: ["tee", "short", "apparel"],
  },
  {
    name: "tee-jogger",
    groups: ["tee", "jogger"],
    fill: ["tee", "jogger", "apparel"],
  },
  {
    name: "top-leggings",
    groups: ["top", "leggings"],
    fill: ["top", "sportsBra", "leggings", "apparel"],
  },
  {
    name: "bra-leggings",
    groups: ["sportsBra", "leggings"],
    fill: ["sportsBra", "leggings", "apparel"],
  },
  {
    name: "gloves-belt",
    groups: ["gloves", "belt"],
    fill: ["gloves", "belt", "straps", "wraps", "accessory"],
  },
  {
    name: "gloves-wraps",
    groups: ["gloves", "wraps"],
    fill: ["gloves", "wraps", "straps", "accessory"],
  },
  {
    name: "belt-straps",
    groups: ["belt", "straps"],
    fill: ["belt", "straps", "gloves", "accessory"],
  },
  {
    name: "knee-wrist-wraps",
    groups: ["kneeWraps", "wraps"],
    fill: ["kneeWraps", "wraps", "accessory"],
  },
  {
    name: "shaker-towel",
    groups: ["shaker", "towel"],
    fill: ["shaker", "towel", "accessory"],
  },
  {
    name: "bag-towel-shaker",
    groups: ["bag", "towel", "shaker"],
    fill: ["bag", "towel", "shaker", "accessory"],
  },
  {
    name: "yoga-kit",
    groups: ["mat", "block", "band"],
    fill: ["mat", "block", "band", "accessory"],
  },
  {
    name: "rope-towel",
    groups: ["rope", "towel"],
    fill: ["rope", "towel", "accessory"],
  },
  {
    name: "roller-band",
    groups: ["roller", "band"],
    fill: ["roller", "band", "accessory"],
  },
  {
    name: "band-mini-band",
    groups: ["band", "band"],
    fill: ["band", "accessory"],
  },
  {
    name: "whey-shaker-gloves",
    groups: ["whey", "shaker", "gloves"],
    fill: ["whey", "shaker", "gloves", "supplement", "accessory"],
  },
  {
    name: "creatine-shaker-towel",
    groups: ["creatine", "shaker", "towel"],
    fill: ["creatine", "shaker", "towel", "supplement", "accessory"],
  },
  {
    name: "pre-shaker",
    groups: ["preWorkout", "shaker"],
    fill: ["preWorkout", "shaker", "supplement"],
  },
  {
    name: "tee-short-shaker",
    groups: ["tee", "short", "shaker"],
    fill: ["tee", "short", "shaker", "apparel", "accessory"],
  },
  {
    name: "leggings-bra-bottle",
    groups: ["leggings", "sportsBra", "bottle"],
    fill: ["leggings", "sportsBra", "bottle", "apparel", "accessory"],
  },
]);

function makeSeededRandom(seed) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return function random() {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
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

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function shuffle(items, random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [
      shuffled[targetIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function chooseWeighted(items, weightFor, random) {
  if (items.length === 0) {
    return null;
  }

  const weightedItems = items.map((item) => ({
    item,
    weight: Math.max(0.0001, weightFor(item)),
  }));
  const totalWeight = weightedItems.reduce(
    (sum, weighted) => sum + weighted.weight,
    0
  );
  let cursor = random() * totalWeight;

  for (const weighted of weightedItems) {
    cursor -= weighted.weight;

    if (cursor <= 0) {
      return weighted.item;
    }
  }

  return weightedItems[weightedItems.length - 1].item;
}

function chooseByConfiguredWeights(weightedItems, random) {
  return chooseWeighted(weightedItems, (item) => item.weight, random);
}

function orderNumberFor(index) {
  return `${ORDER_PREFIX}${String(index + 1).padStart(6, "0")}`;
}

function parseCents(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

function formatCents(value) {
  return (value / 100).toFixed(2);
}

function sumCents(products) {
  return products.reduce((sum, product) => sum + product.priceCents, 0);
}

function buildOrderSizes(random) {
  const sizes = Object.entries(ORDER_SIZE_COUNTS).flatMap(([size, count]) =>
    Array.from({ length: count }, () => Number(size))
  );

  if (sizes.length !== TOTAL_ORDERS) {
    throw new Error(
      `La distribucion de productos genero ${sizes.length} ordenes; se esperaban ${TOTAL_ORDERS}.`
    );
  }

  return shuffle(sizes, random);
}

function buildPatternFlags(random) {
  const patternOrders = Math.round(TOTAL_ORDERS * 0.65);
  const flags = [
    ...Array.from({ length: patternOrders }, () => true),
    ...Array.from({ length: TOTAL_ORDERS - patternOrders }, () => false),
  ];

  return shuffle(flags, random);
}

function buildChannelPlan(random) {
  const availableChannels = ORDER_CHANNELS.filter(
    (channel) => DESIRED_CHANNEL_WEIGHTS[channel] != null
  );

  if (availableChannels.length === 0) {
    throw new Error("No hay canales compatibles definidos en ORDER_CHANNELS.");
  }

  const totalConfiguredWeight = availableChannels.reduce(
    (sum, channel) => sum + DESIRED_CHANNEL_WEIGHTS[channel],
    0
  );
  const counts = new Map();
  let assigned = 0;

  for (const channel of availableChannels) {
    const count = Math.floor(
      (TOTAL_ORDERS * DESIRED_CHANNEL_WEIGHTS[channel]) / totalConfiguredWeight
    );
    counts.set(channel, count);
    assigned += count;
  }

  const remainders = availableChannels
    .map((channel) => ({
      channel,
      remainder:
        (TOTAL_ORDERS * DESIRED_CHANNEL_WEIGHTS[channel]) /
          totalConfiguredWeight -
        counts.get(channel),
    }))
    .sort((left, right) => right.remainder - left.remainder);

  for (let index = 0; assigned < TOTAL_ORDERS; index += 1) {
    const channel = remainders[index % remainders.length].channel;
    counts.set(channel, counts.get(channel) + 1);
    assigned += 1;
  }

  return shuffle(
    [...counts.entries()].flatMap(([channel, count]) =>
      Array.from({ length: count }, () => channel)
    ),
    random
  );
}

function buildUserAssignments(users, random) {
  const shuffledUsers = shuffle(users, random);
  const assignments = [];
  let userIndex = 0;

  for (const group of USER_ORDER_COUNTS) {
    for (let offset = 0; offset < group.users; offset += 1) {
      const user = shuffledUsers[userIndex];
      userIndex += 1;

      for (let orderCount = 0; orderCount < group.orders; orderCount += 1) {
        assignments.push(user);
      }
    }
  }

  if (userIndex !== users.length || assignments.length !== TOTAL_ORDERS) {
    throw new Error(
      `La distribucion de usuarios genero ${assignments.length} ordenes para ${userIndex} usuarios.`
    );
  }

  return shuffle(assignments, random);
}

function generatedOrderDate(user, orderIndex) {
  const userCreatedAt = new Date(user.createdAt).getTime();

  if (!Number.isFinite(userCreatedAt)) {
    throw new Error(`El usuario ${user.email} no tiene createdAt valido.`);
  }

  if (userCreatedAt > END_DATE) {
    throw new Error(
      `El usuario ${user.email} fue creado despues del 2026-07-20; no se puede crear una compra valida.`
    );
  }

  const minimumTime = Math.max(START_DATE, userCreatedAt);
  const random = makeSeededRandom(`${RANDOM_SEED}:date:${orderIndex}:${user.id}`);
  const timestamp =
    minimumTime + Math.floor(random() * Math.max(1, END_DATE - minimumTime));

  return new Date(timestamp);
}

function validateControlEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("El archivo de control debe ser un arreglo JSON.");
  }

  if (entries.length !== TEST_USER_COUNT) {
    throw new Error(
      `El archivo de control contiene ${entries.length} correos; se esperaban ${TEST_USER_COUNT}.`
    );
  }

  const normalizedEntries = entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`La entrada ${index + 1} del control no es valida.`);
    }

    const keys = Object.keys(entry);
    if (keys.length !== 1 || keys[0] !== "email") {
      throw new Error(
        `La entrada ${index + 1} del control debe contener solo la llave email.`
      );
    }

    const email = normalizeEmail(entry.email);
    if (!email) {
      throw new Error(`La entrada ${index + 1} del control no tiene email.`);
    }

    return { email };
  });

  const uniqueEmails = new Set(normalizedEntries.map((entry) => entry.email));
  if (uniqueEmails.size !== TEST_USER_COUNT) {
    throw new Error("El archivo de control contiene correos duplicados.");
  }

  return normalizedEntries;
}

async function loadControlEmails() {
  let content;

  try {
    content = await readFile(CONTROL_FILE, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `No existe el archivo de control ${CONTROL_FILE}. Ejecuta primero seed500TestUsers.js.`
      );
    }

    throw error;
  }

  return validateControlEntries(JSON.parse(content)).map((entry) => entry.email);
}

async function loadSeedUsers() {
  const emails = await loadControlEmails();
  const rows = await User.findAll({
    attributes: ["id", "email", "role", "createdAt", "updatedAt"],
    where: {
      email: {
        [Op.in]: emails,
      },
    },
    raw: true,
  });
  const usersByEmail = new Map(
    rows.map((user) => [normalizeEmail(user.email), user])
  );
  const users = emails.map((email) => usersByEmail.get(email)).filter(Boolean);
  const nonClientUsers = users.filter((user) => user.role !== "cliente");

  if (users.length !== TEST_USER_COUNT) {
    throw new Error(
      `Usuarios ficticios encontrados: ${users.length}. Se requieren exactamente ${TEST_USER_COUNT}.`
    );
  }

  if (nonClientUsers.length > 0) {
    throw new Error(
      `Hay ${nonClientUsers.length} usuarios del archivo de control sin role=cliente.`
    );
  }

  return users;
}

function productMatches(product, keywords) {
  return keywords.some((keyword) =>
    product.searchText.includes(normalizeText(keyword))
  );
}

function prepareProduct(rawProduct) {
  const product = rawProduct.get({ plain: true });
  const categoryName = product.Category?.name ?? null;
  const brandName = product.Brand?.name ?? null;
  const searchText = normalizeText(
    [
      product.name,
      product.description,
      product.features,
      product.productType,
      categoryName,
      brandName,
      product.supplementFlavor,
      product.supplementPresentation,
      product.supplementServings,
      product.apparelSize,
      product.apparelColor,
      product.apparelMaterial,
    ].join(" ")
  );
  const normalizedName = normalizeText(product.name);

  return {
    id: product.id,
    id_producto: product.id_producto,
    name: product.name,
    description: product.description ?? null,
    productType: product.productType ?? null,
    categoryName,
    brandName,
    price: product.price,
    priceCents: parseCents(product.price, "Product.price"),
    stock: Number(product.stock),
    updatedAt: product.updatedAt,
    searchText,
    normalizedName,
    isSupplement:
      searchText.includes("suplement") || searchText.includes("supplement"),
    isAccessory: searchText.includes("accesorios"),
    isApparel:
      searchText.includes("ropa deportiva") ||
      (searchText.includes("ropa") && !searchText.includes("suplement")),
  };
}

async function loadValidProducts() {
  const rawProducts = await Product.findAll({
    attributes: [
      "id",
      "id_producto",
      "name",
      "brandId",
      "categoryId",
      "price",
      "stock",
      "status",
      "productType",
      "description",
      "features",
      "supplementFlavor",
      "supplementPresentation",
      "supplementServings",
      "apparelSize",
      "apparelColor",
      "apparelMaterial",
      "updatedAt",
    ],
    include: [
      { model: Category, attributes: ["name"] },
      { model: Brand, attributes: ["name"] },
    ],
    where: {
      status: "Activo",
      stock: {
        [Op.gt]: 0,
      },
      price: {
        [Op.gt]: 0,
      },
      id_producto: {
        [Op.ne]: null,
      },
    },
    order: [["id_producto", "ASC"]],
  });

  const products = rawProducts
    .map(prepareProduct)
    .filter((product) => {
      const name = product.normalizedName;
      return !/\b(prueba|test)\b/.test(name) && !name.includes("producto prueba");
    });

  const invalidProducts = products.filter(
    (product) =>
      !Number.isInteger(product.id_producto) ||
      product.id_producto <= 0 ||
      !Number.isFinite(product.priceCents) ||
      product.priceCents <= 0
  );

  if (invalidProducts.length > 0) {
    throw new Error(
      `Hay ${invalidProducts.length} productos validos sin id_producto o precio utilizable.`
    );
  }

  if (products.length < MAX_PRODUCTS_PER_ORDER) {
    throw new Error(
      `Productos validos encontrados: ${products.length}. Se requieren al menos ${MAX_PRODUCTS_PER_ORDER}.`
    );
  }

  return products;
}

function buildProductPools(products) {
  const pools = {};

  for (const [poolName, keywords] of Object.entries(POOL_KEYWORDS)) {
    pools[poolName] = products.filter((product) =>
      productMatches(product, keywords)
    );
  }

  pools.supplement = products.filter((product) => product.isSupplement);
  pools.accessory = products.filter((product) => product.isAccessory);
  pools.apparel = products.filter(
    (product) => product.isApparel && !product.isAccessory
  );
  pools.all = products;

  return pools;
}

function productWeight(product, usage) {
  const usageCount = usage.get(product.id_producto) ?? 0;
  const stockWeight = 1 + Math.min(1.5, Math.log1p(product.stock) / 5);
  const usageWeight = 1 / (1 + usageCount * 0.04);

  return stockWeight * usageWeight;
}

function chooseProduct(candidates, selectedProducts, usage, random) {
  const selectedIds = new Set(
    selectedProducts.map((product) => product.id_producto)
  );
  const available = candidates.filter(
    (product) => !selectedIds.has(product.id_producto)
  );
  const underOccurrenceLimit = available.filter(
    (product) => (usage.get(product.id_producto) ?? 0) < MAX_PRODUCT_OCCURRENCES
  );
  const candidatesToUse =
    underOccurrenceLimit.length > 0 ? underOccurrenceLimit : available;

  return chooseWeighted(
    candidatesToUse,
    (product) => productWeight(product, usage),
    random
  );
}

function unionPools(pools, poolNames) {
  const productsById = new Map();

  for (const poolName of poolNames) {
    for (const product of pools[poolName] ?? []) {
      productsById.set(product.id_producto, product);
    }
  }

  return [...productsById.values()];
}

function fillSelection(selectedProducts, desiredSize, candidates, pools, usage, random) {
  const selected = [...selectedProducts];

  while (selected.length < desiredSize) {
    const primaryProduct = chooseProduct(candidates, selected, usage, random);
    const fallbackProduct = chooseProduct(pools.all, selected, usage, random);
    const product = primaryProduct ?? fallbackProduct;

    if (!product) {
      break;
    }

    selected.push(product);
  }

  return selected;
}

function selectPatternProducts(desiredSize, pools, usage, random) {
  const templates = shuffle(PATTERN_TEMPLATES, random);

  for (const template of templates) {
    const selected = [];

    for (const groupName of template.groups) {
      if (selected.length >= desiredSize) {
        break;
      }

      const product = chooseProduct(pools[groupName] ?? [], selected, usage, random);

      if (product) {
        selected.push(product);
      }
    }

    const minimumPatternProducts = Math.min(desiredSize, template.groups.length);
    if (selected.length === 0 || selected.length < Math.min(2, minimumPatternProducts)) {
      continue;
    }

    const candidates = unionPools(pools, template.fill);
    return fillSelection(selected, desiredSize, candidates, pools, usage, random).slice(
      0,
      desiredSize
    );
  }

  return selectControlledRandomProducts(desiredSize, pools, usage, random);
}

function selectControlledRandomProducts(desiredSize, pools, usage, random) {
  const context = chooseByConfiguredWeights(
    [
      { poolNames: ["supplement"], weight: 35 },
      { poolNames: ["apparel"], weight: 30 },
      { poolNames: ["accessory"], weight: 20 },
      { poolNames: ["supplement", "accessory"], weight: 8 },
      { poolNames: ["apparel", "accessory"], weight: 7 },
    ],
    random
  );
  const candidates = unionPools(pools, context.poolNames);

  return fillSelection([], desiredSize, candidates, pools, usage, random);
}

function validateSelectedProducts(selectedProducts) {
  if (selectedProducts.length < 1 || selectedProducts.length > 5) {
    throw new Error("Cada orden debe contener entre 1 y 5 productos distintos.");
  }

  const uniqueProductIds = new Set(
    selectedProducts.map((product) => product.id_producto)
  );

  if (uniqueProductIds.size !== selectedProducts.length) {
    throw new Error("Una orden no puede contener productos repetidos.");
  }
}

function incrementUsage(usage, products, delta = 1) {
  for (const product of products) {
    usage.set(product.id_producto, (usage.get(product.id_producto) ?? 0) + delta);
  }
}

function enforceProductCoverage(orderPlans, products, usage, random) {
  const totalItems = orderPlans.reduce(
    (sum, plan) => sum + plan.products.length,
    0
  );
  const target = Math.min(10, Math.floor(totalItems / products.length));

  if (target <= 0) {
    return target;
  }

  for (const product of products) {
    while ((usage.get(product.id_producto) ?? 0) < target) {
      const candidateOrders = shuffle(
        orderPlans.filter(
          (plan) =>
            !plan.products.some(
              (selected) => selected.id_producto === product.id_producto
            ) &&
            plan.products.some(
              (selected) => (usage.get(selected.id_producto) ?? 0) > target
            )
        ),
        random
      );

      const orderPlan = candidateOrders[0];

      if (!orderPlan) {
        throw new Error(
          `No fue posible cubrir el minimo de apariciones para ${product.name}.`
        );
      }

      const replacementCandidates = orderPlan.products
        .map((selected, index) => ({ selected, index }))
        .filter(
          ({ selected }) => (usage.get(selected.id_producto) ?? 0) > target
        );
      const replacement = chooseWeighted(
        replacementCandidates,
        ({ selected }) => usage.get(selected.id_producto) ?? 1,
        random
      );

      usage.set(
        replacement.selected.id_producto,
        (usage.get(replacement.selected.id_producto) ?? 0) - 1
      );
      usage.set(product.id_producto, (usage.get(product.id_producto) ?? 0) + 1);
      orderPlan.products[replacement.index] = product;
    }
  }

  return target;
}

function buildOrderPlans(users, products) {
  const random = makeSeededRandom(RANDOM_SEED);
  const pools = buildProductPools(products);
  const sizes = buildOrderSizes(random);
  const patternFlags = buildPatternFlags(random);
  const channels = buildChannelPlan(random);
  const userAssignments = buildUserAssignments(users, random);
  const usage = new Map(products.map((product) => [product.id_producto, 0]));
  const plans = [];

  for (let index = 0; index < TOTAL_ORDERS; index += 1) {
    const productsForOrder = patternFlags[index]
      ? selectPatternProducts(sizes[index], pools, usage, random)
      : selectControlledRandomProducts(sizes[index], pools, usage, random);

    validateSelectedProducts(productsForOrder);
    incrementUsage(usage, productsForOrder);

    plans.push({
      orderIndex: index,
      orderNumber: orderNumberFor(index),
      user: userAssignments[index],
      channel: channels[index],
      orderDate: generatedOrderDate(userAssignments[index], index),
      products: productsForOrder,
      patternBased: patternFlags[index],
    });
  }

  const coverageTarget = enforceProductCoverage(plans, products, usage, random);

  for (const plan of plans) {
    validateSelectedProducts(plan.products);
    plan.subtotalCents = sumCents(plan.products);

    if (plan.subtotalCents <= 0) {
      throw new Error(`La orden ${plan.orderNumber} tiene total invalido.`);
    }
  }

  const maxUsage = Math.max(...usage.values());
  if (maxUsage > MAX_PRODUCT_OCCURRENCES) {
    throw new Error(
      `Un producto aparece ${maxUsage} veces; el maximo permitido es ${MAX_PRODUCT_OCCURRENCES}.`
    );
  }

  return { plans, coverageTarget, productUsage: usage };
}

function hasAssociationMetadata(metadata) {
  return metadata && metadata.seedName === SEED_NAME;
}

async function loadExistingOrderState(orderNumbers) {
  const requestedNumbers = new Set(orderNumbers);
  const existingRequestedOrders = await Order.findAll({
    attributes: ["id", "orderNumber", "metadata"],
    where: {
      orderNumber: {
        [Op.in]: orderNumbers,
      },
    },
    raw: true,
  });
  const conflictingOrders = existingRequestedOrders.filter(
    (order) => !hasAssociationMetadata(order.metadata)
  );

  if (conflictingOrders.length > 0) {
    throw new Error(
      `Existen ${conflictingOrders.length} ordenes con prefijo ${ORDER_PREFIX} que no pertenecen a ${SEED_NAME}. No se modificaran.`
    );
  }

  const syntheticRows = await sequelize.query(
    `
      SELECT "orderNumber"
      FROM "core"."Orders"
      WHERE "metadata"->>'seedName' = :seedName
        AND "orderNumber" LIKE :prefixLike
      ORDER BY "orderNumber";
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
      },
      type: QueryTypes.SELECT,
    }
  );
  const extraSyntheticOrders = syntheticRows.filter(
    (order) => !requestedNumbers.has(order.orderNumber)
  );

  if (extraSyntheticOrders.length > 0) {
    throw new Error(
      `Existen ${extraSyntheticOrders.length} ordenes sinteticas con ${ORDER_PREFIX} fuera del rango esperado. Ejecuta --cleanup si deseas retirar la carga sintetica completa.`
    );
  }

  const existingSyntheticNumbers = new Set(
    existingRequestedOrders.map((order) => order.orderNumber)
  );

  return {
    existingSyntheticNumbers,
    existingSyntheticOrders: existingSyntheticNumbers.size,
  };
}

function buildOrderPayload(plan) {
  const amount = formatCents(plan.subtotalCents);

  return {
    userId: plan.user.id,
    orderNumber: plan.orderNumber,
    status: "paid",
    channel: plan.channel,
    subtotal: amount,
    discountTotal: "0.00",
    taxTotal: "0.00",
    total: amount,
    currency: "MXN",
    createdBy: null,
    paidAt: plan.orderDate,
    cancelledAt: null,
    refundedAt: null,
    notes: SYNTHETIC_NOTES,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      purpose: SEED_PURPOSE,
      patternBased: plan.patternBased,
      orderIndex: plan.orderIndex + 1,
    },
    createdAt: plan.orderDate,
    updatedAt: plan.orderDate,
  };
}

function buildOrderItemPayload(orderId, product, orderDate) {
  const amount = formatCents(product.priceCents);

  return {
    orderId,
    itemType: "product",
    productId: product.id_producto,
    membershipPlanId: null,
    quantity: 1,
    unitPrice: amount,
    discountAmount: "0.00",
    subtotal: amount,
    itemNameSnapshot: product.name,
    itemDescriptionSnapshot: product.description,
    categorySnapshot: product.categoryName,
    brandSnapshot: product.brandName,
    productTypeSnapshot: product.productType,
    durationDaysSnapshot: null,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
    },
    createdAt: orderDate,
    updatedAt: orderDate,
  };
}

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function insertMissingOrders(missingPlans) {
  if (missingPlans.length === 0) {
    return { createdOrders: 0, createdOrderItems: 0 };
  }

  const transaction = await sequelize.transaction();

  try {
    const createdOrders = [];

    for (const planChunk of chunkItems(missingPlans, 500)) {
      const createdChunk = await Order.bulkCreate(
        planChunk.map((plan) => buildOrderPayload(plan)),
        {
          validate: true,
          returning: true,
          silent: true,
          transaction,
        }
      );

      createdOrders.push(...createdChunk);
    }

    const createdOrdersByNumber = new Map(
      createdOrders.map((order) => [order.orderNumber, order])
    );
    const orderItems = [];

    for (const plan of missingPlans) {
      const order = createdOrdersByNumber.get(plan.orderNumber);

      if (!order) {
        throw new Error(`No se obtuvo el id de la orden ${plan.orderNumber}.`);
      }

      orderItems.push(
        ...plan.products.map((product) =>
          buildOrderItemPayload(order.id, product, plan.orderDate)
        )
      );
    }

    for (const itemChunk of chunkItems(orderItems, 500)) {
      await OrderItem.bulkCreate(itemChunk, {
        validate: true,
        silent: true,
        transaction,
      });
    }

    await transaction.commit();
    return {
      createdOrders: createdOrders.length,
      createdOrderItems: orderItems.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cleanupSyntheticOrders() {
  const transaction = await sequelize.transaction();

  try {
    const orders = await sequelize.query(
      `
        SELECT "id"
        FROM "core"."Orders"
        WHERE "metadata"->>'seedName' = :seedName;
      `,
      {
        replacements: { seedName: SEED_NAME },
        transaction,
        type: QueryTypes.SELECT,
      }
    );
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length === 0) {
      await transaction.commit();
      return { deletedOrders: 0, deletedOrderItems: 0 };
    }

    const deletedOrderItems = await OrderItem.destroy({
      where: {
        orderId: {
          [Op.in]: orderIds,
        },
      },
      transaction,
    });
    const deletedOrders = await Order.destroy({
      where: {
        id: {
          [Op.in]: orderIds,
        },
      },
      transaction,
    });

    await transaction.commit();
    return { deletedOrders, deletedOrderItems };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function runVerification() {
  const [verification] = await sequelize.query(
    `
      WITH seed_orders AS (
        SELECT o.*
        FROM "core"."Orders" o
        WHERE o."metadata"->>'seedName' = :seedName
          AND o."orderNumber" LIKE :prefixLike
      ),
      seed_order_items AS (
        SELECT oi.*
        FROM "core"."OrderItems" oi
        WHERE oi."orderId" IN (SELECT "id" FROM seed_orders)
      ),
      item_counts AS (
        SELECT "orderId", COUNT(*)::int AS item_count
        FROM seed_order_items
        GROUP BY "orderId"
      ),
      duplicate_products AS (
        SELECT "orderId", "productId", COUNT(*)::int AS duplicate_count
        FROM seed_order_items
        GROUP BY "orderId", "productId"
        HAVING COUNT(*) > 1
      ),
      order_totals AS (
        SELECT
          o."id" AS "orderId",
          ROUND(o."subtotal"::numeric * 100)::bigint AS order_subtotal_cents,
          ROUND(o."discountTotal"::numeric * 100)::bigint AS order_discount_cents,
          ROUND(o."taxTotal"::numeric * 100)::bigint AS order_tax_cents,
          ROUND(o."total"::numeric * 100)::bigint AS order_total_cents,
          COALESCE(SUM(ROUND(oi."subtotal"::numeric * 100)::bigint), 0) AS item_subtotal_cents
        FROM seed_orders o
        LEFT JOIN seed_order_items oi ON oi."orderId" = o."id"
        GROUP BY o."id", o."subtotal", o."discountTotal", o."taxTotal", o."total"
      ),
      seed_payments AS (
        SELECT "id"
        FROM "core"."Payments"
        WHERE "orderId" IN (SELECT "id" FROM seed_orders)
      ),
      seed_carts AS (
        SELECT "id"
        FROM "core"."Carts"
        WHERE "convertedOrderId" IN (SELECT "id" FROM seed_orders)
      )
      SELECT
        (SELECT COUNT(*)::int FROM seed_orders) AS "syntheticOrders",
        (SELECT COUNT(*)::int FROM seed_order_items) AS "syntheticOrderItems",
        (SELECT COUNT(DISTINCT "userId")::int FROM seed_orders) AS "clientsWithOrders",
        COALESCE((SELECT MIN(item_count)::int FROM item_counts), 0) AS "minProductsPerOrder",
        COALESCE((SELECT MAX(item_count)::int FROM item_counts), 0) AS "maxProductsPerOrder",
        (SELECT COUNT(*)::int FROM seed_orders o LEFT JOIN item_counts ic ON ic."orderId" = o."id" WHERE COALESCE(ic.item_count, 0) = 0) AS "ordersWithZeroProducts",
        (SELECT COUNT(*)::int FROM item_counts WHERE item_count > 5) AS "ordersWithMoreThan5Products",
        (SELECT COUNT(*)::int FROM duplicate_products) AS "duplicateProductsInsideOrder",
        (SELECT COUNT(*)::int FROM seed_order_items WHERE "quantity" <> 1) AS "itemsQuantityNotOne",
        (SELECT COUNT(*)::int FROM order_totals WHERE order_subtotal_cents <> item_subtotal_cents OR order_total_cents <> item_subtotal_cents OR order_discount_cents <> 0 OR order_tax_cents <> 0) AS "ordersWithIncorrectTotal",
        (SELECT COUNT(*)::int FROM seed_orders WHERE "status" <> 'paid') AS "ordersNotPaid",
        (SELECT COUNT(*)::int FROM seed_order_items WHERE "itemType" <> 'product') AS "itemsNotProduct",
        (SELECT COUNT(*)::int FROM seed_order_items oi LEFT JOIN "core"."Products" p ON p."id_producto" = oi."productId" WHERE p."id_producto" IS NULL) AS "itemsWithoutRealProduct",
        (SELECT COUNT(*)::int FROM seed_orders o JOIN "core"."Users" u ON u."id" = o."userId" WHERE o."createdAt" < u."createdAt" OR o."updatedAt" < u."createdAt" OR o."paidAt" < u."createdAt") AS "ordersBeforeUserCreatedAt",
        (SELECT COUNT(*)::int FROM seed_orders WHERE "createdAt" > :endDate OR "updatedAt" > :endDate OR "paidAt" > :endDate) AS "ordersAfterEndDate",
        (SELECT COUNT(*)::int FROM seed_orders WHERE "createdAt" <> "updatedAt" OR "createdAt" <> "paidAt") AS "ordersWithDateMismatch",
        (SELECT COUNT(*)::int FROM seed_payments) AS "payments",
        (SELECT COUNT(*)::int FROM "core"."Receipts" WHERE "orderId" IN (SELECT "id" FROM seed_orders) OR "paymentId" IN (SELECT "id" FROM seed_payments)) AS "receipts",
        (SELECT COUNT(*)::int FROM "core"."PaymentWebhookEvents" WHERE "paymentId" IN (SELECT "id" FROM seed_payments)) AS "paymentWebhookEvents",
        (SELECT COUNT(*)::int FROM "core"."PaymentRefunds" WHERE "orderId" IN (SELECT "id" FROM seed_orders) OR "paymentId" IN (SELECT "id" FROM seed_payments)) AS "paymentRefunds",
        (SELECT COUNT(*)::int FROM "core"."InventoryMovements" WHERE "orderItemId" IN (SELECT "id" FROM seed_order_items)) AS "inventoryMovements",
        (SELECT COUNT(*)::int FROM "core"."InventoryReservations" WHERE "orderId" IN (SELECT "id" FROM seed_orders)) AS "inventoryReservations",
        (SELECT COUNT(*)::int FROM seed_carts) AS "carts",
        (SELECT COUNT(*)::int FROM "core"."CartItems" WHERE "cartId" IN (SELECT "id" FROM seed_carts)) AS "cartItems",
        (SELECT COUNT(*)::int FROM "core"."BehaviorEvents" WHERE "userId" IN (SELECT "userId" FROM seed_orders)) AS "behaviorEvents",
        (SELECT COUNT(*)::int FROM "core"."UserSubscriptions" WHERE "userId" IN (SELECT "userId" FROM seed_orders)) AS "userSubscriptions",
        (SELECT COUNT(*)::int FROM "core"."SubscriptionHistories" WHERE "userId" IN (SELECT "userId" FROM seed_orders)) AS "subscriptionHistories";
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
        endDate: new Date(END_DATE),
      },
      type: QueryTypes.SELECT,
    }
  );

  const distribution = await sequelize.query(
    `
      WITH seed_orders AS (
        SELECT "id"
        FROM "core"."Orders"
        WHERE "metadata"->>'seedName' = :seedName
          AND "orderNumber" LIKE :prefixLike
      ),
      item_counts AS (
        SELECT o."id", COUNT(oi."id")::int AS item_count
        FROM seed_orders o
        LEFT JOIN "core"."OrderItems" oi ON oi."orderId" = o."id"
        GROUP BY o."id"
      )
      SELECT item_count AS "productsPerOrder", COUNT(*)::int AS "orders"
      FROM item_counts
      GROUP BY item_count
      ORDER BY item_count;
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
      },
      type: QueryTypes.SELECT,
    }
  );

  const topProducts = await sequelize.query(
    `
      WITH seed_orders AS (
        SELECT "id"
        FROM "core"."Orders"
        WHERE "metadata"->>'seedName' = :seedName
          AND "orderNumber" LIKE :prefixLike
      )
      SELECT
        oi."productId" AS "productId",
        p."name" AS "name",
        COUNT(*)::int AS "orders"
      FROM "core"."OrderItems" oi
      JOIN seed_orders o ON o."id" = oi."orderId"
      JOIN "core"."Products" p ON p."id_producto" = oi."productId"
      GROUP BY oi."productId", p."name"
      ORDER BY COUNT(*) DESC, p."name" ASC
      LIMIT 10;
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
      },
      type: QueryTypes.SELECT,
    }
  );

  const productFrequency = await sequelize.query(
    `
      WITH valid_products AS (
        SELECT "id_producto"
        FROM "core"."Products"
        WHERE "status" = 'Activo'
          AND "stock" > 0
          AND "price" > 0
          AND "id_producto" IS NOT NULL
          AND NOT (LOWER("name") LIKE '%prueba%' OR LOWER("name") LIKE '%test%')
      ),
      seed_orders AS (
        SELECT "id"
        FROM "core"."Orders"
        WHERE "metadata"->>'seedName' = :seedName
          AND "orderNumber" LIKE :prefixLike
      ),
      frequencies AS (
        SELECT vp."id_producto", COUNT(oi."id")::int AS appearances
        FROM valid_products vp
        LEFT JOIN "core"."OrderItems" oi ON oi."productId" = vp."id_producto"
          AND oi."orderId" IN (SELECT "id" FROM seed_orders)
        GROUP BY vp."id_producto"
      )
      SELECT
        MIN(appearances)::int AS "minProductAppearances",
        MAX(appearances)::int AS "maxProductAppearances",
        COUNT(*) FILTER (WHERE appearances < 10)::int AS "productsBelowTenAppearances",
        COUNT(*)::int AS "validProductsMeasured"
      FROM frequencies;
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
      },
      type: QueryTypes.SELECT,
    }
  );

  return {
    verification,
    distribution,
    topProducts,
    productFrequency: productFrequency[0],
  };
}

function assertFinalVerification(report) {
  const checks = [
    ["syntheticOrders", TOTAL_ORDERS],
    ["clientsWithOrders", TEST_USER_COUNT],
    ["ordersWithZeroProducts", 0],
    ["ordersWithMoreThan5Products", 0],
    ["duplicateProductsInsideOrder", 0],
    ["itemsQuantityNotOne", 0],
    ["ordersWithIncorrectTotal", 0],
    ["ordersNotPaid", 0],
    ["itemsNotProduct", 0],
    ["itemsWithoutRealProduct", 0],
    ["ordersBeforeUserCreatedAt", 0],
    ["ordersAfterEndDate", 0],
    ["ordersWithDateMismatch", 0],
    ["payments", 0],
    ["receipts", 0],
    ["paymentWebhookEvents", 0],
    ["paymentRefunds", 0],
    ["inventoryMovements", 0],
    ["inventoryReservations", 0],
    ["carts", 0],
    ["cartItems", 0],
    ["behaviorEvents", 0],
    ["userSubscriptions", 0],
    ["subscriptionHistories", 0],
  ];
  const errors = [];

  for (const [field, expected] of checks) {
    const actual = Number(report.verification[field]);
    if (actual !== expected) {
      errors.push(`${field}: ${actual}; esperado ${expected}`);
    }
  }

  const minProducts = Number(report.verification.minProductsPerOrder);
  const maxProducts = Number(report.verification.maxProductsPerOrder);

  if (minProducts < 1 || maxProducts > MAX_PRODUCTS_PER_ORDER) {
    errors.push(
      `Rango de productos por orden invalido: minimo ${minProducts}, maximo ${maxProducts}.`
    );
  }

  if (Number(report.productFrequency.productsBelowTenAppearances) !== 0) {
    errors.push(
      `Hay ${report.productFrequency.productsBelowTenAppearances} productos con menos de 10 apariciones.`
    );
  }

  if (
    Number(report.productFrequency.maxProductAppearances) >
    MAX_PRODUCT_OCCURRENCES
  ) {
    errors.push(
      `Un producto supera ${MAX_PRODUCT_OCCURRENCES} apariciones.`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Verificacion final fallida:\n- ${errors.join("\n- ")}`);
  }
}

function snapshotUsers(users) {
  return new Map(
    users.map((user) => [user.id, new Date(user.updatedAt).getTime()])
  );
}

function snapshotProducts(products) {
  return new Map(
    products.map((product) => [
      product.id_producto,
      {
        stock: product.stock,
        updatedAt: new Date(product.updatedAt).getTime(),
      },
    ])
  );
}

async function compareUserSnapshots(beforeSnapshot) {
  const users = await User.findAll({
    attributes: ["id", "updatedAt"],
    where: {
      id: {
        [Op.in]: [...beforeSnapshot.keys()],
      },
    },
    raw: true,
  });

  return users.filter(
    (user) => new Date(user.updatedAt).getTime() !== beforeSnapshot.get(user.id)
  ).length;
}

async function compareProductSnapshots(beforeSnapshot) {
  const products = await Product.findAll({
    attributes: ["id_producto", "stock", "updatedAt"],
    where: {
      id_producto: {
        [Op.in]: [...beforeSnapshot.keys()],
      },
    },
    raw: true,
  });
  let modifiedProducts = 0;
  let stockChangedProducts = 0;

  for (const product of products) {
    const before = beforeSnapshot.get(product.id_producto);
    const stock = Number(product.stock);
    const updatedAt = new Date(product.updatedAt).getTime();

    if (before.stock !== stock) {
      stockChangedProducts += 1;
    }

    if (before.stock !== stock || before.updatedAt !== updatedAt) {
      modifiedProducts += 1;
    }
  }

  return { modifiedProducts, stockChangedProducts };
}

function distributionAsObject(distribution) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const row of distribution) {
    result[row.productsPerOrder] = Number(row.orders);
  }

  return result;
}

function printTopProducts(topProducts) {
  if (topProducts.length === 0) {
    console.log("Productos mas frecuentes: ninguno");
    return;
  }

  console.log("Productos mas frecuentes:");
  for (const product of topProducts) {
    console.log(`- ${product.name}: ${product.orders}`);
  }
}

function printRunSummary({
  mode,
  users,
  products,
  existingOrders,
  missingPlans,
  createdOrders,
  createdOrderItems,
  verificationReport,
  userChanges,
  productChanges,
}) {
  const distribution = verificationReport
    ? distributionAsObject(verificationReport.distribution)
    : ORDER_SIZE_COUNTS;

  console.log(mode === "apply" ? "Modo de aplicacion" : "Modo de simulacion");
  console.log(`Usuarios ficticios encontrados: ${users.length}`);
  console.log(`Productos validos encontrados: ${products.length}`);
  console.log(`Ordenes solicitadas: ${TOTAL_ORDERS}`);
  console.log(`Ordenes sinteticas existentes: ${existingOrders}`);
  console.log(`Ordenes faltantes: ${missingPlans.length}`);

  if (mode !== "apply") {
    console.log("No se realizaron inserciones");
    return;
  }

  console.log(`Ordenes creadas: ${createdOrders}`);
  console.log(`OrderItems creados: ${createdOrderItems}`);
  console.log(
    `Clientes con ordenes: ${verificationReport.verification.clientsWithOrders}`
  );
  console.log(
    `Minimo de productos por orden: ${verificationReport.verification.minProductsPerOrder}`
  );
  console.log(
    `Maximo de productos por orden: ${verificationReport.verification.maxProductsPerOrder}`
  );
  console.log(
    `Ordenes con mas de 5 productos: ${verificationReport.verification.ordersWithMoreThan5Products}`
  );
  console.log(
    `Productos repetidos dentro de una orden: ${verificationReport.verification.duplicateProductsInsideOrder}`
  );
  console.log(
    `OrderItems con quantity diferente de 1: ${verificationReport.verification.itemsQuantityNotOne}`
  );
  console.log(
    `Ordenes con total incorrecto: ${verificationReport.verification.ordersWithIncorrectTotal}`
  );
  console.log(`Distribucion 1 producto: ${distribution[1]}`);
  console.log(`Distribucion 2 productos: ${distribution[2]}`);
  console.log(`Distribucion 3 productos: ${distribution[3]}`);
  console.log(`Distribucion 4 productos: ${distribution[4]}`);
  console.log(`Distribucion 5 productos: ${distribution[5]}`);
  console.log(
    `Productos con menos de 10 apariciones: ${verificationReport.productFrequency.productsBelowTenAppearances}`
  );
  console.log(
    `Maximo de apariciones de un producto: ${verificationReport.productFrequency.maxProductAppearances}`
  );
  console.log(`Usuarios modificados: ${userChanges}`);
  console.log(`Productos modificados: ${productChanges.modifiedProducts}`);
  console.log(
    `Productos con stock modificado: ${productChanges.stockChangedProducts}`
  );
  console.log(`Pagos creados: ${verificationReport.verification.payments}`);
  console.log(`Recibos creados: ${verificationReport.verification.receipts}`);
  console.log(
    `Webhook events de pago creados: ${verificationReport.verification.paymentWebhookEvents}`
  );
  console.log(
    `Refunds de pago creados: ${verificationReport.verification.paymentRefunds}`
  );
  console.log(
    `Movimientos de inventario creados: ${verificationReport.verification.inventoryMovements}`
  );
  console.log(
    `Reservas de inventario creadas: ${verificationReport.verification.inventoryReservations}`
  );
  console.log(`Carritos creados: ${verificationReport.verification.carts}`);
  console.log(`CartItems creados: ${verificationReport.verification.cartItems}`);
  console.log(
    `BehaviorEvents creados: ${verificationReport.verification.behaviorEvents}`
  );
  console.log(
    `UserSubscriptions creadas: ${verificationReport.verification.userSubscriptions}`
  );
  console.log(
    `SubscriptionHistories creadas: ${verificationReport.verification.subscriptionHistories}`
  );
  printTopProducts(verificationReport.topProducts);
  console.log("Errores: 0");
}

async function runApplyOrCheck({ apply }) {
  const users = await loadSeedUsers();
  const products = await loadValidProducts();
  const userSnapshot = snapshotUsers(users);
  const productSnapshot = snapshotProducts(products);
  const { plans } = buildOrderPlans(users, products);
  const orderNumbers = plans.map((plan) => plan.orderNumber);
  const { existingSyntheticNumbers, existingSyntheticOrders } =
    await loadExistingOrderState(orderNumbers);
  const missingPlans = plans.filter(
    (plan) => !existingSyntheticNumbers.has(plan.orderNumber)
  );

  if (!apply) {
    printRunSummary({
      mode: "check",
      users,
      products,
      existingOrders: existingSyntheticOrders,
      missingPlans,
      createdOrders: 0,
      createdOrderItems: 0,
      verificationReport: null,
      userChanges: 0,
      productChanges: { modifiedProducts: 0, stockChangedProducts: 0 },
    });
    return;
  }

  const { createdOrders, createdOrderItems } =
    await insertMissingOrders(missingPlans);
  const verificationReport = await runVerification();
  const userChanges = await compareUserSnapshots(userSnapshot);
  const productChanges = await compareProductSnapshots(productSnapshot);

  assertFinalVerification(verificationReport);

  if (userChanges !== 0) {
    throw new Error(`Se detectaron ${userChanges} usuarios modificados.`);
  }

  if (
    productChanges.modifiedProducts !== 0 ||
    productChanges.stockChangedProducts !== 0
  ) {
    throw new Error(
      `Se detectaron cambios en productos: ${JSON.stringify(productChanges)}`
    );
  }

  printRunSummary({
    mode: "apply",
    users,
    products,
    existingOrders: existingSyntheticOrders,
    missingPlans,
    createdOrders,
    createdOrderItems,
    verificationReport,
    userChanges,
    productChanges,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const knownArgs = new Set(["--apply", "--cleanup"]);
  const unknownArgs = args.filter((arg) => !knownArgs.has(arg));
  const apply = args.includes("--apply");
  const cleanup = args.includes("--cleanup");

  if (unknownArgs.length > 0) {
    throw new Error(`Argumentos no reconocidos: ${unknownArgs.join(", ")}`);
  }

  if (apply && cleanup) {
    throw new Error("Usa solo uno de estos argumentos: --apply o --cleanup.");
  }

  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    if (cleanup) {
      const result = await cleanupSyntheticOrders();
      console.log("Modo cleanup");
      console.log(`Ordenes eliminadas: ${result.deletedOrders}`);
      console.log(`OrderItems eliminados: ${result.deletedOrderItems}`);
      console.log("Errores: 0");
      return;
    }

    await runApplyOrCheck({ apply });
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Errores: 1");
  console.error("Error en seedAssociationOrders:", error);
  process.exit(1);
});
