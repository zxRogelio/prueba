import styles from "../../TrainerRoutinesPage.module.css";

export type RoutineEditorStep = "details" | "exercises" | "videos";

const steps: Array<{
  id: RoutineEditorStep;
  label: string;
  shortLabel: string;
}> = [
  { id: "details", label: "Datos de la rutina", shortLabel: "Datos" },
  { id: "exercises", label: "Ejercicios", shortLabel: "Ejercicios" },
  { id: "videos", label: "Videos y revision", shortLabel: "Videos" },
];

type RoutineStepIndicatorProps = {
  activeStep: RoutineEditorStep;
  canOpenStep: (step: RoutineEditorStep) => boolean;
  onStepChange: (step: RoutineEditorStep) => void;
};

export function RoutineStepIndicator({
  activeStep,
  canOpenStep,
  onStepChange,
}: RoutineStepIndicatorProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <nav className={styles.stepIndicator} aria-label="Progreso del formulario">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const isCompleted = index < activeIndex;
        const isDisabled = !canOpenStep(step.id);

        return (
          <button
            key={step.id}
            type="button"
            className={[
              styles.stepItem,
              isActive ? styles.stepItemActive : "",
              isCompleted ? styles.stepItemComplete : "",
            ].join(" ")}
            disabled={isDisabled}
            aria-current={isActive ? "step" : undefined}
            onClick={() => onStepChange(step.id)}
          >
            <span>{index + 1}</span>
            <strong>{step.shortLabel}</strong>
            <small>{step.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
