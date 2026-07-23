import { CalendarDays, Dumbbell, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./TrainerPortalPage.module.css";

export default function TrainerDashboardPage() {
  const { user, requestLogout } = useAuth();

  return (
    <section className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Portal del entrenador</div>
          <h1 className={styles.title}>Tu cuenta ya esta activa</h1>
          <p className={styles.subtitle}>
            Acceso habilitado para gestionar clientes, rutinas y agenda desde un
            espacio de trabajo centralizado.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <span>Estado actual</span>
          <strong>Activo</strong>
          <p>Perfil listo para operar como entrenador.</p>
        </div>
      </section>

      <section className={styles.quickStats}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <UserRound size={18} />
          </span>
          <span className={styles.statLabel}>Cuenta</span>
          <strong>Registrada</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <ShieldCheck size={18} />
          </span>
          <span className={styles.statLabel}>Seguridad</span>
          <strong>Completa</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <Dumbbell size={18} />
          </span>
          <span className={styles.statLabel}>Rutinas</span>
          <strong>Disponibles</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <CalendarDays size={18} />
          </span>
          <span className={styles.statLabel}>Agenda</span>
          <strong>Lista</strong>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardIcon}>
            <UserRound size={20} />
          </div>
          <div>
            <h2>Cuenta registrada</h2>
            <p>
              Correo activo
              <strong>{user?.email ?? "No disponible"}</strong>
            </p>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardIcon}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Seguridad inicial completada</h2>
            <p>
              Tu clave temporal ya fue reemplazada. A partir de ahora debes
              acceder con tu nueva contrasena.
            </p>
          </div>
        </article>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void requestLogout()}
        >
          Cerrar sesion
        </button>
      </div>
    </section>
  );
}
