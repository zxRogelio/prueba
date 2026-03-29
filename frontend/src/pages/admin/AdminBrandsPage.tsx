/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaPen,
  FaPlus,
  FaPowerOff,
  FaSearch,
  FaTags,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import AdminPagination from "../../components/layout/admin/AdminPagination/AdminPagination";
import BrandModal, {
  type BrandFormData,
} from "../../components/layout/admin/BrandModal/BrandModal";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
  type BrandDTO,
} from "../../services/admin/brandService";
import { getCategories, type CategoryDTO } from "../../services/admin/categoryService";
import { getProducts, type ProductDTO } from "../../services/admin/productService";
import { usePagination } from "../../hooks/usePagination";
import styles from "./AdminCatalogPage.module.css";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrandDTO | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [brandsResult, categoriesResult, productsResult] = await Promise.allSettled([
        getBrands(),
        getCategories(),
        getProducts(),
      ]);

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

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const productsByBrand = useMemo(() => {
    const map = new Map<string, number>();

    products.forEach((product) => {
      map.set(product.brandId, (map.get(product.brandId) ?? 0) + 1);
    });

    return map;
  }, [products]);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories
      .map((category) => category.name)
      .sort((left, right) => left.localeCompare(right));

    return ["Todas", ...categoryNames];
  }, [categories]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...brands]
      .filter((brand) => {
        const categoryName = categoryMap.get(brand.categoryId) ?? "Sin categoria";

        const matchesQuery =
          !normalizedQuery ||
          brand.name.toLowerCase().includes(normalizedQuery) ||
          brand.id.toLowerCase().includes(normalizedQuery) ||
          categoryName.toLowerCase().includes(normalizedQuery);

        const matchesCategory =
          categoryFilter === "Todas" || categoryName === categoryFilter;

        const matchesStatus =
          statusFilter === "Todas" ||
          (statusFilter === "Activas" && brand.active) ||
          (statusFilter === "Inactivas" && !brand.active);

        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort(
        (left, right) =>
          Number(right.active) - Number(left.active) ||
          left.name.localeCompare(right.name),
      );
  }, [brands, categoryFilter, categoryMap, query, statusFilter]);

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
  }, [categoryFilter, query, setPage, statusFilter]);

  const totalActive = useMemo(
    () => brands.filter((brand) => brand.active).length,
    [brands],
  );
  const totalInactive = brands.length - totalActive;
  const coveredCategories = useMemo(
    () => new Set(brands.map((brand) => brand.categoryId).filter(Boolean)).size,
    [brands],
  );
  const brandsWithProducts = useMemo(
    () => brands.filter((brand) => (productsByBrand.get(brand.id) ?? 0) > 0).length,
    [brands, productsByBrand],
  );

  const onDelete = async (id: string) => {
    const confirmed = confirm("Eliminar esta marca?");
    if (!confirmed) return;

    try {
      await deleteBrand(id);
      setBrands((previous) => previous.filter((brand) => brand.id !== id));
    } catch (error: any) {
      console.error("DELETE BRAND ERROR:", error?.response?.status, error?.response?.data);
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  const onToggle = async (id: string) => {
    const current = brands.find((brand) => brand.id === id);
    if (!current) return;

    try {
      const updated = await updateBrand(id, {
        name: current.name,
        active: !current.active,
        categoryId: current.categoryId,
      });

      setBrands((previous) =>
        previous.map((brand) => (brand.id === id ? updated : brand)),
      );
    } catch (error: any) {
      console.error("TOGGLE BRAND ERROR:", error?.response?.status, error?.response?.data);
      alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (brand: BrandDTO) => {
    setEditing(brand);
    setOpen(true);
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Catalogo admin</span>
          <h1 className={styles.heroTitle}>Marcas</h1>
          <p className={styles.heroText}>
            Controla las marcas que alimentan el catalogo, su relacion con cada
            categoria y la visibilidad operativa para nuevos productos dentro
            del flujo administrativo.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <FaPlus />
            Nueva marca
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaTags />
          </span>
          <div>
            <span className={styles.statLabel}>Total</span>
            <strong className={styles.statValue}>{brands.length}</strong>
          </div>
          <p className={styles.statHint}>
            Todas las marcas registradas dentro del panel administrativo.
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
            Marcas que hoy ya pueden usarse en productos nuevos.
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
            Registros pausados que no estan disponibles de forma operativa.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaBoxOpen />
          </span>
          <div>
            <span className={styles.statLabel}>Con productos</span>
            <strong className={styles.statValue}>{brandsWithProducts}</strong>
          </div>
          <p className={styles.statHint}>
            {coveredCategories} categorias ya tienen al menos una marca asignada.
          </p>
        </article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <span className={styles.panelEyebrow}>Relacion comercial</span>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <FaTags />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Lista de marcas</h2>
                <p className={styles.panelSubtitle}>
                  Visualiza rapidamente a que categoria pertenece cada marca y
                  cuantos productos dependen de ella dentro del catalogo.
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
              placeholder="Buscar por nombre, ID o categoria"
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
                <th>Marca</th>
                <th>Categoria</th>
                <th>Productos</th>
                <th>Estado</th>
                <th className={styles.headCellRight}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    Cargando marcas...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <div className={styles.nameBlock}>
                        <span className={styles.primaryText}>{brand.name}</span>
                        <span className={styles.secondaryText}>ID {brand.id}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`${styles.badge} ${styles.softBadge}`}>
                        {categoryMap.get(brand.categoryId) ?? "Sin categoria"}
                      </span>
                    </td>

                    <td>
                      <span className={`${styles.badge} ${styles.accentBadge}`}>
                        {productsByBrand.get(brand.id) ?? 0} productos
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.statusPill} ${brand.active ? styles.statusOn : styles.statusOff}`}
                      >
                        {brand.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>

                    <td className={styles.cellRight}>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => openEdit(brand)}
                        >
                          <FaPen />
                          Editar
                        </button>

                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => onToggle(brand.id)}
                        >
                          <FaPowerOff />
                          {brand.active ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => onDelete(brand.id)}
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
                    No hay marcas que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.panelFooter}>
          <AdminPagination
            itemLabel="marcas"
            onPageChange={setPage}
            page={page}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      </section>

      <BrandModal
        open={open}
        title={editing ? "Editar marca" : "Nueva marca"}
        initial={
          editing
            ? {
                name: editing.name,
                active: editing.active,
                categoryId: editing.categoryId,
              }
            : undefined
        }
        categories={categories.filter((category) => category.active)}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={async (data: BrandFormData) => {
          try {
            if (editing) {
              const updated = await updateBrand(editing.id, {
                name: data.name,
                active: data.active,
                categoryId: data.categoryId,
              });

              setBrands((previous) =>
                previous.map((brand) => (brand.id === editing.id ? updated : brand)),
              );
            } else {
              const created = await createBrand({
                name: data.name,
                active: data.active,
                categoryId: data.categoryId,
              });

              setBrands((previous) => [created, ...previous]);
            }

            setOpen(false);
            setEditing(null);
          } catch (error: any) {
            console.error("SAVE BRAND ERROR:", error?.response?.status, error?.response?.data);
            alert(`${error?.response?.status} - ${error?.response?.data?.error || "Error"}`);
          }
        }}
      />
    </section>
  );
}
