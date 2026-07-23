import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Order,
  OrderDiscount,
  OrderItem,
  Payment,
  PaymentRefund,
  User,
} from "../models/index.js";
import { refundPayment } from "../controllers/paymentController.js";
import { createOrder } from "../services/orderService.js";
import {
  createPaymentAttempt,
  registerManualPayment,
} from "../services/paymentService.js";

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function createPaidPayment({
  admin,
  client,
  plan,
  reference,
  orderIds,
  paymentIds,
}) {
  const order = await createOrder({
    userId: client.id,
    channel: "reception",
    status: "pending_payment",
    createdBy: admin.id,
    metadata: {
      source: "verify_refund_controller",
      reference,
    },
    items: [
      {
        itemType: "membership",
        membershipPlanId: plan.id,
        quantity: 1,
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await registerManualPayment({
    orderId: order.id,
    method: "cash",
    provider: "none",
    reference,
    notes: "verification refund payment",
    metadata: {
      source: "verify_refund_controller",
      reference,
    },
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  return payment;
}

async function createPendingPayment({
  admin,
  client,
  plan,
  reference,
  orderIds,
  paymentIds,
}) {
  const order = await createOrder({
    userId: client.id,
    channel: "reception",
    status: "pending_payment",
    createdBy: admin.id,
    metadata: {
      source: "verify_refund_controller",
      reference,
    },
    items: [
      {
        itemType: "membership",
        membershipPlanId: plan.id,
        quantity: 1,
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await createPaymentAttempt({
    orderId: order.id,
    method: "cash",
    source: "admin_manual",
    provider: "none",
    status: "pending",
    reference,
    notes: "verification non paid refund payment",
    metadata: {
      source: "verify_refund_controller",
      reference,
    },
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  return payment;
}

async function callRefund({ admin, paymentId, body }) {
  const response = createMockResponse();

  await refundPayment(
    {
      params: { paymentId },
      body,
      user: {
        id: admin.id,
        role: "administrador",
      },
    },
    response
  );

  return response;
}

async function cleanup({ emails, planSlug, paymentIds, orderIds }) {
  await sequelize.transaction(async (transaction) => {
    if (paymentIds.length > 0) {
      await PaymentRefund.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Payment.destroy({
        where: { id: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      await OrderDiscount.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
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
  const adminEmail = `verify-refund-admin-${suffix}@example.com`;
  const clientEmail = `verify-refund-client-${suffix}@example.com`;
  const planSlug = `verify-refund-controller-${suffix}`;
  const paymentIds = [];
  const orderIds = [];
  const results = {};

  try {
    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const plan = await MembershipPlan.create({
      name: `Verify Refund Controller ${suffix}`,
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

    const partialPayment = await createPaidPayment({
      admin,
      client,
      plan,
      reference: `partial-${suffix}`,
      orderIds,
      paymentIds,
    });
    const partialResponse = await callRefund({
      admin,
      paymentId: partialPayment.id,
      body: {
        amount: "40.00",
        reason: "partial valid refund",
      },
    });
    const partialRefundCount = await PaymentRefund.count({
      where: { paymentId: partialPayment.id },
    });
    const partialOrder = await Order.findByPk(partialPayment.orderId);
    const partialRefund = await PaymentRefund.findOne({
      where: { paymentId: partialPayment.id },
    });

    assert(
      partialResponse.statusCode === 200,
      `Reembolso parcial debia responder 200; respondio ${partialResponse.statusCode}.`
    );
    assert(
      partialRefundCount === 1,
      `Reembolso parcial debia crear 1 PaymentRefund; creo ${partialRefundCount}.`
    );
    assert(
      partialRefund?.requestedBy === admin.id,
      "Reembolso parcial no registro requestedBy del administrador."
    );
    assert(
      partialRefund?.reason === "partial valid refund",
      "Reembolso parcial no registro el motivo esperado."
    );
    assert(
      partialOrder?.status === "partially_refunded",
      `Orden parcial debia quedar partially_refunded; quedo ${partialOrder?.status}.`
    );
    results.partialValid = {
      statusCode: partialResponse.statusCode,
      refundCount: partialRefundCount,
      orderStatus: partialOrder.status,
    };

    const fullPayment = await createPaidPayment({
      admin,
      client,
      plan,
      reference: `full-${suffix}`,
      orderIds,
      paymentIds,
    });
    const fullResponse = await callRefund({
      admin,
      paymentId: fullPayment.id,
      body: {
        reason: "full valid refund",
      },
    });
    const fullPaymentAfter = await Payment.findByPk(fullPayment.id);
    const fullOrder = await Order.findByPk(fullPayment.orderId);
    const fullRefundCount = await PaymentRefund.count({
      where: { paymentId: fullPayment.id },
    });

    assert(
      fullResponse.statusCode === 200,
      `Reembolso completo debia responder 200; respondio ${fullResponse.statusCode}.`
    );
    assert(
      fullRefundCount === 1,
      `Reembolso completo debia crear 1 PaymentRefund; creo ${fullRefundCount}.`
    );
    assert(
      fullPaymentAfter?.status === "refunded",
      `Pago completo debia quedar refunded; quedo ${fullPaymentAfter?.status}.`
    );
    assert(
      fullOrder?.status === "refunded",
      `Orden completa debia quedar refunded; quedo ${fullOrder?.status}.`
    );
    results.fullValid = {
      statusCode: fullResponse.statusCode,
      refundCount: fullRefundCount,
      paymentStatus: fullPaymentAfter.status,
      orderStatus: fullOrder.status,
    };

    const overPayment = await createPaidPayment({
      admin,
      client,
      plan,
      reference: `over-${suffix}`,
      orderIds,
      paymentIds,
    });
    const overResponse = await callRefund({
      admin,
      paymentId: overPayment.id,
      body: {
        amount: "150.00",
        reason: "too much refund",
      },
    });
    const overRefundCount = await PaymentRefund.count({
      where: { paymentId: overPayment.id },
    });

    assert(
      overResponse.statusCode === 409,
      `Monto mayor al disponible debia responder 409; respondio ${overResponse.statusCode}.`
    );
    assert(
      overRefundCount === 0,
      `Monto mayor al disponible no debia crear reembolsos; creo ${overRefundCount}.`
    );
    results.amountGreaterThanAvailable = {
      statusCode: overResponse.statusCode,
      refundCount: overRefundCount,
      error: overResponse.body?.error,
    };

    const remainingPayment = await createPaidPayment({
      admin,
      client,
      plan,
      reference: `remaining-${suffix}`,
      orderIds,
      paymentIds,
    });
    const firstRemainingResponse = await callRefund({
      admin,
      paymentId: remainingPayment.id,
      body: {
        amount: "70.00",
        reason: "first partial refund",
      },
    });
    const secondRemainingResponse = await callRefund({
      admin,
      paymentId: remainingPayment.id,
      body: {
        amount: "40.00",
        reason: "exceeds remaining refund",
      },
    });
    const remainingRefundCount = await PaymentRefund.count({
      where: { paymentId: remainingPayment.id },
    });

    assert(
      firstRemainingResponse.statusCode === 200,
      `Primer reembolso parcial debia responder 200; respondio ${firstRemainingResponse.statusCode}.`
    );
    assert(
      secondRemainingResponse.statusCode === 409,
      `Segundo reembolso excedente debia responder 409; respondio ${secondRemainingResponse.statusCode}.`
    );
    assert(
      remainingRefundCount === 1,
      `Segundo reembolso excedente no debia crear otro refund; total=${remainingRefundCount}.`
    );
    results.secondRefundExceedsRemaining = {
      firstStatusCode: firstRemainingResponse.statusCode,
      secondStatusCode: secondRemainingResponse.statusCode,
      refundCount: remainingRefundCount,
      error: secondRemainingResponse.body?.error,
    };

    const pendingPayment = await createPendingPayment({
      admin,
      client,
      plan,
      reference: `pending-${suffix}`,
      orderIds,
      paymentIds,
    });
    const pendingResponse = await callRefund({
      admin,
      paymentId: pendingPayment.id,
      body: {
        amount: "10.00",
        reason: "pending payment refund",
      },
    });
    const pendingRefundCount = await PaymentRefund.count({
      where: { paymentId: pendingPayment.id },
    });

    assert(
      pendingResponse.statusCode === 409,
      `Pago no paid debia responder 409; respondio ${pendingResponse.statusCode}.`
    );
    assert(
      pendingRefundCount === 0,
      `Pago no paid no debia crear refunds; creo ${pendingRefundCount}.`
    );
    results.nonPaidPayment = {
      statusCode: pendingResponse.statusCode,
      refundCount: pendingRefundCount,
      error: pendingResponse.body?.error,
    };

    console.log("Verificacion OK: controlador de reembolsos usa processRefund.");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      emails: [adminEmail, clientEmail],
      planSlug,
      paymentIds,
      orderIds,
    });
    await sequelize.close();
  }
}

await main();
