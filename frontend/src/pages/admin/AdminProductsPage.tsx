/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminProductsPage.module.css";

import ProductModal, {
  type ProductFormData,
  type ExistingImage,
} from "../../components/layout/admin/ProductModal/ProductModal";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  reorderProductImages,
  type ProductDTO,
} from "../../services/admin/productService";

import { toProductFormData } from "../../services/admin/toProductFormData";
import { getBrands, type BrandDTO } from "../../services/admin/brandService";
import { getCategories, type CategoryDTO } from "../../services/admin/categoryService";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [brands, setBrands] = useState<BrandDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [sort, setSort] = useState<"name" | "price" | "stock">("name");

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);

  const [loading, setLoading] = useState(true);

  // ✅ Normaliza active (boolean | 0/1 | "0"/"1" | "true"/"false")
  const isActive = (v: any) => v === true || v === 1 || v === "1" || v === "true";

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, cRes] = await Promise.allSettled([
        getProducts(),
        getBrands(),
        getCategories(),
      ]);

      if (pRes.status === "fulfilled") setProducts(pRes.value);
      else console.error("getProducts error:", pRes.reason);

      if (bRes.status === "fulfilled") setBrands(bRes.value);
      else console.error("getBrands error:", bRes.reason);

      if (cRes.status === "fulfilled") setCategories(cRes.value);
      else console.error("getCategories error:", cRes.reason);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const activeBrands = useMemo(
    () => brands.filter((b) => isActive((b as any).active)),
    [brands]
  );
  const activeCategories = useMemo(
    () => categories.filter((c) => isActive((c as any).active)),
    [categories]
  );

  const canCreateProduct = activeBrands.length > 0 && activeCategories.length > 0;

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const categoryOptions = useMemo(() => {
    const names = activeCategories.map((c) => c.name);
    return ["Todos", ...names];
  }, [activeCategories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((p) => {
      const catName = categoryMap.get(p.categoryId) ?? "";
      const brandName = brandMap.get(p.brandId) ?? "";

      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        brandName.toLowerCase().includes(q);

      const matchCat =
        categoryFilter === "Todos" ||
        (categoryMap.get(p.categoryId) ?? "") === categoryFilter;

      return matchQuery && matchCat;
    });

    list = list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return Number(a.price) - Number(b.price);
      return Number(a.stock) - Number(b.stock);
    });

    return list;
  }, [products, query, categoryFilter, sort, categoryMap, brandMap]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (p: ProductDTO) => {
    setEditing(p);
    setOpenModal(true);
  };

  const onDelete = async (id: string) => {
    const ok = confirm(`¿Eliminar producto ${id}?`);
    if (!ok) return;

    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error("DELETE PRODUCT ERROR:", err?.response?.status, err?.response?.data);
      alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
    }
  };

  // ✅ Toggle Activo/Inactivo
  const onToggleStatus = async (p: ProductDTO) => {
    try {
      const fd = new FormData();

      fd.append("name", p.name);
      fd.append("brandId", p.brandId);
      fd.append("categoryId", p.categoryId);
      fd.append("price", String(p.price));
      fd.append("stock", String(p.stock));
      fd.append("productType", p.productType);
      fd.append("status", p.status === "Activo" ? "Inactivo" : "Activo");

      // ✅ nuevos campos
      fd.append("description", String((p as any).description ?? ""));
      const f = (p as any).features;
      fd.append("features", typeof f === "string" ? f : JSON.stringify(f ?? []));

      // opcionales
      if (p.productType === "Suplementación") {
        if ((p as any).supplementFlavor) fd.append("supplementFlavor", (p as any).supplementFlavor);
        if ((p as any).supplementPresentation) fd.append("supplementPresentation", (p as any).supplementPresentation);
        if ((p as any).supplementServings) fd.append("supplementServings", (p as any).supplementServings);
      } else {
        if ((p as any).apparelSize) fd.append("apparelSize", (p as any).apparelSize);
        if ((p as any).apparelColor) fd.append("apparelColor", (p as any).apparelColor);
        if ((p as any).apparelMaterial) fd.append("apparelMaterial", (p as any).apparelMaterial);
      }

      const updated = await updateProduct(p.id, fd);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err: any) {
      console.error("TOGGLE PRODUCT ERROR:", err?.response?.status, err?.response?.data);
      alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
    }
  };

  // ✅ helper: features string/array -> array
  const normalizeFeatures = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
    if (typeof raw === "string") {
      try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // ✅ existing images para el modal
  const existingImages: ExistingImage[] = useMemo(() => {
    if (!editing?.images) return [];
    return [...editing.images]
      .map((x: any) => ({ id: x.id, url: x.url, order: Number(x.order ?? 0) }))
      .sort((a, b) => a.order - b.order);
  }, [editing]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Productos</h1>
          <p className={styles.subtitle}>
            Gestiona el catálogo.
            {!canCreateProduct && (
              <>
                <br />
                <b>Antes debes crear Marcas y Categorías activas.</b>
              </>
            )}
          </p>
        </div>

        {/* ✅ Botón clickeable siempre + alerta si no puede abrir */}
        <button
          className={styles.primaryBtn}
          type="button"
          onClick={() => {
            if (loading) {
              alert("Aún se está cargando la información. Espera un momento y vuelve a intentar.");
              return;
            }

            if (!canCreateProduct) {
              const reasons: string[] = [];
              if (activeBrands.length === 0) reasons.push("No hay MARCAS activas.");
              if (activeCategories.length === 0) reasons.push("No hay CATEGORÍAS activas.");

              alert(
                `No se puede abrir el modal para crear producto:\n\n` +
                  reasons.join("\n") +
                  `\n\nMarcas activas: ${activeBrands.length}\nCategorías activas: ${activeCategories.length}\n\n` +
                  `Solución: crea o activa al menos 1 marca y 1 categoría.`
              );
              return;
            }

            openCreate();
          }}
        >
          + Nuevo producto
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder="Buscar por ID, nombre, marca o categoría…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className={styles.select}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={sort}
            onChange={(e) => setSort(e.target.value as "name" | "price" | "stock")}
          >
            <option value="name">Ordenar: Nombre</option>
            <option value="price">Ordenar: Precio</option>
            <option value="stock">Ordenar: Stock</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th className={styles.thRight}>Precio</th>
                <th className={styles.thRight}>Stock</th>
                <th>Estado</th>
                <th className={styles.thRight}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>Cargando…</td>
                </tr>
              ) : (
                <>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.productCell}>
                          <img
                            className={styles.productImg}
                            src={(p as any).imageUrl || (p as any)?.images?.[0]?.url || "https://via.placeholder.com/52"}
                            alt={p.name}
                          />
                          <div>
                            <div className={styles.productName}>{p.name}</div>
                            <div className={styles.productId}>{p.id}</div>
                          </div>
                        </div>
                      </td>

                      <td><span className={styles.tag}>{brandMap.get(p.brandId) ?? "—"}</span></td>
                      <td><span className={styles.tag}>{categoryMap.get(p.categoryId) ?? "—"}</span></td>

                      <td className={styles.tdRight}>${Number(p.price).toFixed(2)} MXN</td>
                      <td className={styles.tdRight}>
                        {Number(p.stock) > 0 ? p.stock : <span className={styles.out}>Sin stock</span>}
                      </td>

                      <td>
                        <span className={`${styles.status} ${p.status === "Activo" ? styles.statusOn : styles.statusOff}`}>
                          {p.status}
                        </span>
                      </td>

                      <td className={styles.tdRight}>
                        <div className={styles.actions}>
                          <button className={styles.btnGhost} onClick={() => openEdit(p)}>
                            Editar
                          </button>

                          <button className={styles.btnGhost} onClick={() => onToggleStatus(p)}>
                            {p.status === "Activo" ? "Desactivar" : "Activar"}
                          </button>

                          <button className={styles.btnDanger} onClick={() => onDelete(p.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>No hay productos con esos filtros.</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span className={styles.count}>
            Mostrando <b>{filtered.length}</b> productos
          </span>
        </div>
      </div>

      <ProductModal
        open={openModal}
        title={editing ? "Editar producto" : "Nuevo producto"}
        brands={activeBrands as any}
        categories={activeCategories as any}

        // ✅ CLAVE PARA PODER BORRAR/ORDENAR
        productId={editing?.id}
        existingImages={existingImages}
        onDeleteExistingImage={async (imageId) => {
          if (!editing) return;
          await deleteProductImage(editing.id, imageId);

          // actualiza producto actual en state (y también editing)
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editing.id
                ? { ...p, images: (p.images ?? []).filter((img: any) => img.id !== imageId) }
                : p
            )
          );

          setEditing((prev) =>
            prev ? { ...prev, images: (prev.images ?? []).filter((img: any) => img.id !== imageId) } : prev
          );
        }}
        onReorderExistingImages={async (newOrderIds) => {
          if (!editing) return;
          const updated = await reorderProductImages(editing.id, newOrderIds);

          setProducts((prev) =>
            prev.map((p) => (p.id === editing.id ? { ...p, images: updated as any } : p))
          );

          setEditing((prev) => (prev ? { ...prev, images: updated as any } : prev));
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

                images: [], // ✅ archivos nuevos van aquí

                description: String((editing as any).description ?? ""),
                features: normalizeFeatures((editing as any).features),

                supplementFlavor: (editing as any).supplementFlavor ?? "",
                supplementPresentation: (editing as any).supplementPresentation ?? "",
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
              setProducts((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
              setEditing(updated);
            } else {
              const created = await createProduct(form);
              setProducts((prev) => [created, ...prev]);
            }

            setOpenModal(false);
            setEditing(null);
          } catch (err: any) {
            console.error("SAVE PRODUCT ERROR:", err?.response?.status, err?.response?.data);
            alert(`${err?.response?.status} - ${err?.response?.data?.error || "Error"}`);
          }
        }}
      />
    </div>
  );
}
