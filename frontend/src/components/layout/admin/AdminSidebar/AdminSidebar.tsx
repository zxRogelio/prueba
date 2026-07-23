import { useEffect, useMemo, useState, type ReactElement } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./AdminSidebar.module.css";
import {
  FaBoxOpen,
  FaBoxes,
  FaChartBar,
  FaChartLine,
  FaChevronRight,
  FaCog,
  FaDatabase,
  FaDumbbell,
  FaFileAlt,
  FaHdd,
  FaIdCard,
  FaInfoCircle,
  FaMoneyBillWave,
  FaShieldAlt,
  FaServer,
  FaTags,
  FaThLarge,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import Logo from "../../../../assets/LogoP.png";

const topItems = [
  { to: "/admin", label: "Resumen", icon: <FaChartBar /> },
  { to: "/admin/users", label: "Usuarios", icon: <FaUsers /> },
  {
    to: "/admin/client-renewal-prediction",
    label: "Renovacion clientes",
    icon: <FaUserCheck />,
  },
];

const catalogItems = [
  { to: "/admin/products", label: "Productos", icon: <FaBoxOpen /> },
  {
    to: "/admin/sales-prediction",
    label: "Prediccion ventas",
    icon: <FaChartLine />,
  },
  { to: "/admin/brands", label: "Marcas", icon: <FaTags /> },
  { to: "/admin/categories", label: "Categorias", icon: <FaThLarge /> },
];

const bottomItems = [
  { to: "/admin/suscripciones", label: "Suscripciones", icon: <FaIdCard /> },
  { to: "/admin/pagos", label: "Pagos", icon: <FaMoneyBillWave /> },
  { to: "/admin/chargebacks", label: "Contracargos", icon: <FaShieldAlt /> },
  { to: "/admin/routines", label: "Rutinas", icon: <FaDumbbell /> },
  { to: "/admin/reports", label: "Reportes", icon: <FaFileAlt /> },
  { to: "/admin/settings", label: "Gestion del sitio", icon: <FaCog /> },
  { to: "about", label: "About / Nosotros", icon: <FaInfoCircle /> },
];

const monitoringItems = [
  { to: "/admin/monitoring", label: "Monitoreo", icon: <FaServer /> },
  { to: "/admin/backups", label: "Respaldos", icon: <FaHdd /> },
];

const systemItems = [
  { to: "/admin/logs", label: "Logs del sistema", icon: <FaDatabase /> },
];

interface Props {
  collapsed: boolean;
}

export default function AdminSidebar({ collapsed }: Props) {
  const { pathname } = useLocation();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);

  const catalogActive = useMemo(
    () => catalogItems.some((item) => pathname.startsWith(item.to)),
    [pathname]
  );

  const monitoringActive = useMemo(
    () => monitoringItems.some((item) => pathname.startsWith(item.to)),
    [pathname]
  );

  useEffect(() => {
    if (catalogActive) setCatalogOpen(true);
  }, [catalogActive]);

  useEffect(() => {
    if (monitoringActive) setMonitoringOpen(true);
  }, [monitoringActive]);

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
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <span className={styles.icon}>{item.icon}</span>
      {!collapsed && <span className={styles.label}>{item.label}</span>}
    </NavLink>
  );

  return (
    <div className={`${styles.wrap} ${collapsed ? styles.wrapCollapsed : ""}`}>
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
        {topItems.map(renderLink)}

        <div>
          <button
            type="button"
            className={`${styles.catalogToggle} ${
              catalogActive ? styles.active : ""
            }`}
            onClick={() => setCatalogOpen((prev) => !prev)}
            aria-expanded={catalogOpen}
            data-tooltip={collapsed ? "Catalogo" : undefined}
            title={collapsed ? "Catalogo" : undefined}
            aria-label={collapsed ? "Catalogo" : undefined}
          >
            <span className={styles.catalogLeft}>
              <span className={styles.icon}>
                <FaBoxes />
              </span>
              {!collapsed && <span className={styles.label}>Catalogo</span>}
            </span>
            {!collapsed && (
              <span
                className={`${styles.chevron} ${
                  catalogOpen ? styles.chevronOpen : ""
                }`}
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

        {bottomItems.map(renderLink)}

        <div>
          <button
            type="button"
            className={`${styles.catalogToggle} ${
              monitoringActive ? styles.active : ""
            }`}
            onClick={() => setMonitoringOpen((prev) => !prev)}
            aria-expanded={monitoringOpen}
            data-tooltip={collapsed ? "Monitoreo" : undefined}
            title={collapsed ? "Monitoreo" : undefined}
            aria-label={collapsed ? "Monitoreo" : undefined}
          >
            <span className={styles.catalogLeft}>
              <span className={styles.icon}>
                <FaServer />
              </span>
              {!collapsed && <span className={styles.label}>Monitoreo</span>}
            </span>
            {!collapsed && (
              <span
                className={`${styles.chevron} ${
                  monitoringOpen ? styles.chevronOpen : ""
                }`}
              >
                <FaChevronRight />
              </span>
            )}
          </button>

          {monitoringOpen && !collapsed && (
            <div className={styles.submenu}>
              {monitoringItems.map((item) => (
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

        {!collapsed && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Sistema</div>
            {systemItems.map(renderLink)}
          </div>
        )}

        {collapsed && systemItems.map(renderLink)}
      </nav>
    </div>
  );
}
