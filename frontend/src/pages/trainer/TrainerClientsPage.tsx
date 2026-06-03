import styles from "./TrainerPortalPage.module.css";

const clientTasks = [
  "Visualizar alumnos asignados y el estado de sus seguimientos.",
  "Detectar planes pendientes de actualizacion y proximas revisiones.",
  "Concentrar observaciones rapidas antes de abrir la ficha individual.",
];

export default function TrainerClientsPage() {
  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Seguimiento</span>
        <h1 className={styles.panelTitle}>Clientes asignados</h1>
        <p className={styles.panelDescription}>
          Esta seccion ya queda preparada para listar alumnos, progreso,
          adherencia y alertas operativas del entrenador.
        </p>

        <ul className={styles.list}>
          {clientTasks.map((task) => (
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
