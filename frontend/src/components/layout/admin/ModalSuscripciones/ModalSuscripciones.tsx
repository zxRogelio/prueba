import { useEffect, useMemo, useState } from "react";
import {
  type SubscriptionBaseFormData,
  type SubscriptionBilling,
  type SubscriptionKind,
} from "../../../../services/admin/subscriptionService";
import styles from "./ModalSuscripciones.module.css";

type FormState = SubscriptionBaseFormData;

interface Props {
  open: boolean;
  title?: string;
  initial?: Partial<SubscriptionBaseFormData>;
  onClose: () => void;
  onSave: (data: SubscriptionBaseFormData) => void;
}

const defaultData: SubscriptionBaseFormData = {
  name: "",
  kind: "membresia",
  segment: "General",
  price: 0,
  billing: "mes",
  status: "Activo",
  color: "red",
  summary: "",
  registrationFee: 0,
  packageSize: null,
  highlight: false,
};

const billingOptionsByKind: Record<
  SubscriptionKind,
  Array<{ value: SubscriptionBilling; label: string }>
> = {
  membresia: [
    { value: "mes", label: "Mensual" },
    { value: "semestre", label: "Semestral" },
    { value: "ano", label: "Anual" },
  ],
  paquete: [{ value: "mes", label: "Mensual" }],
  pase: [
    { value: "visita", label: "Visita" },
    { value: "semana", label: "Semana" },
    { value: "quincena", label: "Quincena" },
  ],
};

export default function ModalSuscripciones({
  open,
  title = "Nueva suscripcion",
  initial,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<FormState>(defaultData);

  useEffect(() => {
    if (!open) {
      return;
    }

    setData({
      ...defaultData,
      ...initial,
    });
  }, [initial, open]);

  const billingOptions = useMemo(
    () => billingOptionsByKind[data.kind],
    [data.kind],
  );

  const canSave = useMemo(() => {
    return (
      data.name.trim().length >= 3 &&
      data.segment.trim().length >= 3 &&
      data.summary.trim().length >= 8 &&
      Number.isFinite(data.price) &&
      data.price > 0 &&
      Number.isFinite(data.registrationFee) &&
      data.registrationFee >= 0 &&
      (data.kind !== "paquete" ||
        (Number.isFinite(data.packageSize) &&
          Number(data.packageSize) >= 2 &&
          Number(data.packageSize) <= 10))
    );
  }, [data]);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", onEsc);
    }

    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleKindChange = (kind: SubscriptionKind) => {
    const nextBilling = billingOptionsByKind[kind][0]?.value ?? "mes";

    setData((previous) => ({
      ...previous,
      kind,
      billing: nextBilling,
      packageSize: kind === "paquete" ? previous.packageSize ?? 2 : null,
      registrationFee: kind === "pase" ? 0 : previous.registrationFee,
    }));
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    onSave({
      ...data,
      name: data.name.trim(),
      segment: data.segment.trim(),
      summary: data.summary.trim(),
      packageSize: data.kind === "paquete" ? Number(data.packageSize) : null,
      registrationFee: data.kind === "pase" ? 0 : data.registrationFee,
    });
  };

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>
              Captura aqui la configuracion base del plan. Una vez guardado,
              podras entrar al detalle para agregar beneficios, promociones por
              fecha y reglas de inscripcion.
            </p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.helperText}>
            Completa nombre, tipo, segmento, periodicidad, precio y estado para
            dejar lista la ficha inicial. Este formulario aplica para
            membresias individuales, paquetes grupales y pases temporales.
          </p>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Nombre del plan</span>
              <input
                value={data.name}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej. Membresia Regular"
              />
            </label>

            <label className={styles.field}>
              <span>Tipo</span>
              <select
                value={data.kind}
                onChange={(event) =>
                  handleKindChange(event.target.value as SubscriptionKind)
                }
              >
                <option value="membresia">Membresia</option>
                <option value="paquete">Paquete</option>
                <option value="pase">Pase temporal</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Segmento</span>
              <input
                value={data.segment}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    segment: event.target.value,
                  }))
                }
                placeholder="Ej. General / Estudiante / Grupal"
              />
            </label>

            <label className={styles.field}>
              <span>Periodicidad</span>
              <select
                value={data.billing}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    billing: event.target.value as SubscriptionBilling,
                  }))
                }
              >
                {billingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Precio base (MXN)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={data.price}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    price: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Inscripcion (MXN)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={data.registrationFee}
                disabled={data.kind === "pase"}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    registrationFee: Number(event.target.value),
                  }))
                }
              />
            </label>

            {data.kind === "paquete" ? (
              <label className={styles.field}>
                <span>Personas incluidas</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  step="1"
                  value={data.packageSize ?? 2}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      packageSize: Number(event.target.value),
                    }))
                  }
                />
              </label>
            ) : null}

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={data.status}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    status: event.target.value as SubscriptionBaseFormData["status"],
                  }))
                }
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Color visual</span>
              <select
                value={data.color}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    color: event.target.value as SubscriptionBaseFormData["color"],
                  }))
                }
              >
                <option value="white">Blanco</option>
                <option value="red">Rojo</option>
                <option value="black">Negro</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Destacado</span>
              <select
                value={data.highlight ? "yes" : "no"}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    highlight: event.target.value === "yes",
                  }))
                }
              >
                <option value="no">No</option>
                <option value="yes">Si</option>
              </select>
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span>Resumen operativo</span>
              <textarea
                rows={3}
                value={data.summary}
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    summary: event.target.value,
                  }))
                }
                placeholder="Ej. Plan mensual para acceso general con renovacion y control administrativo."
              />
            </label>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave}
            title={
              !canSave
                ? "Completa el nombre, segmento, resumen, precio y datos base del plan."
                : "Guardar plan base"
            }
          >
            Guardar plan
          </button>
        </div>
      </div>
    </div>
  );
}
