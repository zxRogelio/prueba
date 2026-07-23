import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import styles from "../Navbar/Navbar.module.css";
import headerStyles from "./Header.module.css";

import Logo from "../../../assets/LogoP.png";
import LogoWhite from "../../../assets/LogoP-removebg-preview.png";
import MobileMenu from "../MobileMenu";

import {
  FaHome,
  FaDumbbell,
  FaIdCard,
  FaInfoCircle,
  FaShoppingCart,
  FaUserPlus,
  FaSignInAlt,
  FaUserCircle,
  FaChevronDown,
  FaSignOutAlt,
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/useCart";
import { getPortalRoute, normalizeAppRole } from "../../../utils/authRouting";
import CartDrawer from "../../cart/CartDrawer";

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

const MOBILE_NAV_BREAKPOINT = 1180;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, requestLogout } = useAuth();
  const { itemCount, openCart } = useCart();
  const role = normalizeAppRole(user?.rol);

  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;
        const scrollDelta = currentScrollY - lastScrollY;

        setScrolled(currentScrollY > 20);

        if (currentScrollY <= 24 || mobileMenuOpen || userMenuOpen) {
          setHeaderHidden(false);
        } else if (scrollDelta > 8 && currentScrollY > 120) {
          setHeaderHidden(true);
        } else if (scrollDelta < -8) {
          setHeaderHidden(false);
        }

        lastScrollYRef.current = Math.max(currentScrollY, 0);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen, userMenuOpen]);

  useEffect(() => {
    const onDocClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setHeaderHidden(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > MOBILE_NAV_BREAKPOINT) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navItems: NavItem[] = useMemo(() => {
    if (role !== "administrador") return sharedNavItems;

    return [
      { to: "/", label: "INICIO", icon: FaHome, end: true },
      { to: "/admin", label: "ADMIN", icon: FaInfoCircle },
      { to: "/admin/products", label: "PRODUCTOS", icon: FaDumbbell },
      { to: "/admin/suscripciones", label: "SUSCRIPCIONES", icon: FaIdCard },
    ];
  }, [role]);

  const avatarLetter = (user?.email?.trim()?.[0] ?? "U").toUpperCase();
  const isTransparentHomeHeader = location.pathname === "/" && !scrolled;

  const goPortal = () => {
    navigate(getPortalRoute(role));
  };

  const handleCartClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    openCart();
  };

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""} ${
          headerHidden ? styles.headerHidden : ""
        } ${
          isTransparentHomeHeader ? styles.headerTransparent : ""
        }`}
      >
        <div className={styles.headerContent}>
          <div
            className={`${styles.logoContainer} ${
              isTransparentHomeHeader ? styles.logoContainerFloating : ""
            }`}
          >
            <Link to="/" className={styles.logoLink}>
              <img
                src={isTransparentHomeHeader ? LogoWhite : Logo}
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
              <span className={styles.navDivider} aria-hidden="true" />
              <button
                type="button"
                className={styles.cartButton}
                onClick={handleCartClick}
                aria-label={
                  user
                    ? `Abrir carrito de compras${
                        itemCount > 0 ? ` con ${itemCount} productos` : ""
                      }`
                    : "Inicia sesion para acceder al carrito"
                }
              >
                <FaShoppingCart />
                {itemCount > 0 && (
                  <span className={styles.cartBadge} aria-hidden="true">
                    {itemCount}
                  </span>
                )}
              </button>

              {!user ? (
                <>
                  <Link to="/register" className={styles.btnOutline}>
                    <FaUserPlus />
                    SUSCRIBETE
                  </Link>
                  <Link to="/login" className={styles.btnSolid}>
                    <FaSignInAlt />
                    INICIA SESION
                  </Link>
                </>
              ) : (
                <div
                  className={headerStyles.userMenu}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`${headerStyles.userMenuBtn} ${
                      isTransparentHomeHeader
                        ? headerStyles.userMenuBtnTransparent
                        : ""
                    }`}
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
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`${styles.mobileMenuBtn} ${
              mobileMenuOpen ? styles.mobileMenuBtnOpen : ""
            }`}
            aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            type="button"
          >
            <span className={styles.mobileMenuBars} aria-hidden="true">
              <span className={styles.mobileMenuBar} />
              <span className={styles.mobileMenuBar} />
              <span className={styles.mobileMenuBar} />
            </span>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <MobileMenu
          onClose={() => setMobileMenuOpen(false)}
          transparent={isTransparentHomeHeader}
        />
      )}

      <CartDrawer />
    </>
  );
}
