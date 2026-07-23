import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaClock,
  FaDumbbell,
  FaFilter,
  FaLayerGroup,
  FaLock,
  FaSearch,
  FaSyncAlt,
  FaUserShield,
} from "react-icons/fa";
import {
  getClientRoutines,
  type ClientRoutine,
} from "../../services/clientRoutineService";
import styles from "./ClientPages.module.css";

type MembershipBlockedState = {
  blocked: boolean;
  message: string;
};

function getLevelLabel(level?: string) {
  switch (level) {
    case "beginner":
    case "principiante":
      return "Principiante";
    case "intermediate":
    case "intermedio":
      return "Intermedio";
    case "advanced":
    case "avanzado":
      return "Avanzado";
    default:
      return level || "General";
  }
}

function getCategoryLabel(category?: string) {
  switch (category) {
    case "strength":
    case "fuerza":
      return "Fuerza";
    case "cardio":
    case "resistencia":
      return "Resistencia";
    case "mobility":
    case "movilidad":
      return "Movilidad";
    case "hypertrophy":
    case "hipertrofia":
      return "Hipertrofia";
    case "weight_loss":
    case "perdida_peso":
      return "Perdida de peso";
    case "general":
      return "General";
    default:
      return category || "Entrenamiento";
  }
}

function getRoutineDuration(routine: ClientRoutine) {
  if (routine.estimatedMinutes) return `${routine.estimatedMinutes} min`;
  if (routine.durationWeeks) return `${routine.durationWeeks} semanas`;
  return "No especificada";
}

function getRoutineFrequency(routine: ClientRoutine) {
  if (routine.daysPerWeek) return `${routine.daysPerWeek} dias`;
  return "Flexible";
}

export default function ClientRoutinesPage() {
  const [routines, setRoutines] = useState<ClientRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<MembershipBlockedState>({
    blocked: false,
    message: "",
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");

  async function loadRoutines() {
    setLoading(true);
    setBlocked({
      blocked: false,
      message: "",
    });

    try {
      const response = await getClientRoutines({
        search: search.trim() || undefined,
        category: category || undefined,
        level: level || undefined,
      });

      setRoutines(response.routines ?? []);
    } catch (error) {
      console.error("CLIENT ROUTINES ERROR:", error);

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response?.data?.code === "MEMBERSHIP_REQUIRED"
      ) {
        setBlocked({
          blocked: true,
          message:
            error.response.data.error ||
            "Necesitas una membresia activa para acceder a las rutinas.",
        });
        setRoutines([]);
        return;
      }

      setRoutines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(
    () => [
      { value: "", label: "Todas" },
      { value: "general", label: "General" },
      { value: "fuerza", label: "Fuerza" },
      { value: "hipertrofia", label: "Hipertrofia" },
      { value: "perdida_peso", label: "Perdida de peso" },
      { value: "resistencia", label: "Resistencia" },
      { value: "movilidad", label: "Movilidad" },
    ],
    []
  );

  const levels = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "principiante", label: "Principiante" },
      { value: "intermedio", label: "Intermedio" },
      { value: "avanzado", label: "Avanzado" },
    ],
    []
  );

  const activeFilterCount = [search.trim(), category, level].filter(Boolean).length;

  if (blocked.blocked) {
    return (
      <section className={styles.clientPage}>
        <header className={styles.clientHero}>
          <div>
            <span className={styles.clientEyebrow}>Rutinas bloqueadas</span>
            <h1>Necesitas una membresia activa</h1>
            <p>
              Las rutinas del gimnasio solo estan disponibles para clientes con
              membresia activa.
            </p>
          </div>

          <span className={styles.heroIconDanger}>
            <FaLock />
          </span>
        </header>

        <section className={styles.panelCard}>
          <h2>Acceso restringido</h2>
          <p>{blocked.message}</p>

          <div className={styles.statusBanner}>
            <div>
              <span>Estado</span>
              <strong>Membresia requerida</strong>
              <p>
                Activa una membresia individual o entra a un paquete grupal
                aprobado para desbloquear esta seccion.
              </p>
            </div>
          </div>

          <div className={styles.quickGrid}>
            <Link to="/cliente/suscripcion" className={styles.quickCard}>
              <FaUserShield />
              <div>
                <strong>Ver mi membresia</strong>
                <span>Consulta tu estado, vigencia y beneficios.</span>
              </div>
            </Link>

            <Link to="/cliente/pagos" className={styles.quickCard}>
              <FaDumbbell />
              <div>
                <strong>Revisar pagos</strong>
                <span>Consulta tus pagos y comprobantes registrados.</span>
              </div>
            </Link>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className={`${styles.clientPage} ${styles.routinesPage}`}>
      <header className={styles.routineHero}>
        <div className={styles.routineHeroContent}>
          <span className={styles.routineEyebrow}>Entrenamiento</span>
          <h1>Rutinas disponibles</h1>
          <p>
            Explora entrenamientos publicados por el equipo Titanium y filtra
            por categoria, nivel o palabra clave.
          </p>
        </div>

        <div className={styles.routineHeroPanel}>
          <div className={styles.routineStat}>
            <span>Rutinas</span>
            <strong>{loading ? "--" : routines.length}</strong>
          </div>
          <div className={styles.routineStat}>
            <span>Filtros</span>
            <strong>{activeFilterCount}</strong>
          </div>
          <button
            type="button"
            className={styles.routineRefreshBtn}
            onClick={() => void loadRoutines()}
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Cargando" : "Actualizar"}
          </button>
        </div>
      </header>

      <section className={styles.routineToolbar}>
        <div className={styles.routineToolbarHeader}>
          <div>
            <h2>Explorar rutinas</h2>
            <p>Busca por nombre, objetivo, categoria o nivel.</p>
          </div>
          <span>{activeFilterCount} filtros activos</span>
        </div>

        <div className={styles.routineFilterGrid}>
          <label className={styles.routineField}>
            Buscar
            <div className={styles.routineSearchBox}>
              <FaSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, objetivo o descripcion..."
              />
            </div>
          </label>

          <label className={styles.routineField}>
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.routineField}>
            Nivel
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {levels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={styles.routineFilterBtn}
            onClick={() => void loadRoutines()}
            disabled={loading}
          >
            <FaFilter />
            Filtrar
          </button>
        </div>
      </section>

      <section className={styles.routineSection}>
        <div className={styles.routineResultsHeader}>
          <div>
            <h2>Rutinas publicadas</h2>
            <p>Solo aparecen rutinas disponibles para clientes con membresia activa.</p>
          </div>
          <span>{loading ? "Cargando" : `${routines.length} resultados`}</span>
        </div>

        {loading ? (
          <div className={styles.routineEmpty}>Cargando rutinas...</div>
        ) : routines.length > 0 ? (
          <div className={styles.routineGrid}>
            {routines.map((routine) => (
              <article key={routine.id} className={styles.routineCard}>
                <div className={styles.routineMedia}>
                  {routine.imageUrl ? (
                    <img src={routine.imageUrl} alt={routine.title} />
                  ) : (
                    <div className={styles.routineMediaFallback}>
                      <FaDumbbell />
                    </div>
                  )}
                </div>

                <div className={styles.routineCardBody}>
                  <div className={styles.routineBadgeRow}>
                    <span>{getCategoryLabel(routine.category)}</span>
                    <span>{getLevelLabel(routine.level)}</span>
                  </div>

                  <h3>{routine.title}</h3>

                  <p>
                    {routine.objective ||
                      routine.description ||
                      "Rutina publicada por el entrenador."}
                  </p>

                  <div className={styles.routineMetaGrid}>
                    <div>
                      <FaClock />
                      <span>Duracion</span>
                      <strong>{getRoutineDuration(routine)}</strong>
                    </div>

                    <div>
                      <FaCalendarAlt />
                      <span>Semana</span>
                      <strong>{getRoutineFrequency(routine)}</strong>
                    </div>

                    <div>
                      <FaLayerGroup />
                      <span>Nivel</span>
                      <strong>{getLevelLabel(routine.level)}</strong>
                    </div>
                  </div>

                  <div className={styles.routineCardFooter}>
                    <span>
                      {routine.trainer?.name ||
                        routine.trainer?.email ||
                        "Entrenador Titanium"}
                    </span>

                    <Link
                      to={`/cliente/rutinas/${routine.id}`}
                      className={styles.routinePrimaryLink}
                    >
                      Ver rutina
                      <FaArrowRight />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.routineEmpty}>
            No hay rutinas publicadas por ahora.
          </div>
        )}
      </section>
    </section>
  );
}
