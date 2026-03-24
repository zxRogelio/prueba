import { Link } from "react-router-dom";
import "../styles/notFound.css";

export default function Error500Page() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="not-found-page">
      {/* Elementos decorativos sutiles - modificados para error 500 */}
      <div className="not-found-decoration server">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17l-.59.59-.58.58V4h16v12z" />
          <path d="M6 12h8v2H6zm0-3h12v2H6zm0-3h12v2H6z" />
        </svg>
      </div>

      <div className="not-found-decoration gear">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5A3.5 3.5 0 0 1 12 15.5zm0-5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6.04-3.55l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C15.15 4.95 14.11 4.5 13 4.5V2h-2v2.5c-1.11 0-2.15.45-2.94 1.16L6.64 4.24c-.51.43-.99.9-1.41 1.41l1.42 1.42C5.45 7.85 5 8.89 5 10H2v2h3c0 1.11.45 2.15 1.16 2.94l-1.42 1.42c.43.51.9.99 1.41 1.41l1.42-1.42c.79.71 1.83 1.16 2.94 1.16V22h2v-2.5c1.11 0 2.15-.45 2.94-1.16l1.42 1.42c.51-.43.99-.9 1.41-1.41l-1.42-1.42c.71-.79 1.16-1.83 1.16-2.94h3v-2h-3c0-1.11-.45-2.15-1.16-2.94z" />
        </svg>
      </div>

      {/* Contenido principal - usando las mismas clases del 404 */}
      <main className="not-found-content">
   

        {/* Número 500 en lugar de 404 */}
        <h1 className="not-found-number">500</h1>

        <h2 className="not-found-message">PROBLEMA INTERNO DEL SERVIDOR</h2>

        <p className="not-found-subtitle">
          Nuestro equipo técnico está trabajando para solucionar el problema.
          Mientras tanto, puedes intentar refrescar la página o volver al
          inicio. En Titanium Sport Gym, nos comprometemos a ofrecerte la mejor
          experiencia.
        </p>

        {/* Sección de diagnóstico - nueva para error 500 */}
        <div className="error-500-diagnosis">
          <div className="error-500-diagnosis-item">
            <div className="error-500-diagnosis-icon"></div>
            <div className="error-500-diagnosis-content">
              
            </div>
          </div>

          <div className="error-500-diagnosis-item">
            <div className="error-500-diagnosis-icon"></div>
            <div className="error-500-diagnosis-content"></div>
          </div>
        </div>

        {/* Botones de acción - usando las mismas clases del 404 */}
        <div className="not-found-actions">
          <button onClick={handleRetry} className="not-found-button primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            REINTENTAR
          </button>

          <Link to="/" className="not-found-button secondary">
            <span>IR AL INICIO</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </div>

        {/* Barra de progreso - nueva para error 500 */}
        <div className="error-500-progress">
          <div className="error-500-progress-label">
            <span>Sistema en recuperación</span>
            <span className="error-500-progress-percent">65%</span>
          </div>
          <div className="error-500-progress-bar">
            <div className="error-500-progress-fill"></div>
          </div>
        </div>

        {/* Enlaces útiles - usando las mismas clases del 404 */}
        <div className="not-found-useful-links">
          <h3 className="not-found-useful-links-title">ENLACES ÚTILES</h3>

          <div className="not-found-links-grid">
            <div className="not-found-link-group">
              <h4 className="not-found-link-group-title">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 8h1a4 4 0 010 8h-1" />
                  <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                  <path d="M6 1v3" />
                  <path d="M10 1v3" />
                  <path d="M14 1v3" />
                </svg>
                CONTACTO
              </h4>
              <ul className="not-found-link-list">
                <li className="not-found-link-item">
                  <Link to="/contacto" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                    Soporte Técnico
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/contacto" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                    Correo Electrónico
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
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                INFORMACIÓN
              </h4>
              <ul className="not-found-link-list">
                <li className="not-found-link-item">
                  <Link to="/faq" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Preguntas Frecuentes
                  </Link>
                </li>
                <li className="not-found-link-item">
                  <Link to="/status" className="not-found-link">
                    <svg
                      className="not-found-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Estado del Servicio
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - usando las mismas clases del 404 */}
      {false && <footer className="not-found-footer">
        <div className="not-found-footer-content">
          <div className="not-found-footer-info">
            <div className="not-found-footer-brand">Titanium Sport Gym</div>
            <p className="not-found-footer-tagline">
              Transformamos vidas a través del deporte y la salud. Estamos
              trabajando para restaurar el servicio.
            </p>
          </div>

          <div className="not-found-footer-links">
            <Link to="/contacto" className="not-found-footer-link">
              Contactar Soporte
            </Link>
            <Link to="/faq" className="not-found-footer-link">
              Preguntas Frecuentes
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
            reservados. Estamos resolviendo problemas técnicos para servirte
            mejor.
          </div>
        </div>
      </footer>}
    </div>
  );
}
