import { useEffect, useMemo, useState } from "react";
import styles from "./CategoryModal.module.css";

export type CategoryFormData = {
  name: string;
  active: boolean;
};

interface Props {
  open: boolean;
  title?: string;
  initial?: Partial<CategoryFormData>;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
}

const defaultData: CategoryFormData = {
  name: "",
  active: true,
};

export default function CategoryModal({
  open,
  title = "Nueva categoría",
  initial,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<CategoryFormData>(defaultData);

  useEffect(() => {
    if (!open) return;
    setData({ ...defaultData, ...initial });
  }, [open, initial]);

  const canSave = useMemo(() => data.name.trim().length >= 2, [data.name]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>Crea categorías para asignarlas a productos.</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={data.name}
                onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Proteína / Creatina / Playeras"
              />
            </label>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={data.active ? "Activo" : "Inactivo"}
                onChange={(e) =>
                  setData((p) => ({ ...p, active: e.target.value === "Activo" }))
                }
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          <button
            className={styles.btnPrimary}
            onClick={() => canSave && onSave({ name: data.name.trim(), active: data.active })}
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
