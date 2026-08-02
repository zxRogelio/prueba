import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import axios from "axios";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  ListChecks,
  Trash2,
} from "lucide-react";
import {
  archiveTrainerRoutine,
  createTrainerRoutine,
  deleteExerciseVideo,
  deleteTrainerRoutine,
  getTrainerRoutines,
  publishTrainerRoutine,
  setExerciseVideoUrl,
  updateTrainerRoutine,
  uploadExerciseVideo,
  type RoutineCategory,
  type RoutineExerciseDTO,
  type RoutineLevel,
  type RoutineStatus,
  type TrainerRoutineDTO,
} from "../../services/trainer/routineService";
import {
  ExerciseVideoCard,
  type ExerciseVideoMode,
} from "./routines/components/ExerciseVideoCard";
import { RoutineEditorActions } from "./routines/components/RoutineEditorActions";
import {
  RoutineStepIndicator,
  type RoutineEditorStep,
} from "./routines/components/RoutineStepIndicator";
import styles from "./TrainerRoutinesPage.module.css";

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

type VideoStats = {
  total: number;
  complete: number;
  pending: number;
  percent: number;
};

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

const createDefaultForm = (): RoutineFormState => ({
  title: "",
  objective: "",
  description: "",
  level: "principiante",
  category: "general",
  durationWeeks: 4,
  daysPerWeek: 3,
  estimatedMinutes: 45,
  status: "draft",
  exercises: [emptyExercise(0)],
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
  perdida_peso: "Perdida de peso",
  resistencia: "Resistencia",
  movilidad: "Movilidad",
  general: "General",
};

const formId = "routine-editor-form";
const errorId = "routine-editor-error";

const getExerciseKey = (exercise: RoutineExerciseDTO, index: number) =>
  exercise.id || `draft-${index}`;

const getVideoStats = (exercises: RoutineExerciseDTO[] = []): VideoStats => {
  const namedExercises = exercises.filter((exercise) => exercise.name.trim());
  const complete = namedExercises.filter(
    (exercise) => exercise.hasVideo && Boolean(exercise.videoUrl),
  ).length;
  const total = namedExercises.length;
  const pending = Math.max(total - complete, 0);

  return {
    total,
    complete,
    pending,
    percent: total ? Math.round((complete / total) * 100) : 0,
  };
};

const getRoutineVideoStatus = (routine: TrainerRoutineDTO) => {
  if (routine.status === "pending_review") return "En revision";
  if (routine.status === "published") return "Publicada";
  if (routine.status === "archived") return "Archivada";
  if (routine.status === "rejected") return "Rechazada";

  const stats = getVideoStats(routine.exercises ?? []);
  if (stats.total > 0 && stats.pending === 0) return "Completa";
  return "Videos pendientes";
};

const canRoutineGoToReview = (routine: TrainerRoutineDTO) => {
  const stats = getVideoStats(routine.exercises ?? []);
  return (
    stats.total > 0 &&
    stats.pending === 0 &&
    routine.status !== "pending_review" &&
    routine.status !== "published" &&
    routine.status !== "archived"
  );
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

const getFormSignature = (form: RoutineFormState) =>
  JSON.stringify({
    ...form,
    exercises: form.exercises.map((exercise, index) => ({
      id: exercise.id ?? null,
      name: exercise.name,
      description: exercise.description ?? "",
      dayNumber: Number(exercise.dayNumber || 1),
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? "",
      restSeconds: exercise.restSeconds ?? null,
      notes: exercise.notes ?? "",
      order: exercise.order ?? index,
      videoUrl: exercise.videoUrl ?? null,
      videoType: exercise.videoType ?? "none",
      hasVideo: Boolean(exercise.hasVideo),
    })),
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

const buildVideoModes = (routine: TrainerRoutineDTO) =>
  Object.fromEntries(
    (routine.exercises ?? [])
      .filter((exercise) => exercise.id)
      .map((exercise) => [
        exercise.id as string,
        exercise.videoType === "youtube" || exercise.videoType === "external"
          ? "url"
          : "upload",
      ]),
  ) as Record<string, ExerciseVideoMode>;

const getPreferredStepForRoutine = (routine: TrainerRoutineDTO): RoutineEditorStep => {
  const stats = getVideoStats(routine.exercises ?? []);
  return stats.total > 0 && stats.pending > 0 ? "videos" : "details";
};

export default function TrainerRoutinesPage() {
  const defaultForm = useMemo(() => createDefaultForm(), []);
  const [routines, setRoutines] = useState<TrainerRoutineDTO[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<TrainerRoutineDTO | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<TrainerRoutineDTO | null>(null);
  const [activeStep, setActiveStep] = useState<RoutineEditorStep>("details");
  const [form, setForm] = useState<RoutineFormState>(() => createDefaultForm());
  const [lastSavedSignature, setLastSavedSignature] = useState(
    getFormSignature(defaultForm),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({
    "draft-0": true,
  });
  const [exerciseVideoUrls, setExerciseVideoUrls] = useState<Record<string, string>>({});
  const [videoModes, setVideoModes] = useState<Record<string, ExerciseVideoMode>>({});
  const [replacingVideoByExercise, setReplacingVideoByExercise] = useState<
    Record<string, boolean>
  >({});
  const [videoWorkingByExercise, setVideoWorkingByExercise] = useState<
    Record<string, string>
  >({});
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | RoutineStatus>("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingRoutine);
  const formSignature = useMemo(() => getFormSignature(form), [form]);
  const hasUnsavedChanges = formSignature !== lastSavedSignature || Boolean(imageFile);
  const hasVideoInProgress = Object.keys(videoWorkingByExercise).length > 0;
  const videoStats = useMemo(() => getVideoStats(form.exercises), [form.exercises]);
  const canSubmitToReview = Boolean(
    editingRoutine &&
      editingRoutine.status !== "pending_review" &&
      editingRoutine.status !== "published" &&
      videoStats.total > 0 &&
      videoStats.pending === 0 &&
      !hasVideoInProgress &&
      !hasUnsavedChanges &&
      !saving &&
      !publishingId,
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

  const stats = useMemo(
    () => ({
      total: routines.length,
      published: routines.filter((routine) => routine.status === "published").length,
      draft: routines.filter((routine) => routine.status === "draft").length,
      archived: routines.filter((routine) => routine.status === "archived").length,
    }),
    [routines],
  );

  const resetEditor = (force = false) => {
    if (!force && hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Seguro que deseas cancelar?",
      );
      if (!confirmed) return;
    }

    const nextForm = createDefaultForm();
    setEditingRoutine(null);
    setSelectedRoutine(null);
    setActiveStep("details");
    setForm(nextForm);
    setLastSavedSignature(getFormSignature(nextForm));
    setImageFile(null);
    setExpandedExercises({ "draft-0": true });
    setExerciseVideoUrls({});
    setVideoModes({});
    setReplacingVideoByExercise({});
    setVideoWorkingByExercise({});
    setVideoErrors({});
    setErrorMessage("");
    setSuccessMessage("");
  };

  const applyRoutineToEditor = (
    routine: TrainerRoutineDTO,
    step: RoutineEditorStep = getPreferredStepForRoutine(routine),
  ) => {
    const nextForm = buildRoutineForm(routine);
    setEditingRoutine(routine);
    setSelectedRoutine(null);
    setActiveStep(step);
    setForm(nextForm);
    setLastSavedSignature(getFormSignature(nextForm));
    setImageFile(null);
    setExerciseVideoUrls(buildExerciseVideoUrlInputs(routine));
    setVideoModes(buildVideoModes(routine));
    setReplacingVideoByExercise({});
    setVideoErrors({});
    setExpandedExercises(
      Object.fromEntries(
        nextForm.exercises.map((exercise, index) => [
          getExerciseKey(exercise, index),
          index === 0,
        ]),
      ),
    );
  };

  const mergeRoutine = (
    routine: TrainerRoutineDTO,
    options: { openEditor?: boolean; step?: RoutineEditorStep } = {},
  ) => {
    setRoutines((current) =>
      current.some((item) => item.id === routine.id)
        ? current.map((item) => (item.id === routine.id ? routine : item))
        : [routine, ...current],
    );

    if (options.openEditor || editingRoutine?.id === routine.id) {
      applyRoutineToEditor(routine, options.step ?? activeStep);
    }

    if (selectedRoutine?.id === routine.id) {
      setSelectedRoutine(routine);
    }
  };

  const showEditorForRoutine = (
    routine: TrainerRoutineDTO,
    step: RoutineEditorStep = getPreferredStepForRoutine(routine),
  ) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Deseas abrir otra rutina?",
      );
      if (!confirmed) return;
    }

    applyRoutineToEditor(routine, step);
    document.getElementById("routine-editor")?.focus();
  };

  const validateDetails = () => {
    if (!form.title.trim()) return "El nombre de la rutina es obligatorio.";
    if (form.durationWeeks <= 0) return "La duracion debe ser mayor a 0.";
    if (form.daysPerWeek <= 0) return "Los dias por semana deben ser mayores a 0.";
    if (form.estimatedMinutes <= 0) return "El tiempo estimado debe ser mayor a 0.";
    return "";
  };

  const validateExercises = () => {
    const detailsError = validateDetails();
    if (detailsError) return detailsError;

    if (!form.exercises.length) return "Agrega al menos un ejercicio.";

    const emptyIndex = form.exercises.findIndex(
      (exercise) => !exercise.name.trim(),
    );
    if (emptyIndex >= 0) {
      return `Completa o elimina el ejercicio ${emptyIndex + 1}.`;
    }

    return "";
  };

  const handleContinueToExercises = () => {
    const validationError = validateDetails();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setActiveStep("exercises");
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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageFile(event.target.files?.[0] || null);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (droppedFile) setImageFile(droppedFile);
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

  const addExercise = () => {
    setForm((current) => {
      const nextExercise = emptyExercise(current.exercises.length);
      const nextExercises = [...current.exercises, nextExercise];
      const nextKey = getExerciseKey(nextExercise, nextExercises.length - 1);
      setExpandedExercises((currentExpanded) => ({
        ...currentExpanded,
        [nextKey]: true,
      }));
      return {
        ...current,
        exercises: nextExercises,
      };
    });
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
      const nextExercises = current.exercises.filter(
        (_, itemIndex) => itemIndex !== index,
      );
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

  const setExerciseError = (exerciseId: string, message: string | null) => {
    setVideoErrors((current) => {
      const next = { ...current };
      if (message) next[exerciseId] = message;
      else delete next[exerciseId];
      return next;
    });
  };

  const buildPayload = (): Parameters<typeof createTrainerRoutine>[0] => ({
    ...form,
    status: form.status === "archived" ? "archived" : "draft",
    exercises: form.exercises.map((exercise, index) => ({
      ...exercise,
      id: exercise.id,
      name: exercise.name.trim(),
      description: exercise.description || "",
      notes: exercise.notes || "",
      order: index,
      sets:
        exercise.sets === null || exercise.sets === undefined
          ? null
          : Number(exercise.sets),
      restSeconds:
        exercise.restSeconds === null || exercise.restSeconds === undefined
          ? null
          : Number(exercise.restSeconds),
      dayNumber: Number(exercise.dayNumber),
    })),
    imageFile,
  });

  const saveDraft = async (stepAfterSave: RoutineEditorStep) => {
    const validationError = validateExercises();
    if (validationError) {
      setErrorMessage(validationError);
      return null;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload();
      const savedRoutine = editingRoutine
        ? await updateTrainerRoutine(editingRoutine.id, payload)
        : await createTrainerRoutine(payload);

      mergeRoutine(savedRoutine, {
        openEditor: true,
        step: stepAfterSave,
      });
      setSuccessMessage(
        stepAfterSave === "videos"
          ? "Borrador guardado. Ya puedes gestionar los videos."
          : "Cambios guardados correctamente.",
      );
      return savedRoutine;
    } catch (error: unknown) {
      console.error("SAVE ROUTINE ERROR:", error);
      setErrorMessage(
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo guardar la rutina.")
          : "No se pudo guardar la rutina.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftAndContinue = async () => {
    await saveDraft("videos");
  };

  const handleSaveChanges = async () => {
    await saveDraft(activeStep);
  };

  const handleExerciseVideoFileUpload = async (
    exercise: RoutineExerciseDTO,
    file: File,
  ) => {
    if (!editingRoutine?.id || !exercise.id) {
      setErrorMessage("Guarda el borrador antes de subir videos.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseError(exercise.id, null);
    setExerciseWorking(exercise.id, "Subiendo");

    try {
      const updatedRoutine = await uploadExerciseVideo(
        editingRoutine.id,
        exercise.id,
        file,
      );
      mergeRoutine(updatedRoutine, { openEditor: true, step: "videos" });
      setReplacingVideoByExercise((current) => ({
        ...current,
        [exercise.id as string]: false,
      }));
      setSuccessMessage("Video del ejercicio guardado correctamente.");
    } catch (error: unknown) {
      console.error("UPLOAD EXERCISE VIDEO ERROR:", error);
      setExerciseError(
        exercise.id,
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo subir el video.")
          : "No se pudo subir el video.",
      );
    } finally {
      setExerciseWorking(exercise.id, null);
    }
  };

  const handleExerciseVideoUrlSubmit = async (exercise: RoutineExerciseDTO) => {
    if (!editingRoutine?.id || !exercise.id) {
      setErrorMessage("Guarda el borrador antes de guardar enlaces.");
      return;
    }

    const videoUrl = (exerciseVideoUrls[exercise.id] || "").trim();
    if (!videoUrl) {
      setExerciseError(exercise.id, "Agrega una URL HTTPS para el video.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseError(exercise.id, null);
    setExerciseWorking(exercise.id, "Guardando URL");

    try {
      const updatedRoutine = await setExerciseVideoUrl(
        editingRoutine.id,
        exercise.id,
        videoUrl,
      );
      mergeRoutine(updatedRoutine, { openEditor: true, step: "videos" });
      setReplacingVideoByExercise((current) => ({
        ...current,
        [exercise.id as string]: false,
      }));
      setSuccessMessage("Enlace del video guardado correctamente.");
    } catch (error: unknown) {
      console.error("SET EXERCISE VIDEO URL ERROR:", error);
      setExerciseError(
        exercise.id,
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo guardar el enlace.")
          : "No se pudo guardar el enlace.",
      );
    } finally {
      setExerciseWorking(exercise.id, null);
    }
  };

  const handleDeleteExerciseVideo = async (exercise: RoutineExerciseDTO) => {
    if (!editingRoutine?.id || !exercise.id) return;

    const confirmed = window.confirm("Eliminar el video de este ejercicio?");
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setExerciseError(exercise.id, null);
    setExerciseWorking(exercise.id, "Eliminando");

    try {
      const updatedRoutine = await deleteExerciseVideo(editingRoutine.id, exercise.id);
      mergeRoutine(updatedRoutine, { openEditor: true, step: "videos" });
      setSuccessMessage("Video del ejercicio eliminado.");
    } catch (error: unknown) {
      console.error("DELETE EXERCISE VIDEO ERROR:", error);
      setExerciseError(
        exercise.id,
        axios.isAxiosError(error)
          ? String(error.response?.data?.error || "No se pudo eliminar el video.")
          : "No se pudo eliminar el video.",
      );
    } finally {
      setExerciseWorking(exercise.id, null);
    }
  };

  const handleSubmitToReview = async (routine: TrainerRoutineDTO) => {
    if (hasVideoInProgress) {
      setErrorMessage("Espera a que terminen las cargas de video.");
      return;
    }

    if (editingRoutine?.id === routine.id && hasUnsavedChanges) {
      setErrorMessage("Guarda los cambios antes de enviar la rutina a revision.");
      setActiveStep("videos");
      return;
    }

    if (!canRoutineGoToReview(routine)) {
      setErrorMessage("Agrega un video especifico a cada ejercicio antes de enviar.");
      return;
    }

    const confirmed = window.confirm("Enviar esta rutina a revision?");
    if (!confirmed) return;

    setPublishingId(routine.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedRoutine = await publishTrainerRoutine(routine.id);
      mergeRoutine(updatedRoutine, {
        openEditor: editingRoutine?.id === routine.id,
        step: "videos",
      });
      setSuccessMessage("Rutina enviada a revision correctamente.");
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
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteRoutine = async (routine: TrainerRoutineDTO) => {
    const confirmed = window.confirm(
      `Seguro que deseas eliminar la rutina "${routine.title}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteTrainerRoutine(routine.id);
      setRoutines((current) => current.filter((item) => item.id !== routine.id));
      if (editingRoutine?.id === routine.id) resetEditor(true);
      if (selectedRoutine?.id === routine.id) setSelectedRoutine(null);
      setSuccessMessage("Rutina eliminada correctamente.");
    } catch (error) {
      console.error("DELETE ROUTINE ERROR:", error);
      setErrorMessage("No se pudo eliminar la rutina.");
    }
  };

  const handleArchiveRoutine = async (routine: TrainerRoutineDTO) => {
    try {
      const updatedRoutine = await archiveTrainerRoutine(routine.id);
      mergeRoutine(updatedRoutine, { openEditor: editingRoutine?.id === routine.id });
      setSuccessMessage("Rutina archivada correctamente.");
    } catch (error) {
      console.error("ARCHIVE ROUTINE ERROR:", error);
      setErrorMessage("No se pudo archivar la rutina.");
    }
  };

  const canOpenStep = (step: RoutineEditorStep) => {
    if (step === "details") return true;
    if (step === "exercises") return !validateDetails();
    return Boolean(editingRoutine?.id && !hasUnsavedChanges);
  };

  const handleStepChange = (step: RoutineEditorStep) => {
    if (step === activeStep) return;
    if (step === "exercises") {
      const validationError = validateDetails();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }
    }

    if (step === "videos" && (!editingRoutine?.id || hasUnsavedChanges)) {
      setErrorMessage("Guarda el borrador antes de ir a videos.");
      return;
    }

    setErrorMessage("");
    setActiveStep(step);
  };

  const renderDetailsStep = () => (
    <section className={styles.stepPanel} aria-labelledby="routine-details-title">
      <div className={styles.stepHeader}>
        <span className={styles.eyebrow}>Paso 1</span>
        <h3 id="routine-details-title">Datos de la rutina</h3>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.field}>
          <label htmlFor="routine-title">Nombre de la rutina</label>
          <input
            id="routine-title"
            name="title"
            value={form.title}
            onChange={handleInputChange}
            placeholder="Ej. Hipertrofia inicial"
            required
            aria-describedby={errorMessage ? errorId : undefined}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="routine-objective">Objetivo</label>
          <input
            id="routine-objective"
            name="objective"
            value={form.objective}
            onChange={handleInputChange}
            placeholder="Ej. Ganancia muscular"
          />
        </div>

        <div className={styles.fieldWide}>
          <label htmlFor="routine-description">Descripcion</label>
          <textarea
            id="routine-description"
            name="description"
            value={form.description}
            onChange={handleInputChange}
            placeholder="Explica para quien es esta rutina y recomendaciones generales."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="routine-level">Nivel</label>
          <select
            id="routine-level"
            name="level"
            value={form.level}
            onChange={handleInputChange}
          >
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="routine-category">Categoria</label>
          <select
            id="routine-category"
            name="category"
            value={form.category}
            onChange={handleInputChange}
          >
            <option value="general">General</option>
            <option value="fuerza">Fuerza</option>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="perdida_peso">Perdida de peso</option>
            <option value="resistencia">Resistencia</option>
            <option value="movilidad">Movilidad</option>
          </select>
        </div>

        <div className={styles.compactFields}>
          <div className={styles.field}>
            <label htmlFor="routine-durationWeeks">Duracion en semanas</label>
            <input
              id="routine-durationWeeks"
              type="number"
              name="durationWeeks"
              min={1}
              value={form.durationWeeks}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="routine-daysPerWeek">Dias por semana</label>
            <input
              id="routine-daysPerWeek"
              type="number"
              name="daysPerWeek"
              min={1}
              value={form.daysPerWeek}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="routine-estimatedMinutes">Tiempo estimado</label>
            <input
              id="routine-estimatedMinutes"
              type="number"
              name="estimatedMinutes"
              min={1}
              value={form.estimatedMinutes}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className={styles.fieldWide}>
          <label htmlFor="routine-cover-image">Imagen de portada</label>
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
            onDrop={handleImageDrop}
            onClick={() => document.getElementById("routine-cover-image")?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                document.getElementById("routine-cover-image")?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Seleccionar imagen de portada"
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
          {editingRoutine?.imageUrl && !imageFile ? (
            <small>La imagen actual se conserva si no subes otra.</small>
          ) : null}
        </div>
      </div>
    </section>
  );

  const renderExerciseCard = (exercise: RoutineExerciseDTO, index: number) => {
    const key = getExerciseKey(exercise, index);
    const isExpanded = expandedExercises[key] ?? index === 0;
    const isComplete = Boolean(exercise.name.trim());

    return (
      <article className={styles.exerciseAccordionCard} key={key}>
        <div className={styles.exerciseAccordionHeader}>
          <div>
            <span>Ejercicio {index + 1}</span>
            <strong>{exercise.name.trim() || "Sin nombre"}</strong>
            <small>
              Dia {exercise.dayNumber || 1} - {exercise.sets ?? "-"} series -{" "}
              {exercise.reps || "reps libres"} - {exercise.restSeconds ?? 0} segundos
            </small>
          </div>

          <div className={styles.exerciseHeaderActions}>
            <span
              className={isComplete ? styles.infoComplete : styles.infoPending}
              aria-label={isComplete ? "Informacion completa" : "Informacion pendiente"}
            >
              {isComplete ? "Completa" : "Pendiente"}
            </span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={isExpanded ? "Contraer ejercicio" : "Expandir ejercicio"}
              title={isExpanded ? "Contraer ejercicio" : "Expandir ejercicio"}
              onClick={() =>
                setExpandedExercises((current) => ({
                  ...current,
                  [key]: !isExpanded,
                }))
              }
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              type="button"
              className={styles.secondaryIconTextBtn}
              onClick={() => removeExercise(index)}
              aria-label={`Quitar ejercicio ${index + 1}`}
            >
              <Trash2 size={15} />
              Quitar
            </button>
          </div>
        </div>

        {isExpanded ? (
          <div className={styles.exerciseFields}>
            <div className={styles.field}>
              <label htmlFor={`${key}-name`}>Nombre</label>
              <input
                id={`${key}-name`}
                value={exercise.name}
                onChange={(event) => updateExercise(index, "name", event.target.value)}
                placeholder="Ej. Press banca"
              />
            </div>

            <div className={styles.compactFields}>
              <div className={styles.field}>
                <label htmlFor={`${key}-dayNumber`}>Dia</label>
                <input
                  id={`${key}-dayNumber`}
                  type="number"
                  min={1}
                  value={exercise.dayNumber}
                  onChange={(event) =>
                    updateExercise(index, "dayNumber", Number(event.target.value))
                  }
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`${key}-sets`}>Series</label>
                <input
                  id={`${key}-sets`}
                  type="number"
                  min={0}
                  value={exercise.sets ?? ""}
                  onChange={(event) =>
                    updateExercise(index, "sets", Number(event.target.value))
                  }
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`${key}-reps`}>Repeticiones</label>
                <input
                  id={`${key}-reps`}
                  value={exercise.reps || ""}
                  onChange={(event) => updateExercise(index, "reps", event.target.value)}
                  placeholder="Ej. 10-12"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`${key}-restSeconds`}>Descanso</label>
                <input
                  id={`${key}-restSeconds`}
                  type="number"
                  min={0}
                  value={exercise.restSeconds ?? ""}
                  onChange={(event) =>
                    updateExercise(index, "restSeconds", Number(event.target.value))
                  }
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor={`${key}-description`}>Descripcion</label>
              <textarea
                id={`${key}-description`}
                rows={2}
                value={exercise.description || ""}
                onChange={(event) =>
                  updateExercise(index, "description", event.target.value)
                }
                placeholder="Indicaciones tecnicas del ejercicio"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={`${key}-notes`}>Notas</label>
              <textarea
                id={`${key}-notes`}
                rows={2}
                value={exercise.notes || ""}
                onChange={(event) => updateExercise(index, "notes", event.target.value)}
                placeholder="Peso sugerido, recomendaciones o progresion"
              />
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  const renderExercisesStep = () => (
    <section className={styles.stepPanel} aria-labelledby="routine-exercises-title">
      <div className={styles.stepHeader}>
        <span className={styles.eyebrow}>Paso 2</span>
        <h3 id="routine-exercises-title">Ejercicios</h3>
        <p>
          Agrega los ejercicios que componen la rutina. Podras subir el video de
          cada ejercicio despues de guardar el borrador.
        </p>
      </div>

      <div className={styles.exerciseAccordionList}>
        {form.exercises.map(renderExerciseCard)}
      </div>
    </section>
  );

  const renderVideosStep = () => (
    <section className={styles.stepPanel} aria-labelledby="routine-videos-title">
      <div className={styles.stepHeader}>
        <span className={styles.eyebrow}>Paso 3</span>
        <h3 id="routine-videos-title">Videos de los ejercicios</h3>
        <p>
          Agrega un video especifico para cada ejercicio. Todos los ejercicios
          deben tener video antes de enviar la rutina a revision.
        </p>
      </div>

      <div className={styles.videoProgressPanel}>
        <div>
          <strong>
            {videoStats.complete} de {videoStats.total} ejercicios con video
          </strong>
          <span>{videoStats.percent} % completado</span>
        </div>
        <div
          className={styles.videoProgressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={videoStats.percent}
          aria-label="Avance de videos"
        >
          <span style={{ width: `${videoStats.percent}%` }} />
        </div>
        <div className={styles.videoProgressStats}>
          <span>Total: {videoStats.total}</span>
          <span>Completos: {videoStats.complete}</span>
          <span>Pendientes: {videoStats.pending}</span>
        </div>
      </div>

      {!editingRoutine ? (
        <div className={styles.videoReviewNotice}>
          Guarda el borrador para obtener los IDs reales de los ejercicios.
        </div>
      ) : null}

      <div className={styles.videoCardGrid}>
        {form.exercises.map((exercise, index) => {
          const exerciseId = exercise.id || getExerciseKey(exercise, index);

          return (
            <ExerciseVideoCard
              key={exerciseId}
              exercise={exercise}
              index={index}
              mode={videoModes[exerciseId] || "upload"}
              urlValue={exerciseVideoUrls[exerciseId] || ""}
              busyLabel={videoWorkingByExercise[exerciseId]}
              error={videoErrors[exerciseId]}
              replacing={Boolean(replacingVideoByExercise[exerciseId])}
              onModeChange={(mode) =>
                setVideoModes((current) => ({
                  ...current,
                  [exerciseId]: mode,
                }))
              }
              onUrlChange={(value) =>
                setExerciseVideoUrls((current) => ({
                  ...current,
                  [exerciseId]: value,
                }))
              }
              onUploadFile={(file) => void handleExerciseVideoFileUpload(exercise, file)}
              onSaveUrl={() => void handleExerciseVideoUrlSubmit(exercise)}
              onDeleteVideo={() => void handleDeleteExerciseVideo(exercise)}
              onToggleReplace={(value) =>
                setReplacingVideoByExercise((current) => ({
                  ...current,
                  [exerciseId]: value,
                }))
              }
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Panel de entrenador</span>
          <h1>Rutinas y planes</h1>
          <p>
            Crea rutinas con un flujo guiado: datos generales, ejercicios y
            videos especificos para revision.
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

      {errorMessage ? (
        <div id={errorId} className={styles.errorBox} role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className={styles.successBox} role="status" aria-live="polite">
          {successMessage}
        </div>
      ) : null}

      <section
        id="routine-editor"
        className={styles.formPanel}
        tabIndex={-1}
        aria-labelledby="routine-editor-title"
      >
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>
              {isEditing ? "Editando rutina" : "Nueva rutina"}
            </span>
            <h2 id="routine-editor-title">
              {isEditing ? editingRoutine?.title : "Crear rutina"}
            </h2>
          </div>
          {isEditing ? (
            <button type="button" className={styles.secondaryBtn} onClick={() => resetEditor()}>
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <RoutineStepIndicator
          activeStep={activeStep}
          canOpenStep={canOpenStep}
          onStepChange={handleStepChange}
        />

        <form
          id={formId}
          className={styles.form}
          aria-describedby={errorMessage ? errorId : undefined}
          onSubmit={(event) => event.preventDefault()}
        >
          {activeStep === "details" ? renderDetailsStep() : null}
          {activeStep === "exercises" ? renderExercisesStep() : null}
          {activeStep === "videos" ? renderVideosStep() : null}

          <RoutineEditorActions
            activeStep={activeStep}
            saving={saving}
            publishing={publishingId === editingRoutine?.id}
            missingVideoCount={videoStats.pending}
            canSubmitToReview={canSubmitToReview}
            onCancel={() => resetEditor()}
            onContinueToExercises={handleContinueToExercises}
            onBackToDetails={() => setActiveStep("details")}
            onAddExercise={addExercise}
            onSaveDraftAndContinue={() => void handleSaveDraftAndContinue()}
            onBackToExercises={() => setActiveStep("exercises")}
            onSaveChanges={() => void handleSaveChanges()}
            onSubmitToReview={() => {
              if (editingRoutine) void handleSubmitToReview(editingRoutine);
            }}
          />
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
              aria-label="Buscar rutina"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "todos" | RoutineStatus)
              }
              aria-label="Filtrar por estado"
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
            {filteredRoutines.map((routine) => {
              const routineVideoStats = getVideoStats(routine.exercises ?? []);
              const routineReady = canRoutineGoToReview(routine);

              return (
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

                    <div className={styles.routineVideoSummary}>
                      <strong>
                        {routineVideoStats.complete}/{routineVideoStats.total} videos
                      </strong>
                      <span>{getRoutineVideoStatus(routine)}</span>
                      <div className={styles.videoProgressTrack}>
                        <span style={{ width: `${routineVideoStats.percent}%` }} />
                      </div>
                    </div>

                    <div className={styles.metaGrid}>
                      <span>{categoryLabels[routine.category]}</span>
                      <span>{routine.durationWeeks} semanas</span>
                      <span>{routine.daysPerWeek} dias/semana</span>
                      <span>{routine.estimatedMinutes} min</span>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => setSelectedRoutine(routine)}
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => showEditorForRoutine(routine, "details")}
                      >
                        Editar datos
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => showEditorForRoutine(routine, "exercises")}
                      >
                        Editar ejercicios
                      </button>
                      <button
                        type="button"
                        className={styles.primarySmallBtn}
                        onClick={() => showEditorForRoutine(routine, "videos")}
                      >
                        Gestionar videos
                      </button>
                      {routineReady ? (
                        <button
                          type="button"
                          className={styles.primarySmallBtn}
                          disabled={publishingId === routine.id}
                          onClick={() => void handleSubmitToReview(routine)}
                        >
                          Enviar a revision
                        </button>
                      ) : null}
                      {routine.status === "published" ? (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => void handleArchiveRoutine(routine)}
                        >
                          Archivar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => void handleDeleteRoutine(routine)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
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
              aria-label="Cerrar detalle"
            >
              x
            </button>

            <div className={styles.modalHeader}>
              <span className={`${styles.status} ${styles[selectedRoutine.status]}`}>
                {statusLabels[selectedRoutine.status]}
              </span>
              <h2>{selectedRoutine.title}</h2>
              <p>{selectedRoutine.description || "Sin descripcion"}</p>
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
              <span>Categoria: {categoryLabels[selectedRoutine.category]}</span>
              <span>Duracion: {selectedRoutine.durationWeeks} semanas</span>
              <span>Dias: {selectedRoutine.daysPerWeek} por semana</span>
              <span>Tiempo: {selectedRoutine.estimatedMinutes} min</span>
            </div>

            <section className={styles.modalExercises}>
              <h3>Ejercicios</h3>
              {selectedRoutine.exercises?.length ? (
                selectedRoutine.exercises.map((exercise, index) => (
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
                  </div>
                ))
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
