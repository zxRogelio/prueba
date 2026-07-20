import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  SubscriptionGroup,
  SubscriptionGroupMember,
  User,
  UserSubscription,
} from "../models/index.js";
import {
  recordMembershipActivationEvents,
  recordSubscriptionCancellation,
} from "./subscriptionEventService.js";

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serviceErrorWithDetails(message, statusCode = 400, details = {}) {
  return Object.assign(serviceError(message, statusCode), details);
}

async function withTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDate(value, label = "fecha") {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw serviceError(`${label} invalida.`);
  }

  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function uniqueEmails(emails = []) {
  return [...new Set(emails.map(normalizeEmail))].filter(Boolean);
}

async function findClientByEmail(email, transaction) {
  const user = await User.findOne({
    where: {
      email: normalizeEmail(email),
    },
    transaction,
  });

  if (!user) return null;

  if (user.role !== "cliente") {
    throw serviceError(`El correo ${email} existe, pero no pertenece a un cliente.`);
  }

  return user;
}

async function getActiveSubscription(userId, transaction) {
  const today = toDateOnly(new Date());

  return UserSubscription.findOne({
    where: {
      userId,
      status: "active",
      endsAt: {
        [Op.gte]: today,
      },
    },
    order: [["endsAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function getCurrentActiveSubscription(userId, transaction) {
  const today = toDateOnly(new Date());

  return UserSubscription.findOne({
    where: {
      userId,
      status: "active",
      startsAt: {
        [Op.lte]: today,
      },
      endsAt: {
        [Op.gte]: today,
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function userIsInOpenGroup(userId, transaction, ignoreGroupId = null) {
  const groupWhere = {
    status: {
      [Op.in]: ["pending_members", "pending_admin_approval", "active"],
    },
  };

  if (ignoreGroupId) {
    groupWhere.id = {
      [Op.ne]: ignoreGroupId,
    };
  }

  const groupMember = await SubscriptionGroupMember.findOne({
    where: {
      userId,
      status: {
        [Op.in]: ["pending_invitation", "accepted", "approved", "active"],
      },
    },
    include: [
      {
        model: SubscriptionGroup,
        as: "group",
        where: groupWhere,
        required: true,
      },
    ],
    transaction,
  });

  return Boolean(groupMember);
}

async function assertUserCanReceiveGroupSubscription({
  userId,
  groupId,
  transaction,
}) {
  const activeSubscription = await getCurrentActiveSubscription(
    userId,
    transaction
  );

  if (activeSubscription) {
    throw serviceError(
      "Este usuario ya tiene una membresia activa. No se puede asignar otra."
    );
  }

  const isInOpenGroup = await userIsInOpenGroup(userId, transaction, groupId);

  if (isInOpenGroup) {
    throw serviceError(
      "Este usuario ya pertenece a otro paquete pendiente o activo."
    );
  }
}

async function getLatestSubscription(userId, transaction) {
  return UserSubscription.findOne({
    where: {
      userId,
    },
    order: [
      ["endsAt", "DESC"],
      ["createdAt", "DESC"],
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

async function calculateSubscriptionDates({
  userId,
  durationDays,
  requestedStartAt = null,
  transaction,
}) {
  const today = new Date();
  const requestedStart = normalizeDate(requestedStartAt, "startsAt") || today;
  const activeSubscription = await getActiveSubscription(userId, transaction);
  const activeEndsAt = activeSubscription
    ? normalizeDate(activeSubscription.endsAt, "endsAt")
    : null;
  const startDate =
    activeEndsAt && activeEndsAt > requestedStart ? activeEndsAt : requestedStart;
  const endDate = addDays(startDate, durationDays);

  return {
    startsAt: toDateOnly(startDate),
    endsAt: toDateOnly(endDate),
    extendedFromSubscriptionId: activeSubscription?.id || null,
  };
}

async function findPaidPaymentForOrder(orderId, transaction) {
  return Payment.findOne({
    where: {
      orderId,
      status: "paid",
    },
    order: [["approvedAt", "DESC"], ["paidAt", "DESC"], ["createdAt", "DESC"]],
    transaction,
  });
}

async function loadPaidOrder({ orderId, paymentId, transaction }) {
  let payment = null;
  let resolvedOrderId = orderId;

  if (paymentId) {
    payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    if (payment.status !== "paid") {
      throw serviceError("El pago debe estar confirmado antes de activar.");
    }

    if (!payment.orderId) {
      throw serviceError("El pago no esta asociado a una orden.");
    }

    if (resolvedOrderId && resolvedOrderId !== payment.orderId) {
      throw serviceError("paymentId no pertenece a orderId.");
    }

    resolvedOrderId = payment.orderId;
  }

  if (!resolvedOrderId) {
    throw serviceError("orderId o paymentId es obligatorio.");
  }

  const order = await Order.findByPk(resolvedOrderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!order) {
    throw serviceError("Orden no encontrada.", 404);
  }

  if (order.status !== "paid") {
    throw serviceError("La orden debe estar pagada antes de activar membresias.");
  }

  if (!payment) {
    payment = await findPaidPaymentForOrder(order.id, transaction);
  }

  const items = await OrderItem.findAll({
    where: { orderId: order.id },
    include: [
      {
        model: MembershipPlan,
        as: "membershipPlan",
        required: false,
      },
    ],
    transaction,
  });

  order.setDataValue("items", items);

  return { order, payment };
}

export async function createOrRenewUserSubscription({
  userId,
  planId,
  orderItemId = null,
  paymentId = null,
  orderId = null,
  groupId = null,
  source = "admin_manual",
  createdBy = null,
  startsAt = null,
  endsAt = null,
  notes = null,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (orderItemId) {
      const existingByOrderItem = await UserSubscription.findOne({
        where: { orderItemId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingByOrderItem) {
        return {
          subscription: existingByOrderItem,
          created: false,
          skippedReason: "order_item_already_activated",
        };
      }
    }

    if (groupId) {
      const existingGroupSubscription = await UserSubscription.findOne({
        where: {
          groupId,
          userId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingGroupSubscription) {
        return {
          subscription: existingGroupSubscription,
          created: false,
          skippedReason: "group_member_already_activated",
        };
      }
    }

    const plan = await MembershipPlan.findOne({
      where: {
        id: planId,
        isActive: true,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!plan) {
      throw serviceError("Plan de membresia no encontrado o inactivo.", 404);
    }

    const latestSubscription = await getLatestSubscription(userId, t);
    const explicitEndDate = normalizeDate(endsAt, "endsAt");
    const explicitStartDate = explicitEndDate
      ? normalizeDate(startsAt, "startsAt") || new Date()
      : null;
    const dates = explicitEndDate
      ? {
          startsAt: toDateOnly(explicitStartDate),
          endsAt: toDateOnly(explicitEndDate),
          extendedFromSubscriptionId: null,
        }
      : await calculateSubscriptionDates({
          userId,
          durationDays: plan.durationDays,
          requestedStartAt: startsAt,
          transaction: t,
        });
    const subscription = await UserSubscription.create(
      {
        userId,
        planId: plan.id,
        paymentId,
        orderItemId,
        groupId,
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        status: "active",
        source,
        autoRenew: false,
        createdBy,
        notes,
      },
      { transaction: t }
    );
    const events = await recordMembershipActivationEvents({
      subscription,
      orderId,
      paymentId,
      created: true,
      extendedFromSubscriptionId: dates.extendedFromSubscriptionId,
      renewedFromSubscriptionId: latestSubscription?.id || null,
      metadata: {
        source,
        orderItemId,
        groupId,
      },
      transaction: t,
    });

    return {
      subscription,
      created: true,
      extendedFromSubscriptionId: dates.extendedFromSubscriptionId,
      renewedFromSubscriptionId: latestSubscription?.id || null,
      events,
    };
  });
}

async function activateIndividualOrderItem({
  order,
  item,
  payment,
  createdBy,
  startsAt,
  transaction,
}) {
  const result = await createOrRenewUserSubscription({
    userId: order.userId,
    planId: item.membershipPlanId,
    orderItemId: item.id,
    paymentId: payment?.id || null,
    orderId: order.id,
    source: payment?.source || (order.channel === "online" ? "online_checkout" : "admin_manual"),
    createdBy,
    startsAt,
    notes: `Activada desde orden ${order.orderNumber}`,
    transaction,
  });

  if (payment && result.created && !payment.subscriptionId) {
    await payment.update(
      {
        subscriptionId: result.subscription.id,
      },
      { transaction }
    );
  }

  return {
    itemType: item.itemType,
    orderItemId: item.id,
    ...result,
  };
}

async function createGroupMembers({
  group,
  owner,
  plan,
  memberEmails = [],
  transaction,
}) {
  const ownerEmail = normalizeEmail(owner.email);
  const cleanEmails = uniqueEmails(memberEmails).filter(
    (email) => email !== ownerEmail
  );
  const maxInvited = Number(plan.maxPeople) - 1;

  if (cleanEmails.length > maxInvited) {
    throw serviceError(
      `Este paquete solo permite agregar ${maxInvited} integrantes ademas del titular.`
    );
  }

  const ownerMember = await SubscriptionGroupMember.create(
    {
      groupId: group.id,
      userId: owner.id,
      invitedEmail: ownerEmail,
      role: "owner",
      status: "accepted",
      priceShare: plan.pricePerPerson,
      acceptedAt: new Date(),
    },
    { transaction }
  );
  const invitedMembers = [];

  for (const email of cleanEmails) {
    const invitedUser = await findClientByEmail(email, transaction);
    const member = await SubscriptionGroupMember.create(
      {
        groupId: group.id,
        userId: invitedUser?.id || null,
        invitedEmail: email,
        role: "member",
        status: "pending_invitation",
        priceShare: plan.pricePerPerson,
      },
      { transaction }
    );

    invitedMembers.push(member);
  }

  return {
    ownerMember,
    invitedMembers,
  };
}

async function ensureSubscriptionGroupForOrderItem({
  order,
  item,
  payment,
  createdBy,
  startsAt,
  memberEmails = [],
  transaction,
}) {
  const existingGroup = await SubscriptionGroup.findOne({
    where: { orderItemId: item.id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingGroup) {
    return {
      itemType: item.itemType,
      orderItemId: item.id,
      group: existingGroup,
      created: false,
      skippedReason: "order_item_group_already_created",
    };
  }

  const plan = item.membershipPlan || (await MembershipPlan.findByPk(item.membershipPlanId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  }));

  if (!plan) {
    throw serviceError("Plan grupal no encontrado.", 404);
  }

  const owner = await User.findByPk(order.userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!owner || owner.role !== "cliente") {
    throw serviceError("Titular del paquete no encontrado o invalido.", 404);
  }

  const startDate = normalizeDate(startsAt, "startsAt") || new Date();
  const endDate = addDays(startDate, plan.durationDays);
  const cleanEmails = uniqueEmails(memberEmails);
  const memberCount = cleanEmails.filter(
    (email) => email !== normalizeEmail(owner.email)
  ).length + 1;
  const group = await SubscriptionGroup.create(
    {
      planId: plan.id,
      ownerUserId: owner.id,
      paymentId: payment?.id || null,
      orderItemId: item.id,
      memberLimit: plan.maxPeople,
      totalAmount: item.subtotal,
      pricePerPerson: plan.pricePerPerson,
      startsAt: toDateOnly(startDate),
      endsAt: toDateOnly(endDate),
      status:
        memberCount >= Number(plan.maxPeople)
          ? "pending_admin_approval"
          : "pending_members",
      createdBy,
      notes: `Paquete creado desde orden ${order.orderNumber}`,
    },
    { transaction }
  );

  const members = await createGroupMembers({
    group,
    owner,
    plan,
    memberEmails,
    transaction,
  });

  if (payment && !payment.groupId) {
    await payment.update(
      {
        groupId: group.id,
      },
      { transaction }
    );
  }

  return {
    itemType: item.itemType,
    orderItemId: item.id,
    group,
    created: true,
    ...members,
  };
}

export async function activateMembershipsFromOrder({
  orderId = null,
  paymentId = null,
  createdBy = null,
  startsAt = null,
  groupMemberEmailsByOrderItemId = {},
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const { order, payment } = await loadPaidOrder({
      orderId,
      paymentId,
      transaction: t,
    });
    const results = [];
    const orderItems = order.get?.("items") || order.items || [];

    for (const item of orderItems) {
      if (item.itemType === "membership") {
        results.push(
          await activateIndividualOrderItem({
            order,
            item,
            payment,
            createdBy,
            startsAt,
            transaction: t,
          })
        );
      }

      if (item.itemType === "group_membership") {
        const metadataEmails = Array.isArray(item.metadata?.memberEmails)
          ? item.metadata.memberEmails
          : [];
        const memberEmails =
          groupMemberEmailsByOrderItemId[item.id] || metadataEmails;

        results.push(
          await ensureSubscriptionGroupForOrderItem({
            order,
            item,
            payment,
            createdBy,
            startsAt,
            memberEmails,
            transaction: t,
          })
        );
      }
    }

    return {
      order,
      payment,
      results,
    };
  });
}

export async function activateMembershipsFromPayment({
  paymentId,
  createdBy = null,
  startsAt = null,
  groupMemberEmailsByOrderItemId = {},
  transaction = null,
}) {
  return activateMembershipsFromOrder({
    paymentId,
    createdBy,
    startsAt,
    groupMemberEmailsByOrderItemId,
    transaction,
  });
}

export async function cancelMembershipEntitlementsForRefund({
  paymentId,
  refundId = null,
  cancelledBy = null,
  reason = null,
  effectiveAt = new Date(),
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    if (!paymentId) {
      throw serviceError("paymentId es obligatorio para cancelar membresias.");
    }

    const cancelledAt = normalizeDate(effectiveAt, "effectiveAt") || new Date();
    const subscriptions = await UserSubscription.findAll({
      where: { paymentId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const cancellationEvents = [];

    for (const subscription of subscriptions) {
      if (subscription.status === "cancelled") continue;

      cancellationEvents.push(
        await recordSubscriptionCancellation({
          subscriptionId: subscription.id,
          cancelledBy,
          reason,
          effectiveAt: cancelledAt,
          metadata: {
            refundId,
            source: "payment_refund",
          },
          transaction: t,
        })
      );
    }

    const groups = await SubscriptionGroup.findAll({
      where: { paymentId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    let cancelledGroups = 0;
    let removedMembers = 0;

    for (const group of groups) {
      if (group.status !== "cancelled") {
        await group.update(
          {
            status: "cancelled",
            notes: [
              group.notes,
              `Cancelado por reembolso ${refundId || ""} el ${cancelledAt.toISOString()}.`,
              reason ? `Motivo: ${reason}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
          { transaction: t }
        );
        cancelledGroups += 1;
      }

      const members = await SubscriptionGroupMember.findAll({
        where: {
          groupId: group.id,
          status: {
            [Op.notIn]: ["removed", "rejected"],
          },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const member of members) {
        await member.update(
          {
            status: "removed",
            removedAt: cancelledAt,
            rejectedReason: reason || member.rejectedReason,
          },
          { transaction: t }
        );
        removedMembers += 1;
      }
    }

    return {
      subscriptions,
      cancellationEvents,
      cancelledSubscriptions: cancellationEvents.length,
      cancelledGroups,
      removedMembers,
    };
  });
}

export async function activateSubscriptionGroupMembers({
  groupId,
  approvedBy = null,
  forceApprovePending = false,
  transaction = null,
}) {
  return withTransaction(transaction, async (t) => {
    const group = await SubscriptionGroup.findOne({
      where: {
        id: groupId,
        status: {
          [Op.in]: ["pending_admin_approval", "pending_members"],
        },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!group) {
      throw serviceError("Paquete no encontrado o no esta pendiente.", 404);
    }

    const plan = await MembershipPlan.findByPk(group.planId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const payment = await Payment.findByPk(group.paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const members = await SubscriptionGroupMember.findAll({
      where: { groupId: group.id },
      order: [["createdAt", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const groupOrderItem = group.orderItemId
      ? await OrderItem.findByPk(group.orderItemId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        })
      : null;

    group.setDataValue("plan", plan);
    group.setDataValue("payment", payment);
    group.setDataValue("members", members);
    group.setDataValue("orderItem", groupOrderItem);

    if (!plan) {
      throw serviceError("Plan del paquete no encontrado.", 404);
    }

    if (!payment || payment.status !== "paid") {
      throw serviceError("No se puede aprobar un paquete sin pago confirmado.");
    }

    let validMembers = members.filter((member) =>
      ["accepted", "approved", "active"].includes(member.status)
    );

    if (forceApprovePending) {
      const pendingMembersWithAccount = members.filter(
        (member) => member.status === "pending_invitation" && member.userId
      );
      validMembers = [...validMembers, ...pendingMembersWithAccount];
    }

    if (validMembers.length !== Number(group.memberLimit)) {
      throw serviceError(
        forceApprovePending
          ? `El paquete necesita ${group.memberLimit} integrantes con cuenta registrada para aprobarse`
          : `El paquete necesita ${group.memberLimit} integrantes aceptados para aprobarse`
      );
    }

    const membersWithoutAccount = validMembers.filter((member) => !member.userId);

    if (membersWithoutAccount.length > 0) {
      throw serviceErrorWithDetails(
        "Todos los integrantes deben tener cuenta registrada antes de aprobar el paquete",
        400,
        {
          pendingEmails: membersWithoutAccount.map((member) => member.invitedEmail),
        }
      );
    }

    const startDate = normalizeDate(group.startsAt, "startsAt") || new Date();
    const endDate = group.endsAt
      ? normalizeDate(group.endsAt, "endsAt")
      : addDays(startDate, plan.durationDays);
    const activationResults = [];

    for (const member of validMembers) {
      const existingGroupSubscription = await UserSubscription.findOne({
        where: {
          groupId: group.id,
          userId: member.userId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!existingGroupSubscription) {
        await assertUserCanReceiveGroupSubscription({
          userId: member.userId,
          groupId: group.id,
          transaction: t,
        });
      }

      const result = await createOrRenewUserSubscription({
        userId: member.userId,
        planId: group.planId,
        paymentId: group.paymentId,
        orderId: groupOrderItem?.orderId || null,
        groupId: group.id,
        source: "group_package",
        createdBy: approvedBy,
        startsAt: startDate,
        endsAt: endDate,
        notes: `Membresia activada por paquete grupal ${group.id}`,
        transaction: t,
      });

      activationResults.push(result);

      await member.update(
        {
          status: "active",
          approvedAt: new Date(),
          approvedBy,
        },
        { transaction: t }
      );
    }

    await group.update(
      {
        status: "active",
        startsAt: toDateOnly(startDate),
        endsAt: toDateOnly(endDate),
        approvedAt: new Date(),
        approvedBy,
      },
      { transaction: t }
    );

    return {
      group,
      subscriptions: activationResults.map((result) => result.subscription),
      activationResults,
    };
  });
}
