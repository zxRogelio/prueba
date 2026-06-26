import { useEffect, useMemo, useState } from "react";
import {
  getTrainerClients,
  type TrainerClientDTO,
} from "../../services/trainer/clientService";
import styles from "./TrainerPortalPage.module.css";

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<TrainerClientDTO[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadClients = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await getTrainerClients();
      setClients(result);
    } catch (error) {
      console.error("getTrainerClients error:", error);
      setErrorMessage("No se pudieron cargar los clientes asignados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return clients;

    return clients.filter((client) =>
      client.email.toLowerCase().includes(cleanQuery),
    );
  }, [clients, query]);

  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <div className={styles.sectionTop}>
          <div>
            <span className={styles.panelEyebrow}>Seguimiento</span>
            <h1 className={styles.panelTitle}>Clientes asignados</h1>
            <p className={styles.panelDescription}>
              Aquí aparecerán los clientes vinculados al entrenador cuando el
              administrador o el sistema realice la asignación.
            </p>
          </div>

          <button className={styles.secondaryButton} onClick={() => void loadClients()}>
            Actualizar
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente por correo..."
          />
        </div>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

        <div className={styles.emptyTableWrap}>
          <table className={styles.simpleTable}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Suscripción</th>
                <th>Rutina activa</th>
                <th>Estado</th>
                <th>Asignado</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Cargando clientes...
                  </td>
                </tr>
              ) : filteredClients.length ? (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.email}</td>
                    <td>{client.subscriptionStatus}</td>
                    <td>{client.activeRoutine}</td>
                    <td>{client.status === "active" ? "Activo" : "Inactivo"}</td>
                    <td>{new Date(client.assignedAt).toLocaleDateString("es-MX")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Aún no tienes clientes asignados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}