import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import "../styles/payment.css";
import {
  getOrderPaymentStatus,
  type OrderStatus,
  type OrderPaymentStatus,
  type PaymentStatus,
} from "../services/checkoutService";
import { useCart } from "../context/useCart";

const POLLING_INTERVAL_MS = 3_000;
const POLLING_TIMEOUT_MS = 60_000;

const FINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "disputed",
  "charged_back",
]);

const FINAL_ORDER_STATUSES = new Set<OrderStatus>([
  "paid",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed",
  "charged_back",
]);

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ||
      "No se pudo consultar el estado del pago."
    );
  }

  return "No se pudo consultar el estado del pago.";
}

function isFinalPaymentStatus(status?: PaymentStatus | null) {
  return Boolean(status && FINAL_PAYMENT_STATUSES.has(status));
}

function isFinalOrderStatus(status?: OrderStatus | null) {
  return Boolean(status && FINAL_ORDER_STATUSES.has(status));
}

function shouldPollStatus(status: OrderPaymentStatus | null) {
  if (!status) return false;

  const paymentStatus = status.payment?.status ?? null;
  const orderStatus = status.order.status;

  if (isFinalPaymentStatus(paymentStatus) || isFinalOrderStatus(orderStatus)) {
    return false;
  }

  return paymentStatus === "pending" || orderStatus === "pending_payment";
}

function resolveViewState(status: OrderPaymentStatus | null) {
  const paymentStatus = status?.payment?.status;
  const orderStatus = status?.order?.status;

  if (paymentStatus === "paid" || orderStatus === "paid") {
    return {
      title: "Pago aprobado",
      message: "Tu pago fue confirmado correctamente.",
      tone: "approved",
    };
  }

  if (paymentStatus === "failed") {
    return {
      title: "Pago rechazado",
      message: "Mercado Pago no aprobo la operacion.",
      tone: "failed",
    };
  }

  if (paymentStatus === "cancelled" || orderStatus === "cancelled") {
    return {
      title: "Pago cancelado",
      message: "La operacion quedo cancelada.",
      tone: "cancelled",
    };
  }

  if (paymentStatus === "refunded" || orderStatus === "refunded") {
    return {
      title: "Pago reembolsado",
      message: "La orden tiene un reembolso registrado.",
      tone: "refunded",
    };
  }

  if (
    paymentStatus === "disputed" ||
    paymentStatus === "charged_back" ||
    orderStatus === "disputed" ||
    orderStatus === "charged_back"
  ) {
    return {
      title: "Pago en revision",
      message:
        "La operacion requiere revision administrativa. El equipo validara el caso con Mercado Pago.",
      tone: "review",
    };
  }

  if (paymentStatus === "pending" || orderStatus === "pending_payment") {
    return {
      title: "Pago pendiente",
      message: "Aun estamos esperando la confirmacion de Mercado Pago.",
      tone: "pending",
    };
  }

  return {
    title: "Estado no disponible",
    message: "No hay un pago verificable para esta orden.",
    tone: "unknown",
  };
}

export default function PagoResultadoPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const returnResult = searchParams.get("result") || "";
  const [status, setStatus] = useState<OrderPaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const requestInFlightRef = useRef(false);
  const { clearCart } = useCart();
  const token = localStorage.getItem("token");
  const viewState = useMemo(() => resolveViewState(status), [status]);
  const shouldPoll = useMemo(() => shouldPollStatus(status), [status]);

  const refreshStatus = useCallback(async () => {
    if (!orderId || !token || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getOrderPaymentStatus(orderId);
      setStatus(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!shouldPoll) {
      setPollingTimedOut(false);
      return undefined;
    }

    setPollingTimedOut(false);

    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, POLLING_INTERVAL_MS);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setPollingTimedOut(true);
    }, POLLING_TIMEOUT_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [refreshStatus, shouldPoll]);

  useEffect(() => {
    const isPaid = status?.payment?.status === "paid" || status?.order.status === "paid";

    if (!isPaid) return;

    localStorage.removeItem("titanium_mp_checkout_attempt");
    localStorage.removeItem("titanium_mp_membership_attempt");

    if (status.order.items?.some((item) => item.itemType === "product")) {
      clearCart();
    }
  }, [clearCart, status]);

  return (
    <div className="page-container">
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      <section className="payment-hero">
        <div className="payment-hero-content">
          <h1 className="payment-title brush-text">RESULTADO DE PAGO</h1>
          <p className="payment-subtitle">
            Estado verificado desde Titanium Sport Gym.
          </p>
        </div>
      </section>

      <div className="payment-container">
        <div className="payment-content">
          <div className="payment-summary-card">
            <h3 className="summary-title">ORDEN</h3>

            <div className="membership-summary">
              <div className="summary-total">
                <div className="total-line">
                  <span>Orden</span>
                  <span>{status?.order.orderNumber || orderId || "No disponible"}</span>
                </div>
                <div className="total-line">
                  <span>Estado orden</span>
                  <span>{status?.order.status || "Sin consultar"}</span>
                </div>
                <div className="total-line">
                  <span>Estado pago</span>
                  <span>{status?.payment?.status || "Sin pago"}</span>
                </div>
                {returnResult ? (
                  <div className="total-line">
                    <span>Retorno</span>
                    <span>{returnResult}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="payment-form-card">
            <h3 className="summary-title">{viewState.title}</h3>

            <div className="membership-summary">
              <p className="summary-feature">{viewState.message}</p>

              {!orderId ? (
                <div className="security-notice">
                  La URL no incluye orderId.
                </div>
              ) : null}

              {!token ? (
                <div className="security-notice">
                  Inicia sesion para consultar esta orden.
                </div>
              ) : null}

              {errorMessage ? (
                <div className="security-notice">{errorMessage}</div>
              ) : null}

              {pollingTimedOut && !errorMessage ? (
                <div className="security-notice">
                  La confirmacion sigue pendiente. Puedes actualizar manualmente.
                </div>
              ) : null}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={refreshStatus}
                disabled={!orderId || !token || isLoading}
              >
                {isLoading ? "CONSULTANDO..." : "ACTUALIZAR"}
              </button>

              {!token ? (
                <Link to="/login" className="btn-primary">
                  INICIAR SESION
                </Link>
              ) : (
                <Link to="/cliente/pagos" className="btn-primary">
                  MIS PAGOS
                </Link>
              )}
            </div>

            <div className="form-actions">
              <Link to="/cliente/suscripcion" className="btn-secondary">
                MI MEMBRESIA
              </Link>
              <Link to="/cliente" className="btn-secondary">
                MIS PEDIDOS
              </Link>
              <Link to="/catalogue" className="btn-secondary">
                CATALOGO
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
