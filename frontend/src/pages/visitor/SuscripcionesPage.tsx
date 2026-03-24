import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./SuscripcionesPage.module.css";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

type MembershipColor = "white" | "red" | "black";

type Membership = {
  id: number;
  name: string;
  level: string;
  price: number;
  duration: string;
  color: MembershipColor;
  features: string[];
  popular: boolean;
  description: string;
};

const memberships: Membership[] = [
  {
    id: 1,
    name: "CARTE BLANCHE",
    level: "BASICO",
    price: 299,
    duration: "mes",
    color: "white",
    features: [
      "Acceso a area de pesas",
      "Clases grupales basicas",
      "Vestidores y regaderas",
      "App Titanium basica",
      "Horario estandar",
      "Sin permanencia",
    ],
    popular: false,
    description: "Perfecto para comenzar tu journey fitness",
  },
  {
    id: 2,
    name: "TITANIUM ROJO",
    level: "MAS POPULAR",
    price: 499,
    duration: "mes",
    color: "red",
    features: [
      "Todo lo del plan basico",
      "Acceso 24/7",
      "Clases grupales premium",
      "Area cardio completa",
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
      "Todo lo del plan estandar",
      "Entrenador personal dedicado",
      "Acceso a zona VIP",
      "Nutricionista certificado",
      "Plan alimenticio personalizado",
      "Sesiones ilimitadas con coach",
    ],
    popular: false,
    description: "Experiencia fitness de elite completa",
  },
];

const services = [
  {
    title: "Entrenamiento Personalizado",
    desc: "Programas disenados especificamente para tus objetivos con seguimiento constante de nuestros coaches certificados.",
    icon: "💪",
  },
  {
    title: "Asesoria Nutricional",
    desc: "Planes alimenticios personalizados y suplementacion guiada por expertos en nutricion deportiva.",
    icon: "🥗",
  },
  {
    title: "Clases Grupales",
    desc: "HIIT, Yoga, Box, Spinning y mas. Mas de 45 clases semanales para mantener tu motivacion al maximo.",
    icon: "👥",
  },
  {
    title: "Zona de Pesas Premium",
    desc: "Equipamiento Hammer Strength, racks olimpicos y area de peso libre completamente equipada.",
    icon: "🏋️",
  },
  {
    title: "App Titanium",
    desc: "Seguimiento de progreso, reservacion de clases, planificacion de workouts y comunidad exclusiva.",
    icon: "📱",
  },
  {
    title: "Area de Recuperacion",
    desc: "Sauna, zona de stretching y recuperacion activa para optimizar tu rendimiento.",
    icon: "🧘",
  },
];

const faqs = [
  {
    question: "Puedes cambiar de plan despues?",
    answer:
      "Si, puedes cambiar a cualquier plan en cualquier momento sin costos adicionales.",
  },
  {
    question: "Como funciona la semana gratis?",
    answer:
      "La primera semana es completamente gratis. Si decides quedarte, se aplicara el pago mensual a partir de la segunda semana.",
  },
  {
    question: "Hay contratos de permanencia?",
    answer:
      "No, todos nuestros planes son mensuales sin contratos de permanencia. Puedes cancelar en cualquier momento.",
  },
];

export default function SuscripcionesPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const getMembershipColor = (color: MembershipColor) => {
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

  const getTextColor = (color: MembershipColor) =>
    color === "white" ? "#1a1a1a" : "#ffffff";

  const getBorderColor = (color: MembershipColor) =>
    color === "white" ? "#e5e5e5" : getMembershipColor(color);

  return (
    <div className={cx("page-container")}>
      <div className={cx("bg-animation")} aria-hidden="true">
        <div className={cx("bg-grid")} />
        <div className={cx("bg-glow", "bg-glow-1")} />
        <div className={cx("bg-glow", "bg-glow-2")} />
      </div>

      <nav className={cx("breadcrumbs", "breadcrumbs-centered")}>
        <ol className={cx("breadcrumb-list")}>
          <li className={cx("breadcrumb-item")}>
            <Link to="/" className={cx("breadcrumb-link")}>
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
          <li className={cx("breadcrumb-separator")}>/</li>
          <li className={cx("breadcrumb-item")}>
            <span className={cx("breadcrumb-current")}>MEMBRESIAS</span>
          </li>
        </ol>
      </nav>

      <section className={cx("subs-hero-compact")}>
        <div className={cx("subs-hero-content-compact")}>
          <div className={cx("subs-hero-text")}>
            <h1 className={cx("subs-title-compact", "brush-text")}>
              MEMBRESIAS TITANIUM
            </h1>
            <p className={cx("subs-subtitle-compact")}>
              Elige el plan perfecto para tu transformacion.
              <span className={cx("highlight-red")}> Primera semana GRATIS</span> en
              todos los planes.
            </p>
          </div>
          <div className={cx("subs-hero-cta")}>
            <a href="#planes" className={cx("subs-hero-btn")}>
              VER PLANES
              <svg
                className={cx("subs-btn-arrow")}
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

        <div className={cx("subs-hero-benefits")}>
          {["Sin contratos", "Cancelacion gratuita", "Asesoria incluida"].map(
            (benefit) => (
              <div key={benefit} className={cx("benefit-item")}>
                <svg
                  className={cx("benefit-icon")}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{benefit}</span>
              </div>
            )
          )}
        </div>
      </section>

      <section id="planes" className={cx("subs-memberships-section")}>
        <div className={cx("section-header")}>
          <h2 className={cx("section-title", "brush-title")}>
            ELIGE TU <span className={cx("text-red")}>PLAN IDEAL</span>
          </h2>
          <p className={cx("section-subtitle")}>
            Tres opciones disenadas para cada nivel de compromiso fitness
          </p>
        </div>

        <div className={cx("subs-memberships-container")}>
          <div className={cx("subs-memberships-grid")}>
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className={cx(
                  "subs-membership-card",
                  membership.popular && "subs-membership-popular"
                )}
                style={{
                  background: getMembershipColor(membership.color),
                  color: getTextColor(membership.color),
                  border: `2px solid ${getBorderColor(membership.color)}`,
                }}
              >
                {membership.popular && (
                  <div className={cx("subs-popular-badge")}>MAS POPULAR</div>
                )}

                <div className={cx("subs-membership-header")}>
                  <div
                    className={cx("subs-membership-level")}
                    style={{
                      color: membership.color === "white" ? "#ef4444" : "#ffffff",
                    }}
                  >
                    {membership.level}
                  </div>

                  <h3
                    className={cx("subs-membership-name", "brush-text")}
                    style={{
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {membership.name}
                  </h3>

                  <p
                    className={cx("subs-membership-description")}
                    style={{
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {membership.description}
                  </p>
                </div>

                <div className={cx("subs-membership-price")}>
                  <span
                    className={cx("subs-price-currency")}
                    style={{
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    $
                  </span>
                  <span
                    className={cx("subs-price-amount")}
                    style={{
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {membership.price}
                  </span>
                  <span
                    className={cx("subs-price-duration")}
                    style={{
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    /{membership.duration}
                  </span>
                </div>

                <ul className={cx("subs-membership-features")}>
                  {membership.features.map((feature) => (
                    <li key={feature} className={cx("subs-feature-item")}>
                      <svg
                        className={cx("subs-feature-icon")}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{
                          color: membership.color === "white" ? "#ef4444" : "#ffffff",
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
                          color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                        }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to="/payment" className={cx("subs-membership-link")}>
                  <span
                    className={cx(
                      "subs-membership-btn",
                      membership.color === "white"
                        ? "subs-btn-outline"
                        : "subs-btn-solid"
                    )}
                    style={{
                      background:
                        membership.color === "white"
                          ? "transparent"
                          : getMembershipColor(membership.color),
                      color: membership.color === "white" ? "#1a1a1a" : "#ffffff",
                      borderColor:
                        membership.color === "white"
                          ? "#1a1a1a"
                          : getMembershipColor(membership.color),
                    }}
                  >
                    ELEGIR PLAN
                    <svg
                      className={cx("subs-btn-arrow")}
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
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("promo-banner")}>
        <div className={cx("promo-content")}>
          <div className={cx("promo-text")}>
            <h3 className={cx("promo-title", "brush-text")}>
              <span className={cx("text-red")}>1 SEMANA GRATIS</span> + 20%
              DESCUENTO
            </h3>
            <p className={cx("promo-subtitle")}>
              Al suscribirte hoy mismo. Oferta valida por tiempo limitado.
            </p>
          </div>
          <div className={cx("promo-cta")}>
            <Link to="/register" className={cx("promo-btn-primary")}>
              APROVECHAR OFERTA
              <svg
                className={cx("promo-btn-arrow")}
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
            <a href="tel:+521234567890" className={cx("promo-btn-secondary")}>
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              LLAMAR AHORA
            </a>
          </div>
        </div>
      </section>

      <section className={cx("subs-services-section")}>
        <div className={cx("section-header")}>
          <h2 className={cx("section-title", "brush-title")}>
            SERVICIOS <span className={cx("text-red")}>TITANIUM</span>
          </h2>
          <p className={cx("section-subtitle")}>
            Mas que un gimnasio, somos tu partner en el journey fitness.
          </p>
        </div>

        <div className={cx("subs-services-grid")}>
          {services.map((service) => (
            <div key={service.title} className={cx("subs-service-card")}>
              <div className={cx("subs-service-icon")}>{service.icon}</div>
              <div className={cx("subs-service-content")}>
                <h3 className={cx("subs-service-title")}>{service.title}</h3>
                <p className={cx("subs-service-desc")}>{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cx("faq-section")}>
        <div className={cx("section-header")}>
          <h2 className={cx("section-title", "brush-title")}>
            PREGUNTAS <span className={cx("text-red")}>FRECUENTES</span>
          </h2>
        </div>

        <div className={cx("faq-container")}>
          {faqs.map((item, index) => (
            <div key={item.question} className={cx("faq-item")}>
              <button
                type="button"
                className={cx(
                  "faq-question",
                  openFaqIndex === index && "faq-question-active"
                )}
                onClick={() =>
                  setOpenFaqIndex((prev) => (prev === index ? -1 : index))
                }
              >
                {item.question}
                <svg
                  className={cx("faq-icon")}
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
              <div
                className={cx(
                  "faq-answer",
                  openFaqIndex === index && "faq-answer-active"
                )}
              >
                {item.answer}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
