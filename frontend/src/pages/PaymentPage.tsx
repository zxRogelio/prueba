import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/payment.css";
import {
  getMembershipPlans,
  type MembershipPlan,
} from "../services/membershipService";
import { createMercadoPagoCheckout } from "../services/checkoutService";

const ATTEMPT_STORAGE_KEY = "titanium_mp_membership_attempt";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredAttemptKey(signature: string) {
  try {
    const stored = localStorage.getItem(ATTEMPT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;

    if (parsed?.signature === signature && parsed?.idempotencyKey) {
      return parsed.idempotencyKey as string;
    }
  } catch {
    localStorage.removeItem(ATTEMPT_STORAGE_KEY);
  }

  const idempotencyKey = createUuid();
  localStorage.setItem(
    ATTEMPT_STORAGE_KEY,
    JSON.stringify({ signature, idempotencyKey })
  );

  return idempotencyKey;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ||
      "No se pudo crear el checkout."
    );
  }

  if (error instanceof Error) return error.message;

  return "No se pudo crear el checkout.";
}

function parseMemberEmails(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort();
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(
    searchParams.get("membershipPlanId") || searchParams.get("planId") || ""
  );
  const [memberEmailsInput, setMemberEmailsInput] = useState("");
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let isMounted = true;

    getMembershipPlans()
      .then((response) => {
        if (!isMounted) return;

        const activePlans = Array.isArray(response.plans) ? response.plans : [];
        setPlans(activePlans);

        setSelectedPlanId((currentPlanId) => currentPlanId || activePlans[0]?.id || "");
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );
  const memberEmails = useMemo(
    () => parseMemberEmails(memberEmailsInput),
    [memberEmailsInput]
  );
  const attemptSignature = useMemo(
    () =>
      JSON.stringify({
        membershipPlanId: selectedPlanId,
        memberEmails,
      }),
    [memberEmails, selectedPlanId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPlan || isCreatingCheckout) return;

    setErrorMessage(null);
    setIsCreatingCheckout(true);

    try {
      const idempotencyKey = getStoredAttemptKey(attemptSignature);
      const response = await createMercadoPagoCheckout({
        idempotencyKey,
        membershipPlanId: selectedPlan.id,
        memberEmails:
          selectedPlan.type === "group" && memberEmails.length > 0
            ? memberEmails
            : undefined,
      });

      if (!response.checkoutUrl) {
        throw new Error("Mercado Pago no devolvio una URL de checkout.");
      }

      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsCreatingCheckout(false);
    }
  };

  return (
    <div className="page-container">
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      <nav className="breadcrumbs">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link">
              INICIO
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <Link to="/suscripciones" className="breadcrumb-link">
              SUSCRIPCIONES
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <span className="breadcrumb-current">PAGO</span>
          </li>
        </ol>
      </nav>

      <section className="payment-hero">
        <div className="payment-hero-content">
          <h1 className="payment-title brush-text">PROCESAR PAGO</h1>
          <p className="payment-subtitle">
            Activa tu membresia desde Mercado Pago Checkout Pro.
          </p>
        </div>
      </section>

      <div className="payment-container">
        <div className="payment-content">
          <div className="payment-summary-card">
            <h3 className="summary-title">RESUMEN DE COMPRA</h3>

            <div className="membership-summary">
              {selectedPlan ? (
                <>
                  <div className="summary-header">
                    <h4 className="summary-membership-name">
                      {selectedPlan.name}
                    </h4>
                    <div className="summary-price">
                      {formatMoney(selectedPlan.price)}
                    </div>
                  </div>

                  <div className="summary-features">
                    {(selectedPlan.benefits || []).slice(0, 5).map((benefit) => (
                      <div key={benefit} className="summary-feature">
                        <span className="feature-check">OK</span>
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <div className="summary-total">
                    <div className="total-line">
                      <span>Duracion</span>
                      <span>{selectedPlan.durationDays} dias</span>
                    </div>
                    <div className="total-line total-final">
                      <span>Total</span>
                      <span>{formatMoney(selectedPlan.price)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="summary-feature">
                  {isLoadingPlans ? "Cargando planes..." : "No hay planes activos."}
                </p>
              )}
            </div>
          </div>

          <div className="payment-form-card">
            <h3 className="summary-title">CHECKOUT PRO</h3>

            <form onSubmit={handleSubmit} className="payment-form">
              <div className="form-section">
                <h4 className="section-title">MEMBRESIA</h4>

                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="membershipPlan">
                    Plan
                  </label>
                  <div className="auth-input-wrap">
                    <select
                      id="membershipPlan"
                      className="auth-input"
                      value={selectedPlanId}
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      disabled={isLoadingPlans || isCreatingCheckout}
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {formatMoney(plan.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedPlan?.type === "group" ? (
                  <div className="auth-input-group">
                    <label className="auth-label" htmlFor="memberEmails">
                      Correos de integrantes
                    </label>
                    <div className="auth-input-wrap">
                      <textarea
                        id="memberEmails"
                        className="auth-input"
                        value={memberEmailsInput}
                        onChange={(event) =>
                          setMemberEmailsInput(event.target.value)
                        }
                        disabled={isCreatingCheckout}
                        rows={4}
                        placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                      />
                    </div>
                  </div>
                ) : null}

                {!token ? (
                  <div className="security-notice">
                    Inicia sesion para continuar con tu membresia.
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="security-notice">{errorMessage}</div>
                ) : null}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate(-1)}
                  disabled={isCreatingCheckout}
                >
                  REGRESAR
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !token ||
                    !selectedPlan ||
                    isLoadingPlans ||
                    isCreatingCheckout
                  }
                >
                  {isCreatingCheckout
                    ? "CREANDO CHECKOUT..."
                    : `PAGAR ${selectedPlan ? formatMoney(selectedPlan.price) : ""}`}
                </button>
              </div>

              {!token ? (
                <Link to="/login" className="btn-primary">
                  INICIAR SESION
                </Link>
              ) : null}
            </form>

            <div className="security-notice">
              El pago se completa en Mercado Pago; Titanium no recibe datos de tarjeta.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
