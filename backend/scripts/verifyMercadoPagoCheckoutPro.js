import { createHmac } from "node:crypto";
import { Op } from "sequelize";
import { WebhookSignatureValidator } from "mercadopago";
import { sequelize } from "../config/sequelize.js";
import {
  Brand,
  Category,
  InventoryMovement,
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  PaymentWebhookEvent,
  Product,
  Receipt,
  SubscriptionEvent,
  SubscriptionGroup,
  SubscriptionGroupMember,
  User,
  UserSubscription,
} from "../models/index.js";
import {
  createMercadoPagoCheckout,
  getOrderPaymentStatus,
  processMercadoPagoWebhook,
} from "../services/mercadoPagoCheckoutService.js";

process.env.MERCADOPAGO_ACCESS_TOKEN ||= "TEST-access-token";
process.env.MERCADOPAGO_WEBHOOK_SECRET ||= "TEST-webhook-secret";
process.env.MERCADOPAGO_USE_SANDBOX ||= "true";
process.env.FRONTEND_URL ||= "http://localhost:5173";
process.env.BACKEND_PUBLIC_URL ||= "https://backend.example.test";

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

function signWebhook({ dataId, requestId, secret = process.env.MERCADOPAGO_WEBHOOK_SECRET }) {
  const ts = String(Date.now());
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  return `ts=${ts},v1=${hash}`;
}

function createMockMercadoPagoApi() {
  const providerPayments = new Map();
  const preferenceCalls = [];

  return {
    providerPayments,
    preferenceCalls,
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
    validateSignature({ xSignature, xRequestId, dataId, secret }) {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret,
        toleranceSeconds: 300,
      });
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

async function createProductFixture(suffix) {
  const numericSuffix = Math.floor(100000000 + Math.random() * 800000000);
  const category = await Category.create({
    id_categoria: numericSuffix,
    name: `Verify MP Category ${suffix}`,
    active: true,
  });
  const brand = await Brand.create({
    id_marca: numericSuffix,
    name: `Verify MP Brand ${suffix}`,
    active: true,
    categoryId: category.id_categoria,
  });
  const product = await Product.create({
    id_producto: numericSuffix,
    name: `Verify MP Product ${suffix}`,
    brandId: brand.id_marca,
    categoryId: category.id_categoria,
    price: "200.00",
    stock: 5,
    status: "Activo",
    productType: "Ropa",
    description: "Temporary checkout verification product.",
  });

  return { category, brand, product };
}

async function createPlanFixture({ suffix, type }) {
  const isGroup = type === "group";

  return MembershipPlan.create({
    name: `Verify MP ${type} ${suffix}`,
    slug: `verify-mp-${type}-${suffix}`,
    description: "Temporary checkout verification plan.",
    type,
    durationDays: 30,
    price: isGroup ? "300.00" : "100.00",
    pricePerPerson: isGroup ? "150.00" : null,
    minPeople: isGroup ? 2 : 1,
    maxPeople: isGroup ? 2 : 1,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: ["Acceso general"],
    isActive: true,
    sortOrder: 9999,
  });
}

async function getPaymentByIdempotencyKey(idempotencyKey) {
  const payment = await Payment.findOne({ where: { idempotencyKey } });

  assert(payment, `No se encontro pago con idempotencyKey ${idempotencyKey}.`);

  return payment;
}

function buildProviderPayment({
  id,
  status,
  amount,
  currency = "MXN",
  orderId,
  paymentId,
  preferenceId,
}) {
  return {
    id,
    status,
    status_detail: status === "approved" ? "accredited" : status,
    transaction_amount: amount,
    currency_id: currency,
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

async function deliverWebhook({ mockApi, providerPaymentId, requestId }) {
  const signature = signWebhook({
    dataId: providerPaymentId,
    requestId,
  });

  return processMercadoPagoWebhook({
    headers: {
      "x-signature": signature,
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

async function cleanup({
  idempotencyKeys,
  webhookPrefix,
  emails,
  planSlugs,
  product,
  brand,
  category,
}) {
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
  const subscriptions = paymentIds.length
    ? await UserSubscription.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
      })
    : [];
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);
  const groups = paymentIds.length
    ? await SubscriptionGroup.findAll({
        where: { paymentId: { [Op.in]: paymentIds } },
        attributes: ["id"],
      })
    : [];
  const groupIds = groups.map((group) => group.id);

  await sequelize.transaction(async (transaction) => {
    if (subscriptionIds.length > 0) {
      await SubscriptionEvent.destroy({
        where: { subscriptionId: { [Op.in]: subscriptionIds } },
        transaction,
      });
    }

    if (paymentIds.length > 0) {
      await SubscriptionEvent.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await Receipt.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
      await UserSubscription.destroy({
        where: { paymentId: { [Op.in]: paymentIds } },
        transaction,
      });
    }

    if (groupIds.length > 0) {
      await SubscriptionGroupMember.destroy({
        where: { groupId: { [Op.in]: groupIds } },
        transaction,
      });
      await SubscriptionGroup.destroy({
        where: { id: { [Op.in]: groupIds } },
        transaction,
      });
    }

    if (orderItemIds.length > 0) {
      await InventoryMovement.destroy({
        where: { orderItemId: { [Op.in]: orderItemIds } },
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

    await MembershipPlan.destroy({
      where: { slug: { [Op.in]: planSlugs } },
      transaction,
    });

    if (product?.id) {
      await Product.destroy({ where: { id: product.id }, transaction });
    }

    if (brand?.id) {
      await Brand.destroy({ where: { id: brand.id }, transaction });
    }

    if (category?.id) {
      await Category.destroy({ where: { id: category.id }, transaction });
    }

    await User.destroy({
      where: { email: { [Op.in]: emails } },
      transaction,
    });
  });
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const webhookPrefix = `verify-mp-${suffix}`;
  const idempotencyKeys = [];
  const emails = [
    `verify-mp-client-${suffix}@example.com`,
    `verify-mp-other-${suffix}@example.com`,
  ];
  const mockApi = createMockMercadoPagoApi();
  let productFixture = {};
  let individualPlan = null;
  let groupPlan = null;

  try {
    const client = await createUser(emails[0], "cliente");
    const otherClient = await createUser(emails[1], "cliente");
    productFixture = await createProductFixture(suffix);
    individualPlan = await createPlanFixture({ suffix, type: "individual" });
    groupPlan = await createPlanFixture({ suffix, type: "group" });

    const productKey = `mp-product-${suffix}`;
    idempotencyKeys.push(productKey);
    const productCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: productKey,
        items: [
          {
            productId: productFixture.product.id_producto,
            quantity: 2,
            price: 1,
          },
        ],
      },
      mercadoPagoApi: mockApi,
    });
    const productPayment = await getPaymentByIdempotencyKey(productKey);
    const productOrder = await Order.findByPk(productPayment.orderId);

    assert(productCheckout.checkoutUrl.includes("sandbox.mercadopago"), "No se devolvio sandbox checkoutUrl.");
    assert(Number(productOrder.total) === 400, "El backend no recalculo el total desde DB.");
    assert(mockApi.preferenceCalls.at(-1).body.items[0].unit_price === 200, "La preferencia no uso el precio real.");

    const repeatedCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: productKey,
        items: [{ productId: productFixture.product.id_producto, quantity: 2 }],
      },
      mercadoPagoApi: mockApi,
    });

    assert(repeatedCheckout.orderId === productCheckout.orderId, "La idempotencia creo otra orden.");
    assert(
      await Payment.count({ where: { idempotencyKey: productKey } }) === 1,
      "La idempotencia creo otro pago."
    );

    await expectServiceError(
      () =>
        createMercadoPagoCheckout({
          userId: client.id,
          payload: {
            idempotencyKey: productKey,
            items: [{ productId: productFixture.product.id_producto, quantity: 1 }],
          },
          mercadoPagoApi: mockApi,
        }),
      409,
      "Idempotency conflict"
    );

    await expectServiceError(
      () =>
        createMercadoPagoCheckout({
          userId: client.id,
          payload: {
            idempotencyKey: `mp-empty-${suffix}`,
            items: [],
          },
          mercadoPagoApi: mockApi,
        }),
      400,
      "Carrito vacio"
    );

    await expectServiceError(
      () =>
        getOrderPaymentStatus({
          orderId: "00000000-0000-0000-0000-000000000000",
          userId: client.id,
        }),
      404,
      "Orden inexistente"
    );

    await expectServiceError(
      () =>
        processMercadoPagoWebhook({
          headers: {
            "x-signature": "ts=1,v1=bad",
            "x-request-id": `${webhookPrefix}-invalid-signature`,
          },
          query: { "data.id": `${webhookPrefix}-invalid` },
          body: { type: "payment", data: { id: `${webhookPrefix}-invalid` } },
          mercadoPagoApi: mockApi,
        }),
      401,
      "Firma invalida"
    );

    const approvedProviderPaymentId = `${webhookPrefix}-approved`;
    mockApi.providerPayments.set(
      approvedProviderPaymentId,
      buildProviderPayment({
        id: approvedProviderPaymentId,
        status: "approved",
        amount: "400.00",
        orderId: productOrder.id,
        paymentId: productPayment.id,
        preferenceId: productCheckout.preferenceId,
      })
    );

    const approvedWebhook = await deliverWebhook({
      mockApi,
      providerPaymentId: approvedProviderPaymentId,
      requestId: `${webhookPrefix}-approved-request`,
    });

    assert(approvedWebhook.ok, "El webhook aprobado fallo.");
    await productPayment.reload();
    await productOrder.reload();
    assert(productPayment.status === "paid", "El pago aprobado no quedo paid.");
    assert(productOrder.status === "paid", "La orden aprobada no quedo paid.");
    assert(
      await Receipt.count({ where: { paymentId: productPayment.id } }) === 1,
      "No se genero recibo unico."
    );
    assert(
      await InventoryMovement.count({
        where: { movementType: "sale" },
        include: [
          {
            model: OrderItem,
            as: "orderItem",
            where: { orderId: productOrder.id },
            required: true,
          },
        ],
      }) === 1,
      "No se desconto inventario."
    );

    const duplicateWebhook = await deliverWebhook({
      mockApi,
      providerPaymentId: approvedProviderPaymentId,
      requestId: `${webhookPrefix}-approved-request`,
    });

    assert(duplicateWebhook.duplicate, "El webhook duplicado no fue detectado.");
    assert(
      await Receipt.count({ where: { paymentId: productPayment.id } }) === 1,
      "El webhook duplicado genero otro recibo."
    );

    const pendingKey = `mp-pending-${suffix}`;
    idempotencyKeys.push(pendingKey);
    const pendingCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: pendingKey,
        items: [{ productId: productFixture.product.id_producto, quantity: 1 }],
      },
      mercadoPagoApi: mockApi,
    });
    const pendingPayment = await getPaymentByIdempotencyKey(pendingKey);
    const pendingProviderPaymentId = `${webhookPrefix}-pending`;
    mockApi.providerPayments.set(
      pendingProviderPaymentId,
      buildProviderPayment({
        id: pendingProviderPaymentId,
        status: "pending",
        amount: "200.00",
        orderId: pendingCheckout.orderId,
        paymentId: pendingPayment.id,
        preferenceId: pendingCheckout.preferenceId,
      })
    );
    await deliverWebhook({
      mockApi,
      providerPaymentId: pendingProviderPaymentId,
      requestId: `${webhookPrefix}-pending-request`,
    });
    await pendingPayment.reload();
    assert(pendingPayment.status === "pending", "El pago pendiente cambio a otro estado.");

    const rejectedKey = `mp-rejected-${suffix}`;
    idempotencyKeys.push(rejectedKey);
    const rejectedCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: rejectedKey,
        items: [{ productId: productFixture.product.id_producto, quantity: 1 }],
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
        amount: "200.00",
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
    assert(rejectedPayment.status === "failed", "El pago rechazado no quedo failed.");

    for (const [label, amount, currency] of [
      ["amount-mismatch", "1.00", "MXN"],
      ["currency-mismatch", "200.00", "USD"],
    ]) {
      const key = `mp-${label}-${suffix}`;
      idempotencyKeys.push(key);
      const checkout = await createMercadoPagoCheckout({
        userId: client.id,
        payload: {
          idempotencyKey: key,
          items: [{ productId: productFixture.product.id_producto, quantity: 1 }],
        },
        mercadoPagoApi: mockApi,
      });
      const payment = await getPaymentByIdempotencyKey(key);
      const providerPaymentId = `${webhookPrefix}-${label}`;
      mockApi.providerPayments.set(
        providerPaymentId,
        buildProviderPayment({
          id: providerPaymentId,
          status: "approved",
          amount,
          currency,
          orderId: checkout.orderId,
          paymentId: payment.id,
          preferenceId: checkout.preferenceId,
        })
      );
      const result = await deliverWebhook({
        mockApi,
        providerPaymentId,
        requestId: `${webhookPrefix}-${label}-request`,
      });

      await payment.reload();
      assert(!result.ok, `${label}: el webhook debia fallar.`);
      assert(payment.status === "pending", `${label}: el pago no debia confirmarse.`);
    }

    const membershipKey = `mp-membership-${suffix}`;
    idempotencyKeys.push(membershipKey);
    const membershipCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: membershipKey,
        membershipPlanId: individualPlan.id,
      },
      mercadoPagoApi: mockApi,
    });
    const membershipPayment = await getPaymentByIdempotencyKey(membershipKey);
    const membershipProviderPaymentId = `${webhookPrefix}-membership`;
    mockApi.providerPayments.set(
      membershipProviderPaymentId,
      buildProviderPayment({
        id: membershipProviderPaymentId,
        status: "approved",
        amount: "100.00",
        orderId: membershipCheckout.orderId,
        paymentId: membershipPayment.id,
        preferenceId: membershipCheckout.preferenceId,
      })
    );
    await deliverWebhook({
      mockApi,
      providerPaymentId: membershipProviderPaymentId,
      requestId: `${webhookPrefix}-membership-request`,
    });
    assert(
      await UserSubscription.count({ where: { paymentId: membershipPayment.id } }) === 1,
      "La membresia individual no se activo."
    );
    assert(
      await Receipt.count({ where: { paymentId: membershipPayment.id } }) === 1,
      "La membresia no genero recibo."
    );

    const groupKey = `mp-group-${suffix}`;
    idempotencyKeys.push(groupKey);
    const groupCheckout = await createMercadoPagoCheckout({
      userId: client.id,
      payload: {
        idempotencyKey: groupKey,
        membershipPlanId: groupPlan.id,
        memberEmails: [`verify-mp-invite-${suffix}@example.com`],
      },
      mercadoPagoApi: mockApi,
    });
    const groupPayment = await getPaymentByIdempotencyKey(groupKey);
    const groupProviderPaymentId = `${webhookPrefix}-group`;
    mockApi.providerPayments.set(
      groupProviderPaymentId,
      buildProviderPayment({
        id: groupProviderPaymentId,
        status: "approved",
        amount: "300.00",
        orderId: groupCheckout.orderId,
        paymentId: groupPayment.id,
        preferenceId: groupCheckout.preferenceId,
      })
    );
    await deliverWebhook({
      mockApi,
      providerPaymentId: groupProviderPaymentId,
      requestId: `${webhookPrefix}-group-request`,
    });
    assert(
      await SubscriptionGroup.count({ where: { paymentId: groupPayment.id } }) === 1,
      "El paquete grupal no se creo."
    );

    await expectServiceError(
      () =>
        getOrderPaymentStatus({
          orderId: productOrder.id,
          userId: otherClient.id,
        }),
      404,
      "Orden ajena"
    );

    console.log("Verificacion OK: Mercado Pago Checkout Pro.");
    console.log({
      preferenceCreated: true,
      nonexistentOrderStatusCode: 404,
      emptyCartStatusCode: 400,
      manipulatedPriceIgnored: true,
      repeatedIdempotencyReturnedSameOrder: true,
      invalidWebhookSignatureStatusCode: 401,
      approvedPaymentStatus: "paid",
      pendingPaymentStatus: "pending",
      rejectedPaymentStatus: "failed",
      duplicateWebhookIgnored: true,
      amountMismatchRejected: true,
      currencyMismatchRejected: true,
      individualMembershipActivated: true,
      groupPackageCreated: true,
      inventorySaleRecorded: true,
      receiptCreatedOnce: true,
      foreignOrderHidden: true,
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
      planSlugs: [
        `verify-mp-individual-${suffix}`,
        `verify-mp-group-${suffix}`,
      ],
      ...productFixture,
    });
    await sequelize.close();
  }
}

await main();
