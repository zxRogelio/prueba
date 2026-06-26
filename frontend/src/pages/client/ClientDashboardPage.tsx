import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaCreditCard,
  FaDumbbell,
  FaShieldAlt,
  FaSyncAlt,
  FaUserCircle,
  FaWallet,
} from "react-icons/fa";
import {
  getMyActiveSubscription,
  getMyMembershipPayments,
  type MembershipPlan,
} from "../../services/membershipService";
import styles from "./ClientPages.module.css";

type ActiveSubscription = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  plan?: MembershipPlan;
  payment?: {
    id: string;
    amount: string | number;
    method: string;
    status: string;
  } | null;
};

type MembershipPayment = {
  id: string;
  amount: string | number;
  status: string;
  method: string;
  createdAt: string;
  paidAt?: string | null;
  plan?: {
    name: string;
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

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function getDaysLeft(endsAt?: string | null) {
  if (!endsAt) return null;

  const today = new Date();
  const endDate = new Date(`${endsAt}T23:59:59`);
  const diff = endDate.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ClientDashboardPage() {
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [subscriptionResponse, paymentsResponse] = await Promise.all([
        getMyActiveSubscription(),
        getMyMembershipPayments(),
      ]);

      setSubscription(subscriptionResponse.subscription ?? null);
      setHasActiveSubscription(Boolean(subscriptionResponse.hasActiveSubscription));
      setPayments(paymentsResponse.payments ?? []);
    } catch (error) {
      console.error("CLIENT DASHBOARD ERROR:", error);
      setSubscription(null);
      setHasActiveSubscription(false);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const lastPayment = payments[0] ?? null;
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const daysLeft = getDaysLeft(subscription?.endsAt);

  const summaryCards = useMemo(
    () => [
      {
        label: "Plan activo",
        value: hasActiveSubscription
          ? subscription?.plan?.name ?? "Membresía activa"
          : "Sin membresía",
        meta: hasActiveSubscription
          ? `Vence el ${formatDate(subscription?.endsAt)}`
          : "Acude a recepción para activar un plan.",
        icon: FaCreditCard,
      },
      {
        label: "Acceso a rutinas",
        value: hasActiveSubscription ? "Disponible" : "Bloqueado",
        meta: hasActiveSubscription
          ? "Tu membresía permite ver rutinas y entrenamientos."
          : "Necesitas una membresía activa.",
        icon: FaDumbbell,
      },
      {
        label: "Último pago",
        value: lastPayment ? formatCurrency(lastPayment.amount) : "$0.00",
        meta: lastPayment
          ? `${lastPayment.plan?.name ?? "Membresía"} - ${lastPayment.status}`
          : "Sin pagos registrados.",
        icon: FaWallet,
      },
      {
        label: "Seguridad",
        value: "Cuenta protegida",
        meta: "Tu sesión se valida con token de acceso.",
        icon: FaShieldAlt,
      },
    ],
    [hasActiveSubscription, lastPayment, subscription]
  );

  const nextSteps = useMemo(() => {
    if (!hasActiveSubscription) {
      return [
        {
          title: "Activar membresía",
          detail:
            "Solicita al administrador registrar tu pago en efectivo, transferencia o terminal Mercado Pago.",
          status: "Pendiente",
        },
        {
          title: "Revisar planes",
          detail: "Consulta las opciones disponibles en recepción o en el portal.",
          status: "Revisar",
        },
        {
          title: "Completar perfil",
          detail:
            "Mantén tus datos actualizados para usar correctamente las funciones del portal.",
          status: "Sugerido",
        },
      ];
    }

    return [
      {
        title: "Consultar rutinas",
        detail: "Tu membresía activa ya puede usarse para desbloquear rutinas.",
        status: "Activo",
      },
      {
        title: "Revisar vigencia",
        detail:
          daysLeft !== null
            ? `Tu plan vence en ${Math.max(daysLeft, 0)} días.`
            : "Consulta la fecha de vencimiento en tu membresía.",
        status: "Vigente",
      },
      {
        title: "Guardar comprobante",
        detail:
          "Revisa tu historial de pagos para ubicar el folio generado por el sistema.",
        status: "Disponible",
      },
    ];
  }, [daysLeft, hasActiveSubscription]);

  return (
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>
            {hasActiveSubscription ? "Cuenta activa" : "Cuenta sin membresía"}
          </span>
          <h1>Portal del cliente</h1>
          <p>
            Desde aquí administras tu perfil, membresía, pagos y acceso a
            rutinas. El estado de tu membresía se obtiene directamente del
            backend.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.heroActionBtn}
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Cargando..." : "Actualizar"}
          </button>

          <Link to="/cliente/perfil" className={styles.heroActionBtn}>
            <FaUserCircle />
            Ir a mi perfil
          </Link>
        </div>
      </header>

      <div className={styles.statusBanner}>
        <div>
          <span>Estado general</span>
          <strong>
            {hasActiveSubscription ? "Membresía activa" : "Membresía pendiente"}
          </strong>
          <p>
            {hasActiveSubscription
              ? `Tu plan ${
                  subscription?.plan?.name ?? ""
                } está vigente hasta ${formatDate(subscription?.endsAt)}.`
              : "Todavía no tienes una membresía activa registrada en el sistema."}
          </p>
        </div>

        <div>
          <span>Pagos confirmados</span>
          <strong>{paidPayments.length}</strong>
          <p>Historial conectado al módulo real de pagos.</p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className={styles.summaryCard}>
              <span className={styles.summaryIcon}>
                <Icon />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
                <span>{card.meta}</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.panelCard}>
          <h2>Próximos pasos</h2>
          <p>Acciones recomendadas según el estado actual de tu cuenta.</p>

          <ul className={styles.timelineList}>
            {nextSteps.map((step) => (
              <li key={step.title}>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
                <span>{step.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panelCard}>
          <h2>Accesos rápidos</h2>
          <p>Atajos principales del portal del cliente.</p>

          <div className={styles.quickGrid}>
            <Link to="/cliente/perfil" className={styles.quickCard}>
              <FaUserCircle />
              <div>
                <strong>Completar perfil</strong>
                <span>Actualiza tus datos personales y físicos.</span>
              </div>
              <FaArrowRight />
            </Link>

            <Link to="/cliente/suscripcion" className={styles.quickCard}>
              <FaCreditCard />
              <div>
                <strong>Ver membresía</strong>
                <span>Consulta beneficios, vigencia y estado.</span>
              </div>
              <FaArrowRight />
            </Link>

            <Link to="/cliente/pagos" className={styles.quickCard}>
              <FaWallet />
              <div>
                <strong>Revisar pagos</strong>
                <span>Consulta pagos y comprobantes.</span>
              </div>
              <FaArrowRight />
            </Link>

            <Link to="/cliente/configuracion" className={styles.quickCard}>
              <FaShieldAlt />
              <div>
                <strong>Ajustar seguridad</strong>
                <span>Administra opciones de acceso seguro.</span>
              </div>
              <FaArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}