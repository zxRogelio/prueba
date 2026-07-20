import { API } from "../api/api";

export type ProductCheckoutItem = {
  productId: number | string;
  quantity: number;
};

export type MercadoPagoCheckoutPayload =
  | {
      idempotencyKey: string;
      items: ProductCheckoutItem[];
    }
  | {
      idempotencyKey: string;
      membershipPlanId: string;
      memberEmails?: string[];
    }
  | {
      idempotencyKey: string;
      cartId: string;
    };

export type MercadoPagoCheckoutResponse = {
  ok: boolean;
  orderId: string;
  preferenceId: string | null;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string | null;
};

export type OrderPaymentStatus = {
  ok: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: string | number;
    currency: string;
    paidAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    items?: Array<{
      id: string;
      itemType: "product" | "membership" | "group_membership";
      productId?: number | null;
      membershipPlanId?: string | null;
      quantity: number;
    }>;
  };
  payment: {
    id: string;
    status: string;
    provider: string;
    providerStatus?: string | null;
    providerStatusDetail?: string | null;
    amount: string | number;
    currency: string;
    paidAt?: string | null;
    approvedAt?: string | null;
    cancelledAt?: string | null;
    refundedAt?: string | null;
    updatedAt?: string;
  } | null;
};

export async function createMercadoPagoCheckout(
  payload: MercadoPagoCheckoutPayload
) {
  const response = await API.post<MercadoPagoCheckoutResponse>(
    "/checkout/mercadopago",
    payload
  );

  return response.data;
}

export async function getOrderPaymentStatus(orderId: string) {
  const response = await API.get<OrderPaymentStatus>(
    `/orders/${orderId}/payment-status`
  );

  return response.data;
}
