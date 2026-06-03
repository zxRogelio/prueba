import styles from "./TrainerPortalPage.module.css";

const agendaItems = [
  "Bloques para sesiones presenciales, evaluaciones y seguimiento remoto.",
  "Resumen de proximas actividades con prioridad visual dentro del portal.",
  "Espacio listo para enlazar disponibilidad y reprogramaciones.",
];

export default function TrainerAgendaPage() {
  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Agenda</span>
        <h1 className={styles.panelTitle}>Agenda semanal</h1>
        <p className={styles.panelDescription}>
          Aqui puedes crecer despues hacia calendario, sesiones pendientes y
          recordatorios operativos sin cambiar la estructura del portal.
        </p>

        <ul className={styles.list}>
          {agendaItems.map((item) => (
            <li key={item} className={styles.listItem}>
              <span className={styles.bullet} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
