import styles from "./TrainerPortalPage.module.css";

const profileItems = [
  "Datos profesionales visibles para administracion y clientes.",
  "Especialidades, certificaciones y enfoque principal del entrenador.",
  "Zona preparada para foto, biografia breve y configuracion futura.",
];

export default function TrainerProfilePage() {
  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Cuenta</span>
        <h1 className={styles.panelTitle}>Perfil del entrenador</h1>
        <p className={styles.panelDescription}>
          Esta pagina ya queda lista para que despues montes el formulario del
          perfil sin tener que rehacer ni el layout ni la navegacion.
        </p>

        <ul className={styles.list}>
          {profileItems.map((item) => (
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
