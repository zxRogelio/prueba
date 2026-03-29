import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaInfoCircle,
  FaLayerGroup,
  FaTag,
  FaTimes,
} from "react-icons/fa";
import styles from "../CatalogModal.module.css";

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
  title = "Nueva categoria",
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
    const onEsc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.headerBadge}>Catalogo</span>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>
                <FaLayerGroup />
              </span>
              <div className={styles.titleBlock}>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.subtitle}>
                  Crea la estructura base del catalogo para organizar marcas y
                  productos con el mismo criterio visual del sistema.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.helperCallout}>
            <span className={styles.helperIcon}>
              <FaInfoCircle />
            </span>
            <div>
              <strong>Orden del catalogo</strong>
              <div>
                Cada categoria agrupa varias marcas y sirve como filtro natural
                para el alta de productos.
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <FaTag />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Datos de la categoria</h3>
                <p className={styles.sectionSubtitle}>
                  Define el nombre comercial y su disponibilidad.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaTag className={styles.fieldLabelIcon} />
                  Nombre
                </span>
                <input
                  className={styles.input}
                  value={data.name}
                  onChange={(event) =>
                    setData((previous) => ({ ...previous, name: event.target.value }))
                  }
                  placeholder="Ej. Ropa, Zapatos, Accesorios"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaCheckCircle className={styles.fieldLabelIcon} />
                  Estado
                </span>
                <select
                  className={styles.select}
                  value={data.active ? "Activo" : "Inactivo"}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      active: event.target.value === "Activo",
                    }))
                  }
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => canSave && onSave({ name: data.name.trim(), active: data.active })}
            disabled={!canSave}
          >
            Guardar categoria
          </button>
        </div>
      </div>
    </div>
  );
}
