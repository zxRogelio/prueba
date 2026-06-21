import { Link, useLocation } from "react-router-dom";
import "../styles/confirmation.css";
import Logo from "../assets/LogoP.png";

type Membership = {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
};

type CustomerInfo = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
};

type ConfirmationLocationState = {
  membership?: Membership;
  customerInfo?: CustomerInfo;
  transactionId?: string;
};

export default function ConfirmationPage() {
  const location = useLocation();
  const locationState = location.state as ConfirmationLocationState | null;
  const { membership, customerInfo, transactionId } = locationState || {};

  // Datos por defecto en caso de que no lleguen por state
  const selectedMembership: Membership = membership || {
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

  const customerData: CustomerInfo = customerInfo || {
    nombre: "Juan",
    apellido: "Pérez",
    email: "juan@example.com",
    telefono: "+52 123 456 7890",
  };

  const transaction = transactionId || "TXN-ABC123XYZ";

  // Generar código QR simulado
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TitaniumGym-${transaction}-${selectedMembership.name}`;

  const handleDownloadQR = () => {
    // Simular descarga del QR
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `Titanium-QR-${transaction}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
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
            <span className="breadcrumb-current">CONFIRMACIÓN</span>
          </li>
        </ol>
      </nav>

      {/* Hero Section de Confirmación */}
      <section className="confirmation-hero">
        <div className="confirmation-hero-content">
          <div className="success-animation">
            <svg className="checkmark" viewBox="0 0 52 52">
              <circle
                className="checkmark__circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
              />
              <path
                className="checkmark__check"
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
          <h1 className="confirmation-title brush-text">¡PAGO EXITOSO!</h1>
          <p className="confirmation-subtitle">
            Tu membresía Titanium ha sido activada correctamente
          </p>
        </div>
      </section>

      <div className="confirmation-container">
        <div className="confirmation-content">
          {/* Tarjeta de Confirmación */}
          <div className="confirmation-card">
            <div className="confirmation-header">
              <h3 className="section-title">
                CONFIRMACIÓN DE COMPRA
              </h3>
              <div className="transaction-id">
                ID de Transacción: <span>{transaction}</span>
              </div>
            </div>

            <div className="confirmation-body">
              {/* Información del Cliente */}
              <div className="info-section">
                <h4 className="info-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  INFORMACIÓN DEL CLIENTE
                </h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Nombre:</span>
                    <span className="info-value">
                      {customerData.nombre} {customerData.apellido}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{customerData.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Teléfono:</span>
                    <span className="info-value">{customerData.telefono}</span>
                  </div>
                </div>
              </div>

              {/* Detalles de la Membresía */}
              <div className="info-section">
                <h4 className="info-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  DETALLES DE LA MEMBRESÍA
                </h4>
                <div className="membership-details">
                  <div className="membership-header">
                    <h5 className="membership-name">
                      {selectedMembership.name}
                    </h5>
                    <div className="membership-price">
                      ${selectedMembership.price}
                      <span>/{selectedMembership.duration}</span>
                    </div>
                  </div>
                  <div className="membership-features">
                    {selectedMembership.features.map((feature, index) => (
                      <div key={index} className="membership-feature">
                        <svg
                          className="feature-icon"
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
                </div>
              </div>

              {/* Código QR */}
              <div className="info-section">
                <h4 className="info-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  CÓDIGO DE ACCESO
                </h4>
                <div className="qr-section">
                  <div className="qr-code">
                    <img src={qrCodeUrl} alt="Código QR de la membresía" />
                  </div>
                  <div className="qr-instructions">
                    <p>
                      <strong>Presenta este código QR en recepción</strong>
                    </p>
                    <p>Escanea el código para acceder a las instalaciones</p>
                    <p>
                      Válido a partir de:{" "}
                      {new Date().toLocaleDateString("es-ES")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <button onClick={handleDownloadQR} className="btn-secondary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                DESCARGAR QR
              </button>
              <button onClick={handlePrint} className="btn-secondary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                IMPRIMIR
              </button>
              <Link to="/" className="btn-primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                IR AL INICIO
              </Link>
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
