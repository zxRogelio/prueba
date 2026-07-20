import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  OrderItem,
  SubscriptionEvent,
  UserSubscription,
} from "../models/index.js";
import { SUBSCRIPTION_EVENT_TYPES } from "../models/SubscriptionEvent.js";

const EVENT_TYPES = new Set(SUBSCRIPTION_EVENT_TYPES);

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function withTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function normalizeDate(value, label = "effectiveAt") {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw serviceError(`${label} invalida.`);
  }

  return date;
}

function dateOnlyToDate(value) {
  if (!value) return new Date();
  return normalizeDate(`${value}T00:00:00.000Z`, "effectiveAt");
}

export async function recordSubscriptionEvent({
  subscriptionId,
  userId = null,
  orderId = null,
  paymentId = null,
  eventType,
  previousStatus = null,
  newStatus = null,
  effectiveAt = new Date(),
  metadata = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!EVENT_TYPES.has(eventType)) {
      throw serviceError("eventType de suscripcion invalido.");
    }

    const subscription = await UserSubscription.findByPk(subscriptionId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!subscription) {
      throw serviceError("Suscripcion no encontrada.", 404);
    }

    return SubscriptionEvent.create(
      {
        subscriptionId: subscription.id,
        userId: userId || subscription.userId,
        orderId,
        paymentId: paymentId || subscription.paymentId || null,
        eventType,
        previousStatus,
        newStatus,
        effectiveAt: normalizeDate(effectiveAt),
        metadata,
      },
      { transaction: t }
    );
  });
}

export async function recordMembershipActivationEvents({
  subscription,
  orderId = null,
  paymentId = null,
  created = false,
  extendedFromSubscriptionId = null,
  renewedFromSubscriptionId = null,
  metadata = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!created) {
      return [];
    }

    const base = {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      orderId,
      paymentId: paymentId || subscription.paymentId || null,
      previousStatus: null,
      newStatus: subscription.status,
      transaction: t,
    };
    const baseMetadata = {
      ...(metadata || {}),
      planId: subscription.planId,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
    };
    const events = [];

    events.push(
      await recordSubscriptionEvent({
        ...base,
        eventType: "created",
        effectiveAt: subscription.createdAt || new Date(),
        metadata: baseMetadata,
      })
    );

    events.push(
      await recordSubscriptionEvent({
        ...base,
        eventType: "activated",
        effectiveAt: dateOnlyToDate(subscription.startsAt),
        metadata: baseMetadata,
      })
    );

    if (renewedFromSubscriptionId) {
      events.push(
        await recordSubscriptionEvent({
          ...base,
          eventType: "renewed",
          effectiveAt: dateOnlyToDate(subscription.startsAt),
          metadata: {
            ...baseMetadata,
            renewedFromSubscriptionId,
          },
        })
      );
    }

    if (extendedFromSubscriptionId) {
      events.push(
        await recordSubscriptionEvent({
          ...base,
          eventType: "extended",
          effectiveAt: dateOnlyToDate(subscription.startsAt),
          metadata: {
            ...baseMetadata,
            extendedFromSubscriptionId,
          },
        })
      );
    }

    return events;
  });
}

export async function recordSubscriptionRefundEventsForPayment({
  payment,
  refund = null,
  fullyRefunded = false,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const subscriptions = [];
    const seen = new Set();

    const directSubscriptions = await UserSubscription.findAll({
      where: { paymentId: payment.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const subscription of directSubscriptions) {
      if (!seen.has(subscription.id)) {
        seen.add(subscription.id);
        subscriptions.push(subscription);
      }
    }

    if (payment.orderId) {
      const orderItems = await OrderItem.findAll({
        where: {
          orderId: payment.orderId,
          itemType: {
            [Op.in]: ["membership", "group_membership"],
          },
        },
        attributes: ["id"],
        transaction: t,
      });
      const orderItemIds = orderItems.map((item) => item.id);

      if (orderItemIds.length > 0) {
        const itemSubscriptions = await UserSubscription.findAll({
          where: {
            orderItemId: {
              [Op.in]: orderItemIds,
            },
          },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        for (const subscription of itemSubscriptions) {
          if (!seen.has(subscription.id)) {
            seen.add(subscription.id);
            subscriptions.push(subscription);
          }
        }
      }
    }

    const events = [];

    for (const subscription of subscriptions) {
      events.push(
        await recordSubscriptionEvent({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          orderId: payment.orderId || null,
          paymentId: payment.id,
          eventType: "refunded",
          previousStatus: subscription.status,
          newStatus: subscription.status,
          effectiveAt: refund?.approvedAt || payment.refundedAt || new Date(),
          metadata: {
            refundId: refund?.id || null,
            refundAmount: refund?.amount || null,
            reason: refund?.reason || null,
            fullyRefunded,
          },
          transaction: t,
        })
      );
    }

    return events;
  });
}

export async function recordSubscriptionCancellation({
  subscriptionId,
  cancelledBy = null,
  reason = null,
  effectiveAt = new Date(),
  metadata = {},
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const subscription = await UserSubscription.findByPk(subscriptionId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!subscription) {
      throw serviceError("Suscripcion no encontrada.", 404);
    }

    const previousStatus = subscription.status;
    const cancelledAt = normalizeDate(effectiveAt);

    await subscription.update(
      {
        status: "cancelled",
        cancelledAt,
        cancelReason: reason || subscription.cancelReason,
      },
      { transaction: t }
    );

    return recordSubscriptionEvent({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      paymentId: subscription.paymentId,
      eventType: "cancelled",
      previousStatus,
      newStatus: "cancelled",
      effectiveAt: cancelledAt,
      metadata: {
        cancelledBy,
        reason,
        ...(metadata || {}),
      },
      transaction: t,
    });
  });
}

export async function expireEndedSubscriptions({
  asOf = new Date(),
  limit = 500,
  transaction = null,
} = {}) {
  return withTransaction(transaction, async (t) => {
    const effectiveAt = normalizeDate(asOf, "asOf");
    const today = effectiveAt.toISOString().slice(0, 10);
    const subscriptions = await UserSubscription.findAll({
      where: {
        status: "active",
        endsAt: {
          [Op.lt]: today,
        },
      },
      order: [["endsAt", "ASC"]],
      limit,
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const events = [];

    for (const subscription of subscriptions) {
      const previousStatus = subscription.status;

      await subscription.update(
        {
          status: "expired",
        },
        { transaction: t }
      );

      events.push(
        await recordSubscriptionEvent({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          paymentId: subscription.paymentId,
          eventType: "expired",
          previousStatus,
          newStatus: "expired",
          effectiveAt: dateOnlyToDate(subscription.endsAt),
          metadata: {
            asOf: today,
          },
          transaction: t,
        })
      );
    }

    return {
      expiredCount: subscriptions.length,
      events,
    };
  });
}
