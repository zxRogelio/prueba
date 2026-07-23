import { useEffect, useMemo, useState } from "react";
import {
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaShieldAlt,
  FaSyncAlt,
} from "react-icons/fa";
import {
  getAdminChargebacks,
  type AdminChargebackOrderItem,
  type AdminChargebackPayment,
} from "../../services/admin/paymentReviewService";
import styles from "./AdminChargebacksPage.module.css";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatCurrency(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);

  return currencyFormatter.format(
    Number.isFinite(numericValue) ? numericValue : 0
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return dateFormatter.format(date);
}

function statusLabel(status: AdminChargebackPayment["status"]) {
  if (status === "charged_back") return "Contracargo";
  return "Disputa";
}

function itemLabel(item: AdminChargebackOrderItem) {
  const name = item.itemNameSnapshot || item.itemDescriptionSnapshot;

  if (name) return `${name} x${item.quantity}`;
  if (item.itemType === "product") return `Producto ${item.productId} x${item.quantity}`;
  if (item.itemType === "group_membership") {
    return `Paquete grupal ${item.membershipPlanId || ""}`.trim();
  }

  return `Membresia ${item.membershipPlanId || ""}`.trim();
}

export default function AdminChargebacksPage() {
  const [payments, setPayments] = useState<AdminChargebackPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadChargebacks() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminChargebacks();
      setPayments(response.payments ?? []);
    } catch (error) {
      console.error("ADMIN CHARGEBACKS ERROR:", error);
      setErrorMessage("No se pudieron cargar los contracargos.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChargebacks();
  }, []);

  const chargedBackCount = useMemo(
    () => payments.filter((payment) => payment.status === "charged_back").length,
    [payments]
  );
  const disputedCount = useMemo(
    () => payments.filter((payment) => payment.status === "disputed").length,
    [payments]
  );
  const reviewAmount = useMemo(
    () =>
      payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span className={styles.eyebrow}>Mercado Pago</span>
          <h1>Contracargos y disputas</h1>
          <p>
            Revisa pagos que Mercado Pago envio como disputa o contracargo. El
            sistema conserva beneficios, recibos e inventario hasta que un
            administrador resuelva el caso.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => void loadChargebacks()}
          disabled={loading}
        >
          <FaSyncAlt />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaExclamationTriangle />
          </span>
          <div>
            <span className={styles.statLabel}>Revision abierta</span>
            <strong className={styles.statValue}>{payments.length}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaShieldAlt />
          </span>
          <div>
            <span className={styles.statLabel}>Contracargos</span>
            <strong className={styles.statValue}>{chargedBackCount}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaShieldAlt />
          </span>
          <div>
            <span className={styles.statLabel}>Disputas</span>
            <strong className={styles.statValue}>{disputedCount}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaFileInvoiceDollar />
          </span>
          <div>
            <span className={styles.statLabel}>Monto en revision</span>
            <strong className={styles.statValue}>
              {formatCurrency(reviewAmount)}
            </strong>
          </div>
        </article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>Atencion administrativa</span>
            <h2>Casos recibidos por webhook</h2>
          </div>
        </div>

        {errorMessage ? (
          <div className={styles.feedback}>{errorMessage}</div>
        ) : null}

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Orden</th>
                <th>Proveedor</th>
                <th>Articulos</th>
                <th>Monto</th>
                <th>Revision</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles.emptyRow} colSpan={8}>
                    Cargando casos...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td className={styles.emptyRow} colSpan={8}>
                    No hay contracargos ni disputas pendientes de revision.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.review?.receivedAt ?? payment.updatedAt)}</td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          payment.status === "charged_back"
                            ? styles.statusChargeback
                            : styles.statusDisputed
                        }`}
                      >
                        {statusLabel(payment.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{payment.user?.email ?? "Sin cliente"}</strong>
                      <span className={styles.secondaryText}>
                        {payment.user?.role ?? "Sin rol"}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {payment.order?.orderNumber ?? payment.orderId ?? "Sin orden"}
                      </strong>
                      <span className={styles.secondaryText}>
                        {payment.order?.status ?? "Sin estado"}
                      </span>
                    </td>
                    <td>
                      <strong>{payment.provider}</strong>
                      <span className={styles.secondaryText}>
                        {payment.providerPaymentId ?? "Sin ID proveedor"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.itemList}>
                        {(payment.order?.items ?? []).map((item) => (
                          <span key={item.id}>{itemLabel(item)}</span>
                        ))}
                        {(payment.order?.items ?? []).length === 0 ? (
                          <span>Sin articulos</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className={styles.reviewText}>
                        Validar en Mercado Pago antes de cancelar beneficios o
                        ajustar inventario.
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
