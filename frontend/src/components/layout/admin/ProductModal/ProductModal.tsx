import { useEffect, useMemo, useState } from "react";
import styles from "./ProductModal.module.css";

export type BrandLike = { id: string; name: string; active: boolean };
export type CategoryLike = { id: string; name: string; active: boolean };

export type ProductStatus = "Activo" | "Inactivo";
export type ProductType = "Suplementación" | "Ropa";

export type ExistingImage = { id: string; url: string; order: number };

export type ProductFormData = {
  name: string;
  brandId: string;
  categoryId: string;

  price: number;
  stock: number;
  status: ProductStatus;
  productType: ProductType;

  description: string;
  features: string[];

  // ✅ archivos nuevos (se suben al guardar)
  images: File[];

  supplementFlavor?: string;
  supplementPresentation?: string;
  supplementServings?: string;

  apparelSize?: string;
  apparelColor?: string;
  apparelMaterial?: string;
};

interface Props {
  open: boolean;
  title?: string;
  initial?: Partial<ProductFormData>;
  onClose: () => void;
  onSave: (data: ProductFormData) => void;

  brands: BrandLike[];
  categories: CategoryLike[];

  // ✅ SOLO si estás editando
  productId?: string;
  existingImages?: ExistingImage[];

  // ✅ acciones para imágenes existentes (backend)
  onDeleteExistingImage?: (imageId: string) => Promise<void>;
  onReorderExistingImages?: (newOrderIds: string[]) => Promise<void>;
}

const defaultData: ProductFormData = {
  name: "",
  brandId: "",
  categoryId: "",
  price: 0,
  stock: 0,
  status: "Activo",
  productType: "Suplementación",
  description: "",
  features: [],
  images: [],
};

export default function ProductModal({
  open,
  title = "Nuevo producto",
  initial,
  onClose,
  onSave,
  brands,
  categories,

  productId,
  existingImages = [],
  onDeleteExistingImage,
  onReorderExistingImages,
}: Props) {
  const activeBrands = useMemo(() => brands.filter((b) => b.active), [brands]);
  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories],
  );

  const [data, setData] = useState<ProductFormData>(defaultData);

  // ✅ previews de archivos nuevos
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  // ✅ estado local para la galería existente (para reordenar UI)
  const [gallery, setGallery] = useState<ExistingImage[]>([]);

  useEffect(() => {
    if (!open) return;

    const merged = { ...defaultData, ...initial } as ProductFormData;

    if (!merged.brandId && activeBrands[0]) merged.brandId = activeBrands[0].id;
    if (!merged.categoryId && activeCategories[0])
      merged.categoryId = activeCategories[0].id;

    merged.description = merged.description ?? "";
    merged.features = merged.features ?? [];
    merged.images = merged.images ?? [];

    setData(merged);
    setFeatureInput("");

    // cargar galería existente ordenada
    const sorted = [...existingImages].sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
    setGallery(sorted);
  }, [open, initial, activeBrands, activeCategories, existingImages]);

  useEffect(() => {
    // cleanup old previews
    previewUrls.forEach((u) => URL.revokeObjectURL(u));

    if (!data.images?.length) {
      setPreviewUrls([]);
      return;
    }

    const urls = data.images.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.images]);

  const noBrandOrCategory =
    activeBrands.length === 0 || activeCategories.length === 0;

  const canSave = useMemo(() => {
    const hasSupplementDetails =
      data.supplementPresentation?.trim() &&
      data.supplementFlavor?.trim() &&
      data.supplementServings?.trim();

    const hasApparelDetails =
      data.apparelSize?.trim() && data.apparelColor?.trim();

    return (
      data.name.trim().length >= 3 &&
      data.brandId.trim().length > 0 &&
      data.categoryId.trim().length > 0 &&
      Number.isFinite(data.price) &&
      data.price > 0 &&
      Number.isFinite(data.stock) &&
      data.stock >= 0 &&
      (data.productType === "Suplementación"
        ? Boolean(hasSupplementDetails)
        : Boolean(hasApparelDetails))
    );
  }, [data]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    setData((p) => ({ ...p, features: [...p.features, v] }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setData((p) => ({
      ...p,
      features: p.features.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = () => {
    if (!canSave) return;

    onSave({
      ...data,
      name: data.name.trim(),
      description: data.description.trim(),
      features: (data.features ?? []).map((x) => x.trim()).filter(Boolean),
    });
  };

  // ✅ borrar imagen existente
  const handleDeleteExisting = async (imageId: string) => {
    if (!productId) return;
    if (!onDeleteExistingImage) return;

    const ok = confirm("¿Quitar esta imagen del producto?");
    if (!ok) return;

    await onDeleteExistingImage(imageId);

    // actualiza UI local
    setGallery((prev) => prev.filter((x) => x.id !== imageId));
  };

  // ✅ reordenar (mover arriba/abajo)
  const moveExisting = async (from: number, to: number) => {
    if (!productId) return;
    if (!onReorderExistingImages) return;

    if (to < 0 || to >= gallery.length) return;

    const copy = [...gallery];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);

    setGallery(copy);

    // manda nuevo orden al backend por ids
    const ids = copy.map((x) => x.id);
    await onReorderExistingImages(ids);
  };

  const isEditing = Boolean(productId);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>
              {noBrandOrCategory
                ? "Primero crea Marcas y Categorías activas para poder guardar productos."
                : "Completa los datos del producto."}
            </p>
          </div>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* ✅ IMÁGENES EXISTENTES (solo edición) */}
          {isEditing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Imágenes actuales
              </div>

              {gallery.length === 0 ? (
                <div style={{ opacity: 0.8 }}>
                  Este producto aún no tiene imágenes guardadas.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {gallery.map((img, idx) => (
                    <div
                      key={img.id}
                      style={{
                        width: 140,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "rgba(0,0,0,.15)",
                      }}
                    >
                      <img
                        src={img.url}
                        alt={`Imagen ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: 110,
                          objectFit: "cover",
                        }}
                      />

                      <div
                        style={{
                          padding: 8,
                          display: "flex",
                          gap: 6,
                          justifyContent: "space-between",
                        }}
                      >
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => moveExisting(idx, idx - 1)}
                          disabled={idx === 0}
                          title="Subir (será la portada si queda primero)"
                        >
                          ⬆️
                        </button>

                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => moveExisting(idx, idx + 1)}
                          disabled={idx === gallery.length - 1}
                          title="Bajar"
                        >
                          ⬇️
                        </button>

                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => handleDeleteExisting(img.id)}
                          title="Quitar imagen"
                        >
                          🗑️
                        </button>
                      </div>

                      {idx === 0 && (
                        <div
                          style={{
                            padding: "0 8px 8px",
                            fontSize: 12,
                            opacity: 0.9,
                          }}
                        >
                          ⭐ Portada
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>Tipo de producto</span>
              <select
                value={data.productType}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    productType: e.target.value as ProductType,
                    supplementFlavor:
                      e.target.value === "Suplementación"
                        ? p.supplementFlavor
                        : "",
                    supplementPresentation:
                      e.target.value === "Suplementación"
                        ? p.supplementPresentation
                        : "",
                    supplementServings:
                      e.target.value === "Suplementación"
                        ? p.supplementServings
                        : "",
                    apparelSize: e.target.value === "Ropa" ? p.apparelSize : "",
                    apparelColor:
                      e.target.value === "Ropa" ? p.apparelColor : "",
                    apparelMaterial:
                      e.target.value === "Ropa" ? p.apparelMaterial : "",
                  }))
                }
              >
                <option value="Suplementación">Suplementación</option>
                <option value="Ropa">Ropa</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={data.name}
                onChange={(e) =>
                  setData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Ej. Creatina Monohidratada"
              />
            </label>

            <label className={styles.field}>
              <span>Marca</span>
              <select
                value={data.brandId}
                onChange={(e) =>
                  setData((p) => ({ ...p, brandId: e.target.value }))
                }
                disabled={activeBrands.length === 0}
              >
                {activeBrands.length === 0 ? (
                  <option value="">(No hay marcas activas)</option>
                ) : (
                  activeBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className={styles.field}>
              <span>Categoría</span>
              <select
                value={data.categoryId}
                onChange={(e) =>
                  setData((p) => ({ ...p, categoryId: e.target.value }))
                }
                disabled={activeCategories.length === 0}
              >
                {activeCategories.length === 0 ? (
                  <option value="">(No hay categorías activas)</option>
                ) : (
                  activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className={`${styles.field} ${styles.span2}`}>
              <span>Descripción</span>
              <textarea
                value={data.description}
                onChange={(e) =>
                  setData((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                placeholder="Descripción completa del producto…"
              />
            </label>

            <div className={`${styles.field} ${styles.span2}`}>
              <span>Características</span>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <input
                  style={{ flex: "1 1 220px" }}
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Ej. 24g de proteína por servicio"
                />
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={addFeature}
                >
                  + Agregar
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {data.features.map((f, idx) => (
                  <span
                    key={`${f}-${idx}`}
                    className={styles.tag}
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {f}
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => removeFeature(idx)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {data.productType === "Suplementación" ? (
              <>
                <label className={styles.field}>
                  <span>Presentación</span>
                  <input
                    value={data.supplementPresentation || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        supplementPresentation: e.target.value,
                      }))
                    }
                    placeholder="Ej. 900 g / 1.8 kg"
                  />
                </label>

                <label className={styles.field}>
                  <span>Sabor</span>
                  <input
                    value={data.supplementFlavor || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        supplementFlavor: e.target.value,
                      }))
                    }
                    placeholder="Ej. Chocolate / Vainilla"
                  />
                </label>

                <label className={styles.field}>
                  <span>Porciones</span>
                  <input
                    value={data.supplementServings || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        supplementServings: e.target.value,
                      }))
                    }
                    placeholder="Ej. 30 servicios"
                  />
                </label>
              </>
            ) : (
              <>
                <label className={styles.field}>
                  <span>Talla</span>
                  <input
                    value={data.apparelSize || ""}
                    onChange={(e) =>
                      setData((p) => ({ ...p, apparelSize: e.target.value }))
                    }
                    placeholder="Ej. CH / M / G"
                  />
                </label>

                <label className={styles.field}>
                  <span>Color</span>
                  <input
                    value={data.apparelColor || ""}
                    onChange={(e) =>
                      setData((p) => ({ ...p, apparelColor: e.target.value }))
                    }
                    placeholder="Ej. Negro / Azul"
                  />
                </label>

                <label className={styles.field}>
                  <span>Material</span>
                  <input
                    value={data.apparelMaterial || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        apparelMaterial: e.target.value,
                      }))
                    }
                    placeholder="Ej. Algodón / Dry-fit"
                  />
                </label>
              </>
            )}

            <label className={styles.field}>
              <span>Precio (MXN)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={data.price}
                onChange={(e) =>
                  setData((p) => ({ ...p, price: Number(e.target.value) }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Stock</span>
              <input
                type="number"
                min={0}
                step="1"
                value={data.stock}
                onChange={(e) =>
                  setData((p) => ({ ...p, stock: Number(e.target.value) }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Estado</span>
              <select
                value={data.status}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    status: e.target.value as ProductStatus,
                  }))
                }
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>

            {/* ✅ archivos nuevos */}
            <label className={`${styles.field} ${styles.span2}`}>
              <span>Agregar nuevas imágenes (puedes seleccionar varias)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setData((p) => ({ ...p, images: files }));
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                * Estas se agregan al final. Para cambiar el orden, usa ⬆️⬇️ en
                “Imágenes actuales”.
              </div>
            </label>
          </div>

          {!!previewUrls.length && (
            <div
              className={styles.preview}
              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
              {previewUrls.map((u, idx) => (
                <img
                  key={u + idx}
                  src={u}
                  alt={`Vista ${idx + 1}`}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave || noBrandOrCategory}
            title={
              noBrandOrCategory
                ? "Necesitas marcas y categorías activas"
                : undefined
            }
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
