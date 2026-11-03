import type { Fulfillment } from "../services/deliveryService";

// A later state never proves intermediate steps. Only actual events, explicit
// timestamps or the backend's current status confirm a milestone.
export function deliveryProgress(fulfillment: Fulfillment) {
  const milestones = fulfillment.method === "pickup"
    ? ["payment_confirmed", "preparing", "ready_for_pickup", "picked_up"]
    : ["payment_confirmed", "preparing", "packed", "shipped", "delivered"];
  const dates: Record<string, string | null> = { preparing: fulfillment.preparedAt, ready_for_pickup: fulfillment.readyAt,
    picked_up: fulfillment.pickedUpAt, packed: fulfillment.packedAt, shipped: fulfillment.shippedAt, delivered: fulfillment.deliveredAt };
  return milestones.map((status) => {
    const event = [...fulfillment.events].reverse().find((item) => item.toStatus === status);
    const at = event?.createdAt || dates[status] || null;
    const current = fulfillment.status === status;
    return { status, at, current, confirmed: !!at || current };
  });
}
