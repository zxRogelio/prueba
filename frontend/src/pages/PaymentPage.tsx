import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/payment.css";
import Logo from "../assets/LogoP.png";

type Membership = {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
};

type PaymentFormData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  numeroTarjeta: string;
  nombreTarjeta: string;
  fechaExpiracion: string;
  cvv: string;
};

type PaymentLocationState = {
  membership?: Membership;
};

const DEFAULT_MEMBERSHIP: Membership = {
  id: 1,
  name: "CARTE BLANCHE",
  price: 299,
  duration: "mes",
  features: [
    "Acceso a Ã¡rea de pesas",
    "Clases grupales bÃ¡sicas",
    "Vestidores y regaderas",
    "App Titanium bÃ¡sica",
  ],
};

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as PaymentLocationState | null;
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">(
    "card"
  );
  const [formData, setFormData] = useState<PaymentFormData>({
    // Información personal
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",

    // Información de pago
    numeroTarjeta: "",
    nombreTarjeta: "",
    fechaExpiracion: "",
    cvv: "",
  });

  // Obtener la membresía seleccionada desde el estado de navegación
  const selectedMembership: Membership =
    locationState?.membership || DEFAULT_MEMBERSHIP || {
    id: 1,
    name: "CARTE BLANCHE",
    price: 299,
    duration: "mes",
    features: [
      "Acceso a área de pesas",
      "Clases grupales básicas",
      "Vestidores y regaderas",
      "App Titanium básica",
    ],
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as keyof PaymentFormData;
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mostrar alerta de éxito
    alert(
      "¡Pago procesado exitosamente! Has adquirido " + selectedMembership.name
    );

    // Redirigir a la pantalla de confirmación después de 2 segundos
    setTimeout(() => {
      navigate("/confirmation", {
        state: {
          membership: selectedMembership,
          customerInfo: formData,
          transactionId: generateTransactionId(),
        },
      });
    }, 2000);
  };

  // Generar ID de transacción simulado
  const generateTransactionId = () => {
    return "TXN-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="page-container">
      {/* Animated background elements */}
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      {/* Header */}
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
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                INICIO
                <span className="nav-underline" />
              </Link>
              <Link to="/catalogue" className="nav-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                PRODUCTOS
                <span className="nav-underline" />
              </Link>
              <Link to="/suscripciones" className="nav-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                SUSCRIPCIONES
                <span className="nav-underline" />
              </Link>
            </div>

            <div className="nav-action-links">
              <div className="nav-divider" />
              <Link to="/register" className="slider-btn-outline">
                SUSCRIBETE
              </Link>
              <Link to="/login" className="slider-btn-solid">
                INICIA SESIÓN
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
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

      {/* Hero Section del Pago */}
      <section className="payment-hero">
        <div className="payment-hero-content">
          <h1 className="payment-title brush-text">PROCESAR PAGO</h1>
          <p className="payment-subtitle">
            Completa tu información para activar tu membresía Titanium
          </p>
        </div>
      </section>

      <div className="payment-container">
        <div className="payment-content">
          {/* Resumen de la membresía */}
          <div className="payment-summary-card">
            <h3 className="summary-title">RESUMEN DE COMPRA</h3>

            <div className="membership-summary">
              <div className="summary-header">
                <h4 className="summary-membership-name">
                  {selectedMembership.name}
                </h4>
                <div className="summary-price">
                  ${selectedMembership.price}
                  <span>/{selectedMembership.duration}</span>
                </div>
              </div>

              <div className="summary-features">
                {selectedMembership.features
                  .slice(0, 4)
                  .map((feature, index) => (
                    <div key={index} className="summary-feature">
                      <svg
                        className="feature-check"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </div>
                  ))}
              </div>

              <div className="summary-total">
                <div className="total-line">
                  <span>Subtotal:</span>
                  <span>${selectedMembership.price}</span>
                </div>
                <div className="total-line">
                  <span>Impuestos:</span>
                  <span>$0</span>
                </div>
                <div className="total-line total-final">
                  <span>Total a pagar:</span>
                  <span>${selectedMembership.price}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de pago */}
          <div className="payment-form-card">
            <h3 className="summary-title">INFORMACIÓN DE PAGO</h3>

            {/* Métodos de pago */}
            <div className="payment-methods">
              <button
                className={`payment-method-btn ${
                  paymentMethod === "card" ? "active" : ""
                }`}
                onClick={() => setPaymentMethod("card")}
              >
                Tarjeta de Crédito/Débito
              </button>

              <button
                className={`payment-method-btn ${
                  paymentMethod === "paypal" ? "active" : ""
                }`}
                onClick={() => setPaymentMethod("paypal")}
              >
                PayPal
              </button>
            </div>

            {paymentMethod === "card" && (
              <form onSubmit={handleSubmit} className="payment-form">
                {/* Información Personal */}
                <div className="form-section">
                  <h4 className="section-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    INFORMACIÓN PERSONAL
                  </h4>

                  <div className="form-row">
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="nombre">
                        Nombre *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="7"
                              r="4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </span>
                        <input
                          id="nombre"
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          className="auth-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="apellido">
                        Apellido *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="7"
                              r="4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </span>
                        <input
                          id="apellido"
                          type="text"
                          name="apellido"
                          value={formData.apellido}
                          onChange={handleInputChange}
                          className="auth-input"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="email">
                        Email *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm0 2l8 5 8-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="auth-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="telefono">
                        Teléfono *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          id="telefono"
                          type="tel"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          className="auth-input"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información de Tarjeta */}
                <div className="form-section">
                  <h4 className="section-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    INFORMACIÓN DE TARJETA
                  </h4>

                  <div className="auth-input-group">
                    <label className="auth-label" htmlFor="numeroTarjeta">
                      Número de Tarjeta *
                    </label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" className="auth-icon">
                          <path
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <input
                        id="numeroTarjeta"
                        type="text"
                        name="numeroTarjeta"
                        placeholder="1234 5678 9012 3456"
                        value={formData.numeroTarjeta}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            numeroTarjeta: formatted,
                          }));
                        }}
                        className="auth-input"
                        maxLength={19}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-label" htmlFor="nombreTarjeta">
                      Nombre en la Tarjeta *
                    </label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" className="auth-icon">
                          <path
                            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="7"
                            r="4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </span>
                      <input
                        id="nombreTarjeta"
                        type="text"
                        name="nombreTarjeta"
                        value={formData.nombreTarjeta}
                        onChange={handleInputChange}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="fechaExpiracion">
                        Fecha de Expiración *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          id="fechaExpiracion"
                          type="text"
                          name="fechaExpiracion"
                          placeholder="MM/AA"
                          value={formData.fechaExpiracion}
                          onChange={(e) => {
                            const formatted = formatExpiryDate(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              fechaExpiracion: formatted,
                            }));
                          }}
                          className="auth-input"
                          maxLength={5}
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-input-group">
                      <label className="auth-label" htmlFor="cvv">
                        CVV *
                      </label>
                      <div className="auth-input-wrap">
                        <span className="auth-input-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" className="auth-icon">
                            <path
                              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          id="cvv"
                          type="text"
                          name="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          className="auth-input"
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(-1)}
                  >
                    REGRESAR
                  </button>

                  <Link
                    to="/confirmation" // 👉 aquí pones la ruta a donde quieres llevar
                    className="btn-primary"
                  >
                    PAGAR ${selectedMembership.price}
                  </Link>
                </div>
              </form>
            )}

            {paymentMethod === "paypal" && (
              <div className="paypal-section">
                <div className="paypal-info">
                  <p>
                    Serás redirigido a PayPal para completar tu pago de manera
                    segura.
                  </p>
                  <button type="button" className="btn-paypal">
                    PAGAR CON PAYPAL
                  </button>
                </div>
              </div>
            )}

            <div className="security-notice">
              <span>
                Tu información está protegida con encriptación SSL de 256-bit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {false && <footer className="smart-footer">
        <div className="footer-main">
          <div className="footer-content">
            <div className="footer-brand">
              <img
                src={Logo}
                alt="Titanium Sport Gym"
                className="footer-logo"
              />
              <div className="social-links">
                <span className="follow-text">SÍGUENOS</span>
                <div className="social-icons">
                  <a href="#" className="social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                    </svg>
                  </a>
                  <a href="#" className="social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.017z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="footer-columns">
              <div className="footer-column">
                <h4 className="footer-column-title">Titanium</h4>
                <ul className="footer-links">
                  <li>
                    <a href="#" className="footer-link">
                      Quiénes somos
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Contáctanos
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Aviso de Privacidad
                    </a>
                  </li>
                </ul>
              </div>

              <div className="footer-column">
                <h4 className="footer-column-title">Membresías</h4>
                <ul className="footer-links">
                  <li>
                    <a href="#" className="footer-link">
                      Carte Blanche
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Titanium Rojo
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Titanium Negro
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Promociones
                    </a>
                  </li>
                </ul>
              </div>

              <div className="footer-column">
                <h4 className="footer-column-title">Servicios</h4>
                <ul className="footer-links">
                  <li>
                    <a href="#" className="footer-link">
                      Entrenamiento Personal
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Nutrición
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Clases Grupales
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">
                      Trabaja con nosotros
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-disclaimer">
              *Primera semana gratis aplica para nuevos miembros. Consulta
              términos y condiciones completos.
            </p>
            <p className="footer-copyright">
              © {new Date().getFullYear()} Titanium Sport Gym. Todos los
              derechos reservados.
            </p>
          </div>
        </div>
      </footer>}
    </div>
  );
}
