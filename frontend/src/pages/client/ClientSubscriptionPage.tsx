import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaGem,
  FaSyncAlt,
  FaTimesCircle,
  FaWallet,
} from "react-icons/fa";
import {
  getMyActiveSubscription,
  getMembershipPlans,
  type MembershipPlan,
} from "../../services/membershipService";
import styles from "./ClientPages.module.css";

type ActiveSubscriptionResponse = {
  ok: boolean;
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    source: string;
    autoRenew: boolean;
    plan?: MembershipPlan;
    payment?: {
      id: string;
      amount: string | number;
      method: string;
      provider: string;
      status: string;
      paidAt?: string;
      receipt?: {
        id: string;
        folio: string;
        status: string;
        issuedAt: string;
        pdfUrl?: string | null;
      } | null;
    } | null;
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

export default function ClientSubscriptionPage() {
  const [data, setData] = useState<ActiveSubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSubscription() {
    setLoading(true);

    try {
      const [subscriptionResponse, plansResponse] = await Promise.all([
        getMyActiveSubscription(),
        getMembershipPlans(),
      ]);

      setData(subscriptionResponse);
      setPlans(plansResponse.plans ?? []);
    } catch (error) {
      console.error("CLIENT SUBSCRIPTION ERROR:", error);
      setData({
        ok: false,
        hasActiveSubscription: false,
        subscription: null,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscription();
  }, []);

  const subscription = data?.subscription ?? null;
  const plan = subscription?.plan;
  const benefits = useMemo(() => {
    if (Array.isArray(plan?.benefits) && plan.benefits.length > 0) {
      return plan.benefits;
    }

    return [
      "Acceso al gimnasio durante la vigencia del plan.",
      "Consulta de historial de pagos y comprobantes.",
      "Acceso a rutinas cuando la membresía está activa.",
    ];
  }, [plan]);

  const daysLeft = getDaysLeft(subscription?.endsAt);
  const availablePlans = plans.filter((item) => item.isActive);

  if (loading) {
    return (
      <section className={styles.clientPage}>
        <div className={styles.emptyStateCard}>Cargando membresía...</div>
      </section>
    );
  }

  if (!data?.hasActiveSubscription || !subscription) {
    return (
      <section className={styles.clientPage}>
        <header className={styles.clientHero}>
          <div>
            <span className={styles.clientEyebrow}>Membresía Titanium</span>
            <h1>No tienes una membresía activa</h1>
            <p>
              Para acceder a rutinas, entrenamientos y beneficios del portal,
              necesitas una membresía activa registrada por el administrador.
            </p>
          </div>
          <span className={styles.heroIconDanger}>
            <FaTimesCircle />
          </span>
        </header>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <FaWallet />
            </span>
            <div>
              <p>Estado</p>
              <strong>Sin membresía</strong>
              <span>Acude a recepción o solicita activación.</span>
            </div>
          </article>

          <article className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <FaCreditCard />
            </span>
            <div>
              <p>Pago</p>
              <strong>Pendiente</strong>
              <span>El admin debe confirmar el pago.</span>
            </div>
          </article>
        </div>

        <section className={styles.panelCard}>
          <h2>Planes disponibles</h2>
          <p>Estos son los planes cargados desde el sistema.</p>

          <div className={styles.cardGrid}>
            {availablePlans.map((item) => (
              <article key={item.id} className={styles.featureCard}>
                <span>{item.type === "group" ? "Paquete" : "Plan"}</span>
                <h3>{item.name}</h3>
                <strong>{formatCurrency(item.price)}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>Membresía Titanium</span>
          <h1>Tu membresía está activa</h1>
          <p>
            Aquí puedes consultar tu plan, vigencia, beneficios y datos del pago
            confirmado.
          </p>
        </div>

        <button
          type="button"
          className={styles.heroActionBtn}
          onClick={() => void loadSubscription()}
        >
          <FaSyncAlt />
          Actualizar
        </button>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaGem />
          </span>
          <div>
            <p>Plan actual</p>
            <strong>{plan?.name ?? "Membresía activa"}</strong>
            <span>{plan?.description ?? "Plan activo en el sistema."}</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <p>Estado</p>
            <strong>{subscription.status}</strong>
            <span>
              {daysLeft !== null
                ? `Quedan ${Math.max(daysLeft, 0)} días.`
                : "Vigencia activa."}
            </span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaClock />
          </span>
          <div>
            <p>Vigencia</p>
            <strong>{formatDate(subscription.endsAt)}</strong>
            <span>Inicio: {formatDate(subscription.startsAt)}</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaCreditCard />
          </span>
          <div>
            <p>Pago</p>
            <strong>{formatCurrency(subscription.payment?.amount)}</strong>
            <span>{getMethodLabel(subscription.payment?.method)}</span>
          </div>
        </article>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.panelCard}>
          <h2>Beneficios incluidos</h2>
          <p>Disponibles mientras tu membresía permanezca activa.</p>

          <ul className={styles.featureList}>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <FaCheckCircle />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panelCard}>
          <h2>Detalle del pago</h2>
          <p>Información generada al registrar el pago de tu membresía.</p>

          <div className={styles.detailList}>
            <div>
              <span>Método</span>
              <strong>{getMethodLabel(subscription.payment?.method)}</strong>
            </div>
            <div>
              <span>Proveedor</span>
              <strong>{subscription.payment?.provider ?? "No especificado"}</strong>
            </div>
            <div>
              <span>Estado del pago</span>
              <strong>{subscription.payment?.status ?? "Sin pago"}</strong>
            </div>
            <div>
              <span>Comprobante</span>
              <strong>
                {subscription.payment?.receipt?.folio ?? "Sin folio disponible"}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}