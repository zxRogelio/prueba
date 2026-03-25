import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaHome,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useAuth } from "../../../../context/AuthContext";
import styles from "./ClientTopbar.module.css";

interface ClientTopbarProps {
  title: string;
  description: string;
  onToggleSidebar: () => void;
}

export default function ClientTopbar({
  title,
  description,
  onToggleSidebar,
}: ClientTopbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

        <div className={styles.copy}>
          <div className={styles.breadcrumbs}>
            <span className={styles.crumb}>PORTAL CLIENTE</span>
            <span className={styles.sep}>/</span>
            <span className={styles.crumbActive}>{title.toUpperCase()}</span>
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => navigate("/")}
        >
          <FaHome />
          Ir al sitio
        </button>

        <button
          type="button"
          className={styles.actionButtonSoft}
          onClick={() => navigate("/cliente/perfil")}
        >
          <FaUserCircle />
          Mi perfil
        </button>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {(user?.email?.[0] ?? "C").toUpperCase()}
          </div>
          <div className={styles.profileText}>
            <strong>{user?.email ?? "cliente@titanium.com"}</strong>
            <span>Sesion activa</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => {
            logout();
          }}
          aria-label="Cerrar sesion"
          title="Cerrar sesion"
        >
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
}
