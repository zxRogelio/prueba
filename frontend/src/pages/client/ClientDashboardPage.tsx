import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaChartLine,
  FaCreditCard,
  FaShieldAlt,
  FaUserCircle,
  FaWallet,
} from "react-icons/fa";
import styles from "./ClientPages.module.css";

const summaryCards = [
  {
    label: "Plan activo",
    value: "Premium 12 meses",
    meta: "Incluye acceso completo, seguimiento y soporte.",
    icon: FaCreditCard,
  },
  {
    label: "Progreso del mes",
    value: "-2.4 kg",
    meta: "Con base en tus ultimos registros almacenados.",
    icon: FaChartLine,
  },
  {
    label: "Proximo cargo",
    value: "18 abril 2026",
    meta: "Pago automatico con tarjeta terminacion 3344.",
    icon: FaWallet,
  },
  {
    label: "Seguridad",
    value: "2FA activo",
    meta: "Tu cuenta tiene una capa extra de proteccion.",
    icon: FaShieldAlt,
  },
];

const quickLinks = [
  {
    to: "/cliente/perfil",
    title: "Completar perfil",
    text: "Actualiza tus datos fisicos y sigue la prediccion de avance.",
    icon: FaUserCircle,
  },
  {
    to: "/cliente/suscripcion",
    title: "Ver membresia",
    text: "Consulta beneficios, vigencia y proximas renovaciones.",
    icon: FaCreditCard,
  },
  {
    to: "/cliente/pagos",
    title: "Revisar pagos",
    text: "Confirma movimientos y prepara tus comprobantes.",
    icon: FaWallet,
  },
  {
    to: "/cliente/configuracion",
    title: "Ajustar seguridad",
    text: "Administra OTP, QR y acceso seguro desde tu cuenta.",
    icon: FaShieldAlt,
  },
];

const nextSteps = [
  {
    title: "Registrar peso actual",
    detail: "Agrega tu medicion de esta semana para mejorar la prediccion.",
    status: "Pendiente",
  },
  {
    title: "Actualizar meta fitness",
    detail: "Verifica si tu objetivo sigue orientado a bajar, mantener o subir.",
    status: "Revisar",
  },
  {
    title: "Comprobar metodo 2FA",
    detail: "Asegurate de que tu acceso siga configurado como prefieres.",
    status: "Listo",
  },
];

const timeline = [
  {
    title: "Perfil sincronizado",
    detail: "Tus datos de peso, objetivo y entrenamiento quedaron guardados.",
  },
  {
    title: "Suscripcion activa",
    detail: "Tu membresia Premium mantiene acceso al portal y al seguimiento.",
  },
  {
    title: "Sesion protegida",
    detail: "Puedes volver al sitio publico cuando quieras sin perder la cuenta activa.",
  },
];

export default function ClientDashboardPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Cuenta activa</span>
          <h2 className={styles.title}>Tu portal ya esta separado del sitio publico</h2>
          <p className={styles.subtitle}>
            Desde aqui administras tu perfil, membresia, pagos y seguridad.
            Mientras tanto, en el home publico seguiras viendo la sesion activa
            sin salirte de la experiencia principal del sitio.
          </p>

          <div className={styles.heroActions}>
            <Link to="/cliente/perfil" className={styles.heroButton}>
              Ir a mi perfil
              <FaArrowRight />
            </Link>
            <Link to="/" className={styles.heroButtonSoft}>
              Volver al home publico
            </Link>
          </div>
        </div>

        <div className={styles.heroAside}>
          <div className={styles.heroCard}>
            <span className={styles.heroCardLabel}>Estado general</span>
            <strong className={styles.heroCardValue}>En forma y al dia</strong>
            <div className={styles.heroCardText}>
              Tu panel centraliza progreso, membresia y seguridad para que no
              dependas del home para administrar la cuenta.
            </div>
          </div>

          <div className={styles.heroCard}>
            <span className={styles.heroCardLabel}>Siguiente foco</span>
            <strong className={styles.heroCardValue}>Completar seguimiento</strong>
            <div className={styles.heroCardText}>
              Si registras peso y objetivo cada semana, el panel de prediccion
              te dara una lectura mucho mas util.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <card.icon />
            </span>
            <div className={styles.metricLabel}>{card.label}</div>
            <div className={styles.metricValue}>{card.value}</div>
            <div className={styles.metricMeta}>{card.meta}</div>
          </article>
        ))}
      </div>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Proximos pasos</h3>
              <p className={styles.panelText}>
                Prioriza estas acciones para mantener tu portal al dia.
              </p>
            </div>
            <span className={styles.pill}>Activo</span>
          </div>

          <ul className={styles.list}>
            {nextSteps.map((step) => (
              <li key={step.title} className={styles.listItem}>
                <div className={styles.listContent}>
                  <span className={styles.listIcon}>
                    <FaArrowRight />
                  </span>
                  <div>
                    <span className={styles.listHeading}>{step.title}</span>
                    <span className={styles.listMeta}>{step.detail}</span>
                  </div>
                </div>
                <span
                  className={
                    step.status === "Listo"
                      ? styles.pill
                      : step.status === "Revisar"
                      ? styles.pillWarning
                      : styles.pillMuted
                  }
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Accesos rapidos</h3>
              <p className={styles.panelText}>
                Entra directo a las secciones que mas vas a usar.
              </p>
            </div>
          </div>

          <div className={styles.quickLinks}>
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className={styles.quickLink}>
                <span className={styles.quickLinkIcon}>
                  <link.icon />
                </span>
                <span className={styles.quickLinkTitle}>{link.title}</span>
                <span className={styles.quickLinkText}>{link.text}</span>
              </Link>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Actividad reciente</h3>
              <p className={styles.panelText}>
                Cambios importantes dentro de tu cuenta.
              </p>
            </div>
          </div>

          <ul className={styles.timeline}>
            {timeline.map((item) => (
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

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Lectura rapida</h3>
              <p className={styles.panelText}>
                Resumen de lo que mas importa antes de seguir navegando.
              </p>
            </div>
          </div>

          <ul className={styles.list}>
            <li className={styles.listItem}>
              <div>
                <span className={styles.listHeading}>Home publico con sesion activa</span>
                <span className={styles.listMeta}>
                  Al iniciar sesion ya no te manda directo al portal si eres cliente.
                </span>
              </div>
            </li>
            <li className={styles.listItem}>
              <div>
                <span className={styles.listHeading}>Portal separado</span>
                <span className={styles.listMeta}>
                  Entras desde el menu de usuario cuando quieras administrar la cuenta.
                </span>
              </div>
            </li>
            <li className={styles.listItem}>
              <div>
                <span className={styles.listHeading}>Diseño de panel</span>
                <span className={styles.listMeta}>
                  Ahora tiene sidebar, topbar y bloques visuales mas cercanos al admin.
                </span>
              </div>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
