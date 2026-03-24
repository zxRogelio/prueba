import { Link } from "react-router-dom";
import styles from "./AboutePage.module.css";

import missionImage from "../../assets/mision1.jpg";
import visionImage from "../../assets/vision.jpg";
import valuesImage from "../../assets/valores.jpg";
import team1Image from "../../assets/1.jpg";
import team2Image from "../../assets/2.jpg";
import team3Image from "../../assets/3.jpg";
import gymInterior from "../../assets/abaout1.jpg";

const cx = (...names: string[]) =>
  names
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

export default function AboutUs() {
  return (
    <section className={cx("about-us-section")}>
      <div className={cx("bg-animation")}>
        <div className={cx("bg-grid")} />
        <div className={cx("bg-glow", "bg-glow-1")} />
        <div className={cx("bg-glow", "bg-glow-2")} />
      </div>

      <div className={cx("page-container")}>
        <nav className={cx("breadcrumbs")}>
          <ul className={cx("breadcrumb-list")}>
            <li className={cx("breadcrumb-item")}>
              <Link to="/" className={cx("breadcrumb-link")}>
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
              </Link>
            </li>
            <li className={cx("breadcrumb-separator")}>/</li>
            <li className={cx("breadcrumb-item")}>
              <span className={cx("breadcrumb-current")}>
                Acerca de Nosotros
              </span>
            </li>
          </ul>
        </nav>

        <div className={cx("about-container")}>
          <div className={cx("about-header")}>
            <div className={cx("header-image-container")}>
              <img
                src={gymInterior}
                alt="Interior de Titanium Sport Gym"
                className={cx("header-background-image")}
              />
              <div className={cx("header-overlay")} />
              <div className={cx("header-content")}>
                <span className={cx("about-label")}>Nuestra Historia</span>
                <h1 className={cx("brush-title")}>
                  Acerca de <span className={cx("text-red")}>Nosotros</span>
                </h1>
                <p className={cx("about-subtitle")}>
                  Somos mas que un gimnasio, somos una comunidad comprometida
                  con tu bienestar fisico y emocional. En Titanium Sport Gym,
                  creemos en el poder transformador del fitness.
                </p>
              </div>
            </div>
          </div>

          <div className={cx("intro-section")}>
            <div className={cx("intro-content")}>
              <h2 className={cx("brush-title")}>
                Nuestra <span className={cx("text-red")}>Pasion</span> por el
                Fitness
              </h2>
              <p className={cx("intro-text")}>
                En Titanium Sport Gym, hemos creado un espacio donde cada
                persona puede alcanzar su maximo potencial. Con instalaciones de
                vanguardia y un equipo de profesionales apasionados,
                transformamos vidas a traves del deporte y la salud.
              </p>
              <div className={cx("intro-stats")}>
                <div className={cx("stat-item")}>
                  <span className={cx("stat-value")}>500+</span>
                  <span className={cx("stat-label")}>Miembros Activos</span>
                </div>
                <div className={cx("stat-item")}>
                  <span className={cx("stat-value")}>15+</span>
                  <span className={cx("stat-label")}>
                    Entrenadores Certificados
                  </span>
                </div>
                <div className={cx("stat-item")}>
                  <span className={cx("stat-value")}>00</span>
                  <span className={cx("stat-label")}>Horario de Servicio</span>
                </div>
              </div>
            </div>
            <div className={cx("intro-image")}>
              <img
                src="https://scontent.fpaz3-1.fna.fbcdn.net/v/t39.30808-6/514033271_1502149935245019_4079469184684701198_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=86c6b0&_nc_ohc=IG6HDzeASdkQ7kNvwGRmx3i&_nc_oc=Adncuo-sUcBAT1u0Q0C_dfYZiEkwBFDnrhoD_OGYJdqWf8TbAuOXNugI5Y7G4T7AxX0&_nc_zt=23&_nc_ht=scontent.fpaz3-1.fna&_nc_gid=ifR4XMggztGZHis9Jtfcsg&oh=00_AfpONNfHPLn4RHFUvDno7axq3yOWlftFbPcMdHLO0XhLOw&oe=69825EF0"
                alt="Gimnasio moderno con equipos"
                className={cx("intro-img")}
              />
            </div>
          </div>

          <div className={cx("mv-grid")}>
            <div className={cx("mv-card")}>
              <div className={cx("mv-glow")} />
              <div className={cx("mv-image")}>
                <img src={missionImage} alt="Mision de Titanium Sport Gym" />
              </div>
              <div className={cx("mv-content")}>
                <div className={cx("mv-icon")}>
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
                <h3 className={cx("mv-title")}>Mision</h3>
                <p className={cx("mv-description")}>
                  Ofrecer un entorno acogedor, inclusivo y seguro donde nuestros
                  socios se inspiren y motiven a lograr sus metas de bienestar
                  fisico y emocional. Nos comprometemos a tener instalaciones a
                  la vanguardia y a un equipo de profesionales enfocados en
                  apoyar a cada socio en su camino hacia una vida saludable.
                </p>
              </div>
            </div>

            <div className={cx("mv-card")}>
              <div className={cx("mv-glow")} />
              <div className={cx("mv-image")}>
                <img src={visionImage} alt="Vision de Titanium Sport Gym" />
              </div>
              <div className={cx("mv-content")}>
                <div className={cx("mv-icon")}>
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
                <h3 className={cx("mv-title")}>Vision</h3>
                <p className={cx("mv-description")}>
                  Ser el gimnasio favorito de la comunidad, reconocidos por
                  nuestro compromiso con el bienestar integral y la excelencia
                  en el servicio.
                </p>
              </div>
            </div>

            <div className={cx("mv-card")}>
              <div className={cx("mv-glow")} />
              <div className={cx("mv-image")}>
                <img src={valuesImage} alt="Valores de Titanium Sport Gym" />
              </div>
              <div className={cx("mv-content")}>
                <div className={cx("mv-icon")}>
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
                <h3 className={cx("mv-title")}>Valores</h3>
                <div className={cx("values-list")}>
                  <div className={cx("value-item")}>
                    <span className={cx("value-dot")} />
                    <span>Pasion por el fitness y la salud</span>
                  </div>
                  <div className={cx("value-item")}>
                    <span className={cx("value-dot")} />
                    <span>Integridad y respeto</span>
                  </div>
                  <div className={cx("value-item")}>
                    <span className={cx("value-dot")} />
                    <span>Compromiso con nuestros socios</span>
                  </div>
                  <div className={cx("value-item")}>
                    <span className={cx("value-dot")} />
                    <span>Innovacion y excelencia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={cx("values-section")}>
            <h2 className={cx("brush-title")}>
              Nuestros <span className={cx("text-red")}>Valores</span> en
              Detalle
            </h2>

            <div className={cx("values-grid")}>
              {valuesData.map((value, index) => (
                <div key={index} className={cx("value-card")}>
                  <div className={cx("value-icon")}>{value.icon}</div>
                  <div className={cx("value-content")}>
                    <h4 className={cx("value-title")}>{value.title}</h4>
                    <p className={cx("value-description")}>
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cx("team-section")}>
            <h2 className={cx("brush-title")}>
              Nuestro <span className={cx("text-red")}>Equipo</span>
            </h2>

            <div className={cx("team-grid")}>
              {teamData.map((member, index) => (
                <div key={index} className={cx("team-card")}>
                  <div className={cx("team-image")}>
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
                    <div className={cx("team-overlay")} />
                  </div>
                  <div className={cx("team-content")}>
                    <h4 className={cx("team-name")}>{member.name}</h4>
                    <p className={cx("team-role")}>{member.role}</p>
                    <p className={cx("team-description")}>
                      {member.description}
                    </p>
                    <div className={cx("team-social")}>
                      <a href="#" className={cx("social-icon")}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.72 4.2H5.28A1.08 1.08 0 004.2 5.28v13.44a1.08 1.08 0 001.08 1.08h6.12v-5.88H9.6V11.4h1.8V9.48c0-1.8 1.08-2.76 2.64-2.76.72 0 1.44.12 1.44.12v1.68h-.84c-.84 0-1.08.48-1.08 1.08v1.32h1.92l-.36 1.92h-1.56v5.88h3.24a1.08 1.08 0 001.08-1.08V5.28a1.08 1.08 0 00-1.08-1.08z" />
                        </svg>
                      </a>
                      <a href="#" className={cx("social-icon")}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M23.44 4.83c-.8.36-1.66.6-2.56.71.92-.55 1.63-1.42 1.96-2.46-.86.51-1.82.88-2.83 1.08-.81-.86-1.96-1.4-3.24-1.4-2.45 0-4.44 1.99-4.44 4.44 0 .35.04.69.12 1.01-3.69-.19-6.96-1.95-9.15-4.64-.38.66-.6 1.42-.6 2.24 0 1.54.78 2.9 1.96 3.7-.72-.02-1.4-.22-2-.55v.06c0 2.15 1.53 3.95 3.56 4.36-.37.1-.76.16-1.16.16-.28 0-.56-.03-.83-.08.56 1.75 2.18 3.02 4.1 3.06-1.5 1.18-3.4 1.88-5.46 1.88-.36 0-.71-.02-1.06-.06 1.96 1.26 4.29 2 6.79 2 8.14 0 12.59-6.74 12.59-12.59 0-.19 0-.38-.01-.57.86-.62 1.61-1.4 2.21-2.29z" />
                        </svg>
                      </a>
                      <a href="#" className={cx("social-icon")}>
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

          <div className={cx("cta-section-about")}>
            <div className={cx("cta-card")}>
              <div className={cx("cta-bg-1")} />
              <div className={cx("cta-bg-2")} />
              <div className={cx("cta-content")}>
                <h3 className={cx("brush-text")}>
                  Listo para transformar tu vida?
                </h3>
                <p className={cx("cta-description")}>
                  Unete a nuestra comunidad y comienza tu viaje hacia una vida
                  mas saludable y activa. En Titanium Sport Gym, te ayudamos a
                  alcanzar tus metas de fitness.
                </p>
                <div className={cx("cta-info")}>
                  <div className={cx("info-item")}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                    <span>
                      Av. Corona del Rosal N 15. Col. 5 de mayo. Huejutla,
                      Hidalgo Mexico.
                    </span>
                  </div>
                  <div className={cx("info-item")}>
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
                <div className={cx("cta-buttons")}>
                  <a href="/contacto" className={cx("cta-btn-primary")}>
                    Contactanos
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className={cx("btn-arrow")}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                  <a href="/servicios" className={cx("cta-btn-secondary")}>
                    Ver Servicios
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
    title: "Pasion por el Fitness",
    description:
      "Vivimos y respiramos fitness. Nuestra energia contagiosa motiva a cada miembro a superar sus limites.",
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
      "Buscamos la maxima calidad en cada servicio, desde nuestras instalaciones hasta la atencion personalizada.",
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
    title: "Innovacion",
    description:
      "Implementamos las ultimas tendencias y tecnologias en fitness para ofrecerte la mejor experiencia.",
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
      "Nos dedicamos al exito de cada miembro. Tu progreso es nuestra mayor satisfaccion.",
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
      "Actuamos con honestidad y claridad en cada interaccion. Tu confianza es nuestro activo mas valioso.",
  },
];

const teamData = [
  {
    name: "Carlos Mendoza",
    role: "CEO & Entrenador Principal",
    description:
      "Con mas de 15 anos de experiencia en fitness, lidera la vision estrategica y el entrenamiento personalizado.",
  },
  {
    name: "Maria Gonzalez",
    role: "Directora de Nutricion",
    description:
      "Especialista en nutricion deportiva con certificacion internacional. Disena planes alimenticios personalizados.",
  },
  {
    name: "Alex Rodriguez",
    role: "Coordinador de Entrenamiento",
    description:
      "Experto en programacion de entrenamientos y recuperacion deportiva. Certificado en entrenamiento funcional.",
  },
];
