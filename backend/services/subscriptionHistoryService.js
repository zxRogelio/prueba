import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  OrderItem,
  Payment,
  SubscriptionHistory,
  UserSubscription,
} from "../models/index.js";

const RENEWAL_WINDOW_DAYS = 30;
const CANCELLED_STATUS = "cancelled";

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function withTransaction(transaction, callback) {
  if (transaction) return callback(transaction);

  return sequelize.transaction(callback);
}

function toDateOnly(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function addDaysToDateOnly(dateOnly, days) {
  const normalized = toDateOnly(dateOnly);
  if (!normalized) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function normalizePositiveInteger(value, fallback = null) {
  const numberValue = Number(value);

  if (Number.isInteger(numberValue) && numberValue > 0) {
    return numberValue;
  }

  return fallback;
}

function normalizeAmount(value, fallback = "0.00") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallback;
  }

  return numberValue.toFixed(2);
}

function normalizeNullableString(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function paymentCorrespondsOnlyToSubscription(payment, subscription) {
  if (!payment) return false;

  if (payment.subscriptionId && payment.subscriptionId === subscription.id) {
    return true;
  }

  if (!payment.orderId && payment.paymentType === "membership") {
    return true;
  }

  return (
    payment.paymentType === "membership" &&
    !subscription.orderItemId &&
    !subscription.groupId
  );
}

async function loadSubscription(subscriptionId, transaction) {
  return UserSubscription.findByPk(subscriptionId, {
    include: [
      {
        model: MembershipPlan,
        as: "plan",
        required: false,
      },
      {
        model: Payment,
        as: "payment",
        required: false,
      },
      {
        model: OrderItem,
        as: "orderItem",
        required: false,
      },
    ],
    transaction,
  });
}

function buildHistoryPayload(subscription) {
  const plan = subscription.plan;
  const payment = subscription.payment;
  const orderItem = subscription.orderItem;

  if (!plan) {
    throw serviceError("La suscripcion no tiene plan asociado.", 404);
  }

  const durationDays = normalizePositiveInteger(
    orderItem?.durationDaysSnapshot,
    normalizePositiveInteger(plan.durationDays)
  );

  if (!durationDays) {
    throw serviceError("No se pudo determinar la duracion de la suscripcion.");
  }

  const amountPaid =
    orderItem?.subtotal != null
      ? normalizeAmount(orderItem.subtotal)
      : paymentCorrespondsOnlyToSubscription(payment, subscription)
        ? normalizeAmount(payment.amount)
        : normalizeAmount(plan.price);

  const startsAt = toDateOnly(subscription.startsAt);
  const endsAt = toDateOnly(subscription.endsAt);

  if (!startsAt || !endsAt) {
    throw serviceError("La suscripcion no tiene fechas completas.");
  }

  return {
    userId: subscription.userId,
    subscriptionId: subscription.id,
    planId: subscription.planId,
    paymentId: subscription.paymentId || null,
    planName: plan.name,
    planType: plan.type,
    durationDays,
    amountPaid,
    purchaseDate: payment?.paidAt || subscription.createdAt || null,
    startsAt,
    endsAt,
    subscriptionStatus: subscription.status,
    source: subscription.source,
    paymentMethod: normalizeNullableString(payment?.method),
    autoRenew: Boolean(subscription.autoRenew),
    isGroupSubscription: Boolean(subscription.groupId || plan.type === "group"),
  };
}

async function findRenewalSubscription(history, transaction) {
  const windowEnd = addDaysToDateOnly(history.endsAt, RENEWAL_WINDOW_DAYS);

  return UserSubscription.findOne({
    where: {
      id: {
        [Op.ne]: history.subscriptionId,
      },
      userId: history.userId,
      status: {
        [Op.ne]: CANCELLED_STATUS,
      },
      startsAt: {
        [Op.gte]: toDateOnly(history.endsAt),
        [Op.lte]: windowEnd,
      },
    },
    order: [["startsAt", "ASC"]],
    transaction,
  });
}

async function resolveRenewedNextPeriod(history, referenceDate, transaction) {
  const renewal = await findRenewalSubscription(history, transaction);

  if (renewal) {
    return true;
  }

  const windowEnd = addDaysToDateOnly(history.endsAt, RENEWAL_WINDOW_DAYS);
  const referenceDateOnly = toDateOnly(referenceDate);

  if (referenceDateOnly > windowEnd) {
    return false;
  }

  return null;
}

export async function createOrUpdateSubscriptionHistory(
  subscriptionId,
  { transaction = null, updateRenewal = true } = {}
) {
  if (!subscriptionId) {
    throw serviceError("subscriptionId es obligatorio.");
  }

  return withTransaction(transaction, async (t) => {
    const subscription = await loadSubscription(subscriptionId, t);

    if (!subscription) {
      throw serviceError("Suscripcion no encontrada.", 404);
    }

    const payload = buildHistoryPayload(subscription);
    let history = await SubscriptionHistory.findOne({
      where: { subscriptionId: subscription.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    let created = false;

    if (history) {
      await history.update(payload, { transaction: t });
    } else {
      try {
        history = await SubscriptionHistory.create(
          {
            ...payload,
            renewedNextPeriod: null,
          },
          { transaction: t }
        );
        created = true;
      } catch (error) {
        if (error?.name !== "SequelizeUniqueConstraintError") {
          throw error;
        }

        history = await SubscriptionHistory.findOne({
          where: { subscriptionId: subscription.id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!history) throw error;

        await history.update(payload, { transaction: t });
      }
    }

    let classification = null;

    if (updateRenewal) {
      classification = await updateRenewalClassification({
        userId: subscription.userId,
        transaction: t,
      });
      await history.reload({ transaction: t });
    }

    return {
      history,
      created,
      updated: !created,
      classification,
    };
  });
}

export async function updateRenewalClassification({
  userId = null,
  referenceDate = new Date(),
  transaction = null,
} = {}) {
  return withTransaction(transaction, async (t) => {
    const where = {
      renewedNextPeriod: null,
    };

    if (userId) {
      where.userId = userId;
    }

    const histories = await SubscriptionHistory.findAll({
      where,
      order: [
        ["userId", "ASC"],
        ["endsAt", "ASC"],
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const result = {
      reviewed: histories.length,
      renewed: 0,
      notRenewed: 0,
      stillPending: 0,
    };

    for (const history of histories) {
      const renewedNextPeriod = await resolveRenewedNextPeriod(
        history,
        referenceDate,
        t
      );

      if (renewedNextPeriod === null) {
        result.stillPending += 1;
        continue;
      }

      await history.update({ renewedNextPeriod }, { transaction: t });

      if (renewedNextPeriod) {
        result.renewed += 1;
      } else {
        result.notRenewed += 1;
      }
    }

    return result;
  });
}

export async function backfillSubscriptionHistory({ transaction = null } = {}) {
  return withTransaction(transaction, async (t) => {
    const subscriptions = await UserSubscription.findAll({
      attributes: ["id"],
      order: [["createdAt", "ASC"]],
      transaction: t,
    });
    const result = {
      total: subscriptions.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      classification: null,
    };

    for (const subscription of subscriptions) {
      try {
        const historyResult = await createOrUpdateSubscriptionHistory(
          subscription.id,
          {
            transaction: t,
            updateRenewal: false,
          }
        );

        if (historyResult.created) {
          result.created += 1;
        } else {
          result.updated += 1;
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push({
          subscriptionId: subscription.id,
          reason: error.message,
        });
      }
    }

    result.classification = await updateRenewalClassification({
      transaction: t,
    });

    return result;
  });
}
