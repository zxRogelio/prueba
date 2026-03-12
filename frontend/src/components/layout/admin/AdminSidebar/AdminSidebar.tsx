import { useEffect, useMemo, useState, type ReactElement } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./AdminSidebar.module.css";
import {
  FaChartBar,
  FaUsers,
  FaBoxOpen,
  FaIdCard,
  FaFileAlt,
  FaCog,
  FaTags,
  FaThLarge,
  FaChevronRight,
  FaChevronLeft,
  FaBoxes,
  FaServer,
  FaDatabase,
} from "react-icons/fa";
import Logo from "../../../../assets/LogoP.png";

const topItems = [
  { to: "/admin", label: "Resumen", icon: <FaChartBar /> },
  { to: "/admin/users", label: "Usuarios", icon: <FaUsers /> },
];

const catalogItems = [
  { to: "/admin/products", label: "Productos", icon: <FaBoxOpen /> },
  { to: "/admin/brands", label: "Marcas", icon: <FaTags /> },
  { to: "/admin/categories", label: "Categorías", icon: <FaThLarge /> },
];

const bottomItems = [
  { to: "/admin/suscripciones", label: "Suscripciones", icon: <FaIdCard /> },
  { to: "/admin/reports", label: "Reportes", icon: <FaFileAlt /> },
  { to: "/admin/settings", label: "Gestión del sitio", icon: <FaCog /> },
  { to: "/admin/monitoring", label: "Monitoreo", icon: <FaServer /> },
];

const systemItems = [
  { to: "/admin/logs", label: "Logs del sistema", icon: <FaDatabase /> },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const catalogActive = useMemo(
    () => catalogItems.some((item) => pathname.startsWith(item.to)),
    [pathname],
  );

  useEffect(() => {
    if (catalogActive) setCatalogOpen(true);
  }, [catalogActive]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    // Guardar preferencia en localStorage
    localStorage.setItem("sidebarCollapsed", JSON.stringify(!collapsed));
  };

  // Cargar preferencia guardada
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const renderLink = (item: {
    to: string;
    label: string;
    icon: ReactElement;
  }) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/admin"}
      className={({ isActive }) =>
        `${styles.link} ${isActive ? styles.active : ""}`
      }
      data-tooltip={collapsed ? item.label : undefined}
    >
      <span className={styles.icon}>{item.icon}</span>
      {!collapsed && <span className={styles.label}>{item.label}</span>}
    </NavLink>
  );

  return (
    <div className={`${styles.wrap} ${collapsed ? styles.wrapCollapsed : ""}`}>
      <button
        onClick={toggleSidebar}
        className={styles.collapseButton}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        <FaChevronLeft
          className={`${styles.collapseIcon} ${
            collapsed ? styles.collapseIconRotated : ""
          }`}
        />
      </button>

      <div className={styles.brand}>
        <NavLink to="/admin" className={styles.brandLink}>
          <img src={Logo} alt="Titanium" className={styles.brandLogo} />
          {!collapsed && (
            <div className={styles.brandTexts}>
              <span className={styles.brandTitle}>TITANIUM</span>
              <span className={styles.brandSubtitle}>Admin Panel</span>
            </div>
          )}
        </NavLink>
      </div>

      <nav className={styles.nav}>
        {/* Sección principal */}
        {topItems.map(renderLink)}

        {/* Catálogo */}
        <div>
          <button
            type="button"
            className={`${styles.catalogToggle} ${catalogActive ? styles.active : ""}`}
            onClick={() => setCatalogOpen((prev) => !prev)}
            aria-expanded={catalogOpen}
            data-tooltip={collapsed ? "Catálogo" : undefined}
          >
            <span className={styles.catalogLeft}>
              <span className={styles.icon}>
                <FaBoxes />
              </span>
              {!collapsed && <span className={styles.label}>Catálogo</span>}
            </span>
            {!collapsed && (
              <span
                className={`${styles.chevron} ${catalogOpen ? styles.chevronOpen : ""}`}
              >
                <FaChevronRight />
              </span>
            )}
          </button>

          {catalogOpen && !collapsed && (
            <div className={styles.submenu}>
              {catalogItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.subLink} ${isActive ? styles.subActive : ""}`
                  }
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.label}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Sección de gestión */}
        {bottomItems.map(renderLink)}

        {/* Sección del sistema */}
        {!collapsed && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Sistema</div>
            {systemItems.map(renderLink)}
          </div>
        )}

        {/* En modo colapsado, los items del sistema se muestran sin título */}
        {collapsed && systemItems.map(renderLink)}
      </nav>
    </div>
  );
}
