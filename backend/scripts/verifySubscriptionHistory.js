import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  Receipt,
  SubscriptionEvent,
  SubscriptionGroup,
  SubscriptionGroupMember,
  SubscriptionHistory,
  User,
  UserSubscription,
} from "../models/index.js";
import { createOrder } from "../services/orderService.js";
import {
  createPaymentAttempt,
  registerManualPayment,
} from "../services/paymentService.js";
import {
  activateMembershipsFromOrder,
  activateSubscriptionGroupMembers,
} from "../services/membershipActivationService.js";
import {
  createOrUpdateSubscriptionHistory,
  updateRenewalClassification,
} from "../services/subscriptionHistoryService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function dateOnlyFromNow(offsetDays) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
}

function amountEquals(value, expected) {
  return Number(value).toFixed(2) === Number(expected).toFixed(2);
}

async function createClient(email) {
  return User.create({
    email,
    role: "cliente",
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
  });
}

async function createAdmin(email) {
  return User.create({
    email,
    role: "administrador",
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
  });
}

async function createPlan({
  name,
  slug,
  type = "individual",
  durationDays = 30,
  price = "100.00",
  pricePerPerson = null,
  minPeople = 1,
  maxPeople = 1,
}) {
  return MembershipPlan.create({
    name,
    slug,
    description: "Plan temporal para verificar SubscriptionHistory.",
    type,
    durationDays,
    price,
    pricePerPerson,
    minPeople,
    maxPeople,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: ["Verificacion"],
    isActive: true,
    sortOrder: 9999,
  });
}

async function getHistoryBySubscription(subscriptionId) {
  const history = await SubscriptionHistory.findOne({
    where: { subscriptionId },
  });

  assert(history, `No se encontro historial para ${subscriptionId}.`);

  return history;
}

async function cleanup({ suffix }) {
  const users = await User.findAll({
    where: {
      email: {
        [Op.like]: `verify-history-%-${suffix}@example.com`,
      },
    },
    attributes: ["id"],
  });
  const userIds = users.map((user) => user.id);
  const plans = await MembershipPlan.findAll({
    where: {
      slug: {
        [Op.like]: `verify-history-%-${suffix}`,
      },
    },
    attributes: ["id"],
  });
  const planIds = plans.map((plan) => plan.id);

  if (userIds.length === 0 && planIds.length === 0) {
    return;
  }

  const seedOrders = userIds.length
    ? await Order.findAll({
        where: { userId: { [Op.in]: userIds } },
        attributes: ["id"],
      })
    : [];
  const orderIds = seedOrders.map((order) => order.id);
  const seedPayments = await Payment.findAll({
    where: {
      [Op.or]: [
        userIds.length ? { userId: { [Op.in]: userIds } } : null,
        orderIds.length ? { orderId: { [Op.in]: orderIds } } : null,
      ].filter(Boolean),
    },
    attributes: ["id", "orderId"],
  });
  const paymentIds = seedPayments.map((payment) => payment.id);
  const seedOrderItems = orderIds.length
    ? await OrderItem.findAll({
        where: { orderId: { [Op.in]: orderIds } },
        attributes: ["id"],
      })
    : [];
  const orderItemIds = seedOrderItems.map((item) => item.id);
  const seedGroups = await SubscriptionGroup.findAll({
    where: {
      [Op.or]: [
        userIds.length ? { ownerUserId: { [Op.in]: userIds } } : null,
        planIds.length ? { planId: { [Op.in]: planIds } } : null,
        paymentIds.length ? { paymentId: { [Op.in]: paymentIds } } : null,
        orderItemIds.length ? { orderItemId: { [Op.in]: orderItemIds } } : null,
      ].filter(Boolean),
    },
    attributes: ["id", "paymentId", "orderItemId"],
  });
  const groupIds = seedGroups.map((group) => group.id);
  const subscriptions = await UserSubscription.findAll({
    where: {
      [Op.or]: [
        userIds.length ? { userId: { [Op.in]: userIds } } : null,
        planIds.length ? { planId: { [Op.in]: planIds } } : null,
        paymentIds.length ? { paymentId: { [Op.in]: paymentIds } } : null,
        groupIds.length ? { groupId: { [Op.in]: groupIds } } : null,
        orderItemIds.length ? { orderItemId: { [Op.in]: orderItemIds } } : null,
      ].filter(Boolean),
    },
    attributes: ["id", "paymentId", "groupId", "orderItemId"],
  });
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);
  for (const subscription of subscriptions) {
    if (subscription.paymentId) paymentIds.push(subscription.paymentId);
    if (subscription.groupId) groupIds.push(subscription.groupId);
    if (subscription.orderItemId) orderItemIds.push(subscription.orderItemId);
  }
  for (const group of seedGroups) {
    if (group.paymentId) paymentIds.push(group.paymentId);
    if (group.orderItemId) orderItemIds.push(group.orderItemId);
  }
  const uniquePaymentIds = [...new Set(paymentIds)];
  const uniqueGroupIds = [...new Set(groupIds)];
  const uniqueOrderItemIds = [...new Set(orderItemIds)];
  const uniqueOrderIds = [...new Set(orderIds)];

  await sequelize.transaction(async (transaction) => {
    if (subscriptionIds.length > 0) {
      await SubscriptionHistory.destroy({
        where: { subscriptionId: { [Op.in]: subscriptionIds } },
        transaction,
      });
      await SubscriptionEvent.destroy({
        where: { subscriptionId: { [Op.in]: subscriptionIds } },
        transaction,
      });
    }

    if (uniquePaymentIds.length > 0) {
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: uniquePaymentIds } },
        transaction,
      });
      await SubscriptionEvent.destroy({
        where: { paymentId: { [Op.in]: uniquePaymentIds } },
        transaction,
      });
    }

    if (uniqueGroupIds.length > 0) {
      await SubscriptionGroupMember.destroy({
        where: { groupId: { [Op.in]: uniqueGroupIds } },
        transaction,
      });
    }

    if (subscriptionIds.length > 0) {
      await UserSubscription.destroy({
        where: { id: { [Op.in]: subscriptionIds } },
        transaction,
      });
    }

    if (uniqueGroupIds.length > 0) {
      await SubscriptionGroup.destroy({
        where: { id: { [Op.in]: uniqueGroupIds } },
        transaction,
      });
    }

    if (uniquePaymentIds.length > 0) {
      await Payment.destroy({
        where: { id: { [Op.in]: uniquePaymentIds } },
        transaction,
      });
    }

    if (uniqueOrderIds.length > 0) {
      await OrderItem.destroy({
        where: { orderId: { [Op.in]: uniqueOrderIds } },
        transaction,
      });
      await Order.destroy({
        where: { id: { [Op.in]: uniqueOrderIds } },
        transaction,
      });
    } else if (uniqueOrderItemIds.length > 0) {
      await OrderItem.destroy({
        where: { id: { [Op.in]: uniqueOrderItemIds } },
        transaction,
      });
    }

    if (planIds.length > 0) {
      await MembershipPlan.destroy({
        where: { id: { [Op.in]: planIds } },
        transaction,
      });
    }

    if (userIds.length > 0) {
      await User.destroy({
        where: { id: { [Op.in]: userIds } },
        transaction,
      });
    }
  });
}

async function main() {
  const suffix = randomUUID().slice(0, 8);

  try {
    await cleanup({ suffix });

    const admin = await createAdmin(`verify-history-admin-${suffix}@example.com`);
    const client = await createClient(`verify-history-client-${suffix}@example.com`);
    const groupOwner = await createClient(`verify-history-owner-${suffix}@example.com`);
    const groupMember = await createClient(`verify-history-member-${suffix}@example.com`);
    const renewalClient = await createClient(`verify-history-renewal-${suffix}@example.com`);
    const noRenewalClient = await createClient(`verify-history-no-renewal-${suffix}@example.com`);
    const unknownClient = await createClient(`verify-history-unknown-${suffix}@example.com`);
    const autoRenewClient = await createClient(`verify-history-auto-renew-${suffix}@example.com`);

    const individualPlan = await createPlan({
      name: `Verify History Individual ${suffix}`,
      slug: `verify-history-individual-${suffix}`,
      type: "individual",
      durationDays: 30,
      price: "100.00",
    });
    const mpPlan = await createPlan({
      name: `Verify History MP ${suffix}`,
      slug: `verify-history-mp-${suffix}`,
      type: "student",
      durationDays: 45,
      price: "123.00",
    });
    const groupPlan = await createPlan({
      name: `Verify History Group ${suffix}`,
      slug: `verify-history-group-${suffix}`,
      type: "group",
      durationDays: 30,
      price: "300.00",
      pricePerPerson: "150.00",
      minPeople: 2,
      maxPeople: 2,
    });

    const manualOrder = await createOrder({
      userId: client.id,
      channel: "reception",
      status: "pending_payment",
      createdBy: admin.id,
      items: [{ itemType: "membership", membershipPlanId: individualPlan.id, quantity: 1 }],
    });
    const manualPayment = await registerManualPayment({
      orderId: manualOrder.id,
      method: "cash",
      createdBy: admin.id,
      idempotencyKey: `verify-history-manual-${suffix}`,
    });
    const manualActivation = await activateMembershipsFromOrder({
      orderId: manualOrder.id,
      paymentId: manualPayment.id,
      createdBy: admin.id,
      startsAt: dateOnlyFromNow(-5),
    });
    const manualSubscription = manualActivation.results.find(
      (result) => result.itemType === "membership"
    ).subscription;
    const manualHistory = await getHistoryBySubscription(manualSubscription.id);

    assert(manualHistory.planType === "individual", "Caso individual: planType incorrecto.");
    assert(manualHistory.durationDays === 30, "Caso individual: durationDays incorrecto.");
    assert(amountEquals(manualHistory.amountPaid, "100.00"), "Caso individual: amountPaid incorrecto.");
    assert(manualHistory.isGroupSubscription === false, "Caso individual: isGroupSubscription incorrecto.");
    assert(manualHistory.paymentMethod === "cash", "Caso individual: paymentMethod incorrecto.");
    assert(manualHistory.source === "admin_manual", "Caso individual: source incorrecto.");

    const mpOrder = await createOrder({
      userId: client.id,
      channel: "online",
      status: "pending_payment",
      items: [{ itemType: "membership", membershipPlanId: mpPlan.id, quantity: 1 }],
    });
    const mpPayment = await createPaymentAttempt({
      orderId: mpOrder.id,
      method: "online_checkout",
      source: "online_checkout",
      provider: "mercadopago_checkout",
      status: "paid",
      providerPaymentId: `verify-history-provider-payment-${suffix}`,
      providerPreferenceId: `verify-history-pref-${suffix}`,
      idempotencyKey: `verify-history-mp-${suffix}`,
    });
    const mpActivation = await activateMembershipsFromOrder({
      orderId: mpOrder.id,
      paymentId: mpPayment.id,
      startsAt: dateOnlyFromNow(30),
    });
    const mpSubscription = mpActivation.results.find(
      (result) => result.itemType === "membership"
    ).subscription;
    const mpHistory = await getHistoryBySubscription(mpSubscription.id);

    assert(amountEquals(mpHistory.amountPaid, "123.00"), "Caso Mercado Pago: amountPaid incorrecto.");
    assert(Boolean(mpHistory.purchaseDate), "Caso Mercado Pago: purchaseDate faltante.");
    assert(mpHistory.paymentMethod === "online_checkout", "Caso Mercado Pago: paymentMethod incorrecto.");
    assert(mpHistory.source === "online_checkout", "Caso Mercado Pago: source incorrecto.");

    const groupOrder = await createOrder({
      userId: groupOwner.id,
      channel: "reception",
      status: "pending_payment",
      createdBy: admin.id,
      items: [
        {
          itemType: "group_membership",
          membershipPlanId: groupPlan.id,
          quantity: 1,
          metadata: { memberEmails: [groupMember.email] },
        },
      ],
    });
    const groupPayment = await registerManualPayment({
      orderId: groupOrder.id,
      method: "cash",
      createdBy: admin.id,
      idempotencyKey: `verify-history-group-${suffix}`,
    });
    const groupActivation = await activateMembershipsFromOrder({
      orderId: groupOrder.id,
      paymentId: groupPayment.id,
      createdBy: admin.id,
      startsAt: dateOnlyFromNow(0),
      groupMemberEmailsByOrderItemId: {
        [groupOrder.items.find((item) => item.itemType === "group_membership").id]: [
          groupMember.email,
        ],
      },
    });
    const group = groupActivation.results.find(
      (result) => result.itemType === "group_membership"
    ).group;
    const approvedGroup = await activateSubscriptionGroupMembers({
      groupId: group.id,
      approvedBy: admin.id,
      forceApprovePending: true,
    });
    const groupHistory = await getHistoryBySubscription(
      approvedGroup.subscriptions[0].id
    );

    assert(groupHistory.planType === "group", "Caso grupal: planType incorrecto.");
    assert(groupHistory.isGroupSubscription === true, "Caso grupal: isGroupSubscription incorrecto.");

    const manualLegacySubscription = await UserSubscription.create({
      userId: autoRenewClient.id,
      planId: individualPlan.id,
      startsAt: dateOnlyFromNow(0),
      endsAt: dateOnlyFromNow(30),
      status: "active",
      source: "admin_manual",
      autoRenew: true,
    });
    await createOrUpdateSubscriptionHistory(manualLegacySubscription.id);
    const manualLegacyHistory = await getHistoryBySubscription(
      manualLegacySubscription.id
    );

    assert(amountEquals(manualLegacyHistory.amountPaid, "100.00"), "Caso manual sin OrderItem: fallback de precio incorrecto.");
    assert(manualLegacyHistory.paymentMethod === null, "Caso manual sin pago: paymentMethod debe ser null.");
    assert(manualLegacyHistory.autoRenew === true, "Caso autoRenew: no se copio autoRenew.");
    assert(manualLegacyHistory.renewedNextPeriod === null, "Caso autoRenew: no debe definir renovacion real.");

    const renewalOld = await UserSubscription.create({
      userId: renewalClient.id,
      planId: individualPlan.id,
      startsAt: dateOnlyFromNow(-40),
      endsAt: dateOnlyFromNow(-10),
      status: "expired",
      source: "admin_manual",
      autoRenew: false,
    });
    const renewalNew = await UserSubscription.create({
      userId: renewalClient.id,
      planId: individualPlan.id,
      startsAt: dateOnlyFromNow(-5),
      endsAt: dateOnlyFromNow(25),
      status: "active",
      source: "admin_manual",
      autoRenew: false,
    });
    await createOrUpdateSubscriptionHistory(renewalOld.id, {
      updateRenewal: false,
    });
    await createOrUpdateSubscriptionHistory(renewalNew.id, {
      updateRenewal: false,
    });

    const noRenewal = await UserSubscription.create({
      userId: noRenewalClient.id,
      planId: individualPlan.id,
      startsAt: dateOnlyFromNow(-80),
      endsAt: dateOnlyFromNow(-45),
      status: "expired",
      source: "admin_manual",
      autoRenew: false,
    });
    await createOrUpdateSubscriptionHistory(noRenewal.id, {
      updateRenewal: false,
    });

    const unknown = await UserSubscription.create({
      userId: unknownClient.id,
      planId: individualPlan.id,
      startsAt: dateOnlyFromNow(-5),
      endsAt: dateOnlyFromNow(25),
      status: "active",
      source: "admin_manual",
      autoRenew: false,
    });
    await createOrUpdateSubscriptionHistory(unknown.id, {
      updateRenewal: false,
    });

    await updateRenewalClassification();
    const renewalOldHistory = await getHistoryBySubscription(renewalOld.id);
    const noRenewalHistory = await getHistoryBySubscription(noRenewal.id);
    const unknownHistory = await getHistoryBySubscription(unknown.id);

    assert(renewalOldHistory.renewedNextPeriod === true, "Caso renovacion: renewedNextPeriod debe ser true.");
    assert(noRenewalHistory.renewedNextPeriod === false, "Caso no renovacion: renewedNextPeriod debe ser false.");
    assert(unknownHistory.renewedNextPeriod === null, "Caso desconocido: renewedNextPeriod debe seguir null.");

    const duplicateCount = await SubscriptionHistory.count({
      where: { subscriptionId: manualSubscription.id },
    });

    assert(duplicateCount === 1, "subscriptionId genero historial duplicado.");

    console.log("Verificacion OK: SubscriptionHistory.");
    console.log({
      individualHistoryCreated: true,
      groupHistoryCreated: true,
      mercadoPagoFieldsResolved: true,
      manualWithoutOrderItemResolved: true,
      renewalDetected: true,
      nonRenewalDetected: true,
      recentOrActiveRemainsUnknown: true,
      autoRenewCopiedWithoutTargetLeakage: true,
      duplicateSubscriptionHistoryPrevented: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({ suffix });
    await sequelize.close();
  }
}

await main();
