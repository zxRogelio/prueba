// src/components/layout/Header/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import styles from "../Navbar/Navbar.module.css";
import headerStyles from "./Header.module.css";

import Logo from "../../../assets/LogoP.png";
import MobileMenu from "../MobileMenu";

// Icons
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
  FaUser,
  FaCogs,
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";

type Role = "cliente" | "entrenador" | "administrador";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
};

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = (user?.rol ?? null) as Role | null;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cierra menú de usuario al hacer click fuera
  useEffect(() => {
    const onDocClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen]);

  const navItems: NavItem[] = useMemo(() => {
    // PÚBLICO
    if (!role) {
      return [
        { to: "/", label: "INICIO", icon: FaHome, end: true },
        { to: "/catalogue", label: "PRODUCTOS", icon: FaDumbbell },
        { to: "/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
        { to: "/AboutePage", label: "ACERCA DE NOSOTROS", icon: FaInfoCircle },
      ];
    }

    // CLIENTE
    if (role === "cliente") {
      return [
        { to: "/", label: "INICIO", icon: FaHome, end: true },
        { to: "/catalogue", label: "PRODUCTOS", icon: FaDumbbell },
        { to: "/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
        { to: "/cliente", label: "MI PORTAL", icon: FaUser },
      ];
    }

    // ENTRENADOR
    if (role === "entrenador") {
      return [
        { to: "/", label: "INICIO", icon: FaHome, end: true },
        { to: "/catalogue", label: "PRODUCTOS", icon: FaDumbbell },
        { to: "/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
        { to: "/entrenador", label: "PANEL", icon: FaCogs },
      ];
    }

    // ADMIN
    return [
      { to: "/", label: "INICIO", icon: FaHome, end: true },
      { to: "/admin", label: "ADMIN", icon: FaCogs },
      { to: "/admin/products", label: "PRODUCTOS", icon: FaDumbbell },
      { to: "/admin/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
    ];
  }, [role]);

  const avatarLetter = (user?.email?.trim()?.[0] ?? "U").toUpperCase();

  const goPortal = () => {
    if (!role) return navigate("/login");
    if (role === "administrador") return navigate("/admin");
    if (role === "cliente") return navigate("/cliente");
    return navigate("/entrenador");
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
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

          {/* Desktop nav */}
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
                    <FaUserPlus /> SUSCRÍBETE
                  </Link>
                  <Link to="/login" className={styles.btnSolid}>
                    <FaSignInAlt /> INICIA SESIÓN
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
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-label="Abrir menú de usuario"
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
                        <FaUserCircle /> Mi portal
                      </button>

                      {/* ✅ Perfil */}
                      {role === "cliente" && (
                        <button
                          className={headerStyles.dropdownItem}
                          type="button"
                          onClick={() => navigate("/cliente/perfil")}
                        >
                          <FaUser /> Perfil
                        </button>
                      )}

                      {/* ✅ Configuración 2FA (cliente) */}
                      {role === "cliente" && (
                        <button
                          className={headerStyles.dropdownItem}
                          type="button"
                          onClick={() => navigate("/cliente/configuracion")}
                        >
                          <FaCogs /> Configuración (2FA)
                        </button>
                      )}

                      <div className={headerStyles.divider} />

                      <button
                        className={headerStyles.dropdownItemDanger}
                        type="button"
                        onClick={() => {
                          logout();
                          navigate("/login");
                        }}
                      >
                        <FaSignOutAlt /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={styles.mobileMenuBtn}
            aria-label="Abrir menú"
            type="button"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}
    </>
  );
}
