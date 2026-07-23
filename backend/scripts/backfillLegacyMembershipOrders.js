import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  Receipt,
  SubscriptionGroup,
  User,
  UserSubscription,
} from "../models/index.js";
import { generateOrderNumber } from "../utils/orderNumber.js";

function parseArgs(argv) {
  const options = {
    apply: false,
    rollbackTest: false,
    limit: null,
    paymentId: null,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    if (arg === "--rollback-test") options.rollbackTest = true;
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isInteger(value) && value > 0) options.limit = value;
    }
    if (arg.startsWith("--payment-id=")) {
      options.paymentId = arg.split("=")[1] || null;
    }
  }

  if (options.apply && options.rollbackTest) {
    throw new Error("Usa --apply o --rollback-test, no ambos.");
  }

  return options;
}

function toCents(value, label = "monto") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} invalido.`);
  }

  return Math.round(numberValue * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

function normalizeCurrency(currency = "MXN") {
  const normalized = String(currency || "MXN").trim().toUpperCase();
  return normalized.length === 3 ? normalized : "MXN";
}

function orderStatusFromPayment(payment) {
  if (payment.status === "paid") return "paid";
  if (payment.status === "refunded") return "refunded";
  if (["cancelled", "failed"].includes(payment.status)) return "cancelled";
  return "pending_payment";
}

function orderChannelFromPayment(payment) {
  if (
    payment.source === "online_checkout" ||
    payment.method === "online_checkout" ||
    payment.provider === "mercadopago_checkout"
  ) {
    return "online";
  }

  return "reception";
}

function paymentDate(payment) {
  return payment.createdAt || payment.paidAt || new Date();
}

function paidAtFromPayment(payment) {
  if (payment.status !== "paid") return null;
  return payment.approvedAt || payment.paidAt || payment.createdAt || null;
}

function itemTypeFromLegacy({ payment, plan, group }) {
  if (payment.groupId || group || plan?.type === "group") {
    return "group_membership";
  }

  return "membership";
}

function addItem(report, key, value) {
  report[key].push(value);
}

function summarizePayment(payment) {
  return {
    paymentId: payment.id,
    planId: payment.planId || null,
    subscriptionId: payment.subscriptionId || null,
    groupId: payment.groupId || null,
    status: payment.status,
    amount: payment.amount,
  };
}

async function findSubscriptionForPayment(payment, transaction) {
  if (payment.subscriptionId) {
    return UserSubscription.findByPk(payment.subscriptionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  return UserSubscription.findOne({
    where: {
      paymentId: payment.id,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function buildLegacyContext(payment, transaction) {
  const [subscription, group] = await Promise.all([
    findSubscriptionForPayment(payment, transaction),
    payment.groupId
      ? SubscriptionGroup.findByPk(payment.groupId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : null,
  ]);
  const planId = payment.planId || subscription?.planId || group?.planId || null;
  const plan = planId
    ? await MembershipPlan.findByPk(planId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
    : null;

  return {
    subscription,
    group,
    plan,
    planId,
  };
}

async function createHistoricalOrder({
  payment,
  plan,
  itemType,
  transaction,
}) {
  const createdAt = paymentDate(payment);
  const amountCents = toCents(payment.amount, "Payment.amount");
  const amount = fromCents(amountCents);
  const orderNumber = await generateOrderNumber({
    sequelizeInstance: sequelize,
    transaction,
    date: createdAt,
  });
  const order = await Order.create(
    {
      userId: payment.userId,
      orderNumber,
      status: orderStatusFromPayment(payment),
      channel: orderChannelFromPayment(payment),
      subtotal: amount,
      discountTotal: "0.00",
      taxTotal: "0.00",
      total: amount,
      currency: normalizeCurrency(payment.currency),
      createdBy: payment.createdBy || null,
      paidAt: paidAtFromPayment(payment),
      cancelledAt: payment.cancelledAt || null,
      refundedAt: payment.refundedAt || null,
      notes: payment.notes || null,
      metadata: {
        legacyBackfill: {
          source: "phase_10",
          paymentId: payment.id,
          subscriptionId: payment.subscriptionId || null,
          groupId: payment.groupId || null,
        },
      },
      createdAt,
      updatedAt: payment.updatedAt || createdAt,
    },
    { transaction }
  );
  const orderItem = await OrderItem.create(
    {
      orderId: order.id,
      itemType,
      productId: null,
      membershipPlanId: plan.id,
      quantity: 1,
      unitPrice: amount,
      discountAmount: "0.00",
      subtotal: amount,
      itemNameSnapshot: plan.name,
      itemDescriptionSnapshot: plan.description || null,
      categorySnapshot: "membership",
      brandSnapshot: null,
      productTypeSnapshot: plan.type,
      durationDaysSnapshot: plan.durationDays,
      metadata: {
        legacyBackfill: {
          source: "phase_10",
          paymentId: payment.id,
        },
      },
      createdAt,
      updatedAt: payment.updatedAt || createdAt,
    },
    { transaction }
  );

  return {
    order,
    orderItem,
  };
}

async function linkLegacyRecords({
  payment,
  order,
  orderItem,
  subscription,
  group,
  itemType,
  report,
  transaction,
}) {
  await payment.update(
    {
      orderId: order.id,
    },
    {
      transaction,
      silent: true,
    }
  );

  const [receiptCount] = await Receipt.update(
    {
      orderId: order.id,
    },
    {
      where: {
        paymentId: payment.id,
        orderId: null,
      },
      transaction,
      silent: true,
    }
  );
  report.linkedReceipts += receiptCount;

  if (itemType === "membership") {
    if (!subscription) {
      addItem(report, "missingRelation", {
        ...summarizePayment(payment),
        relation: "UserSubscription",
        reason: "No se encontro subscriptionId ni UserSubscription.paymentId.",
      });
    } else if (subscription.orderItemId) {
      report.ignoredRelations += 1;
    } else {
      await subscription.update(
        {
          orderItemId: orderItem.id,
        },
        {
          transaction,
          silent: true,
        }
      );
      report.linkedSubscriptions += 1;
    }
  }

  if (itemType === "group_membership") {
    if (!group) {
      addItem(report, "missingRelation", {
        ...summarizePayment(payment),
        relation: "SubscriptionGroup",
        reason:
          "El pago apunta a un groupId que no existe o no tiene grupo asociado.",
      });
    } else if (group.orderItemId) {
      report.ignoredRelations += 1;
    } else {
      await group.update(
        {
          orderItemId: orderItem.id,
        },
        {
          transaction,
          silent: true,
        }
      );
      report.linkedGroups += 1;
    }
  }
}

async function processPayment(paymentId, options, report) {
  const transaction = await sequelize.transaction();

  try {
    const payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      addItem(report, "errors", {
        paymentId,
        error: "Pago no encontrado.",
      });
      await transaction.rollback();
      return;
    }

    report.scanned += 1;

    if (payment.orderId) {
      report.ignored += 1;
      addItem(report, "ignoredItems", {
        paymentId: payment.id,
        reason: "Payment.orderId ya existe.",
        orderId: payment.orderId,
      });
      await transaction.rollback();
      return;
    }

    const user = await User.findByPk(payment.userId, { transaction });

    if (!user) {
      addItem(report, "missingRelation", {
        ...summarizePayment(payment),
        relation: "User",
        reason: "No se encontro el usuario propietario del pago.",
      });
      await transaction.rollback();
      return;
    }

    const context = await buildLegacyContext(payment, transaction);

    if (!context.plan) {
      addItem(report, "missingPlan", {
        ...summarizePayment(payment),
        resolvedPlanId: context.planId,
      });
      await transaction.rollback();
      return;
    }

    const itemType = itemTypeFromLegacy({
      payment,
      plan: context.plan,
      group: context.group,
    });

    if (itemType === "membership" && !context.subscription) {
      addItem(report, "missingRelation", {
        ...summarizePayment(payment),
        relation: "UserSubscription",
        reason: "No se encontro subscriptionId ni UserSubscription.paymentId.",
      });
      await transaction.rollback();
      return;
    }

    if (itemType === "group_membership" && !context.group) {
      addItem(report, "missingRelation", {
        ...summarizePayment(payment),
        relation: "SubscriptionGroup",
        reason:
          "El pago apunta a un groupId que no existe o no tiene grupo asociado.",
      });
      await transaction.rollback();
      return;
    }

    const { order, orderItem } = await createHistoricalOrder({
      payment,
      plan: context.plan,
      itemType,
      transaction,
    });

    await linkLegacyRecords({
      payment,
      order,
      orderItem,
      subscription: context.subscription,
      group: context.group,
      itemType,
      report,
      transaction,
    });

    report.converted += 1;
    addItem(report, "convertedItems", {
      paymentId: payment.id,
      orderId: order.id,
      orderItemId: orderItem.id,
      itemType,
      mode: options.apply ? "applied" : "rolled_back",
    });

    if (options.apply) {
      await transaction.commit();
    } else {
      await transaction.rollback();
    }
  } catch (error) {
    await transaction.rollback().catch(() => {});
    report.errors.push({
      paymentId,
      error: error.message,
    });
  }
}

async function findCandidatePaymentIds(options) {
  if (options.paymentId) {
    return [options.paymentId];
  }

  const payments = await Payment.findAll({
    attributes: ["id"],
    where: {
      paymentType: "membership",
      [Op.or]: [{ orderId: null }, { orderId: { [Op.eq]: null } }],
    },
    order: [["createdAt", "ASC"]],
    limit: options.limit || undefined,
  });

  return payments.map((payment) => payment.id);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = {
    mode: options.apply ? "apply" : options.rollbackTest ? "rollback-test" : "dry-run",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    scanned: 0,
    converted: 0,
    ignored: 0,
    linkedSubscriptions: 0,
    linkedGroups: 0,
    linkedReceipts: 0,
    ignoredRelations: 0,
    convertedItems: [],
    ignoredItems: [],
    missingPlan: [],
    missingRelation: [],
    errors: [],
  };
  const paymentIds = await findCandidatePaymentIds(options);

  for (const paymentId of paymentIds) {
    await processPayment(paymentId, options, report);
  }

  report.finishedAt = new Date().toISOString();
  report.applied = options.apply;

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
