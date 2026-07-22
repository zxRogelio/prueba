import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, UsersRound } from "lucide-react";
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

  const activeClients = clients.filter((client) => client.status === "active");
  const verifiedClients = clients.filter((client) => client.isVerified);

  return (
    <section className={styles.page}>
      <section className={styles.sectionHero}>
        <div>
          <span className={styles.sectionEyebrow}>Seguimiento</span>
          <h1 className={styles.sectionTitle}>Clientes asignados</h1>
          <p className={styles.sectionDescription}>
            Consulta los clientes vinculados a tu perfil y revisa su estado de
            suscripcion, rutina activa y fecha de asignacion.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => void loadClients()}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </section>

      <section className={styles.clientStats}>
        <article>
          <span>Total</span>
          <strong>{clients.length}</strong>
        </article>
        <article>
          <span>Activos</span>
          <strong>{activeClients.length}</strong>
        </article>
        <article>
          <span>Verificados</span>
          <strong>{verifiedClients.length}</strong>
        </article>
      </section>

      <section className={styles.dataPanel}>
        <div className={styles.dataToolbar}>
          <div>
            <h2>Lista de clientes</h2>
            <p>{filteredClients.length} resultado(s) visibles</p>
          </div>

          <label className={styles.searchField}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por correo..."
            />
          </label>
        </div>

        {errorMessage ? (
          <div className={styles.errorBox}>{errorMessage}</div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Suscripcion</th>
                <th>Rutina activa</th>
                <th>Estado</th>
                <th>Asignado</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.stateCell}>
                    Cargando clientes...
                  </td>
                </tr>
              ) : filteredClients.length ? (
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.email}</strong>
                      <span>{client.isVerified ? "Verificado" : "Pendiente"}</span>
                    </td>
                    <td>{client.subscriptionStatus || "Sin dato"}</td>
                    <td>{client.activeRoutine || "Sin rutina"}</td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          client.status === "active"
                            ? styles.statusPillActive
                            : ""
                        }`}
                      >
                        {client.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      {new Date(client.assignedAt).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className={styles.emptyState}>
                      <span>
                        <UsersRound size={24} />
                      </span>
                      <h3>Aun no tienes clientes asignados</h3>
                      <p>
                        Cuando el administrador vincule clientes a tu perfil,
                        apareceran en esta lista.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
