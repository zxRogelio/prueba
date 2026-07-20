import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment as MercadoPagoPayment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  Cart,
  CartItem,
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  PaymentWebhookEvent,
} from "../models/index.js";
import { markCartConverted } from "./cartService.js";
import { createOrder, getOrderWithDetails } from "./orderService.js";
import {
  confirmPaidPayment,
  createPaymentAttempt,
  updatePaymentStatus,
} from "./paymentService.js";

const PROVIDER = "mercadopago_checkout";
const CHECKOUT_SOURCE = "mercadopago_checkout_pro";
const CURRENCY = "MXN";
const FINAL_PAYMENT_STATUSES = new Set(["paid", "cancelled", "refunded"]);

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeNullableString(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value, label) {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    throw serviceError(`${label} es obligatorio.`);
  }

  return normalized;
}

function normalizeQuantity(value) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError("quantity debe ser un entero mayor que cero.");
  }

  return normalized;
}

function normalizeProductId(value) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw serviceError("productId debe ser un identificador valido.");
  }

  return normalized;
}

function toCents(value, label = "monto") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw serviceError(`${label} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

function normalizeBooleanEnv(value, fallback = false) {
  if (value == null || value === "") return fallback;

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getPublicUrl(name, { requireHttps = false } = {}) {
  const value = normalizeNullableString(process.env[name]);

  if (!value) {
    throw serviceError(`${name} no esta configurada.`, 503);
  }

  if (requireHttps && !value.startsWith("https://")) {
    throw serviceError(`${name} debe ser una URL publica HTTPS.`, 503);
  }

  return value.replace(/\/+$/, "");
}

function getMercadoPagoAccessToken() {
  const accessToken = normalizeNullableString(
    process.env.MERCADOPAGO_ACCESS_TOKEN
  );

  if (!accessToken) {
    throw serviceError("Mercado Pago no esta configurado.", 503);
  }

  return accessToken;
}

function createMercadoPagoSdk() {
  const client = new MercadoPagoConfig({
    accessToken: getMercadoPagoAccessToken(),
  });

  return {
    createPreference({ body, idempotencyKey }) {
      const preference = new Preference(client);

      return preference.create({
        body,
        requestOptions: {
          idempotencyKey,
        },
      });
    },
    getPayment({ id }) {
      const payment = new MercadoPagoPayment(client);

      return payment.get({ id });
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

function normalizeMemberEmails(value) {
  if (value == null) return [];

  if (!Array.isArray(value)) {
    throw serviceError("memberEmails debe ser un arreglo.");
  }

  return [
    ...new Set(
      value
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort();
}

function normalizeProductItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const aggregated = new Map();

  for (const item of items) {
    const productId = normalizeProductId(item?.productId ?? item?.id);
    const quantity = normalizeQuantity(item?.quantity ?? 1);
    aggregated.set(productId, (aggregated.get(productId) || 0) + quantity);
  }

  return [...aggregated.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId - right.productId);
}

function normalizeCheckoutRequest(payload = {}) {
  const cartId = normalizeNullableString(payload.cartId);
  const membershipPlanId = normalizeNullableString(payload.membershipPlanId);
  const productItems = normalizeProductItems(payload.items || payload.cartItems);
  const sources = [
    cartId ? "cart" : null,
    membershipPlanId ? "membership" : null,
    productItems.length > 0 ? "items" : null,
  ].filter(Boolean);

  if (sources.length !== 1) {
    throw serviceError(
      "La solicitud debe incluir cartId, membershipPlanId o items de producto."
    );
  }

  if (cartId) {
    return {
      source: "cart",
      cartId,
    };
  }

  if (membershipPlanId) {
    return {
      source: "membership",
      membershipPlanId,
      memberEmails: normalizeMemberEmails(payload.memberEmails),
    };
  }

  return {
    source: "items",
    items: productItems,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function assertSameCheckoutRequest(existingPayment, checkoutRequest) {
  const existingRequest = existingPayment.metadata?.checkoutRequest || null;

  if (
    !existingRequest ||
    stableStringify(existingRequest) !== stableStringify(checkoutRequest)
  ) {
    throw serviceError(
      "idempotencyKey ya existe para una operacion diferente.",
      409
    );
  }
}

function isUniqueConstraintError(error, fieldName = null) {
  if (error?.name !== "SequelizeUniqueConstraintError") return false;
  if (!fieldName) return true;

  return (error.errors || []).some((entry) => entry.path === fieldName);
}

async function findPaymentByIdempotencyKey(idempotencyKey, transaction = null) {
  return Payment.findOne({
    where: { idempotencyKey },
    include: [
      {
        model: Order,
        as: "order",
        required: false,
      },
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
}

async function buildOrderItemsForCheckout({
  checkoutRequest,
  userId,
  transaction,
}) {
  if (checkoutRequest.source === "items") {
    return {
      orderItems: checkoutRequest.items.map((item) => ({
        itemType: "product",
        productId: item.productId,
        quantity: item.quantity,
      })),
      sourceCartId: null,
    };
  }

  if (checkoutRequest.source === "cart") {
    const cart = await Cart.findOne({
      where: {
        id: checkoutRequest.cartId,
        userId,
        status: "active",
      },
      include: [
        {
          model: CartItem,
          as: "items",
          required: false,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [[{ model: CartItem, as: "items" }, "createdAt", "ASC"]],
    });

    if (!cart) {
      throw serviceError("Carrito no encontrado o no esta activo.", 404);
    }

    const cartItems = cart.get?.("items") || cart.items || [];

    if (cartItems.length === 0) {
      throw serviceError("El carrito esta vacio.");
    }

    return {
      orderItems: cartItems.map((item) => ({
        itemType: "product",
        productId: item.productId,
        quantity: item.quantity,
      })),
      sourceCartId: cart.id,
    };
  }

  const plan = await MembershipPlan.findOne({
    where: {
      id: checkoutRequest.membershipPlanId,
      isActive: true,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!plan) {
    throw serviceError("Plan de membresia no encontrado o inactivo.", 404);
  }

  if (plan.type !== "group" && checkoutRequest.memberEmails.length > 0) {
    throw serviceError(
      "memberEmails solo aplica para paquetes grupales.",
      400
    );
  }

  return {
    orderItems: [
      {
        itemType: plan.type === "group" ? "group_membership" : "membership",
        membershipPlanId: plan.id,
        quantity: 1,
        metadata:
          plan.type === "group"
            ? { memberEmails: checkoutRequest.memberEmails }
            : null,
      },
    ],
    sourceCartId: null,
  };
}

async function createLocalCheckout({
  userId,
  checkoutRequest,
  idempotencyKey,
}) {
  return sequelize.transaction(async (transaction) => {
    const { orderItems, sourceCartId } = await buildOrderItemsForCheckout({
      checkoutRequest,
      userId,
      transaction,
    });
    const order = await createOrder({
      userId,
      channel: "online",
      status: "pending_payment",
      currency: CURRENCY,
      createdBy: userId,
      notes: "Checkout Pro Mercado Pago",
      metadata: {
        source: CHECKOUT_SOURCE,
        checkoutRequest,
        idempotencyKey,
        sourceCartId,
      },
      items: orderItems,
      transaction,
    });

    if (sourceCartId) {
      await markCartConverted({
        cartId: sourceCartId,
        orderId: order.id,
        transaction,
      });
    }

    const payment = await createPaymentAttempt({
      orderId: order.id,
      method: "online_checkout",
      source: "online_checkout",
      provider: PROVIDER,
      status: "pending",
      externalReference: String(order.id),
      idempotencyKey,
      metadata: {
        source: CHECKOUT_SOURCE,
        checkoutRequest,
      },
      createdBy: userId,
      transaction,
    });

    return { order, payment };
  });
}

function getPreferenceUrls(preference) {
  return {
    checkoutUrl: normalizeNullableString(preference?.init_point),
    sandboxCheckoutUrl: normalizeNullableString(preference?.sandbox_init_point),
  };
}

function selectCheckoutUrl({ checkoutUrl, sandboxCheckoutUrl }) {
  const useSandbox = normalizeBooleanEnv(process.env.MERCADOPAGO_USE_SANDBOX, true);

  return useSandbox
    ? sandboxCheckoutUrl || checkoutUrl
    : checkoutUrl || sandboxCheckoutUrl;
}

function buildPreferenceBody({ order, payment }) {
  const frontendUrl = getPublicUrl("FRONTEND_URL");
  const backendPublicUrl = getPublicUrl("BACKEND_PUBLIC_URL", {
    requireHttps: true,
  });
  const orderItems = order.get?.("items") || order.items || [];

  if (orderItems.length === 0) {
    throw serviceError("La orden no tiene items para checkout.");
  }

  return {
    items: orderItems.map((item) => {
      const quantity = Number(item.quantity);
      const unitPriceCents = Math.round(toCents(item.subtotal, "subtotal") / quantity);

      return {
        id: String(item.id),
        title: item.itemNameSnapshot,
        description: item.itemDescriptionSnapshot || undefined,
        quantity,
        unit_price: Number(fromCents(unitPriceCents)),
        currency_id: CURRENCY,
      };
    }),
    external_reference: String(order.id),
    notification_url: `${backendPublicUrl}/api/webhooks/mercadopago`,
    back_urls: {
      success: `${frontendUrl}/pago/resultado?orderId=${order.id}&result=success`,
      pending: `${frontendUrl}/pago/resultado?orderId=${order.id}&result=pending`,
      failure: `${frontendUrl}/pago/resultado?orderId=${order.id}&result=failure`,
    },
    auto_return: "approved",
    metadata: {
      order_id: String(order.id),
      user_id: String(order.userId),
      payment_id: String(payment.id),
    },
  };
}

async function loadOrderForPreference(orderId) {
  const order = await getOrderWithDetails({ orderId });

  if (!order) {
    throw serviceError("Orden no encontrada.", 404);
  }

  return order;
}

async function ensureMercadoPagoPreference({
  payment,
  mercadoPagoApi = createMercadoPagoSdk(),
}) {
  const storedUrls = payment.metadata?.checkoutUrls || null;
  const storedCheckoutUrl = storedUrls ? selectCheckoutUrl(storedUrls) : null;

  if (payment.providerPreferenceId && storedCheckoutUrl) {
    return {
      orderId: payment.orderId,
      preferenceId: payment.providerPreferenceId,
      checkoutUrl: storedCheckoutUrl,
      sandboxCheckoutUrl: storedUrls.sandboxCheckoutUrl || null,
    };
  }

  const order = await loadOrderForPreference(payment.orderId);
  const preferenceBody = buildPreferenceBody({ order, payment });
  const preference = await mercadoPagoApi.createPreference({
    body: preferenceBody,
    idempotencyKey: payment.idempotencyKey,
  });
  const urls = getPreferenceUrls(preference);
  const selectedCheckoutUrl = selectCheckoutUrl(urls);

  if (!selectedCheckoutUrl) {
    throw serviceError("Mercado Pago no devolvio una URL de checkout.", 502);
  }

  await payment.update({
    providerPreferenceId: normalizeNullableString(preference?.id),
    externalReference: String(order.id),
    providerStatus: "preference_created",
    metadata: {
      ...(payment.metadata || {}),
      checkoutRequest: payment.metadata?.checkoutRequest || order.metadata?.checkoutRequest,
      checkoutUrls: urls,
      preferenceAudit: {
        id: normalizeNullableString(preference?.id),
        createdAt: new Date().toISOString(),
        externalReference: String(order.id),
        sandbox: normalizeBooleanEnv(process.env.MERCADOPAGO_USE_SANDBOX, true),
      },
    },
  });

  return {
    orderId: order.id,
    preferenceId: normalizeNullableString(preference?.id),
    checkoutUrl: selectedCheckoutUrl,
    sandboxCheckoutUrl: urls.sandboxCheckoutUrl,
  };
}

export async function createMercadoPagoCheckout({
  userId,
  payload = {},
  mercadoPagoApi = createMercadoPagoSdk(),
}) {
  const idempotencyKey = normalizeRequiredString(
    payload.idempotencyKey,
    "idempotencyKey"
  );
  const checkoutRequest = normalizeCheckoutRequest(payload);
  const existingPayment = await findPaymentByIdempotencyKey(idempotencyKey);

  if (existingPayment) {
    if (existingPayment.provider !== PROVIDER) {
      throw serviceError(
        "idempotencyKey ya existe para otro tipo de pago.",
        409
      );
    }

    assertSameCheckoutRequest(existingPayment, checkoutRequest);

    return ensureMercadoPagoPreference({
      payment: existingPayment,
      mercadoPagoApi,
    });
  }

  try {
    const { payment } = await createLocalCheckout({
      userId,
      checkoutRequest,
      idempotencyKey,
    });

    return ensureMercadoPagoPreference({
      payment,
      mercadoPagoApi,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error, "idempotencyKey")) {
      throw error;
    }

    const payment = await findPaymentByIdempotencyKey(idempotencyKey);

    if (!payment) throw error;

    assertSameCheckoutRequest(payment, checkoutRequest);

    return ensureMercadoPagoPreference({
      payment,
      mercadoPagoApi,
    });
  }
}

function extractHeader(headers = {}, name) {
  return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
}

function extractDataId({ query = {}, body = {} }) {
  const direct =
    query["data.id"] ||
    query.data_id ||
    query.id ||
    body?.data?.id ||
    body?.data_id ||
    body?.id;

  if (direct) return String(direct);

  const resource = normalizeNullableString(body?.resource || query.resource);
  const match = resource?.match(/\/payments\/([^/?#]+)/);

  return match?.[1] || null;
}

function extractEventType({ query = {}, body = {} }) {
  return (
    normalizeNullableString(body?.type) ||
    normalizeNullableString(query.type) ||
    normalizeNullableString(body?.action) ||
    "payment"
  );
}

function buildWebhookProviderEventId({ requestId, eventType, dataId, body }) {
  return (
    normalizeNullableString(body?.id) ||
    normalizeNullableString(requestId) ||
    `${eventType}:${dataId || Date.now()}`
  );
}

function buildWebhookPayload({ query, body, xRequestId, xSignature }) {
  return {
    query,
    body,
    headers: {
      xRequestId: normalizeNullableString(xRequestId),
      xSignature: normalizeNullableString(xSignature),
      xSignaturePresent: Boolean(normalizeNullableString(xSignature)),
    },
    receivedAt: new Date().toISOString(),
  };
}

async function findOrCreateWebhookEvent({
  providerEventId,
  eventType,
  providerPaymentId,
  payload,
}) {
  try {
    const event = await PaymentWebhookEvent.create({
      provider: PROVIDER,
      providerEventId,
      eventType,
      providerPaymentId,
      signatureValid: null,
      payload,
      processingStatus: "received",
    });

    return { event, created: true };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const event = await PaymentWebhookEvent.findOne({
      where: {
        provider: PROVIDER,
        providerEventId,
      },
    });

    if (!event) throw error;

    return { event, created: false };
  }
}

function mapMercadoPagoStatus(status) {
  const normalized = normalizeNullableString(status);

  switch (normalized) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "failed";
    default:
      return "pending";
  }
}

function getProviderPaymentMetadata(providerPayment) {
  return providerPayment?.metadata || providerPayment?.metadata_info || {};
}

function getProviderPaymentAmount(providerPayment) {
  if (providerPayment?.transaction_amount != null) {
    return providerPayment.transaction_amount;
  }

  return providerPayment?.transaction_details?.total_paid_amount;
}

function getProviderPaymentCurrency(providerPayment) {
  return (
    normalizeNullableString(providerPayment?.currency_id) ||
    normalizeNullableString(providerPayment?.currency)
  );
}

async function resolveLocalPayment(providerPayment, transaction) {
  const metadata = getProviderPaymentMetadata(providerPayment);
  const providerPaymentId = normalizeNullableString(providerPayment?.id);
  const providerPreferenceId = normalizeNullableString(providerPayment?.preference_id);
  const metadataPaymentId = normalizeNullableString(metadata?.payment_id);
  const resolvedOrderId =
    normalizeNullableString(metadata?.order_id) ||
    normalizeNullableString(providerPayment?.external_reference);

  let payment = null;

  if (metadataPaymentId) {
    payment = await Payment.findOne({
      where: {
        id: metadataPaymentId,
        provider: PROVIDER,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (!payment && providerPaymentId) {
    payment = await Payment.findOne({
      where: {
        provider: PROVIDER,
        providerPaymentId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (!payment && providerPreferenceId) {
    payment = await Payment.findOne({
      where: {
        provider: PROVIDER,
        providerPreferenceId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (!payment && resolvedOrderId) {
    payment = await Payment.findOne({
      where: {
        orderId: resolvedOrderId,
        provider: PROVIDER,
      },
      order: [["createdAt", "DESC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (!payment) {
    throw serviceError("Pago local de Mercado Pago no encontrado.", 404);
  }

  const order = await Order.findByPk(payment.orderId || resolvedOrderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!order) {
    throw serviceError("Orden local no encontrada.", 404);
  }

  if (resolvedOrderId && order.id !== resolvedOrderId) {
    throw serviceError("El pago de Mercado Pago no pertenece a la orden local.", 409);
  }

  return { payment, order };
}

function assertProviderPaymentMatchesOrder({ providerPayment, payment, order }) {
  if (payment.provider !== PROVIDER || payment.source !== "online_checkout") {
    throw serviceError("El pago local no corresponde a Checkout Pro.", 409);
  }

  const amountCents = toCents(getProviderPaymentAmount(providerPayment), "amount");
  const orderTotalCents = toCents(order.total, "order.total");

  if (amountCents !== orderTotalCents) {
    throw serviceError("El monto aprobado no coincide con la orden local.", 409);
  }

  if (getProviderPaymentCurrency(providerPayment) !== CURRENCY) {
    throw serviceError("La moneda del pago de Mercado Pago no es MXN.", 409);
  }

  const providerPreferenceId = normalizeNullableString(providerPayment?.preference_id);

  if (
    providerPreferenceId &&
    payment.providerPreferenceId &&
    providerPreferenceId !== payment.providerPreferenceId
  ) {
    throw serviceError("La preferencia de Mercado Pago no coincide.", 409);
  }
}

async function applyProviderPaymentStatus({
  providerPayment,
  event,
  transaction,
}) {
  const { payment, order } = await resolveLocalPayment(providerPayment, transaction);
  const mappedStatus = mapMercadoPagoStatus(providerPayment?.status);
  const providerPaymentId = normalizeNullableString(providerPayment?.id);
  const metadata = {
    mercadopago: {
      providerPaymentId,
      status: normalizeNullableString(providerPayment?.status),
      statusDetail: normalizeNullableString(providerPayment?.status_detail),
      paymentMethodId: normalizeNullableString(providerPayment?.payment_method_id),
      paymentTypeId: normalizeNullableString(providerPayment?.payment_type_id),
      processedAt: new Date().toISOString(),
      chargedBackRequiresManualReview:
        normalizeNullableString(providerPayment?.status) === "charged_back",
    },
  };

  await event.update(
    {
      paymentId: payment.id,
      providerPaymentId,
      signatureValid: true,
      payload: {
        ...(event.payload || {}),
        providerPayment: {
          id: providerPaymentId,
          status: normalizeNullableString(providerPayment?.status),
          statusDetail: normalizeNullableString(providerPayment?.status_detail),
          externalReference: normalizeNullableString(
            providerPayment?.external_reference
          ),
          preferenceId: normalizeNullableString(providerPayment?.preference_id),
          amount: getProviderPaymentAmount(providerPayment),
          currency: getProviderPaymentCurrency(providerPayment),
        },
      },
    },
    { transaction }
  );

  if (mappedStatus === "paid") {
    assertProviderPaymentMatchesOrder({ providerPayment, payment, order });

    const result = await confirmPaidPayment({
      paymentId: payment.id,
      providerPaymentId,
      providerStatus: normalizeNullableString(providerPayment?.status),
      providerStatusDetail: normalizeNullableString(
        providerPayment?.status_detail
      ),
      providerPreferenceId: normalizeNullableString(providerPayment?.preference_id),
      externalReference: normalizeNullableString(
        providerPayment?.external_reference
      ) || String(order.id),
      metadata,
      createdBy: null,
      transaction,
    });

    return {
      action: "confirmed",
      payment: result.payment,
      order: result.order,
    };
  }

  if (
    payment.status === "paid" ||
    (FINAL_PAYMENT_STATUSES.has(payment.status) && payment.status !== mappedStatus)
  ) {
    return {
      action: "ignored_final_status",
      payment,
      order,
    };
  }

  const updatedPayment = await updatePaymentStatus({
    paymentId: payment.id,
    status: mappedStatus,
    providerPaymentId,
    providerStatus: normalizeNullableString(providerPayment?.status),
    providerStatusDetail: normalizeNullableString(providerPayment?.status_detail),
    providerPreferenceId: normalizeNullableString(providerPayment?.preference_id),
    externalReference: normalizeNullableString(providerPayment?.external_reference) || String(order.id),
    metadata,
    transaction,
  });

  return {
    action: "status_updated",
    payment: updatedPayment,
    order,
  };
}

async function markWebhookFailed(event, error) {
  await event.update({
    processingStatus: "failed",
    errorMessage: error.message,
    processedAt: new Date(),
    retryCount: Number(event.retryCount || 0) + 1,
  });
}

export async function processMercadoPagoWebhook({
  headers = {},
  query = {},
  body = {},
  mercadoPagoApi = createMercadoPagoSdk(),
}) {
  const xSignature = extractHeader(headers, "x-signature");
  const xRequestId = extractHeader(headers, "x-request-id");
  const dataId = extractDataId({ query, body });
  const eventType = extractEventType({ query, body });
  const providerEventId = buildWebhookProviderEventId({
    requestId: xRequestId,
    eventType,
    dataId,
    body,
  });
  const payload = buildWebhookPayload({
    query,
    body,
    xRequestId,
    xSignature,
  });
  const { event, created } = await findOrCreateWebhookEvent({
    providerEventId,
    eventType,
    providerPaymentId: dataId,
    payload,
  });

  if (!created && event.processingStatus === "processed") {
    return {
      ok: true,
      duplicate: true,
      event,
    };
  }

  try {
    const webhookSecret = normalizeNullableString(
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!webhookSecret) {
      throw serviceError("MERCADOPAGO_WEBHOOK_SECRET no esta configurada.", 503);
    }

    mercadoPagoApi.validateSignature({
      xSignature,
      xRequestId,
      dataId,
      secret: webhookSecret,
    });

    await event.update({
      signatureValid: true,
      providerPaymentId: dataId,
    });
  } catch (error) {
    await event.update({
      signatureValid: false,
      processingStatus: "failed",
      errorMessage:
        error instanceof InvalidWebhookSignatureError
          ? error.reason
          : error.message,
      processedAt: new Date(),
    });

    if (error instanceof InvalidWebhookSignatureError) {
      throw serviceError("Firma de Mercado Pago invalida.", 401);
    }

    throw error;
  }

  if (!dataId) {
    const error = serviceError("No se recibio identificador de pago.", 400);
    await markWebhookFailed(event, error);
    return {
      ok: false,
      event,
      error,
    };
  }

  if (!eventType.includes("payment")) {
    await event.update({
      processingStatus: "ignored",
      processedAt: new Date(),
      errorMessage: null,
    });

    return {
      ok: true,
      ignored: true,
      event,
    };
  }

  try {
    const providerPayment = await mercadoPagoApi.getPayment({ id: dataId });
    const result = await sequelize.transaction(async (transaction) => {
      const applied = await applyProviderPaymentStatus({
        providerPayment,
        event,
        transaction,
      });

      await event.update(
        {
          processingStatus: "processed",
          processedAt: new Date(),
          errorMessage: null,
        },
        { transaction }
      );

      return applied;
    });

    return {
      ok: true,
      event,
      result,
    };
  } catch (error) {
    await markWebhookFailed(event, error);

    return {
      ok: false,
      event,
      error,
    };
  }
}

export async function getOrderPaymentStatus({ orderId, userId, isAdmin = false }) {
  const where = { id: orderId };

  if (!isAdmin) {
    where.userId = userId;
  }

  const order = await Order.findOne({
    where,
    include: [
      {
        model: OrderItem,
        as: "items",
        required: false,
        attributes: ["id", "itemType", "productId", "membershipPlanId", "quantity"],
      },
      {
        model: Payment,
        as: "payments",
        required: false,
        where: {
          provider: {
            [Op.in]: [PROVIDER, "none", "bank_transfer", "mercadopago_terminal"],
          },
        },
      },
    ],
    order: [[{ model: Payment, as: "payments" }, "createdAt", "DESC"]],
  });

  if (!order) {
    throw serviceError("Orden no encontrada.", 404);
  }

  const payments = order.get?.("payments") || order.payments || [];
  const latestPayment = payments[0] || null;

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      currency: order.currency,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.get?.("items") || order.items || []).map((item) => ({
        id: item.id,
        itemType: item.itemType,
        productId: item.productId,
        membershipPlanId: item.membershipPlanId,
        quantity: item.quantity,
      })),
    },
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          provider: latestPayment.provider,
          providerStatus: latestPayment.providerStatus,
          providerStatusDetail: latestPayment.providerStatusDetail,
          amount: latestPayment.amount,
          currency: latestPayment.currency,
          paidAt: latestPayment.paidAt,
          approvedAt: latestPayment.approvedAt,
          cancelledAt: latestPayment.cancelledAt,
          refundedAt: latestPayment.refundedAt,
          updatedAt: latestPayment.updatedAt,
        }
      : null,
  };
}
