import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaGem,
  FaReceipt,
  FaShieldAlt,
  FaSyncAlt,
  FaTimesCircle,
  FaWallet,
} from "react-icons/fa";
import {
  getMembershipPlans,
  getMyActiveSubscription,
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
    case "active":
      return "Activa";
    case "pending":
      return "Pendiente";
    case "expired":
      return "Vencida";
    case "cancelled":
      return "Cancelada";
    default:
      return status ?? "Sin estado";
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
      "Acceso a rutinas cuando la membresia esta activa.",
    ];
  }, [plan]);

  const daysLeft = getDaysLeft(subscription?.endsAt);
  const availablePlans = plans.filter((item) => item.isActive);

  if (loading) {
    return (
      <section className={styles.clientPage}>
        <div className={styles.routineEmpty}>Cargando membresia...</div>
      </section>
    );
  }

  if (!data?.hasActiveSubscription || !subscription) {
    return (
      <section className={`${styles.clientPage} ${styles.subscriptionPage}`}>
        <header className={styles.subscriptionHero}>
          <div className={styles.subscriptionHeroCopy}>
            <span className={styles.routineEyebrow}>Membresia Titanium</span>
            <h1>No tienes una membresia activa</h1>
            <p>
              Para acceder a rutinas, entrenamientos y beneficios del portal,
              necesitas una membresia activa registrada por el administrador.
            </p>
          </div>

          <div className={styles.subscriptionHeroAlert}>
            <FaTimesCircle />
            <strong>Sin acceso activo</strong>
            <span>Solicita activacion en recepcion.</span>
          </div>
        </header>

        <div className={styles.subscriptionSummaryGrid}>
          <article>
            <span>
              <FaWallet />
            </span>
            <div>
              <p>Estado</p>
              <strong>Sin membresia</strong>
              <small>Acude a recepcion o solicita activacion.</small>
            </div>
          </article>

          <article>
            <span>
              <FaCreditCard />
            </span>
            <div>
              <p>Pago</p>
              <strong>Pendiente</strong>
              <small>El admin debe confirmar el pago.</small>
            </div>
          </article>
        </div>

        <section className={styles.subscriptionSection}>
          <div className={styles.routineResultsHeader}>
            <div>
              <h2>Planes disponibles</h2>
              <p>Estos son los planes cargados desde el sistema.</p>
            </div>
            <span>{availablePlans.length} planes</span>
          </div>

          {availablePlans.length > 0 ? (
            <div className={styles.subscriptionPlansGrid}>
              {availablePlans.map((item) => (
                <article key={item.id} className={styles.subscriptionPlanCard}>
                  <span>{item.type === "group" ? "Paquete" : "Plan"}</span>
                  <h3>{item.name}</h3>
                  <strong>{formatCurrency(item.price)}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.routineEmpty}>
              No hay planes activos disponibles por ahora.
            </div>
          )}
        </section>
      </section>
    );
  }

  return (
    <section className={`${styles.clientPage} ${styles.subscriptionPage}`}>
      <header className={styles.subscriptionHero}>
        <div className={styles.subscriptionHeroCopy}>
          <span className={styles.routineEyebrow}>Membresia Titanium</span>
          <h1>Tu membresia esta activa</h1>
          <p>
            Consulta tu plan, vigencia, beneficios y datos del pago confirmado
            desde el sistema.
          </p>
        </div>

        <div className={styles.subscriptionHeroPanel}>
          <div>
            <span>Plan</span>
            <strong>{plan?.name ?? "Activa"}</strong>
          </div>
          <div>
            <span>Vence</span>
            <strong>{formatDate(subscription.endsAt)}</strong>
          </div>
          <button
            type="button"
            className={styles.routineRefreshBtn}
            onClick={() => void loadSubscription()}
          >
            <FaSyncAlt />
            Actualizar
          </button>
        </div>
      </header>

      <div className={styles.subscriptionSummaryGrid}>
        <article>
          <span>
            <FaGem />
          </span>
          <div>
            <p>Plan actual</p>
            <strong>{plan?.name ?? "Membresia activa"}</strong>
            <small>{plan?.description ?? "Plan activo en el sistema."}</small>
          </div>
        </article>

        <article>
          <span>
            <FaCheckCircle />
          </span>
          <div>
            <p>Estado</p>
            <strong>{getStatusLabel(subscription.status)}</strong>
            <small>
              {daysLeft !== null
                ? `Quedan ${Math.max(daysLeft, 0)} dias.`
                : "Vigencia activa."}
            </small>
          </div>
        </article>

        <article>
          <span>
            <FaClock />
          </span>
          <div>
            <p>Vigencia</p>
            <strong>{formatDate(subscription.endsAt)}</strong>
            <small>Inicio: {formatDate(subscription.startsAt)}</small>
          </div>
        </article>

        <article>
          <span>
            <FaCreditCard />
          </span>
          <div>
            <p>Pago</p>
            <strong>{formatCurrency(subscription.payment?.amount)}</strong>
            <small>{getMethodLabel(subscription.payment?.method)}</small>
          </div>
        </article>
      </div>

      <div className={styles.subscriptionContentGrid}>
        <section className={styles.subscriptionBenefitsPanel}>
          <div className={styles.routineResultsHeader}>
            <div>
              <h2>Beneficios incluidos</h2>
              <p>Disponibles mientras tu membresia permanezca activa.</p>
            </div>
            <span>{benefits.length} beneficios</span>
          </div>

          <ul className={styles.subscriptionBenefitsList}>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <FaCheckCircle />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.subscriptionPaymentPanel}>
          <div className={styles.routineResultsHeader}>
            <div>
              <h2>Detalle del pago</h2>
              <p>Informacion generada al registrar el pago de tu membresia.</p>
            </div>
          </div>

          <div className={styles.subscriptionPaymentList}>
            <div>
              <span>
                <FaWallet />
                Metodo
              </span>
              <strong>{getMethodLabel(subscription.payment?.method)}</strong>
            </div>

            <div>
              <span>
                <FaShieldAlt />
                Proveedor
              </span>
              <strong>{subscription.payment?.provider ?? "No especificado"}</strong>
            </div>

            <div>
              <span>
                <FaCheckCircle />
                Estado del pago
              </span>
              <strong>{subscription.payment?.status ?? "Sin pago"}</strong>
            </div>

            <div>
              <span>
                <FaReceipt />
                Comprobante
              </span>
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
