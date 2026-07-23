import {
  FaBars,
  FaBell,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
} from "react-icons/fa";
import Logo from "../../../../assets/LogoP.png";
import { useAuth } from "../../../../context/AuthContext";
import styles from "./TrainerTopbar.module.css";

interface TrainerTopbarProps {
  title: string;
  breadcrumb: string;
  description: string;
  onToggleSidebar: () => void;
}

export default function TrainerTopbar({
  breadcrumb,
  onToggleSidebar,
}: TrainerTopbarProps) {
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
            {(user?.email?.[0] ?? "E").toUpperCase()}
          </div>
          <div className={styles.profileText}>
            <strong>{user?.email ?? "entrenador@titanium.com"}</strong>
            <span>Entrenador</span>
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
