import React from "react";
import "./AboutePage.module.css";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar/Navbar";
// Importa tus imágenes (ajusta las rutas según tu estructura)

import missionImage from "../../assets/mision1.jpg";
import visionImage from "../../assets/vision.jpg";
import valuesImage from "../../assets/valores.jpg";
import team1Image from "../../assets/1.jpg";
import team2Image from "../../assets/2.jpg";
import team3Image from "../../assets/3.jpg";
import gymInterior from "../../assets/abaout1.jpg";

const AboutUs: React.FC = () => {
  return (
    <section className="about-us-section">
      {/* USAMOS EN COMPONENTE NAVBAR*/}
      <Navbar scrolled={false} onToggleMobile={() => {}} />
      {/* Background Animation */}
      <div className="bg-animation">
        <div className="bg-grid"></div>
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
      </div>

      <div className="page-container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs">
          <ul className="breadcrumb-list">
            <li className="breadcrumb-item">
              <a href="/" className="breadcrumb-link">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Inicio
              </a>
            </li>
            <li className="breadcrumb-separator">/</li>
            <li className="breadcrumb-item">
              <span className="breadcrumb-current">Acerca de Nosotros</span>
            </li>
          </ul>
        </nav>

        {/* Main Content */}
        <div className="about-container">
          {/* Header con imagen de fondo */}
          <div className="about-header">
            <div className="header-image-container">
              <img
                src={gymInterior}
                alt="Interior de Titanium Sport Gym"
                className="header-background-image"
              />
              <div className="header-overlay"></div>
              <div className="header-content">
                <span className="about-label">Nuestra Historia</span>
                <h1 className="brush-title">
                  Acerca de <span className="text-red">Nosotros</span>
                </h1>
                <p className="about-subtitle">
                  Somos más que un gimnasio, somos una comunidad comprometida
                  con tu bienestar físico y emocional. En Titanium Sport Gym,
                  creemos en el poder transformador del fitness.
                </p>
              </div>
            </div>
          </div>

          {/* Sección de Introducción con imagen */}
          <div className="intro-section">
            <div className="intro-content">
              <h2 className="brush-title">
                Nuestra <span className="text-red">Pasión</span> por el Fitness
              </h2>
              <p className="intro-text">
                En Titanium Sport Gym, hemos creado un espacio donde cada
                persona puede alcanzar su máximo potencial. Con instalaciones de
                vanguardia y un equipo de profesionales apasionados,
                transformamos vidas a través del deporte y la salud.
              </p>
              <div className="intro-stats">
                <div className="stat-item">
                  <span className="stat-value">500+</span>
                  <span className="stat-label">Miembros Activos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">15+</span>
                  <span className="stat-label">Entrenadores Certificados</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">00</span>
                  <span className="stat-label">Horario de Servicio</span>
                </div>
              </div>
            </div>
            <div className="intro-image">
              <img
                src="https://scontent.fpaz3-1.fna.fbcdn.net/v/t39.30808-6/514033271_1502149935245019_4079469184684701198_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=86c6b0&_nc_ohc=IG6HDzeASdkQ7kNvwGRmx3i&_nc_oc=Adncuo-sUcBAT1u0Q0C_dfYZiEkwBFDnrhoD_OGYJdqWf8TbAuOXNugI5Y7G4T7AxX0&_nc_zt=23&_nc_ht=scontent.fpaz3-1.fna&_nc_gid=ifR4XMggztGZHis9Jtfcsg&oh=00_AfpONNfHPLn4RHFUvDno7axq3yOWlftFbPcMdHLO0XhLOw&oe=69825EF0"
                alt="Gimnasio moderno con equipos"
                className="intro-img"
              />
            </div>
          </div>

          {/* Mission, Vision & Values */}
          <div className="mv-grid">
            {/* Misión */}
            <div className="mv-card">
              <div className="mv-glow"></div>
              <div className="mv-image">
                <img src={missionImage} alt="Misión de Titanium Sport Gym" />
              </div>
              <div className="mv-content">
                <div className="mv-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="mv-title">Misión</h3>
                <p className="mv-description">
                  Ofrecer un entorno acogedor, inclusivo y seguro donde nuestros
                  socios se inspiren y motiven a lograr sus metas de bienestar
                  físico y emocional. Nos comprometemos a tener instalaciones a
                  la vanguardia y a un equipo de profesionales enfocados en
                  apoyar a cada socio en su camino hacia una vida saludable.
                </p>
              </div>
            </div>

            {/* Visión */}
            <div className="mv-card">
              <div className="mv-glow"></div>
              <div className="mv-image">
                <img src={visionImage} alt="Visión de Titanium Sport Gym" />
              </div>
              <div className="mv-content">
                <div className="mv-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="mv-title">Visión</h3>
                <p className="mv-description">
                  Ser el gimnasio favorito de la comunidad, reconocidos por
                  nuestro compromiso con el bienestar integral y la excelencia
                  en el servicio.
                </p>
              </div>
            </div>

            {/* Valores */}
            <div className="mv-card">
              <div className="mv-glow"></div>
              <div className="mv-image">
                <img src={valuesImage} alt="Valores de Titanium Sport Gym" />
              </div>
              <div className="mv-content">
                <div className="mv-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="mv-title">Valores</h3>
                <div className="values-list">
                  <div className="value-item">
                    <span className="value-dot"></span>
                    <span>Pasión por el fitness y la salud</span>
                  </div>
                  <div className="value-item">
                    <span className="value-dot"></span>
                    <span>Integridad y respeto</span>
                  </div>
                  <div className="value-item">
                    <span className="value-dot"></span>
                    <span>Compromiso con nuestros socios</span>
                  </div>
                  <div className="value-item">
                    <span className="value-dot"></span>
                    <span>Innovación y excelencia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Values */}
          <div className="values-section">
            <h2 className="brush-title">
              Nuestros <span className="text-red">Valores</span> en Detalle
            </h2>

            <div className="values-grid">
              {valuesData.map((value, index) => (
                <div key={index} className="value-card">
                  <div className="value-icon">{value.icon}</div>
                  <div className="value-content">
                    <h4 className="value-title">{value.title}</h4>
                    <p className="value-description">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="team-section">
            <h2 className="brush-title">
              Nuestro <span className="text-red">Equipo</span>
            </h2>

            <div className="team-grid">
              {teamData.map((member, index) => (
                <div key={index} className="team-card">
                  <div className="team-image">
                    <img
                      src={
                        index === 0
                          ? team1Image
                          : index === 1
                            ? team2Image
                            : team3Image
                      }
                      alt={member.name}
                    />
                    <div className="team-overlay"></div>
                  </div>
                  <div className="team-content">
                    <h4 className="team-name">{member.name}</h4>
                    <p className="team-role">{member.role}</p>
                    <p className="team-description">{member.description}</p>
                    <div className="team-social">
                      <a href="#" className="social-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.72 4.2H5.28A1.08 1.08 0 004.2 5.28v13.44a1.08 1.08 0 001.08 1.08h6.12v-5.88H9.6V11.4h1.8V9.48c0-1.8 1.08-2.76 2.64-2.76.72 0 1.44.12 1.44.12v1.68h-.84c-.84 0-1.08.48-1.08 1.08v1.32h1.92l-.36 1.92h-1.56v5.88h3.24a1.08 1.08 0 001.08-1.08V5.28a1.08 1.08 0 00-1.08-1.08z" />
                        </svg>
                      </a>
                      <a href="#" className="social-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M23.44 4.83c-.8.36-1.66.6-2.56.71.92-.55 1.63-1.42 1.96-2.46-.86.51-1.82.88-2.83 1.08-.81-.86-1.96-1.4-3.24-1.4-2.45 0-4.44 1.99-4.44 4.44 0 .35.04.69.12 1.01-3.69-.19-6.96-1.95-9.15-4.64-.38.66-.6 1.42-.6 2.24 0 1.54.78 2.9 1.96 3.7-.72-.02-1.4-.22-2-.55v.06c0 2.15 1.53 3.95 3.56 4.36-.37.1-.76.16-1.16.16-.28 0-.56-.03-.83-.08.56 1.75 2.18 3.02 4.1 3.06-1.5 1.18-3.4 1.88-5.46 1.88-.36 0-.71-.02-1.06-.06 1.96 1.26 4.29 2 6.79 2 8.14 0 12.59-6.74 12.59-12.59 0-.19 0-.38-.01-.57.86-.62 1.61-1.4 2.21-2.29z" />
                        </svg>
                      </a>
                      <a href="#" className="social-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20.82 2H3.18C2.53 2 2 2.53 2 3.18v17.64C2 21.47 2.53 22 3.18 22h17.64c.65 0 1.18-.53 1.18-1.18V3.18C22 2.53 21.47 2 20.82 2zM8 19H5v-9h3v9zM6.5 8.31c-.96 0-1.74-.78-1.74-1.74s.78-1.74 1.74-1.74 1.74.78 1.74 1.74-.78 1.74-1.74 1.74zM19 19h-3v-4.74c0-1.11-.02-2.53-1.54-2.53-1.54 0-1.78 1.2-1.78 2.45V19h-3v-9h2.9v1.3h.04c.4-.76 1.37-1.56 2.82-1.56 3.02 0 3.58 1.99 3.58 4.57V19z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="cta-section-about">
            <div className="cta-card">
              <div className="cta-bg-1"></div>
              <div className="cta-bg-2"></div>
              <div className="cta-content">
                <h3 className="brush-text">¿Listo para transformar tu vida?</h3>
                <p className="cta-description">
                  Únete a nuestra comunidad y comienza tu viaje hacia una vida
                  más saludable y activa. En Titanium Sport Gym, te ayudamos a
                  alcanzar tus metas de fitness.
                </p>
                <div className="cta-info">
                  <div className="info-item">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                    <span>
                      Av. Corona del Rosal N° 15. Col. 5 de mayo. Huejutla,
                      Hidalgo México.
                    </span>
                  </div>
                  <div className="info-item">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    <span>771 197 6803</span>
                  </div>
                </div>
                <div className="cta-buttons">
                  <a href="/contacto" className="cta-btn-primary">
                    Contáctanos
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="btn-arrow"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                  <a href="/servicios" className="cta-btn-secondary">
                    Ver Servicios
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* USAMOS EN COMPONENTE FOOTER*/}
        <Footer />
      </div>
    </section>
  );
};

// Data arrays
const valuesData = [
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: "Pasión por el Fitness",
    description:
      "Vivimos y respiramos fitness. Nuestra energía contagiosa motiva a cada miembro a superar sus límites.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Excelencia",
    description:
      "Buscamos la máxima calidad en cada servicio, desde nuestras instalaciones hasta la atención personalizada.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: "Comunidad",
    description:
      "Creemos en el poder del apoyo mutuo. Fomentamos un ambiente donde todos se sienten parte de una familia.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: "Innovación",
    description:
      "Implementamos las últimas tendencias y tecnologías en fitness para ofrecerte la mejor experiencia.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    title: "Compromiso",
    description:
      "Nos dedicamos al éxito de cada miembro. Tu progreso es nuestra mayor satisfacción.",
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    title: "Transparencia",
    description:
      "Actuamos con honestidad y claridad en cada interacción. Tu confianza es nuestro activo más valioso.",
  },
];

const teamData = [
  {
    name: "Carlos Mendoza",
    role: "CEO & Entrenador Principal",
    description:
      "Con más de 15 años de experiencia en fitness, lidera la visión estratégica y el entrenamiento personalizado.",
  },
  {
    name: "María González",
    role: "Directora de Nutrición",
    description:
      "Especialista en nutrición deportiva con certificación internacional. Diseña planes alimenticios personalizados.",
  },
  {
    name: "Alex Rodríguez",
    role: "Coordinador de Entrenamiento",
    description:
      "Experto en programación de entrenamientos y recuperación deportiva. Certificado en entrenamiento funcional.",
  },
];

export default AboutUs;
