import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { FaCheck, FaEye, FaTable, FaXmark } from "react-icons/fa6";
import styles from "./AdminClientRenewalPredictionPage.module.css";

type RenewalClass = "Renovara" | "No renovara";

type RenewalDatasetRow = {
  rowId: string;
  clientName: string;
  planName: string;
  amountPaid: number;
  paymentMethod: string;
  source: string;
  autoRenew: boolean;
  previousSubscriptionsCount: number;
  previousRenewalsCount: number;
  previousRenewalRate: number;
  daysAsCustomer: number;
  daysSincePreviousSubscription: number;
  changedPlan: boolean;
  previousAmountPaidAvg: number;
  amountPaidChange: number;
  paidOrdersCount: number;
  productsPurchasedCount: number;
  totalProductSpend: number;
  averageOrderValue: number;
  daysSinceLastPurchase: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  refundedPaymentsCount: number;
  renewedNextPeriod: boolean;
};

type ClassifiedRenewalRow = RenewalDatasetRow & {
  renewalClass: RenewalClass;
};

const demoRows: RenewalDatasetRow[] = [
  {
    rowId: "REG-001",
    clientName: "Andrea Martinez",
    planName: "Estudiante mensual",
    amountPaid: 380,
    paymentMethod: "cash",
    source: "admin_manual",
    autoRenew: true,
    previousSubscriptionsCount: 1,
    previousRenewalsCount: 0,
    previousRenewalRate: 0,
    daysAsCustomer: 90,
    daysSincePreviousSubscription: 32,
    changedPlan: false,
    previousAmountPaidAvg: 380,
    amountPaidChange: 0,
    paidOrdersCount: 0,
    productsPurchasedCount: 0,
    totalProductSpend: 0,
    averageOrderValue: 0,
    daysSinceLastPurchase: -1,
    successfulPaymentsCount: 2,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 1,
    renewedNextPeriod: true,
  },
  {
    rowId: "REG-002",
    clientName: "Carlos Reyes",
    planName: "Regular mensual",
    amountPaid: 414.03,
    paymentMethod: "transfer",
    source: "admin_manual",
    autoRenew: false,
    previousSubscriptionsCount: 0,
    previousRenewalsCount: 0,
    previousRenewalRate: 0,
    daysAsCustomer: 29,
    daysSincePreviousSubscription: -1,
    changedPlan: false,
    previousAmountPaidAvg: 0,
    amountPaidChange: 0,
    paidOrdersCount: 0,
    productsPurchasedCount: 0,
    totalProductSpend: 0,
    averageOrderValue: 0,
    daysSinceLastPurchase: -1,
    successfulPaymentsCount: 1,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 0,
    renewedNextPeriod: false,
  },
  {
    rowId: "REG-003",
    clientName: "Fernanda Ruiz",
    planName: "Regular mensual",
    amountPaid: 440,
    paymentMethod: "online_checkout",
    source: "online_checkout",
    autoRenew: true,
    previousSubscriptionsCount: 1,
    previousRenewalsCount: 0,
    previousRenewalRate: 0,
    daysAsCustomer: 94,
    daysSincePreviousSubscription: 36,
    changedPlan: false,
    previousAmountPaidAvg: 414.03,
    amountPaidChange: 25.97,
    paidOrdersCount: 3,
    productsPurchasedCount: 11,
    totalProductSpend: 5619,
    averageOrderValue: 1873,
    daysSinceLastPurchase: 23,
    successfulPaymentsCount: 2,
    failedPaymentsCount: 1,
    refundedPaymentsCount: 0,
    renewedNextPeriod: true,
  },
  {
    rowId: "REG-004",
    clientName: "Miguel Torres",
    planName: "Estudiante mensual",
    amountPaid: 380,
    paymentMethod: "cash",
    source: "admin_manual",
    autoRenew: false,
    previousSubscriptionsCount: 2,
    previousRenewalsCount: 1,
    previousRenewalRate: 0.5,
    daysAsCustomer: 121,
    daysSincePreviousSubscription: 2,
    changedPlan: false,
    previousAmountPaidAvg: 361.06,
    amountPaidChange: 18.94,
    paidOrdersCount: 1,
    productsPurchasedCount: 3,
    totalProductSpend: 2477,
    averageOrderValue: 2477,
    daysSinceLastPurchase: 20,
    successfulPaymentsCount: 3,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 1,
    renewedNextPeriod: true,
  },
  {
    rowId: "REG-005",
    clientName: "Sofia Hernandez",
    planName: "Premium mensual",
    amountPaid: 690,
    paymentMethod: "card_terminal",
    source: "admin_manual",
    autoRenew: true,
    previousSubscriptionsCount: 3,
    previousRenewalsCount: 2,
    previousRenewalRate: 0.67,
    daysAsCustomer: 184,
    daysSincePreviousSubscription: 29,
    changedPlan: true,
    previousAmountPaidAvg: 580,
    amountPaidChange: 110,
    paidOrdersCount: 4,
    productsPurchasedCount: 9,
    totalProductSpend: 3290,
    averageOrderValue: 822.5,
    daysSinceLastPurchase: 12,
    successfulPaymentsCount: 4,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 0,
    renewedNextPeriod: true,
  },
  {
    rowId: "REG-006",
    clientName: "Jorge Castillo",
    planName: "Regular mensual",
    amountPaid: 0,
    paymentMethod: "cash",
    source: "admin_manual",
    autoRenew: false,
    previousSubscriptionsCount: 1,
    previousRenewalsCount: 0,
    previousRenewalRate: 0,
    daysAsCustomer: 62,
    daysSincePreviousSubscription: 40,
    changedPlan: false,
    previousAmountPaidAvg: 440,
    amountPaidChange: -440,
    paidOrdersCount: 0,
    productsPurchasedCount: 0,
    totalProductSpend: 0,
    averageOrderValue: 0,
    daysSinceLastPurchase: -1,
    successfulPaymentsCount: 1,
    failedPaymentsCount: 2,
    refundedPaymentsCount: 0,
    renewedNextPeriod: false,
  },
  {
    rowId: "REG-007",
    clientName: "Valeria Gomez",
    planName: "Estudiante mensual",
    amountPaid: 342.12,
    paymentMethod: "card_terminal",
    source: "admin_manual",
    autoRenew: false,
    previousSubscriptionsCount: 0,
    previousRenewalsCount: 0,
    previousRenewalRate: 0,
    daysAsCustomer: 29,
    daysSincePreviousSubscription: -1,
    changedPlan: false,
    previousAmountPaidAvg: 0,
    amountPaidChange: 0,
    paidOrdersCount: 0,
    productsPurchasedCount: 0,
    totalProductSpend: 0,
    averageOrderValue: 0,
    daysSinceLastPurchase: -1,
    successfulPaymentsCount: 1,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 1,
    renewedNextPeriod: false,
  },
  {
    rowId: "REG-008",
    clientName: "Luis Mendoza",
    planName: "Premium mensual",
    amountPaid: 690,
    paymentMethod: "online_checkout",
    source: "online_checkout",
    autoRenew: true,
    previousSubscriptionsCount: 4,
    previousRenewalsCount: 3,
    previousRenewalRate: 0.75,
    daysAsCustomer: 240,
    daysSincePreviousSubscription: 28,
    changedPlan: false,
    previousAmountPaidAvg: 690,
    amountPaidChange: 0,
    paidOrdersCount: 6,
    productsPurchasedCount: 18,
    totalProductSpend: 7890,
    averageOrderValue: 1315,
    daysSinceLastPurchase: 8,
    successfulPaymentsCount: 5,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 0,
    renewedNextPeriod: true,
  },
];

function classifyRenewal(row: RenewalDatasetRow): ClassifiedRenewalRow {
  return {
    ...row,
    renewalClass: row.renewedNextPeriod ? "Renovara" : "No renovara",
  };
}

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default function AdminClientRenewalPredictionPage() {
  const [resultFilter, setResultFilter] = useState<"Todos" | RenewalClass>("Renovara");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const rows = useMemo(() => demoRows.map(classifyRenewal), []);
  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) => resultFilter === "Todos" || row.renewalClass === resultFilter,
      ),
    [resultFilter, rows],
  );

  const renewCount = rows.filter((row) => row.renewalClass === "Renovara").length;
  const noRenewCount = rows.length - renewCount;
  const visibleRenewCount = visibleRows.filter(
    (row) => row.renewalClass === "Renovara",
  ).length;
  const visibleNoRenewCount = visibleRows.length - visibleRenewCount;
  const selectedClient = selectedClientId
    ? rows.find((row) => row.rowId === selectedClientId) ?? null
    : null;
  const chartData = [
    { name: "Renovaran", value: renewCount },
    { name: "No renovaran", value: noRenewCount },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroBadge}>Clasificacion simulada</span>
        <h1>Clasificacion de renovacion</h1>
        <p>
          Vista previa basada en historial de suscripciones, pagos y compras para
          identificar si el cliente renovara en el siguiente periodo.
        </p>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.chartPanel}>
          <div className={styles.sectionTitle}>
            <span>
              <FaCheck />
            </span>
            <div>
              <h2>Resumen de renovacion</h2>
              <p>Comparacion general del resultado Si/No del dataset.</p>
            </div>
          </div>

          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={4}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <div className={styles.metricStack}>
          <article className={styles.metricCard}>
            <span className={styles.metricIconRenew}>
              <FaCheck />
            </span>
            <div>
              <span>Renovarian</span>
              <strong>{renewCount}</strong>
              <small>Registros con renovacion esperada</small>
            </div>
          </article>

          <article className={styles.metricCard}>
            <span className={styles.metricIconRisk}>
              <FaXmark />
            </span>
            <div>
              <span>No renovarian</span>
              <strong>{noRenewCount}</strong>
              <small>Registros con riesgo de no renovacion</small>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.tableHeader}>
          <div className={styles.sectionTitle}>
            <span>
              <FaTable />
            </span>
            <div>
              <h2>Clientes evaluados</h2>
              <p>
                {visibleRows.length} registros, {visibleRenewCount} renovarian y{" "}
                {visibleNoRenewCount} requieren seguimiento.
              </p>
            </div>
          </div>

          <label className={styles.tableFilter}>
            <span>Mostrar</span>
            <select
              value={resultFilter}
              onChange={(event) =>
                setResultFilter(event.target.value as "Todos" | RenewalClass)
              }
            >
              <option value="Renovara">Renovaran</option>
              <option value="No renovara">No renovaran</option>
              <option value="Todos">Todos</option>
            </select>
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Historial</th>
                <th>Compras</th>
                <th>Renovacion auto</th>
                <th>Pago</th>
                <th>Resultado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.rowId}>
                  <td>
                    <strong>{row.clientName}</strong>
                    <span>
                      {row.rowId} · {row.daysAsCustomer} dias como cliente
                    </span>
                  </td>
                  <td>
                    <strong>{row.planName}</strong>
                    <span>{row.changedPlan ? "Cambio de plan" : "Mismo plan"}</span>
                  </td>
                  <td>
                    <strong>{row.previousRenewalsCount} renovaciones</strong>
                    <span>Tasa {(row.previousRenewalRate * 100).toFixed(0)}%</span>
                  </td>
                  <td>
                    <strong>{row.productsPurchasedCount} productos</strong>
                    <span>{moneyFormatter.format(row.totalProductSpend)}</span>
                  </td>
                  <td>{row.autoRenew ? "Activada" : "Desactivada"}</td>
                  <td>
                    <strong>{moneyFormatter.format(row.amountPaid)}</strong>
                    <span>
                      {row.successfulPaymentsCount} exitosos / {row.failedPaymentsCount} fallidos
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.resultPill} ${
                        row.renewalClass === "Renovara"
                          ? styles.resultRenew
                          : styles.resultNoRenew
                      }`}
                    >
                      {row.renewalClass === "Renovara" ? <FaCheck /> : <FaXmark />}
                      {row.renewalClass}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.detailBtn}
                      onClick={() => setSelectedClientId(row.rowId)}
                    >
                      <FaEye />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedClient && (
        <div className={styles.modalOverlay} onClick={() => setSelectedClientId(null)}>
          <section
            className={styles.detailModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.detailHeader}>
              <div>
                <span
                  className={`${styles.resultPill} ${
                    selectedClient.renewalClass === "Renovara"
                      ? styles.resultRenew
                      : styles.resultNoRenew
                  }`}
                >
                  {selectedClient.renewalClass === "Renovara" ? <FaCheck /> : <FaXmark />}
                  {selectedClient.renewalClass}
                </span>
                <h2 id="renewal-detail-title">{selectedClient.clientName}</h2>
                <p>
                  {selectedClient.rowId} · {selectedClient.planName}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedClientId(null)}
                aria-label="Cerrar detalle"
              >
                <FaXmark />
              </button>
            </div>

            <div className={styles.detailGrid}>
              <article>
                <span>Plan</span>
                <strong>{selectedClient.planName}</strong>
                <small>{selectedClient.changedPlan ? "Cambio de plan" : "Sin cambio de plan"}</small>
              </article>
              <article>
                <span>Monto pagado</span>
                <strong>{moneyFormatter.format(selectedClient.amountPaid)}</strong>
                <small>
                  Cambio {moneyFormatter.format(selectedClient.amountPaidChange)}
                </small>
              </article>
              <article>
                <span>Historial de renovacion</span>
                <strong>{selectedClient.previousRenewalsCount}</strong>
                <small>
                  {selectedClient.previousSubscriptionsCount} suscripciones previas
                </small>
              </article>
              <article>
                <span>Tasa previa</span>
                <strong>{(selectedClient.previousRenewalRate * 100).toFixed(0)}%</strong>
                <small>{selectedClient.daysAsCustomer} dias como cliente</small>
              </article>
              <article>
                <span>Compras de productos</span>
                <strong>{selectedClient.productsPurchasedCount}</strong>
                <small>{moneyFormatter.format(selectedClient.totalProductSpend)}</small>
              </article>
              <article>
                <span>Pagos</span>
                <strong>{selectedClient.successfulPaymentsCount} exitosos</strong>
                <small>
                  {selectedClient.failedPaymentsCount} fallidos /{" "}
                  {selectedClient.refundedPaymentsCount} reembolsados
                </small>
              </article>
              <article>
                <span>Renovacion automatica</span>
                <strong>{selectedClient.autoRenew ? "Activada" : "Desactivada"}</strong>
                <small>{selectedClient.paymentMethod}</small>
              </article>
              <article>
                <span>Ultima compra</span>
                <strong>
                  {selectedClient.daysSinceLastPurchase >= 0
                    ? `${selectedClient.daysSinceLastPurchase} dias`
                    : "Sin compra"}
                </strong>
                <small>Origen: {selectedClient.source}</small>
              </article>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
