import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaExternalLinkAlt,
  FaFileInvoiceDollar,
  FaMoneyCheckAlt,
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
      return "Tarjeta presencial";
    case "online_card":
      return "Tarjeta en linea";
    case "online_wallet":
      return "Billetera en linea";
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

function getStatusClass(status?: string) {
  switch (status) {
    case "paid":
      return styles.paymentStatusPaid;
    case "pending":
      return styles.paymentStatusPending;
    case "failed":
    case "cancelled":
    case "disputed":
    case "charged_back":
      return styles.paymentStatusDanger;
    case "refunded":
      return styles.paymentStatusNeutral;
    default:
      return styles.paymentStatusNeutral;
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

  const paidPayments = useMemo(
    () => payments.filter((payment) => payment.status === "paid"),
    [payments]
  );

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments]
  );

  const totalPaid = useMemo(() => {
    return paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  }, [paidPayments]);

  const lastPayment = payments[0] ?? null;
  const receiptsCount = payments.filter((payment) => payment.receipt).length;

  return (
    <section className={`${styles.clientPage} ${styles.paymentsPage}`}>
      <header className={styles.paymentHero}>
        <div className={styles.paymentHeroCopy}>
          <span className={styles.routineEyebrow}>Control financiero</span>
          <h1>Pagos y comprobantes</h1>
          <p>
            Consulta movimientos de membresia, pagos confirmados, metodos de
            cobro y comprobantes generados por el sistema.
          </p>
        </div>

        <div className={styles.paymentHeroPanel}>
          <div>
            <span>Total pagado</span>
            <strong>{loading ? "--" : formatCurrency(totalPaid)}</strong>
          </div>
          <div>
            <span>Comprobantes</span>
            <strong>{loading ? "--" : receiptsCount}</strong>
          </div>
          <button
            type="button"
            className={styles.routineRefreshBtn}
            onClick={() => void loadPayments()}
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Cargando" : "Actualizar"}
          </button>
        </div>
      </header>

      <div className={styles.paymentSummaryGrid}>
        <article>
          <span>
            <FaWallet />
          </span>
          <div>
            <p>Total pagado</p>
            <strong>{formatCurrency(totalPaid)}</strong>
            <small>Solo pagos confirmados.</small>
          </div>
        </article>

        <article>
          <span>
            <FaCheckCircle />
          </span>
          <div>
            <p>Pagos exitosos</p>
            <strong>{paidPayments.length}</strong>
            <small>Movimientos con estado pagado.</small>
          </div>
        </article>

        <article>
          <span>
            <FaReceipt />
          </span>
          <div>
            <p>Comprobantes</p>
            <strong>{receiptsCount}</strong>
            <small>Folios generados por el sistema.</small>
          </div>
        </article>

        <article>
          <span>
            <FaFileInvoiceDollar />
          </span>
          <div>
            <p>Ultimo pago</p>
            <strong>{lastPayment ? formatCurrency(lastPayment.amount) : "$0.00"}</strong>
            <small>
              {lastPayment
                ? getMethodLabel(lastPayment.method)
                : "Sin pagos registrados."}
            </small>
          </div>
        </article>
      </div>

      <section className={styles.paymentSection}>
        <div className={styles.routineResultsHeader}>
          <div>
            <h2>Historial de pagos</h2>
            <p>Movimientos reales registrados en el backend.</p>
          </div>
          <span>{loading ? "Cargando" : `${payments.length} movimientos`}</span>
        </div>

        {loading ? (
          <div className={styles.routineEmpty}>Cargando pagos...</div>
        ) : payments.length > 0 ? (
          <>
            <div className={styles.paymentDesktopTable}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Plan</th>
                    <th>Metodo</th>
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
                        <strong>{payment.plan?.name ?? "Membresia"}</strong>
                        {payment.reference ? <p>{payment.reference}</p> : null}
                      </td>
                      <td>{getMethodLabel(payment.method)}</td>
                      <td>
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </td>
                      <td>
                        <span
                          className={`${styles.paymentStatusPill} ${getStatusClass(
                            payment.status
                          )}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td>
                        {payment.receipt ? (
                          payment.receipt.pdfUrl ? (
                            <a
                              href={payment.receipt.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.paymentReceiptLink}
                            >
                              {payment.receipt.folio}
                              <FaExternalLinkAlt />
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

            <div className={styles.paymentMobileList}>
              {payments.map((payment) => (
                <article key={payment.id} className={styles.paymentCard}>
                  <div className={styles.paymentCardHeader}>
                    <div>
                      <span>{formatDate(payment.paidAt ?? payment.createdAt)}</span>
                      <h3>{payment.plan?.name ?? "Membresia"}</h3>
                    </div>
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>

                  <div className={styles.paymentCardMeta}>
                    <div>
                      <span>Metodo</span>
                      <strong>{getMethodLabel(payment.method)}</strong>
                    </div>
                    <div>
                      <span>Estado</span>
                      <strong>{getStatusLabel(payment.status)}</strong>
                    </div>
                  </div>

                  {payment.receipt?.pdfUrl ? (
                    <a
                      href={payment.receipt.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.paymentReceiptLink}
                    >
                      {payment.receipt.folio}
                      <FaExternalLinkAlt />
                    </a>
                  ) : (
                    <span className={styles.paymentNoReceipt}>
                      {payment.receipt?.folio ?? "Sin comprobante"}
                    </span>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.paymentEmpty}>
            <FaMoneyCheckAlt />
            <strong>Todavia no tienes pagos registrados.</strong>
            <p>Cuando se registre un pago de membresia aparecera aqui.</p>
          </div>
        )}
      </section>

      <section className={styles.paymentInsightGrid}>
        <article>
          <span>Pendientes</span>
          <strong>{pendingPayments.length}</strong>
          <p>Pagos registrados que aun no estan confirmados.</p>
        </article>

        <article>
          <span>Metodo reciente</span>
          <strong>{lastPayment ? getMethodLabel(lastPayment.method) : "Sin datos"}</strong>
          <p>Tomado del ultimo movimiento registrado.</p>
        </article>
      </section>
    </section>
  );
}
