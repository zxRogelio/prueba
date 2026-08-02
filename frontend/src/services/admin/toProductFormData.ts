import type { ProductFormData } from "../../components/layout/admin/ProductModal/ProductModal";

export function toProductFormData(payload: ProductFormData): FormData {
  const form = new FormData();

  form.append("name", payload.name);
  form.append("brandId", payload.brandId);
  form.append("categoryId", payload.categoryId);

  form.append("price", String(payload.price));
  form.append("stock", String(payload.stock));
  form.append("status", payload.status);

  //nuevos campos
  form.append("description", payload.description ?? "");
  form.append("features", JSON.stringify(payload.features ?? []));

  // ✅ múltiples imágenes
  for (const file of payload.images || []) {
    form.append("images", file);
  }

  // Campos especificos. El backend decide cuales conserva segun la categoria.
  const opt = (k: string, v?: string) => {
    if (v && v.trim()) form.append(k, v.trim());
  };

  opt("supplementFlavor", payload.supplementFlavor);
  opt("supplementPresentation", payload.supplementPresentation);
  opt("supplementServings", payload.supplementServings);
  opt("apparelSize", payload.apparelSize);
  opt("apparelColor", payload.apparelColor);
  opt("apparelMaterial", payload.apparelMaterial);

  return form;
}
