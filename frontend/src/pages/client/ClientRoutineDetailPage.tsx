import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaClock,
  FaDumbbell,
  FaLayerGroup,
  FaLock,
  FaRedo,
  FaUserShield,
} from "react-icons/fa";
import {
  getClientRoutineById,
  type ClientRoutine,
} from "../../services/clientRoutineService";
import styles from "./ClientPages.module.css";

type MembershipBlockedState = {
  blocked: boolean;
  message: string;
};

function getLevelLabel(level?: string) {
  switch (level) {
    case "principiante":
      return "Principiante";
    case "intermedio":
      return "Intermedio";
    case "avanzado":
      return "Avanzado";
    default:
      return level || "General";
  }
}

function getCategoryLabel(category?: string) {
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
      return category || "Entrenamiento";
  }
}

function formatRest(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "Sin descanso";
  if (seconds < 60) return `${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} seg` : `${minutes} min`;
}

export default function ClientRoutineDetailPage() {
  const { id } = useParams();
  const [routine, setRoutine] = useState<ClientRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<MembershipBlockedState>({
    blocked: false,
    message: "",
  });

  async function loadRoutine() {
    if (!id) return;

    setLoading(true);
    setBlocked({
      blocked: false,
      message: "",
    });

    try {
      const response = await getClientRoutineById(id);
      setRoutine(response.routine ?? null);
    } catch (error) {
      console.error("CLIENT ROUTINE DETAIL ERROR:", error);

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response?.data?.code === "MEMBERSHIP_REQUIRED"
      ) {
        setBlocked({
          blocked: true,
          message:
            error.response.data.error ||
            "Necesitas una membresía activa para acceder a esta rutina.",
        });
        setRoutine(null);
        return;
      }

      setRoutine(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoutine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const exercisesByDay = useMemo(() => {
    const grouped: Record<string, NonNullable<ClientRoutine["exercises"]>> = {};

    for (const exercise of routine?.exercises ?? []) {
      const key = String(exercise.dayNumber ?? 1);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(exercise);
    }

    return Object.entries(grouped)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([day, exercises]) => ({
        day,
        exercises: exercises.sort(
          (left, right) => Number(left.order ?? 0) - Number(right.order ?? 0)
        ),
      }));
  }, [routine]);

  if (blocked.blocked) {
    return (
      <section className={styles.clientPage}>
        <header className={styles.clientHero}>
          <div>
            <span className={styles.clientEyebrow}>Rutina bloqueada</span>
            <h1>Necesitas una membresía activa</h1>
            <p>{blocked.message}</p>
          </div>

          <span className={styles.heroIconDanger}>
            <FaLock />
          </span>
        </header>

        <section className={styles.panelCard}>
          <h2>Acceso restringido</h2>
          <p>
            Activa una membresía individual o entra a un paquete aprobado para
            desbloquear los detalles de la rutina.
          </p>

          <div className={styles.quickGrid}>
            <Link to="/cliente/suscripcion" className={styles.quickCard}>
              <FaUserShield />
              <div>
                <strong>Ver mi membresía</strong>
                <span>Consulta tu estado y vigencia.</span>
              </div>
            </Link>

            <Link to="/cliente/rutinas" className={styles.quickCard}>
              <FaArrowLeft />
              <div>
                <strong>Volver</strong>
                <span>Regresar al listado de rutinas.</span>
              </div>
            </Link>
          </div>
        </section>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={styles.clientPage}>
        <div className={styles.emptyStateCard}>Cargando rutina...</div>
      </section>
    );
  }

  if (!routine) {
    return (
      <section className={styles.clientPage}>
        <section className={styles.panelCard}>
          <h2>Rutina no encontrada</h2>
          <p>La rutina no existe o todavía no está publicada.</p>

          <Link to="/cliente/rutinas" className={styles.heroActionBtn}>
            <FaArrowLeft />
            Volver a rutinas
          </Link>
        </section>
      </section>
    );
  }

  return (
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>
            {getCategoryLabel(routine.category)}
          </span>
          <h1>{routine.title}</h1>
          <p>
            {routine.objective ||
              routine.description ||
              "Rutina publicada por un entrenador Titanium."}
          </p>
        </div>

        <Link to="/cliente/rutinas" className={styles.heroActionBtn}>
          <FaArrowLeft />
          Volver
        </Link>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaLayerGroup />
          </span>
          <div>
            <p>Nivel</p>
            <strong>{getLevelLabel(routine.level)}</strong>
            <span>Intensidad sugerida.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaClock />
          </span>
          <div>
            <p>Duración</p>
            <strong>{routine.durationWeeks} semanas</strong>
            <span>{routine.daysPerWeek} días por semana.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaDumbbell />
          </span>
          <div>
            <p>Tiempo estimado</p>
            <strong>{routine.estimatedMinutes} min</strong>
            <span>Por sesión aproximadamente.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaRedo />
          </span>
          <div>
            <p>Ejercicios</p>
            <strong>{routine.exercises?.length ?? 0}</strong>
            <span>Organizados por día.</span>
          </div>
        </article>
      </div>

      {routine.imageUrl ? (
        <section className={styles.panelCard}>
          <img
            src={routine.imageUrl}
            alt={routine.title}
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: 24,
            }}
          />
        </section>
      ) : null}

      {routine.videoUrl ? (
        <section className={styles.panelCard}>
          <h2>Video de apoyo</h2>
          <p>Material complementario de la rutina.</p>

          <a
            href={routine.videoUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.heroActionBtn}
          >
            Abrir video
          </a>
        </section>
      ) : null}

      <section className={styles.panelCard}>
        <h2>Descripción</h2>
        <p>{routine.description || "Sin descripción adicional."}</p>
      </section>

      <section className={styles.panelCard}>
        <h2>Ejercicios por día</h2>
        <p>Realiza los ejercicios respetando técnica, series y descansos.</p>

        {exercisesByDay.length > 0 ? (
          <div className={styles.cardGrid}>
            {exercisesByDay.map((group) => (
              <article key={group.day} className={styles.featureCard}>
                <span>Día {group.day}</span>
                <h3>Entrenamiento del día</h3>

                <div className={styles.detailList}>
                  {group.exercises.map((exercise) => (
                    <div key={exercise.id}>
                      <span>{exercise.name}</span>
                      <strong>
                        {exercise.sets ?? "-"} series x {exercise.reps ?? "-"}
                      </strong>
                      <p>
                        Descanso: {formatRest(exercise.restSeconds)}
                        {exercise.notes ? ` · ${exercise.notes}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            Esta rutina todavía no tiene ejercicios registrados.
          </div>
        )}
      </section>
    </section>
  );
}