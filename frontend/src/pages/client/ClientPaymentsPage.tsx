import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaReceipt,
  FaSyncAlt,
  FaWallet,
} from "react-icons/fa";
import { getMyMembershipPayments } from "../../services/membershipService";
import styles from "./ClientPages.module.css";
type MembershipPayment = {
  id: string;
  paymentType: string;
  amount: string | number;
  method: string;
  provider: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  plan?: {
    id: string;
    name: string;
    type: string;
    durationDays: number;
  } | null;
  receipt?: {
    id: string;
    folio: string;
    status: string;
    issuedAt: string;
    pdfUrl?: string | null;
  } | null;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatCurrency(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMethodLabel(method?: string) {
  switch (method) {
    case "cash":
      return "Efectivo";
    case "transfer":
      return "Transferencia";
    case "card_terminal":
      return "Tarjeta presencial / Mercado Pago";
    case "online_card":
      return "Pago en línea con tarjeta";
    case "online_wallet":
      return "Pago en línea";
    default:
      return "No especificado";
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "paid":
      return "Pagado";
    case "pending":
      return "Pendiente";
    case "failed":
      return "Fallido";
    case "cancelled":
      return "Cancelado";
    case "refunded":
      return "Reembolsado";
    case "disputed":
      return "En disputa";
    case "charged_back":
      return "Contracargo";
    default:
      return status ?? "Sin estado";
  }
}

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPayments() {
    setLoading(true);

    try {
      const response = await getMyMembershipPayments();
      setPayments(response.payments ?? []);
    } catch (error) {
      console.error("CLIENT PAYMENTS ERROR:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  const paidPayments = payments.filter((payment) => payment.status === "paid");

  const totalPaid = useMemo(() => {
    return paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  }, [paidPayments]);

  const lastPayment = payments[0] ?? null;
  const receiptsCount = payments.filter((payment) => payment.receipt).length;

  return (
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>Control financiero</span>
          <h1>Pagos y comprobantes</h1>
          <p>
            Consulta tus pagos de membresía registrados por recepción,
            transferencia, terminal Mercado Pago o futuras compras en línea.
          </p>
        </div>

        <button
          type="button"
          className={styles.heroActionBtn}
          onClick={() => void loadPayments()}
          disabled={loading}
        >
          <FaSyncAlt />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaWallet />
          </span>
          <div>
            <p>Total pagado</p>
            <strong>{formatCurrency(totalPaid)}</strong>
            <span>Solo pagos confirmados.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <p>Pagos exitosos</p>
            <strong>{paidPayments.length}</strong>
            <span>Movimientos con estado pagado.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaReceipt />
          </span>
          <div>
            <p>Comprobantes</p>
            <strong>{receiptsCount}</strong>
            <span>Folios generados por el sistema.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaFileInvoiceDollar />
          </span>
          <div>
            <p>Último pago</p>
            <strong>{lastPayment ? formatCurrency(lastPayment.amount) : "$0.00"}</strong>
            <span>
              {lastPayment
                ? `${getMethodLabel(lastPayment.method)}`
                : "Sin pagos registrados."}
            </span>
          </div>
        </article>
      </div>

      <section className={styles.panelCard}>
        <h2>Historial de pagos</h2>
        <p>Movimientos reales registrados en el backend.</p>

        {loading ? (
          <div className={styles.emptyStateCard}>Cargando pagos...</div>
        ) : payments.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.clientTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Plan</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                    <td>
                      <strong>{payment.plan?.name ?? "Membresía"}</strong>
                      {payment.reference ? <p>{payment.reference}</p> : null}
                    </td>
                    <td>{getMethodLabel(payment.method)}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>{getStatusLabel(payment.status)}</td>
                    <td>
                      {payment.receipt ? (
                        payment.receipt.pdfUrl ? (
                          <a
                            href={payment.receipt.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {payment.receipt.folio}
                          </a>
                        ) : (
                          <span>{payment.receipt.folio}</span>
                        )
                      ) : (
                        <span>Sin comprobante</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            Todavía no tienes pagos de membresía registrados.
          </div>
        )}
      </section>
    </section>
  );
}
