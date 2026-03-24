import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaAward,
  FaCalendarAlt,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaDumbbell,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegEye,
  FaShoppingCart,
  FaStar,
  FaUsers,
} from "react-icons/fa";
import styles from "./HomePage.module.css";

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

type StatItem = {
  icon: IconType;
  value: string;
  label: string;
  description: string;
};

type ProductItem = {
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
};

type PlanItem = {
  name: string;
  price: number;
  level: string;
  features: string[];
  popular?: boolean;
};

type TrainerItem = {
  name: string;
  role: string;
  description: string;
  image: string;
};

type DayKey = "Lun" | "Mar" | "Mie" | "Jue" | "Vie" | "Sab" | "Dom";

type ScheduleLevel = "all" | "beginner" | "intermediate" | "advanced";

type ScheduleRow = {
  time: string;
  className: string;
  trainer: string;
  level: ScheduleLevel;
  spots: number;
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

const stats: StatItem[] = [
  {
    icon: FaUsers,
    value: "5,000+",
    label: "Miembros Activos",
    description: "Comunidad creciendo cada dia",
  },
  {
    icon: FaDumbbell,
    value: "200+",
    label: "Equipos",
    description: "Ultima generacion",
  },
  {
    icon: FaCalendarAlt,
    value: "50+",
    label: "Clases Semanales",
    description: "Para todos los niveles",
  },
  {
    icon: FaAward,
    value: "15+",
    label: "Entrenadores",
    description: "Certificados y presentes en piso",
  },
];

const products: ProductItem[] = [
  {
    name: "Whey Protein Premium",
    image:
      "https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80",
    price: 94,
    rating: 5,
    reviews: 128,
  },
  {
    name: "Banco Ajustable Pro",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    price: 53,
    oldPrice: 58,
    rating: 5,
    reviews: 67,
    badge: "Sale!",
  },
  {
    name: "Mochila Deportiva",
    image:
      "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?auto=format&fit=crop&w=900&q=80",
    price: 15,
    oldPrice: 19,
    rating: 4,
    reviews: 89,
    badge: "Sale!",
  },
  {
    name: "Gorra Titanium",
    image:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80",
    price: 83,
    rating: 5,
    reviews: 45,
  },
  {
    name: "Guantes de Entrenamiento",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
    price: 29,
    rating: 4,
    reviews: 112,
  },
];

const plans: PlanItem[] = [
  {
    name: "Carte Blanche",
    price: 299,
    level: "Basico",
    features: [
      "Acceso al gimnasio",
      "Horario limitado (6am - 2pm)",
      "Zona de cardio",
      "Vestidores",
    ],
  },
  {
    name: "Titanium Rojo",
    price: 499,
    level: "Premium",
    popular: true,
    features: [
      "Acceso ilimitado 24/7",
      "Todas las areas",
      "Clases grupales incluidas",
      "Casillero personal",
      "Evaluacion mensual",
    ],
  },
  {
    name: "Titanium Negro",
    price: 799,
    level: "Elite",
    features: [
      "Todo lo de Premium",
      "Entrenador personal (4 sesiones)",
      "Plan nutricional",
      "Acceso a spa",
      "Invitados (2/mes)",
      "Estacionamiento VIP",
    ],
  },
];

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

const scheduleDays: DayKey[] = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const scheduleByDay: Record<DayKey, ScheduleRow[]> = {
  Lun: [
    {
      time: "06:00 - 07:00",
      className: "CrossFit",
      trainer: "Carlos Mendoza",
      level: "all",
      spots: 5,
    },
    {
      time: "08:00 - 09:00",
      className: "Yoga Flow",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 3,
    },
    {
      time: "18:00 - 19:00",
      className: "HIIT Cardio",
      trainer: "Alex Rodriguez",
      level: "intermediate",
      spots: 3,
    },
  ],
  Mar: [
    {
      time: "07:00 - 08:00",
      className: "Full Body",
      trainer: "Carlos Mendoza",
      level: "all",
      spots: 4,
    },
    {
      time: "09:00 - 10:00",
      className: "Pilates Core",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 6,
    },
    {
      time: "19:00 - 20:00",
      className: "Box Conditioning",
      trainer: "Alex Rodriguez",
      level: "advanced",
      spots: 2,
    },
  ],
  Mie: [
    {
      time: "06:00 - 07:00",
      className: "Funcional Power",
      trainer: "Carlos Mendoza",
      level: "intermediate",
      spots: 4,
    },
    {
      time: "10:00 - 11:00",
      className: "Stretch & Move",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 8,
    },
    {
      time: "18:30 - 19:30",
      className: "Strong Legs",
      trainer: "Alex Rodriguez",
      level: "all",
      spots: 5,
    },
  ],
  Jue: [
    {
      time: "07:00 - 08:00",
      className: "Body Pump",
      trainer: "Carlos Mendoza",
      level: "all",
      spots: 5,
    },
    {
      time: "09:00 - 10:00",
      className: "Movilidad Total",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 7,
    },
    {
      time: "19:00 - 20:00",
      className: "Burn Circuit",
      trainer: "Alex Rodriguez",
      level: "intermediate",
      spots: 4,
    },
  ],
  Vie: [
    {
      time: "06:30 - 07:30",
      className: "Metcon Friday",
      trainer: "Carlos Mendoza",
      level: "advanced",
      spots: 3,
    },
    {
      time: "11:00 - 12:00",
      className: "Recovery Flow",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 8,
    },
    {
      time: "18:00 - 19:00",
      className: "Power Session",
      trainer: "Alex Rodriguez",
      level: "all",
      spots: 5,
    },
  ],
  Sab: [
    {
      time: "08:00 - 09:00",
      className: "Bootcamp",
      trainer: "Carlos Mendoza",
      level: "all",
      spots: 6,
    },
    {
      time: "10:00 - 11:00",
      className: "Glute Lab",
      trainer: "Maria Gonzalez",
      level: "intermediate",
      spots: 4,
    },
    {
      time: "12:00 - 13:00",
      className: "Core & Mobility",
      trainer: "Alex Rodriguez",
      level: "beginner",
      spots: 7,
    },
  ],
  Dom: [
    {
      time: "09:00 - 10:00",
      className: "Sunday Stretch",
      trainer: "Maria Gonzalez",
      level: "beginner",
      spots: 10,
    },
    {
      time: "10:30 - 11:30",
      className: "Titanium Team WOD",
      trainer: "Carlos Mendoza",
      level: "all",
      spots: 5,
    },
    {
      time: "12:00 - 13:00",
      className: "Cardio Boost",
      trainer: "Alex Rodriguez",
      level: "intermediate",
      spots: 4,
    },
  ],
};

const scheduleLegend = [
  { label: "Principiante", className: "home-schedule__legend-dot--beginner" },
  { label: "Intermedio", className: "home-schedule__legend-dot--intermediate" },
  { label: "Avanzado", className: "home-schedule__legend-dot--advanced" },
  { label: "Todos los niveles", className: "home-schedule__legend-dot--all" },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DayKey>("Lun");
  const productTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = heroSlides[currentSlide];
  const activeSchedule = scheduleByDay[selectedDay];

  const scrollProducts = (direction: number) => {
    productTrackRef.current?.scrollBy({
      left: 340 * direction,
      behavior: "smooth",
    });
  };

  return (
    <main className={cx("home-page")}>
      <section className={cx("home-hero")}>
        <div className={cx("home-hero__media")} aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.title}
              className={cx("home-hero__slide", index === currentSlide && "is-active")}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>

        <div className={cx("home-hero__overlay")} />

        <div className={cx("home-shell home-hero__inner")}>
          <span className={cx("home-hero__label")}>{activeSlide.label}</span>
          <h1 className={cx("home-hero__title")}>{activeSlide.title}</h1>
          <p className={cx("home-hero__accent")}>{activeSlide.accent}</p>
          <p className={cx("home-hero__description")}>{activeSlide.description}</p>

          <div className={cx("home-hero__actions")}>
            <Link to="/register" className={cx("home-button home-button--solid")}>
              SUSCRIBETE
            </Link>
            <Link to="/AboutePage" className={cx("home-button home-button--outline")}>
              CONOCE MAS
            </Link>
          </div>

          <div className={cx("home-hero__dots")}>
            {heroSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={cx("home-hero__dot", index === currentSlide && "is-active")}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className={cx("home-stats")}>
        <div className={cx("home-shell home-stats__grid")}>
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className={cx("home-stats__item")}>
                <span className={cx("home-stats__icon")}>
                  <Icon />
                </span>
                <strong className={cx("home-stats__value")}>{item.value}</strong>
                <h2 className={cx("home-stats__label")}>{item.label}</h2>
                <p className={cx("home-stats__description")}>{item.description}</p>
              </article>
            );
          })}
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

          <div ref={productTrackRef} className={cx("home-store__track")}>
            {products.map((product) => (
              <article key={product.name} className={cx("home-product-card")}>
                <div className={cx("home-product-card__image-wrap")}>
                  {product.badge && (
                    <span className={cx("home-product-card__badge")}>{product.badge}</span>
                  )}
                  <img
                    src={product.image}
                    alt={product.name}
                    className={cx("home-product-card__image")}
                  />
                </div>

                <div className={cx("home-product-card__body")}>
                  <h3 className={cx("home-product-card__name")}>{product.name}</h3>
                  <div className={cx("home-product-card__rating")}>
                    <div className={cx("home-product-card__stars")} aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FaStar
                          key={`${product.name}-${index}`}
                          className={cx(
                            index < product.rating ? "is-filled" : "is-empty"
                          )}
                        />
                      ))}
                    </div>
                    <span>({product.reviews})</span>
                  </div>
                  <div className={cx("home-product-card__price-row")}>
                    {product.oldPrice && (
                      <span className={cx("home-product-card__old-price")}>
                        ${product.oldPrice.toFixed(2)}
                      </span>
                    )}
                    <span className={cx("home-product-card__price")}>
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className={cx("home-product-card__actions")}>
                    <Link to="/catalogue" className={cx("home-product-card__action home-product-card__action--primary")}>
                      <FaShoppingCart />
                      Add to cart
                    </Link>
                    <Link to="/catalogue" className={cx("home-product-card__action home-product-card__action--secondary")}>
                      <FaRegEye />
                      Quick View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
                key={plan.name}
                className={cx("home-plan-card", plan.popular && "is-popular")}
              >
                {plan.popular && (
                  <span className={cx("home-plan-card__popular")}>Popular</span>
                )}
                <h3 className={cx("home-plan-card__title")}>{plan.level}</h3>
                <div className={cx("home-plan-card__price")}>
                  <strong>${plan.price}</strong>
                  <span>MXN/mes</span>
                </div>
                <ul className={cx("home-plan-card__features")}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <FaCheck />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/suscripciones"
                  className={cx("home-plan-card__button", plan.popular && "is-popular")}
                >
                  Elegir Plan
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
                  <span className={cx("home-trainer-card__role")}>{trainer.role}</span>
                  <h3 className={cx("home-trainer-card__name")}>{trainer.name}</h3>
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
        <div className={cx("home-shell")}>
          <div className={cx("home-section-head home-section-head--center home-section-head--light")}>
            <h2 className={cx("home-section-title home-section-title--light")}>
              HORARIOS DE <span>CLASES</span>
            </h2>
            <p className={cx("home-section-text home-section-text--light")}>
              Planifica tu semana con nuestras clases grupales dirigidas por
              entrenadores certificados
            </p>
          </div>

          <div className={cx("home-schedule__tabs")}>
            {scheduleDays.map((day) => (
              <button
                key={day}
                type="button"
                className={cx("home-schedule__tab", day === selectedDay && "is-active")}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>

          <div className={cx("home-schedule__table-wrap")}>
            <table className={cx("home-schedule__table")}>
              <thead>
                <tr>
                  <th>
                    <FaClock />
                    Hora
                  </th>
                  <th>Clase</th>
                  <th>Entrenador</th>
                  <th>Nivel</th>
                  <th>Lugares</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {activeSchedule.map((row) => (
                  <tr key={`${selectedDay}-${row.time}-${row.className}`}>
                    <td className={cx("home-schedule__time")}>{row.time}</td>
                    <td className={cx("home-schedule__class")}>{row.className}</td>
                    <td className={cx("home-schedule__trainer")}>{row.trainer}</td>
                    <td>
                      <span
                        className={cx(
                          "home-schedule__level",
                          `home-schedule__level--${row.level}`
                        )}
                      >
                        {row.level === "all" && "Todos los niveles"}
                        {row.level === "beginner" && "Principiante"}
                        {row.level === "intermediate" && "Intermedio"}
                        {row.level === "advanced" && "Avanzado"}
                      </span>
                    </td>
                    <td className={cx("home-schedule__spots")}>
                      <strong>{row.spots}</strong>
                      <span>disponibles</span>
                    </td>
                    <td>
                      <Link to="/suscripciones" className={cx("home-schedule__button")}>
                        Reservar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={cx("home-schedule__legend")} aria-label="Niveles de clase">
            {scheduleLegend.map((item) => (
              <div key={item.label} className={cx("home-schedule__legend-item")}>
                <span
                  className={cx("home-schedule__legend-dot", item.className)}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cx("home-cta")}>
        <div className={cx("home-shell home-cta__inner")}>
          <div className={cx("home-cta__content")}>
            <span className={cx("home-cta__eyebrow")}>Titanium Sport Gym</span>
            <h2 className={cx("home-cta__title")}>
              Listo para comenzar tu transformacion?
            </h2>
            <p className={cx("home-cta__description")}>
              Unete a la comunidad Titanium y empieza a ver resultados desde el
              primer dia. Nuestros entrenadores te guiaran en cada paso del
              camino.
            </p>

            <div className={cx("home-cta__actions")}>
              <Link to="/register" className={cx("home-button home-button--light")}>
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
                <strong className={cx("home-cta__card-value")}>771 197 6803</strong>
              </span>
            </a>

            <a href="mailto:tsghuejutla@gmail.com" className={cx("home-cta__card")}>
              <span className={cx("home-cta__card-icon")}>
                <FaEnvelope />
              </span>
              <span className={cx("home-cta__card-copy")}>
                <span className={cx("home-cta__card-label")}>Escribenos</span>
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
                <span className={cx("home-cta__card-label")}>Visitanos</span>
                <strong className={cx("home-cta__card-value")}>
                  Av. Corona del Rosal N 15, Huejutla, Hidalgo
                </strong>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
