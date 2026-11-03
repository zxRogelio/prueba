import axios from "axios";
import { API } from "../api/api";
import type { ProductCheckoutItem } from "./checkoutService";

export type Address = {
  recipientName: string; phone: string; postalCode: string; state: string;
  municipality: string; neighborhood: string; street: string; exteriorNumber: string;
  interiorNumber: string | null; references: string;
};
export type SavedAddress = Address & { id: string; isDefault: boolean };
export type DeliveryInput = { method: "pickup"; recipientName: string; phone: string }
  | { method: "delivery"; addressId: string } | { method: "delivery"; address: Address };
export type PickupLocation = { name: string; address: string; phone: string; municipality?: string; state?: string;
  postalCode?: string; hours?: string; instructions?: string };
export type PickupSettings = Required<PickupLocation> & { enabled: boolean };
export async function getPickupSettings() { return (await API.get<{ configured: boolean; settings: PickupSettings }>("/admin/pickup-settings")).data; }
export async function savePickupSettings(settings: PickupSettings) { return (await API.put<{ configured: boolean; settings: PickupSettings }>("/admin/pickup-settings", settings)).data; }
export const fulfillmentLabels: Record<string, string> = {
  awaiting_payment: "Pendiente de pago", payment_confirmed: "Pago confirmado", preparing: "En preparación",
  ready_for_pickup: "Listo para recoger", picked_up: "Recogido", packed: "Empaquetado", shipped: "Enviado",
  delivered: "Entregado", incident: "Incidencia", delivery_failed: "Entrega no realizada", cancelled: "Cancelado",
};
export const paymentLabels: Record<string, string> = {
  draft: "Borrador", pending_payment: "Pendiente de pago", pending: "Pendiente", paid: "Pagado",
  failed: "Rechazado", cancelled: "Cancelado", refunded: "Reembolsado", partially_refunded: "Reembolso parcial",
  disputed: "En disputa", charged_back: "Contracargo",
};
export type Fulfillment = {
  id: string; method: "pickup" | "delivery"; status: string; recipientName: string; phone: string;
  addressSnapshot: Address | null; pickupLocationSnapshot: PickupLocation | null; shippingCost: string;
  carrier: string | null; trackingNumber: string | null; confirmedBy?: string | null;
  preparedAt: string | null; readyAt: string | null; packedAt: string | null; shippedAt: string | null;
  deliveredAt: string | null; pickedUpAt: string | null; cancelledAt: string | null;
  allowedTransitions?: string[];
  events: Array<{ id: string; fromStatus: string | null; toStatus: string; createdAt: string; notes: string | null;
    details?: { carrier: string; trackingNumber: string } | null; actorId?: string | null }>;
};
export type ProductOrder = {
  id: string; orderNumber: string; status: string; createdAt: string; paidAt: string | null;
  subtotal: string; discountTotal: string; taxTotal: string; shippingTotal: string; total: string; currency: string;
  customer?: { email: string }; fulfillment: Fulfillment | null;
  items: Array<{ id: string; itemType: string; itemNameSnapshot: string; quantity: number; unitPrice: string; discountAmount: string; subtotal: string }>;
  payments: Array<{ id: string; status: string; amount: string; paidAt: string | null }>;
};
export type ProductQuote = {
  subtotal: string; discountTotal: string; taxTotal: string; shippingTotal: string; total: string;
  fulfillment: Pick<Fulfillment, "method" | "recipientName" | "phone" | "addressSnapshot" | "pickupLocationSnapshot" | "shippingCost">;
  quoteToken: string; expiresAt: string;
  items: Array<{ productId: number; name: string; quantity: number; unitPrice: string; discountAmount: string; subtotal: string }>;
};
export type ShippingRate = { id: string; name: string; postalCodeFrom: string; postalCodeTo: string; amount: string; active: boolean };
export type OrderList = { orders: ProductOrder[]; pagination: { page: number; pages: number; total: number } };
export const money = (value: string | number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
export const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("es-MX") : "—";
export const deliveryErrorMessage = (error: unknown) => axios.isAxiosError(error)
  ? (error.response?.data as { error?: string } | undefined)?.error || "No se pudo completar la operación."
  : error instanceof Error ? error.message : "No se pudo completar la operación.";
export const emptyAddress: Address = { recipientName: "", phone: "", postalCode: "", state: "", municipality: "", neighborhood: "", street: "", exteriorNumber: "", interiorNumber: "", references: "" };
export async function getDeliveryOptions() { return (await API.get<{ pickupLocation: PickupLocation | null }>("/delivery/options")).data; }
export async function getAddresses() { return (await API.get<{ addresses: SavedAddress[] }>("/addresses/me")).data.addresses; }
export async function saveAddress(address: Address & { isDefault?: boolean }, id?: string) {
  return (id ? await API.put<{ address: SavedAddress }>(`/addresses/me/${id}`, address)
    : await API.post<{ address: SavedAddress }>("/addresses/me", address)).data.address;
}
export async function deleteAddress(id: string) { await API.delete(`/addresses/me/${id}`); }
export async function quoteProducts(items: ProductCheckoutItem[], fulfillment: DeliveryInput) {
  return (await API.post<ProductQuote>("/checkout/product-quote", { items, fulfillment })).data;
}
export async function listProductOrders(admin: boolean, params: Record<string, string | number>) {
  return (await API.get<OrderList>(admin ? "/admin/orders" : "/orders/me", { params: { ...params, productOnly: "true" } })).data;
}
export async function getProductOrder(id: string) { return (await API.get<{ order: ProductOrder }>(`/orders/${id}`)).data.order; }
export async function updateDelivery(orderId: string, input: { status: string; expectedStatus: string; notes: string; carrier?: string; trackingNumber?: string }) {
  await API.patch(`/admin/orders/${orderId}/fulfillment`, input);
}
export async function listRates() { return (await API.get<{ rates: ShippingRate[] }>("/admin/shipping-rates")).data.rates; }
export async function saveRate(rate: Omit<ShippingRate, "id">, id?: string) {
  return (id ? await API.patch(`/admin/shipping-rates/${id}`, rate) : await API.post("/admin/shipping-rates", rate)).data;
}
