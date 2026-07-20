import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import "../styles/payment.css";
import Logo from "../assets/LogoP.png";
import {
  getOrderPaymentStatus,
  type OrderPaymentStatus,
} from "../services/checkoutService";
import { useCart } from "../context/CartContext";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ||
      "No se pudo consultar el estado del pago."
    );
  }

  return "No se pudo consultar el estado del pago.";
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
  const { clearCart } = useCart();
  const token = localStorage.getItem("token");
  const viewState = useMemo(() => resolveViewState(status), [status]);

  const refreshStatus = useCallback(async () => {
    if (!orderId || !token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getOrderPaymentStatus(orderId);
      setStatus(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

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

      <header className="header header-scrolled">
        <div className="header-content">
          <div className="logo-container">
            <Link to="/">
              <img src={Logo} alt="Titanium Sport Gym" className="logo-image" />
            </Link>
          </div>

          <nav className="nav-desktop">
            <div className="nav-main-links">
              <Link to="/" className="nav-link">
                INICIO
                <span className="nav-underline" />
              </Link>
              <Link to="/catalogue" className="nav-link">
                CATALOGO
                <span className="nav-underline" />
              </Link>
            </div>
          </nav>
        </div>
      </header>

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
