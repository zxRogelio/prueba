import { sequelize } from "../config/sequelize.js";
import { ShippingRate, UserAddress } from "../models/index.js";
import { saveUserAddress, deleteUserAddress } from "../services/addressService.js";
import { assertShippingRateCoverage, getPickupLocation, normalizeShippingRate } from "../services/shippingService.js";
import { updateFulfillmentStatus } from "../services/fulfillmentService.js";
import { createProductCheckoutQuote } from "../services/mercadoPagoCheckoutService.js";
import { deliveryError, uuidField } from "../utils/deliveryValidation.js";
import { getPickupConfiguration, savePickupConfiguration } from "../services/pickupLocationService.js";

// Never log customer addresses, phone numbers, tokens or provider payloads.
function endpoint(callback) {
  return async (req, res) => {
    try { await callback(req, res); }
    catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ ok: false, error: status >= 500 ? "No se pudo completar la operación de entrega." : error.message });
    }
  };
}

export const deliveryOptions = endpoint(async (_req, res) => {
  res.json({ ok: true, pickupLocation: await getPickupLocation() });
});
export const readPickupSettings = endpoint(async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, ...await getPickupConfiguration() });
});
export const updatePickupSettings = endpoint(async (req, res) => {
  res.json({ ok: true, ...await savePickupConfiguration({ input: req.body || {}, actorId: req.user.id }) });
});
export const productQuote = endpoint(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, ...await createProductCheckoutQuote({ userId: req.user.id, payload: req.body || {} }) });
});
export const listAddresses = endpoint(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, addresses: await UserAddress.findAll({ where: { userId: req.user.id }, order: [["isDefault", "DESC"], ["createdAt", "DESC"]] }) });
});
export const saveAddress = endpoint(async (req, res) => {
  const address = await saveUserAddress({ userId: req.user.id, addressId: req.params.addressId, input: req.body || {} });
  res.status(req.params.addressId ? 200 : 201).json({ ok: true, address });
});
export const deleteAddress = endpoint(async (req, res) => {
  await deleteUserAddress({ userId: req.user.id, addressId: req.params.addressId });
  res.status(204).end();
});
export const changeFulfillment = endpoint(async (req, res) => {
  await updateFulfillmentStatus({ orderId: req.params.orderId, actorId: req.user.id, input: req.body || {} });
  res.json({ ok: true });
});
export const listShippingRates = endpoint(async (_req, res) => {
  res.json({ ok: true, rates: await ShippingRate.findAll({ order: [["createdAt", "DESC"]] }) });
});
export const saveShippingRate = endpoint(async (req, res) => {
  const rateId = req.params.rateId ? uuidField(req.params.rateId, "Tarifa") : null;
  const rate = await sequelize.transaction({ isolationLevel: "READ COMMITTED" }, async (transaction) => {
    // Also serialize the first insert, when there is no rate row to lock.
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
      replacements: { key: "shipping-rate-configuration" }, transaction,
    });
    const saved = rateId ? await ShippingRate.findByPk(rateId, { transaction, lock: transaction.LOCK.UPDATE }) : null;
    if (rateId && !saved) throw deliveryError("Tarifa no encontrada.", 404);
    const plain = saved ? saved.get({ plain: true }) : {};
    const normalized = normalizeShippingRate({ ...plain, ...req.body });
    const existing = await ShippingRate.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    assertShippingRateCoverage(normalized, existing, { rateId,
      wasNational: plain.postalCodeFrom === "00000" && plain.postalCodeTo === "99999" });
    const values = { ...normalized, updatedBy: req.user.id };
    return saved ? saved.update(values, { transaction }) : ShippingRate.create(values, { transaction });
  });
  res.status(rateId ? 200 : 201).json({ ok: true, rate });
});
