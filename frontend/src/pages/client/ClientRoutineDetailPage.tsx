import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaClock,
  FaDumbbell,
  FaLayerGroup,
  FaListOl,
  FaLock,
  FaPlay,
  FaRedo,
  FaTimes,
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
    case "hypertrophy":
    case "hipertrofia":
      return "Hipertrofia";
    case "weight_loss":
    case "perdida_peso":
      return "Perdida de peso";
    case "cardio":
    case "resistencia":
      return "Resistencia";
    case "mobility":
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

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    }

    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
      if (parsed.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${parsed.pathname.split("/")[2]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getVimeoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (!host.includes("vimeo.com")) return null;

    const videoId = parsed.pathname.split("/").filter(Boolean)[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  } catch {
    return null;
  }
}

function getVideoSource(routine: ClientRoutine) {
  if (!routine.videoUrl) return null;

  const youtubeUrl = getYouTubeEmbedUrl(routine.videoUrl);
  if (youtubeUrl) return { type: "embed" as const, url: youtubeUrl };

  const vimeoUrl = getVimeoEmbedUrl(routine.videoUrl);
  if (vimeoUrl) return { type: "embed" as const, url: vimeoUrl };

  const isUpload =
    routine.videoType === "upload" ||
    routine.videoUrl.includes("/video/upload/") ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(routine.videoUrl);

  return {
    type: isUpload ? ("video" as const) : ("embed" as const),
    url: routine.videoUrl,
  };
}

export default function ClientRoutineDetailPage() {
  const { id } = useParams();
  const [routine, setRoutine] = useState<ClientRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoOpen, setVideoOpen] = useState(false);
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
            "Necesitas una membresia activa para acceder a esta rutina.",
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

  useEffect(() => {
    if (!videoOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVideoOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [videoOpen]);

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

  const videoSource = routine ? getVideoSource(routine) : null;

  if (blocked.blocked) {
    return (
      <section className={styles.clientPage}>
        <header className={styles.clientHero}>
          <div>
            <span className={styles.clientEyebrow}>Rutina bloqueada</span>
            <h1>Necesitas una membresia activa</h1>
            <p>{blocked.message}</p>
          </div>

          <span className={styles.heroIconDanger}>
            <FaLock />
          </span>
        </header>

        <section className={styles.panelCard}>
          <h2>Acceso restringido</h2>
          <p>
            Activa una membresia individual o entra a un paquete aprobado para
            desbloquear los detalles de la rutina.
          </p>

          <div className={styles.quickGrid}>
            <Link to="/cliente/suscripcion" className={styles.quickCard}>
              <FaUserShield />
              <div>
                <strong>Ver mi membresia</strong>
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
        <div className={styles.routineEmpty}>Cargando rutina...</div>
      </section>
    );
  }

  if (!routine) {
    return (
      <section className={styles.clientPage}>
        <section className={styles.panelCard}>
          <h2>Rutina no encontrada</h2>
          <p>La rutina no existe o todavia no esta publicada.</p>

          <Link to="/cliente/rutinas" className={styles.routinePrimaryLink}>
            <FaArrowLeft />
            Volver a rutinas
          </Link>
        </section>
      </section>
    );
  }

  return (
    <section className={`${styles.clientPage} ${styles.routineDetailPage}`}>
      <header className={styles.routineDetailHero}>
        <div className={styles.routineDetailHeroCopy}>
          <span className={styles.routineEyebrow}>
            {getCategoryLabel(routine.category)}
          </span>
          <h1>{routine.title}</h1>
          <p>
            {routine.objective ||
              routine.description ||
              "Rutina publicada por un entrenador Titanium."}
          </p>

          <div className={styles.routineDetailActions}>
            <Link to="/cliente/rutinas" className={styles.routineBackLink}>
              <FaArrowLeft />
              Volver
            </Link>

            {videoSource ? (
              <button
                type="button"
                className={styles.routineVideoBtn}
                onClick={() => setVideoOpen(true)}
              >
                <FaPlay />
                Ver video
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.routineDetailHeroMedia}>
          {routine.imageUrl ? (
            <img src={routine.imageUrl} alt={routine.title} />
          ) : (
            <div className={styles.routineMediaFallback}>
              <FaDumbbell />
            </div>
          )}
        </div>
      </header>

      <div className={styles.routineDetailStats}>
        <article>
          <span>
            <FaLayerGroup />
          </span>
          <div>
            <p>Nivel</p>
            <strong>{getLevelLabel(routine.level)}</strong>
            <small>Intensidad sugerida.</small>
          </div>
        </article>

        <article>
          <span>
            <FaClock />
          </span>
          <div>
            <p>Duracion</p>
            <strong>{routine.durationWeeks ?? "-"} semanas</strong>
            <small>{routine.daysPerWeek ?? "-"} dias por semana.</small>
          </div>
        </article>

        <article>
          <span>
            <FaDumbbell />
          </span>
          <div>
            <p>Tiempo estimado</p>
            <strong>{routine.estimatedMinutes ?? "-"} min</strong>
            <small>Por sesion aproximadamente.</small>
          </div>
        </article>

        <article>
          <span>
            <FaRedo />
          </span>
          <div>
            <p>Ejercicios</p>
            <strong>{routine.exercises?.length ?? 0}</strong>
            <small>Organizados por dia.</small>
          </div>
        </article>
      </div>

      <div className={styles.routineDetailGrid}>
        <section className={styles.routineInfoPanel}>
          <div className={styles.routinePanelHeader}>
            <span>
              <FaListOl />
            </span>
            <div>
              <h2>Descripcion</h2>
              <p>{routine.description || "Sin descripcion adicional."}</p>
            </div>
          </div>
        </section>

        {videoSource ? (
          <section className={styles.routineVideoPanel}>
            <div>
              <span>Video de apoyo</span>
              <h2>Material complementario</h2>
              <p>Reproduce el video dentro del portal sin salir del sitio.</p>
            </div>

            <button
              type="button"
              className={styles.routineVideoBtn}
              onClick={() => setVideoOpen(true)}
            >
              <FaPlay />
              Reproducir
            </button>
          </section>
        ) : null}
      </div>

      <section className={styles.routineExercisesPanel}>
        <div className={styles.routineResultsHeader}>
          <div>
            <h2>Ejercicios por dia</h2>
            <p>Realiza cada bloque respetando tecnica, series y descansos.</p>
          </div>
          <span>{exercisesByDay.length} dias</span>
        </div>

        {exercisesByDay.length > 0 ? (
          <div className={styles.routineExerciseGrid}>
            {exercisesByDay.map((group) => (
              <article key={group.day} className={styles.routineDayCard}>
                <div className={styles.routineDayHeader}>
                  <span>Dia {group.day}</span>
                  <strong>{group.exercises.length} ejercicios</strong>
                </div>

                <div className={styles.routineExerciseList}>
                  {group.exercises.map((exercise) => (
                    <div key={exercise.id} className={styles.routineExerciseItem}>
                      <div>
                        <span>{exercise.name}</span>
                        {exercise.description ? <p>{exercise.description}</p> : null}
                      </div>

                      <div className={styles.routineExerciseMeta}>
                        <strong>
                          {exercise.sets ?? "-"} x {exercise.reps ?? "-"}
                        </strong>
                        <small>{formatRest(exercise.restSeconds)}</small>
                      </div>

                      {exercise.notes ? (
                        <p className={styles.routineExerciseNote}>
                          {exercise.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.routineEmpty}>
            Esta rutina todavia no tiene ejercicios registrados.
          </div>
        )}
      </section>

      {videoOpen && videoSource ? (
        <div
          className={styles.routineVideoOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Video de rutina"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVideoOpen(false);
          }}
        >
          <div className={styles.routineVideoModal}>
            <div className={styles.routineVideoModalHeader}>
              <div>
                <span>Video de apoyo</span>
                <h2>{routine.title}</h2>
              </div>

              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                aria-label="Cerrar video"
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.routineVideoFrame}>
              {videoSource.type === "video" ? (
                <video src={videoSource.url} controls autoPlay />
              ) : (
                <iframe
                  src={videoSource.url}
                  title={`Video de ${routine.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
