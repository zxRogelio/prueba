import { sequelize } from "../config/sequelize.js";
import {
  MembershipPlan,
  Payment,
  User,
} from "../models/index.js";
import { createOrder } from "../services/orderService.js";
import { registerManualPayment } from "../services/paymentService.js";

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
      `verify-single-paid-payment-admin-${suffix}@example.com`,
      "administrador",
      transaction
    );
    const client = await createUser(
      `verify-single-paid-payment-client-${suffix}@example.com`,
      "cliente",
      transaction
    );
    const plan = await MembershipPlan.create(
      {
        name: `Verify Single Paid Payment ${suffix}`,
        slug: `verify-single-paid-payment-${suffix}`,
        description: "Temporary verification plan; transaction is rolled back.",
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
      },
      { transaction }
    );
    const order = await createOrder({
      userId: client.id,
      channel: "reception",
      status: "pending_payment",
      createdBy: admin.id,
      items: [
        {
          itemType: "membership",
          membershipPlanId: plan.id,
          quantity: 1,
        },
      ],
      transaction,
    });
    const before = await Payment.count({
      where: {
        orderId: order.id,
        status: "paid",
      },
      transaction,
    });

    await registerManualPayment({
      orderId: order.id,
      method: "cash",
      provider: "none",
      reference: "first-test-payment",
      createdBy: admin.id,
      transaction,
    });

    const afterFirst = await Payment.count({
      where: {
        orderId: order.id,
        status: "paid",
      },
      transaction,
    });
    let secondPaymentError = null;

    try {
      await registerManualPayment({
        orderId: order.id,
        method: "cash",
        provider: "none",
        reference: "second-test-payment",
        createdBy: admin.id,
        transaction,
      });
    } catch (error) {
      secondPaymentError = error;
    }

    const afterSecond = await Payment.count({
      where: {
        orderId: order.id,
        status: "paid",
      },
      transaction,
    });

    if (before !== 0) {
      throw new Error(`Se esperaban 0 pagos paid iniciales; hay ${before}.`);
    }

    if (afterFirst !== 1) {
      throw new Error(
        `El primer pago debia dejar exactamente 1 pago paid; count=${afterFirst}.`
      );
    }

    if (!secondPaymentError || secondPaymentError.statusCode !== 409) {
      throw new Error(
        "El segundo pago debia rechazarse con statusCode 409."
      );
    }

    if (afterSecond !== afterFirst) {
      throw new Error(
        `El segundo pago creo pagos paid adicionales; before=${afterFirst}, after=${afterSecond}.`
      );
    }

    console.log("Verificacion OK: una orden no acepta dos pagos paid.");
    console.log({
      orderId: order.id,
      paidPaymentsBefore: before,
      paidPaymentsAfterFirstAttempt: afterFirst,
      paidPaymentsAfterSecondAttempt: afterSecond,
      secondAttemptStatusCode: secondPaymentError.statusCode,
      secondAttemptMessage: secondPaymentError.message,
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
