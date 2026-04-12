import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import headerStyles from "../Header/Header.module.css";
import Logo from "../../../assets/logo_ULTRA_HD-removebg-preview.png";

import {
  FaHome,
  FaDumbbell,
  FaIdCard,
  FaInfoCircle,
  FaUserPlus,
  FaSignInAlt,
  FaUserCircle,
  FaChevronDown,
  FaSignOutAlt,
  FaCogs,
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { getPortalRoute, normalizeAppRole } from "../../../utils/authRouting";

interface Props {
  scrolled: boolean;
  onToggleMobile: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
};

const sharedNavItems: NavItem[] = [
  { to: "/", label: "INICIO", icon: FaHome, end: true },
  { to: "/catalogue", label: "PRODUCTOS", icon: FaDumbbell },
  { to: "/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
  { to: "/AboutePage", label: "ACERCA DE NOSOTROS", icon: FaInfoCircle },
];

const Navbar = ({ scrolled, onToggleMobile }: Props) => {
  const navigate = useNavigate();
  const { user, requestLogout } = useAuth();
  const role = normalizeAppRole(user?.rol);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onDocClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen]);

  const navItems = useMemo(() => {
    if (role !== "administrador") return sharedNavItems;

    return [
      { to: "/", label: "INICIO", icon: FaHome, end: true },
      { to: "/admin", label: "ADMIN", icon: FaCogs },
      { to: "/admin/products", label: "PRODUCTOS", icon: FaDumbbell },
      { to: "/admin/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
    ];
  }, [role]);

  const avatarLetter = (user?.email?.trim()?.[0] ?? "U").toUpperCase();

  const goPortal = () => {
    navigate(getPortalRoute(role));
  };

  return (
    <header
      className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
    >
      <div className={styles.headerContent}>
        <div className={styles.logoContainer}>
          <Link to="/">
            <img
              src={Logo}
              alt="Titanium Sport Gym"
              className={styles.logoImage}
            />
          </Link>
        </div>

        <nav className={styles.navDesktop}>
          <div className={styles.navMainLinks}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                }
              >
                <item.icon className={styles.navIcon} />
                {item.label}
                <span className={styles.navUnderline} />
              </NavLink>
            ))}
          </div>

          <div className={styles.navActionLinks}>
            {!user ? (
              <>
                <Link to="/register" className={styles.btnOutline}>
                  <FaUserPlus /> SUSCRIBETE
                </Link>
                <Link to="/login" className={styles.btnSolid}>
                  <FaSignInAlt /> INICIA SESION
                </Link>
              </>
            ) : (
              <div
                className={headerStyles.userMenu}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={headerStyles.userMenuBtn}
                  onClick={() => setUserMenuOpen((value) => !value)}
                  aria-label="Abrir menu de usuario"
                >
                  <span className={headerStyles.avatar}>{avatarLetter}</span>
                  <span className={headerStyles.userText}>{user.email}</span>
                  <FaChevronDown />
                </button>

                {userMenuOpen && (
                  <div className={headerStyles.dropdown}>
                    <button
                      className={headerStyles.dropdownItem}
                      type="button"
                      onClick={goPortal}
                    >
                      <FaUserCircle /> Ir al portal
                    </button>

                    <div className={headerStyles.divider} />

                    <button
                      className={headerStyles.dropdownItemDanger}
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void requestLogout();
                      }}
                    >
                      <FaSignOutAlt /> Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        <button
          onClick={onToggleMobile}
          className={styles.mobileMenuBtn}
          aria-label="Abrir menu"
          type="button"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
