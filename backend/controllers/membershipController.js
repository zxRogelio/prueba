import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  UserSubscription,
  Receipt,
  User,
  SubscriptionGroup,
  SubscriptionGroupMember,
} from "../models/index.js";
import { createOrder } from "../services/orderService.js";
import {
  registerManualPayment,
  resolveManualPaymentProvider,
} from "../services/paymentService.js";
import {
  activateMembershipsFromOrder,
  activateSubscriptionGroupMembers,
} from "../services/membershipActivationService.js";
import { createReceipt } from "../services/receiptService.js";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

async function findClientByEmail(email, transaction = null) {
  const user = await User.findOne({
    where: {
      email: normalizeEmail(email),
    },
    transaction,
  });

  if (!user) return null;

  if (user.role !== "cliente") {
    const error = new Error(
      `El correo ${email} existe, pero no pertenece a un cliente`
    );
    error.statusCode = 400;
    throw error;
  }

  return user;
}

async function getCurrentUserFromDb(userId, transaction = null) {
  return User.findByPk(userId, {
    transaction,
  });
}

async function userHasActiveSubscription(userId, transaction = null) {
  const today = toDateOnly(new Date());

  const activeSubscription = await UserSubscription.findOne({
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
  });

  return Boolean(activeSubscription);
}

async function userIsInOpenGroup(userId, transaction = null, ignoreGroupId = null) {
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

async function validateUserCanReceiveMembership(
  userId,
  transaction = null,
  options = {}
) {
  const { ignoreGroupId = null } = options;

  const hasActiveSubscription = await userHasActiveSubscription(
    userId,
    transaction
  );

  if (hasActiveSubscription) {
    const error = new Error(
      "Este usuario ya tiene una membresía activa. No se puede asignar otra."
    );
    error.statusCode = 400;
    throw error;
  }

  const isInOpenGroup = await userIsInOpenGroup(
    userId,
    transaction,
    ignoreGroupId
  );

  if (isInOpenGroup) {
    const error = new Error(
      "Este usuario ya pertenece a otro paquete pendiente o activo."
    );
    error.statusCode = 400;
    throw error;
  }
}

async function groupHasEnoughAcceptedMembers(groupId, memberLimit, transaction) {
  const members = await SubscriptionGroupMember.findAll({
    where: {
      groupId,
      status: {
        [Op.in]: ["accepted", "approved", "active"],
      },
    },
    transaction,
  });

  return members.length >= Number(memberLimit);
}

function controllerStatusCode(error) {
  const statusCode = Number(error.statusCode);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
    ? statusCode
    : 500;
}

function getOrderItems(order) {
  return order.get?.("items") || order.items || [];
}

function normalizeNullableString(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toCents(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    const error = new Error("amount debe ser un monto valido.");
    error.statusCode = 400;
    throw error;
  }

  return Math.round(numberValue * 100);
}

function normalizeIdempotencyMemberEmails(memberEmails = []) {
  return [...new Set(memberEmails.map(normalizeEmail))]
    .filter(Boolean)
    .sort();
}

function buildManualPaymentIdempotencyOperation({
  flow,
  userId,
  planId,
  amount,
  currency = "MXN",
  method,
  provider,
  startsAt = null,
  memberEmails = [],
}) {
  return {
    flow,
    userId,
    planId,
    amount: toCents(amount),
    currency: String(currency || "MXN").trim().toUpperCase(),
    method,
    provider,
    startsAt: normalizeNullableString(startsAt),
    memberEmails:
      flow === "group" ? normalizeIdempotencyMemberEmails(memberEmails) : [],
  };
}

function sameArrayValues(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function manualPaymentIdempotencyConflict(mismatches) {
  if (mismatches.includes("userId")) {
    const error = new Error("idempotencyKey ya existe para otra operacion manual.");
    error.statusCode = 409;
    return error;
  }

  const error = new Error(
    `idempotencyKey ya existe para otra operacion manual: ${mismatches.join(", ")}.`
  );
  error.statusCode = 409;
  return error;
}

function isIdempotencyDuplicateError(error, idempotencyKey) {
  if (!idempotencyKey) return false;
  if (error?.message === "idempotencyKey ya existe.") return true;
  if (error?.parent?.constraint === "payments_idempotency_key_unique") {
    return true;
  }

  if (error?.name !== "SequelizeUniqueConstraintError") return false;

  return (error.errors || []).some((entry) => entry.path === "idempotencyKey");
}

async function findMembershipPlanIdForPayment(payment, transaction) {
  if (payment.planId) return payment.planId;
  if (!payment.orderId) return null;

  const orderItem = await OrderItem.findOne({
    where: {
      orderId: payment.orderId,
      itemType: {
        [Op.in]: ["membership", "group_membership"],
      },
    },
    transaction,
  });

  return orderItem?.membershipPlanId || null;
}

async function assertExistingManualPaymentMatchesOperation({
  payment,
  operation,
  transaction,
}) {
  if (!operation) {
    const error = new Error("No se pudo validar la operacion idempotente.");
    error.statusCode = 409;
    throw error;
  }

  const mismatches = [];
  const existingPlanId = await findMembershipPlanIdForPayment(
    payment,
    transaction
  );
  const storedOperation = payment.metadata?.manualPaymentOperation || null;

  if (!payment.orderId) mismatches.push("orderId");
  if (toCents(payment.amount) !== operation.amount) mismatches.push("amount");
  if (String(payment.currency || "").trim().toUpperCase() !== operation.currency) {
    mismatches.push("currency");
  }
  if (payment.provider !== operation.provider) mismatches.push("provider");
  if (payment.method !== operation.method) mismatches.push("method");
  if (payment.userId !== operation.userId) mismatches.push("userId");
  if (existingPlanId !== operation.planId) mismatches.push("planId");

  if (storedOperation) {
    const storedMemberEmails = normalizeIdempotencyMemberEmails(
      storedOperation.memberEmails || []
    );

    if (storedOperation.flow !== operation.flow) mismatches.push("flow");
    if (normalizeNullableString(storedOperation.startsAt) !== operation.startsAt) {
      mismatches.push("startsAt");
    }
    if (!sameArrayValues(storedMemberEmails, operation.memberEmails)) {
      mismatches.push("memberEmails");
    }
  }

  if (mismatches.length > 0) {
    throw manualPaymentIdempotencyConflict([...new Set(mismatches)]);
  }
}

async function buildExistingManualPaymentResponse({ payment, flow, transaction }) {
  const [order, receipt] = await Promise.all([
    payment.orderId
      ? Order.findByPk(payment.orderId, { transaction })
      : null,
    Receipt.findOne({
      where: { paymentId: payment.id },
      transaction,
    }),
  ]);

  if (flow === "individual") {
    const subscription = await UserSubscription.findOne({
      where: { paymentId: payment.id },
      order: [["createdAt", "ASC"]],
      transaction,
    });

    return {
      ok: true,
      message: "Pago registrado y membresia activada correctamente",
      order,
      payment,
      subscription,
      receipt,
    };
  }

  const group = await SubscriptionGroup.findOne({
    where: { paymentId: payment.id },
    transaction,
  });
  const members = group
    ? await SubscriptionGroupMember.findAll({
        where: { groupId: group.id },
        order: [["createdAt", "ASC"]],
        transaction,
      })
    : [];
  const ownerMember =
    members.find((member) => member.role === "owner") || members[0] || null;

  return {
    ok: true,
    message:
      "Pago de paquete registrado. El grupo quedo pendiente de aceptacion/aprobacion.",
    order,
    payment,
    group,
    ownerMember: ownerMember
      ? {
          userId: ownerMember.userId,
          invitedEmail: ownerMember.invitedEmail,
          status: ownerMember.status,
        }
      : null,
    invitedMembers: members.filter((member) => member.id !== ownerMember?.id),
    receipt,
  };
}

async function getExistingManualPaymentResponse({
  idempotencyKey,
  operation,
  flow,
  transaction,
}) {
  if (!idempotencyKey) return null;

  const payment = await Payment.findOne({
    where: { idempotencyKey },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!payment) return null;

  await assertExistingManualPaymentMatchesOperation({
    payment,
    operation,
    transaction,
  });

  return buildExistingManualPaymentResponse({
    payment,
    flow,
    transaction,
  });
}

async function resolveManualIdempotencyConflict({
  error,
  idempotencyKey,
  operation,
  flow,
}) {
  if (!operation || !isIdempotencyDuplicateError(error, idempotencyKey)) {
    throw error;
  }

  return sequelize.transaction(async (transaction) => {
    const response = await getExistingManualPaymentResponse({
      idempotencyKey,
      operation,
      flow,
      transaction,
    });

    if (!response) throw error;

    return response;
  });
}

async function createManualMembershipPaymentUsingServices(req, res) {
  const transaction = await sequelize.transaction();
  let manualIdempotencyKey = null;
  let manualIdempotencyOperation = null;

  try {
    if (req.user?.role !== "administrador") {
      await transaction.rollback();
      return res.status(403).json({
        ok: false,
        error: "Solo un administrador puede registrar pagos manuales",
      });
    }

    const adminId = req.user.id;
    const {
      userId,
      planId,
      method = "cash",
      provider = null,
      reference = "",
      notes = "",
      startsAt,
      idempotencyKey: rawIdempotencyKey = null,
    } = req.body;

    if (!userId || !planId) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "El cliente y el plan son obligatorios",
      });
    }

    const allowedMethods = ["cash", "transfer", "card_terminal"];

    if (!allowedMethods.includes(method)) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error:
          "Metodo de pago invalido. Usa cash, transfer o card_terminal para pagos manuales.",
      });
    }

    const resolvedProvider = resolveManualPaymentProvider(method, provider);

    manualIdempotencyKey = normalizeNullableString(rawIdempotencyKey);

    const client = await User.findByPk(userId, { transaction });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Cliente no encontrado",
      });
    }

    if (client.role !== "cliente") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "Solo se pueden activar membresias a usuarios con rol cliente",
      });
    }

    const plan = await MembershipPlan.findOne({
      where: {
        id: planId,
        isActive: true,
      },
      transaction,
    });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Plan de membresia no encontrado o inactivo",
      });
    }

    if (plan.type === "group") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error:
          "Este endpoint es solo para membresias individuales. Usa el endpoint de paquetes grupales.",
      });
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "La fecha de inicio no es valida",
      });
    }

    manualIdempotencyOperation = buildManualPaymentIdempotencyOperation({
      flow: "individual",
      userId,
      planId: plan.id,
      amount: plan.price,
      method,
      provider: resolvedProvider,
      startsAt: startsAt || null,
    });

    const existingIdempotentResponse = await getExistingManualPaymentResponse({
      idempotencyKey: manualIdempotencyKey,
      operation: manualIdempotencyOperation,
      flow: "individual",
      transaction,
    });

    if (existingIdempotentResponse) {
      await transaction.commit();
      return res.status(200).json(existingIdempotentResponse);
    }

    const isInOpenGroup = await userIsInOpenGroup(userId, transaction);

    if (isInOpenGroup) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "Este usuario ya pertenece a otro paquete pendiente o activo.",
      });
    }

    const order = await createOrder({
      userId,
      channel: "reception",
      status: "pending_payment",
      createdBy: adminId,
      notes,
      metadata: {
        source: "admin_manual",
        membershipFlow: "individual",
        idempotencyKey: manualIdempotencyKey,
      },
      items: [
        {
          itemType: "membership",
          membershipPlanId: plan.id,
          quantity: 1,
        },
      ],
      transaction,
    });
    const payment = await registerManualPayment({
      orderId: order.id,
      method,
      provider: resolvedProvider,
      reference,
      notes,
      metadata: {
        source: "admin_manual",
        membershipFlow: "individual",
        manualPaymentOperation: manualIdempotencyOperation,
      },
      createdBy: adminId,
      idempotencyKey: manualIdempotencyKey,
      transaction,
    });
    const activation = await activateMembershipsFromOrder({
      orderId: order.id,
      paymentId: payment.id,
      createdBy: adminId,
      startsAt: startDate,
      transaction,
    });
    const activationResult = activation.results.find(
      (result) => result.itemType === "membership"
    );

    if (!activationResult?.subscription) {
      throw new Error("No se pudo activar la membresia de la orden.");
    }

    const receipt = await createReceipt({
      orderId: order.id,
      paymentId: payment.id,
      createdBy: adminId,
      metadata: {
        clientEmail: client.email,
        planName: plan.name,
        amount: plan.price,
        method,
        provider: resolvedProvider,
        idempotencyKey: manualIdempotencyKey,
        source: "admin_manual",
      },
      transaction,
    });
    const updatedPayment = await Payment.findByPk(payment.id, { transaction });

    await transaction.commit();

    return res.status(201).json({
      ok: true,
      message: activationResult.created
        ? "Pago registrado y membresia activada correctamente"
        : "Pago registrado; la membresia ya estaba activada para esta orden",
      order,
      payment: updatedPayment || payment,
      subscription: activationResult.subscription,
      receipt,
    });
  } catch (error) {
    await transaction.rollback();
    let handledError = error;

    try {
      const existingIdempotentResponse = await resolveManualIdempotencyConflict({
        error,
        idempotencyKey: manualIdempotencyKey,
        operation: manualIdempotencyOperation,
        flow: "individual",
      });

      return res.status(200).json(existingIdempotentResponse);
    } catch (idempotencyError) {
      handledError = idempotencyError;
    }

    const statusCode = controllerStatusCode(handledError);

    if (statusCode >= 500) {
      console.error("Error registrando pago manual:", handledError);
    }

    return res.status(statusCode).json({
      ok: false,
      error:
        handledError.message || "Error al registrar pago manual de membresia",
    });
  }
}

async function createManualGroupMembershipPaymentUsingServices(req, res) {
  const transaction = await sequelize.transaction();
  let manualIdempotencyKey = null;
  let manualIdempotencyOperation = null;

  try {
    if (req.user?.role !== "administrador") {
      await transaction.rollback();
      return res.status(403).json({
        ok: false,
        error: "Solo un administrador puede registrar pagos manuales",
      });
    }

    const adminId = req.user.id;
    const {
      ownerUserId,
      planId,
      method = "cash",
      provider = null,
      reference = "",
      notes = "",
      startsAt,
      memberEmails = [],
      idempotencyKey: rawIdempotencyKey = null,
    } = req.body;

    if (!ownerUserId || !planId) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "El titular del paquete y el plan son obligatorios",
      });
    }

    const allowedMethods = ["cash", "transfer", "card_terminal"];

    if (!allowedMethods.includes(method)) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error:
          "Metodo de pago invalido. Usa cash, transfer o card_terminal para pagos manuales.",
      });
    }

    const resolvedProvider = resolveManualPaymentProvider(method, provider);

    manualIdempotencyKey = normalizeNullableString(rawIdempotencyKey);

    const owner = await User.findByPk(ownerUserId, { transaction });

    if (!owner) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Titular del paquete no encontrado",
      });
    }

    if (owner.role !== "cliente") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "El titular del paquete debe ser un cliente",
      });
    }

    const plan = await MembershipPlan.findOne({
      where: {
        id: planId,
        isActive: true,
      },
      transaction,
    });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Plan de membresia no encontrado o inactivo",
      });
    }

    if (plan.type !== "group") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "Este endpoint es solo para paquetes grupales",
      });
    }

    const ownerEmail = normalizeEmail(owner.email);
    const requestedMemberEmails = Array.isArray(memberEmails) ? memberEmails : [];
    const cleanEmails = [...new Set(requestedMemberEmails.map(normalizeEmail))]
      .filter(Boolean)
      .filter((email) => email !== ownerEmail);
    const maxInvitedEmails = Number(plan.maxPeople) - 1;

    if (cleanEmails.length > maxInvitedEmails) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: `Este paquete solo permite agregar ${maxInvitedEmails} integrantes ademas del titular`,
      });
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "La fecha de inicio no es valida",
      });
    }

    manualIdempotencyOperation = buildManualPaymentIdempotencyOperation({
      flow: "group",
      userId: ownerUserId,
      planId: plan.id,
      amount: plan.price,
      method,
      provider: resolvedProvider,
      startsAt: startsAt || null,
      memberEmails: cleanEmails,
    });

    const existingIdempotentResponse = await getExistingManualPaymentResponse({
      idempotencyKey: manualIdempotencyKey,
      operation: manualIdempotencyOperation,
      flow: "group",
      transaction,
    });

    if (existingIdempotentResponse) {
      await transaction.commit();
      return res.status(200).json(existingIdempotentResponse);
    }

    await validateUserCanReceiveMembership(ownerUserId, transaction);

    for (const email of cleanEmails) {
      const invitedUser = await findClientByEmail(email, transaction);

      if (invitedUser) {
        await validateUserCanReceiveMembership(invitedUser.id, transaction);
      }
    }

    const order = await createOrder({
      userId: ownerUserId,
      channel: "reception",
      status: "pending_payment",
      createdBy: adminId,
      notes,
      metadata: {
        source: "admin_manual",
        membershipFlow: "group",
        idempotencyKey: manualIdempotencyKey,
      },
      items: [
        {
          itemType: "group_membership",
          membershipPlanId: plan.id,
          quantity: 1,
          metadata: {
            memberEmails: cleanEmails,
          },
        },
      ],
      transaction,
    });
    const groupOrderItem = getOrderItems(order).find(
      (item) => item.itemType === "group_membership"
    );

    if (!groupOrderItem) {
      throw new Error("No se pudo crear el item de paquete grupal.");
    }

    const payment = await registerManualPayment({
      orderId: order.id,
      method,
      provider: resolvedProvider,
      reference,
      notes,
      metadata: {
        source: "admin_manual",
        membershipFlow: "group",
        manualPaymentOperation: manualIdempotencyOperation,
      },
      createdBy: adminId,
      idempotencyKey: manualIdempotencyKey,
      transaction,
    });
    const activation = await activateMembershipsFromOrder({
      orderId: order.id,
      paymentId: payment.id,
      createdBy: adminId,
      startsAt: startDate,
      groupMemberEmailsByOrderItemId: {
        [groupOrderItem.id]: cleanEmails,
      },
      transaction,
    });
    const groupResult = activation.results.find(
      (result) => result.itemType === "group_membership"
    );

    if (!groupResult?.group) {
      throw new Error("No se pudo crear el paquete grupal desde la orden.");
    }

    const receipt = await createReceipt({
      orderId: order.id,
      paymentId: payment.id,
      createdBy: adminId,
      metadata: {
        ownerEmail: owner.email,
        planName: plan.name,
        amount: plan.price,
        method,
        provider: resolvedProvider,
        idempotencyKey: manualIdempotencyKey,
        source: "admin_manual",
        groupId: groupResult.group.id,
      },
      transaction,
    });
    const updatedPayment = await Payment.findByPk(payment.id, { transaction });

    await transaction.commit();

    return res.status(201).json({
      ok: true,
      message:
        "Pago de paquete registrado. El grupo quedo pendiente de aceptacion/aprobacion.",
      order,
      payment: updatedPayment || payment,
      group: groupResult.group,
      ownerMember: groupResult.ownerMember
        ? {
            userId: owner.id,
            invitedEmail: ownerEmail,
            status: groupResult.ownerMember.status,
          }
        : {
            userId: owner.id,
            invitedEmail: ownerEmail,
            status: "accepted",
          },
      invitedMembers: groupResult.invitedMembers || [],
      receipt,
    });
  } catch (error) {
    await transaction.rollback();
    let handledError = error;

    try {
      const existingIdempotentResponse = await resolveManualIdempotencyConflict({
        error,
        idempotencyKey: manualIdempotencyKey,
        operation: manualIdempotencyOperation,
        flow: "group",
      });

      return res.status(200).json(existingIdempotentResponse);
    } catch (idempotencyError) {
      handledError = idempotencyError;
    }

    const statusCode = controllerStatusCode(handledError);

    if (statusCode >= 500) {
      console.error("Error registrando paquete grupal:", handledError);
    }

    return res.status(statusCode).json({
      ok: false,
      error: handledError.message || "Error al registrar paquete grupal",
    });
  }
}

export async function listMembershipPlans(req, res) {
  try {
    const plans = await MembershipPlan.findAll({
      where: {
        isActive: true,
      },
      order: [["sortOrder", "ASC"]],
    });

    return res.json({
      ok: true,
      plans,
    });
  } catch (error) {
    console.error("❌ Error listando planes:", error);
    return res.status(500).json({
      ok: false,
      error: "Error al obtener planes de membresía",
      detail: error.message,
    });
  }
}

export async function getMembershipPlanById(req, res) {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!plan) {
      return res.status(404).json({
        ok: false,
        error: "Plan de membresía no encontrado",
      });
    }

    return res.json({
      ok: true,
      plan,
    });
  } catch (error) {
    console.error("❌ Error obteniendo plan:", error);
    return res.status(500).json({
      ok: false,
      error: "Error al obtener el plan de membresía",
      detail: error.message,
    });
  }
}

export async function getMyActiveSubscription(req, res) {
  try {
    const userId = req.user.id;
    const today = toDateOnly(new Date());

    const subscription = await UserSubscription.findOne({
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
      include: [
        {
          model: MembershipPlan,
          as: "plan",
        },
        {
          model: Payment,
          as: "payment",
          include: [
            {
              model: Receipt,
              as: "receipt",
            },
          ],
        },
      ],
      order: [["endsAt", "DESC"]],
    });

    return res.json({
      ok: true,
      hasActiveSubscription: Boolean(subscription),
      subscription,
    });
  } catch (error) {
    console.error("❌ Error obteniendo membresía activa:", error);
    return res.status(500).json({
      ok: false,
      error: "Error al obtener la membresía activa",
      detail: error.message,
    });
  }
}

export async function listMyMembershipPayments(req, res) {
  try {
    const userId = req.user.id;

    const payments = await Payment.findAll({
      where: {
        userId,
        paymentType: "membership",
      },
      include: [
        {
          model: MembershipPlan,
          as: "plan",
        },
        {
          model: Receipt,
          as: "receipt",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      ok: true,
      payments,
    });
  } catch (error) {
    console.error("❌ Error obteniendo pagos del cliente:", error);
    return res.status(500).json({
      ok: false,
      error: "Error al obtener historial de pagos",
      detail: error.message,
    });
  }
}

export async function createManualMembershipPayment(req, res) {
  return createManualMembershipPaymentUsingServices(req, res);
}

export async function createManualGroupMembershipPayment(req, res) {
  return createManualGroupMembershipPaymentUsingServices(req, res);
}

export async function addMemberToMyGroup(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const ownerUserId = req.user.id;
    const { groupId } = req.params;
    const { invitedEmail } = req.body;

    const email = normalizeEmail(invitedEmail);

    if (!email) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "El correo del invitado es obligatorio",
      });
    }

    const group = await SubscriptionGroup.findOne({
      where: {
        id: groupId,
        ownerUserId,
        status: {
          [Op.in]: ["pending_members", "pending_admin_approval"],
        },
      },
      include: [
        {
          model: MembershipPlan,
          as: "plan",
        },
      ],
      transaction,
    });

    if (!group) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error:
          "Grupo no encontrado, no eres el titular o ya no permite cambios",
      });
    }

    const existingMembersCount = await SubscriptionGroupMember.count({
      where: {
        groupId,
        status: {
          [Op.notIn]: ["removed", "rejected"],
        },
      },
      transaction,
    });

    if (existingMembersCount >= Number(group.memberLimit)) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "El paquete ya tiene todos sus integrantes",
      });
    }

    const duplicated = await SubscriptionGroupMember.findOne({
      where: {
        groupId,
        invitedEmail: email,
      },
      transaction,
    });

    if (duplicated) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "Ese correo ya fue agregado a este paquete",
      });
    }

    const invitedUser = await findClientByEmail(email, transaction);

    if (invitedUser) {
      await validateUserCanReceiveMembership(invitedUser.id, transaction);
    }

    const member = await SubscriptionGroupMember.create(
      {
        groupId,
        userId: invitedUser?.id || null,
        invitedEmail: email,
        role: "member",
        status: "pending_invitation",
        priceShare: group.pricePerPerson,
      },
      { transaction }
    );

    const newCount = existingMembersCount + 1;

    if (newCount >= Number(group.memberLimit)) {
      await group.update(
        {
          status: "pending_admin_approval",
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({
      ok: true,
      message: "Integrante agregado al paquete correctamente",
      member,
      groupStatus:
        newCount >= Number(group.memberLimit)
          ? "pending_admin_approval"
          : group.status,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error agregando integrante:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error al agregar integrante al paquete",
    });
  }
}

export async function listMyGroupInvitations(req, res) {
  try {
    const userId = req.user.id;

    const currentUser = await getCurrentUserFromDb(userId);

    if (!currentUser) {
      return res.status(404).json({
        ok: false,
        error: "Usuario no encontrado",
      });
    }

    const email = normalizeEmail(currentUser.email);

    const invitations = await SubscriptionGroupMember.findAll({
      where: {
        status: "pending_invitation",
        [Op.or]: [{ userId }, { invitedEmail: email }],
      },
      include: [
        {
          model: SubscriptionGroup,
          as: "group",
          include: [
            {
              model: MembershipPlan,
              as: "plan",
            },
            {
              model: User,
              as: "owner",
              attributes: ["id", "email", "role"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      ok: true,
      invitations,
    });
  } catch (error) {
    console.error("❌ Error obteniendo invitaciones:", error);

    return res.status(500).json({
      ok: false,
      error: "Error al obtener invitaciones de paquetes",
      detail: error.message,
    });
  }
}

export async function acceptGroupInvitation(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { memberId } = req.params;

    const currentUser = await getCurrentUserFromDb(userId, transaction);

    if (!currentUser) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Usuario no encontrado",
      });
    }

    const email = normalizeEmail(currentUser.email);

    const member = await SubscriptionGroupMember.findOne({
      where: {
        id: memberId,
        status: "pending_invitation",
        [Op.or]: [{ userId }, { invitedEmail: email }],
      },
      include: [
        {
          model: SubscriptionGroup,
          as: "group",
        },
      ],
      transaction,
    });

    if (!member) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Invitación no encontrada o ya fue respondida",
      });
    }

    await validateUserCanReceiveMembership(userId, transaction, {
      ignoreGroupId: member.groupId,
    });

    await member.update(
      {
        userId,
        status: "accepted",
        acceptedAt: new Date(),
      },
      { transaction }
    );

    const acceptedEnough = await groupHasEnoughAcceptedMembers(
      member.groupId,
      member.group.memberLimit,
      transaction
    );

    if (acceptedEnough && member.group.status === "pending_members") {
      await member.group.update(
        {
          status: "pending_admin_approval",
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.json({
      ok: true,
      message:
        "Invitación aceptada correctamente. El grupo queda pendiente de aprobación administrativa.",
      member,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error aceptando invitación:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error al aceptar invitación",
    });
  }
}

export async function listPendingSubscriptionGroups(req, res) {
  try {
    const groups = await SubscriptionGroup.findAll({
      where: {
        status: {
          [Op.in]: ["pending_members", "pending_admin_approval"],
        },
      },
      include: [
        {
          model: MembershipPlan,
          as: "plan",
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "email", "role"],
        },
        {
          model: Payment,
          as: "payment",
        },
        {
          model: SubscriptionGroupMember,
          as: "members",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "email", "role"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      ok: true,
      groups,
    });
  } catch (error) {
    console.error("❌ Error listando grupos pendientes:", error);

    return res.status(500).json({
      ok: false,
      error: "Error al obtener paquetes pendientes",
      detail: error.message,
    });
  }
}

export async function approveSubscriptionGroup(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const adminId = req.user.id;
    const { groupId } = req.params;
    const { forceApprovePending = false } = req.body;

    const activation = await activateSubscriptionGroupMembers({
      groupId,
      approvedBy: adminId,
      forceApprovePending,
      transaction,
    });

    await transaction.commit();

    return res.json({
      ok: true,
      message: "Paquete aprobado y membresias activadas correctamente",
      group: activation.group,
      subscriptions: activation.subscriptions,
    });
  } catch (error) {
    await transaction.rollback();
    const statusCode = controllerStatusCode(error);

    if (statusCode >= 500) {
      console.error("Error aprobando paquete:", error);
    }

    return res.status(statusCode).json({
      ok: false,
      error: error.message || "Error al aprobar paquete grupal",
      ...(error.pendingEmails ? { pendingEmails: error.pendingEmails } : {}),
    });
  }
}
