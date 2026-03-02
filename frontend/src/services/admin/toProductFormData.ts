import type { ProductFormData } from "../../components/layout/admin/ProductModal/ProductModal";

export function toProductFormData(payload: ProductFormData): FormData {
  const form = new FormData();

  form.append("name", payload.name);
  form.append("brandId", payload.brandId);
  form.append("categoryId", payload.categoryId);

  form.append("price", String(payload.price));
  form.append("stock", String(payload.stock));
  form.append("status", payload.status);

  form.append("productType", payload.productType);

  // ✅ nuevos campos
  form.append("description", payload.description ?? "");
  form.append("features", JSON.stringify(payload.features ?? []));

  // ✅ múltiples imágenes
  for (const file of payload.images || []) {
    form.append("images", file);
  }

  // campos por tipo
  const opt = (k: string, v?: string) => {
    if (v && v.trim()) form.append(k, v.trim());
  };

  if (payload.productType === "Suplementación") {
    opt("supplementFlavor", payload.supplementFlavor);
    opt("supplementPresentation", payload.supplementPresentation);
    opt("supplementServings", payload.supplementServings);
  } else {
    opt("apparelSize", payload.apparelSize);
    opt("apparelColor", payload.apparelColor);
    opt("apparelMaterial", payload.apparelMaterial);
  }

  return form;
}
