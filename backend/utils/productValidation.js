import { isValidProductKind } from "./productKind.js";

export const validateProductPayload = (
  body,
  { productKind, requireSpecificFields = true } = {}
) => {
  const errors = [];

  const name = String(body?.name || "").trim();
  const brandId = body?.brandId;
  const categoryId = body?.categoryId;

  const status = body?.status;

  if (name.length < 3) errors.push("Nombre inválido");
  if (!brandId) errors.push("brandId es requerido");
  if (!categoryId) errors.push("categoryId es requerido");

  if (!isValidProductKind(productKind)) {
    errors.push("productKind inválido");
  }

  if (status && !["Activo", "Inactivo"].includes(status)) {
    errors.push("status inválido");
  }

  if (requireSpecificFields && productKind === "supplement") {
    if (!String(body?.supplementFlavor || "").trim()) errors.push("Sabor requerido");
    if (!String(body?.supplementPresentation || "").trim()) errors.push("Presentación requerida");
    if (!String(body?.supplementServings || "").trim()) errors.push("Porciones requeridas");
  }

  if (requireSpecificFields && productKind === "apparel") {
    if (!String(body?.apparelSize || "").trim()) errors.push("Talla requerida");
    if (!String(body?.apparelColor || "").trim()) errors.push("Color requerido");
  }

  return { ok: errors.length === 0, errors };
};
