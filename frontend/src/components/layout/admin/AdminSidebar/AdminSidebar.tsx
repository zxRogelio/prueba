
import { useEffect, useState } from "react";
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
  FaBoxes,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import Logo from "../../../../assets/LogoP.png";

// en AdminSidebar.tsx

const items = [
  { to: "/admin", label: "Resumen", icon: <FaChartBar /> },
  { to: "/admin/users", label: "Usuarios", icon: <FaUsers /> },

  { to: "/admin/suscripciones", label: "Suscripciones", icon: <FaIdCard /> },
  { to: "/admin/reports", label: "Reportes", icon: <FaFileAlt /> },
  { to: "/admin/settings", label: "Gestión del sitio", icon: <FaCog /> },
  
];

const catalogItems = [
  { to: "/admin/brands", label: "Marcas", icon: <FaTags /> },
  { to: "/admin/categories", label: "Categorías", icon: <FaThLarge /> },
  { to: "/admin/products", label: "Productos", icon: <FaBoxOpen /> },
];

export default function AdminSidebar() {
  const location = useLocation();
  const hasActiveCatalogItem = catalogItems.some((item) =>
    location.pathname.startsWith(item.to),
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(hasActiveCatalogItem);

  useEffect(() => {
    if (hasActiveCatalogItem) {
      setIsCatalogOpen(true);
    }
  }, [hasActiveCatalogItem]);
  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <NavLink to="/admin" className={styles.brandLink}>
          <img
            src={Logo}
            alt="Titanium - Panel Admin"
            className={styles.brandLogo}
          />
        </NavLink>

        <div className={styles.brandTexts}>
          <span className={styles.brandTitle}>PANEL ADMIN</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}

         <div className={styles.group}>
          <button
            type="button"
            className={`${styles.groupTitle} ${hasActiveCatalogItem ? styles.groupActive : ""}`}
            onClick={() => setIsCatalogOpen((prev) => !prev)}
            aria-expanded={isCatalogOpen}
            aria-controls="catalog-menu"
          >
            <span className={styles.icon}>
              <FaBoxes />
            </span>
            <span className={styles.label}>Catálogo</span>
            <span className={styles.chevron}>
              {isCatalogOpen ? <FaChevronDown /> : <FaChevronRight />}
            </span>
          </button>

          {isCatalogOpen && (
            <div className={styles.groupItems} id="catalog-menu">
              {catalogItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.link} ${styles.childLink} ${isActive ? styles.active : ""}`
                  }
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.label}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
