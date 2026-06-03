import styles from "./TrainerPortalPage.module.css";

const routineTasks = [
  "Gestionar plantillas base para fuerza, hipertrofia y acondicionamiento.",
  "Versionar ajustes antes de publicar cambios para un cliente o grupo.",
  "Preparar un flujo para asociar materiales, notas y progresiones.",
];

export default function TrainerRoutinesPage() {
  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Rutinas</span>
        <h1 className={styles.panelTitle}>Rutinas y planes</h1>
        <p className={styles.panelDescription}>
          El layout ya soporta esta vista para trabajar mas adelante la
          construccion de planes, bloques de entrenamiento y control de cambios.
        </p>

        <ul className={styles.list}>
          {routineTasks.map((task) => (
            <li key={task} className={styles.listItem}>
              <span className={styles.bullet} aria-hidden="true" />
              <span>{task}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
