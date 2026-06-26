import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Payment,
  UserSubscription,
  Receipt,
  User,
  SubscriptionGroup,
  SubscriptionGroupMember,
} from "../models/index.js";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

function createReceiptFolio() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TSG-${datePart}-${randomPart}`;
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
    throw new Error(`El correo ${email} existe, pero no pertenece a un cliente`);
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
    throw new Error(
      "Este usuario ya tiene una membresía activa. No se puede asignar otra."
    );
  }

  const isInOpenGroup = await userIsInOpenGroup(
    userId,
    transaction,
    ignoreGroupId
  );

  if (isInOpenGroup) {
    throw new Error(
      "Este usuario ya pertenece a otro paquete pendiente o activo."
    );
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
  const transaction = await sequelize.transaction();

  try {
    const adminId = req.user.id;

    const {
      userId,
      planId,
      method = "cash",
      provider = "none",
      reference = "",
      notes = "",
      startsAt,
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
          "Método de pago inválido. Usa cash, transfer o card_terminal para pagos manuales.",
      });
    }

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
        error: "Solo se pueden activar membresías a usuarios con rol cliente",
      });
    }

    await validateUserCanReceiveMembership(userId, transaction);

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
        error: "Plan de membresía no encontrado o inactivo",
      });
    }

    if (plan.type === "group") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error:
          "Este endpoint es solo para membresías individuales. Usa el endpoint de paquetes grupales.",
      });
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "La fecha de inicio no es válida",
      });
    }

    const endDate = addDays(startDate, plan.durationDays);

    const payment = await Payment.create(
      {
        userId,
        planId,
        paymentType: "membership",
        amount: plan.price,
        method,
        source: "admin_manual",
        provider,
        status: "paid",
        reference,
        notes,
        paidAt: new Date(),
        createdBy: adminId,
      },
      { transaction }
    );

    const subscription = await UserSubscription.create(
      {
        userId,
        planId,
        paymentId: payment.id,
        startsAt: toDateOnly(startDate),
        endsAt: toDateOnly(endDate),
        status: "active",
        source: "admin_manual",
        autoRenew: false,
        createdBy: adminId,
        notes,
      },
      { transaction }
    );

    await payment.update(
      {
        subscriptionId: subscription.id,
      },
      { transaction }
    );

    const receipt = await Receipt.create(
      {
        paymentId: payment.id,
        folio: createReceiptFolio(),
        status: "issued",
        issuedAt: new Date(),
        metadata: {
          clientEmail: client.email,
          planName: plan.name,
          amount: plan.price,
          method,
          source: "admin_manual",
        },
        createdBy: adminId,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      ok: true,
      message: "Pago registrado y membresía activada correctamente",
      payment,
      subscription,
      receipt,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error registrando pago manual:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error al registrar pago manual de membresía",
    });
  }
}

export async function createManualGroupMembershipPayment(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const adminId = req.user.id;

    const {
      ownerUserId,
      planId,
      method = "cash",
      provider = "none",
      reference = "",
      notes = "",
      startsAt,
      memberEmails = [],
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
          "Método de pago inválido. Usa cash, transfer o card_terminal para pagos manuales.",
      });
    }

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

    await validateUserCanReceiveMembership(ownerUserId, transaction);

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
        error: "Plan de membresía no encontrado o inactivo",
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

    const cleanEmails = [...new Set(memberEmails.map(normalizeEmail))]
      .filter(Boolean)
      .filter((email) => email !== ownerEmail);

    const maxInvitedEmails = Number(plan.maxPeople) - 1;

    if (cleanEmails.length > maxInvitedEmails) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: `Este paquete solo permite agregar ${maxInvitedEmails} integrantes además del titular`,
      });
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();

    if (Number.isNaN(startDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "La fecha de inicio no es válida",
      });
    }

    const endDate = addDays(startDate, plan.durationDays);

    const payment = await Payment.create(
      {
        userId: ownerUserId,
        planId,
        paymentType: "membership",
        amount: plan.price,
        method,
        source: "admin_manual",
        provider,
        status: "paid",
        reference,
        notes,
        paidAt: new Date(),
        createdBy: adminId,
      },
      { transaction }
    );

    const group = await SubscriptionGroup.create(
      {
        planId,
        ownerUserId,
        paymentId: payment.id,
        memberLimit: plan.maxPeople,
        totalAmount: plan.price,
        pricePerPerson: plan.pricePerPerson,
        startsAt: toDateOnly(startDate),
        endsAt: toDateOnly(endDate),
        status:
          cleanEmails.length + 1 >= Number(plan.maxPeople)
            ? "pending_admin_approval"
            : "pending_members",
        createdBy: adminId,
        notes,
      },
      { transaction }
    );

    await payment.update(
      {
        groupId: group.id,
      },
      { transaction }
    );

    await SubscriptionGroupMember.create(
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

    const createdMembers = [];

    for (const email of cleanEmails) {
      const invitedUser = await findClientByEmail(email, transaction);

      if (invitedUser) {
        await validateUserCanReceiveMembership(invitedUser.id, transaction);
      }

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

      createdMembers.push(member);
    }

    const receipt = await Receipt.create(
      {
        paymentId: payment.id,
        folio: createReceiptFolio(),
        status: "issued",
        issuedAt: new Date(),
        metadata: {
          ownerEmail: owner.email,
          planName: plan.name,
          amount: plan.price,
          method,
          provider,
          source: "admin_manual",
          groupId: group.id,
        },
        createdBy: adminId,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      ok: true,
      message:
        "Pago de paquete registrado. El grupo quedó pendiente de aceptación/aprobación.",
      payment,
      group,
      ownerMember: {
        userId: owner.id,
        invitedEmail: ownerEmail,
        status: "accepted",
      },
      invitedMembers: createdMembers,
      receipt,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error registrando paquete grupal:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error al registrar paquete grupal",
    });
  }
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

    const group = await SubscriptionGroup.findOne({
      where: {
        id: groupId,
        status: {
          [Op.in]: ["pending_admin_approval", "pending_members"],
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
        },
        {
          model: SubscriptionGroupMember,
          as: "members",
        },
      ],
      transaction,
    });

    if (!group) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: "Paquete no encontrado o no está pendiente de aprobación",
      });
    }

    if (!group.payment || group.payment.status !== "paid") {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: "No se puede aprobar un paquete sin pago confirmado",
      });
    }

    let validMembers = group.members.filter((member) =>
      ["accepted", "approved", "active"].includes(member.status)
    );

    if (forceApprovePending) {
      const pendingMembersWithAccount = group.members.filter(
        (member) => member.status === "pending_invitation" && member.userId
      );

      validMembers = [...validMembers, ...pendingMembersWithAccount];
    }

    if (validMembers.length !== Number(group.memberLimit)) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: forceApprovePending
          ? `El paquete necesita ${group.memberLimit} integrantes con cuenta registrada para aprobarse`
          : `El paquete necesita ${group.memberLimit} integrantes aceptados para aprobarse`,
      });
    }

    const membersWithoutAccount = validMembers.filter((member) => !member.userId);

    if (membersWithoutAccount.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error:
          "Todos los integrantes deben tener cuenta registrada antes de aprobar el paquete",
        pendingEmails: membersWithoutAccount.map((member) => member.invitedEmail),
      });
    }

    for (const member of validMembers) {
      await validateUserCanReceiveMembership(member.userId, transaction, {
        ignoreGroupId: group.id,
      });
    }

    const startDate = group.startsAt ? new Date(group.startsAt) : new Date();
    const endDate = group.endsAt
      ? new Date(group.endsAt)
      : addDays(startDate, group.plan.durationDays);

    const createdSubscriptions = [];

    for (const member of validMembers) {
      const subscription = await UserSubscription.create(
        {
          userId: member.userId,
          planId: group.planId,
          paymentId: group.paymentId,
          groupId: group.id,
          startsAt: toDateOnly(startDate),
          endsAt: toDateOnly(endDate),
          status: "active",
          source: "group_package",
          autoRenew: false,
          createdBy: adminId,
          notes: `Membresía activada por paquete grupal ${group.id}`,
        },
        { transaction }
      );

      createdSubscriptions.push(subscription);

      await member.update(
        {
          status: "active",
          approvedAt: new Date(),
          approvedBy: adminId,
        },
        { transaction }
      );
    }

    await group.update(
      {
        status: "active",
        startsAt: toDateOnly(startDate),
        endsAt: toDateOnly(endDate),
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      { transaction }
    );

    await transaction.commit();

    return res.json({
      ok: true,
      message: "Paquete aprobado y membresías activadas correctamente",
      group,
      subscriptions: createdSubscriptions,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error aprobando paquete:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error al aprobar paquete grupal",
    });
  }
}
