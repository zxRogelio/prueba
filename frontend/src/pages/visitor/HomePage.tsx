import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaBolt,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCrown,
  FaDumbbell,
  FaEnvelope,
  FaFireAlt,
  FaGlobeAmericas,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaRegEye,
  FaShoppingCart,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import styles from "./HomePage.module.css";
import { useCart } from "../../context/CartContext";
import {
  fetchCatalogProducts,
  getCatalogProductPath,
  type CatalogProductView,
} from "./catalogData";

import HeroExterior from "../../assets/SliderTitanuim.jpg";
import HeroTeam from "../../assets/abaout1.jpg";
import HeroCoaching from "../../assets/vision.jpg";
import TrainerCarlos from "../../assets/1.jpg";
import TrainerMaria from "../../assets/2.jpg";
import TrainerAlex from "../../assets/3.jpg";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

type HeroSlide = {
  label: string;
  title: string;
  accent: string;
  description: string;
  image: string;
};

type WelcomeFeature = {
  icon: IconType;
  title: string;
  description: string;
  badge: string;
  image: string;
  linkLabel: string;
  linkTo: string;
};

type PlanItem = {
  id: string;
  name: string;
  description: string;
  icon: IconType;
  theme: "light" | "dark";
  price: number;
  features: Array<{
    label: string;
    included: boolean;
  }>;
  popular?: boolean;
};

type TrainerItem = {
  name: string;
  role: string;
  description: string;
  image: string;
};

type DayKey = "Lun" | "Mar" | "Mie" | "Jue" | "Vie" | "Sab" | "Dom";

type ScheduleStatus = "weekday" | "saturday" | "sunday";

type ScheduleDay = {
  shortLabel: DayKey;
  label: string;
  schedule: string;
  description: string;
  status: ScheduleStatus;
  hoursOpen: string;
};

const heroSlides: HeroSlide[] = [
  {
    label: "Bienvenido a:",
    title: "Titanium Sport Gym",
    accent: "Tu destino de transformacion",
    description:
      "Descubre un espacio disenado para potenciar tu rendimiento, con entrenadores presentes y una comunidad que empuja tu progreso cada dia.",
    image: HeroExterior,
  },
  {
    label: "Entrena con:",
    title: "Coaching Titanium",
    accent: "Tecnica, energia y acompanamiento",
    description:
      "Cada sesion busca que avances con mas estructura, mejor ejecucion y una experiencia visual mucho mas fuerte en todo el home.",
    image: HeroCoaching,
  },
  {
    label: "Vive una:",
    title: "Comunidad real",
    accent: "Disciplina, identidad y constancia",
    description:
      "Titanium no se siente generico. Tiene ambiente propio, bloques claros y una narrativa visual mas cercana a la referencia que me mostraste.",
    image: HeroTeam,
  },
];

const welcomeFeatures: WelcomeFeature[] = [
  {
    icon: FaMoneyBillWave,
    title: "La mejor relacion calidad-precio para arrancar fuerte",
    description:
      "Planes claros, acceso real al gimnasio y una experiencia mucho mas premium sin sentirse lejana o fria.",
    badge: "Planes desde $299",
    image: HeroExterior,
    linkLabel: "Ver suscripciones",
    linkTo: "/suscripciones",
  },
  {
    icon: FaDumbbell,
    title: "Equipo para cardio, fuerza y sesiones con mas ritmo",
    description:
      "Zona de pesas, cardio y trabajo funcional en un recorrido que se siente activo, amplio y con energia.",
    badge: "Zona de fuerza y cardio",
    image: HeroCoaching,
    linkLabel: "Explorar servicios",
    linkTo: "/servicios",
  },
  {
    icon: FaGlobeAmericas,
    title: "Una comunidad que si te hace volver cada semana",
    description:
      "No vendes solo maquinas. Vendes ambiente, constancia, coaches visibles y un lugar donde entrenar se siente natural.",
    badge: "Comunidad Titanium",
    image: HeroTeam,
    linkLabel: "Conocer mas",
    linkTo: "/AboutePage",
  },
];

const plans: PlanItem[] = [
  {
    id: "basic",
    name: "Basico",
    description: "Perfecto para comenzar tu rutina fitness con una base solida.",
    icon: FaDumbbell,
    theme: "light",
    price: 499,
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
    price: 799,
    popular: true,
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
    price: 1199,
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

const mxnPriceFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function formatPriceMXN(value: number) {
  return mxnPriceFormatter.format(value);
}

const trainers: TrainerItem[] = [
  {
    name: "Carlos Mendoza",
    role: "Fuerza y coaching principal",
    description:
      "Sesiones enfocadas en tecnica, progresion y una ejecucion mucho mas limpia dentro del piso.",
    image: TrainerCarlos,
  },
  {
    name: "Maria Gonzalez",
    role: "Nutricion y acompanamiento",
    description:
      "Seguimiento cercano para sostener habitos, alimentacion y constancia a largo plazo.",
    image: TrainerMaria,
  },
  {
    name: "Alex Rodriguez",
    role: "Entrenamiento funcional",
    description:
      "Clases intensas, movilidad y trabajo dinamico para quienes buscan subir nivel con estructura.",
    image: TrainerAlex,
  },
];

const weeklySchedule: ScheduleDay[] = [
  {
    shortLabel: "Lun",
    label: "Lunes",
    schedule: "5:30 AM - 11:00 PM",
    description: "Acceso general a pesas, cardio y zona funcional.",
    status: "weekday",
    hoursOpen: "17.5 horas abiertas",
  },
  {
    shortLabel: "Mar",
    label: "Martes",
    schedule: "5:30 AM - 11:00 PM",
    description: "Acceso general a pesas, cardio y zona funcional.",
    status: "weekday",
    hoursOpen: "17.5 horas abiertas",
  },
  {
    shortLabel: "Mie",
    label: "Miercoles",
    schedule: "5:30 AM - 11:00 PM",
    description: "Acceso general a pesas, cardio y zona funcional.",
    status: "weekday",
    hoursOpen: "17.5 horas abiertas",
  },
  {
    shortLabel: "Jue",
    label: "Jueves",
    schedule: "5:30 AM - 11:00 PM",
    description: "Acceso general a pesas, cardio y zona funcional.",
    status: "weekday",
    hoursOpen: "17.5 horas abiertas",
  },
  {
    shortLabel: "Vie",
    label: "Viernes",
    schedule: "5:30 AM - 11:00 PM",
    description: "Acceso general a pesas, cardio y zona funcional.",
    status: "weekday",
    hoursOpen: "17.5 horas abiertas",
  },
  {
    shortLabel: "Sab",
    label: "Sabado",
    schedule: "8:00 AM - 6:00 PM",
    description: "Operacion de fin de semana con zonas principales.",
    status: "saturday",
    hoursOpen: "10 horas abiertas",
  },
  {
    shortLabel: "Dom",
    label: "Domingo",
    schedule: "8:00 AM - 4:00 PM",
    description: "Horario dominical con operacion reducida.",
    status: "sunday",
    hoursOpen: "8 horas abiertas",
  },
];

function getScheduleStatusLabel(status: ScheduleStatus) {
  if (status === "weekday") return "Horario amplio";
  if (status === "saturday") return "Jornada sabatina";
  return "Horario dominical";
}

const HOME_STORE_PRODUCTS_LIMIT = 6;

export default function HomePage() {
  const { addItem, openCart } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [storeProducts, setStoreProducts] = useState<CatalogProductView[]>([]);
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const productTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadStoreProducts = async () => {
      setIsStoreLoading(true);

      try {
        const nextProducts = await fetchCatalogProducts();
        if (ignore) return;
        setStoreProducts(nextProducts);
      } catch (error) {
        if (ignore) return;
        console.error("fetchCatalogProducts error:", error);
        setStoreProducts([]);
      } finally {
        if (!ignore) {
          setIsStoreLoading(false);
        }
      }
    };

    void loadStoreProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const activeSlide = heroSlides[currentSlide];
  const homeStoreProducts = useMemo(() => {
    const recommendedProducts = [...storeProducts].sort((left, right) => {
      if (Number(right.inStock) !== Number(left.inStock)) {
        return Number(right.inStock) - Number(left.inStock);
      }

      if (Number(right.featured) !== Number(left.featured)) {
        return Number(right.featured) - Number(left.featured);
      }

      return (
        new Date(right.createdAt ?? 0).getTime() -
        new Date(left.createdAt ?? 0).getTime()
      );
    });

    return recommendedProducts.slice(0, HOME_STORE_PRODUCTS_LIMIT);
  }, [storeProducts]);

  const scrollProducts = (direction: number) => {
    const track = productTrackRef.current;

    if (!track) return;

    const scrollAmount = Math.max(280, track.clientWidth * 0.92);

    track.scrollBy({
      left: scrollAmount * direction,
      behavior: "smooth",
    });
  };

  const addProductToCart = (product: CatalogProductView) => {
    if (!product.inStock) return;
    addItem(product);
    openCart();
  };

  return (
    <main className={cx("home-page")}>
      <section className={cx("home-hero")}>
        <div className={cx("home-hero__media")} aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.title}
              className={cx(
                "home-hero__slide",
                index === currentSlide && "is-active",
              )}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>

        <div className={cx("home-hero__overlay")} />

        <div className={cx("home-shell home-hero__inner")}>
          <div key={activeSlide.title} className={cx("home-hero__copy")}>
            <span className={cx("home-hero__label")}>{activeSlide.label}</span>
            <h1 className={cx("home-hero__title")}>{activeSlide.title}</h1>
            <p className={cx("home-hero__accent")}>{activeSlide.accent}</p>
            <p className={cx("home-hero__description")}>
              {activeSlide.description}
            </p>

            <div className={cx("home-hero__actions")}>
              <Link
                to="/register"
                className={cx("home-button home-button--solid")}
              >
                SUSCRIBETE
              </Link>
              <Link
                to="/AboutePage"
                className={cx("home-button home-button--outline")}
              >
                CONOCE MAS
              </Link>
            </div>

            <div className={cx("home-hero__scroll")}>
              <span>Desliza y descubre Titanium</span>
              <span className={cx("home-hero__scroll-line")} />
            </div>
          </div>

          <div className={cx("home-hero__dots")}>
            {heroSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={cx(
                  "home-hero__dot",
                  index === currentSlide && "is-active",
                )}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className={cx("home-welcome")}>
        <div className={cx("home-welcome__media-band")}>
          <div className={cx("home-shell")}>
            <div className={cx("home-welcome__media-frame")}>
              <img
                src={HeroCoaching}
                alt="Entrenamiento dinamico en Titanium Sport Gym"
                className={cx("home-welcome__media-image")}
              />
              <div className={cx("home-welcome__media-overlay")} />

              <div
                className={cx(
                  "home-welcome__floating-note",
                  "home-welcome__floating-note--left",
                )}
              >
                <span className={cx("home-welcome__floating-kicker")}>
                  <FaBolt />
                  Alta energia
                </span>
                <strong>Coaching visible y ambiente con mucha mas vida</strong>
              </div>

              <div
                className={cx(
                  "home-welcome__floating-note",
                  "home-welcome__floating-note--right",
                )}
              >
                <div className={cx("home-welcome__avatar-stack")}>
                  {trainers.slice(0, 3).map((trainer) => (
                    <img
                      key={trainer.name}
                      src={trainer.image}
                      alt={trainer.name}
                      className={cx("home-welcome__avatar")}
                    />
                  ))}
                </div>
                <div className={cx("home-welcome__floating-copy")}>
                  <span>Coaches en piso</span>
                  <strong>Acompanamiento real en cada sesion</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cx("home-shell home-welcome__content")}>
          <div className={cx("home-section-head home-section-head--center")}>
            <span className={cx("home-welcome__eyebrow")}>
              Experiencia Titanium
            </span>
            <h2 className={cx("home-welcome__title")}>
              UN LUGAR DONDE <span>TODOS</span> SE SIENTEN BIENVENIDOS
            </h2>
            <p className={cx("home-section-text")}>
              Tomando tu referencia, esta zona ahora baja del slider con una
              presencia mas fuerte: imagen protagonista, corte diagonal,
              informacion clara y una lectura visual mucho mas viva.
            </p>
          </div>

          <div className={cx("home-welcome__grid")}>
            {welcomeFeatures.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className={cx("home-welcome-card")}
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  <div className={cx("home-welcome-card__media")}>
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className={cx("home-welcome-card__image")}
                    />
                    <span className={cx("home-welcome-card__badge")}>
                      {feature.badge}
                    </span>
                  </div>

                  <div className={cx("home-welcome-card__body")}>
                    <span className={cx("home-welcome-card__icon")}>
                      <Icon />
                    </span>
                    <h3 className={cx("home-welcome-card__title")}>
                      {feature.title}
                    </h3>
                    <p className={cx("home-welcome-card__description")}>
                      {feature.description}
                    </p>
                    <Link
                      to={feature.linkTo}
                      className={cx("home-welcome-card__link")}
                    >
                      {feature.linkLabel}
                      <FaArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={cx("home-store")}>
        <div className={cx("home-shell")}>
          <div className={cx("home-section-head home-section-head--row")}>
            <div>
              <h2 className={cx("home-section-title home-section-title--left")}>
                TIENDA <span>ONLINE</span>
              </h2>
              <span className={cx("home-section-line")} />
            </div>

            <div className={cx("home-section-controls")}>
              <button
                type="button"
                className={cx("home-control-button")}
                onClick={() => scrollProducts(-1)}
                aria-label="Productos anteriores"
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                className={cx("home-control-button")}
                onClick={() => scrollProducts(1)}
                aria-label="Productos siguientes"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>

          <div className={cx("home-store__viewport")}>
            <div ref={productTrackRef} className={cx("home-store__track")}>
              {homeStoreProducts.map((product) => (
                <article key={product.id} className={cx("home-product-card")}>
                  <div
                    className={cx("home-product-card__image-wrap")}
                    data-product-name={product.name}
                  >
                    {product.badge && (
                      <span className={cx("home-product-card__badge")}>
                        {product.badge}
                      </span>
                    )}
                    <img
                      src={product.image}
                      alt={product.name}
                      className={cx("home-product-card__image")}
                      onLoad={(event) => {
                        event.currentTarget.style.display = "";
                        event.currentTarget.parentElement?.removeAttribute(
                          "data-image-fallback",
                        );
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.parentElement?.setAttribute(
                          "data-image-fallback",
                          "true",
                        );
                      }}
                    />
                  </div>

                  <div className={cx("home-product-card__body")}>
                    <h3 className={cx("home-product-card__name")}>
                      {product.name}
                    </h3>
                    <div className={cx("home-product-card__rating")}>
                      <div
                        className={cx("home-product-card__stars")}
                        aria-hidden="true"
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <FaStar
                            key={`${product.id}-${index}`}
                            className={cx(
                              index < product.rating ? "is-filled" : "is-empty",
                            )}
                          />
                        ))}
                      </div>
                      <span>({product.reviewCount})</span>
                    </div>
                    <div className={cx("home-product-card__price-row")}>
                      {typeof product.originalPrice === "number" &&
                        product.originalPrice > product.price && (
                          <span className={cx("home-product-card__old-price")}>
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      <span className={cx("home-product-card__price")}>
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                    <div className={cx("home-product-card__actions")}>
                      <button
                        type="button"
                        className={cx(
                          "home-product-card__action",
                          "home-product-card__action--primary",
                        )}
                        onClick={() => addProductToCart(product)}
                        disabled={!product.inStock}
                      >
                        <FaShoppingCart />
                        {product.inStock ? "Agregar al carrito" : "Sin stock"}
                      </button>
                      <Link
                        to={getCatalogProductPath(product.id)}
                        className={cx(
                          "home-product-card__action",
                          "home-product-card__action--secondary",
                        )}
                      >
                        <FaRegEye />
                        Ver detalles
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {!isStoreLoading && homeStoreProducts.length === 0 && (
            <p className={cx("home-section-text")}>
              No pudimos mostrar productos en este momento. Puedes ver todo el
              catalogo en la tienda completa.
            </p>
          )}
        </div>
      </section>

      <section className={cx("home-plans")}>
        <div className={cx("home-shell")}>
          <div className={cx("home-section-head home-section-head--center")}>
            <h2 className={cx("home-section-title")}>
              NUESTROS <span>PLANES</span>
            </h2>
            <p className={cx("home-section-text")}>
              Elige el plan que mejor se adapte a tus objetivos y estilo de vida
            </p>
          </div>

          <div className={cx("home-plans__grid")}>
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={cx(
                  "home-plan-card",
                  plan.theme === "dark"
                    ? "home-plan-card--dark"
                    : "home-plan-card--light",
                  plan.popular && "is-popular",
                )}
              >
                {plan.popular && (
                  <span className={cx("home-plan-card__popular")}>
                    <FaStar />
                    <span>Mas popular</span>
                  </span>
                )}

                <div className={cx("home-plan-card__header")}>
                  <div className={cx("home-plan-card__identity")}>
                    <span className={cx("home-plan-card__icon-wrap")}>
                      <plan.icon />
                    </span>

                    <div className={cx("home-plan-card__copy")}>
                      <h3 className={cx("home-plan-card__title")}>{plan.name}</h3>
                      <p className={cx("home-plan-card__description")}>
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className={cx("home-plan-card__price-block")}>
                    <div className={cx("home-plan-card__price")}>
                      <strong>{formatPriceMXN(plan.price)}</strong>
                      <span>MXN / mes</span>
                    </div>
                    <p className={cx("home-plan-card__meta")}>
                      Sin ataduras y con renovacion flexible.
                    </p>
                  </div>
                </div>

                <ul className={cx("home-plan-card__features")}>
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={cx(
                        "home-plan-card__feature",
                        !feature.included && "is-disabled",
                      )}
                    >
                      <span
                        className={cx(
                          "home-plan-card__feature-icon",
                          feature.included ? "is-included" : "is-disabled",
                        )}
                      >
                        {feature.included ? <FaCheck /> : <FaTimes />}
                      </span>
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/suscripciones"
                  className={cx(
                    "home-plan-card__button",
                    plan.popular && "is-popular",
                  )}
                >
                  Comenzar Ahora
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("home-trainers")}>
        <div className={cx("home-shell")}>
          <div className={cx("home-section-head home-section-head--center")}>
            <h2 className={cx("home-section-title")}>
              NUESTROS <span>ENTRENADORES</span>
            </h2>
            <p className={cx("home-section-text")}>
              Un equipo visible, cercano y alineado al tipo de experiencia que
              quieres transmitir en todo el home.
            </p>
          </div>

          <div className={cx("home-trainers__grid")}>
            {trainers.map((trainer) => (
              <article key={trainer.name} className={cx("home-trainer-card")}>
                <div className={cx("home-trainer-card__media")}>
                  <img
                    src={trainer.image}
                    alt={trainer.name}
                    className={cx("home-trainer-card__image")}
                  />
                </div>
                <div className={cx("home-trainer-card__body")}>
                  <span className={cx("home-trainer-card__role")}>
                    {trainer.role}
                  </span>
                  <h3 className={cx("home-trainer-card__name")}>
                    {trainer.name}
                  </h3>
                  <p className={cx("home-trainer-card__description")}>
                    {trainer.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("home-schedule")}>
        <div className={cx("home-shell home-schedule__inner")}>
          <div
            className={cx(
              "home-section-head home-section-head--center home-section-head--light",
            )}
          >
            <h2 className={cx("home-section-title home-section-title--light")}>
              HORARIOS DEL <span>GIMNASIO</span>
            </h2>
            <p className={cx("home-section-text home-section-text--light")}>
              Consulta los horarios reales de apertura para organizar tu semana
              y entrenar en Titanium con informacion actualizada.
            </p>
          </div>

          <div className={cx("home-schedule__table-wrap")}>
            <table className={cx("home-schedule__table")}>
              <thead>
                <tr>
                  {weeklySchedule.map((day) => (
                    <th key={day.shortLabel}>{day.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {weeklySchedule.map((day) => (
                    <td key={day.shortLabel}>
                      <article
                        className={cx(
                          "home-schedule__day-card",
                          `home-schedule__day-card--${day.status}`,
                        )}
                      >
                        <span className={cx("home-schedule__day-kicker")}>
                          <FaClock />
                          {getScheduleStatusLabel(day.status)}
                        </span>
                        <strong className={cx("home-schedule__day-hours")}>
                          {day.schedule}
                        </strong>
                        <p className={cx("home-schedule__day-description")}>
                          {day.description}
                        </p>
                        <span
                          className={cx(
                            "home-schedule__day-badge",
                            `home-schedule__day-badge--${day.status}`,
                          )}
                        >
                          {day.hoursOpen}
                        </span>
                      </article>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cx("home-cta")}>
        <div className={cx("home-shell")}>
          <div className={cx("home-cta__inner")}>
            <div className={cx("home-cta__media")}>
              <img
                src={HeroCoaching}
                alt="Entrenamiento en Titanium Sport Gym"
                className={cx("home-cta__image")}
              />
              <div className={cx("home-cta__media-overlay")} />
            </div>

            <div className={cx("home-cta__panel")}>
              <div className={cx("home-cta__content")}>
                <span className={cx("home-cta__eyebrow")}>
                  Titanium Sport Gym
                </span>
                <h2 className={cx("home-cta__title")}>
                  Listo para comenzar tu transformacion?
                </h2>
                <p className={cx("home-cta__description")}>
                  Unete a la comunidad Titanium y empieza a ver resultados desde
                  el primer dia. Nuestros entrenadores te guiaran en cada paso
                  del camino.
                </p>

                <div className={cx("home-cta__actions")}>
                  <Link
                    to="/register"
                    className={cx("home-button home-button--light")}
                  >
                    Comenzar Ahora
                    <FaArrowRight />
                  </Link>
                  <a
                    href="mailto:tsghuejutla@gmail.com"
                    className={cx("home-button home-button--ghost-light")}
                  >
                    Contactanos
                  </a>
                </div>
              </div>

              <div className={cx("home-cta__cards")}>
                <a href="tel:7711976803" className={cx("home-cta__card")}>
                  <span className={cx("home-cta__card-icon")}>
                    <FaPhoneAlt />
                  </span>
                  <span className={cx("home-cta__card-copy")}>
                    <span className={cx("home-cta__card-label")}>Llamanos</span>
                    <strong className={cx("home-cta__card-value")}>
                      771 197 6803
                    </strong>
                  </span>
                </a>

                <a
                  href="mailto:tsghuejutla@gmail.com"
                  className={cx("home-cta__card")}
                >
                  <span className={cx("home-cta__card-icon")}>
                    <FaEnvelope />
                  </span>
                  <span className={cx("home-cta__card-copy")}>
                    <span className={cx("home-cta__card-label")}>
                      Escribenos
                    </span>
                    <strong className={cx("home-cta__card-value")}>
                      tsghuejutla@gmail.com
                    </strong>
                  </span>
                </a>

                <div className={cx("home-cta__card")}>
                  <span className={cx("home-cta__card-icon")}>
                    <FaMapMarkerAlt />
                  </span>
                  <span className={cx("home-cta__card-copy")}>
                    <span className={cx("home-cta__card-label")}>
                      Visitanos
                    </span>
                    <strong className={cx("home-cta__card-value")}>
                      Av. Corona del Rosal N 15, Huejutla, Hidalgo
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
