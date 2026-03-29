import { useEffect, useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBoxOpen,
  FaCheckCircle,
  FaDollarSign,
  FaImage,
  FaInfoCircle,
  FaLayerGroup,
  FaListUl,
  FaPlus,
  FaTag,
  FaTags,
  FaTimes,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import styles from "../CatalogModal.module.css";

type IdLike = string | number;

export type BrandLike = {
  id: IdLike;
  name: string;
  active: boolean;
  categoryId: IdLike;
};
export type CategoryLike = { id: IdLike; name: string; active: boolean };

export type ProductStatus = "Activo" | "Inactivo";
export type ProductType = "Suplementación" | "Ropa";

export type ExistingImage = { id: IdLike; url: string; order: number };

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
  productId?: IdLike;
  existingImages?: ExistingImage[];
  onDeleteExistingImage?: (imageId: string) => Promise<void>;
  onReorderExistingImages?: (newOrderIds: string[]) => Promise<void>;
}

const SUPPLEMENT_TYPE: ProductType = "Suplementaci\u00f3n";
const APPAREL_TYPE: ProductType = "Ropa";

const defaultData: ProductFormData = {
  name: "",
  brandId: "",
  categoryId: "",
  price: 0,
  stock: 0,
  status: "Activo",
  productType: SUPPLEMENT_TYPE,
  description: "",
  features: [],
  images: [],
};

const asStr = (value: unknown) => (value == null ? "" : String(value));
const trimStr = (value: unknown) => asStr(value).trim();

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
  const activeCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );
  const activeBrandsAll = useMemo(
    () => brands.filter((brand) => brand.active),
    [brands],
  );

  const [data, setData] = useState<ProductFormData>(defaultData);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [gallery, setGallery] = useState<ExistingImage[]>([]);

  const brandsByCategory = useMemo(() => {
    const categoryId = trimStr(data.categoryId);
    if (!categoryId) return activeBrandsAll;
    return activeBrandsAll.filter(
      (brand) => trimStr(brand.categoryId) === categoryId,
    );
  }, [activeBrandsAll, data.categoryId]);

  useEffect(() => {
    if (!open) return;

    const merged = { ...defaultData, ...initial } as ProductFormData;

    merged.brandId = merged.brandId != null ? String(merged.brandId) : "";
    merged.categoryId =
      merged.categoryId != null ? String(merged.categoryId) : "";

    if (!merged.categoryId && activeCategories[0]) {
      merged.categoryId = String(activeCategories[0].id);
    }

    const validBrands = activeBrandsAll.filter(
      (brand) => trimStr(brand.categoryId) === trimStr(merged.categoryId),
    );

    if (!merged.brandId) {
      merged.brandId =
        validBrands[0]?.id != null ? String(validBrands[0].id) : "";
    } else {
      const stillValid = validBrands.some(
        (brand) => String(brand.id) === String(merged.brandId),
      );

      if (!stillValid) {
        merged.brandId =
          validBrands[0]?.id != null ? String(validBrands[0].id) : "";
      }
    }

    merged.description = merged.description ?? "";
    merged.features = merged.features ?? [];
    merged.images = merged.images ?? [];

    setData(merged);
    setFeatureInput("");
    setGallery(
      [...existingImages].sort(
        (left, right) => Number(left.order) - Number(right.order),
      ),
    );
  }, [open, initial, activeBrandsAll, activeCategories, existingImages]);

  useEffect(() => {
    if (!data.images?.length) {
      setPreviewUrls([]);
      return;
    }

    const urls = data.images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [data.images]);

  const noBrandOrCategory =
    activeBrandsAll.length === 0 || activeCategories.length === 0;
  const isSupplement = data.productType === SUPPLEMENT_TYPE;

  const canSave = useMemo(() => {
    const hasSupplementDetails =
      trimStr(data.supplementPresentation) &&
      trimStr(data.supplementFlavor) &&
      trimStr(data.supplementServings);

    const hasApparelDetails =
      trimStr(data.apparelSize) && trimStr(data.apparelColor);

    return (
      trimStr(data.name).length >= 3 &&
      trimStr(data.brandId).length > 0 &&
      trimStr(data.categoryId).length > 0 &&
      Number.isFinite(data.price) &&
      data.price > 0 &&
      Number.isFinite(data.stock) &&
      data.stock >= 0 &&
      (isSupplement ? Boolean(hasSupplementDetails) : Boolean(hasApparelDetails))
    );
  }, [data, isSupplement]);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const addFeature = () => {
    const value = featureInput.trim();
    if (!value) return;

    setData((previous) => ({
      ...previous,
      features: [...previous.features, value],
    }));
    setFeatureInput("");
  };

  const removeFeature = (index: number) => {
    setData((previous) => ({
      ...previous,
      features: previous.features.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSave = () => {
    if (!canSave) return;

    onSave({
      ...data,
      name: trimStr(data.name),
      description: trimStr(data.description),
      features: (data.features ?? []).map((item) => trimStr(item)).filter(Boolean),
      brandId: trimStr(data.brandId),
      categoryId: trimStr(data.categoryId),
    });
  };

  const handleDeleteExisting = async (imageId: IdLike) => {
    if (!productId || !onDeleteExistingImage) return;

    const confirmed = confirm("Quitar esta imagen del producto?");
    if (!confirmed) return;

    await onDeleteExistingImage(String(imageId));
    setGallery((previous) =>
      previous.filter((image) => String(image.id) !== String(imageId)),
    );
  };

  const moveExisting = async (from: number, to: number) => {
    if (!productId || !onReorderExistingImages) return;
    if (to < 0 || to >= gallery.length) return;

    const nextGallery = [...gallery];
    const [item] = nextGallery.splice(from, 1);
    nextGallery.splice(to, 0, item);
    setGallery(nextGallery);

    await onReorderExistingImages(nextGallery.map((image) => String(image.id)));
  };

  const isEditing = Boolean(productId);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={`${styles.modal} ${styles.modalWide}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.headerBadge}>Catalogo</span>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>
                <FaBoxOpen />
              </span>
              <div className={styles.titleBlock}>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.subtitle}>
                  Configura la ficha comercial del producto con el mismo lenguaje
                  visual del admin y manteniendo la relacion correcta entre
                  categoria y marca.
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
              <strong>
                {noBrandOrCategory
                  ? "Falta configuracion previa"
                  : "Relacion categoria - marca"}
              </strong>
              <div>
                {noBrandOrCategory
                  ? "Necesitas al menos una categoria activa y una marca activa para guardar productos."
                  : "La marca se filtra por la categoria elegida para mantener consistente la relacion comercial del producto."}
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <FaTags />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Base comercial</h3>
                <p className={styles.sectionSubtitle}>
                  Define tipo, nombre, categoria, marca, precio, stock y estado.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaLayerGroup className={styles.fieldLabelIcon} />
                  Tipo de producto
                </span>
                <select
                  className={styles.select}
                  value={data.productType}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      productType: event.target.value as ProductType,
                      supplementFlavor:
                        event.target.value === SUPPLEMENT_TYPE
                          ? previous.supplementFlavor
                          : "",
                      supplementPresentation:
                        event.target.value === SUPPLEMENT_TYPE
                          ? previous.supplementPresentation
                          : "",
                      supplementServings:
                        event.target.value === SUPPLEMENT_TYPE
                          ? previous.supplementServings
                          : "",
                      apparelSize:
                        event.target.value === APPAREL_TYPE
                          ? previous.apparelSize
                          : "",
                      apparelColor:
                        event.target.value === APPAREL_TYPE
                          ? previous.apparelColor
                          : "",
                      apparelMaterial:
                        event.target.value === APPAREL_TYPE
                          ? previous.apparelMaterial
                          : "",
                    }))
                  }
                >
                  <option value={SUPPLEMENT_TYPE}>Suplementacion</option>
                  <option value={APPAREL_TYPE}>Ropa</option>
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
                  placeholder="Ej. Tenis de entrenamiento"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaLayerGroup className={styles.fieldLabelIcon} />
                  Categoria
                </span>
                <select
                  className={styles.select}
                  value={data.categoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;

                    setData((previous) => {
                      const validBrands = activeBrandsAll.filter(
                        (brand) => trimStr(brand.categoryId) === trimStr(nextCategoryId),
                      );

                      return {
                        ...previous,
                        categoryId: nextCategoryId,
                        brandId:
                          validBrands[0]?.id != null ? String(validBrands[0].id) : "",
                      };
                    });
                  }}
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
                  <FaTags className={styles.fieldLabelIcon} />
                  Marca
                </span>
                <select
                  className={styles.select}
                  value={data.brandId}
                  onChange={(event) =>
                    setData((previous) => ({ ...previous, brandId: event.target.value }))
                  }
                  disabled={brandsByCategory.length === 0}
                >
                  {brandsByCategory.length === 0 ? (
                    <option value="">(No hay marcas para esta categoria)</option>
                  ) : (
                    brandsByCategory.map((brand) => (
                      <option key={String(brand.id)} value={String(brand.id)}>
                        {brand.name}
                      </option>
                    ))
                  )}
                </select>
                {data.categoryId && brandsByCategory.length === 0 ? (
                  <span className={styles.fieldHint}>
                    Esta categoria aun no tiene marcas activas asociadas.
                  </span>
                ) : null}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaDollarSign className={styles.fieldLabelIcon} />
                  Precio
                </span>
                <input
                  className={styles.input}
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
                <span className={styles.fieldLabel}>
                  <FaBoxOpen className={styles.fieldLabelIcon} />
                  Stock
                </span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step="1"
                  value={data.stock}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      stock: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <FaCheckCircle className={styles.fieldLabelIcon} />
                  Estado
                </span>
                <select
                  className={styles.select}
                  value={data.status}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      status: event.target.value as ProductStatus,
                    }))
                  }
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <FaListUl />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Contenido del producto</h3>
                <p className={styles.sectionSubtitle}>
                  Agrega descripcion, caracteristicas y datos segun el tipo.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <label className={`${styles.field} ${styles.span2}`}>
                <span className={styles.fieldLabel}>
                  <FaTag className={styles.fieldLabelIcon} />
                  Descripcion
                </span>
                <textarea
                  className={styles.textarea}
                  value={data.description}
                  onChange={(event) =>
                    setData((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe el beneficio principal, materiales o presentacion del producto."
                />
              </label>

              <div className={`${styles.field} ${styles.span2}`}>
                <span className={styles.fieldLabel}>
                  <FaListUl className={styles.fieldLabelIcon} />
                  Caracteristicas
                </span>

                <div className={styles.inlineRow}>
                  <input
                    className={styles.input}
                    value={featureInput}
                    onChange={(event) => setFeatureInput(event.target.value)}
                    placeholder="Ej. suela antiderrapante, 24 g de proteina"
                  />
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={addFeature}
                  >
                    <FaPlus />
                    Agregar
                  </button>
                </div>

                {data.features.length > 0 ? (
                  <div className={styles.chipList}>
                    {data.features.map((feature, index) => (
                      <span key={`${feature}-${index}`} className={styles.chip}>
                        {feature}
                        <button
                          type="button"
                          className={styles.chipRemove}
                          onClick={() => removeFeature(index)}
                          aria-label={`Quitar ${feature}`}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.fieldHint}>
                    Agrega caracteristicas cortas para enriquecer la ficha del producto.
                  </span>
                )}
              </div>

              {isSupplement ? (
                <>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaTag className={styles.fieldLabelIcon} />
                      Presentacion
                    </span>
                    <input
                      className={styles.input}
                      value={data.supplementPresentation || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          supplementPresentation: event.target.value,
                        }))
                      }
                      placeholder="Ej. 900 g, 60 capsulas"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaTag className={styles.fieldLabelIcon} />
                      Sabor
                    </span>
                    <input
                      className={styles.input}
                      value={data.supplementFlavor || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          supplementFlavor: event.target.value,
                        }))
                      }
                      placeholder="Ej. chocolate, limon"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaListUl className={styles.fieldLabelIcon} />
                      Porciones
                    </span>
                    <input
                      className={styles.input}
                      value={data.supplementServings || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          supplementServings: event.target.value,
                        }))
                      }
                      placeholder="Ej. 30 servicios"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaTag className={styles.fieldLabelIcon} />
                      Talla
                    </span>
                    <input
                      className={styles.input}
                      value={data.apparelSize || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          apparelSize: event.target.value,
                        }))
                      }
                      placeholder="Ej. CH, M, G"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaTag className={styles.fieldLabelIcon} />
                      Color
                    </span>
                    <input
                      className={styles.input}
                      value={data.apparelColor || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          apparelColor: event.target.value,
                        }))
                      }
                      placeholder="Ej. negro, blanco"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      <FaTag className={styles.fieldLabelIcon} />
                      Material
                    </span>
                    <input
                      className={styles.input}
                      value={data.apparelMaterial || ""}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          apparelMaterial: event.target.value,
                        }))
                      }
                      placeholder="Ej. algodon, dry fit"
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          {isEditing ? (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>
                  <FaImage />
                </span>
                <div>
                  <h3 className={styles.sectionTitle}>Imagenes actuales</h3>
                  <p className={styles.sectionSubtitle}>
                    Reordena las imagenes o elimina las que ya no deban mostrarse.
                  </p>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className={styles.emptyState}>
                  Este producto aun no tiene imagenes guardadas.
                </div>
              ) : (
                <div className={styles.galleryGrid}>
                  {gallery.map((image, index) => (
                    <article key={String(image.id)} className={styles.galleryCard}>
                      <img
                        className={styles.galleryImage}
                        src={image.url}
                        alt={`Imagen ${index + 1}`}
                      />

                      <div className={styles.galleryMeta}>
                        {index === 0 ? (
                          <span className={styles.galleryBadge}>Portada</span>
                        ) : null}

                        <div className={styles.iconButtonRow}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => moveExisting(index, index - 1)}
                            disabled={index === 0}
                            title="Subir"
                          >
                            <FaArrowUp />
                          </button>

                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => moveExisting(index, index + 1)}
                            disabled={index === gallery.length - 1}
                            title="Bajar"
                          >
                            <FaArrowDown />
                          </button>

                          <button
                            type="button"
                            className={styles.iconButtonDanger}
                            onClick={() => handleDeleteExisting(image.id)}
                            title="Quitar imagen"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>
                <FaUpload />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Nuevas imagenes</h3>
                <p className={styles.sectionSubtitle}>
                  Puedes seleccionar varias imagenes. Se agregan al final de la galeria.
                </p>
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                <FaImage className={styles.fieldLabelIcon} />
                Cargar imagenes
              </span>
              <input
                className={styles.input}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setData((previous) => ({ ...previous, images: files }));
                }}
              />
              <span className={styles.fieldHint}>
                Si necesitas cambiar el orden final, usa las flechas en la seccion de imagenes actuales.
              </span>
            </label>

            {previewUrls.length > 0 ? (
              <div className={styles.previewGrid}>
                {previewUrls.map((url, index) => (
                  <article key={`${url}-${index}`} className={styles.previewCard}>
                    <img
                      className={styles.previewImage}
                      src={url}
                      alt={`Vista previa ${index + 1}`}
                    />
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave || noBrandOrCategory}
            title={noBrandOrCategory ? "Necesitas marcas y categorias activas" : undefined}
          >
            Guardar producto
          </button>
        </div>
      </div>
    </div>
  );
}
