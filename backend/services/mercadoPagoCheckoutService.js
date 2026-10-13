import { randomUUID } from "node:crypto";
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
  Receipt,
} from "../models/index.js";
import { previewMembershipsFromOrder } from "./membershipActivationService.js";
import {
  getReconciliationPolicy, assertReconciliationApproval, authenticateReconciliationOperator,
  assertReconciliationProviderEnvironment,
} from "./mercadoPagoReconciliationAuthorization.js";
import { markCartConverted } from "./cartService.js";
import { createInventoryReservationsForOrder } from "./inventoryReservationService.js";
import { createOrder, getOrderWithDetails } from "./orderService.js";
import {
  confirmPaidPayment,
  createPaymentAttempt,
  updatePaymentStatus,
  assertPaymentConfirmationIsAllowed,
} from "./paymentService.js";

const PROVIDER = "mercadopago_checkout";
const CHECKOUT_SOURCE = "mercadopago_checkout_pro";
const CURRENCY = "MXN";
const REVIEW_PAYMENT_STATUSES = new Set(["disputed", "charged_back"]);
const FINAL_PAYMENT_STATUSES = new Set([
  "paid",
  "cancelled",
  "refunded",
  ...REVIEW_PAYMENT_STATUSES,
]);
const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300;
const UNIX_MILLISECONDS_THRESHOLD = 1_000_000_000_000;
const PREFERENCE_CREATION_STALE_MS = 2 * 60 * 1000;
const PREFERENCE_WAIT_TIMEOUT_MS = 10 * 1000;
const PREFERENCE_WAIT_INTERVAL_MS = 100;

function serviceError(message, statusCode = 400, options = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (options.retryable !== undefined) {
    error.webhookRetryable = Boolean(options.retryable);
  }
  return error;
}

function nonRetryableWebhookError(message, statusCode = 400) {
  return serviceError(message, statusCode, { retryable: false });
}

function shouldRetryWebhookError(error) {
  return error?.webhookRetryable !== false;
}

function safeWebhookErrorMessage(error) {
  const fallback = "Error procesando webhook de Mercado Pago.";
  let message = normalizeNullableString(error?.message) || fallback;

  for (const secret of [
    process.env.MERCADOPAGO_ACCESS_TOKEN,
    process.env.MERCADOPAGO_WEBHOOK_SECRET,
  ]) {
    const normalizedSecret = normalizeNullableString(secret);

    if (normalizedSecret) {
      message = message.split(normalizedSecret).join("[redacted]");
    }
  }

  return message
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(?:APP_USR|TEST)-[\w-]+/g, "[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[redacted]")
    .replace(/v1=[a-f0-9]+/gi, "v1=[redacted]")
    .slice(0, 1000);
}

export function getMercadoPagoErrorDiagnostics(error) {
  const original = error?.cause || error;
  const status = Number(original?.status || original?.statusCode);
  return {
    stage: error?.mercadoPagoStage || original?.mercadoPagoStage || null,
    name: safeWebhookErrorMessage({ message: original?.name || "Error" }),
    message: safeWebhookErrorMessage(original),
    code: safeWebhookErrorMessage({ message: original?.original?.code || original?.code || "unknown" }),
    providerStatusCode: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const accessToken = getMercadoPagoAccessToken();
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 },
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
    async getSeller() {
      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw Object.assign(new Error("No se pudo consultar la cuenta vendedora."), {
          status: response.status,
        });
      }
      const seller = await response.json();
      // Solo se conserva la evidencia de identidad necesaria; no datos personales.
      return { id: seller.id, tags: seller.tags };
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

function checkoutIdempotencyConflict() {
  throw serviceError("idempotencyKey ya existe para otra operacion.", 409);
}

function assertSameCheckoutOperation({
  existingPayment,
  userId,
  checkoutRequest,
}) {
  const order = existingPayment.order || existingPayment.get?.("order") || null;

  if (existingPayment.userId !== userId || order?.userId !== userId) {
    checkoutIdempotencyConflict();
  }

  if (!existingPayment.orderId || !order || existingPayment.orderId !== order.id) {
    throw serviceError(
      "idempotencyKey ya existe para una operacion incompleta.",
      409
    );
  }

  if (
    existingPayment.method !== "online_checkout" ||
    existingPayment.source !== "online_checkout" ||
    existingPayment.provider !== PROVIDER
  ) {
    checkoutIdempotencyConflict();
  }

  if (
    normalizeNullableString(existingPayment.metadata?.source) !== CHECKOUT_SOURCE ||
    normalizeNullableString(order.metadata?.source) !== CHECKOUT_SOURCE
  ) {
    checkoutIdempotencyConflict();
  }

  if (
    normalizeNullableString(existingPayment.currency) !== CURRENCY ||
    normalizeNullableString(order.currency) !== CURRENCY
  ) {
    throw serviceError(
      "idempotencyKey ya existe para una operacion con moneda diferente.",
      409
    );
  }

  if (toCents(existingPayment.amount, "payment.amount") !== toCents(order.total, "order.total")) {
    throw serviceError(
      "idempotencyKey ya existe para una operacion con monto diferente.",
      409
    );
  }

  const externalReference = normalizeNullableString(existingPayment.externalReference);

  if (externalReference && externalReference !== String(order.id)) {
    throw serviceError(
      "idempotencyKey ya existe para una orden diferente.",
      409
    );
  }

  assertSameCheckoutRequest(existingPayment, checkoutRequest);
}

function isUniqueConstraintError(error, fieldName = null) {
  if (error?.name !== "SequelizeUniqueConstraintError") return false;
  if (!fieldName) return true;

  return (error.errors || []).some((entry) => entry.path === fieldName);
}

function isIdempotencyKeyConflictError(error) {
  if (error?.message === "idempotencyKey ya existe.") return true;
  if (error?.parent?.constraint === "payments_idempotency_key_unique") return true;

  return isUniqueConstraintError(error, "idempotencyKey");
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
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!cart) {
      throw serviceError("Carrito no encontrado o no esta activo.", 404);
    }

    const cartItems = await CartItem.findAll({
      where: {
        cartId: cart.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [["createdAt", "ASC"]],
    });

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
        sourceCartId,
      },
      createdBy: userId,
      transaction,
    });

    await createInventoryReservationsForOrder({
      orderId: order.id,
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
  // Checkout Pro usa init_point tambien para compras con usuarios de prueba.
  return checkoutUrl || sandboxCheckoutUrl;
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

async function ensureMercadoPagoPreference({
  payment,
  mercadoPagoApi = createMercadoPagoSdk(),
}) {
  const claim = await claimPreferenceCreation(payment.id);

  if (claim.status === "ready") {
    return claim.result;
  }

  if (claim.status === "creating") {
    return waitForPreferenceCreation({
      paymentId: payment.id,
      mercadoPagoApi,
    });
  }

  try {
    const paymentForPreference = await Payment.findByPk(claim.paymentId);

    if (!paymentForPreference) {
      throw serviceError("Pago no encontrado.", 404);
    }

    const order = await getOrderWithDetails({
      orderId: paymentForPreference.orderId,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    const preferenceBody = buildPreferenceBody({
      order,
      payment: paymentForPreference,
    });
    const preference = await mercadoPagoApi.createPreference({
      body: preferenceBody,
      idempotencyKey: paymentForPreference.idempotencyKey,
    });
    const urls = getPreferenceUrls(preference);
    const selectedCheckoutUrl = selectCheckoutUrl(urls);

    if (!selectedCheckoutUrl) {
      throw serviceError("Mercado Pago no devolvio una URL de checkout.", 502);
    }

    return savePreferenceSuccess({
      paymentId: paymentForPreference.id,
      token: claim.token,
      preference,
      urls,
    });
  } catch (error) {
    await savePreferenceFailure({
      paymentId: claim.paymentId,
      token: claim.token,
      error,
    });

    throw buildPreferenceCreationError(error);
  }
}

function buildExistingPreferenceResult(payment) {
  const storedUrls = payment.metadata?.checkoutUrls || null;
  const storedCheckoutUrl = storedUrls ? selectCheckoutUrl(storedUrls) : null;

  if (!payment.providerPreferenceId || !storedCheckoutUrl) {
    return null;
  }

  return {
    orderId: payment.orderId,
    preferenceId: payment.providerPreferenceId,
    checkoutUrl: storedCheckoutUrl,
    sandboxCheckoutUrl: storedUrls.sandboxCheckoutUrl || null,
  };
}

function preferenceCreationIsFresh(creation = {}) {
  if (creation.status !== "creating") return false;

  const startedAt = Date.parse(creation.startedAt || "");

  return (
    Number.isFinite(startedAt) &&
    Date.now() - startedAt < PREFERENCE_CREATION_STALE_MS
  );
}

async function claimPreferenceCreation(paymentId) {
  return sequelize.transaction(async (transaction) => {
    const lockedPayment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedPayment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    const existingResult = buildExistingPreferenceResult(lockedPayment);

    if (existingResult) {
      return {
        status: "ready",
        result: existingResult,
      };
    }

    await createInventoryReservationsForOrder({
      orderId: lockedPayment.orderId,
      transaction,
    });

    const metadata = lockedPayment.metadata || {};
    const preferenceCreation = metadata.preferenceCreation || {};

    if (preferenceCreationIsFresh(preferenceCreation)) {
      return {
        status: "creating",
        paymentId: lockedPayment.id,
      };
    }

    const token = randomUUID();

    await lockedPayment.update(
      {
        providerStatus: "preference_creating",
        providerStatusDetail: null,
        metadata: {
          ...metadata,
          preferenceCreation: {
            status: "creating",
            token,
            startedAt: new Date().toISOString(),
            retryCount: Number(preferenceCreation.retryCount || 0),
          },
        },
      },
      { transaction }
    );

    return {
      status: "claimed",
      paymentId: lockedPayment.id,
      token,
    };
  });
}

async function waitForPreferenceCreation({
  paymentId,
  mercadoPagoApi,
}) {
  const deadline = Date.now() + PREFERENCE_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await delay(PREFERENCE_WAIT_INTERVAL_MS);

    const payment = await Payment.findByPk(paymentId);

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    const existingResult = buildExistingPreferenceResult(payment);

    if (existingResult) {
      return existingResult;
    }

    const preferenceCreation = payment.metadata?.preferenceCreation || {};

    if (!preferenceCreationIsFresh(preferenceCreation)) {
      return ensureMercadoPagoPreference({
        payment,
        mercadoPagoApi,
      });
    }
  }

  throw serviceError(
    "La preferencia de Mercado Pago sigue en proceso. Intenta nuevamente.",
    409
  );
}

function buildPreferenceCreationError(error) {
  if (error?.statusCode && error.statusCode >= 500) {
    return serviceError("No se pudo crear la preferencia de Mercado Pago.", error.statusCode);
  }

  if (error?.statusCode === 503) {
    return serviceError("No se pudo crear la preferencia de Mercado Pago.", 503);
  }

  return serviceError("No se pudo crear la preferencia de Mercado Pago.", 502);
}

async function savePreferenceFailure({
  paymentId,
  token,
  error,
}) {
  await sequelize.transaction(async (transaction) => {
    const payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) return;

    const metadata = payment.metadata || {};
    const preferenceCreation = metadata.preferenceCreation || {};

    if (preferenceCreation.token && preferenceCreation.token !== token) {
      return;
    }

    await payment.update(
      {
        providerStatus: "preference_failed",
        providerStatusDetail: safeWebhookErrorMessage(error),
        metadata: {
          ...metadata,
          preferenceCreation: {
            status: "failed",
            token,
            failedAt: new Date().toISOString(),
            errorMessage: safeWebhookErrorMessage(error),
            retryCount: Number(preferenceCreation.retryCount || 0) + 1,
          },
        },
      },
      { transaction }
    );
  });
}

function resolveSourceCartId({ payment, order }) {
  return (
    normalizeNullableString(payment.metadata?.sourceCartId) ||
    normalizeNullableString(order.metadata?.sourceCartId)
  );
}

async function markSourceCartConvertedAfterPreference({
  payment,
  order,
  transaction,
}) {
  const sourceCartId = resolveSourceCartId({ payment, order });

  if (!sourceCartId) return null;

  const cart = await Cart.findByPk(sourceCartId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!cart) {
    throw serviceError("Carrito no encontrado.", 404);
  }

  if (cart.status === "converted" && cart.convertedOrderId === order.id) {
    return cart;
  }

  if (cart.status !== "active") {
    throw serviceError("El carrito ya no esta activo.", 409);
  }

  return markCartConverted({
    cartId: cart.id,
    orderId: order.id,
    transaction,
  });
}

async function savePreferenceSuccess({
  paymentId,
  token,
  preference,
  urls,
}) {
  const selectedCheckoutUrl = selectCheckoutUrl(urls);

  return sequelize.transaction(async (transaction) => {
    const payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      throw serviceError("Pago no encontrado.", 404);
    }

    const existingResult = buildExistingPreferenceResult(payment);
    const order = await Order.findByPk(payment.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw serviceError("Orden no encontrada.", 404);
    }

    if (existingResult) {
      await markSourceCartConvertedAfterPreference({
        payment,
        order,
        transaction,
      });
      return existingResult;
    }

    const metadata = payment.metadata || {};
    const preferenceCreation = metadata.preferenceCreation || {};

    if (preferenceCreation.token && preferenceCreation.token !== token) {
      throw serviceError(
        "La preferencia de Mercado Pago esta siendo creada por otra solicitud.",
        409
      );
    }

    const preferenceId = normalizeNullableString(preference?.id);

    if (preferenceId) {
      const duplicatePreferencePayment = await Payment.findOne({
        where: {
          provider: PROVIDER,
          providerPreferenceId: preferenceId,
          id: {
            [Op.ne]: payment.id,
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (duplicatePreferencePayment) {
        throw serviceError(
          "providerPreferenceId ya existe para este provider.",
          409
        );
      }
    }

    await payment.update(
      {
        providerPreferenceId: preferenceId,
        externalReference: String(order.id),
        providerStatus: "preference_created",
        providerStatusDetail: null,
        metadata: {
          ...metadata,
          checkoutRequest: metadata.checkoutRequest || order.metadata?.checkoutRequest,
          checkoutUrls: urls,
          preferenceCreation: {
            status: "created",
            token,
            completedAt: new Date().toISOString(),
            retryCount: Number(preferenceCreation.retryCount || 0),
          },
          preferenceAudit: {
            id: preferenceId,
            createdAt: new Date().toISOString(),
            externalReference: String(order.id),
            sandbox: normalizeBooleanEnv(process.env.MERCADOPAGO_USE_SANDBOX, true),
          },
        },
      },
      { transaction }
    );

    await markSourceCartConvertedAfterPreference({
      payment,
      order,
      transaction,
    });

    return {
      orderId: order.id,
      preferenceId: normalizeNullableString(preference?.id),
      checkoutUrl: selectedCheckoutUrl,
      sandboxCheckoutUrl: urls.sandboxCheckoutUrl,
    };
  });
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
    assertSameCheckoutOperation({
      existingPayment,
      userId,
      checkoutRequest,
    });

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
    if (!isIdempotencyKeyConflictError(error)) {
      throw error;
    }

    const payment = await findPaymentByIdempotencyKey(idempotencyKey);

    if (!payment) throw error;

    assertSameCheckoutOperation({
      existingPayment: payment,
      userId,
      checkoutRequest,
    });

    return ensureMercadoPagoPreference({
      payment,
      mercadoPagoApi,
    });
  }
}

function extractHeader(headers = {}, name) {
  const key = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : null;
  return normalizeNullableString(Array.isArray(value) ? value[0] : value);
}

function extractSignatureDataId(query = {}) {
  const value = query["data.id"] ?? query.data_id;
  const scalar = Array.isArray(value) ? value[0] : value;
  return normalizeNullableString(scalar)?.toLowerCase();
}

function extractTimestampFromSignatureHeader(xSignature) {
  const signature = normalizeNullableString(xSignature);
  if (!signature) return null;

  const timestampPart = signature
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ts="));

  if (!timestampPart) return null;

  return timestampPart.slice(3).trim() || null;
}

function buildWebhookSignatureDiagnostics({
  xSignature,
  xRequestId,
  dataId,
  now = Date.now(),
  reason = null,
  differenceSeconds = null,
}) {
  const timestamp = extractTimestampFromSignatureHeader(xSignature);
  const timestampDigits = timestamp && /^\d+$/.test(timestamp) ? timestamp.length : null;
  let safeDifferenceSeconds = differenceSeconds;

  if (safeDifferenceSeconds == null && timestampDigits != null) {
    const timestampNumber = Number(timestamp);

    if (Number.isFinite(timestampNumber)) {
      const timestampMs =
        timestampNumber < UNIX_MILLISECONDS_THRESHOLD
          ? timestampNumber * 1000
          : timestampNumber;
      safeDifferenceSeconds = Math.abs(now - timestampMs) / 1000;
    }
  }

  return {
    reason: normalizeNullableString(reason),
    xRequestId: normalizeNullableString(xRequestId),
    timestampDigits,
    differenceSeconds:
      safeDifferenceSeconds == null
        ? null
        : Number(Number(safeDifferenceSeconds).toFixed(3)),
    dataIdPresent: Boolean(normalizeNullableString(dataId)),
  };
}

function createWebhookSignatureError(reason, xRequestId, diagnostics = {}) {
  const error = new InvalidWebhookSignatureError(reason, xRequestId);
  error.webhookSignatureDiagnostics = {
    ...diagnostics,
    reason,
  };
  return error;
}

function validateWebhookSignatureTimestamp({
  xSignature,
  xRequestId,
  dataId,
  toleranceSeconds = WEBHOOK_SIGNATURE_TOLERANCE_SECONDS,
  now = Date.now(),
}) {
  const timestamp = extractTimestampFromSignatureHeader(xSignature);
  const baseDiagnostics = buildWebhookSignatureDiagnostics({
    xSignature,
    xRequestId,
    dataId,
    now,
  });

  if (!timestamp) {
    throw createWebhookSignatureError(
      "MissingTimestamp",
      xRequestId,
      baseDiagnostics
    );
  }

  if (!/^\d+$/.test(timestamp)) {
    throw createWebhookSignatureError(
      "MalformedSignatureHeader",
      xRequestId,
      baseDiagnostics
    );
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    throw createWebhookSignatureError(
      "MalformedSignatureHeader",
      xRequestId,
      baseDiagnostics
    );
  }

  const timestampMs =
    timestampNumber < UNIX_MILLISECONDS_THRESHOLD
      ? timestampNumber * 1000
      : timestampNumber;
  const differenceSeconds = Math.abs(now - timestampMs) / 1000;
  const diagnostics = buildWebhookSignatureDiagnostics({
    xSignature,
    xRequestId,
    dataId,
    now,
    differenceSeconds,
  });

  if (differenceSeconds > toleranceSeconds) {
    throw createWebhookSignatureError(
      "TimestampOutOfTolerance",
      xRequestId,
      diagnostics
    );
  }

  return diagnostics;
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
  const signatureDiagnostics = buildWebhookSignatureDiagnostics({
    xSignature,
    xRequestId,
    dataId: extractDataId({ query, body }),
  });

  return {
    query,
    body,
    headers: {
      xRequestId: normalizeNullableString(xRequestId),
      xSignaturePresent: Boolean(normalizeNullableString(xSignature)),
    },
    signatureDiagnostics,
    receivedAt: new Date().toISOString(),
  };
}

function mergeWebhookSignatureDiagnostics(payload, diagnostics) {
  return {
    ...(payload || {}),
    signatureDiagnostics: {
      ...(payload?.signatureDiagnostics || {}),
      ...diagnostics,
    },
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
      return "charged_back";
    case "in_mediation":
    case "dispute":
    case "disputed":
      return "disputed";
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
  const lock = transaction && !transaction.options?.readOnly ? transaction.LOCK.UPDATE : undefined;
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
      lock,
    });
  }

  if (!payment && providerPaymentId) {
    payment = await Payment.findOne({
      where: {
        provider: PROVIDER,
        providerPaymentId,
      },
      transaction,
      lock,
    });
  }

  if (!payment && providerPreferenceId) {
    payment = await Payment.findOne({
      where: {
        provider: PROVIDER,
        providerPreferenceId,
      },
      transaction,
      lock,
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
      lock,
    });
  }

  if (!payment) {
    throw serviceError("Pago local de Mercado Pago no encontrado.", 404);
  }

  const order = await Order.findByPk(payment.orderId || resolvedOrderId, {
    transaction,
    lock,
  });

  if (!order) {
    throw serviceError("Orden local no encontrada.", 404);
  }

  if (resolvedOrderId && order.id !== resolvedOrderId) {
    throw nonRetryableWebhookError(
      "El pago de Mercado Pago no pertenece a la orden local.",
      400
    );
  }

  return { payment, order };
}

function assertProviderPaymentMatchesOrder({ providerPayment, payment, order, requireExternalReference = false }) {
  if (payment.provider !== PROVIDER || payment.source !== "online_checkout") {
    throw nonRetryableWebhookError(
      "El pago local no corresponde a Checkout Pro.",
      400
    );
  }

  for (const amount of [providerPayment?.transaction_amount, payment.amount, order.total]) {
    const cents = Number(amount) * 100;
    if (amount == null || String(amount).trim() === "" || !Number.isFinite(cents) || cents <= 0 ||
        !Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 0.000001) {
      throw nonRetryableWebhookError("El importe debe ser positivo y expresarse en centavos exactos.", 400);
    }
  }
  const amountCents = toCents(providerPayment.transaction_amount, "amount");
  const orderTotalCents = toCents(order.total, "order.total");

  if (amountCents !== orderTotalCents || amountCents !== toCents(payment.amount, "payment.amount")) {
    throw nonRetryableWebhookError(
      "El monto aprobado no coincide con la orden local.",
      400
    );
  }

  if (getProviderPaymentCurrency(providerPayment) !== CURRENCY ||
      payment.currency !== CURRENCY || order.currency !== CURRENCY) {
    throw nonRetryableWebhookError(
      "La moneda del pago de Mercado Pago no es MXN.",
      400
    );
  }

  const metadata = getProviderPaymentMetadata(providerPayment);
  if (!payment.userId || payment.userId !== order.userId) {
    throw nonRetryableWebhookError("El propietario del pago no coincide con la orden.", 400);
  }
  if (requireExternalReference && providerPayment.external_reference !== String(order.id)) {
    throw nonRetryableWebhookError("La referencia externa no identifica la orden solicitada.", 400);
  }
  for (const [provided, expected] of [
    [providerPayment?.external_reference, order.id],
    [metadata.order_id, order.id],
    [metadata.payment_id, payment.id],
    [metadata.user_id, payment.userId],
  ]) {
    if (provided != null && String(provided) !== String(expected)) {
      throw nonRetryableWebhookError("Las referencias del pago de Mercado Pago no coinciden.", 400);
    }
  }

  if (
    payment.providerPaymentId &&
    String(providerPayment?.id) !== payment.providerPaymentId
  ) {
    throw nonRetryableWebhookError("La orden ya fue confirmada con otra operacion.", 409);
  }

  const providerPreferenceId = normalizeNullableString(providerPayment?.preference_id);

  if (
    providerPreferenceId &&
    payment.providerPreferenceId &&
    providerPreferenceId !== payment.providerPreferenceId
  ) {
    throw nonRetryableWebhookError(
      "La preferencia de Mercado Pago no coincide.",
      400
    );
  }
}

async function lockProviderPayment(providerPaymentId, transaction) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))", {
    replacements: { key: `mercadopago_payment:${providerPaymentId}` }, transaction,
  });
}

async function applyProviderPaymentStatus({
  providerPayment,
  event = null,
  transaction,
  expectedOrderId = null,
  expectedPaymentId = null,
  reconciliation = null,
}) {
  await lockProviderPayment(providerPayment.id, transaction);
  const { payment, order } = await resolveLocalPayment(providerPayment, transaction);
  if (
    (expectedOrderId && order.id !== expectedOrderId) ||
    (expectedPaymentId && payment.id !== expectedPaymentId)
  ) {
    throw nonRetryableWebhookError("La operacion no pertenece al pago y orden solicitados.", 409);
  }
  if (reconciliation && !["pending", "paid"].includes(payment.status)) {
    throw nonRetryableWebhookError("El pago local no admite reconciliacion automatica.", 409);
  }
  const mappedStatus = mapMercadoPagoStatus(providerPayment?.status);
  const providerPaymentId = normalizeNullableString(providerPayment?.id);
  const providerStatus = normalizeNullableString(providerPayment?.status);
  const requiresAdminReview = REVIEW_PAYMENT_STATUSES.has(mappedStatus);
  const metadata = {
    mercadopago: {
      providerPaymentId,
      status: providerStatus,
      statusDetail: normalizeNullableString(providerPayment?.status_detail),
      paymentMethodId: normalizeNullableString(providerPayment?.payment_method_id),
      paymentTypeId: normalizeNullableString(providerPayment?.payment_type_id),
      processedAt: new Date().toISOString(),
      adminReviewRequired: requiresAdminReview,
      reviewReason: requiresAdminReview ? mappedStatus : null,
      chargedBackRequiresManualReview:
        providerStatus === "charged_back",
    },
    ...(requiresAdminReview
      ? {
          paymentReview: {
            required: true,
            reason: mappedStatus,
            provider: PROVIDER,
            providerStatus,
            providerPaymentId,
            orderId: order.id,
            receivedAt: new Date().toISOString(),
            note:
              "Revision administrativa requerida. No se modifican inventario, membresias ni recibos automaticamente.",
          },
        }
      : {}),
  };

  if (reconciliation) {
    const previousHistory = payment.metadata?.reconciliationHistory;
    if (previousHistory != null && !Array.isArray(previousHistory)) {
      throw serviceError("El historial de reconciliacion requiere revision administrativa.", 409);
    }
    const history = [...(previousHistory || [])];
    if (!history.length && payment.metadata?.reconciliation) history.push(payment.metadata.reconciliation);
    history.push({ ...reconciliation, outcome: payment.status === "paid" ? "rechecked" : "confirmed" });
    metadata.reconciliation = payment.metadata?.reconciliation || reconciliation;
    metadata.reconciliationHistory = history;
  }

  if (event) await event.update(
    {
      paymentId: payment.id,
      providerPaymentId,
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

  if (requiresAdminReview) {
    assertProviderPaymentMatchesOrder({ providerPayment, payment, order, requireExternalReference: Boolean(reconciliation) });

    const updatedPayment = await updatePaymentStatus({
      paymentId: payment.id,
      status: mappedStatus,
      providerPaymentId,
      providerStatus,
      providerStatusDetail: normalizeNullableString(providerPayment?.status_detail),
      providerPreferenceId: normalizeNullableString(providerPayment?.preference_id) || payment.providerPreferenceId,
      externalReference:
        normalizeNullableString(providerPayment?.external_reference) || String(order.id),
      metadata,
      transaction,
    });

    return {
      action: "marked_for_admin_review",
      payment: updatedPayment,
      order,
    };
  }

  if (mappedStatus === "paid") {
    if (payment.status !== "pending" && payment.status !== "paid") {
      return {
        action: "ignored_final_status",
        payment,
        order,
      };
    }

    assertProviderPaymentMatchesOrder({ providerPayment, payment, order, requireExternalReference: Boolean(reconciliation) });

    const result = await confirmPaidPayment({
      paymentId: payment.id,
      providerPaymentId,
      providerStatus,
      providerStatusDetail: normalizeNullableString(
        providerPayment?.status_detail
      ),
      providerPreferenceId: normalizeNullableString(providerPayment?.preference_id) || payment.providerPreferenceId,
      externalReference: normalizeNullableString(
        providerPayment?.external_reference
      ) || String(order.id),
      metadata,
      createdBy: reconciliation?.requestedBy || null,
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
    providerStatus,
    providerStatusDetail: normalizeNullableString(providerPayment?.status_detail),
    providerPreferenceId: normalizeNullableString(providerPayment?.preference_id) || payment.providerPreferenceId,
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
    errorMessage: safeWebhookErrorMessage(error),
    processedAt: new Date(),
    retryCount: Number(event.retryCount || 0) + 1,
    payload: {
      ...(event.payload || {}),
      errorDiagnostics: getMercadoPagoErrorDiagnostics(error),
    },
  });
}

async function getTrustedProviderPayment({ id, mercadoPagoApi, verifySeller = false, policy = null }) {
  let providerPayment;
  let seller;
  try {
    providerPayment = await mercadoPagoApi.getPayment({ id });
    if (verifySeller) seller = await mercadoPagoApi.getSeller();
  } catch (cause) {
    const error = serviceError("No se pudo consultar Mercado Pago.", 502);
    error.cause = cause;
    error.mercadoPagoStage = "provider_lookup";
    throw error;
  }

  if (normalizeNullableString(providerPayment?.id) !== String(id)) {
    throw nonRetryableWebhookError("Mercado Pago devolvio otra operacion.", 502);
  }
  if (verifySeller && (
    !seller?.id || !providerPayment?.collector_id ||
    String(seller.id) !== String(providerPayment.collector_id)
  )) {
    throw nonRetryableWebhookError("El Access Token no corresponde al vendedor del pago.", 409);
  }
  if (policy) assertReconciliationProviderEnvironment({ policy, seller, providerPayment });
  return providerPayment;
}

// Uso administrativo explicito. La vista previa no actualiza registros ni crea eventos.
export async function reconcileMercadoPagoPayment({
  orderId,
  providerPaymentId,
  dryRun = true,
  requestedBy = null,
  operatorToken = null,
  approval = null,
  mercadoPagoApi = createMercadoPagoSdk(),
}) {
  const expectedOrderId = normalizeRequiredString(orderId, "orderId");
  const id = normalizeRequiredString(providerPaymentId, "providerPaymentId");
  if (!/^\d+$/.test(id) || typeof dryRun !== "boolean") {
    throw serviceError("providerPaymentId debe ser numerico y dryRun booleano.");
  }
  const policy = getReconciliationPolicy();
  let operator = null;
  if (!dryRun) {
    assertReconciliationApproval({ approval, orderId: expectedOrderId, policy });
    operator = await authenticateReconciliationOperator({ operatorToken, requestedBy });
  }
  const attemptId = randomUUID();
  const fetchApprovedPayment = async () => {
    const providerPayment = await getTrustedProviderPayment({ id, mercadoPagoApi, verifySeller: true, policy });
    if (providerPayment.status !== "approved") {
      throw nonRetryableWebhookError("La operacion no esta aprobada en Mercado Pago.", 409);
    }
    return providerPayment;
  };
  const inspect = async (providerPayment, transaction) => {
    const { payment, order } = await resolveLocalPayment(providerPayment, transaction);
    if (order.id !== expectedOrderId) {
      throw nonRetryableWebhookError("La operacion no pertenece a la orden solicitada.", 409);
    }
    if (!["pending", "paid"].includes(payment.status)) {
      throw nonRetryableWebhookError("El pago local no admite reconciliacion automatica.", 409);
    }
    assertProviderPaymentMatchesOrder({ providerPayment, payment, order, requireExternalReference: true });
    await assertPaymentConfirmationIsAllowed({ payment, order, providerPaymentId: id, transaction });
    const memberships = await previewMembershipsFromOrder({ order, transaction });
    const receipt = await Receipt.findOne({ where: { paymentId: payment.id }, transaction });
    return { payment, preview: {
      dryRun, environment: policy.environment, databaseId: policy.databaseId,
      orderId: order.id, orderNumber: order.orderNumber, orderStatus: order.status,
      paymentId: payment.id, providerPaymentId: id, providerStatus: providerPayment.status,
      liveMode: providerPayment.live_mode, sellerId: String(providerPayment.collector_id),
      paymentMode: policy.paymentMode,
      localStatus: payment.status, amount: providerPayment.transaction_amount, currency: CURRENCY,
      receipt: receipt ? { id: receipt.id, status: receipt.status } : null, memberships,
    } };
  };
  try {
    const providerPayment = await fetchApprovedPayment();
    const initial = await sequelize.transaction({ readOnly: true, isolationLevel: "REPEATABLE READ" }, async (transaction) => {
      // readOnly de Sequelize selecciona el pool; esta sentencia impone la garantia en PostgreSQL.
      await sequelize.query("SET TRANSACTION READ ONLY", { transaction });
      return inspect(providerPayment, transaction);
    });
    if (dryRun) return initial.preview;
    return await sequelize.transaction(async (transaction) => {
      operator = await authenticateReconciliationOperator({ operatorToken, requestedBy, transaction });
      getReconciliationPolicy(); // Verifica nuevamente el destino efectivo antes de escribir.
      await lockProviderPayment(id, transaction);
      // Consulta fresca despues de esperar el bloqueo; nunca reutiliza una aprobacion antigua.
      const freshPayment = await fetchApprovedPayment();
      operator = await authenticateReconciliationOperator({ operatorToken, requestedBy, transaction });
      const result = await applyProviderPaymentStatus({
        providerPayment: freshPayment, transaction, expectedOrderId, expectedPaymentId: initial.payment.id,
        reconciliation: {
          source: "provider_api_reconciliation", requestedBy: operator.id, sessionId: operator.sessionId,
          attemptId, environment: policy.environment, databaseId: policy.databaseId,
          reconciledAt: new Date().toISOString(),
        },
      });
      const final = await inspect(freshPayment, transaction);
      return { ...final.preview, action: result.action, attemptId, requestedBy: operator.id };
    });
  } catch (error) {
    if (operator) console.error("Mercado Pago reconciliation failed", {
      attemptId, requestedBy: operator.id, orderId: expectedOrderId, providerPaymentId: id,
      environment: policy.environment, databaseId: policy.databaseId,
      error: getMercadoPagoErrorDiagnostics(error),
    });
    throw error;
  }
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

  const alreadyProcessed = !created && event.processingStatus === "processed";

  if (!dataId) {
    const error = nonRetryableWebhookError(
      "No se recibio identificador de pago.",
      400
    );
    await markWebhookFailed(event, error);
    throw error;
  }

  let signatureDiagnostics;
  try {
    const webhookSecret = normalizeNullableString(
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!webhookSecret) {
      throw serviceError("Webhook de Mercado Pago no esta configurado.", 500);
    }

    signatureDiagnostics = validateWebhookSignatureTimestamp({
      xSignature,
      xRequestId,
      dataId,
    });

    mercadoPagoApi.validateSignature({
      xSignature,
      xRequestId,
      dataId: extractSignatureDataId(query),
      secret: webhookSecret,
    });
  } catch (error) {
    if (alreadyProcessed) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw serviceError("Firma de Mercado Pago invalida.", 401);
      }
      throw error;
    }
    await event.update({
      signatureValid: false,
    });

    if (error instanceof InvalidWebhookSignatureError) {
      const diagnostics = {
        ...buildWebhookSignatureDiagnostics({
          xSignature,
          xRequestId,
          dataId,
        }),
        ...(error.webhookSignatureDiagnostics || {}),
        reason: normalizeNullableString(error.reason) || "SignatureValidationFailed",
      };

      await event.update({
        processingStatus: "failed",
        errorMessage: diagnostics.reason,
        payload: mergeWebhookSignatureDiagnostics(event.payload, diagnostics),
        processedAt: new Date(),
      });
      throw serviceError("Firma de Mercado Pago invalida.", 401);
    }

    await markWebhookFailed(event, error);
    throw error;
  }

  if (alreadyProcessed) return { ok: true, duplicate: true, event };
  await event.update({
    signatureValid: true,
    providerPaymentId: dataId,
    payload: mergeWebhookSignatureDiagnostics(payload, {
      ...signatureDiagnostics,
      signedDataIdPresent: Boolean(extractSignatureDataId(query)),
      reason: null,
    }),
  });

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

  let stage = "provider_lookup";
  try {
    const providerPayment = await getTrustedProviderPayment({ id: dataId, mercadoPagoApi });
    stage = "local_confirmation";
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
    error.mercadoPagoStage ||= stage;
    await markWebhookFailed(event, error);

    if (!shouldRetryWebhookError(error)) {
      throw error;
    }

    const wrapped = serviceError("Error interno procesando webhook de Mercado Pago.", error.statusCode === 502 ? 502 : 500);
    wrapped.cause = error.cause || error;
    wrapped.mercadoPagoStage = error.mercadoPagoStage;
    throw wrapped;
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
