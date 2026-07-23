import { Op, literal } from "sequelize";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
import {
  createOrUpdateSubscriptionHistory,
  updateRenewalClassification,
} from "../services/subscriptionHistoryService.js";

const LEGACY_SEED_NAME = "renewal-classification-v1";
const SEED_NAME = "renewal-classification-monthly-v2";
const SEED_PURPOSE = "monthly-membership-renewal-classification";
const ASSOCIATION_SEED_NAME = "association-rules-v1";
const RANDOM_SEED = "TITANIUM_MONTHLY_RENEWAL_SEED_2026";
const TEST_USER_COUNT = 500;
const REQUESTED_MIN_SUBSCRIPTIONS = 2200;
const REQUESTED_MAX_SUBSCRIPTIONS = 2800;
const REQUESTED_MIN_DEFINITIVE = 1800;
const MAX_PENDING_HISTORIES = 350;
const TRUE_MIN_PERCENT = 45;
const TRUE_MAX_PERCENT = 55;
const TARGET_ADDITIONAL_ATTEMPTS = 520;
const REFERENCE_DATE_ONLY = "2026-07-21";
const REFERENCE_DATE = new Date("2026-07-21T12:00:00.000Z");
const MAX_GENERATED_DATE_ONLY = "2026-07-20";
const DAY_MS = 24 * 60 * 60 * 1000;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEST_USERS_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/seed500TestUsers.json"
);
const LEGACY_CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/renewalClassificationSeed.json"
);
const CONTROL_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/renewalClassificationMonthlyV2Seed.json"
);
const SUMMARY_FILE = path.resolve(
  SCRIPT_DIR,
  "../storage/seeds/renewalClassificationMonthlyV2Summary.json"
);

const PAYMENT_CONFIG = Object.freeze({
  cash: { source: "admin_manual", provider: "none" },
  transfer: { source: "admin_manual", provider: "bank_transfer" },
  card_terminal: {
    source: "admin_manual",
    provider: "mercadopago_terminal",
  },
  online_checkout: {
    source: "online_checkout",
    provider: "mercadopago_checkout",
  },
});

const PAYMENT_METHOD_WEIGHTS = Object.freeze([
  { value: "cash", weight: 30 },
  { value: "transfer", weight: 20 },
  { value: "card_terminal", weight: 20 },
  { value: "online_checkout", weight: 30 },
]);

const ADDITIONAL_ATTEMPT_COUNTS = Object.freeze({
  failed: 370,
  cancelled: 90,
  refunded: 35,
  charged_back: 15,
  pending: 10,
});

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

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toDateOnly(value) {
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function dateOnlyToUtc(dateOnly, hour = 12) {
  return new Date(`${dateOnly}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

function addDaysToDateOnly(dateOnly, days) {
  const date = dateOnlyToUtc(dateOnly, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDays(leftDateOnly, rightDateOnly) {
  return Math.floor(
    (dateOnlyToUtc(leftDateOnly, 0).getTime() -
      dateOnlyToUtc(rightDateOnly, 0).getTime()) /
      DAY_MS
  );
}

function maxDateOnly(left, right) {
  return left > right ? left : right;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseCents(value, fieldName = "amount") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${fieldName} debe ser un monto mayor que cero.`);
  }

  return Math.round(numberValue * 100);
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

function formatPercent(numerator, denominator) {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function chooseWeighted(items, random) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value ?? item;
  }

  return items[items.length - 1].value ?? items[items.length - 1];
}

function seededShuffle(items, random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

function deterministicReference(userIndex, cycle, suffix) {
  return `RCMV2-U${String(userIndex).padStart(4, "0")}-C${String(cycle).padStart(2, "0")}-${suffix}`;
}

function noteFor(userIndex, cycle) {
  return `Synthetic seed: ${SEED_NAME}; userIndex=${String(userIndex).padStart(4, "0")}; cycle=${String(cycle).padStart(2, "0")}`;
}

function statusForSubscription(startsAt, endsAt) {
  if (endsAt < REFERENCE_DATE_ONLY) return "expired";
  if (startsAt <= REFERENCE_DATE_ONLY && endsAt >= REFERENCE_DATE_ONLY) {
    return "active";
  }
  return "pending";
}

function expectedLabelFor({ current, next }) {
  if (next) {
    const gap = diffDays(next.startsAt, current.endsAt);
    return gap >= 1 && gap <= 30;
  }

  return REFERENCE_DATE_ONLY > addDaysToDateOnly(current.endsAt, 30)
    ? false
    : null;
}

function maxMonthlyCyclesForUser(user) {
  let startsAt = user.createdDateOnly;
  let cycles = 0;

  while (true) {
    const endsAt = addDaysToDateOnly(startsAt, 29);
    if (endsAt > MAX_GENERATED_DATE_ONLY) break;
    cycles += 1;
    startsAt = addDaysToDateOnly(endsAt, 1);
  }

  return cycles;
}

async function loadSeedUsers() {
  let entries;

  try {
    entries = JSON.parse(await readFile(TEST_USERS_FILE, "utf8"));
  } catch (error) {
    throw new Error(
      `No se pudo leer ${TEST_USERS_FILE}: ${error.message}`
    );
  }

  if (!Array.isArray(entries) || entries.length !== TEST_USER_COUNT) {
    throw new Error(
      `El manifiesto de usuarios debe contener ${TEST_USER_COUNT} correos.`
    );
  }

  const emails = entries.map((entry) => normalizeEmail(entry.email));
  const users = await User.findAll({
    attributes: ["id", "email", "role", "createdAt", "updatedAt"],
    where: {
      email: {
        [Op.in]: emails,
      },
    },
    raw: true,
  });
  const usersByEmail = new Map(
    users.map((user) => [normalizeEmail(user.email), user])
  );
  const orderedUsers = emails.map((email) => usersByEmail.get(email)).filter(Boolean);
  const nonClientUsers = orderedUsers.filter((user) => user.role !== "cliente");

  if (orderedUsers.length !== TEST_USER_COUNT) {
    throw new Error(
      `Usuarios ficticios encontrados: ${orderedUsers.length}. Se requieren ${TEST_USER_COUNT}.`
    );
  }

  if (nonClientUsers.length > 0) {
    throw new Error(
      `Hay ${nonClientUsers.length} usuarios del manifiesto sin role=cliente.`
    );
  }

  return orderedUsers.map((user, index) => ({
    ...user,
    userIndex: index + 1,
    createdDateOnly: toDateOnly(user.createdAt),
  }));
}

async function findUsersWithNonSeedSubscriptions(users) {
  const subscriptions = await UserSubscription.findAll({
    attributes: ["id", "userId", "notes"],
    where: {
      userId: {
        [Op.in]: users.map((user) => user.id),
      },
      [Op.and]: [
        {
          [Op.or]: [
            { notes: null },
            {
              notes: {
                [Op.notLike]: `%${LEGACY_SEED_NAME}%`,
              },
            },
          ],
        },
        {
          [Op.or]: [
            { notes: null },
            {
              notes: {
                [Op.notLike]: `%${SEED_NAME}%`,
              },
            },
          ],
        },
      ],
    },
    raw: true,
  });
  const excludedByUserId = new Map();

  for (const subscription of subscriptions) {
    if (!excludedByUserId.has(subscription.userId)) {
      excludedByUserId.set(subscription.userId, {
        userId: subscription.userId,
        reason: "Tiene UserSubscription previa ajena a los seeds de clasificacion.",
      });
    }
  }

  return excludedByUserId;
}

async function loadMonthlyPlans() {
  const plans = await MembershipPlan.findAll({
    attributes: ["id", "name", "type", "durationDays", "price", "isActive"],
    where: {
      isActive: true,
      durationDays: 30,
      price: {
        [Op.gt]: 0,
      },
      type: {
        [Op.in]: ["individual", "student"],
      },
    },
    order: [
      ["type", "ASC"],
      ["name", "ASC"],
    ],
    raw: true,
  });
  const prepared = plans.map((plan) => ({
    ...plan,
    durationDays: Number(plan.durationDays),
    priceCents: parseCents(plan.price, `MembershipPlan ${plan.name}`),
  }));
  const regular = prepared.find(
    (plan) =>
      plan.type === "individual" &&
      plan.name.toLowerCase().includes("regular")
  ) ?? prepared.find((plan) => plan.type === "individual");
  const student = prepared.find(
    (plan) =>
      plan.type === "student" ||
      plan.name.toLowerCase().includes("estudiante")
  );

  if (!regular || !student) {
    throw new Error(
      "No se encontraron los planes mensuales esperados Regular mensual y Estudiante mensual."
    );
  }

  return {
    all: prepared,
    regular,
    student,
  };
}

async function loadAssociationOrders(users) {
  const orders = await Order.findAll({
    attributes: ["id", "userId", "createdAt", "paidAt", "total"],
    where: {
      userId: {
        [Op.in]: users.map((user) => user.id),
      },
      status: "paid",
      metadata: {
        [Op.contains]: {
          seedName: ASSOCIATION_SEED_NAME,
        },
      },
    },
    include: [
      {
        model: OrderItem,
        as: "items",
        attributes: ["id", "quantity", "subtotal", "unitPrice", "itemType"],
        required: false,
        where: {
          itemType: "product",
        },
      },
    ],
    order: [
      ["userId", "ASC"],
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
  });
  const byUserId = new Map();

  for (const orderModel of orders) {
    const order = orderModel.get({ plain: true });
    const orderDate = new Date(order.paidAt ?? order.createdAt);
    const items = order.items ?? [];
    const productCount = items.reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0
    );
    const spendCents = items.reduce((sum, item) => {
      const subtotal = Number(item.subtotal);
      if (Number.isFinite(subtotal)) return sum + Math.round(subtotal * 100);

      return (
        sum +
        Math.round(Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0) * 100)
      );
    }, 0);

    if (!byUserId.has(order.userId)) byUserId.set(order.userId, []);
    byUserId.get(order.userId).push({
      id: order.id,
      orderDate,
      productCount,
      spendCents,
    });
  }

  return byUserId;
}

function orderStatsUntil(productOrdersByUser, userId, endsAt) {
  const cutoff = dateOnlyToUtc(endsAt, 23);
  const orders = (productOrdersByUser.get(userId) ?? []).filter(
    (order) => order.orderDate <= cutoff
  );
  const lastOrder = orders[orders.length - 1] ?? null;

  return {
    paidOrdersCount: orders.length,
    productsPurchasedCount: orders.reduce(
      (sum, order) => sum + order.productCount,
      0
    ),
    totalProductSpendCents: orders.reduce(
      (sum, order) => sum + order.spendCents,
      0
    ),
    daysSinceLastPurchase: lastOrder
      ? Math.max(
          0,
          Math.floor((cutoff.getTime() - lastOrder.orderDate.getTime()) / DAY_MS)
        )
      : null,
  };
}

function chooseMethod(random) {
  return chooseWeighted(PAYMENT_METHOD_WEIGHTS, random);
}

function amountForPlan(plan, random) {
  const selector = random();

  if (selector < 0.8) return plan.priceCents;

  const discountPercent =
    selector < 0.95
      ? 0.05 + random() * 0.05
      : 0.11 + random() * 0.04;

  return Math.max(1, Math.round(plan.priceCents * (1 - discountPercent)));
}

function paymentDateFor(user, startsAt) {
  return maxDateOnly(user.createdDateOnly, startsAt);
}

function choosePlanForCycle({ user, cycleIndex, multiCycle, plans, random }) {
  const planRandom = makeSeededRandom(`${RANDOM_SEED}:plan:${user.userIndex}`);
  const switchUser = multiCycle && planRandom() < 0.4;
  const baseStudent = planRandom() < 0.19;
  const switchAt = multiCycle ? 2 + Math.floor(planRandom() * 2) : 99;
  const useStudent =
    switchUser && cycleIndex + 1 >= switchAt ? !baseStudent : baseStudent;

  return {
    plan: useStudent ? plans.student : plans.regular,
    switchUser,
  };
}

function calculateRenewalProbability({
  user,
  cycle,
  autoRenew,
  paymentMethod,
  stats,
  previousRenewals,
  previousDefinitive,
  previousGapDays,
  personalPropensity,
}) {
  const previousRenewalRate =
    previousDefinitive > 0 ? previousRenewals / previousDefinitive : 0;
  const ageDays = diffDays(cycle.endsAt, user.createdDateOnly);
  let probability = 0.43 + personalPropensity;

  probability += Math.min(0.12, previousRenewalRate * 0.12);
  if (previousRenewals > 0) probability += 0.04;
  if (stats.paidOrdersCount > 0) probability += 0.05;
  if (
    stats.daysSinceLastPurchase != null &&
    stats.daysSinceLastPurchase <= 45
  ) {
    probability += 0.06;
  }
  if (autoRenew) probability += 0.08;
  if (paymentMethod === "online_checkout") probability += 0.03;
  if (ageDays >= 90) probability += 0.04;

  if (stats.paidOrdersCount === 0) probability -= 0.06;
  if (
    stats.daysSinceLastPurchase == null ||
    stats.daysSinceLastPurchase > 120
  ) {
    probability -= 0.06;
  }
  if (previousGapDays > 30) probability -= 0.04;

  return clamp(probability, 0.15, 0.85);
}

function buildTimelineForUser({
  user,
  plans,
  productOrdersByUser,
  falseOffset,
}) {
  const userRandom = makeSeededRandom(`${RANDOM_SEED}:user:${user.userIndex}`);
  const personalRandom = makeSeededRandom(
    `${RANDOM_SEED}:propensity:${user.userIndex}`
  );
  const personalPropensity = personalRandom() * 0.2 - 0.1;
  const maxCycles = maxMonthlyCyclesForUser(user);

  if (maxCycles === 0) return [];

  const cycles = [];
  let startsAt = user.createdDateOnly;
  let cycleNumber = 1;
  let previousRenewals = 0;
  let previousDefinitive = 0;
  let previousGapDays = 0;

  while (cycleNumber <= maxCycles) {
    const random = makeSeededRandom(
      `${RANDOM_SEED}:cycle:${user.userIndex}:${cycleNumber}:${falseOffset}`
    );
    const endsAt = addDaysToDateOnly(startsAt, 29);
    if (endsAt > MAX_GENERATED_DATE_ONLY) break;

    const method = chooseMethod(random);
    const paymentConfig = PAYMENT_CONFIG[method];
    const autoRenew =
      method === "online_checkout" ? random() < 0.46 : random() < 0.22;
    const { plan, switchUser } = choosePlanForCycle({
      user,
      cycleIndex: cycleNumber - 1,
      multiCycle: maxCycles > 1,
      plans,
      random: userRandom,
    });
    const stats = orderStatsUntil(productOrdersByUser, user.id, endsAt);
    const draftCycle = {
      user,
      userIndex: user.userIndex,
      cycle: cycleNumber,
      startsAt,
      endsAt,
      status: statusForSubscription(startsAt, endsAt),
      source: paymentConfig.source,
      plan,
      paymentMethod: method,
      paymentProvider: paymentConfig.provider,
      amountCents: amountForPlan(plan, random),
      paymentDate: paymentDateFor(user, startsAt),
      autoRenew,
      expectedRenewedNextPeriod: null,
      nextStartsAt: null,
      changedPlanUser: switchUser,
      productStats: stats,
      notes: noteFor(user.userIndex, cycleNumber),
    };
    const canFitTrueNext =
      addDaysToDateOnly(addDaysToDateOnly(endsAt, 1), 29) <=
      MAX_GENERATED_DATE_ONLY;
    const canFitFalseNext =
      addDaysToDateOnly(addDaysToDateOnly(endsAt, 31), 29) <=
      MAX_GENERATED_DATE_ONLY;

    if (!canFitTrueNext && !canFitFalseNext) {
      cycles.push(draftCycle);
      break;
    }

    const probability = calculateRenewalProbability({
      user,
      cycle: draftCycle,
      autoRenew,
      paymentMethod: method,
      stats,
      previousRenewals,
      previousDefinitive,
      previousGapDays,
      personalPropensity,
    });
    const renews = random() < clamp(probability - falseOffset, 0.08, 0.9);
    let gapDays;

    if (renews && canFitTrueNext) {
      gapDays = 1 + Math.floor(random() * 6);
      draftCycle.expectedRenewedNextPeriod = true;
      previousRenewals += 1;
      previousDefinitive += 1;
    } else if (canFitFalseNext) {
      gapDays = 31 + Math.floor(random() * 8);
      draftCycle.expectedRenewedNextPeriod = false;
      previousDefinitive += 1;
    } else {
      gapDays = 1 + Math.floor(random() * 6);
      draftCycle.expectedRenewedNextPeriod = true;
      previousRenewals += 1;
      previousDefinitive += 1;
    }

    previousGapDays = gapDays;
    draftCycle.nextStartsAt = addDaysToDateOnly(endsAt, gapDays);
    cycles.push(draftCycle);
    startsAt = draftCycle.nextStartsAt;
    cycleNumber += 1;
  }

  if (cycles.length > 1) {
    const lastCycle = cycles[cycles.length - 1];
    const finalLabel = expectedLabelFor({
      current: lastCycle,
      next: null,
    });
    const trimPendingRandom = makeSeededRandom(
      `${RANDOM_SEED}:trim-pending:${user.userIndex}`
    );

    if (finalLabel === null && trimPendingRandom() < 0.3) {
      cycles.pop();
    }
  }

  if (cycles.length > 0) {
    const finalCycle = cycles[cycles.length - 1];
    finalCycle.expectedRenewedNextPeriod = expectedLabelFor({
      current: finalCycle,
      next: null,
    });
  }

  for (let index = 0; index < cycles.length - 1; index += 1) {
    cycles[index].expectedRenewedNextPeriod = expectedLabelFor({
      current: cycles[index],
      next: cycles[index + 1],
    });
    cycles[index].nextStartsAt = cycles[index + 1].startsAt;
  }

  return cycles;
}

function labelCounts(cycles) {
  let renewedTrue = 0;
  let renewedFalse = 0;
  let renewedNull = 0;

  for (const cycle of cycles) {
    if (cycle.expectedRenewedNextPeriod === true) renewedTrue += 1;
    else if (cycle.expectedRenewedNextPeriod === false) renewedFalse += 1;
    else renewedNull += 1;
  }

  return { renewedTrue, renewedFalse, renewedNull };
}

function summarizeBy(items, keyGetter) {
  const result = {};

  for (const item of items) {
    const key = String(keyGetter(item) ?? "null");
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}

function planRowsForPatternValidation(cycles) {
  const byUser = new Map();
  for (const cycle of cycles) {
    if (!byUser.has(cycle.user.id)) byUser.set(cycle.user.id, []);
    byUser.get(cycle.user.id).push(cycle);
  }

  const rows = [];

  for (const userCycles of byUser.values()) {
    userCycles.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    let previousRenewals = 0;
    let previousDefinitive = 0;

    for (let index = 0; index < userCycles.length; index += 1) {
      const cycle = userCycles[index];
      const previous = userCycles[index - 1] ?? null;

      rows.push({
        planName: cycle.plan.name,
        paymentMethod: cycle.paymentMethod,
        source: cycle.source,
        autoRenew: cycle.autoRenew ? "true" : "false",
        previousSubscriptionsCount: index,
        previousRenewalsCount: previousRenewals,
        purchasesBucket:
          cycle.productStats.paidOrdersCount === 0
            ? "0"
            : cycle.productStats.paidOrdersCount <= 2
              ? "1-2"
              : "3+",
        failedPaymentsBucket: "0",
        cycle: cycle.cycle,
        target: cycle.expectedRenewedNextPeriod,
        daysSincePreviousSubscription: previous
          ? diffDays(cycle.startsAt, previous.endsAt)
          : -1,
      });

      if (cycle.expectedRenewedNextPeriod === true) {
        previousRenewals += 1;
        previousDefinitive += 1;
      } else if (cycle.expectedRenewedNextPeriod === false) {
        previousDefinitive += 1;
      }
    }
  }

  return rows;
}

function rateGroups(rows, field) {
  const groups = new Map();

  for (const row of rows.filter((item) => item.target !== null)) {
    const key = String(row[field]);
    if (!groups.has(key)) groups.set(key, { total: 0, renewedTrue: 0 });
    const group = groups.get(key);
    group.total += 1;
    if (row.target === true) group.renewedTrue += 1;
  }

  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([key, group]) => [
        key,
        {
          total: group.total,
          renewedTrue: group.renewedTrue,
          renewalRate: formatPercent(group.renewedTrue, group.total),
        },
      ])
  );
}

function artificialPatternWarnings(cycles) {
  const rows = planRowsForPatternValidation(cycles);
  const fields = [
    "planName",
    "paymentMethod",
    "source",
    "autoRenew",
    "previousSubscriptionsCount",
    "previousRenewalsCount",
    "purchasesBucket",
    "failedPaymentsBucket",
    "cycle",
  ];
  const warnings = [];
  const rates = {};

  for (const field of fields) {
    rates[field] = rateGroups(rows, field);

    for (const [key, group] of Object.entries(rates[field])) {
      if (
        group.total >= 40 &&
        (group.renewalRate === 0 || group.renewalRate === 100)
      ) {
        warnings.push(
          `Grupo ${field}=${key} tiene tasa artificial ${group.renewalRate}% con ${group.total} filas.`
        );
      }
    }
  }

  return { warnings, rates };
}

function validatePlanInMemory({
  cycles,
  usersExcluded,
  monthlyPlans,
  maxFeasibleSubscriptions,
}) {
  const validationErrors = [];
  const warnings = [];
  const counts = labelCounts(cycles);
  const definitive = counts.renewedTrue + counts.renewedFalse;
  const truePercentage = formatPercent(counts.renewedTrue, definitive);
  const falsePercentage = formatPercent(counts.renewedFalse, definitive);
  const byUser = new Map();
  const planDistribution = summarizeBy(cycles, (cycle) => cycle.plan.name);
  const regularCount = planDistribution[monthlyPlans.regular.name] ?? 0;
  const studentCount = planDistribution[monthlyPlans.student.name] ?? 0;
  const regularPct = formatPercent(regularCount, cycles.length);
  const studentPct = formatPercent(studentCount, cycles.length);
  const changedPlanUsers = new Set();
  const multiCycleUsers = new Set();

  for (const cycle of cycles) {
    if (!byUser.has(cycle.user.id)) byUser.set(cycle.user.id, []);
    byUser.get(cycle.user.id).push(cycle);

    if (cycle.startsAt < cycle.user.createdDateOnly) {
      validationErrors.push(
        `Suscripcion antes del registro: ${cycle.user.email} ciclo ${cycle.cycle}.`
      );
    }

    if (cycle.endsAt !== addDaysToDateOnly(cycle.startsAt, 29)) {
      validationErrors.push(
        `Duracion mensual invalida: ${cycle.user.email} ciclo ${cycle.cycle}.`
      );
    }

    if (cycle.endsAt > MAX_GENERATED_DATE_ONLY || cycle.startsAt > MAX_GENERATED_DATE_ONLY) {
      validationErrors.push(
        `Fecha posterior al 2026-07-20: ${cycle.user.email} ciclo ${cycle.cycle}.`
      );
    }

    if (cycle.plan.durationDays !== 30) {
      validationErrors.push(`Plan no mensual: ${cycle.plan.name}.`);
    }
  }

  for (const userCycles of byUser.values()) {
    userCycles.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    if (userCycles.length > 1) multiCycleUsers.add(userCycles[0].user.id);

    for (let index = 1; index < userCycles.length; index += 1) {
      if (userCycles[index].startsAt <= userCycles[index - 1].endsAt) {
        validationErrors.push(
          `Solapamiento en usuario ${userCycles[index].user.email}.`
        );
      }

      if (userCycles[index].plan.name !== userCycles[index - 1].plan.name) {
        changedPlanUsers.add(userCycles[index].user.id);
      }
    }
  }

  if (maxFeasibleSubscriptions < REQUESTED_MIN_SUBSCRIPTIONS) {
    warnings.push(
      `Volumen solicitado ${REQUESTED_MIN_SUBSCRIPTIONS}-${REQUESTED_MAX_SUBSCRIPTIONS}; maximo teorico factible con fechas reales y planes de 30 dias: ${maxFeasibleSubscriptions}. Se planearon ${cycles.length} ciclos para preservar pausas, renovaciones true/false y sin solapamientos.`
    );
  } else if (
    cycles.length < REQUESTED_MIN_SUBSCRIPTIONS ||
    cycles.length > REQUESTED_MAX_SUBSCRIPTIONS
  ) {
    validationErrors.push(
      `Suscripciones planeadas ${cycles.length}; objetivo ${REQUESTED_MIN_SUBSCRIPTIONS}-${REQUESTED_MAX_SUBSCRIPTIONS}.`
    );
  }

  if (definitive < REQUESTED_MIN_DEFINITIVE) {
    warnings.push(
      `Historiales definitivos ${definitive}; el minimo solicitado ${REQUESTED_MIN_DEFINITIVE} no es factible con el volumen mensual disponible.`
    );
  }

  if (counts.renewedNull > MAX_PENDING_HISTORIES) {
    validationErrors.push(
      `Pendientes null ${counts.renewedNull}; maximo ${MAX_PENDING_HISTORIES}.`
    );
  }

  if (
    truePercentage < TRUE_MIN_PERCENT ||
    truePercentage > TRUE_MAX_PERCENT ||
    falsePercentage < TRUE_MIN_PERCENT ||
    falsePercentage > TRUE_MAX_PERCENT
  ) {
    validationErrors.push(
      `Balance fuera de rango: true ${truePercentage}%, false ${falsePercentage}%.`
    );
  }

  if (regularPct < 70 || regularPct > 80 || studentPct < 20 || studentPct > 30) {
    validationErrors.push(
      `Distribucion de planes fuera de rango: regular ${regularPct}%, estudiante ${studentPct}%.`
    );
  }

  const changedPlanPct = formatPercent(changedPlanUsers.size, multiCycleUsers.size);
  if (changedPlanPct < 20 || changedPlanPct > 30) {
    validationErrors.push(
      `Usuarios con cambio de plan ${changedPlanPct}%; esperado 20%-30%.`
    );
  }

  const patternReport = artificialPatternWarnings(cycles);
  warnings.push(...patternReport.warnings);

  return {
    validationErrors,
    warnings,
    patternRates: patternReport.rates,
    usersUsed: byUser.size,
    usersExcluded: usersExcluded.length,
    definitive,
    truePercentage,
    falsePercentage,
    changedPlanUsers: changedPlanUsers.size,
    multiCycleUsers: multiCycleUsers.size,
    changedPlanPct,
    subscriptionsByPlanName: planDistribution,
    ...counts,
  };
}

function buildSubscriptionPlan({ users, monthlyPlans, productOrdersByUser }) {
  const usersExcluded = [];
  const usableUsers = [];

  for (const user of users) {
    const maxCycles = maxMonthlyCyclesForUser(user);
    if (maxCycles === 0) {
      usersExcluded.push({
        userId: user.id,
        email: user.email,
        reason: "No cabe ninguna membresia mensual antes del 2026-07-20.",
      });
      continue;
    }

    usableUsers.push(user);
  }

  const maxFeasibleSubscriptions = usableUsers.reduce(
    (sum, user) => sum + maxMonthlyCyclesForUser(user),
    0
  );
  const offsetsToTry = [0.08, 0.02, 0, 0.05, 0.12, -0.02, 0.16, -0.05];
  let bestPlan = null;

  for (const falseOffset of offsetsToTry) {
    const cycles = [];

    for (const user of usableUsers) {
      cycles.push(
        ...buildTimelineForUser({
          user,
          plans: monthlyPlans,
          productOrdersByUser,
          falseOffset,
        })
      );
    }

    const validation = validatePlanInMemory({
      cycles,
      usersExcluded,
      monthlyPlans,
      maxFeasibleSubscriptions,
    });

    if (!bestPlan || validation.validationErrors.length < bestPlan.validation.validationErrors.length) {
      bestPlan = { cycles, usersExcluded, validation, falseOffset, maxFeasibleSubscriptions };
    }

    if (validation.validationErrors.length === 0) {
      return {
        cycles: cycles.map((cycle, index) => ({
          ...cycle,
          subscriptionIndex: index + 1,
        })),
        usersExcluded,
        validation,
        falseOffset,
        maxFeasibleSubscriptions,
      };
    }
  }

  throw new Error(
    `No fue posible construir un plan mensual valido:\n- ${bestPlan.validation.validationErrors.join("\n- ")}`
  );
}

function additionalAttemptCandidates(cycles) {
  return {
    pending: seededShuffle(
      cycles.filter((cycle) => cycle.expectedRenewedNextPeriod === null),
      makeSeededRandom(`${RANDOM_SEED}:attempts:pending`)
    ),
    regular: seededShuffle(
      cycles,
      makeSeededRandom(`${RANDOM_SEED}:attempts:regular`)
    ),
  };
}

function buildAdditionalAttempt({ cycle, status, index }) {
  const random = makeSeededRandom(
    `${RANDOM_SEED}:attempt:${status}:${cycle.userIndex}:${cycle.cycle}:${index}`
  );
  const method = chooseMethod(random);
  const config = PAYMENT_CONFIG[method];
  const amountCents = amountForPlan(cycle.plan, random);
  const baseDate = dateOnlyToUtc(cycle.startsAt, 9);
  const paidAt = ["refunded", "charged_back"].includes(status)
    ? dateOnlyToUtc(cycle.startsAt, 10)
    : null;
  const approvedAt = paidAt;
  const cancelledAt = status === "cancelled" ? dateOnlyToUtc(cycle.startsAt, 11) : null;
  const refundedAt =
    status === "refunded" || status === "charged_back"
      ? dateOnlyToUtc(
          addDaysToDateOnly(
            cycle.startsAt,
            Math.min(5 + Math.floor(random() * 8), diffDays(cycle.endsAt, cycle.startsAt))
          ),
          14
        )
      : null;
  const suffix = `${status.toUpperCase()}${String(index + 1).padStart(3, "0")}`;

  return {
    cycle,
    userId: cycle.user.id,
    planId: cycle.plan.id,
    status,
    amountCents,
    method,
    source: config.source,
    provider: config.provider,
    externalReference: deterministicReference(cycle.userIndex, cycle.cycle, suffix),
    idempotencyKey: deterministicReference(cycle.userIndex, cycle.cycle, suffix),
    paidAt,
    approvedAt,
    cancelledAt,
    refundedAt,
    createdAt: baseDate,
    updatedAt: refundedAt ?? cancelledAt ?? baseDate,
    attempt: index + 2,
  };
}

function buildAdditionalAttempts(cycles) {
  const candidates = additionalAttemptCandidates(cycles);
  const attempts = [];
  let regularCursor = 0;
  let pendingCursor = 0;

  for (const [status, count] of Object.entries(ADDITIONAL_ATTEMPT_COUNTS)) {
    for (let offset = 0; offset < count; offset += 1) {
      const cycle =
        status === "pending" && candidates.pending.length > 0
          ? candidates.pending[pendingCursor++ % candidates.pending.length]
          : candidates.regular[regularCursor++ % candidates.regular.length];

      attempts.push(buildAdditionalAttempt({ cycle, status, index: attempts.length }));
    }
  }

  return attempts;
}

async function readControlIds(filePath, expectedSeedName = null) {
  try {
    const payload = JSON.parse(await readFile(filePath, "utf8"));
    if (expectedSeedName && payload.seedName !== expectedSeedName) return null;
    return payload;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function loadSeedState(seedName, notesSeedName, controlFile = null) {
  const control = controlFile ? await readControlIds(controlFile, seedName) : null;
  const controlSubscriptionIds = [
    ...(control?.subscriptionIds ?? []),
    ...(control?.subscriptions ?? []),
  ];
  const controlPaymentIds = control?.paymentIds ?? [];
  const whereSubscriptions =
    controlSubscriptionIds.length > 0
      ? {
          [Op.or]: [
            { id: { [Op.in]: controlSubscriptionIds } },
            { notes: { [Op.like]: `%${notesSeedName}%` } },
          ],
        }
      : {
          notes: {
            [Op.like]: `%${notesSeedName}%`,
          },
        };
  const wherePayments =
    controlPaymentIds.length > 0
      ? {
          [Op.or]: [
            { id: { [Op.in]: controlPaymentIds } },
            literal(`"Payment"."metadata"->>'seedName' = '${seedName}'`),
          ],
        }
      : literal(`"Payment"."metadata"->>'seedName' = '${seedName}'`);
  const seedSubscriptions = await UserSubscription.findAll({
    attributes: ["id", "paymentId", "userId", "notes"],
    where: whereSubscriptions,
    raw: true,
  });
  const seedPayments = await Payment.findAll({
    attributes: ["id", "subscriptionId", "status", "metadata"],
    where: wherePayments,
    raw: true,
  });
  const subscriptionIds = seedSubscriptions.map((subscription) => subscription.id);
  const seedHistories =
    subscriptionIds.length > 0
      ? await SubscriptionHistory.findAll({
          attributes: ["id", "subscriptionId", "renewedNextPeriod"],
          where: {
            subscriptionId: {
              [Op.in]: subscriptionIds,
            },
          },
          raw: true,
        })
      : [];

  return {
    seedSubscriptions,
    seedPayments,
    seedHistories,
  };
}

async function cleanupSeed({ seedName, notesSeedName, controlFile, confirm, label }) {
  const existingState = await loadSeedState(seedName, notesSeedName, controlFile);

  console.log(`Modo cleanup ${label}`);
  console.log(`UserSubscriptions encontradas: ${existingState.seedSubscriptions.length}`);
  console.log(`Payments encontrados: ${existingState.seedPayments.length}`);
  console.log(`SubscriptionHistories encontrados: ${existingState.seedHistories.length}`);

  if (!confirm) {
    console.log("Falta --confirm. No se elimino nada.");
    return {
      deletedSubscriptions: 0,
      deletedPayments: 0,
      deletedHistories: 0,
    };
  }

  const transaction = await sequelize.transaction();

  try {
    const subscriptionIds = existingState.seedSubscriptions.map(
      (subscription) => subscription.id
    );
    const paymentIds = existingState.seedPayments.map((payment) => payment.id);
    let deletedHistories = 0;
    let deletedSubscriptions = 0;
    let deletedPayments = 0;

    if (subscriptionIds.length > 0) {
      deletedHistories = await SubscriptionHistory.destroy({
        where: {
          subscriptionId: {
            [Op.in]: subscriptionIds,
          },
        },
        transaction,
      });

      await UserSubscription.update(
        { paymentId: null },
        {
          where: {
            id: {
              [Op.in]: subscriptionIds,
            },
          },
          transaction,
          silent: true,
        }
      );
    }

    if (paymentIds.length > 0) {
      await Payment.update(
        { subscriptionId: null },
        {
          where: {
            id: {
              [Op.in]: paymentIds,
            },
          },
          transaction,
          silent: true,
        }
      );
    }

    if (subscriptionIds.length > 0) {
      deletedSubscriptions = await UserSubscription.destroy({
        where: {
          id: {
            [Op.in]: subscriptionIds,
          },
        },
        transaction,
      });
    }

    if (paymentIds.length > 0) {
      deletedPayments = await Payment.destroy({
        where: {
          id: {
            [Op.in]: paymentIds,
          },
        },
        transaction,
      });
    }

    await transaction.commit();

    console.log(`SubscriptionHistories eliminados: ${deletedHistories}`);
    console.log(`UserSubscriptions eliminadas: ${deletedSubscriptions}`);
    console.log(`Payments eliminados: ${deletedPayments}`);
    console.log("Errores: 0");

    return { deletedSubscriptions, deletedPayments, deletedHistories };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function captureProtectedSnapshot() {
  const snapshotEntries = await Promise.all(
    [
      ["Users", User],
      ["Products", Product],
      ["Orders", Order],
      ["OrderItems", OrderItem],
      ["MembershipPlans", MembershipPlan],
    ].map(async ([name, model]) => {
      const [count, maxUpdatedAt] = await Promise.all([
        model.count(),
        model.max("updatedAt"),
      ]);

      return [
        name,
        {
          count,
          maxUpdatedAt: maxUpdatedAt ? new Date(maxUpdatedAt).toISOString() : null,
        },
      ];
    })
  );

  return JSON.stringify(Object.fromEntries(snapshotEntries));
}

function buildSubscriptionPayload(cycle) {
  const createdAt = dateOnlyToUtc(cycle.paymentDate, 12);

  return {
    userId: cycle.user.id,
    planId: cycle.plan.id,
    paymentId: null,
    orderItemId: null,
    groupId: null,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    status: cycle.status,
    source: cycle.source,
    autoRenew: cycle.autoRenew,
    createdBy: null,
    cancelledAt: null,
    cancelReason: null,
    notes: cycle.notes,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildPaidPaymentPayload({ cycle, subscriptionId }) {
  const reference = deterministicReference(cycle.userIndex, cycle.cycle, "PAID");
  const eventDate = dateOnlyToUtc(cycle.paymentDate, 12);

  return {
    userId: cycle.user.id,
    orderId: null,
    planId: cycle.plan.id,
    subscriptionId,
    groupId: null,
    paymentType: "membership",
    amount: formatCents(cycle.amountCents),
    method: cycle.paymentMethod,
    source: cycle.source,
    provider: cycle.paymentProvider,
    providerPreferenceId: null,
    providerPaymentId: null,
    externalReference: reference,
    providerStatus: "paid",
    providerStatusDetail: "synthetic_monthly_membership",
    idempotencyKey: reference,
    status: "paid",
    currency: "MXN",
    reference,
    notes: `Synthetic paid membership seed: ${SEED_NAME}`,
    paidAt: eventDate,
    approvedAt: eventDate,
    cancelledAt: null,
    refundedAt: null,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      purpose: SEED_PURPOSE,
      userIndex: cycle.userIndex,
      cycle: cycle.cycle,
      attempt: 1,
    },
    createdBy: null,
    createdAt: eventDate,
    updatedAt: eventDate,
  };
}

function buildAdditionalPaymentPayload(attempt) {
  return {
    userId: attempt.userId,
    orderId: null,
    planId: attempt.planId,
    subscriptionId: null,
    groupId: null,
    paymentType: "membership",
    amount: formatCents(attempt.amountCents),
    method: attempt.method,
    source: attempt.source,
    provider: attempt.provider,
    providerPreferenceId: null,
    providerPaymentId: null,
    externalReference: attempt.externalReference,
    providerStatus: attempt.status,
    providerStatusDetail: "synthetic_monthly_attempt",
    idempotencyKey: attempt.idempotencyKey,
    status: attempt.status,
    currency: "MXN",
    reference: attempt.externalReference,
    notes: `Synthetic payment attempt seed: ${SEED_NAME}`,
    paidAt: attempt.paidAt,
    approvedAt: attempt.approvedAt,
    cancelledAt: attempt.cancelledAt,
    refundedAt: attempt.refundedAt,
    metadata: {
      synthetic: true,
      seedName: SEED_NAME,
      purpose: SEED_PURPOSE,
      userIndex: attempt.cycle.userIndex,
      cycle: attempt.cycle.cycle,
      attempt: attempt.attempt,
    },
    createdBy: null,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

async function createMonthlySeed(plan, transaction) {
  const ids = {
    userIds: [...new Set(plan.cycles.map((cycle) => cycle.user.id))],
    subscriptionIds: [],
    paymentIds: [],
    historyIds: [],
  };
  const startedAt = Date.now();
  const subscriptionRows = plan.cycles.map(buildSubscriptionPayload);
  const subscriptions = await UserSubscription.bulkCreate(subscriptionRows, {
    transaction,
    returning: true,
    silent: true,
  });
  const subscriptionsByNote = new Map(
    subscriptions.map((subscription) => [subscription.notes, subscription])
  );
  const cycleRecords = plan.cycles.map((cycle) => {
    const subscription = subscriptionsByNote.get(cycle.notes);
    if (!subscription) {
      throw new Error(`No se encontro la suscripcion creada para ${cycle.notes}.`);
    }

    ids.subscriptionIds.push(subscription.id);
    return { cycle, subscription, payment: null, historyId: null };
  });
  const paidPayments = await Payment.bulkCreate(
    cycleRecords.map((record) =>
      buildPaidPaymentPayload({
        cycle: record.cycle,
        subscriptionId: record.subscription.id,
      })
    ),
    {
      transaction,
      returning: true,
      silent: true,
    }
  );
  const paidPaymentsByReference = new Map(
    paidPayments.map((payment) => [payment.externalReference, payment])
  );

  for (const record of cycleRecords) {
    const reference = deterministicReference(
      record.cycle.userIndex,
      record.cycle.cycle,
      "PAID"
    );
    record.payment = paidPaymentsByReference.get(reference);
    if (!record.payment) throw new Error(`No se encontro el pago ${reference}.`);
    ids.paymentIds.push(record.payment.id);
  }

  for (const record of cycleRecords) {
    await record.subscription.update(
      { paymentId: record.payment.id },
      { transaction, silent: true }
    );
  }

  const additionalAttempts = buildAdditionalAttempts(plan.cycles);
  const additionalPayments = await Payment.bulkCreate(
    additionalAttempts.map(buildAdditionalPaymentPayload),
    {
      transaction,
      returning: true,
      silent: true,
    }
  );

  for (const payment of additionalPayments) ids.paymentIds.push(payment.id);

  for (const [index, record] of cycleRecords.entries()) {
    const result = await createOrUpdateSubscriptionHistory(record.subscription.id, {
      transaction,
      updateRenewal: false,
    });
    record.historyId = result.history.id;
    ids.historyIds.push(result.history.id);

    const createdAt = dateOnlyToUtc(record.cycle.paymentDate, 12);
    await result.history.update(
      { createdAt, updatedAt: createdAt },
      { transaction, silent: true }
    );

    if ((index + 1) % 50 === 0 || index + 1 === cycleRecords.length) {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `Historiales procesados: ${index + 1}/${cycleRecords.length} (${seconds}s)`
      );
    }
  }

  const userIds = [...new Set(cycleRecords.map((record) => record.cycle.user.id))];
  for (const [index, userId] of userIds.entries()) {
    await updateRenewalClassification({
      userId,
      referenceDate: REFERENCE_DATE,
      transaction,
    });

    if ((index + 1) % 50 === 0 || index + 1 === userIds.length) {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`Usuarios clasificados: ${index + 1}/${userIds.length} (${seconds}s)`);
    }
  }

  const histories = await SubscriptionHistory.findAll({
    attributes: ["id", "renewedNextPeriod"],
    where: {
      id: {
        [Op.in]: ids.historyIds,
      },
    },
    transaction,
    raw: true,
  });
  const historiesById = new Map(histories.map((history) => [history.id, history]));

  for (const record of cycleRecords) {
    const history = historiesById.get(record.historyId);
    const actual = history?.renewedNextPeriod ?? null;

    if (actual !== record.cycle.expectedRenewedNextPeriod) {
      throw new Error(
        `Clasificacion inconsistente userId=${record.cycle.user.id}, ciclo=${record.cycle.cycle}, startsAt=${record.cycle.startsAt}, endsAt=${record.cycle.endsAt}, nextStartsAt=${record.cycle.nextStartsAt}, esperada=${record.cycle.expectedRenewedNextPeriod}, obtenida=${actual}.`
      );
    }

    const createdAt = dateOnlyToUtc(record.cycle.paymentDate, 12);
    await SubscriptionHistory.update(
      { createdAt, updatedAt: createdAt },
      {
        where: { id: record.historyId },
        transaction,
        silent: true,
      }
    );
  }

  return ids;
}

function distributionByStatus(payments) {
  return summarizeBy(payments, (payment) => payment.status);
}

async function validateCommittedMonthlySeed(seedUsers, monthlyPlans) {
  const seedSubscriptions = await UserSubscription.findAll({
    where: {
      notes: {
        [Op.like]: `%${SEED_NAME}%`,
      },
    },
    include: [
      { model: MembershipPlan, as: "plan", required: false },
      { model: Payment, as: "payment", required: false },
    ],
    order: [
      ["userId", "ASC"],
      ["startsAt", "ASC"],
    ],
  });
  const subscriptionIds = seedSubscriptions.map((subscription) => subscription.id);
  const seedPayments = await Payment.findAll({
    where: {
      metadata: {
        [Op.contains]: {
          seedName: SEED_NAME,
        },
      },
    },
    raw: true,
  });
  const seedHistories =
    subscriptionIds.length > 0
      ? await SubscriptionHistory.findAll({
          where: {
            subscriptionId: {
              [Op.in]: subscriptionIds,
            },
          },
          raw: true,
        })
      : [];
  const historiesBySubscriptionId = new Map(
    seedHistories.map((history) => [history.subscriptionId, history])
  );
  const userById = new Map(seedUsers.map((user) => [user.id, user]));
  const subscriptionsByUser = new Map();
  let invalidDates = 0;
  let overlaps = 0;
  let subscriptionsWithoutPaidMainPayment = 0;
  let historiesWithoutSubscription = 0;
  let inconsistentLabels = 0;
  let nonMonthlySubscriptions = 0;
  let paymentsAfterStartsAt = 0;
  let zeroOrNegativePayments = 0;

  for (const subscriptionModel of seedSubscriptions) {
    const subscription = subscriptionModel.get({ plain: true });
    if (!subscriptionsByUser.has(subscription.userId)) {
      subscriptionsByUser.set(subscription.userId, []);
    }
    subscriptionsByUser.get(subscription.userId).push(subscription);

    const user = userById.get(subscription.userId);
    const history = historiesBySubscriptionId.get(subscription.id);
    const payment = subscription.payment;

    if (!history) historiesWithoutSubscription += 1;
    if (!subscription.plan || Number(subscription.plan.durationDays) !== 30) {
      nonMonthlySubscriptions += 1;
    }
    if (!payment || payment.status !== "paid") {
      subscriptionsWithoutPaidMainPayment += 1;
    }

    if (payment && toDateOnly(payment.createdAt) > subscription.startsAt) {
      paymentsAfterStartsAt += 1;
    }
    if (payment && Number(payment.amount) <= 0) {
      zeroOrNegativePayments += 1;
    }

    if (
      !user ||
      subscription.startsAt < toDateOnly(user.createdAt) ||
      toDateOnly(subscription.createdAt) < toDateOnly(user.createdAt) ||
      subscription.endsAt !== addDaysToDateOnly(subscription.startsAt, 29) ||
      subscription.startsAt > MAX_GENERATED_DATE_ONLY ||
      subscription.endsAt > MAX_GENERATED_DATE_ONLY ||
      (payment && toDateOnly(payment.createdAt) > MAX_GENERATED_DATE_ONLY)
    ) {
      invalidDates += 1;
    }
  }

  for (const userSubscriptions of subscriptionsByUser.values()) {
    userSubscriptions.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    for (let index = 1; index < userSubscriptions.length; index += 1) {
      if (userSubscriptions[index].startsAt <= userSubscriptions[index - 1].endsAt) {
        overlaps += 1;
      }
    }
  }

  for (const history of seedHistories) {
    const userSubscriptions = subscriptionsByUser.get(history.userId) ?? [];
    const current = userSubscriptions.find(
      (subscription) => subscription.id === history.subscriptionId
    );
    const nextSubscription = userSubscriptions
      .filter((subscription) => subscription.id !== history.subscriptionId)
      .filter((subscription) => subscription.status !== "cancelled")
      .filter((subscription) => {
        const gap = diffDays(subscription.startsAt, history.endsAt);
        return gap >= 1 && gap <= 30;
      })
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
    const expected = expectedLabelFor({ current: history, next: nextSubscription });

    if (!current || history.renewedNextPeriod !== expected) {
      inconsistentLabels += 1;
    }
  }

  const renewedTrue = seedHistories.filter(
    (history) => history.renewedNextPeriod === true
  ).length;
  const renewedFalse = seedHistories.filter(
    (history) => history.renewedNextPeriod === false
  ).length;
  const renewedNull = seedHistories.filter(
    (history) => history.renewedNextPeriod == null
  ).length;
  const definitive = renewedTrue + renewedFalse;
  const subscriptionsPerUser = [...subscriptionsByUser.values()].map(
    (items) => items.length
  );
  const subscriptionsByPlanName = summarizeBy(
    seedHistories,
    (history) => history.planName
  );
  const paymentsByStatus = distributionByStatus(seedPayments);
  const paymentsByMethod = summarizeBy(seedPayments, (payment) => payment.method);
  const patternReport = artificialPatternWarnings(
    seedSubscriptions.map((subscriptionModel) => {
      const subscription = subscriptionModel.get({ plain: true });
      const history = historiesBySubscriptionId.get(subscription.id);
      return {
        user: { id: subscription.userId },
        cycle:
          Number(
            /cycle=(\d+)/.exec(subscription.notes ?? "")?.[1] ?? 0
          ) || 0,
        startsAt: subscription.startsAt,
        endsAt: subscription.endsAt,
        expectedRenewedNextPeriod: history?.renewedNextPeriod ?? null,
        plan: { name: history?.planName ?? subscription.plan?.name ?? "unknown" },
        paymentMethod: history?.paymentMethod ?? subscription.payment?.method ?? "unknown",
        source: history?.source ?? subscription.source,
        autoRenew: Boolean(history?.autoRenew ?? subscription.autoRenew),
        productStats: { paidOrdersCount: 0 },
      };
    })
  );
  const validationErrors = [];
  const warnings = [...patternReport.warnings];
  const regularCount = subscriptionsByPlanName[monthlyPlans.regular.name] ?? 0;
  const studentCount = subscriptionsByPlanName[monthlyPlans.student.name] ?? 0;
  const regularPct = formatPercent(regularCount, seedHistories.length);
  const studentPct = formatPercent(studentCount, seedHistories.length);

  if (
    truePercentageOutOfRange(renewedTrue, renewedFalse) ||
    falsePercentageOutOfRange(renewedTrue, renewedFalse)
  ) {
    validationErrors.push("Balance de clases fuera de 45%-55%.");
  }
  if (renewedNull > MAX_PENDING_HISTORIES) {
    validationErrors.push("Demasiados historiales null.");
  }
  if (regularPct < 70 || regularPct > 80 || studentPct < 20 || studentPct > 30) {
    validationErrors.push("Distribucion de planes mensuales fuera de rango.");
  }
  if (invalidDates !== 0) validationErrors.push("Fechas invalidas.");
  if (overlaps !== 0) validationErrors.push("Solapamientos.");
  if (subscriptionsWithoutPaidMainPayment !== 0) {
    validationErrors.push("Suscripciones sin pago principal paid.");
  }
  if (historiesWithoutSubscription !== 0) validationErrors.push("Historiales sin suscripcion.");
  if (inconsistentLabels !== 0) validationErrors.push("Etiquetas inconsistentes.");
  if (nonMonthlySubscriptions !== 0) validationErrors.push("Suscripciones no mensuales.");
  if (paymentsAfterStartsAt !== 0) validationErrors.push("Pagos principales despues de startsAt.");
  if (zeroOrNegativePayments !== 0) validationErrors.push("Pagos con monto no positivo.");

  return {
    subscriptionsCreated: seedSubscriptions.length,
    paymentsCreated: seedPayments.length,
    historiesCreated: seedHistories.length,
    renewedTrue,
    renewedFalse,
    renewedNull,
    truePercentage: formatPercent(renewedTrue, definitive),
    falsePercentage: formatPercent(renewedFalse, definitive),
    usersUsed: subscriptionsByUser.size,
    minCyclesPerUser: Math.min(...subscriptionsPerUser),
    maxCyclesPerUser: Math.max(...subscriptionsPerUser),
    avgCyclesPerUser: Number(
      (seedSubscriptions.length / Math.max(1, subscriptionsByUser.size)).toFixed(2)
    ),
    subscriptionsByPlanName,
    paymentsByStatus,
    paymentsByMethod,
    invalidDates,
    overlaps,
    subscriptionsWithoutPaidMainPayment,
    historiesWithoutSubscription,
    inconsistentLabels,
    nonMonthlySubscriptions,
    paymentsAfterStartsAt,
    zeroOrNegativePayments,
    patternRates: patternReport.rates,
    validationErrors,
    warnings,
  };
}

function truePercentageOutOfRange(renewedTrue, renewedFalse) {
  const percentage = formatPercent(renewedTrue, renewedTrue + renewedFalse);
  return percentage < TRUE_MIN_PERCENT || percentage > TRUE_MAX_PERCENT;
}

function falsePercentageOutOfRange(renewedTrue, renewedFalse) {
  const percentage = formatPercent(renewedFalse, renewedTrue + renewedFalse);
  return percentage < TRUE_MIN_PERCENT || percentage > TRUE_MAX_PERCENT;
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function buildSummary({
  usersFound,
  usersUsed,
  usersExcluded,
  validation,
  warnings,
}) {
  return {
    seedName: SEED_NAME,
    referenceDate: REFERENCE_DATE_ONLY,
    usersFound,
    usersUsed,
    usersExcluded,
    subscriptionsCreated: validation.subscriptionsCreated,
    paymentsCreated: validation.paymentsCreated,
    historiesCreated: validation.historiesCreated,
    renewedTrue: validation.renewedTrue,
    renewedFalse: validation.renewedFalse,
    renewedNull: validation.renewedNull,
    truePercentage: validation.truePercentage,
    falsePercentage: validation.falsePercentage,
    subscriptionsByPlanName: validation.subscriptionsByPlanName,
    paymentsByStatus: validation.paymentsByStatus,
    paymentsByMethod: validation.paymentsByMethod,
    validationErrors: validation.validationErrors,
    warnings: [...new Set([...(warnings ?? []), ...(validation.warnings ?? [])])],
  };
}

function printPatternRates(patternRates) {
  console.log("Tasas por previousSubscriptionsCount:");
  console.log(JSON.stringify(patternRates.previousSubscriptionsCount ?? {}, null, 2));
  console.log("Tasas por numero de ciclo:");
  console.log(JSON.stringify(patternRates.cycle ?? {}, null, 2));
}

function printSimulationSummary({
  users,
  usersExcluded,
  monthlyPlans,
  associationOrders,
  plan,
}) {
  const validation = plan.validation;

  console.log("Modo de simulacion monthly v2");
  console.log(`Seed: ${SEED_NAME}`);
  console.log(`Usuarios ficticios encontrados: ${users.length}`);
  console.log(`Usuarios utilizados: ${validation.usersUsed}`);
  console.log(`Usuarios excluidos: ${usersExcluded.length + plan.usersExcluded.length}`);
  console.log(`Planes mensuales encontrados: ${monthlyPlans.all.length}`);
  console.log(`${monthlyPlans.regular.name}: ${monthlyPlans.regular.price}`);
  console.log(`${monthlyPlans.student.name}: ${monthlyPlans.student.price}`);
  console.log(`Suscripciones planeadas: ${plan.cycles.length}`);
  console.log(`Pagos exitosos planeados: ${plan.cycles.length}`);
  console.log(`Intentos adicionales planeados: ${TARGET_ADDITIONAL_ATTEMPTS}`);
  console.log(`Historiales definitivos esperados: ${validation.definitive}`);
  console.log(`renewedNextPeriod true esperado: ${validation.renewedTrue}`);
  console.log(`renewedNextPeriod false esperado: ${validation.renewedFalse}`);
  console.log(`renewedNextPeriod null esperado: ${validation.renewedNull}`);
  console.log(`Porcentaje true: ${validation.truePercentage}%`);
  console.log(`Porcentaje false: ${validation.falsePercentage}%`);
  console.log(
    `Distribucion por plan: ${JSON.stringify(validation.subscriptionsByPlanName)}`
  );
  console.log(
    `Usuarios con cambio de plan: ${validation.changedPlanUsers}/${validation.multiCycleUsers} (${validation.changedPlanPct}%)`
  );
  console.log(`Ordenes existentes utilizadas: ${associationOrders}`);
  console.log(`Maximo mensual factible: ${plan.maxFeasibleSubscriptions}`);
  console.log(`Advertencias: ${validation.warnings.length}`);
  printPatternRates(validation.patternRates);
  console.log("No se realizaron inserciones");
}

function printValidationSummary(validation, created = null) {
  console.log(`Suscripciones creadas: ${created?.subscriptions ?? 0}`);
  console.log(`Pagos creados: ${created?.payments ?? 0}`);
  console.log(`Historiales creados: ${created?.histories ?? 0}`);
  console.log(`Payments paid: ${validation.paymentsByStatus.paid ?? 0}`);
  console.log(`Payments failed: ${validation.paymentsByStatus.failed ?? 0}`);
  console.log(`Payments cancelled: ${validation.paymentsByStatus.cancelled ?? 0}`);
  console.log(`Payments refunded: ${validation.paymentsByStatus.refunded ?? 0}`);
  console.log(`Payments charged_back: ${validation.paymentsByStatus.charged_back ?? 0}`);
  console.log(`Payments pending: ${validation.paymentsByStatus.pending ?? 0}`);
  console.log(`renewedNextPeriod true: ${validation.renewedTrue}`);
  console.log(`renewedNextPeriod false: ${validation.renewedFalse}`);
  console.log(`renewedNextPeriod null: ${validation.renewedNull}`);
  console.log(`Porcentaje true: ${validation.truePercentage}%`);
  console.log(`Porcentaje false: ${validation.falsePercentage}%`);
  console.log(`Usuarios utilizados: ${validation.usersUsed}`);
  console.log(`Minimo de ciclos por usuario: ${validation.minCyclesPerUser}`);
  console.log(`Maximo de ciclos por usuario: ${validation.maxCyclesPerUser}`);
  console.log(`Promedio de ciclos por usuario: ${validation.avgCyclesPerUser}`);
  console.log(
    `Distribucion por plan mensual: ${JSON.stringify(validation.subscriptionsByPlanName)}`
  );
  console.log(
    `Distribucion por metodo de pago: ${JSON.stringify(validation.paymentsByMethod)}`
  );
  console.log(`Fechas invalidas: ${validation.invalidDates}`);
  console.log(`Solapamientos: ${validation.overlaps}`);
  console.log(
    `Suscripciones sin pago principal: ${validation.subscriptionsWithoutPaidMainPayment}`
  );
  console.log(`Historiales sin suscripcion: ${validation.historiesWithoutSubscription}`);
  console.log(`Clasificaciones inconsistentes: ${validation.inconsistentLabels}`);
  console.log(`Errores de validacion: ${validation.validationErrors.length}`);
  console.log(`Advertencias: ${validation.warnings.length}`);
  printPatternRates(validation.patternRates);
}

async function runMonthlyCheckOrApply({ apply }) {
  const protectedBefore = await captureProtectedSnapshot();
  const users = await loadSeedUsers();
  const excludedByUserId = await findUsersWithNonSeedSubscriptions(users);
  const usableUsers = users.filter((user) => !excludedByUserId.has(user.id));
  const usersExcluded = [...excludedByUserId.values()];
  const monthlyPlans = await loadMonthlyPlans();
  const productOrdersByUser = await loadAssociationOrders(usableUsers);
  const associationOrders = [...productOrdersByUser.values()].reduce(
    (sum, orders) => sum + orders.length,
    0
  );
  const plan = buildSubscriptionPlan({
    users: usableUsers,
    monthlyPlans,
    productOrdersByUser,
  });
  const existingState = await loadSeedState(SEED_NAME, SEED_NAME, CONTROL_FILE);
  const expectedPayments = plan.cycles.length + TARGET_ADDITIONAL_ATTEMPTS;
  const seedComplete =
    existingState.seedSubscriptions.length === plan.cycles.length &&
    existingState.seedPayments.length === expectedPayments &&
    existingState.seedHistories.length === plan.cycles.length;
  const hasPartialSeed =
    existingState.seedSubscriptions.length > 0 ||
    existingState.seedPayments.length > 0 ||
    existingState.seedHistories.length > 0;

  if (!apply) {
    printSimulationSummary({
      users,
      usersExcluded,
      monthlyPlans,
      associationOrders,
      plan,
    });
    return;
  }

  const legacyState = await loadSeedState(
    LEGACY_SEED_NAME,
    LEGACY_SEED_NAME,
    LEGACY_CONTROL_FILE
  );

  if (
    legacyState.seedSubscriptions.length > 0 ||
    legacyState.seedPayments.length > 0 ||
    legacyState.seedHistories.length > 0
  ) {
    throw new Error(
      `Aun existe ${LEGACY_SEED_NAME}. Ejecuta seed:classification:cleanup:v1 antes de aplicar monthly v2.`
    );
  }

  if (seedComplete) {
    const validation = await validateCommittedMonthlySeed(users, monthlyPlans);
    const protectedAfter = await captureProtectedSnapshot();
    if (protectedBefore !== protectedAfter) {
      throw new Error("Se detectaron modificaciones en tablas protegidas.");
    }

    await writeJson(
      SUMMARY_FILE,
      buildSummary({
        usersFound: users.length,
        usersUsed: validation.usersUsed,
        usersExcluded: usersExcluded.length + plan.usersExcluded.length,
        validation,
        warnings: plan.validation.warnings,
      })
    );

    printValidationSummary(validation, {
      subscriptions: 0,
      payments: 0,
      histories: 0,
    });
    console.log("Seed monthly v2 ya completo. No se crearon duplicados.");
    return;
  }

  if (hasPartialSeed) {
    throw new Error(
      `Existe carga parcial ${SEED_NAME}: ${existingState.seedSubscriptions.length} suscripciones, ${existingState.seedPayments.length} pagos, ${existingState.seedHistories.length} historiales. Ejecuta cleanup monthly si deseas regenerar.`
    );
  }

  const transaction = await sequelize.transaction();
  let ids;

  try {
    ids = await createMonthlySeed(plan, transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const validation = await validateCommittedMonthlySeed(users, monthlyPlans);
  const protectedAfter = await captureProtectedSnapshot();

  if (protectedBefore !== protectedAfter) {
    throw new Error("Se detectaron modificaciones en tablas protegidas.");
  }

  if (validation.validationErrors.length > 0) {
    throw new Error(
      `Validacion posterior fallida:\n- ${validation.validationErrors.join("\n- ")}`
    );
  }

  await writeJson(CONTROL_FILE, {
    seedName: SEED_NAME,
    referenceDate: REFERENCE_DATE_ONLY,
    userIds: ids.userIds,
    subscriptionIds: ids.subscriptionIds,
    paymentIds: ids.paymentIds,
    historyIds: ids.historyIds,
  });
  await writeJson(
    SUMMARY_FILE,
    buildSummary({
      usersFound: users.length,
      usersUsed: ids.userIds.length,
      usersExcluded: usersExcluded.length + plan.usersExcluded.length,
      validation,
      warnings: plan.validation.warnings,
    })
  );

  printValidationSummary(validation, {
    subscriptions: ids.subscriptionIds.length,
    payments: ids.paymentIds.length,
    histories: ids.historyIds.length,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const applyMonthly = args.includes("--apply-monthly-v2");
  const cleanupV1 = args.includes("--cleanup-v1");
  const cleanupMonthly = args.includes("--cleanup-monthly-v2");
  const confirm = args.includes("--confirm");
  const validArgs = new Set([
    "--apply-monthly-v2",
    "--cleanup-v1",
    "--cleanup-monthly-v2",
    "--confirm",
  ]);
  const unknownArgs = args.filter((arg) => !validArgs.has(arg));
  const activeModes = [applyMonthly, cleanupV1, cleanupMonthly].filter(Boolean);

  if (unknownArgs.length > 0) {
    throw new Error(`Argumentos no reconocidos: ${unknownArgs.join(", ")}`);
  }

  if (activeModes.length > 1) {
    throw new Error("Usa solo un modo: apply-monthly-v2, cleanup-v1 o cleanup-monthly-v2.");
  }

  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    if (cleanupV1) {
      await cleanupSeed({
        seedName: LEGACY_SEED_NAME,
        notesSeedName: LEGACY_SEED_NAME,
        controlFile: LEGACY_CONTROL_FILE,
        confirm,
        label: "v1",
      });
      return;
    }

    if (cleanupMonthly) {
      await cleanupSeed({
        seedName: SEED_NAME,
        notesSeedName: SEED_NAME,
        controlFile: CONTROL_FILE,
        confirm,
        label: "monthly v2",
      });
      return;
    }

    await runMonthlyCheckOrApply({ apply: applyMonthly });
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en seedRenewalClassificationData:", error);
  process.exit(1);
});
