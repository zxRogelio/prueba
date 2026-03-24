// Routines.jsx - MODIFICADO
import React, { useState, useEffect } from "react";
import "../styles/about.css";
import { Link } from "react-router-dom";
import Logo from "../assets/LogoP.png";

const exercises = [
  {
    id: 1,
    title: "Sentadillas",
    level: "Principiante - Avanzado",
    muscleGroup: "Piernas - Glúteos",
    category: "Ejercicio Compuesto",
    description:
      "La sentadilla es un ejercicio fundamental para desarrollar fuerza en piernas y glúteos. Es esencial para la potencia atlética y la estabilidad general.",
    images: [
      "https://hips.hearstapps.com/hmg-prod/images/sentadillas-2-1500285620.jpg?crop=1.00xw:0.601xh;0,0.178xh&resize=2048:*",
      "http://imgfz.com/i/fvFnjQe.png",
    ],
    steps: [
      "Coloca los pies al ancho de los hombros",
      "Mantén la espalda recta y el pecho hacia afuera",
      "Flexiona rodillas y caderas como si fueras a sentarte",
      "Baja hasta que los muslos estén paralelos al suelo",
      "Vuelve a la posición inicial empujando con los talones",
    ],
  },
  {
    id: 2,
    title: "Press de Banca",
    level: "Intermedio - Avanzado",
    muscleGroup: "Pecho - Tríceps",
    category: "Ejercicio Compuesto",
    description:
      "El press de banca es el ejercicio más popular para desarrollar la fuerza y tamaño del pecho, también involucra tríceps y hombros delanteros.",
    images: [
      "https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w-800&auto=format&fit=crop",
    ],
    steps: [
      "Acuéstate boca arriba en el banco",
      "Agarra la barra con las manos más anchas que los hombros",
      "Baja la barra controladamente hasta el pecho",
      "Empuja la barra hacia arriba hasta extender los brazos",
      "Mantén los pies firmes en el suelo",
    ],
  },
  {
    id: 3,
    title: "Dominadas",
    level: "Intermedio - Avanzado",
    muscleGroup: "Espalda - Bíceps",
    category: "Ejercicio Compuesto",
    description:
      "Las dominadas son el mejor ejercicio para desarrollar la espalda de forma completa, especialmente el dorsal ancho y la musculatura de tracción.",
    images: [
      "https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w-800&auto=format&fit=crop",
    ],
    steps: [
      "Agarra la barra con las palmas hacia afuera",
      "Cuelga con los brazos completamente extendidos",
      "Junta los omóplatos y tira del cuerpo hacia arriba",
      "Lleva la barbilla por encima de la barra",
      "Baja controladamente a la posición inicial",
    ],
  },
  {
    id: 4,
    title: "Plancha",
    level: "Principiante - Avanzado",
    muscleGroup: "Core - Abdomen",
    category: "Ejercicio de Estabilidad",
    description:
      "La plancha es un ejercicio isométrico esencial para fortalecer el core, mejorar la postura y prevenir lesiones en la espalda baja.",
    images: [
      "https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w-800&auto=format&fit=crop",
    ],
    steps: [
      "Colócate en posición de flexión con los antebrazos en el suelo",
      "Mantén el cuerpo en línea recta de cabeza a talones",
      "Contrae el abdomen y glúteos",
      "Mantén la posición sin arquear la espalda",
      "Respira normalmente durante el ejercicio",
    ],
  },
];

const Routines = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleImageError = (e) => {
    e.target.src = `https://via.placeholder.com/400x300/ef4444/ffffff?text=EJERCICIO`;
    e.target.onerror = null;
  };

  const openExerciseModal = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentImageIndex(0);
    document.body.style.overflow = "hidden"; // Previene scroll en el fondo
  };

  const closeExerciseModal = () => {
    setSelectedExercise(null);
    document.body.style.overflow = "auto"; // Restaura scroll
  };

  const nextImage = () => {
    if (selectedExercise) {
      setCurrentImageIndex((prev) =>
        prev === selectedExercise.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedExercise) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedExercise.images.length - 1 : prev - 1
      );
    }
  };

  return (
    <div className="routines-container">
      {/* Header modificado - FONDO BLANCO */}
      <header
        className={`routines-header ${
          scrolled ? "routines-header-scrolled" : ""
        }`}
      >
        <div className="routines-header-content">
          <div className="routines-logo-container">
            <Link to="/">
              <img
                src={Logo}
                alt="Titanium Sport Gym"
                className="routines-logo-image"
                onError={handleImageError}
              />
            </Link>
          </div>

          <nav className="routines-nav-desktop">
            <div className="routines-nav-main-links">
              <Link to="/" className="routines-nav-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                INICIO
                <span className="routines-nav-underline" />
              </Link>

              <Link to="/catalogue" className="routines-nav-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                PRODUCTOS
                <span className="routines-nav-underline" />
              </Link>

              <Link to="/suscripciones" className="routines-nav-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                SUSCRIPCIONES
                <span className="routines-nav-underline" />
              </Link>

              <Link to="/rutinas" className="routines-nav-link active">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                EJERCICIOS
                <span className="routines-nav-underline" />
              </Link>
            </div>

            <div className="routines-nav-action-links">
              <div className="routines-nav-divider" />
              <Link to="/register" className="routines-slider-btn-outline">
                SUSCRIBETE
              </Link>
              <Link to="/login" className="routines-slider-btn-solid">
                INICIA SESIÓN
              </Link>
            </div>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="routines-mobile-menu-btn"
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
          <div className="routines-mobile-menu">
            <nav className="routines-mobile-nav">
              <Link
                to="/"
                className="routines-mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
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
              <Link
                to="/catalogue"
                className="routines-mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                PRODUCTOS
              </Link>
              <Link
                to="/suscripciones"
                className="routines-mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                SUSCRIPCIONES
              </Link>
              <Link
                to="/rutinas"
                className="routines-mobile-nav-link active"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                EJERCICIOS
              </Link>
              <div className="routines-mobile-nav-buttons">
                <Link
                  to="/register"
                  className="routines-slider-btn-outline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  SUSCRIBETE
                </Link>
                <Link
                  to="/login"
                  className="routines-slider-btn-solid"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  INICIA SESIÓN
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Breadcrumbs */}
      <nav className="routines-breadcrumbs">
        <ol className="routines-breadcrumb-list">
          <li className="routines-breadcrumb-item">
            <Link to="/" className="routines-breadcrumb-link">
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
          <>
            <li className="routines-breadcrumb-separator">/</li>
            <li className="routines-breadcrumb-item">
              <span className="routines-breadcrumb-current">EJERCICIOS</span>
            </li>
          </>
        </ol>
      </nav>

      {/* Hero Section */}
      <section className="routines-hero">
        <div className="routines-hero-content">
          <h1 className="routines-brush-title routines-text-red">
            EJERCICIOS FUNDAMENTALES
          </h1>
          <p className="routines-hero-subtitle">
            Domina los ejercicios esenciales para construir fuerza y músculo
          </p>
        </div>
      </section>

      {/* Exercises Grid */}
      <section className="routines-grid-section">
        <div className="routines-grid-container">
          <div className="routines-grid">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="routines-grid-card">
                <div className="routines-card-header">
                  <div className="routines-card-category">
                    {exercise.category}
                  </div>
                  <div className="routines-card-number">#{exercise.id}</div>
                </div>

                <div className="routines-card-content">
                  <h3 className="routines-card-title">{exercise.title}</h3>

                  <div className="routines-card-details">
                    <div className="routines-card-detail">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span>{exercise.level}</span>
                    </div>

                    <div className="routines-card-detail">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                      </svg>
                      <span>{exercise.muscleGroup}</span>
                    </div>
                  </div>
                </div>

                <div className="routines-card-footer">
                  <button
                    className="routines-card-btn"
                    onClick={() => openExerciseModal(exercise)}
                  >
                    VER TÉCNICA
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de Detalles del Ejercicio */}
      {selectedExercise && (
        <div className="exercise-modal-overlay">
          <div className="exercise-modal">
            <button className="modal-close-btn" onClick={closeExerciseModal}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-category">
                  {selectedExercise.category}
                </div>
                <h2 className="modal-title">{selectedExercise.title}</h2>
              </div>

              <div className="modal-images-section">
                <div className="modal-main-image">
                  <img
                    src={selectedExercise.images[currentImageIndex]}
                    alt={`${selectedExercise.title} - Imagen ${
                      currentImageIndex + 1
                    }`}
                    onError={handleImageError}
                  />

                  <button className="image-nav-btn prev" onClick={prevImage}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button className="image-nav-btn next" onClick={nextImage}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                <div className="modal-thumbnails">
                  {selectedExercise.images.map((img, index) => (
                    <button
                      key={index}
                      className={`thumbnail-btn ${
                        index === currentImageIndex ? "active" : ""
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={img}
                        alt={`Miniatura ${index + 1}`}
                        onError={handleImageError}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-info-section">
                <div className="info-column">
                  <h3>DESCRIPCIÓN</h3>
                  <p>{selectedExercise.description}</p>
                </div>

                <div className="info-column">
                  <h3>GRUPO MUSCULAR</h3>
                  <div className="muscle-group-badge">
                    {selectedExercise.muscleGroup}
                  </div>

                  <h3>NIVEL</h3>
                  <div className="level-badge">{selectedExercise.level}</div>
                </div>
              </div>

              <div className="modal-steps-section">
                <h3>PASOS PARA LA TÉCNICA CORRECTA</h3>
                <ol className="steps-list">
                  {selectedExercise.steps.map((step, index) => (
                    <li key={index}>
                      <span className="step-number">{index + 1}</span>
                      <span className="step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-action-btn primary"
                  onClick={closeExerciseModal}
                >
                  ENTENDIDO
                </button>
                <Link to="/contacto" className="modal-action-btn secondary">
                  CONSULTAR CON ENTRENADOR
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="routines-cta">
        <div className="routines-cta-content">
          <h2 className="routines-brush-title routines-text-white">
            ¿QUIERES APRENDER MÁS EJERCICIOS?
          </h2>
          <p className="routines-cta-subtitle">
            Nuestros entrenadores te enseñarán la técnica correcta de cada
            ejercicio
          </p>
          <div className="routines-cta-buttons">
            <Link to="/contacto" className="routines-cta-btn-primary">
              CONSULTA PERSONALIZADA
              <svg
                className="routines-btn-arrow"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 16l-4-4h8l-4 4zm0-12L6 6l6 6 6-6-6-6z" />
              </svg>
            </Link>
            <Link to="/register" className="routines-cta-btn-secondary">
              SUSCRIBIRME AHORA
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      {false && <footer className="routines-footer">
        <div className="routines-footer-main">
          <div className="routines-footer-content">
            <div className="routines-footer-brand">
              <img
                src={Logo}
                alt="Titanium Sport Gym"
                className="routines-footer-logo"
                onError={handleImageError}
              />
              <div className="routines-social-links">
                <span className="routines-follow-text">SÍGUENOS</span>
                <div className="routines-social-icons">
                  <a href="#" className="routines-social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="routines-social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                    </svg>
                  </a>
                  <a href="#" className="routines-social-icon">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.017z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="routines-footer-columns">
              <div className="routines-footer-column">
                <h4 className="routines-footer-column-title">Titanium</h4>
                <ul className="routines-footer-links">
                  <li>
                    <Link to="/about" className="routines-footer-link">
                      Quiénes somos
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="routines-footer-link">
                      Habla con nosotros
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="routines-footer-link">
                      Aviso de Privacidad
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="routines-footer-column">
                <h4 className="routines-footer-column-title">Planes</h4>
                <ul className="routines-footer-links">
                  <li>
                    <Link to="/memberships" className="routines-footer-link">
                      Membresías
                    </Link>
                  </li>
                  <li>
                    <Link to="/contracts" className="routines-footer-link">
                      Contratos
                    </Link>
                  </li>
                  <li>
                    <Link to="/coach" className="routines-footer-link">
                      Titanium Coach
                    </Link>
                  </li>
                  <li>
                    <Link to="/body" className="routines-footer-link">
                      Titanium Body
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="routines-footer-column">
                <h4 className="routines-footer-column-title">
                  Nuestra Compañía
                </h4>
                <ul className="routines-footer-links">
                  <li>
                    <Link to="/trainer" className="routines-footer-link">
                      Quiero ser entrenador
                    </Link>
                  </li>
                  <li>
                    <Link to="/brand" className="routines-footer-link">
                      Promociona tu marca
                    </Link>
                  </li>
                  <li>
                    <Link to="/location" className="routines-footer-link">
                      Indica un local
                    </Link>
                  </li>
                  <li>
                    <Link to="/careers" className="routines-footer-link">
                      Trabaja con nosotros
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="routines-footer-bottom">
          <div className="routines-footer-bottom-content">
            <p className="routines-footer-disclaimer">
              *Consulte las condiciones promocionales y reglamentos en la
              página: titaniumsportgym.com/terminos-condiciones
            </p>
            <p className="routines-footer-copyright">
              © {new Date().getFullYear()} Titanium Sport Gym. Todos los
              derechos reservados.
            </p>
          </div>
        </div>
      </footer>}
    </div>
  );
};

export default Routines;
