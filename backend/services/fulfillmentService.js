import { sequelize } from "../config/sequelize.js";
import { FulfillmentEvent, Order, OrderFulfillment, Payment, User } from "../models/index.js";
import { allowedFulfillmentTransitions, assertFulfillmentTransition, deliveryError, textField, uuidField } from "../utils/deliveryValidation.js";

export async function createOrderFulfillment({ orderId, delivery, actorId, transaction }) {
  const fulfillment = await OrderFulfillment.create({ ...delivery, orderId, status: "awaiting_payment" }, { transaction });
  await FulfillmentEvent.create({ fulfillmentId: fulfillment.id, fromStatus: null, toStatus: "awaiting_payment", actorId }, { transaction });
  return fulfillment;
}

// Caller holds the order lock. Payment and fulfillment changes commit together.
export async function confirmFulfillmentPayment({ orderId, transaction }) {
  const fulfillment = await OrderFulfillment.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!fulfillment || fulfillment.status !== "awaiting_payment") return;
  await fulfillment.update({ status: "payment_confirmed" }, { transaction });
  await FulfillmentEvent.create({ fulfillmentId: fulfillment.id, fromStatus: "awaiting_payment", toStatus: "payment_confirmed",
    actorId: null, notes: "Pago confirmado por el servidor." }, { transaction });
}

export async function cancelUnpaidFulfillment({ orderId, actorId, transaction }) {
  const fulfillment = await OrderFulfillment.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!fulfillment || fulfillment.status !== "awaiting_payment") return;
  await fulfillment.update({ status: "cancelled", cancelledAt: new Date() }, { transaction });
  await FulfillmentEvent.create({ fulfillmentId: fulfillment.id, fromStatus: "awaiting_payment", toStatus: "cancelled", actorId }, { transaction });
}

export async function updateFulfillmentStatus({ orderId, actorId, input }) {
  uuidField(orderId, "Orden");
  return sequelize.transaction(async (transaction) => {
    // Defense in depth: authorization also applies when called outside a route.
    const actor = await User.findByPk(actorId, { transaction });
    if (actor?.role !== "administrador") throw deliveryError("Solo administradores pueden actualizar entregas.", 403);
    const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw deliveryError("Orden no encontrada.", 404);
    const fulfillment = await OrderFulfillment.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!fulfillment) throw deliveryError("Esta orden no tiene seguimiento de entrega.", 404);
    const status = textField(input.status, "Estado", 30);
    if (input.expectedStatus !== fulfillment.status) throw deliveryError("El pedido cambió. Actualiza la vista antes de continuar.", 409);
    assertFulfillmentTransition(fulfillment, status);
    const payment = await Payment.findOne({ where: { orderId, status: "paid" }, transaction });
    if (order.status !== "paid" || !payment || Math.round(Number(payment.amount) * 100) !== Math.round(Number(order.total) * 100)) {
      throw deliveryError("La orden requiere un pago confirmado por el importe completo antes de gestionar la entrega.", 409);
    }
    const notes = textField(input.notes, "Observaciones", 1000, ["incident", "delivery_failed", "cancelled"].includes(status));
    const changes = { status };
    if (status === "incident") changes.resumeStatus = fulfillment.status;
    if (fulfillment.status === "incident") changes.resumeStatus = null;
    if (status === "shipped") {
      changes.carrier = textField(input.carrier ?? fulfillment.carrier, "Paquetería", 120);
      changes.trackingNumber = textField(input.trackingNumber ?? fulfillment.trackingNumber, "Número de guía", 120);
    }
    const dateField = { preparing: "preparedAt", ready_for_pickup: "readyAt", packed: "packedAt", shipped: "shippedAt",
      delivered: "deliveredAt", picked_up: "pickedUpAt", cancelled: "cancelledAt" }[status];
    // Resolving an incident resumes the same preparation/shipment; a new
    // shipment after delivery_failed still records a new dispatch date.
    if (dateField && (fulfillment.status !== "incident" || status !== fulfillment.resumeStatus)) changes[dateField] = new Date();
    if (["delivered", "picked_up"].includes(status)) changes.confirmedBy = actorId;
    const fromStatus = fulfillment.status;
    await fulfillment.update(changes, { transaction });
    await FulfillmentEvent.create({ fulfillmentId: fulfillment.id, fromStatus, toStatus: status, actorId, notes,
      details: status === "shipped" ? { carrier: changes.carrier, trackingNumber: changes.trackingNumber } : null }, { transaction });
    return fulfillment;
  });
}

export function serializeFulfillment(value, { admin = false, orderStatus = "paid" } = {}) {
  if (!value) return null;
  const plain = value.get ? value.get({ plain: true }) : value;
  const { rateSnapshot, events, ...result } = plain;
  delete result.resumeStatus;
  return { ...result,
    ...(admin ? { rateSnapshot, allowedTransitions: orderStatus === "paid" ? allowedFulfillmentTransitions(plain) : [] } : {}),
    events: (events || []).map((event) => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus,
      createdAt: event.createdAt, notes: event.notes, details: event.details || null, ...(admin ? { actorId: event.actorId } : {}) })) };
}
