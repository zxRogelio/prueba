import { useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/checkout.css";
import Logo from "../assets/LogoP.png";
import { useCart } from "../context/CartContext";
import { createMercadoPagoCheckout } from "../services/checkoutService";

const ATTEMPT_STORAGE_KEY = "titanium_mp_checkout_attempt";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
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

  return "No se pudo crear el checkout.";
}

export default function CheckoutPage() {
  const { items } = useCart();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const token = localStorage.getItem("token");
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );
  const cartSignature = useMemo(
    () =>
      JSON.stringify(
        items
          .map((item) => ({
            productId: String(item.id),
            quantity: item.quantity,
          }))
          .sort((left, right) => left.productId.localeCompare(right.productId))
      ),
    [items]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0 || isCreatingCheckout) return;

    setErrorMessage(null);
    setIsCreatingCheckout(true);

    try {
      const idempotencyKey = getStoredAttemptKey(cartSignature);
      const response = await createMercadoPagoCheckout({
        idempotencyKey,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
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
                PRODUCTOS
                <span className="nav-underline" />
              </Link>
            </div>

            <div className="nav-action-links">
              <div className="nav-divider" />
              <Link to="/suscripciones" className="slider-btn-outline">
                SUSCRIBETE
              </Link>
              <Link to="/login" className="slider-btn-solid">
                INICIA SESION
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <nav className="breadcrumbs">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link">
              INICIO
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <Link to="/catalogue" className="breadcrumb-link">
              PRODUCTOS
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <span className="breadcrumb-current">PAGO</span>
          </li>
        </ol>
      </nav>

      <section className="checkout-hero">
        <div className="checkout-hero-content">
          <h1 className="checkout-title brush-text">PROCESAR PAGO</h1>
          <p className="checkout-subtitle">
            Finaliza tu compra con Mercado Pago Checkout Pro.
          </p>
        </div>
      </section>

      <div className="checkout-container">
        <div className="checkout-content">
          <div className="checkout-form-section">
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-section">
                <h3 className="section-title">CHECKOUT PRO</h3>

                {!token ? (
                  <div className="shipping-notice">
                    Inicia sesion para continuar con tu compra.
                  </div>
                ) : null}

                {items.length === 0 ? (
                  <div className="shipping-notice">
                    Tu carrito esta vacio. Agrega productos desde el catalogo.
                  </div>
                ) : (
                  <div className="shipping-options">
                    <div className="shipping-option">
                      <div className="shipping-option-content">
                        <span className="shipping-name">Mercado Pago</span>
                        <span className="shipping-price">
                          Checkout Pro seguro
                        </span>
                        <span className="shipping-time">
                          Seras redirigido para completar el pago.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage ? (
                  <div className="shipping-notice">{errorMessage}</div>
                ) : null}
              </div>

              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={!token || items.length === 0 || isCreatingCheckout}
              >
                {isCreatingCheckout ? "CREANDO CHECKOUT..." : "PAGAR CON MERCADO PAGO"}
              </button>

              {!token ? (
                <Link to="/login" className="checkout-submit-btn">
                  INICIAR SESION
                </Link>
              ) : null}
            </form>
          </div>

          <div className="order-summary-section">
            <div className="order-summary-card">
              <h3 className="summary-title">RESUMEN DEL PEDIDO</h3>

              <div className="order-items">
                {items.map((item) => (
                  <div key={item.id} className="order-item">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                    />
                    <div className="order-item-details">
                      <h4>{item.name}</h4>
                      <div className="order-item-meta">
                        <span>Cantidad: {item.quantity}</span>
                        <span>{formatMoney(Number(item.price))} c/u</span>
                      </div>
                    </div>
                    <div className="order-item-total">
                      {formatMoney(Number(item.price) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="order-line">
                  <span>Subtotal estimado</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="order-total">
                  <span>Total estimado</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
              </div>

              <div className="security-badges">
                <div className="security-badge">Checkout Pro de Mercado Pago</div>
                <div className="security-badge">Sin datos de tarjeta en Titanium</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
