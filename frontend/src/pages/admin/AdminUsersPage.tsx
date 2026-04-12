import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  FaCopy,
  FaExclamationCircle,
  FaSearch,
  FaSyncAlt,
  FaUser,
  FaUserPlus,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import { API } from "../../api/api";
import AdminPagination from "../../components/layout/admin/AdminPagination/AdminPagination";
import { usePagination } from "../../hooks/usePagination";
import {
  getAdminUsers,
  type AdminUserDTO,
} from "../../services/admin/userService";
import styles from "./AdminUsersPage.module.css";

interface RegisteredTrainerData {
  email: string;
  generatedPassword: string;
}

const roleLabels: Record<AdminUserDTO["role"], string> = {
  cliente: "Cliente",
  entrenador: "Entrenador",
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (value?: string) => {
  if (!value) return "Sin fecha";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Sin fecha";

  return dateFormatter.format(parsedDate);
};

const formatIpAddress = (value?: string | null) => value || "Sin IP registrada";

export default function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [submitting, setSubmitting] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [registeredTrainer, setRegisteredTrainer] =
    useState<RegisteredTrainerData | null>(null);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const result = await getAdminUsers();
      setUsers(result);
    } catch (error) {
      console.error("LOAD USERS ERROR:", error);
      setUsersError("No se pudo cargar la lista de usuarios.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === "todos" || user.role === roleFilter;
      const matchesQuery =
        !normalizedQuery ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        roleLabels[user.role].toLowerCase().includes(normalizedQuery) ||
        formatIpAddress(user.lastIpAddress).toLowerCase().includes(normalizedQuery);

      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  const {
    currentItems,
    page,
    rangeEnd,
    rangeStart,
    setPage,
    totalItems,
    totalPages,
  } = usePagination(filteredUsers, 8);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, setPage]);

  const totalClients = useMemo(
    () => users.filter((user) => user.role === "cliente").length,
    [users],
  );
  const totalTrainers = useMemo(
    () => users.filter((user) => user.role === "entrenador").length,
    [users],
  );
  const totalPendingPasswordChange = useMemo(
    () => users.filter((user) => user.mustChangePassword).length,
    [users],
  );
  const totalUnverified = useMemo(
    () => users.filter((user) => !user.isVerified).length,
    [users],
  );
  const totalAttentionRequired = useMemo(
    () =>
      users.filter((user) => user.mustChangePassword || !user.isVerified).length,
    [users],
  );

  const handleRegisterTrainer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");
    setRegisteredTrainer(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data } = await API.post("/admin/users/register-trainer", {
        email: normalizedEmail,
      });

      setRegisteredTrainer({
        email: data.email,
        generatedPassword: data.generatedPassword,
      });
      setSuccessMessage(
        "Entrenador registrado correctamente. La lista ya fue actualizada.",
      );
      setEmail("");
      await loadUsers();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          String(
            error.response?.data?.error ||
              "No se pudo registrar al entrenador.",
          ),
        );
      } else {
        setActionError("No se pudo registrar al entrenador.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!registeredTrainer?.generatedPassword) return;

    try {
      await navigator.clipboard.writeText(registeredTrainer.generatedPassword);
      setSuccessMessage("Contrasena temporal copiada al portapapeles.");
      setActionError("");
    } catch {
      setActionError("No se pudo copiar la contrasena automaticamente.");
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Usuarios admin</span>
          <h1 className={styles.heroTitle}>Usuarios</h1>
          <p className={styles.heroText}>
            Administra altas de entrenadores y revisa clientes y entrenadores
            con la misma experiencia visual y operativa del panel de productos.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void loadUsers()}
            disabled={usersLoading}
          >
            <FaSyncAlt />
            {usersLoading ? "Actualizando..." : "Actualizar lista"}
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaUsers />
          </span>
          <div>
            <span className={styles.statLabel}>Total</span>
            <strong className={styles.statValue}>{users.length}</strong>
          </div>
          <p className={styles.statHint}>
            Clientes y entrenadores registrados actualmente.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaUser />
          </span>
          <div>
            <span className={styles.statLabel}>Clientes</span>
            <strong className={styles.statValue}>{totalClients}</strong>
          </div>
          <p className={styles.statHint}>
            Usuarios con acceso habilitado al portal de cliente.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaUserTie />
          </span>
          <div>
            <span className={styles.statLabel}>Entrenadores</span>
            <strong className={styles.statValue}>{totalTrainers}</strong>
          </div>
          <p className={styles.statHint}>
            Cuentas habilitadas para el portal de entrenador.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaExclamationCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Pendientes</span>
            <strong className={styles.statValue}>{totalAttentionRequired}</strong>
          </div>
          <p className={styles.statHint}>
            {totalPendingPasswordChange} con cambio de clave pendiente y{" "}
            {totalUnverified} sin verificar.
          </p>
        </article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelEyebrow}>Alta controlada</span>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <FaUserPlus />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Registrar entrenador</h2>
                <p className={styles.panelSubtitle}>
                  El administrador captura el correo y el sistema genera una
                  contrasena temporal para el primer acceso.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.registerBody}>
          <div className={styles.registerContent}>
            <form onSubmit={handleRegisterTrainer} className={styles.formGrid}>
              <label className={styles.filterGroup}>
                <span className={styles.filterLabel}>Correo del entrenador</span>
                <input
                  className={styles.filterInput}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="entrenador@correo.com"
                  required
                />
              </label>

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={submitting}
              >
                <FaUserPlus />
                {submitting ? "Registrando..." : "Registrar entrenador"}
              </button>
            </form>

            {actionError ? (
              <div className={`${styles.feedback} ${styles.feedbackError}`}>
                {actionError}
              </div>
            ) : null}

            {successMessage ? (
              <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>
                {successMessage}
              </div>
            ) : null}

            {registeredTrainer ? (
              <div className={styles.credentialsCard}>
                <div className={styles.credentialsHeader}>
                  <span className={styles.panelEyebrow}>Credenciales temporales</span>
                  <h3 className={styles.credentialsTitle}>
                    Entrenador listo para ingresar
                  </h3>
                </div>

                <div className={styles.credentialsGrid}>
                  <div className={styles.credentialField}>
                    <span className={styles.filterLabel}>Correo</span>
                    <strong>{registeredTrainer.email}</strong>
                  </div>

                  <div className={styles.credentialField}>
                    <span className={styles.filterLabel}>Contrasena temporal</span>
                    <strong>{registeredTrainer.generatedPassword}</strong>
                  </div>
                </div>

                <div className={styles.credentialsActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleCopyPassword}
                  >
                    <FaCopy />
                    Copiar contrasena
                  </button>
                  <p className={styles.helper}>
                    Compartela por un canal seguro. El sistema pedira
                    reemplazarla en el primer acceso.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <aside className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Flujo esperado</h3>
            <ol className={styles.steps}>
              <li>El administrador captura el correo que comparte el entrenador.</li>
              <li>El sistema genera una contrasena temporal con la politica actual.</li>
              <li>El administrador entrega esa contrasena por un canal seguro.</li>
              <li>En el primer login, el entrenador debe cambiarla antes de entrar.</li>
            </ol>
          </aside>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelEyebrow}>Comunidad visible</span>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <FaUsers />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Usuarios registrados</h2>
                <p className={styles.panelSubtitle}>
                  Busca por correo, rol o IP y navega la tabla con la misma
                  paginacion del resto del panel admin.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por correo, rol o direccion IP"
            />
          </label>

          <div className={styles.filters}>
            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Rol</span>
              <select
                className={styles.filterSelect}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="cliente">Clientes</option>
                <option value="entrenador">Entrenadores</option>
              </select>
            </label>
          </div>
        </div>

        {usersError ? (
          <div className={styles.panelMessages}>
            <div className={`${styles.feedback} ${styles.feedbackError}`}>
              {usersError}
            </div>
          </div>
        ) : null}

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>IP del dispositivo</th>
                <th>Estado</th>
                <th>Fecha de alta</th>
              </tr>
            </thead>

            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.nameBlock}>
                        <span className={styles.primaryText}>{user.email}</span>
                        <span className={styles.secondaryText}>
                          ID {user.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.badge} ${user.role === "entrenador" ? styles.accentBadge : styles.blueBadge}`}
                      >
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td>
                      <div className={styles.nameBlock}>
                        <span className={styles.primaryText}>
                          {formatIpAddress(user.lastIpAddress)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.subtleRow}>
                        <span
                          className={`${styles.statusPill} ${user.isVerified ? styles.statusOn : styles.statusOff}`}
                        >
                          {user.isVerified ? "Verificado" : "Sin verificar"}
                        </span>

                        {user.mustChangePassword ? (
                          <span className={`${styles.badge} ${styles.warningBadge}`}>
                            Cambio de clave pendiente
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No hay usuarios que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.panelFooter}>
          <AdminPagination
            itemLabel="usuarios"
            onPageChange={setPage}
            page={page}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      </section>
    </section>
  );
}
