import { Link } from "react-router-dom";
import styles from "./AdminSummaryPage.module.css";

const modules = [
  {
    title: "Monitoreo",
    description:
      "Consulta el estado y el crecimiento de PostgreSQL en tiempo real.",
    path: "/admin/monitoring",
  },
  {
    title: "Catálogo",
    description: "Gestiona productos, marcas y categorías de la tienda.",
    path: "/admin/products",
  },
  {
    title: "Suscripciones",
    description: "Revisa y administra planes y pagos recurrentes.",
    path: "/admin/suscripciones",
  },
];

export default function AdminSummaryPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Resumen administrativo</h1>
        <p>
          Usa este panel para navegar rápidamente a cada módulo operativo del
          sistema.
        </p>
      </header>

      <div className={styles.grid}>
        {modules.map((module) => (
          <Link key={module.path} to={module.path} className={styles.card}>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <span>Ir al módulo</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
