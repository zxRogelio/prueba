import {
  FaBars,
  FaBell,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
} from "react-icons/fa";
import Logo from "../../../../assets/LogoP.png";
import { useAuth } from "../../../../context/AuthContext";
import styles from "./ClientTopbar.module.css";

interface ClientTopbarProps {
  title: string;
  breadcrumb: string;
  description: string;
  onToggleSidebar: () => void;
}

export default function ClientTopbar({
  breadcrumb,
  onToggleSidebar,
}: ClientTopbarProps) {
  const { user, requestLogout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={onToggleSidebar}
          aria-label="Abrir o cerrar menu lateral"
        >
          <FaBars />
        </button>

        <div className={styles.brand}>
          <img src={Logo} alt="Titanium" className={styles.brandLogo} />
        </div>

        <div className={styles.breadcrumbs}>
          <span className={styles.crumb}>HOME</span>
          <span className={styles.sep}>&gt;</span>
          <span className={styles.crumbActive}>{breadcrumb}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.search}>
          <FaSearch className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Buscar..." />
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <FaBell />
          <span className={styles.badge} />
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Ayuda"
          title="Ayuda"
        >
          <FaQuestionCircle />
        </button>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {(user?.email?.[0] ?? "C").toUpperCase()}
          </div>
          <div className={styles.profileText}>
            <strong>{user?.email ?? "cliente@titanium.com"}</strong>
            <span>Cliente</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => void requestLogout()}
          aria-label="Cerrar sesion"
          title="Cerrar sesion"
        >
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
}
