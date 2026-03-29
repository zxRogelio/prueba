import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaInfoCircle,
  FaLayerGroup,
  FaTag,
  FaTags,
  FaTimes,
} from "react-icons/fa";
import styles from "../CatalogModal.module.css";

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

const asStr = (value: unknown) => (value == null ? "" : String(value));
const trimStr = (value: unknown) => asStr(value).trim();

export default function BrandModal({
  open,
  title = "Nueva marca",
  initial,
  categories,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<BrandFormData>(defaultData);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );

  useEffect(() => {
    if (!open) return;

    const merged = { ...defaultData, ...initial };

    if (!merged.categoryId && activeCategories.length) {
      merged.categoryId = String(activeCategories[0].id);
    } else if (merged.categoryId != null) {
      merged.categoryId = String(merged.categoryId);
    }

    setData(merged);
  }, [open, initial, activeCategories]);

  const canSave = useMemo(
    () => trimStr(data.name).length >= 2 && trimStr(data.categoryId).length > 0,
    [data.name, data.categoryId],
  );

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
                <FaTags />
              </span>
              <div className={styles.titleBlock}>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.subtitle}>
                  Registra marcas con el mismo estilo del panel admin y define
                  a que categoria operativa pertenecen.
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
              <strong>Relacion con categoria</strong>
              <div>
                Cada marca se registra ligada a una categoria activa para
                mantener ordenado el catalogo del admin.
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <FaTags />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Datos de la marca</h3>
                <p className={styles.sectionSubtitle}>
                  Selecciona la categoria donde se va a usar la marca y define
                  su estado.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaLayerGroup className={styles.fieldLabelIcon} />
                  Categoria
                </span>
                <select
                  className={styles.select}
                  value={data.categoryId}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      categoryId: event.target.value,
                    }))
                  }
                  disabled={activeCategories.length === 0}
                >
                  {activeCategories.length === 0 ? (
                    <option value="">(No hay categorias activas)</option>
                  ) : (
                    activeCategories.map((category) => (
                      <option key={String(category.id)} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

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
                  placeholder="Ej. Nike, Optimum Nutrition, Adidas"
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
            Guardar marca
          </button>
        </div>
      </div>
    </div>
  );
}
