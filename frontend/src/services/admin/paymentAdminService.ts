import { API } from "../../api/api";
import type { PaymentStatus } from "../checkoutService";

export type PaymentMethod =
  | "cash"
  | "transfer"
  | "card_terminal"
  | "online_checkout";
export type PaymentProvider =
  | "none"
  | "bank_transfer"
  | "mercadopago_terminal"
  | "mercadopago_checkout";
export type AdminOrderType =
  | "membership"
  | "group_membership"
  | "product"
  | "mixed";

export type AdminPaymentFilters = {
  from?: string;
  to?: string;
  provider?: PaymentProvider | "";
  method?: PaymentMethod | "";
  status?: PaymentStatus | "";
  orderType?: AdminOrderType | "";
  search?: string;
  groupBy?: "day" | "week" | "month";
  page?: number;
  limit?: number;
};

export type AdminPaymentDistribution = {
  key: string;
  label: string;
  count: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
};

export type AdminPaymentAlert = {
  key: string;
  label: string;
  count: number;
  severity: "ok" | "warning" | "critical";
};

export type AdminPaymentsSummary = {
  grossRevenue: number;
  approvedRefunds: number;
  netRevenue: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  averageTicket: number;
  distributions: {
    method: AdminPaymentDistribution[];
    provider: AdminPaymentDistribution[];
    status: AdminPaymentDistribution[];
    orderType: AdminPaymentDistribution[];
  };
  alerts: AdminPaymentAlert[];
};

export type AdminPaymentChartPoint = {
  period: string;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  payments: number;
};

export type AdminPaymentRow = {
  id: string;
  date: string;
  customer: {
    id: string;
    email: string;
    name: string;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    channel: string;
  } | null;
  orderType: AdminOrderType;
  method: PaymentMethod;
  provider: PaymentProvider;
  amount: number;
  grossAmount: number;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  providerPreferenceId?: string | null;
  receipt: {
    id: string;
    folio: string;
    status: string;
  } | null;
  refundedAmount: number;
  netAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentsListResponse = {
  ok: boolean;
  payments: AdminPaymentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AdminPaymentsSummaryResponse = {
  ok: boolean;
  summary: AdminPaymentsSummary;
};

export type AdminPaymentsChartResponse = {
  ok: boolean;
  chart: AdminPaymentChartPoint[];
};

export type AdminPaymentDetailResponse = {
  ok: boolean;
  payment: unknown;
};

export type AdminRefundPaymentPayload = {
  amount?: number | string | null;
  reason?: string | null;
  idempotencyKey: string;
};

function buildParams(filters: AdminPaymentFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value != null && value !== "")
  );
}

export async function getAdminPaymentsSummary(filters: AdminPaymentFilters) {
  const response = await API.get<AdminPaymentsSummaryResponse>(
    "/admin/payments/summary",
    {
      params: buildParams(filters),
    }
  );

  return response.data.summary;
}

export async function getAdminPaymentsChart(filters: AdminPaymentFilters) {
  const response = await API.get<AdminPaymentsChartResponse>(
    "/admin/payments/chart",
    {
      params: buildParams(filters),
    }
  );

  return response.data.chart;
}

export async function getAdminPayments(filters: AdminPaymentFilters) {
  const response = await API.get<AdminPaymentsListResponse>("/admin/payments", {
    params: buildParams(filters),
  });

  return response.data;
}

export async function getAdminPaymentDetail(paymentId: string) {
  const response = await API.get<AdminPaymentDetailResponse>(
    `/admin/payments/${paymentId}`
  );

  return response.data.payment;
}

export async function refundAdminPayment(
  paymentId: string,
  payload: AdminRefundPaymentPayload
) {
  const response = await API.post(`/admin/payments/${paymentId}/refund`, payload);

  return response.data;
}

export async function exportAdminPaymentsCsv(filters: AdminPaymentFilters) {
  const response = await API.get<string>("/admin/payments/export", {
    params: buildParams(filters),
    responseType: "text",
  });

  return response.data;
}
