/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaPen,
  FaPlus,
  FaPowerOff,
  FaSearch,
  FaThLarge,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import AdminPagination from "../../components/layout/admin/AdminPagination/AdminPagination";
import CategoryModal, {
  type CategoryFormData,
} from "../../components/layout/admin/CategoryModal/CategoryModal";
import { getBrands, type BrandDTO } from "../../services/admin/brandService";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CategoryDTO,
} from "../../services/admin/categoryService";
import { getProducts, type ProductDTO } from "../../services/admin/productService";
import { usePagination } from "../../hooks/usePagination";
import styles from "./AdminCatalogPage.module.css";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [categoriesResult, brandsResult, productsResult] = await Promise.allSettled([
        getCategories(),
        getBrands(),
        getProducts(),
      ]);

      if (categoriesResult.status === "fulfilled") {
        setCategories(categoriesResult.value);
      } else {
        console.error("getCategories error:", categoriesResult.reason);
      }

      if (brandsResult.status === "fulfilled") {
        setBrands(brandsResult.value);
      } else {
        console.error("getBrands error:", brandsResult.reason);
      }

      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value);
      } else {
        console.error("getProducts error:", productsResult.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const brandsByCategory = useMemo(() => {
    const map = new Map<string, number>();

    brands.forEach((brand) => {
      map.set(brand.categoryId, (map.get(brand.categoryId) ?? 0) + 1);
    });

    return map;
  }, [brands]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, number>();

    products.forEach((product) => {
      map.set(product.categoryId, (map.get(product.categoryId) ?? 0) + 1);
    });

    return map;
  }, [products]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...categories]
      .filter((category) => {
        const matchesQuery =
          !normalizedQuery ||
          category.name.toLowerCase().includes(normalizedQuery) ||
          category.id.toLowerCase().includes(normalizedQuery);

        const matchesStatus =
          statusFilter === "Todas" ||
          (statusFilter === "Activas" && category.active) ||
          (statusFilter === "Inactivas" && !category.active);

        return matchesQuery && matchesStatus;
      })
      .sort(
        (left, right) =>
          Number(right.active) - Number(left.active) ||
          left.name.localeCompare(right.name),
      );
  }, [categories, query, statusFilter]);

  const {
    currentItems,
    page,
    rangeEnd,
    rangeStart,
    setPage,
    totalItems,
    totalPages,
  } = usePagination(filtered, 6);

  useEffect(() => {
    setPage(1);
  }, [query, setPage, statusFilter]);

  const totalActive = useMemo(
    () => categories.filter((category) => category.active).length,
    [categories],
  );
  const totalInactive = categories.length - totalActive;
  const categoriesWithProducts = useMemo(
    () =>
      categories.filter(
        (category) => (productsByCategory.get(category.id) ?? 0) > 0,
      ).length,
    [categories, productsByCategory],
  );

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (category: CategoryDTO) => {
    setEditing(category);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    const confirmed = confirm("Eliminar esta categoria?");
    if (!confirmed) return;

    try {
      await deleteCategory(id);
      setCategories((previous) => previous.filter((category) => category.id !== id));
    } catch (error: any) {
      console.error(
        "DELETE CATEGORY ERROR:",
        error?.response?.status,
        error?.response?.data,
      );
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  const onToggle = async (id: string) => {
    const current = categories.find((category) => category.id === id);
    if (!current) return;

    try {
      const updated = await updateCategory(id, {
        name: current.name,
        active: !current.active,
      });

      setCategories((previous) =>
        previous.map((category) => (category.id === id ? updated : category)),
      );
    } catch (error: any) {
      console.error(
        "TOGGLE CATEGORY ERROR:",
        error?.response?.status,
        error?.response?.data,
      );
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Catalogo admin</span>
          <h1 className={styles.heroTitle}>Categorias</h1>
          <p className={styles.heroText}>
            Ordena la estructura del catalogo desde la raiz. Aqui defines como
            se agrupan las marcas y sobre que secciones se construye el surtido
            del admin.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <FaPlus />
            Nueva categoria
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaThLarge />
          </span>
          <div>
            <span className={styles.statLabel}>Total</span>
            <strong className={styles.statValue}>{categories.length}</strong>
          </div>
          <p className={styles.statHint}>
            Todas las categorias disponibles para construir el catalogo.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Activas</span>
            <strong className={styles.statValue}>{totalActive}</strong>
          </div>
          <p className={styles.statHint}>
            Las que ya pueden usarse en marcas y productos nuevos.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaTimesCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Inactivas</span>
            <strong className={styles.statValue}>{totalInactive}</strong>
          </div>
          <p className={styles.statHint}>
            Categorias pausadas sin disponibilidad operativa.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaBoxOpen />
          </span>
          <div>
            <span className={styles.statLabel}>Con productos</span>
            <strong className={styles.statValue}>{categoriesWithProducts}</strong>
          </div>
          <p className={styles.statHint}>
            Secciones que hoy ya tienen inventario relacionado.
          </p>
        </article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelEyebrow}>Mapa del catalogo</span>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <FaThLarge />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Lista de categorias</h2>
                <p className={styles.panelSubtitle}>
                  Filtra, revisa dependencias y controla la disponibilidad de
                  cada bloque del catalogo.
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
              placeholder="Buscar por nombre o ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className={styles.filters}>
            <label className={styles.filterGroup}>
              <span className={styles.filterLabel}>Estado</span>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="Todas">Todas</option>
                <option value="Activas">Activas</option>
                <option value="Inactivas">Inactivas</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Estado</th>
                <th>Marcas</th>
                <th>Productos</th>
                <th className={styles.headCellRight}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    Cargando categorias...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className={styles.nameBlock}>
                        <span className={styles.primaryText}>{category.name}</span>
                        <span className={styles.secondaryText}>ID {category.id}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.statusPill} ${category.active ? styles.statusOn : styles.statusOff}`}
                      >
                        {category.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>

                    <td>
                      <span className={`${styles.badge} ${styles.softBadge}`}>
                        {brandsByCategory.get(category.id) ?? 0} marcas
                      </span>
                    </td>

                    <td>
                      <span className={`${styles.badge} ${styles.accentBadge}`}>
                        {productsByCategory.get(category.id) ?? 0} productos
                      </span>
                    </td>

                    <td className={styles.cellRight}>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => openEdit(category)}
                        >
                          <FaPen />
                          Editar
                        </button>

                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => onToggle(category.id)}
                        >
                          <FaPowerOff />
                          {category.active ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => onDelete(category.id)}
                        >
                          <FaTrash />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No hay categorias que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.panelFooter}>
          <AdminPagination
            itemLabel="categorias"
            onPageChange={setPage}
            page={page}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      </section>

      <CategoryModal
        open={open}
        title={editing ? "Editar categoria" : "Nueva categoria"}
        initial={editing ? { name: editing.name, active: editing.active } : undefined}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={async (data: CategoryFormData) => {
          try {
            if (editing) {
              const updated = await updateCategory(editing.id, {
                name: data.name,
                active: data.active,
              });

              setCategories((previous) =>
                previous.map((category) =>
                  category.id === editing.id ? updated : category,
                ),
              );
            } else {
              const created = await createCategory({
                name: data.name,
                active: data.active,
              });

              setCategories((previous) => [created, ...previous]);
            }

            setOpen(false);
            setEditing(null);
          } catch (error: any) {
            console.error(
              "SAVE CATEGORY ERROR:",
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
