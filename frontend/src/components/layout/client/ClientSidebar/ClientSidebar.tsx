import { Link, NavLink } from "react-router-dom";
import Logo from "../../../../assets/LogoP.png";
import styles from "./ClientSidebar.module.css";
import { clientPortalSections } from "../clientPortalNavigation";

interface ClientSidebarProps {
  collapsed: boolean;
}

export default function ClientSidebar({ collapsed }: ClientSidebarProps) {
  return (
    <div className={`${styles.wrap} ${collapsed ? styles.wrapCollapsed : ""}`}>
      <div className={styles.brand}>
        <Link to="/" className={styles.brandLink}>
          <img src={Logo} alt="Titanium" className={styles.brandLogo} />
          {!collapsed && (
            <div className={styles.brandTexts}>
              <span className={styles.brandTitle}>TITANIUM</span>
              <span className={styles.brandSubtitle}>Client Portal</span>
            </div>
          )}
        </Link>
      </div>

      <nav className={styles.nav}>
        {clientPortalSections.map((section) => (
          <div key={section.title} className={styles.section}>
            {!collapsed && (
              <div className={styles.sectionTitle}>{section.title}</div>
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ""}`
                }
                data-tooltip={collapsed ? item.label : undefined}
              >
                <span className={styles.icon}>
                  <item.icon />
                </span>
                {!collapsed && <span className={styles.label}>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
