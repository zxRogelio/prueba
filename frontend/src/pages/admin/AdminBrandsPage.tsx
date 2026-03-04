/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminBrandsPage.module.css";
import BrandModal, { type BrandFormData } from "../../components/layout/admin/BrandModal/BrandModal";
import { createBrand, deleteBrand, getBrands, updateBrand, type BrandDTO } from "../../services/admin/brandService";

// ✅ NUEVO
import { getCategories, type CategoryDTO } from "../../services/admin/categoryService";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]); // ✅ NUEVO
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<BrandDTO | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [brandsData, categoriesData] = await Promise.all([getBrands(), getCategories()]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, query]);

  const onDelete = async (id: string) => {
    const ok = confirm("¿Eliminar esta marca?");
    if (!ok) return;

    try {
      await deleteBrand(id);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error("DELETE BRAND ERROR:", err?.response?.status, err?.response?.data);
      alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
    }
  };

  const onToggle = async (id: string) => {
    const current = brands.find((b) => b.id === id);
    if (!current) return;

    const updated = await updateBrand(id, {
      name: current.name,
      active: !current.active,
      categoryId: current.categoryId, // ✅ mantener categoría
    });

    setBrands((prev) => prev.map((b) => (b.id === id ? updated : b)));
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
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Marcas</h1>
          <p className={styles.subtitle}>Primero crea marcas para poder crear productos.</p>
        </div>

        <button className={styles.primaryBtn} onClick={openCreate}>
          + Nueva marca
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder="Buscar por nombre o ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Estado</th>
                <th className={styles.thRight}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className={styles.empty}>Cargando…</td>
                </tr>
              ) : (
                <>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className={styles.nameCell}>
                          <div className={styles.name}>{b.name}</div>
                          <div className={styles.id}>{b.id}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.status} ${b.active ? styles.on : styles.off}`}>
                          {b.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className={styles.tdRight}>
                        <div className={styles.actions}>
                          <button className={styles.btnGhost} onClick={() => openEdit(b)}>
                            Editar
                          </button>

                          <button className={styles.btnGhost} onClick={() => onToggle(b.id)}>
                            {b.active ? "Desactivar" : "Activar"}
                          </button>

                          <button className={styles.btnDanger} onClick={() => onDelete(b.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className={styles.empty}>No hay marcas todavía.</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span className={styles.count}>
            Total: <b>{brands.length}</b>
          </span>
        </div>
      </div>

      <BrandModal
        open={open}
        title={editing ? "Editar marca" : "Nueva marca"}
        // ✅ NUEVO: initial incluye categoryId
        initial={
          editing
            ? { name: editing.name, active: editing.active, categoryId: editing.categoryId }
            : undefined
        }
        // ✅ NUEVO: pasar categorías al modal
        categories={categories.filter((c) => c.active)}
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
                categoryId: data.categoryId, // ✅
              });
              setBrands((prev) => prev.map((b) => (b.id === editing.id ? updated : b)));
            } else {
              const created = await createBrand({
                name: data.name,
                active: data.active,
                categoryId: data.categoryId, // ✅
              });
              setBrands((prev) => [created, ...prev]);
            }

            setOpen(false);
            setEditing(null);
          } catch (err: any) {
            console.error("SAVE BRAND ERROR:", err?.response?.status, err?.response?.data);
            alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
          }
        }}
      />
    </div>
  );
}