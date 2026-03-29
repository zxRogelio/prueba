/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaPen,
  FaExclamationCircle,
  FaFileExport,
  FaPlus,
  FaPowerOff,
  FaSearch,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import AdminPagination from "../../components/layout/admin/AdminPagination/AdminPagination";
import ProductImportExportPanel from "../../components/layout/admin/ProductImportExportPanel/ProductImportExportPanel";
import ProductModal, {
  type ExistingImage,
  type ProductFormData,
} from "../../components/layout/admin/ProductModal/ProductModal";
import { usePagination } from "../../hooks/usePagination";
import { getBrands, type BrandDTO } from "../../services/admin/brandService";
import {
  getCategories,
  type CategoryDTO,
} from "../../services/admin/categoryService";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProducts,
  reorderProductImages,
  updateProduct,
  type ProductDTO,
} from "../../services/admin/productService";
import { toProductFormData } from "../../services/admin/toProductFormData";
import styles from "./AdminCatalogPage.module.css";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sort, setSort] = useState<"name" | "price" | "stock">("name");

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportExport, setShowImportExport] = useState(false);

  const isActive = (value: any) =>
    value === true || value === 1 || value === "1" || value === "true";

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [productsResult, brandsResult, categoriesResult] = await Promise.allSettled([
        getProducts(),
        getBrands(),
        getCategories(),
      ]);

      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value);
      } else {
        console.error("getProducts error:", productsResult.reason);
      }

      if (brandsResult.status === "fulfilled") {
        setBrands(brandsResult.value);
      } else {
        console.error("getBrands error:", brandsResult.reason);
      }

      if (categoriesResult.status === "fulfilled") {
        setCategories(categoriesResult.value);
      } else {
        console.error("getCategories error:", categoriesResult.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const activeBrands = useMemo(
    () => brands.filter((brand) => isActive((brand as any).active)),
    [brands],
  );
  const activeCategories = useMemo(
    () => categories.filter((category) => isActive((category as any).active)),
    [categories],
  );

  const canCreateProduct =
    activeBrands.length > 0 && activeCategories.length > 0;

  const brandMap = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const categoryOptions = useMemo(() => {
    const categoryNames = categories
      .map((category) => category.name)
      .sort((left, right) => left.localeCompare(right));

    return ["Todos", ...categoryNames];
  }, [categories]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const categoryName = categoryMap.get(product.categoryId) ?? "";
        const brandName = brandMap.get(product.brandId) ?? "";

        const matchesQuery =
          !normalizedQuery ||
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.id.toLowerCase().includes(normalizedQuery) ||
          categoryName.toLowerCase().includes(normalizedQuery) ||
          brandName.toLowerCase().includes(normalizedQuery);

        const matchesCategory =
          categoryFilter === "Todos" || categoryName === categoryFilter;

        const matchesStatus =
          statusFilter === "Todos" || product.status === statusFilter;

        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort((left, right) => {
        if (sort === "name") {
          return left.name.localeCompare(right.name);
        }

        if (sort === "price") {
          return Number(left.price) - Number(right.price);
        }

        return Number(left.stock) - Number(right.stock);
      });
  }, [brandMap, categoryFilter, categoryMap, products, query, sort, statusFilter]);

  const {
    currentItems,
    page,
    rangeEnd,
    rangeStart,
    setPage,
    totalItems,
    totalPages,
  } = usePagination(filtered, 8);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, query, setPage, sort, statusFilter]);

  const totalActive = useMemo(
    () => products.filter((product) => product.status === "Activo").length,
    [products],
  );
  const lowStockCount = useMemo(
    () =>
      products.filter((product) => {
        const stock = Number(product.stock);
        return stock > 0 && stock <= 5;
      }).length,
    [products],
  );
  const outOfStockCount = useMemo(
    () => products.filter((product) => Number(product.stock) <= 0).length,
    [products],
  );
  const categoriesInUse = useMemo(
    () => new Set(products.map((product) => product.categoryId).filter(Boolean)).size,
    [products],
  );

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (product: ProductDTO) => {
    setEditing(product);
    setOpenModal(true);
  };

  const onDelete = async (id: string) => {
    const confirmed = confirm(`Eliminar producto ${id}?`);
    if (!confirmed) return;

    try {
      await deleteProduct(id);
      setProducts((previous) => previous.filter((product) => product.id !== id));
    } catch (error: any) {
      console.error(
        "DELETE PRODUCT ERROR:",
        error?.response?.status,
        error?.response?.data,
      );
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  const onToggleStatus = async (product: ProductDTO) => {
    try {
      const formData = new FormData();
      const isSupplement = String(product.productType)
        .toLowerCase()
        .includes("suplement");

      formData.append("name", product.name);
      formData.append("brandId", product.brandId);
      formData.append("categoryId", product.categoryId);
      formData.append("price", String(product.price));
      formData.append("stock", String(product.stock));
      formData.append("productType", product.productType);
      formData.append(
        "status",
        product.status === "Activo" ? "Inactivo" : "Activo",
      );
      formData.append("description", String((product as any).description ?? ""));

      const rawFeatures = (product as any).features;
      formData.append(
        "features",
        typeof rawFeatures === "string"
          ? rawFeatures
          : JSON.stringify(rawFeatures ?? []),
      );

      if (isSupplement) {
        if ((product as any).supplementFlavor) {
          formData.append("supplementFlavor", (product as any).supplementFlavor);
        }

        if ((product as any).supplementPresentation) {
          formData.append(
            "supplementPresentation",
            (product as any).supplementPresentation,
          );
        }

        if ((product as any).supplementServings) {
          formData.append("supplementServings", (product as any).supplementServings);
        }
      } else {
        if ((product as any).apparelSize) {
          formData.append("apparelSize", (product as any).apparelSize);
        }

        if ((product as any).apparelColor) {
          formData.append("apparelColor", (product as any).apparelColor);
        }

        if ((product as any).apparelMaterial) {
          formData.append("apparelMaterial", (product as any).apparelMaterial);
        }
      }

      const updated = await updateProduct(product.id, formData);
      setProducts((previous) =>
        previous.map((item) => (item.id === product.id ? updated : item)),
      );
    } catch (error: any) {
      console.error(
        "TOGGLE PRODUCT ERROR:",
        error?.response?.status,
        error?.response?.data,
      );
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  const normalizeFeatures = (rawValue: any): string[] => {
    if (Array.isArray(rawValue)) {
      return rawValue.filter((item) => typeof item === "string");
    }

    if (typeof rawValue === "string") {
      try {
        const parsedValue = JSON.parse(rawValue);
        return Array.isArray(parsedValue)
          ? parsedValue.filter((item) => typeof item === "string")
          : [];
      } catch {
        return [];
      }
    }

    return [];
  };

  const existingImages: ExistingImage[] = useMemo(() => {
    if (!editing?.images) return [];

    return [...editing.images]
      .map((image: any) => ({
        id: image.id,
        order: Number(image.order ?? 0),
        url: image.url,
      }))
      .sort((left, right) => left.order - right.order);
  }, [editing]);

  const getStockClassName = (stock: number) => {
    if (stock <= 0) return styles.stockOut;
    if (stock <= 5) return styles.stockLow;
    return styles.stockOk;
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Catalogo admin</span>
          <h1 className={styles.heroTitle}>Productos</h1>
          <p className={styles.heroText}>
            Gestiona inventario, precios, contenido visual y relacion comercial
            desde una sola vista operativa del catalogo.
          </p>

          {!canCreateProduct ? (
            <p className={styles.heroWarning}>
              Necesitas al menos una marca activa y una categoria activa para
              crear productos nuevos.
            </p>
          ) : null}
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowImportExport((value) => !value)}
          >
            <FaFileExport />
            {showImportExport ? "Ocultar importacion" : "Importar / Exportar CSV"}
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              if (loading) {
                alert(
                  "La informacion del catalogo sigue cargando. Espera un momento e intenta otra vez.",
                );
                return;
              }

              if (!canCreateProduct) {
                const reasons: string[] = [];

                if (activeBrands.length === 0) {
                  reasons.push("No hay marcas activas.");
                }

                if (activeCategories.length === 0) {
                  reasons.push("No hay categorias activas.");
                }

                alert(
                  `No se puede abrir el formulario de producto.\n\n${reasons.join("\n")}\n\nActiva o crea al menos una marca y una categoria para continuar.`,
                );
                return;
              }

              openCreate();
            }}
          >
            <FaPlus />
            Nuevo producto
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaBoxOpen />
          </span>
          <div>
            <span className={styles.statLabel}>Total</span>
            <strong className={styles.statValue}>{products.length}</strong>
          </div>
          <p className={styles.statHint}>
            Productos registrados en {categoriesInUse} categorias del catalogo.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Activos</span>
            <strong className={styles.statValue}>{totalActive}</strong>
          </div>
          <p className={styles.statHint}>
            Referencias visibles y listas para operar en tienda.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaExclamationCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Stock bajo</span>
            <strong className={styles.statValue}>{lowStockCount}</strong>
          </div>
          <p className={styles.statHint}>
            Productos con entre 1 y 5 unidades disponibles.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaTimesCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Sin stock</span>
            <strong className={styles.statValue}>{outOfStockCount}</strong>
          </div>
          <p className={styles.statHint}>
            Items agotados que requieren reabasto o desactivacion.
          </p>
        </article>
      </div>

      {showImportExport ? (
        <section className={styles.utilityPanel}>
          <ProductImportExportPanel />
        </section>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelEyebrow}>Inventario visible</span>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <FaBoxOpen />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Lista de productos</h2>
                <p className={styles.panelSubtitle}>
                  Busca por nombre, marca o categoria, cambia el estado y
                  navega el catalogo con la misma paginacion que ya usa el
                  admin.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por ID, nombre, marca o categoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className={styles.filters}>
            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Categoria</span>
              <select
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {categoryOptions.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Estado</span>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Activo">Activos</option>
                <option value="Inactivo">Inactivos</option>
              </select>
            </label>

            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Orden</span>
              <select
                className={styles.filterSelect}
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "name" | "price" | "stock")
                }
              >
                <option value="name">Nombre</option>
                <option value="price">Precio</option>
                <option value="stock">Stock</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Coleccion</th>
                <th className={styles.headCellRight}>Precio</th>
                <th className={styles.headCellRight}>Stock</th>
                <th>Estado</th>
                <th className={styles.headCellRight}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    Cargando productos...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((product) => {
                  const stock = Number(product.stock);
                  const imageUrl =
                    (product as any).imageUrl ?? (product as any)?.images?.[0]?.url;

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productCell}>
                          {imageUrl ? (
                            <img
                              className={styles.productImage}
                              src={imageUrl}
                              alt={product.name}
                            />
                          ) : (
                            <div className={styles.productFallback}>
                              {product.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}

                          <div className={styles.nameBlock}>
                            <span className={styles.primaryText}>{product.name}</span>
                            <span className={styles.secondaryText}>ID {product.id}</span>

                            <div className={styles.subtleRow}>
                              <span className={`${styles.badge} ${styles.accentBadge}`}>
                                {product.productType}
                              </span>
                              {stock <= 0 ? (
                                <span className={`${styles.badge} ${styles.warningBadge}`}>
                                  Agotado
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.nameBlock}>
                          <span className={`${styles.badge} ${styles.softBadge}`}>
                            {brandMap.get(product.brandId) ?? "Sin marca"}
                          </span>
                          <span className={`${styles.badge} ${styles.neutralBadge}`}>
                            {categoryMap.get(product.categoryId) ?? "Sin categoria"}
                          </span>
                        </div>
                      </td>

                      <td className={styles.cellRight}>
                        <span className={styles.priceValue}>
                          {currencyFormatter.format(Number(product.price))}
                        </span>
                      </td>

                      <td className={styles.cellRight}>
                        <span
                          className={`${styles.stockValue} ${getStockClassName(stock)}`}
                        >
                          {stock <= 0 ? "Sin stock" : `${stock} unidades`}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusPill} ${product.status === "Activo" ? styles.statusOn : styles.statusOff}`}
                        >
                          {product.status}
                        </span>
                      </td>

                      <td className={styles.cellRight}>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => openEdit(product)}
                          >
                            <FaPen />
                            Editar
                          </button>

                          <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => onToggleStatus(product)}
                          >
                            <FaPowerOff />
                            {product.status === "Activo" ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => onDelete(product.id)}
                          >
                            <FaTrash />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No hay productos que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.panelFooter}>
          <AdminPagination
            itemLabel="productos"
            onPageChange={setPage}
            page={page}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      </section>

      <ProductModal
        open={openModal}
        title={editing ? "Editar producto" : "Nuevo producto"}
        brands={activeBrands}
        categories={activeCategories as any}
        productId={editing?.id}
        existingImages={existingImages}
        onDeleteExistingImage={async (imageId) => {
          if (!editing) return;

          await deleteProductImage(editing.id, imageId);

          setProducts((previous) =>
            previous.map((product) =>
              product.id === editing.id
                ? {
                    ...product,
                    images: (product.images ?? []).filter(
                      (image: any) => image.id !== imageId,
                    ),
                  }
                : product,
            ),
          );

          setEditing((previous) =>
            previous
              ? {
                  ...previous,
                  images: (previous.images ?? []).filter(
                    (image: any) => image.id !== imageId,
                  ),
                }
              : previous,
          );
        }}
        onReorderExistingImages={async (newOrderIds) => {
          if (!editing) return;

          const updatedImages = await reorderProductImages(editing.id, newOrderIds);

          setProducts((previous) =>
            previous.map((product) =>
              product.id === editing.id
                ? { ...product, images: updatedImages as any }
                : product,
            ),
          );

          setEditing((previous) =>
            previous ? { ...previous, images: updatedImages as any } : previous,
          );
        }}
        initial={
          editing
            ? {
                name: editing.name,
                brandId: editing.brandId,
                categoryId: editing.categoryId,
                price: Number(editing.price),
                stock: Number(editing.stock),
                status: editing.status,
                productType: editing.productType,
                images: [],
                description: String((editing as any).description ?? ""),
                features: normalizeFeatures((editing as any).features),
                supplementFlavor: (editing as any).supplementFlavor ?? "",
                supplementPresentation:
                  (editing as any).supplementPresentation ?? "",
                supplementServings: (editing as any).supplementServings ?? "",
                apparelSize: (editing as any).apparelSize ?? "",
                apparelColor: (editing as any).apparelColor ?? "",
                apparelMaterial: (editing as any).apparelMaterial ?? "",
              }
            : undefined
        }
        onClose={() => {
          setOpenModal(false);
          setEditing(null);
        }}
        onSave={async (payload: ProductFormData) => {
          try {
            const form = toProductFormData(payload);

            if (editing) {
              const updated = await updateProduct(editing.id, form);
              setProducts((previous) =>
                previous.map((product) =>
                  product.id === editing.id ? updated : product,
                ),
              );
              setEditing(updated);
            } else {
              const created = await createProduct(form);
              setProducts((previous) => [created, ...previous]);
            }

            setOpenModal(false);
            setEditing(null);
          } catch (error: any) {
            console.error(
              "SAVE PRODUCT ERROR:",
              error?.response?.status,
              error?.response?.data,
            );
            alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
          }
        }}
      />
    </section>
  );
}
