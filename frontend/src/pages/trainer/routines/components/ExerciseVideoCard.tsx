import { type DragEvent, type KeyboardEvent } from "react";
import { ExternalLink, Link as LinkIcon, Trash2, UploadCloud } from "lucide-react";
import type { RoutineExerciseDTO } from "../../../../services/trainer/routineService";
import styles from "../../TrainerRoutinesPage.module.css";

export type ExerciseVideoMode = "upload" | "url";

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

const getVideoStatusLabel = (
  exercise: RoutineExerciseDTO,
  busyLabel?: string,
  error?: string,
) => {
  if (busyLabel) return busyLabel;
  if (error) return "Error";
  if (!exercise.hasVideo || !exercise.videoUrl) return "Video pendiente";
  if (exercise.videoType === "youtube") return "YouTube";
  if (exercise.videoType === "upload") return "Video cargado";
  return "URL externa";
};

type ExerciseVideoCardProps = {
  exercise: RoutineExerciseDTO;
  index: number;
  mode: ExerciseVideoMode;
  urlValue: string;
  busyLabel?: string;
  error?: string;
  replacing: boolean;
  onModeChange: (mode: ExerciseVideoMode) => void;
  onUrlChange: (value: string) => void;
  onUploadFile: (file: File) => void;
  onSaveUrl: () => void;
  onDeleteVideo: () => void;
  onToggleReplace: (value: boolean) => void;
};

export function ExerciseVideoCard({
  exercise,
  index,
  mode,
  urlValue,
  busyLabel,
  error,
  replacing,
  onModeChange,
  onUrlChange,
  onUploadFile,
  onSaveUrl,
  onDeleteVideo,
  onToggleReplace,
}: ExerciseVideoCardProps) {
  const videoSource = getExerciseVideoSource(exercise);
  const hasVideo = Boolean(exercise.hasVideo && exercise.videoUrl);
  const showControls = !hasVideo || replacing;
  const inputId = `exercise-video-upload-${exercise.id || index}`;
  const urlInputId = `exercise-video-url-${exercise.id || index}`;
  const statusLabel = getVideoStatusLabel(exercise, busyLabel, error);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("video/"),
    );

    if (file) onUploadFile(file);
  };

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    document.getElementById(inputId)?.click();
  };

  return (
    <article className={styles.videoCard}>
      <div className={styles.videoCardHeader}>
        <div>
          <span>Dia {exercise.dayNumber}</span>
          <h4>{exercise.name || `Ejercicio ${index + 1}`}</h4>
          <p>
            {exercise.sets ?? "-"} series - {exercise.reps || "reps libres"}
          </p>
        </div>
        <strong
          className={[
            styles.videoStatusPill,
            hasVideo ? styles.videoReady : styles.videoPending,
            error ? styles.videoError : "",
          ].join(" ")}
          aria-live="polite"
        >
          {statusLabel}
        </strong>
      </div>

      {videoSource ? (
        <div className={styles.videoPreview}>
          {videoSource.type === "video" ? (
            <video src={videoSource.url} controls />
          ) : videoSource.type === "embed" ? (
            <iframe
              src={videoSource.url}
              title={`Video de ${exercise.name || `ejercicio ${index + 1}`}`}
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
          Este ejercicio todavia no tiene video.
        </div>
      )}

      {!exercise.id ? (
        <small className={styles.videoHelperText}>
          Guarda el borrador para obtener el ID real del ejercicio.
        </small>
      ) : null}

      {hasVideo && !showControls ? (
        <div className={styles.videoCardActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={Boolean(busyLabel)}
            onClick={() => onToggleReplace(true)}
          >
            Reemplazar
          </button>
          <button
            type="button"
            className={styles.dangerLightBtn}
            disabled={Boolean(busyLabel)}
            onClick={onDeleteVideo}
          >
            <Trash2 size={15} />
            Eliminar
          </button>
        </div>
      ) : null}

      {showControls && exercise.id ? (
        <div className={styles.videoControls}>
          <div className={styles.segmentedControl} role="tablist" aria-label="Modo de video">
            <button
              type="button"
              className={mode === "upload" ? styles.segmentActive : ""}
              role="tab"
              aria-selected={mode === "upload"}
              onClick={() => onModeChange("upload")}
            >
              Subir archivo
            </button>
            <button
              type="button"
              className={mode === "url" ? styles.segmentActive : ""}
              role="tab"
              aria-selected={mode === "url"}
              onClick={() => onModeChange("url")}
            >
              Usar URL
            </button>
          </div>

          {mode === "upload" ? (
            <div
              className={styles.videoDropzone}
              role="button"
              tabIndex={0}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById(inputId)?.click()}
              onKeyDown={handleDropzoneKeyDown}
              aria-label={`Subir video para ${exercise.name || `ejercicio ${index + 1}`}`}
            >
              <UploadCloud size={22} />
              <strong>{busyLabel || "Seleccionar video"}</strong>
              <small>MP4, WEBM o MOV. Tamano maximo 100 MB.</small>
              <input
                id={inputId}
                className={styles.fileInputNative}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  event.target.value = "";
                  if (file) onUploadFile(file);
                }}
              />
            </div>
          ) : (
            <div className={styles.videoUrlPanel}>
              <label htmlFor={urlInputId}>URL HTTPS del video</label>
              <div className={styles.videoUrlRow}>
                <input
                  id={urlInputId}
                  type="url"
                  value={urlValue}
                  onChange={(event) => onUrlChange(event.target.value)}
                  placeholder="https://youtube.com/..."
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className={styles.primarySmallBtn}
                  disabled={Boolean(busyLabel)}
                  onClick={onSaveUrl}
                >
                  <LinkIcon size={15} />
                  Guardar enlace
                </button>
              </div>
            </div>
          )}

          {hasVideo ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onToggleReplace(false)}
            >
              Cancelar reemplazo
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className={styles.videoErrorMessage} role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
