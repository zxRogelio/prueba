import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./Footer.css";
import Logo from "../../assets/LogoP.png";

const Footer = () => {
  return (
    <footer className="smart-footer">
      <div className="footer-main">
        <div className="footer-content">
          <div className="footer-brand">
            <img
              src={Logo}
              alt="Titanium Sport Gym"
              className="footer-logo"
            />

            <div className="social-links">
              <span className="follow-text">SIGUENOS</span>
              <div className="social-icons">
                <a
                  href="https://www.instagram.com/titanium_sport_gym"
                  className="social-icon"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir Instagram de Titanium Sport Gym"
                >
                  <FaInstagram />
                </a>

                <a
                  href="https://www.facebook.com/TitaniumSportGym"
                  className="social-icon"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir Facebook de Titanium Sport Gym"
                >
                  <FaFacebookF />
                </a>
              </div>
            </div>
          </div>

          <div className="footer-columns">
            <div className="footer-column">
              <h4 className="footer-column-title">Explorar</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/" className="footer-link">Inicio</Link>
                </li>
                <li>
                  <Link to="/catalogue" className="footer-link">Catálogo</Link>
                </li>
                <li>
                  <Link to="/suscripciones" className="footer-link">Membresías</Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Titanium</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/about" className="footer-link">Acerca de nosotros</Link>
                </li>
                <li>
                  <a href="mailto:tsghuejutla@gmail.com" className="footer-link">Contacto</a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Información legal</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/terms" className="footer-link">Términos y condiciones</Link>
                </li>
                <li>
                  <Link to="/aviso-privacidad" className="footer-link">Aviso de privacidad</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="footer-disclaimer">
            Consulta las condiciones promocionales y reglamentos en nuestros{" "}
            <Link to="/terms" className="footer-legal-link">términos y condiciones</Link>.
          </p>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Titanium Sport Gym. Todos los
            derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
