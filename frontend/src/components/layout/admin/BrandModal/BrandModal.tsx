import { useEffect, useMemo, useState } from "react";
import styles from "./BrandModal.module.css";

type IdLike = string | number;

type CategoryDTO = { id: IdLike; name: string; active: boolean };

export type BrandFormData = {
  name: string;
  active: boolean;
  categoryId: string;
};

interface Props {
  open: boolean;
  title?: string;
  initial?: Partial<BrandFormData>;
  categories: CategoryDTO[];
  onClose: () => void;
  onSave: (data: BrandFormData) => void;
}

const defaultData: BrandFormData = {
  name: "",
  active: true,
  categoryId: "",
};

const asStr = (v: unknown) => (v == null ? "" : String(v));
const trimStr = (v: unknown) => asStr(v).trim();

export default function BrandModal({
  open,
  title = "Nueva marca",
  initial,
  categories,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<BrandFormData>(defaultData);

  // opcional: solo activas
  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories]
  );

  useEffect(() => {
    if (!open) return;

    const merged = { ...defaultData, ...initial };

    // ✅ default: primera categoría activa
    if (!merged.categoryId && activeCategories?.length) {
      merged.categoryId = String(activeCategories[0].id);
    } else if (merged.categoryId != null) {
      merged.categoryId = String(merged.categoryId);
    }

    setData(merged);
  }, [open, initial, activeCategories]);

  const canSave = useMemo(() => {
    return trimStr(data.name).length >= 2 && trimStr(data.categoryId).length > 0;
  }, [data.name, data.categoryId]);

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
            <p className={styles.subtitle}>Crea marcas para asignarlas a productos.</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Categoría</span>
              <select
                value={data.categoryId}
                onChange={(e) => setData((p) => ({ ...p, categoryId: e.target.value }))}
                disabled={activeCategories.length === 0}
              >
                {activeCategories.length === 0 ? (
                  <option value="">(No hay categorías activas)</option>
                ) : (
                  activeCategories.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={data.name}
                onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Optimum Nutrition"
              />
            </label>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={data.active ? "Activo" : "Inactivo"}
                onChange={(e) => setData((p) => ({ ...p, active: e.target.value === "Activo" }))}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() =>
              canSave &&
              onSave({
                name: trimStr(data.name),
                active: data.active,
                categoryId: trimStr(data.categoryId),
              })
            }
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}