// Checkout Pro reports merchandise in transaction_amount and shipping separately
// in shipping_amount. total_paid_amount can also include financing/other payer
// adjustments; it must never be used to hide an underpaid order principal.
function exactCents(value, { positive = false } = {}) {
  const cents = Number(value) * 100;
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "" ||
      !Number.isFinite(cents) || (positive ? cents <= 0 : cents < 0) ||
      !Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 0.000001) {
    throw Object.assign(new Error("El importe debe expresarse en centavos exactos y no ser negativo."), { statusCode: 400, webhookRetryable: false });
  }
  return Math.round(cents);
}

export function mercadoPagoPaymentAmounts(payment) {
  const merchandiseCents = exactCents(payment?.transaction_amount, { positive: true });
  const shippingCents = exactCents(payment?.shipping_amount ?? 0);
  const totalCents = merchandiseCents + shippingCents;
  if (!Number.isSafeInteger(totalCents)) throw Object.assign(new Error("El importe total excede el límite de centavos exactos."), { statusCode: 400, webhookRetryable: false });
  return { merchandiseCents, shippingCents, totalCents };
}
