import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import {
  InventoryMovement,
  MembershipPlan,
  Order,
  OrderItem,
  Payment,
  PaymentRefund,
  PaymentWebhookEvent,
  Receipt,
  SubscriptionGroup,
  SubscriptionGroupMember,
  User,
  UserSubscription,
} from "../models/index.js";

const PAYMENT_STATUSES = new Set([
  "pending",
  "paid",
  "failed",
  "cancelled",
  "disputed",
  "charged_back",
  "refunded",
]);
const PAYMENT_METHODS = new Set([
  "cash",
  "transfer",
  "card_terminal",
  "online_checkout",
]);
const PAYMENT_PROVIDERS = new Set([
  "none",
  "bank_transfer",
  "mercadopago_terminal",
  "mercadopago_checkout",
]);
const ORDER_TYPES = new Set([
  "membership",
  "group_membership",
  "product",
  "mixed",
]);
const FINANCIAL_PAYMENT_STATUSES = ["paid"];
const CHART_GROUPS = new Map([
  ["day", "day"],
  ["week", "week"],
  ["month", "month"],
]);
const CSV_COLUMNS = [
  "Fecha",
  "Cliente",
  "Correo",
  "Orden",
  "Pago",
  "Proveedor",
  "Metodo",
  "Monto bruto",
  "Monto reembolsado",
  "Monto neto",
  "Estado",
  "Recibo",
];

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeNullableString(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function normalizePagination(query = {}) {
  const page = Math.max(Number.parseInt(query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit || "20", 10), 1),
    100
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function parseList(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEnumList(value, allowed, label) {
  const values = parseList(value);

  for (const item of values) {
    if (!allowed.has(item)) {
      throw serviceError(`${label} invalido: ${item}`);
    }
  }

  return values;
}

function normalizeDate(value, label, endOfDay = false) {
  const normalized = normalizeNullableString(value);
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw serviceError(`${label} no es una fecha valida.`);
  }

  return date;
}

function reportingTimezone() {
  return (
    normalizeNullableString(process.env.REPORT_TIMEZONE) ||
    normalizeNullableString(process.env.TZ) ||
    "America/Mexico_City"
  );
}

function orderTypesCte() {
  return `
    order_types AS (
      SELECT
        "orderId",
        CASE
          WHEN bool_or("itemType" = 'product')
            AND bool_or("itemType" IN ('membership', 'group_membership'))
            THEN 'mixed'
          WHEN bool_or("itemType" = 'group_membership') THEN 'group_membership'
          WHEN bool_or("itemType" = 'membership') THEN 'membership'
          WHEN bool_or("itemType" = 'product') THEN 'product'
          ELSE 'mixed'
        END AS "orderType"
      FROM "core"."OrderItems"
      GROUP BY "orderId"
    )
  `;
}

function refundTotalsCte() {
  return `
    refund_totals AS (
      SELECT
        "paymentId",
        COALESCE(SUM("amount"), 0)::numeric(12, 2) AS "approvedRefunds"
      FROM "core"."PaymentRefunds"
      WHERE "status" = 'approved'
      GROUP BY "paymentId"
    )
  `;
}

function receiptByPaymentCte() {
  return `
    receipt_by_payment AS (
      SELECT DISTINCT ON ("paymentId")
        "paymentId",
        "id" AS "receiptId",
        "folio" AS "receiptFolio",
        "status" AS "receiptStatus"
      FROM "core"."Receipts"
      WHERE "paymentId" IS NOT NULL
      ORDER BY "paymentId", "createdAt" DESC
    )
  `;
}

function paymentBaseCte(whereSql = "TRUE") {
  return `
    payment_base AS (
      SELECT
        p.*,
        COALESCE(ot."orderType", p."paymentType", 'mixed') AS "orderType",
        COALESCE(p."approvedAt", p."paidAt", p."createdAt") AS "financialDate"
      FROM "core"."Payments" p
      LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
      WHERE ${whereSql}
    )
  `;
}

function buildPaymentFilterSql(query = {}, { alias = "p", includeSearch = false } = {}) {
  const replacements = {};
  const clauses = [];
  const from = normalizeDate(query.from || query.dateFrom, "Fecha inicial");
  const to = normalizeDate(query.to || query.dateTo, "Fecha final", true);
  const statuses = normalizeEnumList(query.status, PAYMENT_STATUSES, "Estado");
  const methods = normalizeEnumList(query.method, PAYMENT_METHODS, "Metodo");
  const providers = normalizeEnumList(query.provider, PAYMENT_PROVIDERS, "Proveedor");
  const orderTypes = normalizeEnumList(query.orderType, ORDER_TYPES, "Tipo de orden");
  const financialDate = `COALESCE(${alias}."approvedAt", ${alias}."paidAt", ${alias}."createdAt")`;

  if (from) {
    replacements.from = from;
    clauses.push(`${financialDate} >= :from`);
  }

  if (to) {
    replacements.to = to;
    clauses.push(`${financialDate} <= :to`);
  }

  if (statuses.length > 0) {
    replacements.statuses = statuses;
    clauses.push(`${alias}."status" IN (:statuses)`);
  }

  if (methods.length > 0) {
    replacements.methods = methods;
    clauses.push(`${alias}."method" IN (:methods)`);
  }

  if (providers.length > 0) {
    replacements.providers = providers;
    clauses.push(`${alias}."provider" IN (:providers)`);
  }

  if (orderTypes.length > 0) {
    replacements.orderTypes = orderTypes;
    clauses.push(`COALESCE(ot."orderType", ${alias}."paymentType", 'mixed') IN (:orderTypes)`);
  }

  const search = normalizeNullableString(query.search || query.q);

  if (includeSearch && search) {
    replacements.search = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    clauses.push(`
      (
        CAST(${alias}."id" AS TEXT) ILIKE :search ESCAPE '\\'
        OR COALESCE(${alias}."providerPaymentId", '') ILIKE :search ESCAPE '\\'
        OR COALESCE(${alias}."providerPreferenceId", '') ILIKE :search ESCAPE '\\'
        OR COALESCE(${alias}."externalReference", '') ILIKE :search ESCAPE '\\'
        OR COALESCE(o."orderNumber", '') ILIKE :search ESCAPE '\\'
        OR COALESCE(r."receiptFolio", '') ILIKE :search ESCAPE '\\'
        OR COALESCE(u."email", '') ILIKE :search ESCAPE '\\'
      )
    `);
  }

  return {
    whereSql: clauses.length > 0 ? clauses.join(" AND ") : "TRUE",
    replacements,
  };
}

function buildRefundFilterSql(
  query = {},
  {
    paymentAlias = "p",
    refundAlias = "pr",
    includeSearch = false,
    prefix = "refund",
  } = {}
) {
  const replacements = {};
  const clauses = [];
  const from = normalizeDate(query.from || query.dateFrom, "Fecha inicial");
  const to = normalizeDate(query.to || query.dateTo, "Fecha final", true);
  const statuses = normalizeEnumList(query.status, PAYMENT_STATUSES, "Estado");
  const methods = normalizeEnumList(query.method, PAYMENT_METHODS, "Metodo");
  const providers = normalizeEnumList(
    query.provider,
    PAYMENT_PROVIDERS,
    "Proveedor"
  );
  const orderTypes = normalizeEnumList(
    query.orderType,
    ORDER_TYPES,
    "Tipo de orden"
  );
  const refundDate = `COALESCE(${refundAlias}."approvedAt", ${refundAlias}."createdAt")`;

  if (from) {
    replacements[`${prefix}From`] = from;
    clauses.push(`${refundDate} >= :${prefix}From`);
  }

  if (to) {
    replacements[`${prefix}To`] = to;
    clauses.push(`${refundDate} <= :${prefix}To`);
  }

  if (statuses.length > 0) {
    replacements[`${prefix}PaymentStatuses`] = statuses;
    clauses.push(`${paymentAlias}."status" IN (:${prefix}PaymentStatuses)`);
  }

  if (methods.length > 0) {
    replacements[`${prefix}Methods`] = methods;
    clauses.push(`${paymentAlias}."method" IN (:${prefix}Methods)`);
  }

  if (providers.length > 0) {
    replacements[`${prefix}Providers`] = providers;
    clauses.push(`${paymentAlias}."provider" IN (:${prefix}Providers)`);
  }

  if (orderTypes.length > 0) {
    replacements[`${prefix}OrderTypes`] = orderTypes;
    clauses.push(
      `COALESCE(ot."orderType", ${paymentAlias}."paymentType", 'mixed') IN (:${prefix}OrderTypes)`
    );
  }

  const search = normalizeNullableString(query.search || query.q);

  if (includeSearch && search) {
    replacements[`${prefix}Search`] = `%${search
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_")}%`;
    clauses.push(`
      (
        CAST(${paymentAlias}."id" AS TEXT) ILIKE :${prefix}Search ESCAPE '\\'
        OR COALESCE(${paymentAlias}."providerPaymentId", '') ILIKE :${prefix}Search ESCAPE '\\'
        OR COALESCE(${paymentAlias}."providerPreferenceId", '') ILIKE :${prefix}Search ESCAPE '\\'
        OR COALESCE(${paymentAlias}."externalReference", '') ILIKE :${prefix}Search ESCAPE '\\'
      )
    `);
  }

  return {
    whereSql: clauses.length > 0 ? clauses.join(" AND ") : "TRUE",
    replacements,
  };
}

function serializePaymentRow(row) {
  const grossAmount = FINANCIAL_PAYMENT_STATUSES.includes(row.status)
    ? toNumber(row.amount)
    : 0;
  const refundedAmount = toNumber(row.approvedRefunds);
  const netAmount = Math.round((grossAmount - refundedAmount) * 100) / 100;

  return {
    id: row.id,
    date: row.financialDate,
    customer: {
      id: row.userId,
      email: row.userEmail,
      name: row.userEmail,
    },
    order: row.orderId
      ? {
          id: row.orderId,
          orderNumber: row.orderNumber,
          status: row.orderStatus,
          channel: row.orderChannel,
        }
      : null,
    orderType: row.orderType,
    method: row.method,
    provider: row.provider,
    amount: toNumber(row.amount),
    grossAmount,
    status: row.status,
    providerPaymentId: row.providerPaymentId,
    providerPreferenceId: row.providerPreferenceId,
    receipt: row.receiptId
      ? {
          id: row.receiptId,
          folio: row.receiptFolio,
          status: row.receiptStatus,
        }
      : null,
    refundedAmount,
    netAmount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeDistributionRow(row) {
  const grossRevenue = toNumber(row.grossRevenue);
  const refunds = toNumber(row.refunds);

  return {
    key: row.key || "unknown",
    label: row.key || "Sin dato",
    count: Number(row.count || 0),
    grossRevenue,
    refunds,
    netRevenue: Math.round((grossRevenue - refunds) * 100) / 100,
  };
}

async function groupedDistribution({ groupExpression, query }) {
  const { whereSql, replacements } = buildPaymentFilterSql(query);
  const { whereSql: refundWhereSql, replacements: refundReplacements } =
    buildRefundFilterSql(query);
  const refundGroupExpression =
    groupExpression === 'pb."orderType"'
      ? `COALESCE(ot."orderType", p."paymentType", 'mixed')`
      : groupExpression.replaceAll("pb.", "p.");
  const rows = await sequelize.query(
    `
    WITH
      ${orderTypesCte()},
      ${paymentBaseCte(whereSql)},
      payment_groups AS (
        SELECT
          ${groupExpression}::text AS "key",
          COUNT(*)::int AS "count",
          COALESCE(SUM(
            CASE
              WHEN pb."status" = 'paid' THEN pb."amount"
              ELSE 0
            END
          ), 0)::numeric(12, 2) AS "grossRevenue"
        FROM payment_base pb
        GROUP BY ${groupExpression}
      ),
      refund_groups AS (
        SELECT
          ${refundGroupExpression}::text AS "key",
          COALESCE(SUM(pr."amount"), 0)::numeric(12, 2) AS "refunds"
        FROM "core"."PaymentRefunds" pr
        INNER JOIN "core"."Payments" p ON p."id" = pr."paymentId"
        LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
        WHERE pr."status" = 'approved'
          AND ${refundWhereSql}
        GROUP BY ${refundGroupExpression}
      )
    SELECT
      COALESCE(pg."key", rg."key") AS "key",
      COALESCE(pg."count", 0)::int AS "count",
      COALESCE(pg."grossRevenue", 0)::numeric(12, 2) AS "grossRevenue",
      COALESCE(rg."refunds", 0)::numeric(12, 2) AS "refunds"
    FROM payment_groups pg
    FULL OUTER JOIN refund_groups rg
      ON COALESCE(rg."key", '__null__') = COALESCE(pg."key", '__null__')
    ORDER BY "count" DESC, "key" ASC;
    `,
    {
      replacements: {
        ...replacements,
        ...refundReplacements,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows.map(serializeDistributionRow);
}

export async function getAdminPaymentsSummary(query = {}) {
  const { whereSql, replacements } = buildPaymentFilterSql(query);
  const { whereSql: refundWhereSql, replacements: refundReplacements } =
    buildRefundFilterSql(query);
  const [summary] = await sequelize.query(
    `
    WITH
      ${orderTypesCte()},
      ${paymentBaseCte(whereSql)}
    SELECT
      COALESCE(SUM(
        CASE
          WHEN "status" = 'paid' THEN "amount"
          ELSE 0
        END
      ), 0)::numeric(12, 2) AS "grossRevenue",
      COUNT(*) FILTER (WHERE "status" = 'paid')::int AS "paidCount",
      COUNT(*) FILTER (WHERE "status" = 'pending')::int AS "pendingCount",
      COUNT(*) FILTER (WHERE "status" = 'failed')::int AS "failedCount",
      COUNT(*) FILTER (WHERE "status" = 'refunded')::int AS "refundedCount",
      COUNT(*) FILTER (WHERE "status" = 'paid')::int AS "confirmedCount"
    FROM payment_base pb;
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );
  const [refundSummary] = await sequelize.query(
    `
    WITH ${orderTypesCte()}
    SELECT
      COALESCE(SUM(pr."amount"), 0)::numeric(12, 2) AS "approvedRefunds"
    FROM "core"."PaymentRefunds" pr
    INNER JOIN "core"."Payments" p ON p."id" = pr."paymentId"
    LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
    WHERE pr."status" = 'approved'
      AND ${refundWhereSql};
    `,
    {
      replacements: refundReplacements,
      type: QueryTypes.SELECT,
    }
  );
  const grossRevenue = toNumber(summary?.grossRevenue);
  const approvedRefunds = toNumber(refundSummary?.approvedRefunds);
  const confirmedCount = Number(summary?.confirmedCount || 0);
  const alerts = await getAdminPaymentsAlerts(query);

  return {
    grossRevenue,
    approvedRefunds,
    netRevenue: Math.round((grossRevenue - approvedRefunds) * 100) / 100,
    paidCount: Number(summary?.paidCount || 0),
    pendingCount: Number(summary?.pendingCount || 0),
    failedCount: Number(summary?.failedCount || 0),
    refundedCount: Number(summary?.refundedCount || 0),
    averageTicket:
      confirmedCount > 0
        ? Math.round((grossRevenue / confirmedCount) * 100) / 100
        : 0,
    distributions: {
      method: await groupedDistribution({
        groupExpression: 'pb."method"',
        query,
      }),
      provider: await groupedDistribution({
        groupExpression: 'pb."provider"',
        query,
      }),
      status: await groupedDistribution({
        groupExpression: 'pb."status"',
        query,
      }),
      orderType: await groupedDistribution({
        groupExpression: 'pb."orderType"',
        query,
      }),
    },
    alerts,
  };
}

export async function getAdminPaymentsChart(query = {}) {
  const groupBy = CHART_GROUPS.get(String(query.groupBy || "day")) || "day";
  const timezone = reportingTimezone();
  const { whereSql, replacements } = buildPaymentFilterSql(query);
  const { whereSql: refundWhereSql, replacements: refundReplacements } =
    buildRefundFilterSql(query);
  const paymentPeriod = `DATE_TRUNC('${groupBy}', pb."financialDate" AT TIME ZONE :timezone)::date`;
  const refundDate = `COALESCE(pr."approvedAt", pr."createdAt")`;

  const rows = await sequelize.query(
    `
    WITH
      ${orderTypesCte()},
      ${paymentBaseCte(whereSql)},
      payment_periods AS (
        SELECT
          ${paymentPeriod} AS "period",
          COALESCE(SUM(
            CASE
              WHEN pb."status" = 'paid' THEN pb."amount"
              ELSE 0
            END
          ), 0)::numeric(12, 2) AS "grossRevenue",
          COUNT(*) FILTER (WHERE pb."status" = 'paid')::int AS "payments"
        FROM payment_base pb
        GROUP BY ${paymentPeriod}
      ),
      refund_periods AS (
        SELECT
          DATE_TRUNC('${groupBy}', ${refundDate} AT TIME ZONE :timezone)::date AS "period",
          COALESCE(SUM(pr."amount"), 0)::numeric(12, 2) AS "refunds"
        FROM "core"."PaymentRefunds" pr
        INNER JOIN "core"."Payments" p ON p."id" = pr."paymentId"
        LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
        WHERE pr."status" = 'approved'
          AND ${refundWhereSql}
        GROUP BY DATE_TRUNC('${groupBy}', ${refundDate} AT TIME ZONE :timezone)::date
      )
    SELECT
      COALESCE(pp."period", rp."period")::text AS "period",
      COALESCE(pp."grossRevenue", 0)::numeric(12, 2) AS "grossRevenue",
      COALESCE(rp."refunds", 0)::numeric(12, 2) AS "refunds",
      (COALESCE(pp."grossRevenue", 0) - COALESCE(rp."refunds", 0))::numeric(12, 2) AS "netRevenue",
      COALESCE(pp."payments", 0)::int AS "payments"
    FROM payment_periods pp
    FULL OUTER JOIN refund_periods rp ON rp."period" = pp."period"
    ORDER BY "period" ASC;
    `,
    {
      replacements: {
        ...replacements,
        ...refundReplacements,
        timezone,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows.map((row) => ({
    period: row.period,
    grossRevenue: toNumber(row.grossRevenue),
    refunds: toNumber(row.refunds),
    netRevenue: toNumber(row.netRevenue),
    payments: Number(row.payments || 0),
  }));
}

export async function listAdminPaymentsReport(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, replacements } = buildPaymentFilterSql(query, {
    includeSearch: true,
  });
  const baseCtes = `
    WITH
      ${orderTypesCte()},
      ${refundTotalsCte()},
      ${receiptByPaymentCte()}
  `;
  const fromSql = `
    FROM "core"."Payments" p
    LEFT JOIN "core"."Orders" o ON o."id" = p."orderId"
    LEFT JOIN "core"."Users" u ON u."id" = p."userId"
    LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
    LEFT JOIN refund_totals rt ON rt."paymentId" = p."id"
    LEFT JOIN receipt_by_payment r ON r."paymentId" = p."id"
    WHERE ${whereSql}
  `;
  const rows = await sequelize.query(
    `
    ${baseCtes}
    SELECT
      p."id",
      p."userId",
      p."orderId",
      p."amount",
      p."method",
      p."provider",
      p."status",
      p."providerPaymentId",
      p."providerPreferenceId",
      p."createdAt",
      p."updatedAt",
      COALESCE(p."approvedAt", p."paidAt", p."createdAt") AS "financialDate",
      COALESCE(ot."orderType", p."paymentType", 'mixed') AS "orderType",
      COALESCE(rt."approvedRefunds", 0)::numeric(12, 2) AS "approvedRefunds",
      o."orderNumber",
      o."status" AS "orderStatus",
      o."channel" AS "orderChannel",
      u."email" AS "userEmail",
      r."receiptId",
      r."receiptFolio",
      r."receiptStatus"
    ${fromSql}
    ORDER BY COALESCE(p."approvedAt", p."paidAt", p."createdAt") DESC, p."createdAt" DESC
    LIMIT :limit OFFSET :offset;
    `,
    {
      replacements: {
        ...replacements,
        limit,
        offset,
      },
      type: QueryTypes.SELECT,
    }
  );
  const [countRow] = await sequelize.query(
    `
    ${baseCtes}
    SELECT COUNT(*)::int AS "count"
    ${fromSql};
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );
  const total = Number(countRow?.count || 0);

  return {
    payments: rows.map(serializePaymentRow),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

function csvValue(value) {
  if (value == null) return "";

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export async function exportAdminPaymentsCsv(query = {}) {
  const result = await listAdminPaymentsReport({
    ...query,
    page: 1,
    limit: Math.min(Number(query.limit || 10000), 10000),
  });
  const lines = [CSV_COLUMNS.map(csvValue).join(",")];

  for (const payment of result.payments) {
    lines.push(
      [
        payment.date,
        payment.customer.name,
        payment.customer.email,
        payment.order?.orderNumber || "",
        payment.id,
        payment.provider,
        payment.method,
        payment.grossAmount.toFixed(2),
        payment.refundedAmount.toFixed(2),
        payment.netAmount.toFixed(2),
        payment.status,
        payment.receipt?.folio || "",
      ]
        .map(csvValue)
        .join(",")
    );
  }

  return lines.join("\r\n");
}

function redactSensitiveMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveMetadata);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (
          /access.?token|secret|signature|xsignature|password|card|cvv|token/i.test(
            key
          )
        ) {
          return [key, "[redacted]"];
        }

        return [key, redactSensitiveMetadata(item)];
      })
    );
  }

  return value;
}

export async function getAdminPaymentDetail(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    include: [
      {
        model: Order,
        as: "order",
        required: false,
        include: [
          {
            model: OrderItem,
            as: "items",
            required: false,
            include: [
              {
                model: MembershipPlan,
                as: "membershipPlan",
                required: false,
              },
              {
                model: InventoryMovement,
                as: "inventoryMovements",
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "role"],
        required: false,
      },
      {
        model: Receipt,
        as: "receipt",
        required: false,
      },
      {
        model: PaymentRefund,
        as: "refunds",
        attributes: [
          "id",
          "paymentId",
          "orderId",
          "providerRefundId",
          "amount",
          "reason",
          "status",
          "requestedBy",
          "requestedAt",
          "approvedAt",
          "metadata",
          "createdAt",
          "updatedAt",
        ],
        required: false,
      },
      {
        model: PaymentWebhookEvent,
        as: "webhookEvents",
        required: false,
      },
      {
        model: UserSubscription,
        as: "subscriptions",
        required: false,
      },
      {
        model: SubscriptionGroup,
        as: "subscriptionGroup",
        required: false,
        include: [
          {
            model: SubscriptionGroupMember,
            as: "members",
            required: false,
          },
        ],
      },
    ],
    order: [
      [{ model: PaymentWebhookEvent, as: "webhookEvents" }, "createdAt", "DESC"],
      [{ model: PaymentRefund, as: "refunds" }, "createdAt", "DESC"],
    ],
  });

  if (!payment) {
    throw serviceError("Pago no encontrado.", 404);
  }

  const plain = payment.get({ plain: true });

  return redactSensitiveMetadata(plain);
}

export async function listAdminRefunds(query = {}) {
  const { page, limit, offset } = normalizePagination(query);
  const { whereSql, replacements } = buildRefundFilterSql(query, {
    includeSearch: false,
  });
  const refundStatus = normalizeEnumList(
    query.refundStatus,
    new Set(["pending", "approved", "failed", "cancelled"]),
    "Estado de reembolso"
  );
  const refundClauses = [whereSql];

  if (refundStatus.length > 0) {
    replacements.refundStatuses = refundStatus;
    refundClauses.push('pr."status" IN (:refundStatuses)');
  }

  const refundWhere = refundClauses.join(" AND ");
  const rows = await sequelize.query(
    `
    WITH ${orderTypesCte()}
    SELECT
      pr."id",
      pr."paymentId",
      pr."orderId",
      pr."providerRefundId",
      pr."amount",
      pr."reason",
      pr."status",
      pr."requestedBy",
      pr."requestedAt",
      pr."approvedAt",
      pr."createdAt",
      p."provider",
      p."method",
      p."status" AS "paymentStatus",
      o."orderNumber",
      u."email" AS "userEmail"
    FROM "core"."PaymentRefunds" pr
    INNER JOIN "core"."Payments" p ON p."id" = pr."paymentId"
    LEFT JOIN "core"."Orders" o ON o."id" = pr."orderId"
    LEFT JOIN "core"."Users" u ON u."id" = p."userId"
    LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
    WHERE ${refundWhere}
    ORDER BY COALESCE(pr."approvedAt", pr."createdAt") DESC
    LIMIT :limit OFFSET :offset;
    `,
    {
      replacements: {
        ...replacements,
        limit,
        offset,
      },
      type: QueryTypes.SELECT,
    }
  );
  const [countRow] = await sequelize.query(
    `
    WITH ${orderTypesCte()}
    SELECT COUNT(*)::int AS "count"
    FROM "core"."PaymentRefunds" pr
    INNER JOIN "core"."Payments" p ON p."id" = pr."paymentId"
    LEFT JOIN "core"."Orders" o ON o."id" = pr."orderId"
    LEFT JOIN order_types ot ON ot."orderId" = p."orderId"
    WHERE ${refundWhere};
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );
  const total = Number(countRow?.count || 0);

  return {
    refunds: rows.map((row) => ({
      id: row.id,
      paymentId: row.paymentId,
      orderId: row.orderId,
      providerRefundId: row.providerRefundId,
      amount: toNumber(row.amount),
      reason: row.reason,
      status: row.status,
      requestedBy: row.requestedBy,
      requestedAt: row.requestedAt,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      payment: {
        provider: row.provider,
        method: row.method,
        status: row.paymentStatus,
      },
      order: row.orderNumber
        ? {
            id: row.orderId,
            orderNumber: row.orderNumber,
          }
        : null,
      user: {
        email: row.userEmail,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function countQuery(sql, replacements = {}) {
  const [row] = await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });

  return Number(row?.count || 0);
}

export async function getAdminPaymentsAlerts() {
  const oldPendingThreshold = new Date(Date.now() - 60 * 60 * 1000);
  const [
    failedWebhooks,
    inventoryErrors,
    chargebacks,
    failedRefunds,
    oldPendingOrders,
    paymentsWithoutReceipt,
    paymentsWithoutOrder,
  ] = await Promise.all([
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."PaymentWebhookEvents"
      WHERE "processingStatus" = 'failed';
    `),
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."PaymentWebhookEvents"
      WHERE "processingStatus" = 'failed'
        AND (
          COALESCE("errorMessage", '') ILIKE '%inventario%'
          OR COALESCE("errorMessage", '') ILIKE '%stock%'
          OR COALESCE("errorMessage", '') ILIKE '%inventory%'
        );
    `),
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."Payments"
      WHERE "status" IN ('disputed', 'charged_back');
    `),
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."PaymentRefunds"
      WHERE "status" = 'failed';
    `),
    countQuery(
      `
      SELECT COUNT(*)::int AS "count"
      FROM "core"."Orders"
      WHERE "status" = 'pending_payment'
        AND "createdAt" <= :oldPendingThreshold;
      `,
      { oldPendingThreshold }
    ),
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."Payments" p
      LEFT JOIN "core"."Receipts" r ON r."paymentId" = p."id"
      WHERE p."status" = 'paid'
        AND r."id" IS NULL;
    `),
    countQuery(`
      SELECT COUNT(*)::int AS "count"
      FROM "core"."Payments"
      WHERE "orderId" IS NULL;
    `),
  ]);

  return [
    {
      key: "failed_webhooks",
      label: "Webhooks fallidos",
      count: failedWebhooks,
      severity: failedWebhooks > 0 ? "critical" : "ok",
    },
    {
      key: "inventory_errors",
      label: "Pagos con error de inventario",
      count: inventoryErrors,
      severity: inventoryErrors > 0 ? "critical" : "ok",
    },
    {
      key: "chargebacks",
      label: "Contracargos o disputas",
      count: chargebacks,
      severity: chargebacks > 0 ? "warning" : "ok",
    },
    {
      key: "failed_refunds",
      label: "Reembolsos fallidos",
      count: failedRefunds,
      severity: failedRefunds > 0 ? "warning" : "ok",
    },
    {
      key: "old_pending_orders",
      label: "Ordenes pendientes por mas de una hora",
      count: oldPendingOrders,
      severity: oldPendingOrders > 0 ? "warning" : "ok",
    },
    {
      key: "payments_without_receipt",
      label: "Pagos confirmados sin recibo",
      count: paymentsWithoutReceipt,
      severity: paymentsWithoutReceipt > 0 ? "warning" : "ok",
    },
    {
      key: "payments_without_order",
      label: "Pagos sin orden asociada",
      count: paymentsWithoutOrder,
      severity: paymentsWithoutOrder > 0 ? "critical" : "ok",
    },
  ];
}
