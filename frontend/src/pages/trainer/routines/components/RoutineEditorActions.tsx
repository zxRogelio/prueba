import { ArrowLeft, CheckCircle2, Plus, Send } from "lucide-react";
import styles from "../../TrainerRoutinesPage.module.css";
import type { RoutineEditorStep } from "./RoutineStepIndicator";

type RoutineEditorActionsProps = {
  activeStep: RoutineEditorStep;
  saving: boolean;
  publishing: boolean;
  missingVideoCount: number;
  canSubmitToReview: boolean;
  onCancel: () => void;
  onContinueToExercises: () => void;
  onBackToDetails: () => void;
  onAddExercise: () => void;
  onSaveDraftAndContinue: () => void;
  onBackToExercises: () => void;
  onSaveChanges: () => void;
  onSubmitToReview: () => void;
};

export function RoutineEditorActions({
  activeStep,
  saving,
  publishing,
  missingVideoCount,
  canSubmitToReview,
  onCancel,
  onContinueToExercises,
  onBackToDetails,
  onAddExercise,
  onSaveDraftAndContinue,
  onBackToExercises,
  onSaveChanges,
  onSubmitToReview,
}: RoutineEditorActionsProps) {
  return (
    <div className={styles.editorActionBar} aria-live="polite">
      {activeStep === "details" ? (
        <>
          <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onContinueToExercises}
          >
            Continuar a ejercicios
          </button>
        </>
      ) : null}

      {activeStep === "exercises" ? (
        <>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onBackToDetails}
          >
            <ArrowLeft size={17} />
            Volver
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onAddExercise}>
            <Plus size={17} />
            Agregar ejercicio
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={saving}
            onClick={onSaveDraftAndContinue}
          >
            <CheckCircle2 size={17} />
            {saving ? "Guardando borrador..." : "Guardar borrador y continuar"}
          </button>
        </>
      ) : null}

      {activeStep === "videos" ? (
        <>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onBackToExercises}
          >
            <ArrowLeft size={17} />
            Volver a ejercicios
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={saving}
            onClick={onSaveChanges}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <div className={styles.reviewActionGroup}>
            {missingVideoCount > 0 ? (
              <span>Faltan {missingVideoCount} videos</span>
            ) : null}
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canSubmitToReview || publishing}
              onClick={onSubmitToReview}
            >
              <Send size={17} />
              {publishing ? "Enviando..." : "Enviar a revision"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
