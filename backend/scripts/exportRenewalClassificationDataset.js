import { Op, literal, where } from "sequelize";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  Product,
  SubscriptionHistory,
  User,
  UserSubscription,
} from "../models/index.js";

const SEED_NAME = "renewal-classification-monthly-v2";
const ASSOCIATION_SEED_NAME = "association-rules-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEST_USERS_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/seed500TestUsers.json"
);
const CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/renewalClassificationMonthlyV2Seed.json"
);
const EXPORT_DIR = path.resolve(SCRIPT_DIR, "../storage/exports");
const MAIN_FILE = path.join(EXPORT_DIR, "dataset_renovacion_mensual.csv");
const AUDIT_FILE = path.join(EXPORT_DIR, "dataset_renovacion_mensual_audit.csv");
const EXCLUDED_USERS_FILE = path.join(
  EXPORT_DIR,
  "dataset_renovacion_mensual_excluded_users.csv"
);
const SUMMARY_FILE = path.join(
  EXPORT_DIR,
  "dataset_renovacion_mensual_summary.json"
);
const DICTIONARY_FILE = path.join(
  EXPORT_DIR,
  "dataset_renovacion_mensual_diccionario.json"
);

const MAIN_COLUMNS = Object.freeze([
  "planName",
  "amountPaid",
  "paymentMethod",
  "source",
  "autoRenew",
  "previousSubscriptionsCount",
  "previousRenewalsCount",
  "previousRenewalRate",
  "daysAsCustomer",
  "daysSincePreviousSubscription",
  "changedPlan",
  "previousAmountPaidAvg",
  "amountPaidChange",
  "paidOrdersCount",
  "productsPurchasedCount",
  "totalProductSpend",
  "averageOrderValue",
  "daysSinceLastPurchase",
  "successfulPaymentsCount",
  "failedPaymentsCount",
  "refundedPaymentsCount",
  "renewedNextPeriod",
]);

const AUDIT_COLUMNS = Object.freeze([
  "userId",
  "subscriptionId",
  "historyId",
  "userCreatedAt",
  "startsAt",
  "endsAt",
  "durationDays",
  "seedName",
  "currentPaymentCreatedAt",
  "currentPaymentPaidAt",
  "endsAtCutoff",
  "latestPreviousOutcomeKnownAt",
  "nextSubscriptionStartsAt",
  "maxPurchaseDateUsed",
  "maxPaymentDateUsed",
  "userTotalDatasetRows",
  "cycleNumber",
  "duplicateFeatureGroupSize",
  "contradictoryDuplicateFeatureGroup",
  ...MAIN_COLUMNS,
]);

const EXCLUDED_USERS_COLUMNS = Object.freeze([
  "userId",
  "email",
  "userCreatedAt",
  "subscriptionsFound",
  "historiesFound",
  "definitiveHistoriesFound",
  "pendingHistoriesFound",
  "exclusionReason",
]);

const FORBIDDEN_MAIN_COLUMNS = Object.freeze([
  "id",
  "userId",
  "subscriptionId",
  "historyId",
  "planId",
  "paymentId",
  "orderId",
  "email",
  "password",
  "providerId",
  "externalReference",
  "idempotencyKey",
  "startsAt",
  "endsAt",
  "cancelledAt",
  "cancelReason",
  "durationDays",
  "isGroupSubscription",
]);

function toCents(value) {
  if (value == null || value === "") return 0;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.round(numberValue * 100);
}

function centsToDecimal(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

function roundSix(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function dateOnlyToUtc(dateOnly) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function dateOnlyToUtcEnd(dateOnly) {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}

function dateToDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function diffDateOnlyDays(laterDateOnly, earlierDateOnly) {
  return Math.floor(
    (dateOnlyToUtc(laterDateOnly).getTime() -
      dateOnlyToUtc(earlierDateOnly).getTime()) /
      DAY_MS
  );
}

function addDaysToDateOnly(dateOnly, days) {
  const date = dateOnlyToUtc(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isOnOrBefore(value, cutoff) {
  if (!value) return false;
  return new Date(value).getTime() <= cutoff.getTime();
}

function csvEscape(value) {
  if (value == null) return "";
  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function rowsToCsv(columns, rows) {
  const lines = [columns.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeAtomic(filePath, content) {
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, content, "utf8");
  await rename(tmpPath, filePath);
}

async function writeJsonAtomic(filePath, value) {
  await writeAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function cleanupTemporaryFiles() {
  await Promise.all(
    [
      MAIN_FILE,
      AUDIT_FILE,
      EXCLUDED_USERS_FILE,
      SUMMARY_FILE,
      DICTIONARY_FILE,
    ].map((filePath) =>
      rm(`${filePath}.tmp`, { force: true })
    )
  );
}

function nonEmptyStrings(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()))];
}

function rowObjectFromModel(model) {
  return model.get({ plain: true });
}

function toIsoOrEmpty(value) {
  return value ? new Date(value).toISOString() : "";
}

function seedNameFromNotes(notes) {
  return typeof notes === "string" && notes.includes(SEED_NAME) ? SEED_NAME : "";
}

async function loadSeedUsers() {
  const manifest = await readJsonIfExists(TEST_USERS_FILE);
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("No se pudo leer el manifiesto seed500TestUsers.json.");
  }

  const expectedEmails = nonEmptyStrings(
    manifest.map((entry) => entry.email?.trim().toLowerCase())
  );
  const users = await User.findAll({
    where: {
      email: { [Op.in]: expectedEmails },
      role: "cliente",
    },
    attributes: ["id", "email", "role", "createdAt"],
    raw: true,
  });
  const foundEmailSet = new Set(users.map((user) => user.email.toLowerCase()));
  const missingUsers = expectedEmails
    .filter((email) => !foundEmailSet.has(email))
    .map((email) => ({
      userId: "",
      email,
      userCreatedAt: "",
      subscriptionsFound: 0,
      historiesFound: 0,
      definitiveHistoriesFound: 0,
      pendingHistoriesFound: 0,
      exclusionReason: "not_found_in_database",
    }));

  return {
    usersExpected: expectedEmails.length,
    usersFound: users.length,
    users: users.map((user) => ({
      ...user,
      email: user.email.toLowerCase(),
      createdAtIso: toIsoOrEmpty(user.createdAt),
      createdDateOnly: dateToDateOnly(user.createdAt),
    })),
    missingUsers,
  };
}

async function tableSnapshot() {
  const tables = {
    Users: User,
    Products: Product,
    Orders: Order,
    OrderItems: OrderItem,
    MembershipPlans: MembershipPlan,
    UserSubscriptions: UserSubscription,
    Payments: Payment,
    SubscriptionHistories: SubscriptionHistory,
  };
  const snapshot = {};

  for (const [name, model] of Object.entries(tables)) {
    const [count, maxUpdatedAt] = await Promise.all([
      model.count(),
      model.max("updatedAt"),
    ]);
    snapshot[name] = {
      count,
      maxUpdatedAt: maxUpdatedAt ? new Date(maxUpdatedAt).toISOString() : null,
    };
  }

  return snapshot;
}

function compareSnapshots(before, after) {
  const differences = [];
  for (const tableName of Object.keys(before)) {
    if (before[tableName].count !== after[tableName].count) {
      differences.push(
        `${tableName}: count ${before[tableName].count} -> ${after[tableName].count}`
      );
    }
    if (before[tableName].maxUpdatedAt !== after[tableName].maxUpdatedAt) {
      differences.push(
        `${tableName}: maxUpdatedAt ${before[tableName].maxUpdatedAt} -> ${after[tableName].maxUpdatedAt}`
      );
    }
  }
  return differences;
}

async function loadSeedHistories() {
  const control = await readJsonIfExists(CONTROL_FILE);
  const controlIsValid = control?.seedName === SEED_NAME;
  const controlSubscriptionIds = controlIsValid
    ? nonEmptyStrings(control.subscriptionIds)
    : [];
  const controlHistoryIds = controlIsValid ? nonEmptyStrings(control.historyIds) : [];
  let source = "control-file";
  let subscriptions = [];

  if (controlSubscriptionIds.length > 0) {
    subscriptions = await UserSubscription.findAll({
      where: {
        id: { [Op.in]: controlSubscriptionIds },
        notes: { [Op.like]: `%${SEED_NAME}%` },
      },
      order: [
        ["startsAt", "ASC"],
        ["id", "ASC"],
      ],
    });
  }

  if (subscriptions.length === 0 && controlHistoryIds.length === 0) {
    source = "subscription-notes";
    subscriptions = await UserSubscription.findAll({
      where: {
        notes: { [Op.like]: `%${SEED_NAME}%` },
      },
      order: [
        ["startsAt", "ASC"],
        ["id", "ASC"],
      ],
    });
  }

  const subscriptionIds = subscriptions.map((subscription) => subscription.id);
  const historyWhere = {};

  if (controlHistoryIds.length > 0) {
    historyWhere.id = { [Op.in]: controlHistoryIds };
  } else if (subscriptionIds.length > 0) {
    historyWhere.subscriptionId = { [Op.in]: subscriptionIds };
  } else {
    throw new Error(
      "No fue posible identificar de forma segura los historiales monthly v2."
    );
  }

  const histories = await SubscriptionHistory.findAll({
    where: historyWhere,
    include: [
      {
        model: UserSubscription,
        as: "subscription",
        required: true,
        where:
          subscriptionIds.length > 0
            ? { id: { [Op.in]: subscriptionIds } }
            : { notes: { [Op.like]: `%${SEED_NAME}%` } },
      },
    ],
    order: [
      ["startsAt", "ASC"],
      ["subscriptionId", "ASC"],
    ],
  });

  if (histories.length === 0) {
    throw new Error("No se encontraron historiales del seed monthly v2.");
  }

  return {
    source,
    control,
    histories: histories.map(rowObjectFromModel),
  };
}

async function loadAssociationProductOrders(userIds) {
  if (userIds.length === 0) return [];

  const orders = await Order.findAll({
    where: {
      userId: { [Op.in]: userIds },
      status: "paid",
      [Op.and]: where(literal(`"Order"."metadata"->>'seedName'`), ASSOCIATION_SEED_NAME),
    },
    include: [
      {
        model: OrderItem,
        as: "items",
        required: false,
        where: { itemType: "product" },
      },
    ],
    order: [
      ["createdAt", "ASC"],
      ["orderNumber", "ASC"],
    ],
  });

  return orders.map(rowObjectFromModel);
}

async function loadMembershipPayments(userIds) {
  if (userIds.length === 0) return [];

  const payments = await Payment.findAll({
    where: {
      userId: { [Op.in]: userIds },
      paymentType: "membership",
    },
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
  });

  return payments.map(rowObjectFromModel);
}

async function loadSubscriptionsForUsers(userIds) {
  if (userIds.length === 0) return [];

  const subscriptions = await UserSubscription.findAll({
    where: {
      userId: { [Op.in]: userIds },
    },
    order: [
      ["startsAt", "ASC"],
      ["id", "ASC"],
    ],
    raw: true,
  });

  return subscriptions;
}

async function loadHistoriesForSubscriptions(subscriptionIds) {
  if (subscriptionIds.length === 0) return [];

  const histories = await SubscriptionHistory.findAll({
    where: {
      subscriptionId: { [Op.in]: subscriptionIds },
    },
    order: [
      ["startsAt", "ASC"],
      ["subscriptionId", "ASC"],
    ],
    raw: true,
  });

  return histories;
}

function groupByUser(rows) {
  const byUser = new Map();
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, []);
    byUser.get(row.userId).push(row);
  }
  return byUser;
}

function orderDate(order) {
  return order.paidAt ?? order.createdAt;
}

function productSpendForItem(item, warnings) {
  if (item.subtotal != null) {
    return toCents(item.subtotal);
  }

  if (item.quantity == null) {
    warnings.push(`OrderItem ${item.id} no tiene quantity para calcular subtotal.`);
    return 0;
  }

  return Number(item.quantity) * toCents(item.unitPrice);
}

function summarizeOrdersUntil({ orders, cutoff, cutoffDateOnly, warnings }) {
  let paidOrdersCount = 0;
  let productsPurchasedCount = 0;
  let totalProductSpendCents = 0;
  let maxPurchaseDateUsed = null;

  for (const order of orders) {
    const purchaseDate = orderDate(order);
    if (!isOnOrBefore(purchaseDate, cutoff)) continue;

    paidOrdersCount += 1;
    if (!maxPurchaseDateUsed || new Date(purchaseDate) > new Date(maxPurchaseDateUsed)) {
      maxPurchaseDateUsed = purchaseDate;
    }

    for (const item of order.items ?? []) {
      if (item.itemType !== "product") continue;
      if (item.quantity == null) {
        warnings.push(`OrderItem ${item.id} no tiene quantity.`);
      } else {
        productsPurchasedCount += Number(item.quantity);
      }
      totalProductSpendCents += productSpendForItem(item, warnings);
    }
  }

  const averageOrderValueCents =
    paidOrdersCount > 0 ? Math.round(totalProductSpendCents / paidOrdersCount) : 0;
  const daysSinceLastPurchase = maxPurchaseDateUsed
    ? diffDateOnlyDays(cutoffDateOnly, dateToDateOnly(maxPurchaseDateUsed))
    : -1;

  return {
    paidOrdersCount,
    productsPurchasedCount,
    totalProductSpend: centsToDecimal(totalProductSpendCents),
    averageOrderValue: centsToDecimal(averageOrderValueCents),
    daysSinceLastPurchase,
    maxPurchaseDateUsed: maxPurchaseDateUsed
      ? new Date(maxPurchaseDateUsed).toISOString()
      : "",
  };
}

function summarizePaymentsUntil({ payments, cutoff }) {
  let successfulPaymentsCount = 0;
  let failedPaymentsCount = 0;
  let refundedPaymentsCount = 0;
  let maxPaymentDateUsed = null;

  for (const payment of payments) {
    if (!isOnOrBefore(payment.createdAt, cutoff)) continue;

    if (!maxPaymentDateUsed || new Date(payment.createdAt) > new Date(maxPaymentDateUsed)) {
      maxPaymentDateUsed = payment.createdAt;
    }

    if (payment.status === "paid") successfulPaymentsCount += 1;
    if (payment.status === "failed") failedPaymentsCount += 1;
    if (payment.status === "refunded") refundedPaymentsCount += 1;
  }

  return {
    successfulPaymentsCount,
    failedPaymentsCount,
    refundedPaymentsCount,
    maxPaymentDateUsed: maxPaymentDateUsed
      ? new Date(maxPaymentDateUsed).toISOString()
      : "",
  };
}

function findNextSubscription(historiesForUser, currentHistory) {
  return historiesForUser.find(
    (history) =>
      history.subscriptionId !== currentHistory.subscriptionId &&
      history.startsAt > currentHistory.startsAt
  );
}

function buildRows({ histories, ordersByUser, paymentsByUser, paymentsById, userById }) {
  const warnings = [];
  const validationErrors = [];
  const historiesByUser = groupByUser(histories);
  const mainRows = [];
  const auditRows = [];

  for (const userHistories of historiesByUser.values()) {
    userHistories.sort((left, right) => {
      if (left.startsAt !== right.startsAt) return left.startsAt.localeCompare(right.startsAt);
      return left.subscriptionId.localeCompare(right.subscriptionId);
    });
  }

  const definitiveHistories = histories
    .filter((history) => history.renewedNextPeriod !== null)
    .sort((left, right) => {
      if (left.startsAt !== right.startsAt) return left.startsAt.localeCompare(right.startsAt);
      return left.subscriptionId.localeCompare(right.subscriptionId);
    });

  for (const history of definitiveHistories) {
    if (history.durationDays !== 30) {
      validationErrors.push(`History ${history.id} tiene durationDays=${history.durationDays}.`);
      continue;
    }

    const cutoffDateOnly = history.endsAt;
    const cutoff = dateOnlyToUtcEnd(cutoffDateOnly);
    const user = userById.get(history.userId);
    const historiesForUser = historiesByUser.get(history.userId) ?? [];
    const currentIndex = historiesForUser.findIndex(
      (candidate) => candidate.subscriptionId === history.subscriptionId
    );
    const previousHistories = historiesForUser.filter(
      (candidate) =>
        candidate.subscriptionId !== history.subscriptionId &&
        candidate.startsAt < history.startsAt
    );
    const previousSubscription = currentIndex > 0 ? historiesForUser[currentIndex - 1] : null;
    const knownPreviousRenewals = previousHistories.filter(
      (candidate) =>
        candidate.renewedNextPeriod === true &&
        addDaysToDateOnly(candidate.endsAt, 30) <= cutoffDateOnly
    );
    const latestPreviousOutcomeKnownAt = knownPreviousRenewals.reduce(
      (latest, candidate) => {
        const knownAt = addDaysToDateOnly(candidate.endsAt, 30);
        return latest && latest > knownAt ? latest : knownAt;
      },
      ""
    );
    const previousSubscriptionsCount = previousHistories.length;
    const previousRenewalsCount = knownPreviousRenewals.length;
    const previousRenewalRate =
      previousSubscriptionsCount > 0
        ? roundSix(previousRenewalsCount / previousSubscriptionsCount)
        : 0;
    const firstSubscription = historiesForUser[0];
    const daysAsCustomer = Math.max(
      0,
      diffDateOnlyDays(cutoffDateOnly, firstSubscription.startsAt)
    );
    const daysSincePreviousSubscription = previousSubscription
      ? Math.max(0, diffDateOnlyDays(history.startsAt, previousSubscription.endsAt))
      : -1;
    const changedPlan =
      previousSubscription && previousSubscription.planName !== history.planName ? 1 : 0;
    const previousAmountPaidAvgCents =
      previousHistories.length > 0
        ? Math.round(
            previousHistories.reduce(
              (sum, candidate) => sum + toCents(candidate.amountPaid),
              0
            ) / previousHistories.length
          )
        : 0;
    const currentAmountCents = toCents(history.amountPaid);
    const orderStats = summarizeOrdersUntil({
      orders: ordersByUser.get(history.userId) ?? [],
      cutoff,
      cutoffDateOnly,
      warnings,
    });
    const paymentStats = summarizePaymentsUntil({
      payments: paymentsByUser.get(history.userId) ?? [],
      cutoff,
    });
    const currentPayment = paymentsById.get(history.subscription?.paymentId);
    const seedName = seedNameFromNotes(history.subscription?.notes);

    if (!history.planName) warnings.push(`History ${history.id} no tiene planName.`);
    if (!history.paymentMethod) warnings.push(`History ${history.id} no tiene paymentMethod.`);
    if (!history.source) warnings.push(`History ${history.id} no tiene source.`);

    const mainRow = {
      planName: history.planName ?? "",
      amountPaid: centsToDecimal(currentAmountCents),
      paymentMethod: history.paymentMethod ?? "",
      source: history.source ?? "",
      autoRenew: history.autoRenew ? 1 : 0,
      previousSubscriptionsCount,
      previousRenewalsCount,
      previousRenewalRate,
      daysAsCustomer,
      daysSincePreviousSubscription,
      changedPlan,
      previousAmountPaidAvg: centsToDecimal(previousAmountPaidAvgCents),
      amountPaidChange: centsToDecimal(
        previousSubscriptionsCount > 0 ? currentAmountCents - previousAmountPaidAvgCents : 0
      ),
      paidOrdersCount: orderStats.paidOrdersCount,
      productsPurchasedCount: orderStats.productsPurchasedCount,
      totalProductSpend: orderStats.totalProductSpend,
      averageOrderValue: orderStats.averageOrderValue,
      daysSinceLastPurchase: orderStats.daysSinceLastPurchase,
      successfulPaymentsCount: paymentStats.successfulPaymentsCount,
      failedPaymentsCount: paymentStats.failedPaymentsCount,
      refundedPaymentsCount: paymentStats.refundedPaymentsCount,
      renewedNextPeriod: history.renewedNextPeriod ? 1 : 0,
    };

    const nextSubscription = findNextSubscription(historiesForUser, history);
    const auditRow = {
      userId: history.userId,
      subscriptionId: history.subscriptionId,
      historyId: history.id,
      userCreatedAt: user?.createdAtIso ?? "",
      startsAt: history.startsAt,
      endsAt: history.endsAt,
      durationDays: history.durationDays,
      seedName,
      currentPaymentCreatedAt: toIsoOrEmpty(currentPayment?.createdAt),
      currentPaymentPaidAt: toIsoOrEmpty(currentPayment?.paidAt),
      currentPaymentStatus: currentPayment?.status ?? "",
      endsAtCutoff: cutoff.toISOString(),
      latestPreviousOutcomeKnownAt,
      nextSubscriptionStartsAt: nextSubscription?.startsAt ?? "",
      maxPurchaseDateUsed: orderStats.maxPurchaseDateUsed,
      maxPaymentDateUsed: paymentStats.maxPaymentDateUsed,
      userTotalDatasetRows: 0,
      cycleNumber: currentIndex + 1,
      duplicateFeatureGroupSize: 1,
      contradictoryDuplicateFeatureGroup: 0,
      ...mainRow,
    };

    mainRows.push(mainRow);
    auditRows.push(auditRow);
  }

  const rowsByUser = countBy(auditRows, "userId");
  for (const row of auditRows) {
    row.userTotalDatasetRows = rowsByUser[row.userId] ?? 0;
  }

  return { mainRows, auditRows, warnings, validationErrors };
}

function summarizeDuplicateFeatures(mainRows, auditRows) {
  const featureColumns = MAIN_COLUMNS.filter((column) => column !== "renewedNextPeriod");
  const groups = new Map();

  mainRows.forEach((row, index) => {
    const key = featureColumns.map((column) => row[column]).join("\u001f");
    if (!groups.has(key)) groups.set(key, { indexes: [], labels: new Set() });
    groups.get(key).indexes.push(index);
    groups.get(key).labels.add(row.renewedNextPeriod);
  });

  let duplicateFeatureRows = 0;
  let contradictoryDuplicateFeatureRows = 0;
  let contradictoryDuplicateFeatureCombinations = 0;

  for (const group of groups.values()) {
    if (group.indexes.length > 1) duplicateFeatureRows += group.indexes.length;

    const contradictory = group.labels.size > 1;
    if (contradictory) {
      contradictoryDuplicateFeatureRows += group.indexes.length;
      contradictoryDuplicateFeatureCombinations += 1;
    }

    for (const index of group.indexes) {
      auditRows[index].duplicateFeatureGroupSize = group.indexes.length;
      auditRows[index].contradictoryDuplicateFeatureGroup = contradictory ? 1 : 0;
    }
  }

  return {
    duplicateFeatureRows,
    contradictoryDuplicateFeatureRows,
    contradictoryDuplicateFeatureCombinations,
  };
}

function countBy(rows, column) {
  return rows.reduce((counts, row) => {
    const key = String(row[column]);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function nullValuesByColumn(rows) {
  const result = {};
  for (const column of MAIN_COLUMNS) {
    result[column] = rows.filter(
      (row) => row[column] == null || row[column] === ""
    ).length;
  }
  return result;
}

function renewalRatesBy(rows, column) {
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row[column]);
    if (!grouped.has(key)) grouped.set(key, { total: 0, renewed: 0 });
    const group = grouped.get(key);
    group.total += 1;
    group.renewed += Number(row.renewedNextPeriod);
  }

  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "es", { numeric: true }))
      .map(([key, group]) => [
        key,
        {
          total: group.total,
          renewedTrue: group.renewed,
          renewedFalse: group.total - group.renewed,
          renewalRate: formatPercent(group.renewed, group.total),
        },
      ])
  );
}

function calculateAuditMetrics({ histories, auditRows }) {
  const metrics = {
    rowsWithPurchaseOnEndDate: 0,
    purchasesAfterEndsAtCutoff: 0,
    paymentsAfterEndsAtCutoff: 0,
    subscriptionsBeforeUserRegistration: 0,
    invalidMainPayments: 0,
    previousOutcomeTemporalErrors: 0,
    nonMonthlyDurations: 0,
    overlaps: 0,
    cycleNumberErrors: 0,
    daysSincePreviousSubscriptionErrors: 0,
    changedPlanErrors: 0,
    daysAsCustomerErrors: 0,
    previousRenewalsCountErrors: 0,
    previousRenewalRateErrors: 0,
    amountPaidChangeErrors: 0,
    averageOrderValueErrors: 0,
    trueWithoutNextSubscription: 0,
    falseWithNextSubscriptionWithinWindow: 0,
  };
  const historiesByUser = groupByUser(histories);
  const auditByHistoryId = new Map(auditRows.map((row) => [row.historyId, row]));

  for (const userHistories of historiesByUser.values()) {
    userHistories.sort((left, right) => {
      if (left.startsAt !== right.startsAt) return left.startsAt.localeCompare(right.startsAt);
      return left.subscriptionId.localeCompare(right.subscriptionId);
    });

    for (let index = 1; index < userHistories.length; index += 1) {
      if (userHistories[index].startsAt <= userHistories[index - 1].endsAt) {
        metrics.overlaps += 1;
      }
    }

    for (let index = 0; index < userHistories.length; index += 1) {
      const history = userHistories[index];
      const row = auditByHistoryId.get(history.id);
      if (!row) continue;

      const previousHistories = userHistories.slice(0, index);
      const previousSubscription = userHistories[index - 1] ?? null;
      const firstSubscription = userHistories[0];
      const nextSubscription = userHistories[index + 1] ?? null;
      const cutoff = new Date(row.endsAtCutoff);

      if (row.durationDays !== 30) metrics.nonMonthlyDurations += 1;

      if (!row.userCreatedAt || row.startsAt < dateToDateOnly(row.userCreatedAt)) {
        metrics.subscriptionsBeforeUserRegistration += 1;
      }

      const paymentCreatedDate = dateToDateOnly(row.currentPaymentCreatedAt);
      const paymentPaidDate = dateToDateOnly(row.currentPaymentPaidAt);
      if (
        row.currentPaymentStatus !== "paid" ||
        !paymentCreatedDate ||
        !paymentPaidDate ||
        paymentCreatedDate > row.startsAt ||
        paymentPaidDate > row.startsAt ||
        new Date(row.currentPaymentPaidAt) > cutoff
      ) {
        metrics.invalidMainPayments += 1;
      }

      if (row.maxPurchaseDateUsed) {
        if (dateToDateOnly(row.maxPurchaseDateUsed) === row.endsAt) {
          metrics.rowsWithPurchaseOnEndDate += 1;
        }
        if (new Date(row.maxPurchaseDateUsed) > cutoff) {
          metrics.purchasesAfterEndsAtCutoff += 1;
        }
      }

      if (row.maxPaymentDateUsed && new Date(row.maxPaymentDateUsed) > cutoff) {
        metrics.paymentsAfterEndsAtCutoff += 1;
      }

      if (row.latestPreviousOutcomeKnownAt && row.latestPreviousOutcomeKnownAt > row.endsAt) {
        metrics.previousOutcomeTemporalErrors += 1;
      }

      const knownPreviousRenewals = previousHistories.filter(
        (candidate) =>
          candidate.renewedNextPeriod === true &&
          addDaysToDateOnly(candidate.endsAt, 30) <= row.endsAt
      );
      const expectedPreviousRenewalRate =
        previousHistories.length > 0
          ? roundSix(knownPreviousRenewals.length / previousHistories.length)
          : 0;
      const expectedDaysSincePrevious = previousSubscription
        ? Math.max(0, diffDateOnlyDays(row.startsAt, previousSubscription.endsAt))
        : -1;
      const expectedChangedPlan =
        previousSubscription && previousSubscription.planName !== row.planName ? 1 : 0;
      const expectedDaysAsCustomer = Math.max(
        0,
        diffDateOnlyDays(row.endsAt, firstSubscription.startsAt)
      );
      const expectedPreviousAmountAvgCents =
        previousHistories.length > 0
          ? Math.round(
              previousHistories.reduce(
                (sum, candidate) => sum + toCents(candidate.amountPaid),
                0
              ) / previousHistories.length
            )
          : 0;
      const expectedAmountPaidChangeCents =
        previousHistories.length > 0
          ? toCents(row.amountPaid) - expectedPreviousAmountAvgCents
          : 0;
      const expectedAverageOrderValueCents =
        row.paidOrdersCount > 0
          ? Math.round(toCents(row.totalProductSpend) / row.paidOrdersCount)
          : 0;

      if (row.cycleNumber !== row.previousSubscriptionsCount + 1) {
        metrics.cycleNumberErrors += 1;
      }
      if (row.daysSincePreviousSubscription !== expectedDaysSincePrevious) {
        metrics.daysSincePreviousSubscriptionErrors += 1;
      }
      if (row.changedPlan !== expectedChangedPlan) metrics.changedPlanErrors += 1;
      if (row.daysAsCustomer !== expectedDaysAsCustomer) metrics.daysAsCustomerErrors += 1;
      if (row.previousRenewalsCount !== knownPreviousRenewals.length) {
        metrics.previousRenewalsCountErrors += 1;
      }
      if (Number(row.previousRenewalRate) !== expectedPreviousRenewalRate) {
        metrics.previousRenewalRateErrors += 1;
      }
      if (toCents(row.amountPaidChange) !== expectedAmountPaidChangeCents) {
        metrics.amountPaidChangeErrors += 1;
      }
      if (toCents(row.averageOrderValue) !== expectedAverageOrderValueCents) {
        metrics.averageOrderValueErrors += 1;
      }

      const nextGapDays = nextSubscription
        ? diffDateOnlyDays(nextSubscription.startsAt, row.endsAt)
        : null;
      if (
        row.renewedNextPeriod === 1 &&
        (!nextSubscription || nextGapDays < 1 || nextGapDays > 30)
      ) {
        metrics.trueWithoutNextSubscription += 1;
      }
      if (
        row.renewedNextPeriod === 0 &&
        nextSubscription &&
        nextGapDays >= 1 &&
        nextGapDays <= 30
      ) {
        metrics.falseWithNextSubscriptionWithinWindow += 1;
      }
    }
  }

  metrics.historicalCalculationErrors =
    metrics.cycleNumberErrors +
    metrics.daysSincePreviousSubscriptionErrors +
    metrics.changedPlanErrors +
    metrics.daysAsCustomerErrors +
    metrics.previousRenewalsCountErrors +
    metrics.previousRenewalRateErrors +
    metrics.amountPaidChangeErrors +
    metrics.averageOrderValueErrors;

  return metrics;
}

function buildExcludedUsers({
  seedUsers,
  missingUsers,
  allSubscriptions,
  allHistories,
  includedUserIds,
}) {
  const subscriptionsByUser = groupByUser(allSubscriptions);
  const historiesByUser = groupByUser(allHistories);
  const excludedRows = [...missingUsers];

  for (const user of seedUsers) {
    if (includedUserIds.has(user.id)) continue;

    const subscriptions = subscriptionsByUser.get(user.id) ?? [];
    const histories = historiesByUser.get(user.id) ?? [];
    const definitiveHistories = histories.filter(
      (history) => history.renewedNextPeriod !== null
    );
    const pendingHistories = histories.filter(
      (history) => history.renewedNextPeriod === null
    );
    const hasNonSeedSubscription = subscriptions.some(
      (subscription) => !seedNameFromNotes(subscription.notes)
    );
    const hasNonMonthlyHistory = histories.some(
      (history) => Number(history.durationDays) !== 30
    );
    const hasMissingPayment = subscriptions.some(
      (subscription) => seedNameFromNotes(subscription.notes) && !subscription.paymentId
    );
    const hasInvalidDates = subscriptions.some(
      (subscription) =>
        subscription.startsAt < user.createdDateOnly ||
        subscription.endsAt < subscription.startsAt
    );
    let exclusionReason = "other";

    if (hasNonSeedSubscription) exclusionReason = "existing_non_seed_data";
    else if (hasMissingPayment) exclusionReason = "missing_payment";
    else if (hasInvalidDates) exclusionReason = "invalid_dates";
    else if (hasNonMonthlyHistory) exclusionReason = "non_monthly_subscription";
    else if (subscriptions.length === 0) exclusionReason = "no_subscription";
    else if (definitiveHistories.length === 0 && pendingHistories.length > 0) {
      exclusionReason = "only_pending_histories";
    } else if (definitiveHistories.length === 0) {
      exclusionReason = "registered_too_recently";
    }

    excludedRows.push({
      userId: user.id,
      email: user.email,
      userCreatedAt: user.createdAtIso,
      subscriptionsFound: subscriptions.length,
      historiesFound: histories.length,
      definitiveHistoriesFound: definitiveHistories.length,
      pendingHistoriesFound: pendingHistories.length,
      exclusionReason,
    });
  }

  excludedRows.sort((left, right) => {
    const emailCompare = String(left.email).localeCompare(String(right.email), "es");
    if (emailCompare !== 0) return emailCompare;
    return String(left.userId).localeCompare(String(right.userId));
  });

  return excludedRows;
}

function validateRows({
  histories,
  mainRows,
  auditRows,
  duplicateStats,
  auditMetrics,
  snapshotDifferences,
}) {
  const validationErrors = [];
  const warnings = [];
  const trueCount = mainRows.filter((row) => row.renewedNextPeriod === 1).length;
  const falseCount = mainRows.filter((row) => row.renewedNextPeriod === 0).length;
  const minorityPercentage =
    mainRows.length > 0 ? formatPercent(Math.min(trueCount, falseCount), mainRows.length) : 0;

  for (const forbidden of FORBIDDEN_MAIN_COLUMNS) {
    if (MAIN_COLUMNS.includes(forbidden)) {
      validationErrors.push(`El archivo principal contiene columna prohibida: ${forbidden}.`);
    }
  }

  if (MAIN_COLUMNS.some((column) => column.toLowerCase().includes("prediction"))) {
    validationErrors.push("El archivo principal contiene una columna temporal obsoleta.");
  }

  if (histories.some((history) => history.durationDays !== 30)) {
    validationErrors.push("Hay historiales no mensuales en la seleccion.");
  }

  if (mainRows.some((row) => ![0, 1].includes(row.renewedNextPeriod))) {
    validationErrors.push("Hay etiquetas distintas de 0 o 1.");
  }

  if (mainRows.length !== trueCount + falseCount) {
    validationErrors.push("Hay etiquetas vacias en renewedNextPeriod.");
  }

  if (trueCount === 0 || falseCount === 0) {
    validationErrors.push("El dataset no contiene ambas clases.");
  }

  if (minorityPercentage < 40) {
    validationErrors.push(`La clase minoritaria representa ${minorityPercentage}%.`);
  }

  for (const row of auditRows) {
    const cutoff = new Date(row.endsAtCutoff);

    if (row.maxPurchaseDateUsed && new Date(row.maxPurchaseDateUsed) > cutoff) {
      validationErrors.push(
        `Compra posterior al cierre en history ${row.historyId}: ${row.maxPurchaseDateUsed}.`
      );
    }

    if (row.maxPaymentDateUsed && new Date(row.maxPaymentDateUsed) > cutoff) {
      validationErrors.push(
        `Pago posterior al cierre en history ${row.historyId}: ${row.maxPaymentDateUsed}.`
      );
    }

    if (row.previousRenewalsCount > row.previousSubscriptionsCount) {
      validationErrors.push(
        `previousRenewalsCount supera previousSubscriptionsCount en ${row.historyId}.`
      );
    }

    if (row.previousRenewalRate < 0 || row.previousRenewalRate > 1) {
      validationErrors.push(`previousRenewalRate fuera de rango en ${row.historyId}.`);
    }

    if (row.seedName !== SEED_NAME) {
      validationErrors.push(`History ${row.historyId} no pertenece al seed ${SEED_NAME}.`);
    }

    if (row.daysAsCustomer < 0) validationErrors.push(`daysAsCustomer negativo en ${row.historyId}.`);
    if (row.daysSincePreviousSubscription < -1) {
      validationErrors.push(`daysSincePreviousSubscription invalido en ${row.historyId}.`);
    }
    if (row.daysSinceLastPurchase < -1) {
      validationErrors.push(`daysSinceLastPurchase invalido en ${row.historyId}.`);
    }

    for (const column of [
      "amountPaid",
      "previousAmountPaidAvg",
      "amountPaidChange",
      "totalProductSpend",
      "averageOrderValue",
    ]) {
      if (column === "amountPaidChange") continue;
      if (Number(row[column]) < 0) {
        validationErrors.push(`${column} negativo en ${row.historyId}.`);
      }
    }
  }

  for (const column of MAIN_COLUMNS.filter((column) => column !== "renewedNextPeriod")) {
    const values = new Set(mainRows.map((row) => String(row[column])));
    if (values.size <= 1) {
      validationErrors.push(`La columna ${column} es constante.`);
    }
  }

  if (new Set(mainRows.map((row) => row.planName)).size < 2) {
    validationErrors.push("planName contiene menos de dos valores.");
  }

  for (const [group, stats] of Object.entries(renewalRatesBy(mainRows, "previousSubscriptionsCount"))) {
    if (stats.total >= 40 && (stats.renewalRate === 0 || stats.renewalRate === 100)) {
      validationErrors.push(
        `previousSubscriptionsCount=${group} tiene tasa artificial ${stats.renewalRate}%.`
      );
    }
  }

  for (const [group, stats] of Object.entries(renewalRatesBy(auditRows, "cycleNumber"))) {
    if (stats.total >= 40 && (stats.renewalRate === 0 || stats.renewalRate === 100)) {
      validationErrors.push(`cycleNumber=${group} tiene tasa artificial ${stats.renewalRate}%.`);
    }
  }

  if (auditMetrics.nonMonthlyDurations > 0) {
    validationErrors.push(
      `Duraciones distintas de 30 dias: ${auditMetrics.nonMonthlyDurations}.`
    );
  }

  if (auditMetrics.subscriptionsBeforeUserRegistration > 0) {
    validationErrors.push(
      `Suscripciones anteriores al registro del usuario: ${auditMetrics.subscriptionsBeforeUserRegistration}.`
    );
  }

  if (auditMetrics.overlaps > 0) {
    validationErrors.push(`Solapamientos por usuario: ${auditMetrics.overlaps}.`);
  }

  if (auditMetrics.invalidMainPayments > 0) {
    validationErrors.push(`Pagos principales invalidos: ${auditMetrics.invalidMainPayments}.`);
  }

  if (auditMetrics.purchasesAfterEndsAtCutoff > 0) {
    validationErrors.push(
      `Compras posteriores a endsAtCutoff: ${auditMetrics.purchasesAfterEndsAtCutoff}.`
    );
  }

  if (auditMetrics.paymentsAfterEndsAtCutoff > 0) {
    validationErrors.push(
      `Pagos posteriores a endsAtCutoff: ${auditMetrics.paymentsAfterEndsAtCutoff}.`
    );
  }

  if (auditMetrics.previousOutcomeTemporalErrors > 0) {
    validationErrors.push(
      `Errores temporales en resultados historicos previos: ${auditMetrics.previousOutcomeTemporalErrors}.`
    );
  }

  if (auditMetrics.historicalCalculationErrors > 0) {
    validationErrors.push(
      `Errores de calculo historico: ${auditMetrics.historicalCalculationErrors}.`
    );
  }

  if (auditMetrics.trueWithoutNextSubscription > 0) {
    validationErrors.push(
      `Renovaciones true sin siguiente suscripcion valida: ${auditMetrics.trueWithoutNextSubscription}.`
    );
  }

  if (auditMetrics.falseWithNextSubscriptionWithinWindow > 0) {
    validationErrors.push(
      `Renovaciones false con siguiente suscripcion dentro de 30 dias: ${auditMetrics.falseWithNextSubscriptionWithinWindow}.`
    );
  }

  if (snapshotDifferences.length > 0) {
    validationErrors.push(
      `PostgreSQL cambio durante la exportacion: ${snapshotDifferences.join("; ")}`
    );
  }

  if (duplicateStats.contradictoryDuplicateFeatureRows > mainRows.length * 0.15) {
    warnings.push(
      `Mas del 15% de filas pertenece a combinaciones predictoras contradictorias: ${duplicateStats.contradictoryDuplicateFeatureRows}.`
    );
  }

  return { validationErrors, warnings };
}

function buildSummary({
  histories,
  mainRows,
  auditRows,
  seedUsers,
  seedUsersExpected,
  excludedRows,
  duplicateStats,
  auditMetrics,
  validationErrors,
  warnings,
  dbSnapshotUnchanged,
}) {
  const trueCount = mainRows.filter((row) => row.renewedNextPeriod === 1).length;
  const falseCount = mainRows.filter((row) => row.renewedNextPeriod === 0).length;
  const uniqueCustomers = new Set(auditRows.map((row) => row.userId)).size;

  return {
    generatedAt: new Date().toISOString(),
    seedName: SEED_NAME,
    usersExpected: seedUsersExpected,
    usersFound: seedUsers.length,
    usersIncluded: uniqueCustomers,
    usersExcluded: seedUsers.length - uniqueCustomers,
    excludedUsersByReason: countBy(excludedRows, "exclusionReason"),
    totalHistoriesFound: histories.length,
    rowsExported: mainRows.length,
    renewedTrue: trueCount,
    renewedFalse: falseCount,
    truePercentage: formatPercent(trueCount, mainRows.length),
    falsePercentage: formatPercent(falseCount, mainRows.length),
    uniqueCustomers,
    rowsByPlanName: countBy(mainRows, "planName"),
    rowsByPaymentMethod: countBy(mainRows, "paymentMethod"),
    rowsWithPreviousSubscriptions: mainRows.filter(
      (row) => row.previousSubscriptionsCount > 0
    ).length,
    rowsWithPreviousPurchases: mainRows.filter((row) => row.paidOrdersCount > 0).length,
    rowsWithoutPreviousPurchases: mainRows.filter((row) => row.paidOrdersCount === 0).length,
    nullValuesByColumn: nullValuesByColumn(mainRows),
    duplicateFeatureRows: duplicateStats.duplicateFeatureRows,
    contradictoryDuplicateFeatureRows: duplicateStats.contradictoryDuplicateFeatureRows,
    contradictoryDuplicateFeatureCombinations:
      duplicateStats.contradictoryDuplicateFeatureCombinations,
    rowsWithPurchaseOnEndDate: auditMetrics.rowsWithPurchaseOnEndDate,
    purchasesAfterEndsAtCutoff: auditMetrics.purchasesAfterEndsAtCutoff,
    paymentsAfterEndsAtCutoff: auditMetrics.paymentsAfterEndsAtCutoff,
    subscriptionsBeforeUserRegistration:
      auditMetrics.subscriptionsBeforeUserRegistration,
    invalidMainPayments: auditMetrics.invalidMainPayments,
    previousOutcomeTemporalErrors: auditMetrics.previousOutcomeTemporalErrors,
    nonMonthlyDurations: auditMetrics.nonMonthlyDurations,
    overlaps: auditMetrics.overlaps,
    historicalCalculationErrors: auditMetrics.historicalCalculationErrors,
    trueWithoutNextSubscription: auditMetrics.trueWithoutNextSubscription,
    falseWithNextSubscriptionWithinWindow:
      auditMetrics.falseWithNextSubscriptionWithinWindow,
    renewalRatesByPreviousSubscriptionsCount: renewalRatesBy(
      mainRows,
      "previousSubscriptionsCount"
    ),
    renewalRatesByCycleNumber: renewalRatesBy(auditRows, "cycleNumber"),
    categoricalValues: {
      planName: countBy(mainRows, "planName"),
      paymentMethod: countBy(mainRows, "paymentMethod"),
      source: countBy(mainRows, "source"),
    },
    dbSnapshotUnchanged,
    validationErrors,
    warnings,
  };
}

function buildDictionary() {
  return {
    planName: {
      name: "planName",
      type: "categorical",
      description: "Nombre del plan mensual vigente en el historial.",
      source: "SubscriptionHistories.planName",
      calculation: "Valor directo del historial mensual actual.",
      missingValue: "Se exporta vacio y se registra advertencia.",
    },
    amountPaid: {
      name: "amountPaid",
      type: "numeric",
      description: "Importe pagado por la membresia actual.",
      source: "SubscriptionHistories.amountPaid",
      calculation: "Valor directo redondeado a dos decimales.",
      missingValue: "No aplica; el modelo lo requiere.",
    },
    paymentMethod: {
      name: "paymentMethod",
      type: "categorical",
      description: "Metodo de pago de la membresia actual.",
      source: "SubscriptionHistories.paymentMethod",
      calculation: "Valor directo conservado como texto.",
      missingValue: "Se exporta vacio y se registra advertencia.",
    },
    source: {
      name: "source",
      type: "categorical",
      description: "Canal u origen de la suscripcion actual.",
      source: "SubscriptionHistories.source",
      calculation: "Valor directo conservado como texto.",
      missingValue: "Se exporta vacio y se registra advertencia.",
    },
    autoRenew: {
      name: "autoRenew",
      type: "binary",
      description: "Indica si la membresia actual tenia renovacion automatica activa.",
      source: "SubscriptionHistories.autoRenew",
      calculation: "true se exporta como 1; false como 0.",
      missingValue: "0 cuando el historial indica false.",
    },
    previousSubscriptionsCount: {
      name: "previousSubscriptionsCount",
      type: "numeric",
      description: "Cantidad de membresias anteriores del mismo cliente.",
      source: "SubscriptionHistories",
      calculation: "Cuenta historiales del mismo usuario con startsAt menor al actual.",
      missingValue: "0 si no existen membresias anteriores.",
    },
    previousRenewalsCount: {
      name: "previousRenewalsCount",
      type: "numeric",
      description: "Renovaciones previas conocidas antes del cierre de la membresia actual.",
      source: "SubscriptionHistories.renewedNextPeriod",
      calculation:
        "Cuenta historiales anteriores con renewedNextPeriod=true y endsAt+30 dias <= endsAt actual.",
      missingValue: "0 si no existen renovaciones previas conocidas.",
    },
    previousRenewalRate: {
      name: "previousRenewalRate",
      type: "numeric",
      description: "Tasa historica de renovacion conocida del cliente.",
      source: "SubscriptionHistories",
      calculation:
        "previousRenewalsCount dividido entre previousSubscriptionsCount, redondeado a seis decimales.",
      missingValue: "0 si previousSubscriptionsCount es 0.",
    },
    daysAsCustomer: {
      name: "daysAsCustomer",
      type: "numeric",
      description: "Dias desde la primera membresia del cliente hasta el cierre actual.",
      source: "SubscriptionHistories.startsAt, SubscriptionHistories.endsAt",
      calculation: "Diferencia en dias entre el primer startsAt y el endsAt actual.",
      missingValue: "No aplica; minimo 0.",
    },
    daysSincePreviousSubscription: {
      name: "daysSincePreviousSubscription",
      type: "numeric",
      description: "Dias entre la membresia anterior y la actual.",
      source: "SubscriptionHistories.startsAt, SubscriptionHistories.endsAt",
      calculation: "Diferencia entre startsAt actual y endsAt anterior.",
      missingValue: "-1 si es la primera membresia.",
    },
    changedPlan: {
      name: "changedPlan",
      type: "binary",
      description: "Indica si el plan actual cambio respecto al plan anterior.",
      source: "SubscriptionHistories.planName",
      calculation: "1 si planName actual difiere del anterior; 0 en otro caso.",
      missingValue: "0 si no existe membresia anterior.",
    },
    previousAmountPaidAvg: {
      name: "previousAmountPaidAvg",
      type: "numeric",
      description: "Promedio pagado en membresias anteriores.",
      source: "SubscriptionHistories.amountPaid",
      calculation: "Promedio de amountPaid de historiales anteriores, a dos decimales.",
      missingValue: "0 si no existen membresias anteriores.",
    },
    amountPaidChange: {
      name: "amountPaidChange",
      type: "numeric",
      description: "Cambio del importe actual contra el promedio historico del cliente.",
      source: "SubscriptionHistories.amountPaid",
      calculation: "amountPaid actual menos previousAmountPaidAvg.",
      missingValue: "0 si no existen membresias anteriores.",
    },
    paidOrdersCount: {
      name: "paidOrdersCount",
      type: "numeric",
      description: "Cantidad de ordenes pagadas de productos antes del cierre actual.",
      source: "Orders",
      calculation:
        "Cuenta ordenes status=paid del seed association-rules-v1 con fecha de pago o creacion <= endsAt.",
      missingValue: "0 si no hay compras previas.",
    },
    productsPurchasedCount: {
      name: "productsPurchasedCount",
      type: "numeric",
      description: "Cantidad total de productos comprados antes del cierre actual.",
      source: "Orders, OrderItems",
      calculation: "Suma OrderItems.quantity para itemType=product en ordenes validas.",
      missingValue: "0 si no hay productos previos.",
    },
    totalProductSpend: {
      name: "totalProductSpend",
      type: "numeric",
      description: "Gasto total en productos antes del cierre actual.",
      source: "OrderItems.subtotal",
      calculation: "Suma subtotales de items de producto en ordenes validas.",
      missingValue: "0 si no hay compras previas.",
    },
    averageOrderValue: {
      name: "averageOrderValue",
      type: "numeric",
      description: "Ticket promedio de productos antes del cierre actual.",
      source: "Orders, OrderItems",
      calculation: "totalProductSpend dividido entre paidOrdersCount.",
      missingValue: "0 si paidOrdersCount es 0.",
    },
    daysSinceLastPurchase: {
      name: "daysSinceLastPurchase",
      type: "numeric",
      description: "Dias desde la ultima compra de productos hasta el cierre actual.",
      source: "Orders.paidAt, Orders.createdAt",
      calculation: "Diferencia entre la ultima compra valida y endsAt.",
      missingValue: "-1 si no hay compras previas.",
    },
    successfulPaymentsCount: {
      name: "successfulPaymentsCount",
      type: "numeric",
      description: "Pagos de membresia exitosos antes del cierre actual.",
      source: "Payments.status, Payments.createdAt",
      calculation: "Cuenta Payments membership con status=paid y createdAt <= endsAt.",
      missingValue: "0 si no hay pagos exitosos previos.",
    },
    failedPaymentsCount: {
      name: "failedPaymentsCount",
      type: "numeric",
      description: "Intentos fallidos de pago de membresia antes del cierre actual.",
      source: "Payments.status, Payments.createdAt",
      calculation: "Cuenta Payments membership con status=failed y createdAt <= endsAt.",
      missingValue: "0 si no hay fallos previos.",
    },
    refundedPaymentsCount: {
      name: "refundedPaymentsCount",
      type: "numeric",
      description: "Pagos reembolsados de membresia antes del cierre actual.",
      source: "Payments.status, Payments.createdAt",
      calculation: "Cuenta Payments membership con status=refunded y createdAt <= endsAt.",
      missingValue: "0 si no hay reembolsos previos.",
    },
    renewedNextPeriod: {
      name: "renewedNextPeriod",
      type: "binary target",
      description: "Variable objetivo: renovacion dentro de los 30 dias posteriores.",
      source: "SubscriptionHistories.renewedNextPeriod",
      calculation: "true se exporta como 1; false como 0; null se excluye.",
      missingValue: "Los registros null no se exportan.",
    },
  };
}

async function validateFilesFromDisk(expectedRows, expectedAuditRows, expectedExcludedRows) {
  const mainContent = await readFile(MAIN_FILE, "utf8");
  const auditContent = await readFile(AUDIT_FILE, "utf8");
  const excludedContent = await readFile(EXCLUDED_USERS_FILE, "utf8");
  const summary = JSON.parse(await readFile(SUMMARY_FILE, "utf8"));
  JSON.parse(await readFile(DICTIONARY_FILE, "utf8"));

  const mainLines = mainContent.trimEnd().split(/\r?\n/);
  const auditLines = auditContent.trimEnd().split(/\r?\n/);
  const excludedLines = excludedContent.trimEnd().split(/\r?\n/);
  const headers = mainLines[0].split(",");
  const auditHeaders = auditLines[0].split(",");
  const excludedHeaders = excludedLines[0].split(",");
  const validationErrors = [];

  if (mainLines.length - 1 !== expectedRows) {
    validationErrors.push(
      `Filas del CSV principal ${mainLines.length - 1}; esperado ${expectedRows}.`
    );
  }

  if (auditLines.length - 1 !== expectedAuditRows) {
    validationErrors.push(
      `Filas del CSV de auditoria ${auditLines.length - 1}; esperado ${expectedAuditRows}.`
    );
  }

  if (excludedLines.length - 1 !== expectedExcludedRows) {
    validationErrors.push(
      `Filas del CSV de excluidos ${excludedLines.length - 1}; esperado ${expectedExcludedRows}.`
    );
  }

  if (headers.join(",") !== MAIN_COLUMNS.join(",")) {
    validationErrors.push("Encabezados del CSV principal no coinciden.");
  }

  if (auditHeaders.join(",") !== AUDIT_COLUMNS.join(",")) {
    validationErrors.push("Encabezados del CSV de auditoria no coinciden.");
  }

  if (excludedHeaders.join(",") !== EXCLUDED_USERS_COLUMNS.join(",")) {
    validationErrors.push("Encabezados del CSV de usuarios excluidos no coinciden.");
  }

  for (const forbidden of FORBIDDEN_MAIN_COLUMNS) {
    if (headers.includes(forbidden)) {
      validationErrors.push(`Columna prohibida en disco: ${forbidden}.`);
    }
  }

  if (headers.some((header) => header.toLowerCase().includes("prediction"))) {
    validationErrors.push("Existe una columna temporal obsoleta en disco.");
  }

  const targetIndex = headers.indexOf("renewedNextPeriod");
  const labels = new Set();
  for (const line of mainLines.slice(1)) {
    const cells = line.split(",");
    const label = cells[targetIndex];
    if (!["0", "1"].includes(label)) {
      validationErrors.push(`Etiqueta invalida en CSV principal: ${label}.`);
    }
    labels.add(label);
  }

  if (!labels.has("0") || !labels.has("1")) {
    validationErrors.push("El CSV en disco no contiene ambas clases.");
  }

  if (summary.rowsExported !== expectedRows) {
    validationErrors.push("Resumen en disco no coincide con filas exportadas.");
  }

  return validationErrors;
}

async function ensureMainDatasetContent(content) {
  try {
    const existingContent = await readFile(MAIN_FILE, "utf8");
    if (existingContent !== content) {
      return {
        written: false,
        error:
          "El CSV principal existente difiere del recalculo; no se sobrescribio para evitar cambiar el dataset de entrenamiento sin una validacion critica previa.",
      };
    }

    return { written: false, error: null };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeAtomic(MAIN_FILE, content);
    return { written: true, error: null };
  }
}

async function exportDataset() {
  await mkdir(EXPORT_DIR, { recursive: true });
  await cleanupTemporaryFiles();

  const beforeSnapshot = await tableSnapshot();
  const seedUserState = await loadSeedUsers();
  const seedUserIds = seedUserState.users.map((user) => user.id);
  const userById = new Map(seedUserState.users.map((user) => [user.id, user]));
  const { source, histories } = await loadSeedHistories();
  const [orders, payments, allSubscriptions] = await Promise.all([
    loadAssociationProductOrders(seedUserIds),
    loadMembershipPayments(seedUserIds),
    loadSubscriptionsForUsers(seedUserIds),
  ]);
  const allHistories = await loadHistoriesForSubscriptions(
    allSubscriptions.map((subscription) => subscription.id)
  );
  const ordersByUser = groupByUser(orders);
  const paymentsByUser = groupByUser(payments);
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));
  const rowResult = buildRows({
    histories,
    ordersByUser,
    paymentsByUser,
    paymentsById,
    userById,
  });
  const duplicateStats = summarizeDuplicateFeatures(
    rowResult.mainRows,
    rowResult.auditRows
  );
  const auditMetrics = calculateAuditMetrics({
    histories,
    auditRows: rowResult.auditRows,
  });
  const includedUserIds = new Set(rowResult.auditRows.map((row) => row.userId));
  const excludedRows = buildExcludedUsers({
    seedUsers: seedUserState.users,
    missingUsers: seedUserState.missingUsers,
    allSubscriptions,
    allHistories,
    includedUserIds,
  });
  const afterSnapshot = await tableSnapshot();
  const snapshotDifferences = compareSnapshots(beforeSnapshot, afterSnapshot);
  const validation = validateRows({
    histories,
    mainRows: rowResult.mainRows,
    auditRows: rowResult.auditRows,
    duplicateStats,
    auditMetrics,
    snapshotDifferences,
  });
  const validationErrors = [
    ...rowResult.validationErrors,
    ...validation.validationErrors,
  ];
  const warnings = [
    `Identificacion usada: ${source}.`,
    ...rowResult.warnings,
    ...validation.warnings,
  ];
  const mainContent = rowsToCsv(MAIN_COLUMNS, rowResult.mainRows);

  if (validationErrors.length === 0) {
    const mainWriteResult = await ensureMainDatasetContent(mainContent);
    if (mainWriteResult.error) {
      validationErrors.push(mainWriteResult.error);
    }
    if (mainWriteResult.written) {
      warnings.push("El CSV principal no existia y fue generado.");
    }
  }

  const summary = buildSummary({
    histories,
    mainRows: rowResult.mainRows,
    auditRows: rowResult.auditRows,
    seedUsers: seedUserState.users,
    seedUsersExpected: seedUserState.usersExpected,
    excludedRows,
    duplicateStats,
    auditMetrics,
    validationErrors,
    warnings,
    dbSnapshotUnchanged: snapshotDifferences.length === 0,
  });

  if (validationErrors.length > 0) {
    await writeJsonAtomic(SUMMARY_FILE, summary);
    await writeAtomic(AUDIT_FILE, rowsToCsv(AUDIT_COLUMNS, rowResult.auditRows));
    await writeAtomic(
      EXCLUDED_USERS_FILE,
      rowsToCsv(EXCLUDED_USERS_COLUMNS, excludedRows)
    );
    throw new Error(
      `Validaciones criticas fallaron. No se publico el CSV principal:\n- ${validationErrors.join("\n- ")}`
    );
  }

  await writeAtomic(AUDIT_FILE, rowsToCsv(AUDIT_COLUMNS, rowResult.auditRows));
  await writeAtomic(
    EXCLUDED_USERS_FILE,
    rowsToCsv(EXCLUDED_USERS_COLUMNS, excludedRows)
  );
  await writeJsonAtomic(SUMMARY_FILE, summary);
  await writeJsonAtomic(DICTIONARY_FILE, buildDictionary());

  const diskValidationErrors = await validateFilesFromDisk(
    rowResult.mainRows.length,
    rowResult.auditRows.length,
    excludedRows.length
  );

  if (diskValidationErrors.length > 0) {
    const failedSummary = {
      ...summary,
      validationErrors: [...summary.validationErrors, ...diskValidationErrors],
    };
    await writeJsonAtomic(SUMMARY_FILE, failedSummary);
    throw new Error(
      `Validaciones en disco fallaron:\n- ${diskValidationErrors.join("\n- ")}`
    );
  }

  return {
    summary,
    ordersUsed: orders.length,
    paymentsRead: payments.length,
    excludedRows,
    auditMetrics,
    usersExpected: seedUserState.usersExpected,
    usersFound: seedUserState.usersFound,
  };
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    const result = await exportDataset();
    const { summary, ordersUsed, paymentsRead } = result;

    console.log(`Usuarios ficticios esperados: ${summary.usersExpected}`);
    console.log(`Usuarios encontrados: ${summary.usersFound}`);
    console.log(`Usuarios incluidos en dataset: ${summary.usersIncluded}`);
    console.log(`Usuarios excluidos: ${summary.usersExcluded}`);
    console.log(
      `Motivos de exclusion: ${JSON.stringify(summary.excludedUsersByReason)}`
    );
    console.log(`Historiales sinteticos encontrados: ${summary.totalHistoriesFound}`);
    console.log(`Filas del dataset: ${summary.rowsExported}`);
    console.log(`Clientes unicos: ${summary.uniqueCustomers}`);
    console.log(`Renovo: ${summary.renewedTrue}`);
    console.log(`No renovo: ${summary.renewedFalse}`);
    console.log(`Porcentaje renovo: ${summary.truePercentage}%`);
    console.log(`Porcentaje no renovo: ${summary.falsePercentage}%`);
    console.log(
      `Filas con suscripciones anteriores: ${summary.rowsWithPreviousSubscriptions}`
    );
    console.log(`Filas con compras anteriores: ${summary.rowsWithPreviousPurchases}`);
    console.log(`Filas sin compras anteriores: ${summary.rowsWithoutPreviousPurchases}`);
    console.log(`Ordenes existentes utilizadas: ${ordersUsed}`);
    console.log(`Pagos de membresia leidos: ${paymentsRead}`);
    console.log(`Duplicados predictivos: ${summary.duplicateFeatureRows}`);
    console.log(
      `Duplicados contradictorios: ${summary.contradictoryDuplicateFeatureRows}`
    );
    console.log(`Compras el mismo dia de endsAt: ${summary.rowsWithPurchaseOnEndDate}`);
    console.log(`Compras posteriores a endsAtCutoff: ${summary.purchasesAfterEndsAtCutoff}`);
    console.log(`Pagos posteriores a endsAtCutoff: ${summary.paymentsAfterEndsAtCutoff}`);
    console.log(
      `Suscripciones anteriores al registro: ${summary.subscriptionsBeforeUserRegistration}`
    );
    console.log(`Pagos principales invalidos: ${summary.invalidMainPayments}`);
    console.log(
      `Errores de calculo historico: ${summary.historicalCalculationErrors}`
    );
    console.log("Errores temporales: 0");
    console.log("");
    console.log("Archivos generados:");
    console.log("storage/exports/dataset_renovacion_mensual_audit.csv");
    console.log("storage/exports/dataset_renovacion_mensual_excluded_users.csv");
    console.log("storage/exports/dataset_renovacion_mensual_summary.json");
    console.log("storage/exports/dataset_renovacion_mensual.csv");
    console.log("storage/exports/dataset_renovacion_mensual_diccionario.json");
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en exportRenewalClassificationDataset:", error);
  process.exit(1);
});
