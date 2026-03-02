/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminCategoriesPage.module.css";
import CategoryModal, { type CategoryFormData } from "../../components/layout/admin/CategoryModal/CategoryModal";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CategoryDTO,
} from "../../services/admin/categoryService";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ nuevo: categoría que se está editando (null = crear)
  const [editing, setEditing] = useState<CategoryDTO | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, query]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (category: CategoryDTO) => {
    setEditing(category);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    const ok = confirm("¿Eliminar esta categoría?");
    if (!ok) return;

    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error("DELETE CATEGORY ERROR:", err?.response?.status, err?.response?.data);
      alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
    }
  };

  const onToggle = async (id: string) => {
    const current = categories.find((c) => c.id === id);
    if (!current) return;

    try {
      const updated = await updateCategory(id, {
        name: current.name,
        active: !current.active,
      });

      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      console.error("TOGGLE CATEGORY ERROR:", err?.response?.status, err?.response?.data);
      alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Categorías</h1>
          <p className={styles.subtitle}>Primero crea categorías para poder crear productos.</p>
        </div>

        <button className={styles.primaryBtn} onClick={openCreate}>
          + Nueva categoría
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
                <th>Categoría</th>
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
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className={styles.nameCell}>
                          <div className={styles.name}>{c.name}</div>
                          <div className={styles.id}>{c.id}</div>
                        </div>
                      </td>

                      <td>
                        <span className={`${styles.status} ${c.active ? styles.on : styles.off}`}>
                          {c.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className={styles.tdRight}>
                        <div className={styles.actions}>
                          {/* ✅ NUEVO */}
                          <button className={styles.btnGhost} onClick={() => openEdit(c)}>
                            Editar
                          </button>

                          <button className={styles.btnGhost} onClick={() => onToggle(c.id)}>
                            {c.active ? "Desactivar" : "Activar"}
                          </button>

                          <button className={styles.btnDanger} onClick={() => onDelete(c.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className={styles.empty}>No hay categorías todavía.</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span className={styles.count}>
            Total: <b>{categories.length}</b>
          </span>
        </div>
      </div>

      <CategoryModal
        open={open}
        title={editing ? "Editar categoría" : "Nueva categoría"}
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

              setCategories((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
            } else {
              const created = await createCategory({ name: data.name, active: data.active });
              setCategories((prev) => [created, ...prev]);
            }

            setOpen(false);
            setEditing(null);
          } catch (err: any) {
            console.error("SAVE CATEGORY ERROR:", err?.response?.status, err?.response?.data);
            alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
          }
        }}
      />
    </div>
  );
}
