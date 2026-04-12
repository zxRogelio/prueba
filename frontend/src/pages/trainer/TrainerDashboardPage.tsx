import { ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./TrainerDashboardPage.module.css";

export default function TrainerDashboardPage() {
  const { user, requestLogout } = useAuth();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.badge}>Portal del entrenador</div>
        <h1 className={styles.title}>Tu cuenta ya esta activa</h1>
        <p className={styles.subtitle}>
          El acceso del entrenador ya quedo habilitado con la nueva contrasena.
          Este espacio ya responde correctamente para el rol `entrenador`.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardIcon}>
            <UserRound size={20} />
          </div>
          <h2>Cuenta registrada</h2>
          <p>
            Correo activo: <strong>{user?.email ?? "No disponible"}</strong>
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardIcon}>
            <ShieldCheck size={20} />
          </div>
          <h2>Seguridad inicial completada</h2>
          <p>
            Ya no usas la clave temporal generada por el administrador. A partir
            de ahora debes entrar con tu nueva contrasena.
          </p>
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
    </main>
  );
}
