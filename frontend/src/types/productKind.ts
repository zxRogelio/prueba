export type ProductKind = "supplement" | "accessory" | "apparel";

export const PRODUCT_KIND_OPTIONS: Array<{
  value: ProductKind;
  label: string;
}> = [
  { value: "supplement", label: "Suplementos" },
  { value: "accessory", label: "Accesorios" },
  { value: "apparel", label: "Ropa" },
];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  supplement: "Suplementos",
  accessory: "Accesorios",
  apparel: "Ropa",
};

export function isProductKind(value: unknown): value is ProductKind {
  return (
    value === "supplement" ||
    value === "accessory" ||
    value === "apparel"
  );
}

export function getProductKindLabel(value?: ProductKind | null) {
  return value ? PRODUCT_KIND_LABELS[value] : "Sin grupo";
}
