import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { ShippingRate, UserAddress } from "../models/index.js";
import { readPickupLocation } from "./pickupLocationService.js";
import { canonicalJson, deliveryError, normalizeDeliveryInput, textField } from "../utils/deliveryValidation.js";

const QUOTE_AUDIENCE = "titanium-product-delivery";
const digest = (value) => createHash("sha256").update(canonicalJson(value)).digest("hex");

export async function getPickupLocation({ transaction } = {}) {
  return readPickupLocation({ transaction });
}

// Provider boundary: replace this lookup with a carrier adapter when required.
export async function quoteShipping(postalCode, { transaction, lock = false } = {}) {
  const rates = await ShippingRate.findAll({
    where: { active: true, currency: "MXN", postalCodeFrom: { [Op.lte]: postalCode }, postalCodeTo: { [Op.gte]: postalCode } },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  // Most specific range wins. Ambiguous coverage is rejected, never guessed.
  rates.sort((a, b) => (Number(a.postalCodeTo) - Number(a.postalCodeFrom)) - (Number(b.postalCodeTo) - Number(b.postalCodeFrom)));
  const rate = rates[0];
  if (!rate) throw deliveryError("Código postal fuera de cobertura o sin tarifa de envío configurada.", 422);
  if (rates[1] && Number(rate.postalCodeTo) - Number(rate.postalCodeFrom) === Number(rates[1].postalCodeTo) - Number(rates[1].postalCodeFrom)) {
    throw deliveryError("La cobertura tiene tarifas ambiguas. Contacta al gimnasio.", 422);
  }
  return { id: rate.id, name: rate.name, amount: Number(rate.amount).toFixed(2), currency: rate.currency, updatedAt: new Date(rate.updatedAt).toISOString() };
}

export async function resolveDelivery({ userId, input, transaction }) {
  const normalized = normalizeDeliveryInput(input);
  if (normalized.method === "pickup") {
    const pickupLocationSnapshot = await getPickupLocation({ transaction });
    if (!pickupLocationSnapshot) throw deliveryError("El gimnasio aún no tiene dirección y teléfono de recogida configurados.", 422);
    return { method: "pickup", recipientName: normalized.recipientName, phone: normalized.phone,
      addressSnapshot: null, pickupLocationSnapshot, shippingCost: "0.00", rateSnapshot: null };
  }
  let address = normalized.address;
  if (normalized.addressId) {
    const saved = await UserAddress.findOne({ where: { id: normalized.addressId, userId }, transaction,
      ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
    if (!saved) throw deliveryError("Dirección no encontrada.", 404);
    // Copy only address fields; never retain a mutable foreign key in an order.
    address = normalizeDeliveryInput({ method: "delivery", address: saved.get ? saved.get({ plain: true }) : saved }).address;
  }
  const rateSnapshot = await quoteShipping(address.postalCode, { transaction, lock: true });
  return { method: "delivery", recipientName: address.recipientName, phone: address.phone,
    addressSnapshot: address, pickupLocationSnapshot: null, shippingCost: rateSnapshot.amount, rateSnapshot };
}

export function deliveryTotals(totals, delivery) {
  const shippingCents = Math.round(Number(delivery.shippingCost) * 100);
  return { subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal,
    shippingTotal: (shippingCents / 100).toFixed(2), total: ((Math.round(Number(totals.total) * 100) + shippingCents) / 100).toFixed(2) };
}

function quoteDigest({ input, items, delivery, totals }) {
  return digest({ input: normalizeDeliveryInput(input), items, delivery, totals: deliveryTotals(totals, delivery) });
}

export function issueDeliveryQuote({ userId, input, items, delivery, totals }) {
  if (!process.env.JWT_SECRET) throw deliveryError("No se puede firmar la cotización.", 503);
  const quoteToken = jwt.sign({ digest: quoteDigest({ input, items, delivery, totals }) }, process.env.JWT_SECRET,
    { algorithm: "HS256", audience: QUOTE_AUDIENCE, subject: String(userId), expiresIn: "15m" });
  return { ...deliveryTotals(totals, delivery), fulfillment: delivery, quoteToken, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
}

export function deliveryQuoteDigest({ token, userId, allowExpired = false }) {
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"], audience: QUOTE_AUDIENCE,
      subject: String(userId), ignoreExpiration: allowExpired });
    if (typeof claims.digest !== "string" || !/^[a-f0-9]{64}$/.test(claims.digest)) throw new Error("Invalid quote digest");
  } catch {
    throw deliveryError("Consulta y confirma una cotización vigente antes de pagar.", 409);
  }
  return claims.digest;
}

export function verifyDeliveryQuote({ token, userId, input, items, delivery, totals }) {
  if (deliveryQuoteDigest({ token, userId }) !== quoteDigest({ input, items, delivery, totals })) {
    throw deliveryError("El carrito, dirección o tarifa cambió. Consulta y confirma de nuevo el total.", 409);
  }
}

export function normalizeShippingRate(input) {
  const name = textField(input.name, "Nombre de tarifa", 120);
  const postalCodeFrom = textField(input.postalCodeFrom, "Código postal inicial", 5);
  const postalCodeTo = textField(input.postalCodeTo, "Código postal final", 5);
  if (!/^\d{5}$/.test(postalCodeFrom) || !/^\d{5}$/.test(postalCodeTo) || postalCodeFrom > postalCodeTo) {
    throw deliveryError("El rango de códigos postales no es válido.");
  }
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(input.amount))) throw deliveryError("La tarifa debe ser un importe no negativo con hasta dos decimales.");
  if (input.currency && input.currency !== "MXN") throw deliveryError("Las tarifas deben expresarse en MXN.");
  if (input.active != null && typeof input.active !== "boolean") throw deliveryError("active debe ser booleano.");
  return { name, postalCodeFrom, postalCodeTo, amount: Number(input.amount).toFixed(2), currency: "MXN", active: input.active ?? true };
}
