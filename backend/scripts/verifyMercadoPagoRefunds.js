import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  InventoryMovement,
  Order,
  OrderDiscount,
  OrderItem,
  Payment,
  PaymentRefund,
  PaymentRefundItem,
  Product,
  Receipt,
  User,
} from "../models/index.js";
import { createOrder } from "../services/orderService.js";
import {
  createPaymentAttempt,
  processRefund,
} from "../services/paymentService.js";
import { createReceipt } from "../services/receiptService.js";

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

function createMockMercadoPagoRefundApi() {
  const calls = [];
  const responses = new Map();

  return {
    calls,
    responses,
    async refundPayment(args) {
      calls.push(args);

      const configured = responses.get(args.idempotencyKey);

      if (configured instanceof Error) throw configured;
      if (configured) return configured;

      return {
        id: `mp-refund-${args.idempotencyKey}`,
        payment_id: String(args.providerPaymentId),
        status: "approved",
        amount: args.amount == null ? "100.00" : args.amount,
        date_created: new Date().toISOString(),
      };
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

async function createProductCatalog({
  suffix,
  index,
  stock = 10,
  price = "100.00",
}) {
  const baseId = Number(String(Date.now()).slice(-7)) + index * 1000;
  const category = await Category.create({
    id_categoria: baseId,
    name: `Verify MP Refund Category ${suffix}-${index}`,
    active: true,
  });
  const brand = await Brand.create({
    id_marca: baseId,
    name: `Verify MP Refund Brand ${suffix}-${index}`,
    categoryId: category.id_categoria,
    active: true,
  });
  const product = await Product.create({
    id_producto: baseId,
    name: `Verify MP Refund Product ${suffix}-${index}`,
    brandId: brand.id_marca,
    categoryId: category.id_categoria,
    price,
    stock,
    status: "Activo",
    productType: "Ropa",
    description: "Temporary Mercado Pago refund verification product.",
  });

  return { category, brand, product };
}

async function createPaidMercadoPagoProductOrder({
  admin,
  client,
  product,
  quantity,
  reference,
  withProviderPaymentId = true,
  paymentIds,
  orderIds,
}) {
  const order = await createOrder({
    userId: client.id,
    channel: "online",
    status: "pending_payment",
    createdBy: admin.id,
    items: [
      {
        itemType: "product",
        productId: product.id_producto,
        quantity,
      },
    ],
  });
  orderIds.push(order.id);

  const payment = await createPaymentAttempt({
    orderId: order.id,
    method: "online_checkout",
    source: "online_checkout",
    provider: "mercadopago_checkout",
    status: "paid",
    providerPaymentId: withProviderPaymentId
      ? `mp-payment-${reference}`
      : null,
    providerStatus: "approved",
    externalReference: order.id,
    idempotencyKey: `mp-payment-key-${reference}`,
    metadata: {
      source: "verify_mercadopago_refunds",
      reference,
    },
    createdBy: admin.id,
  });
  paymentIds.push(payment.id);

  await createReceipt({
    orderId: order.id,
    paymentId: payment.id,
    createdBy: admin.id,
  });

  const orderItem = await OrderItem.findOne({
    where: {
      orderId: order.id,
      itemType: "product",
    },
  });

  return { order, payment, orderItem };
}

async function cleanup({
  emails,
  productIds,
  brandBusinessIds,
  categoryBusinessIds,
  paymentIds,
  orderIds,
}) {
  await sequelize.transaction(async (transaction) => {
    if (paymentIds.length > 0) {
      const refunds = await PaymentRefund.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
        transaction,
      });
      const refundIds = refunds.map((refund) => refund.id);

      if (refundIds.length > 0) {
        await PaymentRefundItem.destroy({
          where: { refundId: { [Op.in]: refundIds } },
          transaction,
        });
      }

      await PaymentRefund.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Payment.destroy({
        where: { id: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (orderIds.length > 0) {
      const orderItems = await OrderItem.findAll({
        where: { orderId: { [Op.in]: orderIds } },
        attributes: ["id"],
        transaction,
      });
      const orderItemIds = orderItems.map((item) => item.id);

      if (orderItemIds.length > 0) {
        await InventoryMovement.destroy({
          where: { orderItemId: { [Op.in]: orderItemIds } },
          transaction,
        });
      }

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

    if (productIds.length > 0) {
      await Product.destroy({
        where: { id_producto: { [Op.in]: productIds } },
        transaction,
      });
    }

    if (brandBusinessIds.length > 0) {
      await Brand.destroy({
        where: { id_marca: { [Op.in]: brandBusinessIds } },
        transaction,
      });
    }

    if (categoryBusinessIds.length > 0) {
      await Category.destroy({
        where: { id_categoria: { [Op.in]: categoryBusinessIds } },
        transaction,
      });
    }

    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `verify-mp-refund-admin-${suffix}@example.com`;
  const clientEmail = `verify-mp-refund-client-${suffix}@example.com`;
  const productIds = [];
  const brandBusinessIds = [];
  const categoryBusinessIds = [];
  const paymentIds = [];
  const orderIds = [];
  const results = {};

  try {
    const admin = await createUser(adminEmail, "administrador");
    const client = await createUser(clientEmail, "cliente");
    const mockApi = createMockMercadoPagoRefundApi();

    const fullCatalog = await createProductCatalog({
      suffix,
      index: 1,
      stock: 10,
      price: "100.00",
    });
    productIds.push(fullCatalog.product.id_producto);
    brandBusinessIds.push(fullCatalog.brand.id_marca);
    categoryBusinessIds.push(fullCatalog.category.id_categoria);
    const fullOrder = await createPaidMercadoPagoProductOrder({
      admin,
      client,
      product: fullCatalog.product,
      quantity: 1,
      reference: `full-${suffix}`,
      paymentIds,
      orderIds,
    });
    const fullKey = `mp-refund-full-${suffix}`;
    const fullRefund = await processRefund({
      paymentId: fullOrder.payment.id,
      idempotencyKey: fullKey,
      requestedBy: admin.id,
      reason: "Full Mercado Pago refund verification",
      mercadoPagoRefundApi: mockApi,
    });
    await fullOrder.payment.reload();
    await fullOrder.order.reload();
    await fullCatalog.product.reload();
    assert(fullRefund.status === "approved", "Reembolso total no quedo approved.");
    assert(fullOrder.payment.status === "refunded", "Pago total no quedo refunded.");
    assert(fullOrder.order.status === "refunded", "Orden total no quedo refunded.");
    assert(Number(fullCatalog.product.stock) === 10, "Reembolso total no devolvio stock.");
    assert(
      mockApi.calls.at(-1).fullRefund === true,
      "Reembolso total no llamo total refund."
    );
    results.fullRefund = {
      refundId: fullRefund.id,
      providerRefundId: fullRefund.providerRefundId,
      status: fullRefund.status,
    };

    const partialCatalog = await createProductCatalog({
      suffix,
      index: 2,
      stock: 10,
      price: "50.00",
    });
    productIds.push(partialCatalog.product.id_producto);
    brandBusinessIds.push(partialCatalog.brand.id_marca);
    categoryBusinessIds.push(partialCatalog.category.id_categoria);
    const partialOrder = await createPaidMercadoPagoProductOrder({
      admin,
      client,
      product: partialCatalog.product,
      quantity: 2,
      reference: `partial-${suffix}`,
      paymentIds,
      orderIds,
    });
    const partialKey = `mp-refund-partial-${suffix}`;
    const partialRefund = await processRefund({
      paymentId: partialOrder.payment.id,
      amount: "50.00",
      idempotencyKey: partialKey,
      requestedBy: admin.id,
      reason: "Partial Mercado Pago refund verification",
      items: [
        {
          orderItemId: partialOrder.orderItem.id,
          quantity: 1,
          amount: "50.00",
          restock: true,
        },
      ],
      mercadoPagoRefundApi: mockApi,
    });
    await partialOrder.payment.reload();
    await partialOrder.order.reload();
    await partialCatalog.product.reload();
    assert(partialRefund.status === "approved", "Reembolso parcial no quedo approved.");
    assert(partialOrder.payment.status === "paid", "Pago parcial no debe quedar refunded.");
    assert(
      partialOrder.order.status === "partially_refunded",
      "Orden parcial no quedo partially_refunded."
    );
    assert(Number(partialCatalog.product.stock) === 9, "Reembolso parcial no devolvio 1 unidad.");
    assert(
      mockApi.calls.at(-1).fullRefund === false &&
        Number(mockApi.calls.at(-1).amount) === 50,
      "Reembolso parcial no envio monto a Mercado Pago."
    );
    results.partialRefund = {
      refundId: partialRefund.id,
      providerRefundId: partialRefund.providerRefundId,
      status: partialRefund.status,
    };

    const rejectedCatalog = await createProductCatalog({
      suffix,
      index: 3,
      stock: 10,
      price: "80.00",
    });
    productIds.push(rejectedCatalog.product.id_producto);
    brandBusinessIds.push(rejectedCatalog.brand.id_marca);
    categoryBusinessIds.push(rejectedCatalog.category.id_categoria);
    const rejectedOrder = await createPaidMercadoPagoProductOrder({
      admin,
      client,
      product: rejectedCatalog.product,
      quantity: 1,
      reference: `rejected-${suffix}`,
      paymentIds,
      orderIds,
    });
    const rejectedKey = `mp-refund-rejected-${suffix}`;
    mockApi.responses.set(rejectedKey, {
      id: `mp-refund-rejected-${suffix}`,
      payment_id: rejectedOrder.payment.providerPaymentId,
      status: "rejected",
      amount: "80.00",
      date_created: new Date().toISOString(),
    });
    const rejectedRefund = await processRefund({
      paymentId: rejectedOrder.payment.id,
      idempotencyKey: rejectedKey,
      requestedBy: admin.id,
      reason: "Rejected Mercado Pago refund verification",
      mercadoPagoRefundApi: mockApi,
    });
    await rejectedOrder.payment.reload();
    await rejectedOrder.order.reload();
    await rejectedCatalog.product.reload();
    assert(rejectedRefund.status === "failed", "Reembolso rechazado no quedo failed.");
    assert(rejectedOrder.payment.status === "paid", "Pago rechazado no debe cambiar.");
    assert(rejectedOrder.order.status === "paid", "Orden rechazada no debe cambiar.");
    assert(Number(rejectedCatalog.product.stock) === 9, "Reembolso rechazado devolvio inventario.");
    results.rejectedRefund = {
      refundId: rejectedRefund.id,
      status: rejectedRefund.status,
    };

    const missingProviderCatalog = await createProductCatalog({
      suffix,
      index: 4,
      stock: 10,
      price: "60.00",
    });
    productIds.push(missingProviderCatalog.product.id_producto);
    brandBusinessIds.push(missingProviderCatalog.brand.id_marca);
    categoryBusinessIds.push(missingProviderCatalog.category.id_categoria);
    const missingProviderOrder = await createPaidMercadoPagoProductOrder({
      admin,
      client,
      product: missingProviderCatalog.product,
      quantity: 1,
      reference: `missing-provider-${suffix}`,
      withProviderPaymentId: false,
      paymentIds,
      orderIds,
    });
    await expectServiceError(
      () =>
        processRefund({
          paymentId: missingProviderOrder.payment.id,
          idempotencyKey: `mp-refund-missing-provider-${suffix}`,
          requestedBy: admin.id,
          reason: "Missing provider payment id",
          mercadoPagoRefundApi: mockApi,
        }),
      409,
      "Pago Mercado Pago sin providerPaymentId"
    );
    assert(
      (await PaymentRefund.count({
        where: { paymentId: missingProviderOrder.payment.id },
      })) === 0,
      "Pago sin providerPaymentId no debe crear PaymentRefund."
    );
    results.missingProviderPaymentId = {
      statusCode: 409,
      refundCount: 0,
    };

    const retryCallsBefore = mockApi.calls.length;
    const retryRefund = await processRefund({
      paymentId: fullOrder.payment.id,
      idempotencyKey: fullKey,
      requestedBy: admin.id,
      reason: "Full Mercado Pago refund verification",
      mercadoPagoRefundApi: mockApi,
    });
    const fullReturnCount = await InventoryMovement.count({
      where: {
        orderItemId: fullOrder.orderItem.id,
        movementType: "return",
      },
    });
    assert(retryRefund.id === fullRefund.id, "Retry no devolvio el mismo refund.");
    assert(
      mockApi.calls.length === retryCallsBefore,
      "Retry aprobado no debe llamar otra vez a Mercado Pago."
    );
    assert(fullReturnCount === 1, "Retry duplico el movimiento return.");
    results.retrySameKey = {
      sameRefundId: true,
      providerCallsUnchanged: true,
      returnMovements: fullReturnCount,
    };
    results.duplicateResponse = {
      approvedRefundCount: await PaymentRefund.count({
        where: { paymentId: fullOrder.payment.id, status: "approved" },
      }),
      sideEffectsDuplicated: false,
    };

    console.log("Verificacion OK: reembolsos reales Mercado Pago con SDK mock.");
    console.log(results);
  } catch (error) {
    console.error("Verificacion fallida:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup({
        emails: [adminEmail, clientEmail],
        productIds,
        brandBusinessIds,
        categoryBusinessIds,
        paymentIds,
        orderIds,
      });
    } catch (cleanupError) {
      console.error("Error limpiando datos de verificacion:", cleanupError.message);
      process.exitCode = 1;
    }

    await sequelize.close();
  }
}

main();
