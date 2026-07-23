import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaDownload,
  FaEye,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaReceipt,
  FaSearch,
  FaSyncAlt,
} from "react-icons/fa";
import {
  exportAdminPaymentsCsv,
  getAdminPaymentDetail,
  getAdminPayments,
  getAdminPaymentsChart,
  getAdminPaymentsSummary,
  refundAdminPayment,
  type AdminOrderType,
  type AdminPaymentChartPoint,
  type AdminPaymentFilters,
  type AdminPaymentRow,
  type AdminPaymentsSummary,
  type PaymentMethod,
  type PaymentProvider,
} from "../../services/admin/paymentAdminService";
import type { PaymentStatus } from "../../services/checkoutService";
import styles from "./AdminPaymentsPage.module.css";

type RangePreset = "7d" | "30d" | "month" | "custom";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card_terminal: "Terminal",
  online_checkout: "Checkout Pro",
};

const providerLabels: Record<PaymentProvider, string> = {
  none: "Sin proveedor",
  bank_transfer: "Transferencia",
  mercadopago_terminal: "Terminal Mercado Pago",
  mercadopago_checkout: "Mercado Pago Checkout Pro",
};

const statusLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Confirmado",
  failed: "Fallido",
  cancelled: "Cancelado",
  disputed: "Disputa",
  charged_back: "Contracargo",
  refunded: "Reembolsado",
};

const orderTypeLabels: Record<AdminOrderType, string> = {
  membership: "Membresia individual",
  group_membership: "Membresia grupal",
  product: "Productos",
  mixed: "Orden mixta",
};

const emptySummary: AdminPaymentsSummary = {
  grossRevenue: 0,
  approvedRefunds: 0,
  netRevenue: 0,
  paidCount: 0,
  pendingCount: 0,
  failedCount: 0,
  refundedCount: 0,
  averageTicket: 0,
  distributions: {
    method: [],
    provider: [],
    status: [],
    orderType: [],
  },
  alerts: [],
};

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : dateFormatter.format(date);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: RangePreset) {
  const now = new Date();
  const today = dateInputValue(now);

  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: dateInputValue(from), to: today };
  }

  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: dateInputValue(from), to: today };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: dateInputValue(from), to: today };
}

function randomKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export default function AdminPaymentsPage() {
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [filters, setFilters] = useState<AdminPaymentFilters>({
    ...rangeFromPreset("30d"),
    groupBy: "day",
    page: 1,
    limit: 10,
  });
  const [summary, setSummary] = useState<AdminPaymentsSummary>(emptySummary);
  const [chart, setChart] = useState<AdminPaymentChartPoint[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<unknown | null>(null);
  const [refundPayment, setRefundPayment] = useState<AdminPaymentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    }),
    [filters, pagination.limit, pagination.page]
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [summaryResult, chartResult, listResult] = await Promise.all([
        getAdminPaymentsSummary(queryFilters),
        getAdminPaymentsChart(queryFilters),
        getAdminPayments(queryFilters),
      ]);

      setSummary(summaryResult);
      setChart(chartResult);
      setPayments(listResult.payments);
      setPagination(listResult.pagination);
    } catch (error) {
      console.error("ADMIN PAYMENTS ERROR:", error);
      setErrorMessage("No se pudo cargar el panel de pagos.");
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  function updateFilter<K extends keyof AdminPaymentFilters>(
    key: K,
    value: AdminPaymentFilters[K]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function handleRangePreset(nextPreset: RangePreset) {
    setRangePreset(nextPreset);

    if (nextPreset === "custom") return;

    setFilters((current) => ({
      ...current,
      ...rangeFromPreset(nextPreset),
    }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  async function openDetail(paymentId: string) {
    setDetailLoading(true);
    setSelectedPayment(null);

    try {
      setSelectedPayment(await getAdminPaymentDetail(paymentId));
    } catch (error) {
      console.error("PAYMENT DETAIL ERROR:", error);
      setErrorMessage("No se pudo cargar el detalle del pago.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function exportCsv() {
    try {
      const csv = await exportAdminPaymentsCsv(queryFilters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `pagos-titanium-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PAYMENTS CSV ERROR:", error);
      setErrorMessage("No se pudo exportar el CSV.");
    }
  }

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!refundPayment) return;

    setRefundSubmitting(true);
    setErrorMessage(null);

    try {
      await refundAdminPayment(refundPayment.id, {
        amount: refundAmount.trim() || null,
        reason: refundReason.trim() || null,
        idempotencyKey: randomKey(),
      });
      setRefundPayment(null);
      setRefundAmount("");
      setRefundReason("");
      await loadPayments();
    } catch (error) {
      console.error("REFUND PAYMENT ERROR:", error);
      setErrorMessage("No se pudo registrar el reembolso.");
    } finally {
      setRefundSubmitting(false);
    }
  }

  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd =
    pagination.total === 0
      ? 0
      : Math.min(pagination.total, rangeStart + payments.length - 1);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Ingresos</span>
          <h1>Pagos e ingresos</h1>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void exportCsv()}
          >
            <FaDownload />
            CSV
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void loadPayments()}
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      <section className={styles.filters}>
        <div className={styles.segmented}>
          {[
            ["7d", "7 dias"],
            ["30d", "30 dias"],
            ["month", "Mes actual"],
            ["custom", "Rango"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={rangePreset === value ? styles.segmentActive : ""}
              onClick={() => handleRangePreset(value as RangePreset)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className={styles.field}>
          <span>Desde</span>
          <input
            type="date"
            value={filters.from || ""}
            onChange={(event) => {
              setRangePreset("custom");
              updateFilter("from", event.target.value);
            }}
          />
        </label>

        <label className={styles.field}>
          <span>Hasta</span>
          <input
            type="date"
            value={filters.to || ""}
            onChange={(event) => {
              setRangePreset("custom");
              updateFilter("to", event.target.value);
            }}
          />
        </label>

        <label className={styles.searchField}>
          <FaSearch />
          <input
            type="search"
            value={filters.search || ""}
            placeholder="Buscar orden, recibo, correo o pago"
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>
      </section>

      <section className={styles.filters}>
        <select
          value={filters.status || ""}
          onChange={(event) =>
            updateFilter("status", event.target.value as PaymentStatus | "")
          }
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.method || ""}
          onChange={(event) =>
            updateFilter("method", event.target.value as PaymentMethod | "")
          }
        >
          <option value="">Todos los metodos</option>
          {Object.entries(methodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.provider || ""}
          onChange={(event) =>
            updateFilter("provider", event.target.value as PaymentProvider | "")
          }
        >
          <option value="">Todos los proveedores</option>
          {Object.entries(providerLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.orderType || ""}
          onChange={(event) =>
            updateFilter("orderType", event.target.value as AdminOrderType | "")
          }
        >
          <option value="">Todos los tipos</option>
          {Object.entries(orderTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.groupBy || "day"}
          onChange={(event) =>
            updateFilter("groupBy", event.target.value as "day" | "week" | "month")
          }
        >
          <option value="day">Dia</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
        </select>
      </section>

      {errorMessage ? <div className={styles.feedback}>{errorMessage}</div> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <FaMoneyBillWave />
          <span>Ingresos brutos</span>
          <strong>{formatCurrency(summary.grossRevenue)}</strong>
        </article>
        <article className={styles.statCard}>
          <FaFileInvoiceDollar />
          <span>Ingresos netos</span>
          <strong>{formatCurrency(summary.netRevenue)}</strong>
        </article>
        <article className={styles.statCard}>
          <FaReceipt />
          <span>Reembolsos</span>
          <strong>{formatCurrency(summary.approvedRefunds)}</strong>
        </article>
        <article className={styles.statCard}>
          <FaMoneyBillWave />
          <span>Confirmados</span>
          <strong>{summary.paidCount}</strong>
        </article>
        <article className={styles.statCard}>
          <FaExclamationTriangle />
          <span>Pendientes</span>
          <strong>{summary.pendingCount}</strong>
        </article>
        <article className={styles.statCard}>
          <FaFileInvoiceDollar />
          <span>Ticket promedio</span>
          <strong>{formatCurrency(summary.averageTicket)}</strong>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Grafica</span>
            <h2>Ingresos por periodo</h2>
          </div>
        </div>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? formatCurrency(value) : value
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="grossRevenue"
                name="Ingresos brutos"
                stroke="#b91c1c"
                fill="#fee2e2"
              />
              <Area
                type="monotone"
                dataKey="netRevenue"
                name="Ingresos netos"
                stroke="#166534"
                fill="#dcfce7"
              />
              <Area
                type="monotone"
                dataKey="refunds"
                name="Reembolsos"
                stroke="#b45309"
                fill="#fef3c7"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.alertGrid}>
        {summary.alerts.map((alert) => (
          <article
            key={alert.key}
            className={`${styles.alertCard} ${styles[alert.severity]}`}
          >
            <span>{alert.label}</span>
            <strong>{alert.count}</strong>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Tabla</span>
            <h2>Pagos</h2>
          </div>
          <p>
            {rangeStart} - {rangeEnd} de {pagination.total}
          </p>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Orden</th>
                <th>Tipo</th>
                <th>Metodo</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Recibo</th>
                <th>Reembolso</th>
                <th>Neto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles.emptyRow} colSpan={12}>
                    Cargando pagos...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td className={styles.emptyRow} colSpan={12}>
                    No hay pagos para mostrar.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <strong>{payment.customer.email}</strong>
                    </td>
                    <td>{payment.order?.orderNumber || "Sin orden"}</td>
                    <td>{orderTypeLabels[payment.orderType]}</td>
                    <td>{methodLabels[payment.method]}</td>
                    <td>{providerLabels[payment.provider]}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    </td>
                    <td>{payment.receipt?.folio || "Sin recibo"}</td>
                    <td>{formatCurrency(payment.refundedAmount)}</td>
                    <td>{formatCurrency(payment.netAmount)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => void openDetail(payment.id)}
                          title="Detalle"
                        >
                          <FaEye />
                        </button>
                        {payment.status === "paid" ? (
                          <button
                            type="button"
                            className={styles.refundBtn}
                            onClick={() => setRefundPayment(payment)}
                          >
                            Reembolso
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((current) => ({ ...current, page: current.page - 1 }))
            }
          >
            Anterior
          </button>
          <span>
            Pagina {pagination.total === 0 ? 0 : pagination.page} de{" "}
            {pagination.total === 0 ? 0 : pagination.pages}
          </span>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={pagination.page >= pagination.pages}
            onClick={() =>
              setPagination((current) => ({ ...current, page: current.page + 1 }))
            }
          >
            Siguiente
          </button>
        </div>
      </section>

      {detailLoading || selectedPayment ? (
        <div className={styles.drawer}>
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHeader}>
              <h2>Detalle de pago</h2>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setSelectedPayment(null)}
              >
                Cerrar
              </button>
            </div>
            <pre>{detailLoading ? "Cargando..." : JSON.stringify(selectedPayment, null, 2)}</pre>
          </div>
        </div>
      ) : null}

      {refundPayment ? (
        <div className={styles.drawer}>
          <form className={styles.refundPanel} onSubmit={submitRefund}>
            <div className={styles.drawerHeader}>
              <h2>Registrar reembolso</h2>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setRefundPayment(null)}
              >
                Cerrar
              </button>
            </div>
            <p>
              {refundPayment.order?.orderNumber || refundPayment.id} -{" "}
              {formatCurrency(refundPayment.netAmount)}
            </p>
            <label className={styles.field}>
              <span>Monto</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                placeholder={String(refundPayment.netAmount)}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Motivo</span>
              <textarea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={refundSubmitting}
            >
              {refundSubmitting ? "Procesando..." : "Confirmar reembolso"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
