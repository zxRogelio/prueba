import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import axios from "axios";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image,
  Link as LinkIcon,
  ListChecks,
  Plus,
  Send,
  Trash2,
  UploadCloud,
  Video,
  XCircle,
} from "lucide-react";
import {
  createTrainerRoutine,
  updateTrainerRoutine,
  deleteTrainerRoutine,
  publishTrainerRoutine,
  archiveTrainerRoutine,
  getTrainerRoutines,
  uploadExerciseVideo,
  setExerciseVideoUrl,
  deleteExerciseVideo,
  type RoutineCategory,
  type RoutineExerciseDTO,
  type RoutineLevel,
  type RoutineStatus,
  type TrainerRoutineDTO,
} from "../../services/trainer/routineService";
import styles from "./TrainerRoutinesPage.module.css";

const emptyExercise = (order: number): RoutineExerciseDTO => ({
  id: undefined,
  name: "",
  description: "",
  dayNumber: 1,
  sets: 4,
  reps: "10",
  restSeconds: 60,
  notes: "",
  order,
  videoUrl: null,
  videoPublicId: null,
  videoType: "none",
  hasVideo: false,
});

type RoutineFormState = {
  title: string;
  objective: string;
  description: string;
  level: RoutineLevel;
  category: RoutineCategory;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedMinutes: number;
  status: RoutineStatus;
  exercises: RoutineExerciseDTO[];
};

const createDefaultForm = (): RoutineFormState => ({
  title: "",
  objective: "",
  description: "",
  level: "principiante" as RoutineLevel,
  category: "general" as RoutineCategory,
  durationWeeks: 4,
  daysPerWeek: 3,
  estimatedMinutes: 45,
  status: "draft" as RoutineStatus,
  exercises: [emptyExercise(0)] as RoutineExerciseDTO[],
});

const statusLabels: Record<RoutineStatus, string> = {
  draft: "Borrador",
  pending_review: "En revision",
  published: "Publicada",
  archived: "Archivada",
  rejected: "Rechazada",
};

const levelLabels: Record<RoutineLevel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const categoryLabels: Record<RoutineCategory, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Hipertrofia",
  perdida_peso: "Pérdida de peso",
  resistencia: "Resistencia",
  movilidad: "Movilidad",
  general: "General",
};

type VideoSource = {
  type: "video" | "embed" | "link";
  url: string;
};

const getYouTubeEmbedUrl = (url: string) => {
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
};

const getExerciseVideoSource = (
  exercise: Pick<RoutineExerciseDTO, "videoUrl" | "videoType">,
): VideoSource | null => {
  if (!exercise.videoUrl || exercise.videoType === "none") return null;

  const youtubeUrl = getYouTubeEmbedUrl(exercise.videoUrl);
  if (youtubeUrl) return { type: "embed", url: youtubeUrl };

  const isDirectVideo =
    exercise.videoType === "upload" ||
    exercise.videoUrl.includes("/video/upload/") ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(exercise.videoUrl);

  return {
    type: isDirectVideo ? "video" : "link",
    url: exercise.videoUrl,
  };
};

const routineHasMissingExerciseVideos = (routine: TrainerRoutineDTO) => {
  const exercises = routine.exercises ?? [];

  return (
    exercises.length === 0 ||
    exercises.some((exercise) => !exercise.hasVideo || !exercise.videoUrl)
  );
};

export default function TrainerRoutinesPage() {
  const [routines, setRoutines] = useState<TrainerRoutineDTO[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<TrainerRoutineDTO | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<TrainerRoutineDTO | null>(null);

  const [form, setForm] = useState<RoutineFormState>(() => createDefaultForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [exerciseVideoUrls, setExerciseVideoUrls] = useState<Record<string, string>>({});
  const [videoWorkingByExercise, setVideoWorkingByExercise] = useState<
    Record<string, string>
  >({});

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | RoutineStatus>("todos");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingRoutine);
  const hasVideoInProgress = Object.keys(videoWorkingByExercise).length > 0;

  const exercisesWithoutVideo = useMemo(
    () =>
      form.exercises.filter(
        (exercise) => exercise.name.trim() && (!exercise.hasVideo || !exercise.videoUrl),
      ),
    [form.exercises],
  );

  const canSubmitToReview = Boolean(
    editingRoutine &&
      editingRoutine.status !== "pending_review" &&
      editingRoutine.status !== "published" &&
      form.exercises.some((exercise) => exercise.name.trim()) &&
      exercisesWithoutVideo.length === 0 &&
      !hasVideoInProgress &&
      !saving,
  );

  const loadRoutines = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await getTrainerRoutines();
      setRoutines(result);
    } catch (error) {
      console.error("LOAD ROUTINES ERROR:", error);
      setErrorMessage("No se pudieron cargar las rutinas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutines();
  }, []);

  const filteredRoutines = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return routines.filter((routine) => {
      const matchesQuery =
        !cleanQuery ||
        routine.title.toLowerCase().includes(cleanQuery) ||
        routine.objective?.toLowerCase().includes(cleanQuery) ||
        routine.description?.toLowerCase().includes(cleanQuery);

      const matchesStatus =
        statusFilter === "todos" || routine.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, routines, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: routines.length,
      published: routines.filter((routine) => routine.status === "published").length,
      draft: routines.filter((routine) => routine.status === "draft").length,
      archived: routines.filter((routine) => routine.status === "archived").length,
    };
  }, [routines]);

  const resetForm = () => {
    setEditingRoutine(null);
    setForm(createDefaultForm());
    setImageFile(null);
    setExerciseVideoUrls({});
    setVideoWorkingByExercise({});
    setErrorMessage("");
    setSuccessMessage("");
  };

  const buildRoutineForm = (routine: TrainerRoutineDTO): RoutineFormState => ({
    title: routine.title || "",
    objective: routine.objective || "",
    description: routine.description || "",
    level: routine.level,
    category: routine.category,
    durationWeeks: routine.durationWeeks || 4,
    daysPerWeek: routine.daysPerWeek || 3,
    estimatedMinutes: routine.estimatedMinutes || 45,
    status: routine.status,
    exercises: routine.exercises?.length
      ? routine.exercises.map((exercise, index) => ({
          id: exercise.id,
          routineId: exercise.routineId,
          name: exercise.name || "",
          description: exercise.description || "",
          dayNumber: exercise.dayNumber || 1,
          sets: exercise.sets ?? 4,
          reps: exercise.reps || "10",
          restSeconds: exercise.restSeconds ?? 60,
          notes: exercise.notes || "",
          order: exercise.order ?? index,
          videoUrl: exercise.videoUrl ?? null,
          videoPublicId: exercise.videoPublicId ?? null,
          videoType: exercise.videoType ?? "none",
          hasVideo: Boolean(exercise.hasVideo),
        }))
      : [emptyExercise(0)],
  });

  const buildExerciseVideoUrlInputs = (routine: TrainerRoutineDTO) =>
    Object.fromEntries(
      (routine.exercises ?? [])
        .filter((exercise) => exercise.id)
        .map((exercise) => [
          exercise.id as string,
          exercise.videoType === "upload" ? "" : exercise.videoUrl || "",
        ]),
    );

  const applyRoutineToEditor = (routine: TrainerRoutineDTO) => {
    setEditingRoutine(routine);
    setSelectedRoutine(null);
    setImageFile(null);
    setForm(buildRoutineForm(routine));
    setExerciseVideoUrls(buildExerciseVideoUrlInputs(routine));
  };

  const mergeUpdatedRoutine = (routine: TrainerRoutineDTO) => {
    setRoutines((current) =>
      current.some((item) => item.id === routine.id)
        ? current.map((item) => (item.id === routine.id ? routine : item))
        : [routine, ...current],
    );

    if (editingRoutine?.id === routine.id) {
      applyRoutineToEditor(routine);
    }

    if (selectedRoutine?.id === routine.id) {
      setSelectedRoutine(routine);
    }
  };

  const fillFormForEdit = (routine: TrainerRoutineDTO) => {
    applyRoutineToEditor(routine);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "durationWeeks" ||
        name === "daysPerWeek" ||
        name === "estimatedMinutes"
          ? Number(value)
      : value,
    }));
  };

  const updateRoutineNumber = (
    field: "durationWeeks" | "daysPerWeek" | "estimatedMinutes",
    amount: number,
    min = 1,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: Math.max(min, Number(current[field] || min) + amount),
    }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageFile(event.target.files?.[0] || null);
  };

  const handleFileDrop = (
    event: DragEvent<HTMLDivElement>,
    kind: "image",
  ) => {
    event.preventDefault();

    const droppedFile = Array.from(event.dataTransfer.files).find((file) =>
      kind === "image" ? file.type.startsWith("image/") : false,
    );

    if (!droppedFile) return;

    setImageFile(droppedFile);
  };

  const updateExercise = (
    index: number,
    field: keyof RoutineExerciseDTO,
    value: string | number,
  ) => {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise,
      ),
    }));
  };

  const updateExerciseNumber = (
    index: number,
    field: "dayNumber" | "sets" | "restSeconds",
    amount: number,
    min = 0,
  ) => {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              [field]: Math.max(min, Number(exercise[field] ?? min) + amount),
            }
          : exercise,
      ),
    }));
  };

  const addExercise = () => {
    setForm((current) => ({
      ...current,
      exercises: [...current.exercises, emptyExercise(current.exercises.length)],
    }));
  };

  const removeExercise = (index: number) => {
    const exercise = form.exercises[index];

    if (exercise?.hasVideo) {
      const confirmed = window.confirm(
        "Este ejercicio tiene video. Al guardar cambios tambien se eliminara su video.",
      );

      if (!confirmed) return;
    }

    setForm((current) => {
      const nextExercises = current.exercises.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        exercises: nextExercises.length ? nextExercises : [emptyExercise(0)],
      };
    });
  };

  const setExerciseWorking = (exerciseId: string, label: string | null) => {
    setVideoWorkingByExercise((current) => {
      if (!label) {
        const next = { ...current };
        delete next[exerciseId];
        return next;
      }

      return {
        ...current,
        [exerciseId]: label,
      };
    });
  };

  const ensureEditableExercise = (exercise: RoutineExerciseDTO) => {
    if (!editingRoutine?.id || !exercise.id) {
      setErrorMessage("Guarda el borrador para obtener el ID del ejercicio antes de subir video.");
      return null;
    }

    return {
      routineId: editingRoutine.id,
      exerciseId: exercise.id,
    };
  };

  const handleExerciseVideoFileChange = async (
    exercise: RoutineExerciseDTO,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) return;

    const target = ensureEditableExercise(exercise);
    if (!target) return;

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseWorking(target.exerciseId, "Subiendo");

    try {
      const updatedRoutine = await uploadExerciseVideo(
        target.routineId,
        target.exerciseId,
        file,
      );
      mergeUpdatedRoutine(updatedRoutine);
      setSuccessMessage("Video del ejercicio guardado correctamente.");
    } catch (error: unknown) {
      console.error("UPLOAD EXERCISE VIDEO ERROR:", error);
      setErrorMessage(
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo subir el video.")
          : "No se pudo subir el video.",
      );
    } finally {
      setExerciseWorking(target.exerciseId, null);
    }
  };

  const handleExerciseVideoUrlSubmit = async (exercise: RoutineExerciseDTO) => {
    const target = ensureEditableExercise(exercise);
    if (!target) return;

    const videoUrl = (exerciseVideoUrls[target.exerciseId] || "").trim();

    if (!videoUrl) {
      setErrorMessage("Agrega una URL HTTPS para el video del ejercicio.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseWorking(target.exerciseId, "Guardando URL");

    try {
      const updatedRoutine = await setExerciseVideoUrl(
        target.routineId,
        target.exerciseId,
        videoUrl,
      );
      mergeUpdatedRoutine(updatedRoutine);
      setSuccessMessage("URL del video guardada correctamente.");
    } catch (error: unknown) {
      console.error("SET EXERCISE VIDEO URL ERROR:", error);
      setErrorMessage(
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo guardar la URL.")
          : "No se pudo guardar la URL.",
      );
    } finally {
      setExerciseWorking(target.exerciseId, null);
    }
  };

  const handleDeleteExerciseVideo = async (exercise: RoutineExerciseDTO) => {
    const target = ensureEditableExercise(exercise);
    if (!target) return;

    const confirmed = window.confirm("Eliminar el video de este ejercicio?");
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseWorking(target.exerciseId, "Eliminando");

    try {
      const updatedRoutine = await deleteExerciseVideo(
        target.routineId,
        target.exerciseId,
      );
      mergeUpdatedRoutine(updatedRoutine);
      setSuccessMessage("Video del ejercicio eliminado.");
    } catch (error: unknown) {
      console.error("DELETE EXERCISE VIDEO ERROR:", error);
      setErrorMessage(
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo eliminar el video.")
          : "No se pudo eliminar el video.",
      );
    } finally {
      setExerciseWorking(target.exerciseId, null);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "El nombre de la rutina es obligatorio.";
    }

    if (form.durationWeeks <= 0) {
      return "La duración debe ser mayor a 0.";
    }

    if (form.daysPerWeek <= 0) {
      return "Los días por semana deben ser mayores a 0.";
    }

    if (form.estimatedMinutes <= 0) {
      return "El tiempo estimado debe ser mayor a 0.";
    }

    const validExercises = form.exercises.filter((exercise) => exercise.name.trim());

    if (!validExercises.length) {
      return "Agrega al menos un ejercicio con nombre.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        exercises: form.exercises
          .filter((exercise) => exercise.name.trim())
          .map((exercise, index) => ({
            ...exercise,
            id: exercise.id,
            name: exercise.name.trim(),
            description: exercise.description || "",
            notes: exercise.notes || "",
            order: index,
            sets: exercise.sets === null || exercise.sets === undefined ? null : Number(exercise.sets),
            restSeconds:
              exercise.restSeconds === null || exercise.restSeconds === undefined
                ? null
                : Number(exercise.restSeconds),
            dayNumber: Number(exercise.dayNumber),
          })),
        imageFile,
      };

      if (editingRoutine) {
        const updatedRoutine = await updateTrainerRoutine(editingRoutine.id, payload);
        mergeUpdatedRoutine(updatedRoutine);
        setSuccessMessage("Rutina actualizada correctamente.");
      } else {
        const createdRoutine = await createTrainerRoutine(payload);
        mergeUpdatedRoutine(createdRoutine);
        applyRoutineToEditor(createdRoutine);
        setSuccessMessage("Borrador creado. Ya puedes subir el video de cada ejercicio.");
      }

      await loadRoutines();
    } catch (error: unknown) {
      console.error("SAVE ROUTINE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setErrorMessage(
          String(error.response?.data?.error || "No se pudo guardar la rutina."),
        );
      } else {
        setErrorMessage("No se pudo guardar la rutina.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (routine: TrainerRoutineDTO) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la rutina "${routine.title}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteTrainerRoutine(routine.id);
      setSuccessMessage("Rutina eliminada correctamente.");
      setSelectedRoutine(null);
      await loadRoutines();
    } catch (error) {
      console.error("DELETE ROUTINE ERROR:", error);
      setErrorMessage("No se pudo eliminar la rutina.");
    }
  };

  const handlePublish = async (routine: TrainerRoutineDTO) => {
    try {
      const updatedRoutine = await publishTrainerRoutine(routine.id);
      mergeUpdatedRoutine(updatedRoutine);
      setSuccessMessage("Rutina enviada a revision correctamente.");
      await loadRoutines();
    } catch (error: unknown) {
      console.error("PUBLISH ROUTINE ERROR:", error);
      setErrorMessage(
        axios.isAxiosError(error)
          ? String(
              error.response?.data?.error ||
                "No se pudo enviar la rutina a revision.",
            )
          : "No se pudo enviar la rutina a revision.",
      );
    }
  };

  const handleSubmitCurrentToReview = async () => {
    if (!editingRoutine) return;

    await handlePublish(editingRoutine);
  };

  const handleArchive = async (routine: TrainerRoutineDTO) => {
    try {
      await archiveTrainerRoutine(routine.id);
      setSuccessMessage("Rutina archivada correctamente.");
      await loadRoutines();
    } catch (error) {
      console.error("ARCHIVE ROUTINE ERROR:", error);
      setErrorMessage("No se pudo archivar la rutina.");
    }
  };

  const renderExerciseVideoControls = (exercise: RoutineExerciseDTO) => {
    const exerciseId = exercise.id;
    const busyLabel = exerciseId ? videoWorkingByExercise[exerciseId] : "";
    const videoSource = getExerciseVideoSource(exercise);
    const fileInputId = exerciseId ? `exercise-video-file-${exerciseId}` : "";

    return (
      <section className={styles.exerciseVideoSection}>
        <div className={styles.exerciseVideoHeader}>
          <div>
            <span>Video del ejercicio</span>
            <strong className={exercise.hasVideo ? styles.videoReady : styles.videoPending}>
              {exercise.hasVideo
                ? exercise.videoType === "youtube"
                  ? "YouTube"
                  : exercise.videoType === "upload"
                    ? "Archivo subido"
                    : "URL externa"
                : "Video pendiente"}
            </strong>
          </div>
          <Video size={18} />
        </div>

        {videoSource ? (
          <div className={styles.videoPreview}>
            {videoSource.type === "video" ? (
              <video src={videoSource.url} controls />
            ) : videoSource.type === "embed" ? (
              <iframe
                src={videoSource.url}
                title={`Video de ${exercise.name || "ejercicio"}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a href={videoSource.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Ver video actual
              </a>
            )}
          </div>
        ) : (
          <div className={styles.videoPlaceholder}>
            Video del ejercicio pendiente de actualizacion.
          </div>
        )}

        {!exerciseId ? (
          <small>Guarda el borrador para subir video a este ejercicio.</small>
        ) : (
          <div className={styles.exerciseVideoActions}>
            <input
              className={styles.fileInputNative}
              id={fileInputId}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => void handleExerciseVideoFileChange(exercise, event)}
            />

            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={Boolean(busyLabel)}
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <UploadCloud size={16} />
              {busyLabel || "Subir archivo"}
            </button>

            <div className={styles.videoUrlRow}>
              <input
                type="url"
                value={exerciseVideoUrls[exerciseId] || ""}
                onChange={(event) =>
                  setExerciseVideoUrls((current) => ({
                    ...current,
                    [exerciseId]: event.target.value,
                  }))
                }
                placeholder="https://youtube.com/..."
              />
              <button
                type="button"
                className={styles.primarySmallBtn}
                disabled={Boolean(busyLabel)}
                onClick={() => void handleExerciseVideoUrlSubmit(exercise)}
              >
                <LinkIcon size={15} />
                Guardar URL
              </button>
            </div>

            <button
              type="button"
              className={styles.dangerLightBtn}
              disabled={!exercise.hasVideo || Boolean(busyLabel)}
              onClick={() => void handleDeleteExerciseVideo(exercise)}
            >
              <XCircle size={15} />
              Eliminar video
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Panel de entrenador</span>
          <h1>Rutinas y planes</h1>
          <p>
            Crea rutinas con imagen de portada y videos especificos para cada
            ejercicio antes de enviarlas a revision.
          </p>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <ListChecks size={20} />
          </span>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <CheckCircle2 size={20} />
          </span>
          <span>Publicadas</span>
          <strong>{stats.published}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FileText size={20} />
          </span>
          <span>Borradores</span>
          <strong>{stats.draft}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <Archive size={20} />
          </span>
          <span>Archivadas</span>
          <strong>{stats.archived}</strong>
        </article>
      </section>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      <section className={styles.formPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>
              {isEditing ? "Editando rutina" : "Nueva rutina"}
            </span>
            <h2>{isEditing ? editingRoutine?.title : "Crear rutina"}</h2>
          </div>

          {isEditing ? (
            <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
              Cancelar edición
            </button>
          ) : null}
        </div>

        <div className={styles.creationGuide}>
          <article>
            <strong>1</strong>
            <span>Datos de la rutina</span>
          </article>
          <article>
            <strong>2</strong>
            <span>Imagen de portada</span>
          </article>
          <article>
            <strong>3</strong>
            <span>Videos por ejercicio</span>
          </article>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.gridTwo}>
            <label>
              <span>Nombre de la rutina</span>
              <input
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder="Ej. Hipertrofia inicial"
                required
              />
            </label>

            <label>
              <span>Objetivo</span>
              <input
                name="objective"
                value={form.objective}
                onChange={handleInputChange}
                placeholder="Ej. Ganancia muscular"
              />
            </label>

            <label>
              <span>Nivel</span>
              <select name="level" value={form.level} onChange={handleInputChange}>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </label>

            <label>
              <span>Categoría</span>
              <select name="category" value={form.category} onChange={handleInputChange}>
                <option value="general">General</option>
                <option value="fuerza">Fuerza</option>
                <option value="hipertrofia">Hipertrofia</option>
                <option value="perdida_peso">Pérdida de peso</option>
                <option value="resistencia">Resistencia</option>
                <option value="movilidad">Movilidad</option>
              </select>
            </label>

            <label>
              <span>Duración en semanas</span>
              <div className={styles.numberControl}>
                <input
                  type="number"
                  name="durationWeeks"
                  value={form.durationWeeks}
                  onChange={handleInputChange}
                  min={1}
                />
                <div className={styles.numberButtons}>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("durationWeeks", -1)}
                    aria-label="Restar una semana"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("durationWeeks", 1)}
                    aria-label="Agregar una semana"
                  >
                    +
                  </button>
                </div>
              </div>
            </label>

            <label>
              <span>Días por semana</span>
              <div className={styles.numberControl}>
                <input
                  type="number"
                  name="daysPerWeek"
                  value={form.daysPerWeek}
                  onChange={handleInputChange}
                  min={1}
                />
                <div className={styles.numberButtons}>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("daysPerWeek", -1)}
                    aria-label="Restar un dia por semana"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("daysPerWeek", 1)}
                    aria-label="Agregar un dia por semana"
                  >
                    +
                  </button>
                </div>
              </div>
            </label>

            <label>
              <span>Minutos por sesión</span>
              <div className={styles.numberControl}>
                <input
                  type="number"
                  name="estimatedMinutes"
                  value={form.estimatedMinutes}
                  onChange={handleInputChange}
                  min={1}
                />
                <div className={styles.numberButtons}>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("estimatedMinutes", -5)}
                    aria-label="Restar cinco minutos"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoutineNumber("estimatedMinutes", 5)}
                    aria-label="Agregar cinco minutos"
                  >
                    +
                  </button>
                </div>
              </div>
            </label>

          </div>

          <label>
            <span>Descripción</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Explica para quién es esta rutina, cómo se trabaja y recomendaciones generales."
              rows={4}
            />
          </label>

          <div className={styles.gridTwo}>
            <label>
              <span>Imagen de portada</span>
              <input
                className={styles.fileInputNative}
                id="routine-cover-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <div
                className={styles.uploadDropzone}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleFileDrop(event, "image")}
                onClick={() =>
                  document.getElementById("routine-cover-image")?.click()
                }
              >
                <span className={styles.uploadIcon}>
                  <Image size={22} />
                </span>
                <strong>{imageFile?.name || "Arrastra la imagen aqui"}</strong>
                <small>
                  {imageFile
                    ? "Imagen lista para guardar."
                    : "o haz clic para seleccionar PNG, JPG o WEBP."}
                </small>
              </div>
              {editingRoutine?.imageUrl ? (
                <small>Si subes otra imagen, reemplazará la actual.</small>
              ) : null}
            </label>

          </div>

          {exercisesWithoutVideo.length ? (
            <div className={styles.videoReviewNotice}>
              Agrega un video especifico a cada ejercicio antes de enviar la rutina a revision.
            </div>
          ) : null}

          <section className={styles.exercisePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Ejercicios</span>
                <h3>Ejercicios de la rutina</h3>
              </div>

              <button type="button" className={styles.secondaryBtn} onClick={addExercise}>
                <Plus size={17} />
                Agregar ejercicio
              </button>
            </div>

            <div className={styles.exerciseList}>
              {form.exercises.map((exercise, index) => (
                <article
                  className={styles.exerciseCard}
                  key={exercise.id || `${index}-${exercise.order}`}
                >
                  <div className={styles.exerciseHeader}>
                    <strong>Ejercicio {index + 1}</strong>

                    <button
                      type="button"
                      className={styles.dangerLightBtn}
                      onClick={() => removeExercise(index)}
                    >
                      <Trash2 size={15} />
                      Quitar
                    </button>
                  </div>

                  <div className={styles.gridTwo}>
                    <label>
                      <span>Nombre</span>
                      <input
                        value={exercise.name}
                        onChange={(event) =>
                          updateExercise(index, "name", event.target.value)
                        }
                        placeholder="Ej. Press banca"
                      />
                    </label>

                    <label>
                      <span>Día</span>
                      <div className={styles.numberControl}>
                        <input
                          type="number"
                          min={1}
                          value={exercise.dayNumber}
                          onChange={(event) =>
                            updateExercise(index, "dayNumber", Number(event.target.value))
                          }
                        />
                        <div className={styles.numberButtons}>
                          <button
                            type="button"
                            onClick={() =>
                              updateExerciseNumber(index, "dayNumber", -1, 1)
                            }
                            aria-label="Restar dia"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateExerciseNumber(index, "dayNumber", 1, 1)
                            }
                            aria-label="Agregar dia"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </label>

                    <label>
                      <span>Series</span>
                      <div className={styles.numberControl}>
                        <input
                          type="number"
                          min={0}
                          value={exercise.sets ?? ""}
                          onChange={(event) =>
                            updateExercise(index, "sets", Number(event.target.value))
                          }
                        />
                        <div className={styles.numberButtons}>
                          <button
                            type="button"
                            onClick={() => updateExerciseNumber(index, "sets", -1, 0)}
                            aria-label="Restar serie"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => updateExerciseNumber(index, "sets", 1, 0)}
                            aria-label="Agregar serie"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </label>

                    <label>
                      <span>Repeticiones</span>
                      <input
                        value={exercise.reps || ""}
                        onChange={(event) =>
                          updateExercise(index, "reps", event.target.value)
                        }
                        placeholder="Ej. 10-12"
                      />
                    </label>

                    <label>
                      <span>Descanso en segundos</span>
                      <div className={styles.numberControl}>
                        <input
                          type="number"
                          min={0}
                          value={exercise.restSeconds ?? ""}
                          onChange={(event) =>
                            updateExercise(index, "restSeconds", Number(event.target.value))
                          }
                        />
                        <div className={styles.numberButtons}>
                          <button
                            type="button"
                            onClick={() =>
                              updateExerciseNumber(index, "restSeconds", -15, 0)
                            }
                            aria-label="Restar descanso"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateExerciseNumber(index, "restSeconds", 15, 0)
                            }
                            aria-label="Agregar descanso"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </label>
                  </div>

                  <label>
                    <span>Descripción del ejercicio</span>
                    <textarea
                      rows={2}
                      value={exercise.description || ""}
                      onChange={(event) =>
                        updateExercise(index, "description", event.target.value)
                      }
                      placeholder="Indicaciones técnicas del ejercicio"
                    />
                  </label>

                  <label>
                    <span>Notas</span>
                    <textarea
                      rows={2}
                      value={exercise.notes || ""}
                      onChange={(event) =>
                        updateExercise(index, "notes", event.target.value)
                      }
                      placeholder="Notas adicionales, peso sugerido o recomendaciones"
                    />
                  </label>

                  {renderExerciseVideoControls(exercise)}
                </article>
              ))}
            </div>
          </section>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Guardar borrador"}
            </button>

            {isEditing ? (
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!canSubmitToReview}
                onClick={() => void handleSubmitCurrentToReview()}
              >
                <Send size={17} />
                Enviar a revision
              </button>
            ) : null}

            <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Mis rutinas</span>
            <h2>Rutinas creadas</h2>
          </div>

          <div className={styles.filters}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar rutina..."
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "todos" | RoutineStatus)
              }
            >
              <option value="todos">Todos</option>
              <option value="draft">Borradores</option>
              <option value="pending_review">En revision</option>
              <option value="published">Publicadas</option>
              <option value="archived">Archivadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Cargando rutinas...</div>
        ) : filteredRoutines.length ? (
          <div className={styles.routineGrid}>
            {filteredRoutines.map((routine) => (
              <article className={styles.routineCard} key={routine.id}>
                <div className={styles.cover}>
                  {routine.imageUrl ? (
                    <img src={routine.imageUrl} alt={routine.title} />
                  ) : (
                    <span>Sin imagen</span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span className={`${styles.status} ${styles[routine.status]}`}>
                      {statusLabels[routine.status]}
                    </span>
                    <span className={styles.level}>{levelLabels[routine.level]}</span>
                  </div>

                  <h3>{routine.title}</h3>
                  <p>{routine.objective || "Sin objetivo definido"}</p>

                  <div className={styles.metaGrid}>
                    <span>{categoryLabels[routine.category]}</span>
                    <span>{routine.durationWeeks} semanas</span>
                    <span>{routine.daysPerWeek} días/semana</span>
                    <span>{routine.estimatedMinutes} min</span>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => setSelectedRoutine(routine)}
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => fillFormForEdit(routine)}
                    >
                      Editar
                    </button>

                    {routine.status === "published" ? (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => void handleArchive(routine)}
                      >
                        Archivar
                      </button>
                    ) : routine.status === "pending_review" ? (
                      <button type="button" className={styles.secondaryBtn} disabled>
                        En revision
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primarySmallBtn}
                        disabled={routineHasMissingExerciseVideos(routine)}
                        onClick={() => void handlePublish(routine)}
                      >
                        Enviar a revision
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={() => void handleDelete(routine)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            No hay rutinas registradas con estos filtros.
          </div>
        )}
      </section>

      {selectedRoutine ? (
        <div className={styles.modalOverlay} onClick={() => setSelectedRoutine(null)}>
          <article className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedRoutine(null)}
            >
              ×
            </button>

            <div className={styles.modalHeader}>
              <span className={`${styles.status} ${styles[selectedRoutine.status]}`}>
                {statusLabels[selectedRoutine.status]}
              </span>
              <h2>{selectedRoutine.title}</h2>
              <p>{selectedRoutine.description || "Sin descripción"}</p>
            </div>

            {selectedRoutine.imageUrl ? (
              <img
                className={styles.modalImage}
                src={selectedRoutine.imageUrl}
                alt={selectedRoutine.title}
              />
            ) : null}

            <div className={styles.metaGridModal}>
              <span>Nivel: {levelLabels[selectedRoutine.level]}</span>
              <span>Categoría: {categoryLabels[selectedRoutine.category]}</span>
              <span>Duración: {selectedRoutine.durationWeeks} semanas</span>
              <span>Días: {selectedRoutine.daysPerWeek} por semana</span>
              <span>Tiempo: {selectedRoutine.estimatedMinutes} min</span>
            </div>

            <section className={styles.modalExercises}>
              <h3>Ejercicios</h3>

              {selectedRoutine.exercises?.length ? (
                selectedRoutine.exercises.map((exercise, index) => {
                  const videoSource = getExerciseVideoSource(exercise);

                  return (
                    <div className={styles.modalExercise} key={exercise.id || index}>
                      <strong>
                        Dia {exercise.dayNumber} - {exercise.name}
                      </strong>
                      <p>
                        {exercise.sets ? `${exercise.sets} series` : "Series libres"} -{" "}
                        {exercise.reps || "Reps libres"} - Descanso{" "}
                        {exercise.restSeconds ?? 0}s
                      </p>
                      {exercise.description ? <p>{exercise.description}</p> : null}
                      {exercise.notes ? <small>{exercise.notes}</small> : null}

                      {videoSource ? (
                        <div className={styles.videoPreview}>
                          {videoSource.type === "video" ? (
                            <video src={videoSource.url} controls />
                          ) : videoSource.type === "embed" ? (
                            <iframe
                              src={videoSource.url}
                              title={`Video de ${exercise.name}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <a href={videoSource.url} target="_blank" rel="noreferrer">
                              <ExternalLink size={16} />
                              Ver video
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className={styles.videoPlaceholder}>
                          Video del ejercicio pendiente de actualizacion.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>Sin ejercicios registrados.</p>
              )}
            </section>
          </article>
        </div>
      ) : null}
    </section>
  );
}
