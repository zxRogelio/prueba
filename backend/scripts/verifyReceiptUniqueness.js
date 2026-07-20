import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Order, Payment, Receipt, User } from "../models/index.js";
import {
  cancelReceiptsForFullRefund,
  createReceipt,
} from "../services/receiptService.js";

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

async function cleanup({ emails, paymentId, orderId }) {
  await sequelize.transaction(async (transaction) => {
    if (paymentId) {
      await Receipt.destroy({ where: { paymentId }, transaction });
      await Payment.destroy({ where: { id: paymentId }, transaction });
    }

    if (orderId) {
      await Order.destroy({ where: { id: orderId }, transaction });
    }

    await User.destroy({
      where: {
        email: {
          [Op.in]: emails,
        },
      },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `verify-receipt-unique-admin-${suffix}@example.com`;
  const clientEmail = `verify-receipt-unique-client-${suffix}@example.com`;
  let paymentId = null;
  let orderId = null;

  try {
    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const order = await Order.create({
      userId: client.id,
      orderNumber: `VRU-${String(Date.now()).slice(-10)}`,
      status: "paid",
      channel: "online",
      subtotal: "100.00",
      discountTotal: "0.00",
      taxTotal: "0.00",
      total: "100.00",
      currency: "MXN",
      paidAt: new Date(),
      createdBy: admin.id,
      metadata: {
        verification: "receipt_uniqueness",
      },
    });
    const payment = await Payment.create({
      userId: client.id,
      orderId: order.id,
      paymentType: "membership",
      amount: "100.00",
      method: "online_checkout",
      source: "online_checkout",
      provider: "mercadopago_checkout",
      providerPreferenceId: `verify-pref-${suffix}`,
      providerPaymentId: `verify-payment-${suffix}`,
      externalReference: order.id,
      status: "paid",
      currency: "MXN",
      paidAt: new Date(),
      approvedAt: new Date(),
      createdBy: admin.id,
      metadata: {
        verification: "receipt_uniqueness",
      },
    });

    paymentId = payment.id;
    orderId = order.id;

    const [firstReceipt, secondReceipt] = await Promise.all([
      createReceipt({
        paymentId: payment.id,
        orderId: order.id,
        createdBy: admin.id,
        metadata: { attempt: "concurrent-a", idempotencyKey: randomUUID() },
      }),
      createReceipt({
        paymentId: payment.id,
        orderId: order.id,
        createdBy: admin.id,
        metadata: { attempt: "concurrent-b", idempotencyKey: randomUUID() },
      }),
    ]);
    const receiptCountAfterConcurrency = await Receipt.count({
      where: { paymentId: payment.id },
    });

    assert(
      firstReceipt.id === secondReceipt.id,
      "Las llamadas concurrentes devolvieron recibos diferentes."
    );
    assert(
      receiptCountAfterConcurrency === 1,
      `La concurrencia creo ${receiptCountAfterConcurrency} recibos.`
    );

    const cancelledCount = await cancelReceiptsForFullRefund({
      orderId: order.id,
      paymentId: payment.id,
      refundId: `verify-refund-${suffix}`,
      cancelledBy: admin.id,
      reason: "Verificacion de recibo unico",
    });
    const cancelledReceipt = await Receipt.findOne({
      where: { paymentId: payment.id },
    });

    assert(cancelledCount === 1, `Se esperaba cancelar 1 recibo; ${cancelledCount}.`);
    assert(
      cancelledReceipt?.status === "cancelled",
      `El recibo debia quedar cancelled; quedo ${cancelledReceipt?.status}.`
    );

    await payment.update({
      status: "refunded",
      refundedAt: new Date(),
    });

    const receiptAfterCancellation = await createReceipt({
      paymentId: payment.id,
      orderId: order.id,
      createdBy: admin.id,
      metadata: { attempt: "after-cancelled" },
    });
    const finalReceiptCount = await Receipt.count({
      where: { paymentId: payment.id },
    });

    assert(
      receiptAfterCancellation.id === cancelledReceipt.id,
      "createReceipt creo o devolvio otro recibo despues de cancelarlo."
    );
    assert(
      finalReceiptCount === 1,
      `Despues de cancelar quedaron ${finalReceiptCount} recibos.`
    );

    console.log("Verificacion OK: recibo unico por pago.");
    console.log({
      paymentId: payment.id,
      concurrentReceiptId: firstReceipt.id,
      receiptCountAfterConcurrency,
      cancelledReceiptStatus: cancelledReceipt.status,
      receiptIdAfterCancellation: receiptAfterCancellation.id,
      finalReceiptCount,
      cleanedUp: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      emails: [adminEmail, clientEmail],
      paymentId,
      orderId,
    });
    await sequelize.close();
  }
}

await main();
