import { API } from "../../api/api";
import type { PaymentStatus } from "../checkoutService";

export type PaymentReviewStatus = Extract<
  PaymentStatus,
  "disputed" | "charged_back"
>;

export type AdminChargebackOrderItem = {
  id: string;
  itemType: "product" | "membership" | "group_membership";
  productId?: number | null;
  membershipPlanId?: string | null;
  quantity: number;
  itemNameSnapshot?: string | null;
  itemDescriptionSnapshot?: string | null;
  subtotal?: string | number | null;
};

export type AdminChargebackPayment = {
  id: string;
  orderId: string | null;
  amount: string | number;
  currency: string;
  method: string;
  status: PaymentReviewStatus;
  provider: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  updatedAt?: string;
  createdAt?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    channel: string;
    total: string | number;
    items?: AdminChargebackOrderItem[];
  } | null;
  review?: {
    required: boolean;
    reason: string;
    receivedAt?: string | null;
  } | null;
};

export type AdminChargebacksResponse = {
  ok: boolean;
  payments: AdminChargebackPayment[];
  summary?: {
    total: number;
    disputed: number;
    chargedBack: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getAdminChargebacks() {
  const response = await API.get<AdminChargebacksResponse>(
    "/admin/payments/chargebacks",
    {
      params: {
        limit: 100,
      },
    }
  );

  return response.data;
}
