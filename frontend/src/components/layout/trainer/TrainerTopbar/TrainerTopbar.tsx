import { useNavigate } from "react-router-dom";
import { FaBars, FaHome, FaSignOutAlt } from "react-icons/fa";
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
  title,
  breadcrumb,
  description,
  onToggleSidebar,
}: TrainerTopbarProps) {
  const navigate = useNavigate();
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

        <div className={styles.copy}>
          <div className={styles.breadcrumbs}>
            <span className={styles.crumb}>PORTAL ENTRENADOR</span>
            <span className={styles.sep}>/</span>
            <span className={styles.crumbActive}>{breadcrumb}</span>
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => navigate("/")}
          aria-label="Ir al sitio"
          title="Ir al sitio"
        >
          <FaHome />
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
