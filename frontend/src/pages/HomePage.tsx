import { useState, useEffect } from "react";
import "../styles/home.css";
import MobileMenu from "../components/layout/MobileMenu";
import Breadcrumbs from "../components/layout/Breadcrumbs";

const features = [
  {
    title: "Entrenamiento de Fuerza",
    desc: "Área equipada con racks, barras olímpicas y mancuernas para todos.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM7 8h2v8H7V8zm8 0h2v8h-2V8zM11 6h2v12h-2V6z" />
      </svg>
    ),
  },
  {
    title: "Clases Funcionales",
    desc: "HIIT, cardio boxing y circuitos que aceleran tu progreso y queman grasa.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4zm12 0h4v4h-4v-4zM10 10h4v4h-4v-4z" />
      </svg>
    ),
  },
  {
    title: "Plan Personalizado",
    desc: "Rutinas y seguimiento con metas claras para fuerza, volumen o definición.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
      </svg>
    ),
  },
];

const slides = [
  {
    label: "Bienvenido a:",
    title: "Titanium Sport Gym",
    subtitle: "Tu Destino de Transformación",
    description:
      "Descubre un espacio diseñado para potenciar tu rendimiento. Con equipamiento de última generación, entrenadores certificados y una comunidad que te impulsa a superar tus límites cada día.",
  },
  {
    label: "Entrena Con:",
    title: "Profesionales Certificados",
    subtitle: "Experiencia Que Transforma",
    description:
      "Nuestro equipo de entrenadores cuenta con certificaciones internacionales y años de experiencia. Cada sesión está diseñada para maximizar resultados, prevenir lesiones y mantenerte motivado en tu camino hacia el éxito.",
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="page-container">
      {/* Animated background elements */}
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

     
      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}

      <Breadcrumbs currentPage="Inicio" />

      {/* Hero Slider */}
      <section className="hero-slider">
        <div className="slider-container">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`slide ${
                index === currentSlide ? "slide-active" : ""
              }`}
            >
              <div className="slide-content">
                <p className="slide-label">{slide.label}</p>
                <h1 className="slide-title brush-text">{slide.title}</h1>
                <h2 className="slide-subtitle brush-text">{slide.subtitle}</h2>
                <p className="slide-description">{slide.description}</p>

                <div className="slide-buttons">
                  <a href="#" className="slider-btn-solid brush-btn">
                    SUSCRÍBETE
                  </a>
                  <a href="#" className="slider-btn-outline">
                    CONOCE MÁS
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="slider-arrow slider-arrow-left"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="slider-arrow slider-arrow-right"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Dots Indicator */}
          <div className="slider-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`slider-dot ${
                  index === currentSlide ? "slider-dot-active" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-header">
          <h2 className="features-title brush-title">
            ¿POR QUÉ <span className="text-red">TITANIUM</span>?
          </h2>
          <p className="features-subtitle">
            Instalaciones de primer nivel diseñadas para llevar tu entrenamiento
            al siguiente nivel
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="feature-card"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="feature-glow" />
              <div className="feature-content">
                <div className="feature-inner">
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-text">
                    <h3 className="feature-title">{f.title}</h3>
                    <p className="feature-desc">{f.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}

      {/* New Footer - Smart Fit Style */}
    </div>
  );
}
