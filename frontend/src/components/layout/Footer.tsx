import { FaFacebookF, FaInstagram } from "react-icons/fa";
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
              <h4 className="footer-column-title">Titanium</h4>
              <ul className="footer-links">
                <li>
                  <a href="#" className="footer-link">
                    Quienes somos
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Habla con nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Aviso de Privacidad
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Planes</h4>
              <ul className="footer-links">
                <li>
                  <a href="#" className="footer-link">
                    Membresias
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Contratos
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Titanium Coach
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Titanium Body
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Nuestra Compania</h4>
              <ul className="footer-links">
                <li>
                  <a href="#" className="footer-link">
                    Quiero ser entrenador
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Promociona tu marca
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Indica un local
                  </a>
                </li>
                <li>
                  <a href="#" className="footer-link">
                    Trabaja con nosotros
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="footer-disclaimer">
            *Consulte las condiciones promocionales y reglamentos en la
            pagina: titaniumsportgym.com/terminos-condiciones
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
