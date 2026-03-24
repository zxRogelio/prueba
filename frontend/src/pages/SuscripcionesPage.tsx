import { useState, useEffect } from "react";
import "../styles/suscripciones.css";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar/Navbar";

// Datos de las membresías
const memberships = [
  {
    id: 1,
    name: "CARTE BLANCHE",
    level: "BÁSICO",
    price: 299,
    duration: "mes",
    color: "white",
    features: [
      "Acceso a área de pesas",
      "Clases grupales básicas",
      "Vestidores y regaderas",
      "App Titanium básica",
      "Horario estándar",
      "Sin permanencia",
    ],
    popular: false,
    description: "Perfecto para comenzar tu journey fitness",
  },
  {
    id: 2,
    name: "TITANIUM ROJO",
    level: "MÁS POPULAR",
    price: 499,
    duration: "mes",
    color: "red",
    features: [
      "Todo lo del plan Básico",
      "Acceso 24/7",
      "Clases grupales premium",
      "Área cardio completo",
      "App Titanium premium",
      "2 sesiones con entrenador",
    ],
    popular: true,
    description: "El equilibrio perfecto entre calidad y precio",
  },
  {
    id: 3,
    name: "TITANIUM NEGRO",
    level: "PREMIUM",
    price: 799,
    duration: "mes",
    color: "black",
    features: [
      "Todo lo del plan Estándar",
      "Entrenador personal dedicado",
      "Acceso a zona VIP",
      "Nutricionista certificado",
      "Plan alimenticio personalizado",
      "Sesiones ilimitadas con coach",
    ],
    popular: false,
    description: "Experiencia fitness de élite completa",
  },
];

const services = [
  {
    title: "Entrenamiento Personalizado",
    desc: "Programas diseñados específicamente para tus objetivos con seguimiento constante de nuestros coaches certificados.",
    icon: "💪",
  },
  {
    title: "Asesoría Nutricional",
    desc: "Planes alimenticios personalizados y suplementación guiada por expertos en nutrición deportiva.",
    icon: "🥗",
  },
  {
    title: "Clases Grupales",
    desc: "HIIT, Yoga, Box, Spinning y más. Más de 45 clases semanales para mantener tu motivación al máximo.",
    icon: "👥",
  },
  {
    title: "Zona de Pesas Premium",
    desc: "Equipamiento Hammer Strength, racks olímpicos y área de peso libre completamente equipada.",
    icon: "🏋️",
  },
  {
    title: "App Titanium",
    desc: "Seguimiento de progreso, reservación de clases, planificación de workouts y comunidad exclusiva.",
    icon: "📱",
  },
  {
    title: "Área de Recuperación",
    desc: "Sauna, zona de stretching y recuperación activa para optimizar tu rendimiento.",
    icon: "🧘",
  },
];

export default function ServicesPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getMembershipColor = (color) => {
    switch (color) {
      case "white":
        return "#ffffff";
      case "red":
        return "#ef4444";
      case "black":
        return "#1a1a1a";
      default:
        return "#1a1a1a";
    }
  };

  const getTextColor = (color) => {
    return color === "white" ? "#1a1a1a" : "#ffffff";
  };

  const getBorderColor = (color) => {
    return color === "white" ? "#e5e5e5" : getMembershipColor(color);
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
      <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
        <div className="header-content">
          {/* USAMOS EN COMPONENTE NAVBAR*/}
          <Navbar scrolled={false} onToggleMobile={() => {}} />
          {/* Background Animation */}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <nav className="mobile-nav">
              <Link to="/" className="mobile-nav-link">
                INICIO
              </Link>
              <Link to="/catalogo" className="mobile-nav-link">
                PRODUCTOS
              </Link>
              <a
                href="#"
                className="mobile-nav-link active"
                onClick={(event) => event.preventDefault()}
              >
                SERVICIOS
              </a>
              <a
                href="#"
                className="mobile-nav-link"
                onClick={(event) => event.preventDefault()}
              >
                ACERCA DE
              </a>
              <div className="mobile-nav-buttons">
                <Link to="/register" className="slider-btn-outline">
                  SUSCRÍBETE
                </Link>
                <Link to="/login" className="slider-btn-solid">
                  INICIA SESIÓN
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Breadcrumbs - CENTRADOS */}
      <nav className="breadcrumbs breadcrumbs-centered">
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
            <span className="breadcrumb-current">MEMBRESÍAS</span>
          </li>
        </ol>
      </nav>

      {/* Hero Section Compacta */}
      <section className="subs-hero-compact">
        <div className="subs-hero-content-compact">
          <div className="subs-hero-text">
            <h1 className="subs-title-compact brush-text">
              MEMBRESÍAS TITANIUM
            </h1>
            <p className="subs-subtitle-compact">
              Elige el plan perfecto para tu transformación.
              <span className="highlight-red"> Primera semana GRATIS</span> en
              todos los planes.
            </p>
          </div>
          <div className="subs-hero-cta">
            <a href="#planes" className="subs-hero-btn">
              VER PLANES
              <svg
                className="subs-btn-arrow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
          </div>
        </div>
        <div className="subs-hero-benefits">
          <div className="benefit-item">
            <svg
              className="benefit-icon"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Sin contratos</span>
          </div>
          <div className="benefit-item">
            <svg
              className="benefit-icon"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Cancelación gratuita</span>
          </div>
          <div className="benefit-item">
            <svg
              className="benefit-icon"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Asesoría incluida</span>
          </div>
        </div>
      </section>

      {/* Sección de Planes (PRIMERA SECCIÓN VISIBLE) */}
      <section id="planes" className="subs-memberships-section">
        <div className="section-header">
          <h2 className="section-title brush-title">
            ELIGE TU <span className="text-red">PLAN IDEAL</span>
          </h2>
          <p className="section-subtitle">
            Tres opciones diseñadas para cada nivel de compromiso fitness
          </p>
        </div>

        <div className="subs-memberships-container">
          <div className="subs-memberships-grid">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className={`subs-membership-card ${
                  membership.popular ? "subs-membership-popular" : ""
                }`}
                style={{
                  background: getMembershipColor(membership.color),
                  color: getTextColor(membership.color),
                  border: `2px solid ${getBorderColor(membership.color)}`,
                }}
              >
                {membership.popular && (
                  <div className="subs-popular-badge">MÁS POPULAR</div>
                )}
                <div className="subs-membership-header">
                  <div
                    className="subs-membership-level"
                    style={{
                      color:
                        membership.color === "white" ? "#ef4444" : "#ffffff",
                      opacity: 1,
                    }}
                  >
                    {membership.level}
                  </div>
                  <h3
                    className="subs-membership-name brush-text"
                    style={{
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                      background:
                        membership.color === "white" ? "none" : undefined,
                      WebkitBackgroundClip:
                        membership.color === "white" ? "initial" : undefined,
                      WebkitTextFillColor:
                        membership.color === "white" ? "#1a1a1a" : undefined,
                    }}
                  >
                    {membership.name}
                  </h3>
                  <p
                    className="subs-membership-description"
                    style={{
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {membership.description}
                  </p>
                </div>
                <div className="subs-membership-price">
                  <span
                    className="subs-price-currency"
                    style={{
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    $
                  </span>
                  <span
                    className="subs-price-amount"
                    style={{
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {membership.price}
                  </span>
                  <span
                    className="subs-price-duration"
                    style={{
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    /{membership.duration}
                  </span>
                </div>
                <ul className="subs-membership-features">
                  {membership.features.map((feature, index) => (
                    <li key={index} className="subs-feature-item">
                      <svg
                        className="subs-feature-icon"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{
                          color:
                            membership.color === "white"
                              ? "#ef4444"
                              : "#ffffff",
                        }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            membership.color === "white"
                              ? "#1a1a1a"
                              : "#ffffff",
                        }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to="/payment">
                  <button
                    className={`subs-membership-btn ${
                      membership.color === "white"
                        ? "subs-btn-outline"
                        : "subs-btn-solid"
                    }`}
                    style={{
                      background:
                        membership.color === "white"
                          ? "transparent"
                          : getMembershipColor(membership.color),
                      color:
                        membership.color === "white" ? "#1a1a1a" : "#ffffff",
                      borderColor:
                        membership.color === "white"
                          ? "#1a1a1a"
                          : getMembershipColor(membership.color),
                    }}
                  >
                    ELEGIR PLAN
                    <svg
                      className="subs-btn-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        color:
                          membership.color === "white" ? "#1a1a1a" : "#ffffff",
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner de Promoción (ANTES de los servicios) */}
      <section className="promo-banner">
        <div className="promo-content">
          <div className="promo-text">
            <h3 className="promo-title brush-text">
              <span className="text-red">1 SEMANA GRATIS</span> + 20% DESCUENTO
            </h3>
            <p className="promo-subtitle">
              Al suscribirte hoy mismo. Oferta válida por tiempo limitado.
            </p>
          </div>
          <div className="promo-cta">
            <Link to="/register" className="promo-btn-primary">
              APROVECHAR OFERTA
              <svg
                className="promo-btn-arrow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <a href="tel:+521234567890" className="promo-btn-secondary">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              LLAMAR AHORA
            </a>
          </div>
        </div>
      </section>

      {/* Servicios Adicionales */}
      <section className="subs-services-section">
        <div className="section-header">
          <h2 className="section-title brush-title">
            SERVICIOS <span className="text-red">TITANIUM</span>
          </h2>
          <p className="section-subtitle">
            Más que un gimnasio, somos tu partner en el journey fitness.
          </p>
        </div>

        <div className="subs-services-grid">
          {services.map((service, index) => (
            <div key={index} className="subs-service-card">
              <div className="subs-service-icon">{service.icon}</div>
              <div className="subs-service-content">
                <h3 className="subs-service-title">{service.title}</h3>
                <p className="subs-service-desc">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title brush-title">
            PREGUNTAS <span className="text-red">FRECUENTES</span>
          </h2>
        </div>

        <div className="faq-container">
          <div className="faq-item">
            <button className="faq-question">
              ¿Puedo cambiar de plan después?
              <svg
                className="faq-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="faq-answer">
              Sí, puedes cambiar a cualquier plan en cualquier momento sin
              costos adicionales.
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question">
              ¿Cómo funciona la semana gratis?
              <svg
                className="faq-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="faq-answer">
              La primera semana es completamente gratis. Si decides quedarte, se
              aplicará el pago mensual a partir de la segunda semana.
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question">
              ¿Hay contratos de permanencia?
              <svg
                className="faq-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="faq-answer">
              No, todos nuestros planes son mensuales sin contratos de
              permanencia. Puedes cancelar en cualquier momento.
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
