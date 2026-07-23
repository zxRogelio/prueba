import {
  MercadoPagoConfig,
  PaymentRefund as MercadoPagoPaymentRefund,
} from "mercadopago";

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

function getMercadoPagoAccessToken() {
  const accessToken = normalizeNullableString(
    process.env.MERCADOPAGO_ACCESS_TOKEN
  );

  if (!accessToken) {
    throw serviceError("Mercado Pago no esta configurado.", 503);
  }

  return accessToken;
}

function normalizeProviderAmount(value) {
  if (value == null) return null;

  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw serviceError("amount de reembolso de Mercado Pago invalido.");
  }

  return Math.round(numeric * 100) / 100;
}

function normalizeDateString(value) {
  if (!value) return null;

  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function pickSafeRefundPayload(response = {}) {
  return {
    id: normalizeNullableString(response.id),
    payment_id: normalizeNullableString(response.payment_id),
    status: normalizeNullableString(response.status),
    amount:
      response.amount == null ? null : normalizeProviderAmount(response.amount),
    date_created: normalizeDateString(response.date_created),
    unique_sequence_number: normalizeNullableString(
      response.unique_sequence_number
    ),
  };
}

export function normalizeMercadoPagoRefundResponse(response = {}) {
  const safePayload = pickSafeRefundPayload(response);

  return {
    providerRefundId: safePayload.id,
    providerStatus: safePayload.status,
    providerAmount: safePayload.amount,
    providerDate: safePayload.date_created,
    safePayload,
  };
}

export function mapMercadoPagoRefundStatus(providerStatus) {
  const normalized = normalizeNullableString(providerStatus)?.toLowerCase();

  if (normalized === "approved") return "approved";
  if (["rejected", "failed", "cancelled"].includes(normalized)) return "failed";
  return "pending";
}

export function createMercadoPagoRefundApi() {
  const client = new MercadoPagoConfig({
    accessToken: getMercadoPagoAccessToken(),
  });
  const refundClient = new MercadoPagoPaymentRefund(client);

  return {
    refundPayment({
      providerPaymentId,
      amount = null,
      fullRefund = false,
      idempotencyKey = null,
    }) {
      const paymentId = normalizeNullableString(providerPaymentId);

      if (!paymentId) {
        throw serviceError("providerPaymentId de Mercado Pago es obligatorio.");
      }

      const requestOptions = normalizeNullableString(idempotencyKey)
        ? { idempotencyKey: normalizeNullableString(idempotencyKey) }
        : undefined;

      if (fullRefund || amount == null) {
        return refundClient.total({
          payment_id: paymentId,
          requestOptions,
        });
      }

      return refundClient.create({
        payment_id: paymentId,
        body: {
          amount: normalizeProviderAmount(amount),
        },
        requestOptions,
      });
    },
  };
}
