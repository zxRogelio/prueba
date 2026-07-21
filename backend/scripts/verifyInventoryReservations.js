import { createHmac } from "node:crypto";
import { Op } from "sequelize";
import { WebhookSignatureValidator } from "mercadopago";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  InventoryMovement,
  InventoryReservation,
  Order,
  OrderItem,
  Payment,
  PaymentRefund,
  PaymentRefundItem,
  PaymentWebhookEvent,
  Product,
  Receipt,
  User,
} from "../models/index.js";
import {
  createMercadoPagoCheckout,
  processMercadoPagoWebhook,
} from "../services/mercadoPagoCheckoutService.js";
import { expireInventoryReservations } from "../services/inventoryReservationService.js";
import { processRefund } from "../services/paymentService.js";

process.env.MERCADOPAGO_ACCESS_TOKEN ||= "TEST-access-token";
process.env.MERCADOPAGO_WEBHOOK_SECRET ||= "TEST-webhook-secret";
process.env.MERCADOPAGO_USE_SANDBOX ||= "true";
process.env.FRONTEND_URL ||= "http://localhost:5173";
process.env.BACKEND_PUBLIC_URL ||= "https://backend.example.test";
process.env.INVENTORY_RESERVATION_TTL_MINUTES ||= "30";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectServiceError(callback, expectedStatusCode, label) {
  try {
    await callback();
  } catch (error) {
    assert(
      error.statusCode === expectedStatusCode,
      `${label}: se esperaba ${expectedStatusCode}, llego ${error.statusCode || "sin status"}.`
    );
    return error;
  }

  throw new Error(`${label}: se esperaba error ${expectedStatusCode}.`);
}

function createMockMercadoPagoApi() {
  const providerPayments = new Map();
  const preferenceCalls = [];
  const refundCalls = [];

  return {
    providerPayments,
    preferenceCalls,
    refundCalls,
    async createPreference({ body, idempotencyKey }) {
      preferenceCalls.push({ body, idempotencyKey });

      return {
        id: `pref-${idempotencyKey}`,
        init_point: `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${idempotencyKey}`,
        sandbox_init_point: `https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=${idempotencyKey}`,
      };
    },
    async getPayment({ id }) {
      const payment = providerPayments.get(String(id));

      if (!payment) {
        const error = new Error(`Provider payment ${id} not found`);
        error.statusCode = 404;
        throw error;
      }

      return payment;
    },
    async refundPayment({ providerPaymentId, amount, fullRefund, idempotencyKey }) {
      refundCalls.push({ providerPaymentId, amount, fullRefund, idempotencyKey });

      return {
        id: `refund-${idempotencyKey}`,
        payment_id: String(providerPaymentId),
        status: "approved",
        amount: amount == null ? "100.00" : amount,
        date_created: new Date().toISOString(),
      };
    },
    validateSignature({ xSignature, xRequestId, dataId, secret }) {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret,
      });
    },
  };
}

function signWebhook({ dataId, requestId }) {
  const ts = String(Date.now());
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return `ts=${ts},v1=${hash}`;
}

async function deliverWebhook({ mockApi, providerPaymentId, requestId }) {
  return processMercadoPagoWebhook({
    headers: {
      "x-signature": signWebhook({
        dataId: providerPaymentId,
        requestId,
      }),
      "x-request-id": requestId,
    },
    query: {
      "data.id": providerPaymentId,
      type: "payment",
    },
    body: {
      type: "payment",
      data: {
        id: providerPaymentId,
      },
    },
    mercadoPagoApi: mockApi,
  });
}

function buildProviderPayment({
  id,
  status,
  amount,
  orderId,
  paymentId,
  preferenceId,
}) {
  return {
    id,
    status,
    status_detail: status === "approved" ? "accredited" : status,
    transaction_amount: amount,
    currency_id: "MXN",
    external_reference: orderId,
    preference_id: preferenceId,
    payment_method_id: "account_money",
    payment_type_id: "account_money",
    metadata: {
      order_id: orderId,
      payment_id: paymentId,
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

async function createProductFixture({ suffix, index, stock, price = "100.00" }) {
  const numericSuffix = Math.floor(100000000 + Math.random() * 800000000);
  const category = await Category.create({
    id_categoria: numericSuffix,
    name: `Verify Reservation Category ${suffix}-${index}`,
    active: true,
  });
  const brand = await Brand.create({
    id_marca: numericSuffix,
    name: `Verify Reservation Brand ${suffix}-${index}`,
    active: true,
    categoryId: category.id_categoria,
  });
  const product = await Product.create({
    id_producto: numericSuffix,
    name: `Verify Reservation Product ${suffix}-${index}`,
    brandId: brand.id_marca,
    categoryId: category.id_categoria,
    price,
    stock,
    status: "Activo",
    productType: "Ropa",
    description: "Temporary inventory reservation verification product.",
  });

  return { category, brand, product };
}

async function getPaymentByIdempotencyKey(idempotencyKey) {
  const payment = await Payment.findOne({ where: { idempotencyKey } });

  assert(payment, `No se encontro pago con idempotencyKey ${idempotencyKey}.`);

  return payment;
}

async function cleanup({ idempotencyKeys, webhookPrefix, emails, catalogs }) {
  const payments = await Payment.findAll({
    where: {
      idempotencyKey: {
        [Op.in]: idempotencyKeys,
      },
    },
    attributes: ["id", "orderId"],
  });
  const paymentIds = payments.map((payment) => payment.id);
  const orderIds = [
    ...new Set(payments.map((payment) => payment.orderId).filter(Boolean)),
  ];
  const orderItems = orderIds.length
    ? await OrderItem.findAll({
        where: { orderId: { [Op.in]: orderIds } },
        attributes: ["id"],
      })
    : [];
  const orderItemIds = orderItems.map((item) => item.id);
  const refunds = paymentIds.length
    ? await PaymentRefund.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
      })
    : [];
  const refundIds = refunds.map((refund) => refund.id);

  await sequelize.transaction(async (transaction) => {
    if (refundIds.length > 0) {
      await PaymentRefundItem.destroy({
        where: { refundId: { [Op.in]: refundIds } },
        transaction,
      });
    }

    if (paymentIds.length > 0) {
      await PaymentRefund.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderItemIds.length > 0) {
      await InventoryMovement.destroy({
        where: { orderItemId: { [Op.in]: orderItemIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      await InventoryReservation.destroy({
        where: { orderId: { [Op.in]: orderIds } },
        transaction,
      });
    }

    await PaymentWebhookEvent.destroy({
      where: {
        providerEventId: {
          [Op.like]: `${webhookPrefix}%`,
        },
      },
      transaction,
    });

    if (paymentIds.length > 0) {
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

    for (const catalog of catalogs) {
      if (catalog.product?.id) {
        await Product.destroy({ where: { id: catalog.product.id }, transaction });
      }
      if (catalog.brand?.id) {
        await Brand.destroy({ where: { id: catalog.brand.id }, transaction });
      }
      if (catalog.category?.id) {
        await Category.destroy({ where: { id: catalog.category.id }, transaction });
      }
    }

    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const webhookPrefix = `verify-reservation-${suffix}`;
  const idempotencyKeys = [];
  const emails = [
    `verify-reservation-admin-${suffix}@example.com`,
    `verify-reservation-client-a-${suffix}@example.com`,
    `verify-reservation-client-b-${suffix}@example.com`,
  ];
  const catalogs = [];
  const mockApi = createMockMercadoPagoApi();

  try {
    const admin = await createUser(emails[0], "administrador");
    const clientA = await createUser(emails[1], "cliente");
    const clientB = await createUser(emails[2], "cliente");
    const lastUnitCatalog = await createProductFixture({
      suffix,
      index: "last-unit",
      stock: 1,
      price: "100.00",
    });
    const rejectedCatalog = await createProductFixture({
      suffix,
      index: "rejected",
      stock: 1,
      price: "80.00",
    });
    catalogs.push(lastUnitCatalog, rejectedCatalog);

    const firstKey = `reservation-first-${suffix}`;
    const blockedKey = `reservation-blocked-${suffix}`;
    const afterExpiryKey = `reservation-after-expiry-${suffix}`;
    const rejectedKey = `reservation-rejected-${suffix}`;
    idempotencyKeys.push(firstKey, blockedKey, afterExpiryKey, rejectedKey);

    const firstCheckout = await createMercadoPagoCheckout({
      userId: clientA.id,
      payload: {
        idempotencyKey: firstKey,
        items: [
          {
            productId: lastUnitCatalog.product.id_producto,
            quantity: 1,
          },
        ],
      },
      mercadoPagoApi: mockApi,
    });
    const firstPayment = await getPaymentByIdempotencyKey(firstKey);
    const firstReservation = await InventoryReservation.findOne({
      where: {
        orderId: firstPayment.orderId,
        productId: lastUnitCatalog.product.id_producto,
      },
    });

    assert(firstCheckout.checkoutUrl, "No se creo URL de checkout.");
    assert(firstReservation?.status === "active", "La reserva inicial no quedo active.");
    await lastUnitCatalog.product.reload();
    assert(Number(lastUnitCatalog.product.stock) === 1, "La reserva desconto inventario antes del pago.");

    await expectServiceError(
      () =>
        createMercadoPagoCheckout({
          userId: clientB.id,
          payload: {
            idempotencyKey: blockedKey,
            items: [
              {
                productId: lastUnitCatalog.product.id_producto,
                quantity: 1,
              },
            ],
          },
          mercadoPagoApi: mockApi,
        }),
      409,
      "Ultima unidad reservada por otro cliente"
    );

    await firstReservation.update({
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    const expired = await expireInventoryReservations();
    await firstReservation.reload();
    assert(expired.expiredCount >= 1, "No se expiro la reserva vencida.");
    assert(firstReservation.status === "expired", "La reserva vencida no quedo expired.");

    const afterExpiryCheckout = await createMercadoPagoCheckout({
      userId: clientB.id,
      payload: {
        idempotencyKey: afterExpiryKey,
        items: [
          {
            productId: lastUnitCatalog.product.id_producto,
            quantity: 1,
          },
        ],
      },
      mercadoPagoApi: mockApi,
    });
    const approvedPayment = await getPaymentByIdempotencyKey(afterExpiryKey);
    const approvedProviderPaymentId = `${webhookPrefix}-approved`;
    mockApi.providerPayments.set(
      approvedProviderPaymentId,
      buildProviderPayment({
        id: approvedProviderPaymentId,
        status: "approved",
        amount: "100.00",
        orderId: afterExpiryCheckout.orderId,
        paymentId: approvedPayment.id,
        preferenceId: afterExpiryCheckout.preferenceId,
      })
    );

    const approvedWebhook = await deliverWebhook({
      mockApi,
      providerPaymentId: approvedProviderPaymentId,
      requestId: `${webhookPrefix}-approved-request`,
    });

    assert(approvedWebhook.ok, "El webhook aprobado fallo.");
    await approvedPayment.reload();
    await lastUnitCatalog.product.reload();
    assert(approvedPayment.status === "paid", "El pago aprobado no quedo paid.");
    const approvedPaymentStatusBeforeRefund = approvedPayment.status;
    assert(Number(lastUnitCatalog.product.stock) === 0, "El pago aprobado no desconto inventario.");
    assert(
      await InventoryReservation.count({
        where: {
          orderId: approvedPayment.orderId,
          productId: lastUnitCatalog.product.id_producto,
          status: "consumed",
        },
      }) === 1,
      "La reserva aprobada no quedo consumed."
    );
    assert(
      await InventoryMovement.count({
        where: { movementType: "sale" },
        include: [
          {
            model: OrderItem,
            as: "orderItem",
            where: { orderId: approvedPayment.orderId },
            required: true,
          },
        ],
      }) === 1,
      "El pago aprobado no registro venta."
    );

    const duplicateWebhook = await deliverWebhook({
      mockApi,
      providerPaymentId: approvedProviderPaymentId,
      requestId: `${webhookPrefix}-approved-request`,
    });

    assert(duplicateWebhook.duplicate, "El webhook duplicado no fue detectado.");
    await lastUnitCatalog.product.reload();
    assert(Number(lastUnitCatalog.product.stock) === 0, "El webhook duplicado desconto inventario otra vez.");
    assert(
      await InventoryMovement.count({
        where: { movementType: "sale" },
        include: [
          {
            model: OrderItem,
            as: "orderItem",
            where: { orderId: approvedPayment.orderId },
            required: true,
          },
        ],
      }) === 1,
      "El webhook duplicado creo otra venta."
    );

    const rejectedCheckout = await createMercadoPagoCheckout({
      userId: clientA.id,
      payload: {
        idempotencyKey: rejectedKey,
        items: [
          {
            productId: rejectedCatalog.product.id_producto,
            quantity: 1,
          },
        ],
      },
      mercadoPagoApi: mockApi,
    });
    const rejectedPayment = await getPaymentByIdempotencyKey(rejectedKey);
    const rejectedProviderPaymentId = `${webhookPrefix}-rejected`;
    mockApi.providerPayments.set(
      rejectedProviderPaymentId,
      buildProviderPayment({
        id: rejectedProviderPaymentId,
        status: "rejected",
        amount: "80.00",
        orderId: rejectedCheckout.orderId,
        paymentId: rejectedPayment.id,
        preferenceId: rejectedCheckout.preferenceId,
      })
    );

    await deliverWebhook({
      mockApi,
      providerPaymentId: rejectedProviderPaymentId,
      requestId: `${webhookPrefix}-rejected-request`,
    });
    await rejectedPayment.reload();
    await rejectedCatalog.product.reload();
    assert(rejectedPayment.status === "failed", "El pago rechazado no quedo failed.");
    assert(Number(rejectedCatalog.product.stock) === 1, "El pago rechazado modifico inventario.");
    assert(
      await InventoryReservation.count({
        where: {
          orderId: rejectedPayment.orderId,
          status: "released",
        },
      }) === 1,
      "El pago rechazado no libero la reserva."
    );

    const refund = await processRefund({
      paymentId: approvedPayment.id,
      idempotencyKey: `reservation-refund-${suffix}`,
      requestedBy: admin.id,
      reason: "Verificacion de devolucion de inventario reservado",
      status: "approved",
      mercadoPagoRefundApi: mockApi,
    });

    await approvedPayment.reload();
    await lastUnitCatalog.product.reload();
    assert(refund.status === "approved", "El reembolso no quedo approved.");
    assert(approvedPayment.status === "refunded", "El pago reembolsado no quedo refunded.");
    assert(Number(lastUnitCatalog.product.stock) === 1, "El reembolso no devolvio inventario.");
    assert(
      await InventoryMovement.count({
        where: { movementType: "return" },
        include: [
          {
            model: OrderItem,
            as: "orderItem",
            where: { orderId: approvedPayment.orderId },
            required: true,
          },
        ],
      }) === 1,
      "El reembolso no creo movimiento return."
    );

    console.log("Verificacion OK: reservas de inventario.");
    console.log({
      lastUnitSecondCheckoutStatusCode: 409,
      expiredReservationReleased: true,
      approvedPaymentStatus: approvedPaymentStatusBeforeRefund,
      duplicateWebhookDidNotDuplicateSale: true,
      rejectedPaymentStatus: rejectedPayment.status,
      rejectedReservationReleased: true,
      refundReturnedInventory: true,
      cleanedUp: true,
    });
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    await cleanup({
      idempotencyKeys,
      webhookPrefix,
      emails,
      catalogs,
    });
    await sequelize.close();
  }
}

await main();
