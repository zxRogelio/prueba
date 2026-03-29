import { startTransition, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaBolt,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCrown,
  FaDumbbell,
  FaFireAlt,
  FaInfinity,
  FaQuoteRight,
  FaShieldAlt,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import styles from "./SuscripcionesPage.module.css";

type BillingMode = "monthly" | "annual";
type PlanTheme = "light" | "dark";

type HeroBenefit = {
  label: string;
  icon: IconType;
};

type PlanFeature = {
  label: string;
  included: boolean;
};

type Plan = {
  id: string;
  name: string;
  description: string;
  icon: IconType;
  theme: PlanTheme;
  featured: boolean;
  monthlyPrice: number;
  annualPrice: number;
  features: PlanFeature[];
};

type Testimonial = {
  id: string;
  name: string;
  plan: string;
  tenure: string;
  quote: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const heroBenefits: HeroBenefit[] = [
  { label: "Sin permanencia", icon: FaBolt },
  { label: "Garantia 30 dias", icon: FaShieldAlt },
  { label: "Acceso ilimitado", icon: FaInfinity },
];

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basico",
    description: "Perfecto para comenzar tu rutina fitness con una base solida.",
    icon: FaDumbbell,
    theme: "light",
    featured: false,
    monthlyPrice: 499,
    annualPrice: 415,
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario limitado (6am - 6pm)", included: true },
      { label: "Equipos de cardio", included: true },
      { label: "Vestuarios y duchas", included: true },
      { label: "App de seguimiento", included: false },
      { label: "Clases grupales", included: false },
      { label: "Entrenador personal", included: false },
      { label: "Acceso 24/7", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "El plan favorito para avanzar mas rapido con una experiencia mas completa.",
    icon: FaCrown,
    theme: "dark",
    featured: true,
    monthlyPrice: 799,
    annualPrice: 665,
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario completo", included: true },
      { label: "Todos los equipos", included: true },
      { label: "Vestuarios y duchas", included: true },
      { label: "App de seguimiento", included: true },
      { label: "Clases grupales ilimitadas", included: true },
      { label: "1 sesion de entrenador / mes", included: true },
      { label: "Acceso 24/7", included: false },
    ],
  },
  {
    id: "elite",
    name: "Elite",
    description: "Pensado para quienes buscan resultados fuertes, atencion y mayor libertad.",
    icon: FaFireAlt,
    theme: "light",
    featured: false,
    monthlyPrice: 1199,
    annualPrice: 995,
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario completo", included: true },
      { label: "Todos los equipos", included: true },
      { label: "Vestuarios VIP", included: true },
      { label: "App de seguimiento premium", included: true },
      { label: "Clases grupales ilimitadas", included: true },
      { label: "4 sesiones de entrenador / mes", included: true },
      { label: "Acceso 24/7", included: true },
    ],
  },
];

const testimonials: Testimonial[] = [
  {
    id: "testimonial-1",
    name: "Ana Martinez",
    plan: "Premium",
    tenure: "10 meses con nosotros",
    quote:
      "Las clases grupales son lo mejor. Me encanta el ambiente y la energia que se siente. El equipo siempre esta atento a ayudarte en lo que necesites.",
  },
  {
    id: "testimonial-2",
    name: "Luis Herrera",
    plan: "Elite",
    tenure: "1 ano entrenando en Titanium",
    quote:
      "Lo que mas valoro es la estructura. Tengo acceso, seguimiento y sesiones que realmente me mantienen avanzando sin perder el ritmo.",
  },
  {
    id: "testimonial-3",
    name: "Sofia Vega",
    plan: "Basico",
    tenure: "5 meses en la comunidad",
    quote:
      "Entre por el plan mas accesible y me quede por la calidad del lugar. Nunca se siente improvisado y eso motiva mucho a volver.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Puedo cancelar mi membresia en cualquier momento?",
    answer:
      "Si. Todas nuestras membresias son sin permanencia. Puedes cancelar cuando quieras sin penalizaciones, solo te pedimos avisar antes de tu siguiente ciclo.",
  },
  {
    question: "Como funciona la garantia de 30 dias?",
    answer:
      "Si durante los primeros 30 dias sientes que el plan no era para ti, revisamos tu caso con el equipo y te ayudamos a cambiar de plan o resolver tu proceso.",
  },
  {
    question: "Puedo cambiar de plan en cualquier momento?",
    answer:
      "Si. Puedes subir o bajar de nivel segun tu momento. El ajuste se hace sobre tu siguiente corte para mantener el control de tu suscripcion.",
  },
  {
    question: "Que incluyen las sesiones con entrenador personal?",
    answer:
      "Incluyen evaluacion inicial, ajuste de rutina, correccion tecnica y seguimiento segun el plan que elijas. En Elite el acompanamiento es mas frecuente.",
  },
];

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "TS";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getAnnualSavings(plan: Plan) {
  return Math.round((1 - plan.annualPrice / plan.monthlyPrice) * 100);
}

const mxnPriceFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function formatPriceMXN(value: number) {
  return mxnPriceFormatter.format(value);
}

export default function SuscripcionesPage() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setActiveTestimonialIndex(
          (currentIndex) => (currentIndex + 1) % testimonials.length,
        );
      });
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeTestimonial = testimonials[activeTestimonialIndex];

  const goToPreviousTestimonial = () => {
    startTransition(() => {
      setActiveTestimonialIndex((currentIndex) =>
        currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1,
      );
    });
  };

  const goToNextTestimonial = () => {
    startTransition(() => {
      setActiveTestimonialIndex(
        (currentIndex) => (currentIndex + 1) % testimonials.length,
      );
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.pageTexture} aria-hidden="true" />
      <div className={styles.pageGlowTop} aria-hidden="true" />
      <div className={styles.pageGlowSide} aria-hidden="true" />

      <section className={styles.heroSection}>
        <div className={styles.shell}>
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>Planes exclusivos</span>

            <h1 className={styles.heroTitle}>
              Elige tu <span className={styles.titleAccent}>Membresia</span>
            </h1>

            <p className={styles.heroDescription}>
              Accede a instalaciones de primer nivel, entrenadores certificados
              y una comunidad comprometida con tu transformacion. Sin contratos
              largos, cancela cuando quieras.
            </p>

            <div className={styles.heroBenefits}>
              {heroBenefits.map((benefit, index) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.label}
                    className={styles.benefitChip}
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <span className={styles.benefitIcon}>
                      <Icon />
                    </span>
                    <span>{benefit.label}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.scrollCue}>
              <span>Desliza para ver planes</span>
              <a href="#planes" className={styles.scrollMouse} aria-label="Ir a los planes">
                <span className={styles.scrollWheel} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className={styles.plansSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Membresias Titanium</span>
            <h2 className={styles.sectionTitle}>
              Nuestros <span className={styles.sectionAccent}>Planes</span>
            </h2>
            <p className={styles.sectionDescription}>
              Elige el plan que mejor se adapta a tus objetivos y estilo de
              vida.
            </p>
          </div>

          <div className={styles.billingToggle} role="tablist" aria-label="Facturacion">
            <button
              type="button"
              className={`${styles.billingButton} ${
                billingMode === "monthly" ? styles.billingButtonActive : ""
              }`}
              onClick={() => startTransition(() => setBillingMode("monthly"))}
              aria-pressed={billingMode === "monthly"}
            >
              Mensual
            </button>

            <button
              type="button"
              className={`${styles.billingButton} ${
                billingMode === "annual" ? styles.billingButtonActive : ""
              }`}
              onClick={() => startTransition(() => setBillingMode("annual"))}
              aria-pressed={billingMode === "annual"}
            >
              <span>Anual</span>
              <span className={styles.billingDiscount}>-17%</span>
            </button>
          </div>

          <div className={styles.plansGrid}>
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price =
                billingMode === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const savings = getAnnualSavings(plan);

              return (
                <article
                  key={plan.id}
                  className={`${styles.planCard} ${
                    plan.theme === "dark" ? styles.planCardDark : styles.planCardLight
                  } ${plan.featured ? styles.planCardFeatured : ""}`}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {plan.featured ? (
                    <div className={styles.planPopularBadge}>
                      <FaStar />
                      <span>Mas popular</span>
                    </div>
                  ) : null}

                  <div className={styles.planHeader}>
                    <div className={styles.planIdentity}>
                      <span className={styles.planIconWrap}>
                        <Icon />
                      </span>

                      <div>
                        <h3 className={styles.planName}>{plan.name}</h3>
                        <p className={styles.planBlurb}>{plan.description}</p>
                      </div>
                    </div>

                    <div className={styles.planPriceGroup}>
                      <div className={styles.planPriceLine}>
                        <strong className={styles.planPrice}>
                          {formatPriceMXN(price)}
                        </strong>
                        <span className={styles.planPriceSuffix}>MXN / mes</span>
                      </div>

                      <p className={styles.planPriceMeta}>
                        {billingMode === "monthly"
                          ? "Sin ataduras y con renovacion flexible."
                          : `Facturado anual. Ahorras ${savings}% contra el pago mensual.`}
                      </p>
                    </div>
                  </div>

                  <ul className={styles.featureList}>
                    {plan.features.map((feature) => (
                      <li
                        key={feature.label}
                        className={`${styles.featureItem} ${
                          feature.included
                            ? styles.featureItemIncluded
                            : styles.featureItemDisabled
                        }`}
                      >
                        <span
                          className={`${styles.featureIcon} ${
                            feature.included
                              ? styles.featureIconIncluded
                              : styles.featureIconDisabled
                          }`}
                        >
                          {feature.included ? <FaCheck /> : <FaTimes />}
                        </span>
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`${styles.planButton} ${
                      plan.featured ? styles.planButtonFeatured : styles.planButtonNeutral
                    }`}
                  >
                    Comenzar Ahora
                  </Link>
                </article>
              );
            })}
          </div>

          <div className={styles.trustBlock}>
            <p className={styles.trustText}>
              Mas de <strong>10,000+</strong> miembros activos confian en
              nosotros
            </p>
            <div className={styles.trustRating}>
              <div className={styles.trustStars} aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FaStar key={`trust-star-${index}`} />
                ))}
              </div>
              <span>4.9/5 valoracion</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.testimonialSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeaderDark}>
            <span className={styles.sectionBadgeDark}>Historias reales</span>
            <h2 className={styles.sectionTitleDark}>
              Lo que dicen nuestros <span className={styles.sectionAccent}>Miembros</span>
            </h2>
            <p className={styles.sectionDescriptionDark}>
              Historias de transformacion reales. Unete a miles que ya
              convirtieron el entrenamiento en una rutina que disfrutan.
            </p>
          </div>

          <div className={styles.testimonialStage}>
            <article key={activeTestimonial.id} className={styles.testimonialCard}>
              <div className={styles.testimonialQuoteMark}>
                <FaQuoteRight />
              </div>

              <div className={styles.testimonialTop}>
                <div className={styles.testimonialStars}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FaStar key={`${activeTestimonial.id}-star-${index}`} />
                  ))}
                </div>

                <p className={styles.testimonialQuote}>
                  "{activeTestimonial.quote}"
                </p>
              </div>

              <div className={styles.testimonialFooter}>
                <div className={styles.memberIdentity}>
                  <div className={styles.memberAvatar}>
                    {getInitials(activeTestimonial.name)}
                  </div>

                  <div className={styles.memberMeta}>
                    <div className={styles.memberNameRow}>
                      <strong className={styles.memberName}>
                        {activeTestimonial.name}
                      </strong>
                      <span className={styles.memberPlan}>
                        {activeTestimonial.plan}
                      </span>
                    </div>
                    <span className={styles.memberTenure}>
                      {activeTestimonial.tenure}
                    </span>
                  </div>
                </div>

                <div className={styles.testimonialControls}>
                  <div className={styles.testimonialDots}>
                    {testimonials.map((testimonial, index) => (
                      <button
                        key={testimonial.id}
                        type="button"
                        className={`${styles.testimonialDot} ${
                          index === activeTestimonialIndex
                            ? styles.testimonialDotActive
                            : ""
                        }`}
                        onClick={() =>
                          startTransition(() => setActiveTestimonialIndex(index))
                        }
                        aria-label={`Mostrar testimonio ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className={styles.testimonialNav}>
                    <button
                      type="button"
                      className={styles.testimonialNavButton}
                      onClick={goToPreviousTestimonial}
                      aria-label="Testimonio anterior"
                    >
                      <FaChevronLeft />
                    </button>

                    <button
                      type="button"
                      className={`${styles.testimonialNavButton} ${styles.testimonialNavButtonActive}`}
                      onClick={goToNextTestimonial}
                      aria-label="Testimonio siguiente"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Preguntas frecuentes</span>
            <h2 className={styles.sectionTitle}>
              Tienes <span className={styles.sectionAccent}>Dudas?</span>
            </h2>
            <p className={styles.sectionDescription}>
              Aqui encuentras respuestas claras a las preguntas mas comunes. Si
              aun no ves lo que buscas, puedes registrarte y nuestro equipo te
              guia.
            </p>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, index) => {
              const isOpen = activeFaqIndex === index;

              return (
                <article
                  key={faq.question}
                  className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}
                >
                  <button
                    type="button"
                    className={styles.faqButton}
                    onClick={() =>
                      setActiveFaqIndex((currentIndex) =>
                        currentIndex === index ? -1 : index,
                      )
                    }
                    aria-expanded={isOpen}
                  >
                    <span className={styles.faqQuestion}>{faq.question}</span>
                    <span
                      className={`${styles.faqToggle} ${
                        isOpen ? styles.faqToggleOpen : ""
                      }`}
                    >
                      <FaChevronDown />
                    </span>
                  </button>

                  <div
                    className={`${styles.faqAnswerWrap} ${
                      isOpen ? styles.faqAnswerWrapOpen : ""
                    }`}
                  >
                    <div className={styles.faqAnswerInner}>
                      <p className={styles.faqAnswer}>{faq.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.faqSupport}>
            <div>
              <span className={styles.faqSupportTag}>Listo para empezar</span>
              <h3 className={styles.faqSupportTitle}>
                Encuentra el plan que mejor se adapta a tu ritmo
              </h3>
            </div>

            <Link to="/register" className={styles.supportButton}>
              Quiero mi membresia
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
