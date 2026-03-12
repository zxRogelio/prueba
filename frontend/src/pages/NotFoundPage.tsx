import { Link } from "react-router-dom";
import "../styles/notFound.css";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
  const { user } = useAuth();

  const homeRoute = user?.rol === "administrador" ? "/admin" : "/";
  return (
    <div className="not-found-page">
      {/* Elementos decorativos sutiles */}
      <div className="not-found-decoration dumbbell">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.34 20.66a8 8 0 0 0 11.32 0l1.41-1.41a8 8 0 0 0 0-11.32l-1.41-1.41a8 8 0 0 0-11.32 0l-1.41 1.41a8 8 0 0 0 0 11.32l1.41 1.41z" />
        </svg>
      </div>

      <div className="not-found-decoration barbell">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM7 8h2v8H7V8zm8 0h2v8h-2V8zM11 6h2v12h-2V6z" />
        </svg>
      </div>

      {/* Contenido principal */}
      <main className="not-found-content">
        <h1 className="not-found-number">404</h1>

        <h2 className="not-found-message">RUTA NO ENCONTRADA</h2>

        <p className="not-found-subtitle">
          La página que buscas no existe o fue movida. Vuelve al inicio y sigue
          entrenando con nosotros en Titanium Sport Gym, donde transformamos
          vidas a través del deporte y la salud.
        </p>

        {/* Botones de acción */}
        <div className="not-found-actions">
          <Link className="not-found-button primary" to={homeRoute}>
            Ir al Inicio
          </Link>
          <Link className="not-found-button secondary" to="/catalogue">
            <span>Ver Catálogo</span>
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
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="not-found-footer">
        <div className="not-found-footer-content">
          <div className="not-found-footer-info">
            <div className="not-found-footer-brand">Titanium Sport Gym</div>
            <p className="not-found-footer-tagline">
              Transformamos vidas a través del deporte y la salud. Tu destino de
              transformación física y emocional.
            </p>
          </div>

          <div className="not-found-footer-links">
            <Link to="/contact" className="not-found-footer-link">
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
            © 2024 Titanium Sport Gym. Todos los derechos reservados. Más que un
            gimnasio, una comunidad comprometida con tu bienestar.
          </div>
        </div>
      </footer>
    </div>
  );
}
