export function deliveryError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function textField(value, label, max = 160, required = true) {
  if (value != null && typeof value !== "string") throw deliveryError(`${label} no es válido.`);
  const text = (value || "").trim();
  if ((required && !text) || text.length > max || Array.from(text).some((character) => character.charCodeAt(0) < 32)) {
    throw deliveryError(`${label} es obligatorio y admite hasta ${max} caracteres.`);
  }
  return text || null;
}

export function uuidField(value, label = "id") {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw deliveryError(`${label} no es válido.`);
  }
  return value;
}

export function normalizeContact(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw deliveryError("Los datos de contacto no son válidos.");
  const recipientName = textField(input.recipientName, "Nombre del destinatario", 120);
  const phone = textField(input.phone, "Teléfono", 25);
  if (!/^\+?[\d ()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) {
    throw deliveryError("Proporciona un teléfono de 10 a 15 dígitos.");
  }
  return { recipientName, phone };
}

export function normalizeAddress(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw deliveryError("La dirección no es válida.");
  const postalCode = textField(input.postalCode, "Código postal", 5);
  if (!/^\d{5}$/.test(postalCode)) throw deliveryError("El código postal debe tener 5 dígitos.");
  return {
    ...normalizeContact(input), postalCode,
    state: textField(input.state, "Estado", 100),
    municipality: textField(input.municipality, "Municipio", 100),
    neighborhood: textField(input.neighborhood, "Colonia", 120),
    street: textField(input.street, "Calle", 160),
    exteriorNumber: textField(input.exteriorNumber, "Número exterior", 30),
    interiorNumber: textField(input.interiorNumber, "Número interior", 30, false),
    references: textField(input.references, "Referencias", 500),
  };
}

export function normalizeDeliveryInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw deliveryError("Selecciona un método de entrega.");
  if (input.method === "pickup") return { method: "pickup", ...normalizeContact(input) };
  if (input.method !== "delivery") throw deliveryError("Método de entrega inválido.");
  if (input.addressId) return { method: "delivery", addressId: uuidField(input.addressId, "Dirección") };
  return { method: "delivery", address: normalizeAddress(input.address) };
}

export const FULFILLMENT_STATUSES = Object.freeze([
  "awaiting_payment", "payment_confirmed", "preparing", "ready_for_pickup", "picked_up",
  "packed", "shipped", "delivered", "incident", "delivery_failed", "cancelled",
]);
export const TERMINAL_FULFILLMENT_STATUSES = new Set(["picked_up", "delivered", "cancelled"]);

export function allowedFulfillmentTransitions(fulfillment) {
  const { method, status, resumeStatus } = fulfillment;
  if (TERMINAL_FULFILLMENT_STATUSES.has(status) || status === "awaiting_payment") return [];
  const next = {
    payment_confirmed: ["preparing", "incident", "cancelled"],
    preparing: [method === "pickup" ? "ready_for_pickup" : "packed", "incident", "cancelled"],
    ready_for_pickup: ["picked_up", "incident", "cancelled"],
    packed: ["shipped", "incident", "cancelled"],
    shipped: ["delivered", "delivery_failed", "incident"],
    delivery_failed: ["shipped", "incident", "cancelled"],
    incident: [resumeStatus, "cancelled"].filter(Boolean),
  };
  return next[status] || [];
}

export function assertFulfillmentTransition(fulfillment, nextStatus) {
  if (!allowedFulfillmentTransitions(fulfillment).includes(nextStatus)) {
    throw deliveryError(`No se permite cambiar ${fulfillment.status} a ${nextStatus}.`, 409);
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
