export const validateProductPayload = (body) => {
  const errors = [];

  const name = String(body?.name || "").trim();
  const brandId = body?.brandId;
  const categoryId = body?.categoryId;

  const productType = body?.productType;
  const status = body?.status;

  if (name.length < 3) errors.push("Nombre inválido");
  if (!brandId) errors.push("brandId es requerido");
  if (!categoryId) errors.push("categoryId es requerido");

  if (!["Suplementación", "Ropa"].includes(productType)) {
    errors.push("productType inválido");
  }

  if (status && !["Activo", "Inactivo"].includes(status)) {
    errors.push("status inválido");
  }

  // Campos por tipo
  if (productType === "Suplementación") {
    if (!String(body?.supplementFlavor || "").trim()) errors.push("Sabor requerido");
    if (!String(body?.supplementPresentation || "").trim()) errors.push("Presentación requerida");
    if (!String(body?.supplementServings || "").trim()) errors.push("Porciones requeridas");
  }

  if (productType === "Ropa") {
    if (!String(body?.apparelSize || "").trim()) errors.push("Talla requerida");
    if (!String(body?.apparelColor || "").trim()) errors.push("Color requerido");
  }

  return { ok: errors.length === 0, errors };
};
