import { sequelize } from "../config/sequelize.js";
import { AboutPage } from "../models/index.js";
import { deliveryError, normalizeContact, textField } from "../utils/deliveryValidation.js";

function settingsSlug() {
  const slug = process.env.PICKUP_SETTINGS_SLUG || "main";
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw deliveryError("Configuración de recogida inválida.", 503);
  return slug;
}

export function normalizePickupSettings(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw deliveryError("Configuración de recogida inválida.");
  const name = textField(input.name, "Nombre del gimnasio", 120);
  const postalCode = textField(input.postalCode, "Código postal", 5);
  if (!/^\d{5}$/.test(postalCode)) throw deliveryError("El código postal debe tener 5 dígitos.");
  if (input.enabled != null && typeof input.enabled !== "boolean") throw deliveryError("enabled debe ser booleano.");
  return { name, address: textField(input.address, "Dirección física completa", 255),
    municipality: textField(input.municipality, "Municipio", 100), state: textField(input.state, "Estado", 100), postalCode,
    phone: normalizeContact({ recipientName: name, phone: input.phone }).phone,
    hours: textField(input.hours, "Horarios de recogida", 300),
    instructions: textField(input.instructions, "Instrucciones de recogida", 1000), enabled: input.enabled ?? true };
}

export async function getPickupConfiguration({ transaction } = {}) {
  const page = await AboutPage.findOne({ where: { slug: settingsSlug() }, transaction });
  if (page?.pickupSettings) return { configured: true, settings: normalizePickupSettings(page.pickupSettings) };
  return { configured: false, settings: { name: "Titanium Sport Gym", address: page?.ctaAddress?.trim() || "",
    phone: page?.ctaPhone?.trim() || "", municipality: "", state: "", postalCode: "", hours: "", instructions: "", enabled: true } };
}

export async function savePickupConfiguration({ input, actorId }) {
  const settings = normalizePickupSettings(input);
  return sequelize.transaction(async (transaction) => {
    const slug = settingsSlug();
    // A transaction advisory lock also serializes the first insert, when the
    // About row does not yet exist. Never overwrite marketing contact fields.
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", { replacements: { key: "pickup-settings:" + slug }, transaction });
    let page = await AboutPage.findOne({ where: { slug }, transaction, lock: transaction.LOCK.UPDATE });
    const pickupSettings = { ...settings, updatedBy: actorId, updatedAt: new Date().toISOString() };
    if (page) await page.update({ pickupSettings }, { transaction });
    else page = await AboutPage.create({ slug, pickupSettings, isActive: true }, { transaction });
    return { configured: true, settings: normalizePickupSettings(page.pickupSettings) };
  });
}

export async function readPickupLocation({ transaction } = {}) {
  const page = await AboutPage.findOne({ where: { slug: settingsSlug(), isActive: true }, transaction });
  if (page?.pickupSettings) {
    const { enabled, ...settings } = normalizePickupSettings(page.pickupSettings);
    return enabled ? settings : null;
  }
  // Preserve existing, real contact data until an administrator completes the
  // dedicated form. Missing locality/hours are never filled with fictitious data.
  return page?.ctaAddress?.trim() && page?.ctaPhone?.trim()
    ? { name: "Titanium Sport Gym", address: page.ctaAddress.trim(), phone: page.ctaPhone.trim() } : null;
}
