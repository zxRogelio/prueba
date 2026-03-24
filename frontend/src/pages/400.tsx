import { Link } from "react-router-dom";
import "../styles/notFound.css";

export default function Error400Page() {
  return (
    <div className="not-found-page">
      {/* Elementos decorativos sutiles - modificados para error 400 */}
      <div className="not-found-decoration warning">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 22h20L12 2zm0 4l1.5 10h-3L12 6zm0 13c-.83 0-1.5-.67-1.5-1.5S11.17 16 12 16s1.5.67 1.5 1.5S12.83 19 12 19z" />
        </svg>
      </div>

      <div className="not-found-decoration browser">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z" />
        </svg>
      </div>

      {/* Header */}
      

      {/* Contenido principal */}
      <main className="not-found-content">

        {/* Número 400 */}
        <h1 className="not-found-number">400</h1>

        <h2 className="not-found-message">
          SOLICITUD INCORRECTA DEL NAVEGADOR
        </h2>

        <p className="not-found-subtitle">
          El navegador envió una solicitud que no pudimos entender. Esto puede
          deberse a un enlace desactualizado, un error de escritura en la URL o
          un problema con los datos enviados. En Titanium Sport Gym, estamos
          aquí para ayudarte a encontrar el camino correcto hacia tu
          transformación física.
        </p>

        {/* Sección de causas comunes */}
        <div className="error-400-causes">
        

          <div className="error-400-causes-grid">
            <div className="error-400-cause-item">
              <div className="error-400-cause-icon">

              </div>
              <div className="error-400-cause-content">
                
              </div>
            </div>

            <div className="error-400-cause-item">
              <div className="error-400-cause-icon">
              </div>
              <div className="error-400-cause-content">
              </div>
            </div>

            <div className="error-400-cause-item">
              <div className="error-400-cause-icon">
                
              </div>
              <div className="error-400-cause-content">

              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="not-found-actions">
          <Link to="/" className="not-found-button primary">
         
            IR AL INICIO
          </Link>

          <button
            onClick={() => window.history.back()}
            className="not-found-button secondary"
          >
            <span>VOLVER ATRÁS</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Buscador */}
        <div className="not-found-search-container">
          <div className="not-found-search-box">
            <input
              type="text"
              className="not-found-search-input"
              placeholder="¿Qué estás buscando en Titanium Sport Gym?"
            />
            <button className="not-found-search-button">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              BUSCAR
            </button>
          </div>
        </div>

        {/* Enlaces útiles */}
        <div className="not-found-useful-links">
          <h3 className="not-found-useful-links-title">ENLACES POPULARES</h3>

          <div className="not-found-links-grid">
            <div className="not-found-link-group">
              <h4 className="not-found-link-group-title">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path d="M9 22V12h6v10" />
                </svg>
                INICIO
              </h4>
              <ul className="not-found-link-list">
                <li className="not-found-link-item">
                  <Link to="/" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    Página Principal
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/servicios" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Nuestros Servicios
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/membresias" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Membresías
                  </Link>
                </li>
              </ul>
            </div>

            <div className="not-found-link-group">
              <h4 className="not-found-link-group-title">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                COMUNIDAD
              </h4>
              <ul className="not-found-link-list">
                <li className="not-found-link-item">
                  <Link to="/horarios" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Horarios de Clases
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/entrenadores" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    Nuestros Entrenadores
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/blog" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                    </svg>
                    Blog de Fitness
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      {false && <footer className="not-found-footer">
        <div className="not-found-footer-content">
          <div className="not-found-footer-info">
            <div className="not-found-footer-brand">Titanium Sport Gym</div>
            <p className="not-found-footer-tagline">
              Transformamos vidas a través del deporte y la salud. Si encuentras
              algún problema, no dudes en contactarnos para ayudarte.
            </p>
          </div>

          <div className="not-found-footer-links">
            <Link to="/contacto" className="not-found-footer-link">
              Reportar Problema
            </Link>
            <Link to="/faq" className="not-found-footer-link">
              Ayuda
            </Link>
            <Link to="/privacy" className="not-found-footer-link">
              Privacidad
            </Link>
            <Link to="/terms" className="not-found-footer-link">
              Términos
            </Link>
          </div>

          <div className="not-found-copyright">
            © {new Date().getFullYear()} Titanium Sport Gym. Todos los derechos
            reservados. Si encuentras algún error en nuestra página, por favor
            repórtalo para que podamos corregirlo.
          </div>
        </div>
      </footer>}
    </div>
  );
}
