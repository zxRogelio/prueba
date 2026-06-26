import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaClock,
  FaDumbbell,
  FaFilter,
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
      return "Principiante";
    case "intermediate":
      return "Intermedio";
    case "advanced":
      return "Avanzado";
    default:
      return level || "General";
  }
}

function getCategoryLabel(category?: string) {
  switch (category) {
    case "strength":
      return "Fuerza";
    case "cardio":
      return "Cardio";
    case "mobility":
      return "Movilidad";
    case "hypertrophy":
      return "Hipertrofia";
    case "weight_loss":
      return "Pérdida de peso";
    default:
      return category || "Entrenamiento";
  }
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
            "Necesitas una membresía activa para acceder a las rutinas.",
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
      { value: "strength", label: "Fuerza" },
      { value: "cardio", label: "Cardio" },
      { value: "mobility", label: "Movilidad" },
      { value: "hypertrophy", label: "Hipertrofia" },
      { value: "weight_loss", label: "Pérdida de peso" },
    ],
    []
  );

  const levels = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "beginner", label: "Principiante" },
      { value: "intermediate", label: "Intermedio" },
      { value: "advanced", label: "Avanzado" },
    ],
    []
  );

  if (blocked.blocked) {
    return (
      <section className={styles.clientPage}>
        <header className={styles.clientHero}>
          <div>
            <span className={styles.clientEyebrow}>Rutinas bloqueadas</span>
            <h1>Necesitas una membresía activa</h1>
            <p>
              Las rutinas del gimnasio solo están disponibles para clientes con
              membresía activa.
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
              <strong>Membresía requerida</strong>
              <p>
                Activa una membresía individual o entra a un paquete grupal
                aprobado para desbloquear esta sección.
              </p>
            </div>
          </div>

          <div className={styles.quickGrid}>
            <Link to="/cliente/suscripcion" className={styles.quickCard}>
              <FaUserShield />
              <div>
                <strong>Ver mi membresía</strong>
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
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>Entrenamiento</span>
          <h1>Rutinas disponibles</h1>
          <p>
            Consulta las rutinas publicadas por los entrenadores. Esta sección
            solo se desbloquea cuando tienes una membresía activa.
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

      <section className={styles.panelCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Explorar rutinas</h2>
            <p>Filtra por objetivo, categoría o nivel.</p>
          </div>
        </div>

        <div className={styles.formStack}>
          <label>
            Buscar
            <div className={styles.searchBox}>
              <FaSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, objetivo o descripción..."
              />
            </div>
          </label>

          <label>
            Categoría
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

          <label>
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
            className={styles.heroActionBtn}
            onClick={() => void loadRoutines()}
            disabled={loading}
          >
            <FaFilter />
            Aplicar filtros
          </button>
        </div>
      </section>

      <section className={styles.panelCard}>
        <h2>Rutinas publicadas</h2>
        <p>Solo se muestran rutinas con estado publicado.</p>

        {loading ? (
          <div className={styles.emptyStateCard}>Cargando rutinas...</div>
        ) : routines.length > 0 ? (
          <div className={styles.cardGrid}>
            {routines.map((routine) => (
              <article key={routine.id} className={styles.featureCard}>
                {routine.imageUrl ? (
                  <img
                    src={routine.imageUrl}
                    alt={routine.title}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      borderRadius: 18,
                      marginBottom: 16,
                    }}
                  />
                ) : null}

                <span>{getCategoryLabel(routine.category)}</span>
                <h3>{routine.title}</h3>

                <p>
                  {routine.objective ||
                    routine.description ||
                    "Rutina publicada por el entrenador."}
                </p>

                <div className={styles.detailList}>
                  <div>
                    <span>Nivel</span>
                    <strong>{getLevelLabel(routine.level)}</strong>
                  </div>

                  <div>
                    <span>Duración</span>
                    <strong>
                      <FaClock /> {routine.estimatedMinutes
  ? `${routine.estimatedMinutes} min`
  : routine.durationWeeks
  ? `${routine.durationWeeks} semanas`
  : "No especificada"}
                    </strong>
                  </div>

                  <div>
                    <span>Entrenador</span>
                    <strong>
                      {routine.trainer?.name ||
                        routine.trainer?.email ||
                        "Entrenador Titanium"}
                    </strong>
                  </div>
                </div>

                <Link
                  to={`/cliente/rutinas/${routine.id}`}
                  className={styles.heroActionBtn}
                >
                  <FaDumbbell />
                  Ver rutina
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            No hay rutinas publicadas por ahora.
          </div>
        )}
      </section>
    </section>
  );
}