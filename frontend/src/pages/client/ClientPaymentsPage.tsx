import { FaCheckCircle, FaFileInvoiceDollar, FaWallet } from "react-icons/fa";
import styles from "./ClientPages.module.css";

const payments = [
  {
    date: "18 mar 2026",
    description: "Renovacion mensual Titanium Premium",
    amount: "$1,499 MXN",
    status: "Pagado",
  },
  {
    date: "18 feb 2026",
    description: "Renovacion mensual Titanium Premium",
    amount: "$1,499 MXN",
    status: "Pagado",
  },
  {
    date: "18 ene 2026",
    description: "Alta de membresia Titanium Premium",
    amount: "$1,499 MXN",
    status: "Pagado",
  },
];

export default function ClientPaymentsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Control financiero</span>
          <h2 className={styles.title}>Pagos y comprobantes en una sola vista</h2>
          <p className={styles.subtitle}>
            Consulta tus movimientos recientes, el proximo cargo y el estado de
            la facturacion sin salir del portal del cliente.
          </p>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.heroCard}>
            <span className={styles.heroCardLabel}>Metodo principal</span>
            <strong className={styles.heroCardValue}>Visa 3344</strong>
            <div className={styles.heroCardText}>
              Configurada para cobro automatico y renovacion sin interrupciones.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaWallet />
          </span>
          <div className={styles.metricLabel}>Proximo cargo</div>
          <div className={styles.metricValue}>$1,499</div>
          <div className={styles.metricMeta}>Se intentara el 18 de abril de 2026.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaCheckCircle />
          </span>
          <div className={styles.metricLabel}>Pagos exitosos</div>
          <div className={styles.metricValue}>3</div>
          <div className={styles.metricMeta}>Ultimos movimientos sin incidencias.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaFileInvoiceDollar />
          </span>
          <div className={styles.metricLabel}>Comprobantes</div>
          <div className={styles.metricValue}>Disponibles</div>
          <div className={styles.metricMeta}>Listos para consulta cuando los necesites.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaWallet />
          </span>
          <div className={styles.metricLabel}>Estado de cobro</div>
          <div className={styles.metricValue}>Al dia</div>
          <div className={styles.metricMeta}>No hay montos vencidos ni cargos pendientes.</div>
        </article>
      </div>

      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3 className={styles.panelTitle}>Historial reciente</h3>
            <p className={styles.panelText}>
              Ultimos cargos registrados para tu membresia.
            </p>
          </div>
          <span className={styles.pill}>Sin atrasos</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={`${payment.date}-${payment.amount}`}>
                  <td>{payment.date}</td>
                  <td>{payment.description}</td>
                  <td>{payment.amount}</td>
                  <td>
                    <span className={styles.pill}>{payment.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
