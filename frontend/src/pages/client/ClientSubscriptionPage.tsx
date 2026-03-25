import { FaCheckCircle, FaCreditCard, FaGem, FaSyncAlt } from "react-icons/fa";
import styles from "./ClientPages.module.css";

const benefits = [
  "Acceso completo al gimnasio y clases grupales.",
  "Seguimiento de progreso desde el portal del cliente.",
  "Atencion prioritaria para renovaciones y cambios de plan.",
  "Configuracion de seguridad y datos de perfil en un solo lugar.",
];

const renewalTimeline = [
  {
    title: "Renovacion programada",
    detail: "Tu siguiente cobro esta previsto para el 18 de abril de 2026.",
  },
  {
    title: "Metodo actual",
    detail: "Tarjeta Visa terminacion 3344 autorizada para cargo automatico.",
  },
  {
    title: "Estado de beneficios",
    detail: "Todos los accesos y extras del plan se mantienen activos.",
  },
];

export default function ClientSubscriptionPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Membresia Titanium</span>
          <h2 className={styles.title}>Tu suscripcion esta lista para seguir activa</h2>
          <p className={styles.subtitle}>
            Aqui concentras los datos de tu plan, beneficios y proxima
            renovacion sin salir del panel del cliente.
          </p>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.heroCard}>
            <span className={styles.heroCardLabel}>Plan actual</span>
            <strong className={styles.heroCardValue}>Premium 12 meses</strong>
            <div className={styles.heroCardText}>
              Renovacion automatica activa con acceso a seguimiento y soporte.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaCreditCard />
          </span>
          <div className={styles.metricLabel}>Estado</div>
          <div className={styles.metricValue}>Activa</div>
          <div className={styles.metricMeta}>Tu membresia esta vigente y operando normal.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaSyncAlt />
          </span>
          <div className={styles.metricLabel}>Renovacion</div>
          <div className={styles.metricValue}>18/04/2026</div>
          <div className={styles.metricMeta}>El siguiente cargo se procesara automaticamente.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaGem />
          </span>
          <div className={styles.metricLabel}>Nivel</div>
          <div className={styles.metricValue}>Premium</div>
          <div className={styles.metricMeta}>Incluye acceso total y herramientas del portal.</div>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricIcon}>
            <FaCheckCircle />
          </span>
          <div className={styles.metricLabel}>Beneficios</div>
          <div className={styles.metricValue}>4 activos</div>
          <div className={styles.metricMeta}>Sin restricciones ni pendientes por resolver.</div>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Beneficios incluidos</h3>
              <p className={styles.panelText}>
                Lo que tienes disponible mientras la suscripcion permanezca activa.
              </p>
            </div>
            <span className={styles.pill}>Incluido</span>
          </div>

          <ul className={styles.list}>
            {benefits.map((benefit) => (
              <li key={benefit} className={styles.listItem}>
                <div className={styles.listContent}>
                  <span className={styles.listIcon}>
                    <FaCheckCircle />
                  </span>
                  <div>
                    <span className={styles.listHeading}>{benefit}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Ruta de renovacion</h3>
              <p className={styles.panelText}>
                Confirmacion rapida de los siguientes eventos de la membresia.
              </p>
            </div>
          </div>

          <ul className={styles.timeline}>
            {renewalTimeline.map((item) => (
              <li key={item.title} className={styles.timelineItem}>
                <span className={styles.timelineDot} />
                <div>
                  <h4 className={styles.timelineTitle}>{item.title}</h4>
                  <p className={styles.timelineText}>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
