import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Payment,
  SubscriptionGroup,
  SubscriptionGroupMember,
  User,
  UserSubscription,
} from "../models/index.js";
import { activateSubscriptionGroupMembers } from "../services/membershipActivationService.js";

function dateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

async function createUser(email, role, transaction) {
  return User.create(
    {
      email,
      role,
      isVerified: true,
      isPendingApproval: false,
      authMethod: "normal",
      provider: "local",
    },
    { transaction }
  );
}

async function main() {
  const transaction = await sequelize.transaction();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const admin = await createUser(
      `verify-group-approval-admin-${suffix}@example.com`,
      "administrador",
      transaction
    );
    const owner = await createUser(
      `verify-group-approval-owner-${suffix}@example.com`,
      "cliente",
      transaction
    );
    const member = await createUser(
      `verify-group-approval-member-${suffix}@example.com`,
      "cliente",
      transaction
    );
    const plan = await MembershipPlan.create(
      {
        name: `Verify Group Approval ${suffix}`,
        slug: `verify-group-approval-${suffix}`,
        description: "Temporary verification plan; transaction is rolled back.",
        type: "group",
        durationDays: 30,
        price: "100.00",
        pricePerPerson: "50.00",
        minPeople: 2,
        maxPeople: 2,
        requiresStudentProof: false,
        accessLevel: "standard",
        benefits: [],
        isActive: true,
        sortOrder: 9999,
      },
      { transaction }
    );
    const paidAt = new Date();
    const payment = await Payment.create(
      {
        userId: owner.id,
        planId: plan.id,
        paymentType: "membership",
        amount: "100.00",
        method: "cash",
        source: "admin_manual",
        provider: "none",
        status: "paid",
        currency: "MXN",
        paidAt,
        approvedAt: paidAt,
        createdBy: admin.id,
      },
      { transaction }
    );
    const startDate = new Date();
    const group = await SubscriptionGroup.create(
      {
        planId: plan.id,
        ownerUserId: owner.id,
        paymentId: payment.id,
        memberLimit: 2,
        totalAmount: "100.00",
        pricePerPerson: "50.00",
        startsAt: dateOnly(startDate),
        endsAt: dateOnly(addDays(startDate, plan.durationDays)),
        status: "pending_admin_approval",
        createdBy: admin.id,
      },
      { transaction }
    );

    await payment.update({ groupId: group.id }, { transaction });

    await SubscriptionGroupMember.bulkCreate(
      [
        {
          groupId: group.id,
          userId: owner.id,
          invitedEmail: owner.email,
          role: "owner",
          status: "accepted",
          priceShare: "50.00",
          acceptedAt: new Date(),
        },
        {
          groupId: group.id,
          userId: member.id,
          invitedEmail: member.email,
          role: "member",
          status: "accepted",
          priceShare: "50.00",
          acceptedAt: new Date(),
        },
      ],
      { transaction }
    );

    const before = await UserSubscription.count({
      where: { groupId: group.id },
      transaction,
    });
    const firstApproval = await activateSubscriptionGroupMembers({
      groupId: group.id,
      approvedBy: admin.id,
      forceApprovePending: false,
      transaction,
    });
    const afterFirst = await UserSubscription.count({
      where: { groupId: group.id },
      transaction,
    });
    let secondApprovalError = null;

    try {
      await activateSubscriptionGroupMembers({
        groupId: group.id,
        approvedBy: admin.id,
        forceApprovePending: false,
        transaction,
      });
    } catch (error) {
      secondApprovalError = error;
    }

    const afterSecond = await UserSubscription.count({
      where: { groupId: group.id },
      transaction,
    });

    if (before !== 0) {
      throw new Error(`Se esperaban 0 suscripciones iniciales; hay ${before}.`);
    }

    if (afterFirst !== 2 || firstApproval.subscriptions.length !== 2) {
      throw new Error(
        `La primera aprobacion debia crear 2 suscripciones; count=${afterFirst}, response=${firstApproval.subscriptions.length}.`
      );
    }

    if (!secondApprovalError || secondApprovalError.statusCode !== 404) {
      throw new Error(
        "La segunda aprobacion debia fallar porque el grupo ya no esta pendiente."
      );
    }

    if (afterSecond !== afterFirst) {
      throw new Error(
        `La segunda aprobacion creo suscripciones adicionales; before=${afterFirst}, after=${afterSecond}.`
      );
    }

    console.log("Verificacion OK: aprobacion grupal idempotente.");
    console.log({
      groupId: group.id,
      subscriptionsBefore: before,
      subscriptionsAfterFirstApproval: afterFirst,
      subscriptionsAfterSecondApproval: afterSecond,
      secondApprovalStatusCode: secondApprovalError.statusCode,
      rolledBack: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
}

await main();
