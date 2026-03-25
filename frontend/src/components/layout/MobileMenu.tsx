import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { getPortalRoute, normalizeAppRole } from "../../utils/authRouting";
import menuStyles from "./MobileMenu.module.css";
import navStyles from "./Navbar/Navbar.module.css";

interface Props {
  onClose: () => void;
}

const MobileMenu = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const role = normalizeAppRole(user?.rol);

  const handlePortalNavigation = () => {
    navigate(getPortalRoute(role));
    onClose();
  };

  const handleCartClick = () => {
    if (!user) navigate("/login");
    else openCart();

    onClose();
  };

  return (
    <div className={menuStyles.menu}>
      <nav className={menuStyles.nav}>
        <Link to="/" className={menuStyles.link} onClick={onClose}>
          INICIO
        </Link>
        <Link to="/catalogue" className={menuStyles.link} onClick={onClose}>
          PRODUCTOS
        </Link>
        <Link
          to="/suscripciones"
          className={menuStyles.link}
          onClick={onClose}
        >
          SUSCRIPCIONES
        </Link>
        <Link to="/AboutePage" className={menuStyles.link} onClick={onClose}>
          ACERCA DE
        </Link>

        <button
          type="button"
          className={menuStyles.cartLink}
          onClick={handleCartClick}
        >
          <span className={menuStyles.cartLabel}>
            <FaShoppingCart />
            CARRITO
          </span>
          {itemCount > 0 && (
            <span className={menuStyles.cartBadge} aria-hidden="true">
              {itemCount}
            </span>
          )}
        </button>

        <div className={menuStyles.actions}>
          {!user ? (
            <>
              <Link
                to="/register"
                className={`${navStyles.btnOutline} ${menuStyles.actionButton}`}
                onClick={onClose}
              >
                SUSCRIBETE
              </Link>
              <Link
                to="/login"
                className={`${navStyles.btnSolid} ${menuStyles.actionButton}`}
                onClick={onClose}
              >
                INICIA SESION
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${navStyles.btnOutline} ${menuStyles.actionButton}`}
                onClick={handlePortalNavigation}
              >
                IR AL PORTAL
              </button>
              {role === "cliente" && (
                <Link
                  to="/cliente/perfil"
                  className={`${navStyles.btnOutline} ${menuStyles.actionButton}`}
                  onClick={onClose}
                >
                  MI PERFIL
                </Link>
              )}
              {role === "cliente" && (
                <Link
                  to="/cliente/configuracion"
                  className={`${navStyles.btnOutline} ${menuStyles.actionButton}`}
                  onClick={onClose}
                >
                  CONFIGURACION
                </Link>
              )}
              <button
                type="button"
                className={`${navStyles.btnSolid} ${menuStyles.actionButton}`}
                onClick={() => {
                  logout();
                  onClose();
                }}
              >
                CERRAR SESION
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default MobileMenu;
