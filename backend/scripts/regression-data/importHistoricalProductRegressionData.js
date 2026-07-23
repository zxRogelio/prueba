import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/sequelize.js";
import {
  BehaviorEvent,
  InventoryMovement,
  Order,
  OrderItem,
  Payment,
  PaymentRefund,
  PaymentRefundItem,
  Receipt,
  User,
} from "../../models/index.js";
import {
  buildMonths,
  chunkArray,
  daysInMonth,
  displayPath,
  fromCents,
  HISTORICAL_USER_COUNT,
  HISTORICAL_USER_EMAIL_DOMAIN,
  HISTORICAL_USER_EMAIL_PREFIX,
  makeSeededRandom,
  MONTHLY_SALES_HEADERS,
  MONTHLY_VIEWS_HEADERS,
  ORDER_PREFIX,
  parseNonNegativeInteger,
  parsePositiveInteger,
  productMapByBusinessId,
  RANDOM_SEED,
  readCsvRecords,
  SALES_MONTHLY_FILE,
  SEED_NAME,
  SEED_PURPOSE,
  SEED_SOURCE,
  shuffle,
  toCents,
  VIEWS_MONTHLY_FILE,
  loadActiveProductsFromDatabase,
} from "./common.js";

const PASSWORD_HASH =
  "$2b$10$7EqJtq98hPqEX7fNZaFWoOhiJr4tHK36G0TgLPG9XVb8hc.P0h6Ma";
const HISTORICAL_USER_CREATED_AT = new Date("2022-06-01T00:00:00.000Z");
const ORDER_BATCH_SIZE = 500;
const ORDER_ITEM_BATCH_SIZE = 1000;
const PAYMENT_BATCH_SIZE = 500;
const EVENT_BATCH_SIZE = 1000;

function parseArgs() {
  const args = process.argv.slice(2);
  const known = new Set(["--apply", "--clean"]);
  const limitArg = args.find((arg) => arg.startsWith("--limit-products="));
  const unknown = args.filter((arg) => !known.has(arg) && arg !== limitArg);

  if (unknown.length > 0) {
    throw new Error(`Argumentos no reconocidos: ${unknown.join(", ")}`);
  }

  const limitProducts = limitArg ? Number(limitArg.split("=")[1]) : null;

  if (limitArg && (!Number.isInteger(limitProducts) || limitProducts <= 0)) {
    throw new Error("--limit-products debe ser un entero positivo.");
  }

  const apply = args.includes("--apply");
  const clean = args.includes("--clean");

  if (apply && clean) {
    throw new Error("Usa --apply o --clean, no ambos.");
  }

  if (apply && limitProducts) {
    throw new Error("--limit-products solo se permite en simulacion sin --apply.");
  }

  return { apply, clean, limitProducts };
}

function historicalUserEmail(index) {
  return `${HISTORICAL_USER_EMAIL_PREFIX}${String(index + 1).padStart(
    4,
    "0"
  )}@${HISTORICAL_USER_EMAIL_DOMAIN}`;
}

function historicalUserEmails() {
  return Array.from({ length: HISTORICAL_USER_COUNT }, (_, index) =>
    historicalUserEmail(index)
  );
}

function normalizeSaleRecord(record) {
  return {
    product_pk: parsePositiveInteger(record.product_pk, "product_pk"),
    id_producto: parsePositiveInteger(record.id_producto, "id_producto"),
    producto: String(record.producto ?? "").trim(),
    mes: String(record.mes ?? "").trim(),
    unidades_vendidas: parseNonNegativeInteger(
      record.unidades_vendidas,
      "unidades_vendidas"
    ),
    __rowNumber: record.__rowNumber,
  };
}

function normalizeViewRecord(record) {
  return {
    product_pk: parsePositiveInteger(record.product_pk, "product_pk"),
    id_producto: parsePositiveInteger(record.id_producto, "id_producto"),
    producto: String(record.producto ?? "").trim(),
    mes: String(record.mes ?? "").trim(),
    vistas_producto: parseNonNegativeInteger(
      record.vistas_producto,
      "vistas_producto"
    ),
    __rowNumber: record.__rowNumber,
  };
}

async function loadInputFiles() {
  const [salesRecords, viewRecords] = await Promise.all([
    readCsvRecords(SALES_MONTHLY_FILE, MONTHLY_SALES_HEADERS),
    readCsvRecords(VIEWS_MONTHLY_FILE, MONTHLY_VIEWS_HEADERS),
  ]);

  return {
    salesRows: salesRecords.map(normalizeSaleRecord),
    viewRows: viewRecords.map(normalizeViewRecord),
  };
}

function validateCompleteMonthlyRows({
  rows,
  valueField,
  rowLabel,
  months,
  products,
}) {
  const expectedProductIds = new Set(products.map((product) => product.id_producto));
  const expectedMonths = new Set(months);
  const expectedKeys = new Set();
  const rowsByKey = new Map();
  const errors = [];

  for (const product of products) {
    for (const month of months) {
      expectedKeys.add(`${product.id_producto}:${month}`);
    }
  }

  for (const row of rows) {
    const key = `${row.id_producto}:${row.mes}`;

    if (!expectedProductIds.has(row.id_producto)) {
      errors.push(`${rowLabel} fila ${row.__rowNumber}: producto no esperado ${row.id_producto}.`);
      continue;
    }

    if (!expectedMonths.has(row.mes)) {
      errors.push(`${rowLabel} fila ${row.__rowNumber}: mes fuera de periodo ${row.mes}.`);
      continue;
    }

    if (rowsByKey.has(key)) {
      errors.push(`${rowLabel} duplicado para ${key}.`);
      continue;
    }

    rowsByKey.set(key, row);
  }

  for (const key of expectedKeys) {
    if (!rowsByKey.has(key)) {
      errors.push(`${rowLabel} faltante para ${key}.`);
    }
  }

  for (const product of products) {
    const productRows = months.map((month) => rowsByKey.get(`${product.id_producto}:${month}`));
    if (productRows.some((row) => !row)) continue;

    for (const row of productRows) {
      if (row.product_pk !== product.product_pk) {
        errors.push(
          `${rowLabel} ${product.id_producto}:${row.mes} tiene product_pk ${row.product_pk}; esperado ${product.product_pk}.`
        );
      }
      if (row.producto !== product.producto) {
        errors.push(
          `${rowLabel} ${product.id_producto}:${row.mes} tiene nombre distinto al producto activo.`
        );
      }
      if (Number(row[valueField]) < 0) {
        errors.push(`${rowLabel} ${product.id_producto}:${row.mes} tiene valor negativo.`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.slice(0, 30).join("\n"));
  }

  return rowsByKey;
}

function scopeProducts(activeProducts, limitProducts) {
  if (!limitProducts) return activeProducts;
  return activeProducts.slice(0, limitProducts);
}

function filterRowsForProducts(rows, products) {
  const productIds = new Set(products.map((product) => product.id_producto));
  return rows.filter((row) => productIds.has(row.id_producto));
}

function validateCsvProductCoverage({ salesRows, viewRows, activeProducts, limitProducts }) {
  if (limitProducts) return;

  const activeIds = new Set(activeProducts.map((product) => product.id_producto));
  const salesIds = new Set(salesRows.map((row) => row.id_producto));
  const viewIds = new Set(viewRows.map((row) => row.id_producto));
  const missingInSales = [...activeIds].filter((id) => !salesIds.has(id));
  const missingInViews = [...activeIds].filter((id) => !viewIds.has(id));
  const extraInSales = [...salesIds].filter((id) => !activeIds.has(id));
  const extraInViews = [...viewIds].filter((id) => !activeIds.has(id));

  if (
    missingInSales.length > 0 ||
    missingInViews.length > 0 ||
    extraInSales.length > 0 ||
    extraInViews.length > 0
  ) {
    throw new Error(
      [
        `Productos activos faltantes en ventas: ${missingInSales.slice(0, 10).join(", ")}`,
        `Productos activos faltantes en vistas: ${missingInViews.slice(0, 10).join(", ")}`,
        `Productos extra en ventas: ${extraInSales.slice(0, 10).join(", ")}`,
        `Productos extra en vistas: ${extraInViews.slice(0, 10).join(", ")}`,
      ].join("\n")
    );
  }
}

async function validateInputs({ limitProducts }) {
  const months = buildMonths();
  const activeProducts = await loadActiveProductsFromDatabase();
  const products = scopeProducts(activeProducts, limitProducts);
  const { salesRows: rawSalesRows, viewRows: rawViewRows } = await loadInputFiles();

  if (activeProducts.length === 0) {
    throw new Error("No hay productos activos reales en core.Products.");
  }

  validateCsvProductCoverage({
    salesRows: rawSalesRows,
    viewRows: rawViewRows,
    activeProducts,
    limitProducts,
  });

  const salesRows = filterRowsForProducts(rawSalesRows, products);
  const viewRows = filterRowsForProducts(rawViewRows, products);
  const salesByKey = validateCompleteMonthlyRows({
    rows: salesRows,
    valueField: "unidades_vendidas",
    rowLabel: "ventas",
    months,
    products,
  });
  const viewsByKey = validateCompleteMonthlyRows({
    rows: viewRows,
    valueField: "vistas_producto",
    rowLabel: "vistas",
    months,
    products,
  });

  return { months, products, salesRows, viewRows, salesByKey, viewsByKey };
}

function splitUnitsIntoOrderItems(product, month, units) {
  const chunks = [];
  const random = makeSeededRandom(`${RANDOM_SEED}:split:${product.id_producto}:${month}`);
  let remaining = units;

  while (remaining > 0) {
    const maxQuantity = Math.min(4, remaining);
    const quantity =
      remaining <= 4 && random() < 0.35
        ? remaining
        : 1 + Math.floor(random() * maxQuantity);

    chunks.push({
      product,
      month,
      quantity,
    });
    remaining -= quantity;
  }

  return chunks;
}

function orderDateFor(month, orderIndex, totalOrders) {
  const random = makeSeededRandom(`${RANDOM_SEED}:order-date:${month}:${orderIndex}`);
  const [year, monthNumber] = month.split("-").map(Number);
  const maxDay = daysInMonth(month);
  const distributedDay = Math.floor(((orderIndex + random()) / Math.max(1, totalOrders)) * maxDay);
  const day = Math.min(maxDay, Math.max(1, distributedDay + 1));
  const hour = 9 + Math.floor(random() * 10);
  const minute = Math.floor(random() * 60);
  const second = Math.floor(random() * 60);

  return new Date(Date.UTC(year, monthNumber - 1, day, hour, minute, second));
}

function channelFor(month, orderIndex) {
  const random = makeSeededRandom(`${RANDOM_SEED}:channel:${month}:${orderIndex}`);
  const pick = random();

  if (pick < 0.5) return "online";
  if (pick < 0.82) return "reception";
  return "mobile";
}

function buildMonthlyOrderPlans({ month, salesRows, productById }) {
  const random = makeSeededRandom(`${RANDOM_SEED}:orders:${month}`);
  const itemChunks = [];

  for (const row of salesRows) {
    const product = productById.get(row.id_producto);
    if (!product || row.unidades_vendidas === 0) continue;
    itemChunks.push(
      ...splitUnitsIntoOrderItems(product, month, row.unidades_vendidas)
    );
  }

  const shuffledChunks = shuffle(itemChunks, random);
  const plans = [];
  let current = null;

  function startOrder() {
    return {
      targetItems: 1 + Math.floor(random() * 4),
      items: [],
      productIds: new Set(),
    };
  }

  function finishCurrent() {
    if (current && current.items.length > 0) {
      plans.push({ items: current.items });
    }
    current = null;
  }

  for (const chunk of shuffledChunks) {
    if (!current) current = startOrder();

    if (
      current.items.length >= current.targetItems ||
      current.productIds.has(chunk.product.id_producto)
    ) {
      finishCurrent();
      current = startOrder();
    }

    current.items.push(chunk);
    current.productIds.add(chunk.product.id_producto);
  }

  finishCurrent();

  return plans.map((plan, index) => {
    const orderDate = orderDateFor(month, index, plans.length);
    const subtotalCents = plan.items.reduce(
      (sum, item) => sum + item.product.priceCents * item.quantity,
      0
    );

    return {
      month,
      monthOrderIndex: index + 1,
      orderDate,
      channel: channelFor(month, index),
      subtotalCents,
      items: plan.items,
    };
  });
}

function buildOrderPlans({ months, products, salesRows }) {
  const productById = productMapByBusinessId(products);
  const salesRowsByMonth = new Map(months.map((month) => [month, []]));

  for (const row of salesRows) {
    salesRowsByMonth.get(row.mes)?.push(row);
  }

  const plans = [];

  for (const month of months) {
    const monthlyPlans = buildMonthlyOrderPlans({
      month,
      salesRows: salesRowsByMonth.get(month) ?? [],
      productById,
    });

    for (const plan of monthlyPlans) {
      const yyyymm = month.replace("-", "");
      plan.orderNumber = `${ORDER_PREFIX}${yyyymm}-${String(
        plan.monthOrderIndex
      ).padStart(6, "0")}`;
      plans.push(plan);
    }
  }

  return plans;
}

function assignUsersToPlans(plans, users) {
  const assigned = [];

  for (const [index, plan] of plans.entries()) {
    const random = makeSeededRandom(`${RANDOM_SEED}:user:${plan.orderNumber}`);
    const user = users[Math.floor(random() * users.length)];

    if (new Date(user.createdAt).getTime() > plan.orderDate.getTime()) {
      throw new Error(
        `Usuario ${user.email} creado despues de la orden ${plan.orderNumber}.`
      );
    }

    assigned.push({ ...plan, user, orderIndex: index + 1 });
  }

  return assigned;
}

function buildOrderPayload(plan) {
  const amount = fromCents(plan.subtotalCents);

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
    notes: "Orden sintetica historica para regresion mensual de productos",
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      purpose: SEED_PURPOSE,
      month: plan.month,
      orderIndex: plan.orderIndex,
    },
    createdAt: plan.orderDate,
    updatedAt: plan.orderDate,
  };
}

function buildOrderItemPayload(orderId, item, orderDate) {
  const unitPrice = fromCents(item.product.priceCents);
  const subtotal = fromCents(item.product.priceCents * item.quantity);

  return {
    orderId,
    itemType: "product",
    productId: item.product.id_producto,
    membershipPlanId: null,
    quantity: item.quantity,
    unitPrice,
    discountAmount: "0.00",
    subtotal,
    itemNameSnapshot: item.product.producto,
    itemDescriptionSnapshot: null,
    categorySnapshot: item.product.category_name || null,
    brandSnapshot: item.product.brand_name || null,
    productTypeSnapshot: item.product.product_type || null,
    durationDaysSnapshot: null,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      month: item.month,
      productPk: item.product.product_pk,
    },
    createdAt: orderDate,
    updatedAt: orderDate,
  };
}

function buildPaymentPayload(order, plan) {
  return {
    userId: plan.user.id,
    orderId: order.id,
    planId: null,
    subscriptionId: null,
    groupId: null,
    paymentType: "product",
    amount: order.total,
    method: "cash",
    source: "admin_manual",
    provider: "none",
    providerPreferenceId: null,
    providerPaymentId: null,
    externalReference: `${plan.orderNumber}:payment`,
    providerStatus: "paid",
    providerStatusDetail: "historical_regression_seed",
    idempotencyKey: `${plan.orderNumber}:payment`,
    status: "paid",
    currency: "MXN",
    reference: plan.orderNumber,
    notes: "Pago sintetico historico para regresion mensual de productos",
    paidAt: plan.orderDate,
    approvedAt: plan.orderDate,
    cancelledAt: null,
    refundedAt: null,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      purpose: SEED_PURPOSE,
      month: plan.month,
      orderNumber: plan.orderNumber,
    },
    createdBy: null,
    createdAt: plan.orderDate,
    updatedAt: plan.orderDate,
  };
}

function viewEventDateFor(month, productId, eventIndex, totalEvents) {
  const random = makeSeededRandom(
    `${RANDOM_SEED}:view-date:${month}:${productId}:${eventIndex}`
  );
  const [year, monthNumber] = month.split("-").map(Number);
  const maxDay = daysInMonth(month);
  const distributedDay = Math.floor(((eventIndex + random()) / Math.max(1, totalEvents)) * maxDay);
  const day = Math.min(maxDay, Math.max(1, distributedDay + 1));
  const hour = 7 + Math.floor(random() * 15);
  const minute = Math.floor(random() * 60);
  const second = Math.floor(random() * 60);

  return new Date(Date.UTC(year, monthNumber - 1, day, hour, minute, second));
}

function buildViewEventsForMonth({ month, viewRows }) {
  const events = [];

  for (const row of viewRows) {
    for (let index = 0; index < row.vistas_producto; index += 1) {
      const visitorNumber =
        ((row.id_producto * 31 + index * 17 + month.charCodeAt(5)) % 400) + 1;
      events.push({
        userId: null,
        sessionId: null,
        eventType: "product_view",
        entityType: "product",
        entityId: String(row.id_producto),
        source: SEED_SOURCE,
        quantity: null,
        metadata: {
          visitorId: `historical-visitor-${String(visitorNumber).padStart(4, "0")}`,
          platform: "historical_seed",
          seed: SEED_NAME,
          month,
          productPk: row.product_pk,
        },
        createdAt: viewEventDateFor(month, row.id_producto, index, row.vistas_producto),
      });
    }
  }

  return events;
}

async function loadExistingSeedState(transaction = null) {
  const rows = await sequelize.query(
    `
    SELECT
      (SELECT COUNT(*)::int
       FROM core."Orders"
       WHERE "metadata"->>'seedName' = :seedName) AS "seedOrders",
      (SELECT COUNT(*)::int
       FROM core."Orders"
       WHERE "orderNumber" LIKE :prefixLike
         AND COALESCE("metadata"->>'seedName', '') <> :seedName) AS "conflictingOrders",
      (SELECT COUNT(*)::int
       FROM core."Payments"
       WHERE "metadata"->>'seedName' = :seedName) AS "seedPayments",
      (SELECT COUNT(*)::int
       FROM core."BehaviorEvents"
       WHERE "source" = :source
          OR "metadata"->>'seed' = :seedName) AS "seedBehaviorEvents",
      (SELECT COUNT(*)::int
       FROM core."Users"
       WHERE lower("email") LIKE :userLike) AS "seedUsers";
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        prefixLike: `${ORDER_PREFIX}%`,
        source: SEED_SOURCE,
        userLike: `${HISTORICAL_USER_EMAIL_PREFIX}%@${HISTORICAL_USER_EMAIL_DOMAIN}`,
      },
      transaction,
      type: QueryTypes.SELECT,
    }
  );

  return rows[0];
}

async function assertNoExistingSeed(transaction) {
  const state = await loadExistingSeedState(transaction);

  if (state.conflictingOrders > 0) {
    throw new Error(
      `Existen ${state.conflictingOrders} ordenes con prefijo ${ORDER_PREFIX} que no pertenecen al seed.`
    );
  }

  if (state.seedOrders > 0 || state.seedPayments > 0 || state.seedBehaviorEvents > 0) {
    throw new Error(
      `El seed ya existe: ${state.seedOrders} ordenes, ${state.seedPayments} pagos, ${state.seedBehaviorEvents} eventos. Usa --clean antes de --apply.`
    );
  }
}

async function ensureHistoricalUsers(transaction) {
  const emails = historicalUserEmails();
  const existingUsers = await User.findAll({
    where: { email: emails },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
  const duplicates = emails.filter(
    (email, index) => emails.indexOf(email) !== index
  );

  if (duplicates.length > 0) {
    throw new Error(`Correos historicos duplicados: ${duplicates.join(", ")}`);
  }

  for (const user of existingUsers) {
    if (user.role !== "cliente") {
      throw new Error(`Usuario historico ${user.email} no tiene role=cliente.`);
    }
    if (new Date(user.createdAt).getTime() > new Date("2022-07-01T00:00:00.000Z").getTime()) {
      throw new Error(`Usuario historico ${user.email} fue creado despues del periodo inicial.`);
    }
  }

  const missingUsers = emails
    .filter((email) => !usersByEmail.has(email))
    .map((email) => ({
      email,
      password: PASSWORD_HASH,
      otp: null,
      otpExpires: null,
      isVerified: true,
      isPendingApproval: false,
      accessToken: null,
      totpSecret: null,
      authMethod: "normal",
      role: "cliente",
      provider: "local",
      providerId: null,
      passwordChangesCount: 0,
      passwordChangesDate: null,
      mustChangePassword: false,
      createdAt: HISTORICAL_USER_CREATED_AT,
      updatedAt: HISTORICAL_USER_CREATED_AT,
    }));

  if (missingUsers.length > 0) {
    await User.bulkCreate(missingUsers, {
      validate: true,
      silent: true,
      transaction,
    });
  }

  const allUsers = await User.findAll({
    where: { email: emails },
    order: [["email", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (allUsers.length !== HISTORICAL_USER_COUNT) {
    throw new Error(
      `Usuarios historicos encontrados ${allUsers.length}; esperados ${HISTORICAL_USER_COUNT}.`
    );
  }

  return allUsers.map((user) => user.get({ plain: true }));
}

async function insertOrdersForMonth({ month, plans, transaction }) {
  const createdOrders = [];

  for (const planChunk of chunkArray(plans, ORDER_BATCH_SIZE)) {
    const chunk = await Order.bulkCreate(planChunk.map(buildOrderPayload), {
      validate: true,
      returning: true,
      silent: true,
      transaction,
    });
    createdOrders.push(...chunk);
  }

  const createdOrdersByNumber = new Map(
    createdOrders.map((order) => [order.orderNumber, order])
  );
  const orderItems = [];
  const payments = [];

  for (const plan of plans) {
    const order = createdOrdersByNumber.get(plan.orderNumber);

    if (!order) {
      throw new Error(`No se recupero la orden creada ${plan.orderNumber}.`);
    }

    orderItems.push(
      ...plan.items.map((item) => buildOrderItemPayload(order.id, item, plan.orderDate))
    );
    payments.push(buildPaymentPayload(order, plan));
  }

  for (const itemChunk of chunkArray(orderItems, ORDER_ITEM_BATCH_SIZE)) {
    await OrderItem.bulkCreate(itemChunk, {
      validate: true,
      silent: true,
      transaction,
    });
  }

  for (const paymentChunk of chunkArray(payments, PAYMENT_BATCH_SIZE)) {
    await Payment.bulkCreate(paymentChunk, {
      validate: true,
      silent: true,
      transaction,
    });
  }

  console.log(
    `${month}: ordenes ${createdOrders.length}, items ${orderItems.length}, pagos ${payments.length}`
  );

  return {
    orders: createdOrders.length,
    orderItems: orderItems.length,
    payments: payments.length,
  };
}

async function insertViewEventsForMonth({ month, viewRows, transaction }) {
  const events = buildViewEventsForMonth({ month, viewRows });

  for (const eventChunk of chunkArray(events, EVENT_BATCH_SIZE)) {
    await BehaviorEvent.bulkCreate(eventChunk, {
      validate: true,
      transaction,
    });
  }

  console.log(`${month}: eventos de vistas ${events.length}`);
  return events.length;
}

function buildPlanSummary({ orderPlans, salesRows, viewRows }) {
  const totalUnits = salesRows.reduce(
    (sum, row) => sum + row.unidades_vendidas,
    0
  );
  const totalViews = viewRows.reduce((sum, row) => sum + row.vistas_producto, 0);
  const orderItems = orderPlans.reduce((sum, plan) => sum + plan.items.length, 0);

  return {
    totalUnits,
    totalViews,
    estimatedOrders: orderPlans.length,
    estimatedOrderItems: orderItems,
    estimatedPayments: orderPlans.length,
    estimatedBehaviorEvents: totalViews,
  };
}

async function validateInsertedData({ salesRows, viewRows, months, products }) {
  const rows = await sequelize.query(
    `
    WITH expected_sales AS (
      SELECT *
      FROM jsonb_to_recordset(CAST(:salesJson AS jsonb))
        AS x(product_id int, month text, expected int)
    ),
    actual_sales AS (
      SELECT
        oi."productId" AS product_id,
        to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")) AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
        SUM(oi."quantity")::int AS actual
      FROM core."OrderItems" oi
      JOIN core."Orders" o ON o."id" = oi."orderId"
      WHERE o."metadata"->>'seedName' = :seedName
        AND oi."itemType" = 'product'
      GROUP BY oi."productId", to_char(date_trunc('month', COALESCE(o."paidAt", o."createdAt")) AT TIME ZONE 'UTC', 'YYYY-MM')
    ),
    expected_views AS (
      SELECT *
      FROM jsonb_to_recordset(CAST(:viewsJson AS jsonb))
        AS x(product_id int, month text, expected int)
    ),
    actual_views AS (
      SELECT
        be."entityId"::int AS product_id,
        to_char(date_trunc('month', be."createdAt") AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
        COUNT(*)::int AS actual
      FROM core."BehaviorEvents" be
      WHERE be."source" = :source
        AND be."eventType" = 'product_view'
        AND be."entityType" = 'product'
        AND be."entityId" ~ '^[0-9]+$'
      GROUP BY be."entityId"::int, to_char(date_trunc('month', be."createdAt") AT TIME ZONE 'UTC', 'YYYY-MM')
    ),
    sales_mismatch AS (
      SELECT COUNT(*)::int AS count
      FROM expected_sales e
      FULL JOIN actual_sales a USING (product_id, month)
      WHERE COALESCE(e.expected, -1) <> COALESCE(a.actual, -1)
    ),
    views_mismatch AS (
      SELECT COUNT(*)::int AS count
      FROM expected_views e
      FULL JOIN actual_views a USING (product_id, month)
      WHERE COALESCE(e.expected, -1) <> COALESCE(a.actual, -1)
    )
    SELECT
      (SELECT count FROM sales_mismatch) AS "salesMismatches",
      (SELECT count FROM views_mismatch) AS "viewMismatches",
      (SELECT COUNT(*)::int
       FROM core."Orders" o
       JOIN core."Users" u ON u."id" = o."userId"
       WHERE o."metadata"->>'seedName' = :seedName
         AND o."createdAt" < u."createdAt") AS "ordersBeforeUser",
      (SELECT COUNT(*)::int
       FROM core."Orders" o
       WHERE o."metadata"->>'seedName' = :seedName
         AND o."status" <> 'paid') AS "unpaidOrders",
      (SELECT COUNT(*)::int
       FROM core."Orders" o
       LEFT JOIN core."Payments" p
         ON p."orderId" = o."id"
        AND p."status" = 'paid'
       WHERE o."metadata"->>'seedName' = :seedName
       GROUP BY o."id"
       HAVING COUNT(p."id") <> 1
       LIMIT 1) AS "ordersWithoutOnePaidPayment",
      (SELECT COUNT(*)::int
       FROM core."Payments" p
       JOIN core."Orders" o ON o."id" = p."orderId"
       WHERE p."metadata"->>'seedName' = :seedName
         AND p."status" = 'paid'
         AND ROUND(p."amount"::numeric, 2) <> ROUND(o."total"::numeric, 2)) AS "paymentAmountMismatches";
    `,
    {
      replacements: {
        seedName: SEED_NAME,
        source: SEED_SOURCE,
        salesJson: JSON.stringify(
          salesRows.map((row) => ({
            product_id: row.id_producto,
            month: row.mes,
            expected: row.unidades_vendidas,
          }))
        ),
        viewsJson: JSON.stringify(
          viewRows.map((row) => ({
            product_id: row.id_producto,
            month: row.mes,
            expected: row.vistas_producto,
          }))
        ),
      },
      type: QueryTypes.SELECT,
    }
  );

  const validation = rows[0];
  const failures = Object.entries(validation).filter(([, value]) => Number(value ?? 0) !== 0);

  if (failures.length > 0) {
    throw new Error(`Validacion post-insercion fallida: ${JSON.stringify(validation)}`);
  }

  return {
    ...validation,
    products: products.length,
    months: months.length,
  };
}

async function applySeed({ months, products, salesRows, viewRows }) {
  const productById = productMapByBusinessId(products);
  const orderPlans = buildOrderPlans({ months, products, salesRows });
  const salesRowsByMonth = new Map(months.map((month) => [month, []]));
  const viewRowsByMonth = new Map(months.map((month) => [month, []]));

  for (const row of salesRows) salesRowsByMonth.get(row.mes)?.push(row);
  for (const row of viewRows) viewRowsByMonth.get(row.mes)?.push(row);

  const orderPlansByMonth = new Map(months.map((month) => [month, []]));
  for (const plan of orderPlans) orderPlansByMonth.get(plan.month)?.push(plan);

  const totals = {
    orders: 0,
    orderItems: 0,
    payments: 0,
    behaviorEvents: 0,
  };

  await sequelize.transaction(async (transaction) => {
    await assertNoExistingSeed(transaction);
    const users = await ensureHistoricalUsers(transaction);

    for (const month of months) {
      const plans = assignUsersToPlans(orderPlansByMonth.get(month) ?? [], users);
      const orderResult = await insertOrdersForMonth({
        month,
        plans,
        transaction,
      });
      const viewResult = await insertViewEventsForMonth({
        month,
        viewRows: viewRowsByMonth.get(month) ?? [],
        productById,
        transaction,
      });

      totals.orders += orderResult.orders;
      totals.orderItems += orderResult.orderItems;
      totals.payments += orderResult.payments;
      totals.behaviorEvents += viewResult;
    }
  });

  const validation = await validateInsertedData({
    salesRows,
    viewRows,
    months,
    products,
  });

  return { totals, validation };
}

async function cleanupSeed() {
  return sequelize.transaction(async (transaction) => {
    const seedOrderRows = await sequelize.query(
      `
      SELECT "id"
      FROM core."Orders"
      WHERE "metadata"->>'seedName' = :seedName;
      `,
      {
        replacements: { seedName: SEED_NAME },
        transaction,
        type: QueryTypes.SELECT,
      }
    );
    const orderIds = seedOrderRows.map((row) => row.id);
    const seedPaymentRows = await sequelize.query(
      `
      SELECT "id"
      FROM core."Payments"
      WHERE "metadata"->>'seedName' = :seedName
         OR (:hasOrders AND "orderId" IN (:orderIds));
      `,
      {
        replacements: {
          seedName: SEED_NAME,
          hasOrders: orderIds.length > 0,
          orderIds: orderIds.length > 0 ? orderIds : [null],
        },
        transaction,
        type: QueryTypes.SELECT,
      }
    );
    const paymentIds = seedPaymentRows.map((row) => row.id);
    const seedRefundRows = paymentIds.length
      ? await PaymentRefund.findAll({
          attributes: ["id"],
          where: { paymentId: paymentIds },
          transaction,
          raw: true,
        })
      : [];
    const refundIds = seedRefundRows.map((row) => row.id);
    const seedOrderItemRows = orderIds.length
      ? await OrderItem.findAll({
          attributes: ["id"],
          where: { orderId: orderIds },
          transaction,
          raw: true,
        })
      : [];
    const orderItemIds = seedOrderItemRows.map((row) => row.id);

    const deletedRefundItems = refundIds.length
      ? await PaymentRefundItem.destroy({
          where: { refundId: refundIds },
          transaction,
        })
      : 0;
    const deletedRefunds = refundIds.length
      ? await PaymentRefund.destroy({ where: { id: refundIds }, transaction })
      : 0;
    const deletedReceipts = paymentIds.length
      ? await Receipt.destroy({ where: { paymentId: paymentIds }, transaction })
      : 0;
    const deletedPayments = paymentIds.length
      ? await Payment.destroy({ where: { id: paymentIds }, transaction })
      : 0;
    const deletedInventoryMovements = orderItemIds.length
      ? await InventoryMovement.destroy({
          where: { orderItemId: orderItemIds },
          transaction,
        })
      : 0;
    const deletedOrderItems = orderIds.length
      ? await OrderItem.destroy({ where: { orderId: orderIds }, transaction })
      : 0;
    const deletedOrders = orderIds.length
      ? await Order.destroy({ where: { id: orderIds }, transaction })
      : 0;
    const deletedBehaviorEvents = await BehaviorEvent.destroy({
      where: { source: SEED_SOURCE },
      transaction,
    });
    const [deletedUserRows] = await sequelize.query(
      `
      DELETE FROM core."Users" u
      WHERE lower(u."email") LIKE :userLike
        AND NOT EXISTS (SELECT 1 FROM core."Orders" o WHERE o."userId" = u."id")
        AND NOT EXISTS (SELECT 1 FROM core."Payments" p WHERE p."userId" = u."id")
        AND NOT EXISTS (SELECT 1 FROM core."BehaviorEvents" b WHERE b."userId" = u."id")
      RETURNING u."id";
      `,
      {
        replacements: {
          userLike: `${HISTORICAL_USER_EMAIL_PREFIX}%@${HISTORICAL_USER_EMAIL_DOMAIN}`,
        },
        transaction,
      }
    );

    return {
      deletedRefundItems,
      deletedRefunds,
      deletedReceipts,
      deletedPayments,
      deletedInventoryMovements,
      deletedOrderItems,
      deletedOrders,
      deletedBehaviorEvents,
      deletedUsers: deletedUserRows.length,
    };
  });
}

async function runSimulation({ limitProducts }) {
  const validated = await validateInputs({ limitProducts });
  const orderPlans = buildOrderPlans(validated);
  const summary = buildPlanSummary({
    orderPlans,
    salesRows: validated.salesRows,
    viewRows: validated.viewRows,
  });
  const existing = await loadExistingSeedState();

  console.log("Simulacion completada. No se inserto nada.");
  console.log(`Productos activos considerados: ${validated.products.length}`);
  console.log(`Meses validados: ${validated.months.length}`);
  console.log(`Filas ventas CSV: ${validated.salesRows.length}`);
  console.log(`Filas vistas CSV: ${validated.viewRows.length}`);
  console.log(`Unidades totales: ${summary.totalUnits}`);
  console.log(`Vistas totales: ${summary.totalViews}`);
  console.log(`Ordenes estimadas: ${summary.estimatedOrders}`);
  console.log(`OrderItems estimados: ${summary.estimatedOrderItems}`);
  console.log(`Pagos estimados: ${summary.estimatedPayments}`);
  console.log(`Eventos BehaviorEvents estimados: ${summary.estimatedBehaviorEvents}`);
  console.log(`Archivo ventas: ${displayPath(SALES_MONTHLY_FILE)}`);
  console.log(`Archivo vistas: ${displayPath(VIEWS_MONTHLY_FILE)}`);
  console.log(`Seed existente: ${JSON.stringify(existing)}`);

  if (limitProducts) {
    console.log(
      `Advertencia: simulacion limitada a ${limitProducts} productos; no usar con --apply.`
    );
  }
}

async function main() {
  const args = parseArgs();

  try {
    await sequelize.authenticate();

    if (args.clean) {
      const result = await cleanupSeed();
      console.log("Limpieza del seed completada");
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!args.apply) {
      await runSimulation({ limitProducts: args.limitProducts });
      return;
    }

    const validated = await validateInputs({ limitProducts: null });
    const result = await applySeed(validated);

    console.log("Insercion del seed completada");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en importHistoricalProductRegressionData:", error);
  process.exit(1);
});
