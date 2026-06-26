import { useEffect, useMemo, useState } from "react";
import {
  FaArchive,
  FaCheckCircle,
  FaClock,
  FaDumbbell,
  FaSearch,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";
import {
  approveAdminRoutine,
  archiveAdminRoutine,
  getAdminRoutines,
  rejectAdminRoutine,
  type AdminRoutine,
} from "../../services/admin/adminRoutineService";
import styles from "./AdminSuscripcionesPage.module.css";

function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Borrador";
    case "pending_review":
      return "Pendiente de revisión";
    case "published":
      return "Publicada";
    case "archived":
      return "Archivada";
    case "rejected":
      return "Rechazada";
    default:
      return status;
  }
}

function getLevelLabel(level: string) {
  switch (level) {
    case "principiante":
      return "Principiante";
    case "intermedio":
      return "Intermedio";
    case "avanzado":
      return "Avanzado";
    default:
      return level;
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case "fuerza":
      return "Fuerza";
    case "hipertrofia":
      return "Hipertrofia";
    case "perdida_peso":
      return "Pérdida de peso";
    case "resistencia":
      return "Resistencia";
    case "movilidad":
      return "Movilidad";
    case "general":
      return "General";
    default:
      return category;
  }
}

export default function AdminRoutinesPage() {
  const [routines, setRoutines] = useState<AdminRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [status, setStatus] = useState("pending_review");
  const [search, setSearch] = useState("");

  async function loadRoutines() {
    setLoading(true);

    try {
      const response = await getAdminRoutines({
        status,
        search: search.trim() || undefined,
      });

      setRoutines(response.routines ?? []);
    } catch (error) {
      console.error("ADMIN ROUTINES ERROR:", error);
      setRoutines([]);
      window.alert("No se pudieron cargar las rutinas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () => routines.filter((routine) => routine.status === "pending_review").length,
    [routines]
  );

  const publishedCount = useMemo(
    () => routines.filter((routine) => routine.status === "published").length,
    [routines]
  );

  async function handleApprove(id: string) {
    const confirmed = window.confirm("¿Aprobar y publicar esta rutina?");

    if (!confirmed) return;

    setWorkingId(id);

    try {
      await approveAdminRoutine(id);
      window.alert("Rutina aprobada correctamente.");
      await loadRoutines();
    } catch (error) {
      console.error("APPROVE ROUTINE ERROR:", error);
      window.alert("No se pudo aprobar la rutina.");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleReject(id: string) {
    const confirmed = window.confirm("¿Rechazar esta rutina?");

    if (!confirmed) return;

    setWorkingId(id);

    try {
      await rejectAdminRoutine(id);
      window.alert("Rutina rechazada correctamente.");
      await loadRoutines();
    } catch (error) {
      console.error("REJECT ROUTINE ERROR:", error);
      window.alert("No se pudo rechazar la rutina.");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleArchive(id: string) {
    const confirmed = window.confirm("¿Archivar esta rutina?");

    if (!confirmed) return;

    setWorkingId(id);

    try {
      await archiveAdminRoutine(id);
      window.alert("Rutina archivada correctamente.");
      await loadRoutines();
    } catch (error) {
      console.error("ARCHIVE ROUTINE ERROR:", error);
      window.alert("No se pudo archivar la rutina.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className={styles.pageShell}>
      <header className={styles.heroSection}>
        <div>
          <span className={styles.heroEyebrow}>Revisión de contenidos</span>
          <h1 className={styles.heroTitle}>Rutinas de entrenadores</h1>
          <p className={styles.heroText}>
            Aquí el administrador revisa las rutinas enviadas por entrenadores.
            Solo las aprobadas se publican para clientes con membresía activa.
          </p>
        </div>

        <button
          type="button"
          className={styles.heroActionBtn}
          onClick={() => void loadRoutines()}
          disabled={loading}
        >
          <FaSyncAlt />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaClock />
          </span>
          <div>
            <p className={styles.statLabel}>Pendientes</p>
            <strong className={styles.statValue}>{pendingCount}</strong>
            <span className={styles.statHint}>Rutinas esperando revisión.</span>
          </div>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <p className={styles.statLabel}>Publicadas</p>
            <strong className={styles.statValue}>{publishedCount}</strong>
            <span className={styles.statHint}>Visibles para clientes activos.</span>
          </div>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaDumbbell />
          </span>
          <div>
            <p className={styles.statLabel}>Total en vista</p>
            <strong className={styles.statValue}>{routines.length}</strong>
            <span className={styles.statHint}>Resultado del filtro actual.</span>
          </div>
        </article>
      </div>

      <section className={styles.panelCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.detailEyebrow}>Filtros</span>
            <h2 className={styles.detailTitle}>Buscar rutinas</h2>
            <p className={styles.sectionText}>
              Cambia el estado para ver pendientes, publicadas o rechazadas.
            </p>
          </div>

          <div className={styles.formStack}>
            <label>
              Estado
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="pending_review">Pendientes</option>
                <option value="published">Publicadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="archived">Archivadas</option>
                <option value="draft">Borradores</option>
                <option value="all">Todas</option>
              </select>
            </label>

            <label className={styles.searchBox}>
              <FaSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rutina..."
              />
            </label>

            <button
              type="button"
              className={styles.inlinePrimaryBtn}
              onClick={() => void loadRoutines()}
              disabled={loading}
            >
              <FaSearch />
              Buscar
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panelCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.detailEyebrow}>Listado</span>
            <h2 className={styles.detailTitle}>Rutinas encontradas</h2>
            <p className={styles.sectionText}>
              Revisa ejercicios, duración, categoría y entrenador.
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyStateCard}>Cargando rutinas...</div>
        ) : routines.length > 0 ? (
          <div className={styles.cardStack}>
            {routines.map((routine) => (
              <article key={routine.id} className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <span className={styles.detailEyebrow}>
                      {getStatusLabel(routine.status)}
                    </span>
                    <h3 className={styles.detailTitle}>{routine.title}</h3>
                    <p className={styles.sectionText}>
                      {routine.objective ||
                        routine.description ||
                        "Sin descripción"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {routine.status === "pending_review" && (
                      <>
                        <button
                          type="button"
                          className={styles.inlinePrimaryBtn}
                          disabled={workingId === routine.id}
                          onClick={() => void handleApprove(routine.id)}
                        >
                          <FaCheckCircle />
                          Aprobar
                        </button>

                        <button
                          type="button"
                          className={styles.inlinePrimaryBtn}
                          disabled={workingId === routine.id}
                          onClick={() => void handleReject(routine.id)}
                        >
                          <FaTimesCircle />
                          Rechazar
                        </button>
                      </>
                    )}

                    {routine.status === "published" && (
                      <button
                        type="button"
                        className={styles.inlinePrimaryBtn}
                        disabled={workingId === routine.id}
                        onClick={() => void handleArchive(routine.id)}
                      >
                        <FaArchive />
                        Archivar
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.miniStatCard}>
                    <span>Entrenador</span>
                    <strong>
                      {routine.trainerEmail ||
                        routine.trainer?.email ||
                        "Entrenador"}
                    </strong>
                  </div>

                  <div className={styles.miniStatCard}>
                    <span>Categoría</span>
                    <strong>{getCategoryLabel(routine.category)}</strong>
                  </div>

                  <div className={styles.miniStatCard}>
                    <span>Nivel</span>
                    <strong>{getLevelLabel(routine.level)}</strong>
                  </div>

                  <div className={styles.miniStatCard}>
                    <span>Duración</span>
                    <strong>
                      {routine.durationWeeks} semanas / {routine.daysPerWeek} días
                    </strong>
                  </div>

                  <div className={styles.miniStatCard}>
                    <span>Tiempo</span>
                    <strong>{routine.estimatedMinutes} min</strong>
                  </div>

                  <div className={styles.miniStatCard}>
                    <span>Ejercicios</span>
                    <strong>{routine.exercises?.length ?? 0}</strong>
                  </div>
                </div>

                {routine.exercises && routine.exercises.length > 0 ? (
                  <div className={styles.memberList}>
                    {routine.exercises.slice(0, 6).map((exercise) => (
                      <div key={exercise.id} className={styles.memberItem}>
                        <span>
                          Día {exercise.dayNumber}: {exercise.name}
                        </span>
                        <strong>
                          {exercise.sets ?? "-"} x {exercise.reps ?? "-"}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyStateCard}>
                    Esta rutina no tiene ejercicios registrados.
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            No hay rutinas con este filtro.
          </div>
        )}
      </section>
    </section>
  );
}