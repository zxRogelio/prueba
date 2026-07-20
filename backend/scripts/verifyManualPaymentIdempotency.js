import { randomUUID } from "node:crypto";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  Receipt,
  SubscriptionEvent,
  SubscriptionGroup,
  User,
  UserSubscription,
} from "../models/index.js";
import { createManualMembershipPayment } from "../controllers/membershipController.js";

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function createUser(email, role) {
  return User.create({
    email,
    role,
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
  });
}

async function countOrdersByIdempotencyKey(idempotencyKey) {
  const [row] = await sequelize.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "core"."Orders"
      WHERE metadata->>'idempotencyKey' = :idempotencyKey;
    `,
    {
      replacements: { idempotencyKey },
      type: QueryTypes.SELECT,
    }
  );

  return Number(row?.count || 0);
}

async function cleanup({ idempotencyKey, emails, planSlug }) {
  const payments = idempotencyKey
    ? await Payment.findAll({
        where: { idempotencyKey },
        attributes: ["id", "orderId"],
      })
    : [];
  const paymentIds = payments.map((payment) => payment.id);
  const orderIds = [
    ...new Set(payments.map((payment) => payment.orderId).filter(Boolean)),
  ];
  const subscriptions = paymentIds.length
    ? await UserSubscription.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
      })
    : [];
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);

  await sequelize.transaction(async (transaction) => {
    if (subscriptionIds.length > 0) {
      await SubscriptionEvent.destroy({
        where: { subscriptionId: { [Op.in]: subscriptionIds } },
        transaction,
      });
    }

    if (paymentIds.length > 0) {
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await SubscriptionGroup.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await UserSubscription.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Payment.destroy({
        where: { id: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      await OrderItem.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
      await Order.destroy({
        where: { id: { [Op.in]: orderIds } },
        transaction,
      });
    }

    await MembershipPlan.destroy({
      where: { slug: planSlug },
      transaction,
    });
    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const idempotencyKey = randomUUID();
  const adminEmail = `verify-manual-idempotency-admin-${suffix}@example.com`;
  const clientEmail = `verify-manual-idempotency-client-${suffix}@example.com`;
  const planSlug = `verify-manual-idempotency-${suffix}`;

  try {
    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const plan = await MembershipPlan.create({
      name: `Verify Manual Idempotency ${suffix}`,
      slug: planSlug,
      description: "Temporary verification plan; removed after this script.",
      type: "individual",
      durationDays: 30,
      price: "100.00",
      pricePerPerson: null,
      minPeople: 1,
      maxPeople: 1,
      requiresStudentProof: false,
      accessLevel: "standard",
      benefits: [],
      isActive: true,
      sortOrder: 9999,
    });
    const requestBody = {
      userId: client.id,
      planId: plan.id,
      method: "cash",
      provider: "none",
      reference: "manual-idempotency-test",
      notes: "same payload should be idempotent",
      idempotencyKey,
    };
    const firstResponse = createMockResponse();
    const secondResponse = createMockResponse();

    await createManualMembershipPayment(
      {
        user: { id: admin.id, role: "administrador" },
        body: requestBody,
      },
      firstResponse
    );
    await createManualMembershipPayment(
      {
        user: { id: admin.id, role: "administrador" },
        body: requestBody,
      },
      secondResponse
    );

    const paymentCount = await Payment.count({ where: { idempotencyKey } });
    const payment = await Payment.findOne({ where: { idempotencyKey } });
    const orderCount = await countOrdersByIdempotencyKey(idempotencyKey);
    const subscriptionCount = payment
      ? await UserSubscription.count({ where: { paymentId: payment.id } })
      : 0;
    const groupCount = payment
      ? await SubscriptionGroup.count({ where: { paymentId: payment.id } })
      : 0;
    const receiptCount = payment
      ? await Receipt.count({ where: { paymentId: payment.id } })
      : 0;
    const conflictResponse = createMockResponse();

    await createManualMembershipPayment(
      {
        user: { id: admin.id, role: "administrador" },
        body: {
          ...requestBody,
          method: "transfer",
          provider: "bank_transfer",
        },
      },
      conflictResponse
    );

    const paymentCountAfterConflict = await Payment.count({
      where: { idempotencyKey },
    });
    const orderCountAfterConflict =
      await countOrdersByIdempotencyKey(idempotencyKey);

    if (firstResponse.statusCode !== 201) {
      throw new Error(
        `El primer intento debia responder 201; respondio ${firstResponse.statusCode}.`
      );
    }

    if (secondResponse.statusCode !== 200) {
      throw new Error(
        `El segundo intento identico debia responder 200; respondio ${secondResponse.statusCode}.`
      );
    }

    if (paymentCount !== 1) {
      throw new Error(`Se esperaba 1 pago; existen ${paymentCount}.`);
    }

    if (orderCount !== 1) {
      throw new Error(`Se esperaba 1 orden relacionada; existen ${orderCount}.`);
    }

    if (subscriptionCount !== 1 || groupCount !== 0) {
      throw new Error(
        `Se esperaba 1 suscripcion individual y 0 grupos; subscriptions=${subscriptionCount}, groups=${groupCount}.`
      );
    }

    if (receiptCount !== 1) {
      throw new Error(`Se esperaba 1 recibo; existen ${receiptCount}.`);
    }

    if (conflictResponse.statusCode !== 409) {
      throw new Error(
        `La repeticion con datos diferentes debia responder 409; respondio ${conflictResponse.statusCode}.`
      );
    }

    if (paymentCountAfterConflict !== 1 || orderCountAfterConflict !== 1) {
      throw new Error(
        `La repeticion conflictiva creo registros adicionales; payments=${paymentCountAfterConflict}, orders=${orderCountAfterConflict}.`
      );
    }

    console.log("Verificacion OK: pago manual idempotente.");
    console.log({
      idempotencyKey,
      firstAttemptStatusCode: firstResponse.statusCode,
      secondAttemptStatusCode: secondResponse.statusCode,
      conflictAttemptStatusCode: conflictResponse.statusCode,
      conflictAttemptMessage: conflictResponse.body?.error,
      payments: paymentCountAfterConflict,
      orders: orderCountAfterConflict,
      subscriptions: subscriptionCount,
      groups: groupCount,
      receipts: receiptCount,
      cleanedUp: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      idempotencyKey,
      emails: [adminEmail, clientEmail],
      planSlug,
    });
    await sequelize.close();
  }
}

await main();
